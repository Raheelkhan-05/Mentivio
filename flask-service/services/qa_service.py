# services/qa_service.py - OPTIMIZED FOR HUGGING FACE
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from services.document_processor import DocumentProcessor
from database.messages import MongoMessageDB
import os
from dotenv import load_dotenv
from typing import List, Dict, Optional, Tuple
import logging
import time
import re
from sentence_transformers import SentenceTransformer
import torch
import numpy as np

load_dotenv()
logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Tunable constants
RETRIEVE_TOP_K = 30
MAX_CONTEXT_CHUNKS = 20
MAX_HISTORY_MESSAGES = 20
CONTEXT_WINDOW_CHARS = 12000
SEMANTIC_THRESHOLD = 0.3
RECALL_SIMILARITY_THRESHOLD = 0.45  # For detecting recall questions

class ConversationMemory:
    """Track user-stated facts and conversation context."""
    def __init__(self):
        self.user_facts = {}
        self.last_topic = {}
        self.last_answer = {}  # Track last answer for reference
        self.last_calculation = {}  # Track last calculation result
    
    def set_fact(self, chat_id: str, key: str, value: str):
        if chat_id not in self.user_facts:
            self.user_facts[chat_id] = {}
        self.user_facts[chat_id][key] = value
    
    def get_fact(self, chat_id: str, key: str) -> Optional[str]:
        return self.user_facts.get(chat_id, {}).get(key)
    
    def get_all_facts(self, chat_id: str) -> Dict:
        return self.user_facts.get(chat_id, {})
    
    def set_last_topic(self, chat_id: str, topic: str):
        self.last_topic[chat_id] = topic
    
    def get_last_topic(self, chat_id: str) -> Optional[str]:
        return self.last_topic.get(chat_id)
    
    def set_last_answer(self, chat_id: str, answer: str):
        self.last_answer[chat_id] = answer
    
    def get_last_answer(self, chat_id: str) -> Optional[str]:
        return self.last_answer.get(chat_id)
    
    def set_last_calculation(self, chat_id: str, result: str):
        self.last_calculation[chat_id] = result
    
    def get_last_calculation(self, chat_id: str) -> Optional[str]:
        return self.last_calculation.get(chat_id)
    
    def clear_facts(self, chat_id: str):
        if chat_id in self.user_facts:
            del self.user_facts[chat_id]
        if chat_id in self.last_topic:
            del self.last_topic[chat_id]
        if chat_id in self.last_answer:
            del self.last_answer[chat_id]
        if chat_id in self.last_calculation:
            del self.last_calculation[chat_id]

class SemanticAttention:
    """Memory-optimized local semantic attention."""
    def __init__(self, model_name='paraphrase-MiniLM-L3-v2'):
        logger.info(f"[ATTENTION] Loading model: {model_name}")
        self.model = SentenceTransformer(model_name)
        self.device = 'cpu'
        self.model.to(self.device)
        self.model.eval()
        torch.set_grad_enabled(False)
        logger.info(f"[ATTENTION] Model ready on {self.device}")
    
    def compute_attention_scores(self, query: str, texts: List[str]) -> np.ndarray:
        """Compute attention scores."""
        if not texts:
            return np.array([])
        
        with torch.no_grad():
            query_embedding = self.model.encode(
                query, 
                convert_to_tensor=True,
                show_progress_bar=False,
                batch_size=1
            )
            text_embeddings = self.model.encode(
                texts, 
                convert_to_tensor=True,
                show_progress_bar=False,
                batch_size=8
            )
            
            similarities = torch.nn.functional.cosine_similarity(
                query_embedding.unsqueeze(0), 
                text_embeddings
            ).cpu().numpy()
        
        return similarities
    
    def select_relevant_context(self, query: str, history: List, max_msgs: int = 8) -> List:
        """Select relevant messages."""
        if not history or len(history) <= max_msgs:
            return history
        
        msg_texts = [msg.content if hasattr(msg, 'content') else str(msg) for msg in history]
        attention_scores = self.compute_attention_scores(query, msg_texts)
        
        # Always include last 3 messages
        relevant_indices = set(range(max(0, len(history) - 3), len(history)))
        
        # Add relevant messages
        ranked_indices = np.argsort(attention_scores)[::-1]
        for idx in ranked_indices:
            if attention_scores[idx] > SEMANTIC_THRESHOLD or len(relevant_indices) < 4:
                relevant_indices.add(idx)
            if len(relevant_indices) >= max_msgs:
                break
        
        selected = sorted(relevant_indices)
        return [history[i] for i in selected]
    
    def detect_recall_intent(self, query: str, stored_facts: Dict[str, str]) -> Optional[Tuple[str, str]]:
        """Use semantic similarity to detect if user is asking about stored facts."""
        if not stored_facts:
            return None
        
        # Create reference questions for each fact
        fact_questions = []
        fact_keys = []
        
        for key, value in stored_facts.items():
            if key == "user_name":
                fact_questions.extend([
                    "what is my name",
                    "what was my name", 
                    "who am i",
                    "tell me my name"
                ])
                fact_keys.extend([key] * 4)
            elif key == "user_age":
                fact_questions.extend([
                    "what is my age",
                    "what was my age",
                    "how old am i",
                    "tell me my age"
                ])
                fact_keys.extend([key] * 4)
            elif key.startswith("var_"):
                var_name = key.replace("var_", "")
                fact_questions.extend([
                    f"what is {var_name}",
                    f"what was {var_name}",
                    f"value of {var_name}"
                ])
                fact_keys.extend([key] * 3)
        
        if not fact_questions:
            return None
        
        # Compute similarity
        similarities = self.compute_attention_scores(query.lower(), fact_questions)
        max_idx = np.argmax(similarities)
        max_similarity = similarities[max_idx]
        
        if max_similarity > RECALL_SIMILARITY_THRESHOLD:
            key = fact_keys[max_idx]
            value = stored_facts[key]
            return (key, value)
        
        return None

class QAService:
    def __init__(self):
        logger.info("[QA_SERVICE] Initializing QAService")
        
        # Azure OpenAI with optimized settings
        self.llm = AzureChatOpenAI(
            azure_endpoint=os.getenv("AZURE_OPENAI_API_BASE"),
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
            azure_deployment=os.getenv("AZURE_OPENAI_API_NAME"),
            model_name=os.getenv("AZURE_OPENAI_MODEL", "gpt-4o"),
            temperature=float(os.getenv("QA_TEMPERATURE", 0.3)),
            request_timeout=120,
            max_retries=2
        )
        
        self.doc_processor = DocumentProcessor()
        self.db = MongoMessageDB()
        self.memory = ConversationMemory()
        self.attention = SemanticAttention()
        logger.info("[QA_SERVICE] Initialization complete")

    def _is_calculation(self, question: str) -> Optional[str]:
        """Detect and evaluate mathematical expressions."""
        q = question.strip()
        
        # Simple arithmetic patterns
        if re.match(r'^[\d\s\+\-\*\/\(\)\.]+$', q):
            try:
                result = eval(q)
                return str(result)
            except:
                return None
        
        return None

    def _is_reference_to_previous(self, question: str) -> bool:
        """Check if question refers to previous answer/calculation."""
        q = question.lower().strip()
        reference_words = ['answer', 'result', 'that', 'it', 'previous', 'last']
        return any(word in q for word in reference_words)

    def _resolve_reference(self, question: str, chat_id: str) -> str:
        """Resolve references like 'answer', 'it', 'that' to actual values."""
        q = question.lower().strip()
        
        # Get last calculation result
        last_calc = self.memory.get_last_calculation(chat_id)
        
        if last_calc:
            # Replace reference words with actual value
            replacements = {
                'answer': last_calc,
                'result': last_calc,
                'that': last_calc,
                'it': last_calc
            }
            
            for word, value in replacements.items():
                if word in q:
                    q = re.sub(r'\b' + word + r'\b', value, q)
                    return q
        
        return question

    def _is_explicit_variable_assignment(self, question: str) -> bool:
        q = question.strip()
        return bool(re.match(r'^(?:let\s+)?([a-zA-Z_]\w*)\s*=\s*(.+)$', q, re.IGNORECASE))

    def _detect_user_statement(self, question: str, chat_id: str) -> Optional[Tuple[str, str]]:
        q = question.strip()
        
        if self._is_explicit_variable_assignment(q):
            match = re.match(r'^(?:let\s+)?([a-zA-Z_]\w*)\s*=\s*(.+)$', q, re.IGNORECASE)
            if match:
                var_name = match.group(1).lower()
                value = match.group(2).strip()
                self.memory.set_fact(chat_id, f"var_{var_name}", value)
                return ("variable", f"Got it! I've noted that {var_name} = {value}.")
        
        match = re.search(
            r'(?:my\s+)?name\s+is\s+([a-zA-Z]+)(?:\s+and\s+(?:my\s+)?age\s+is\s+(\d+))?',
            q, re.IGNORECASE
        )
        if match:
            name = match.group(1).strip()
            age = match.group(2).strip() if match.group(2) else None
            self.memory.set_fact(chat_id, "user_name", name)
            response = f"Nice to meet you, {name}!"
            if age:
                self.memory.set_fact(chat_id, "user_age", age)
                response += f" And I've noted that you're {age} years old."
            return ("name_age", response)
        
        match = re.search(r'(?:my\s+age\s+is|i\s+am|i\'m)\s+(\d+)(?:\s+years?\s+old)?', q, re.IGNORECASE)
        if match:
            age = match.group(1).strip()
            self.memory.set_fact(chat_id, "user_age", age)
            return ("age", f"Got it! You're {age} years old.")
        
        match = re.search(r'(?:my\s+)?name\s+is\s+([a-zA-Z]+)', q, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            self.memory.set_fact(chat_id, "user_name", name)
            return ("name", f"Nice to meet you, {name}!")
        
        return None

    def _detect_recall_question(self, question: str, chat_id: str) -> Optional[str]:
        """Use semantic attention to detect recall questions."""
        stored_facts = self.memory.get_all_facts(chat_id)
        
        if not stored_facts:
            return None
        
        # Use semantic similarity for intelligent recall detection
        recall_result = self.attention.detect_recall_intent(question, stored_facts)
        
        if recall_result:
            key, value = recall_result
            
            if key == "user_name":
                return f"Your name is {value}."
            elif key == "user_age":
                return f"You're {value} years old."
            elif key.startswith("var_"):
                var_name = key.replace("var_", "")
                return f"The value of {var_name} is {value}."
        
        return None

    def _detect_pronoun_reference(self, question: str, chat_id: str) -> Optional[str]:
        q = question.lower().strip()
        patterns = [
            r'^(?:explain|what is|what was|tell me about|describe)\s+(?:it|that|this)(?:\s|$|\?)',
            r'^(?:it|that|this)(?:\s|$|\?)',
            r'^(?:more about|details on)\s+(?:it|that|this)(?:\s|$|\?)'
        ]
        for pattern in patterns:
            if re.search(pattern, q):
                return self.memory.get_last_topic(chat_id)
        return None

    def _extract_topic_from_question(self, question: str) -> Optional[str]:
        q = question.lower()
        patterns = [
            r'(?:what is|what was|what\'s|whats)\s+([a-zA-Z][a-zA-Z0-9\s]+?)(?:\?|$)',
            r'(?:explain|describe)\s+([a-zA-Z][a-zA-Z0-9\s]+?)(?:\?|$)',
            r'(?:tell me about|help me with|learn about)\s+([a-zA-Z][a-zA-Z0-9\s]+?)(?:\?|$)'
        ]
        for pattern in patterns:
            match = re.search(pattern, q)
            if match:
                return match.group(1).strip()
        return None

    def _is_off_topic(self, question: str) -> bool:
        q = question.lower()
        tech_keywords = [
            'program', 'code', 'algorithm', 'data', 'software', 'web', 'api',
            'python', 'java', 'javascript', 'ai', 'machine learning'
        ]
        if any(kw in q for kw in tech_keywords):
            return False
        
        offtopic_keywords = ['motorcycle', 'recipe', 'sports', 'music', 'movie', 'travel']
        return any(kw in q for kw in offtopic_keywords)

    def _is_greeting(self, question: str) -> bool:
        q = question.lower().strip()
        greetings = ['hi', 'hello', 'hey', 'yo', 'sup', 'hii', 'hiii']
        return q in greetings or (any(q.startswith(g) for g in greetings) and len(q.split()) <= 4)

    def _build_context(self, chunks: List[Dict]) -> str:
        if not chunks:
            return ""
        sorted_chunks = sorted(chunks, key=lambda x: x.get("similarity", 0), reverse=True)
        context_parts = []
        total_chars = 0
        for chunk in sorted_chunks[:MAX_CONTEXT_CHUNKS]:
            content = chunk.get("content", "").strip()
            if content and total_chars < CONTEXT_WINDOW_CHARS:
                context_parts.append(content)
                total_chars += len(content)
        return "\n\n---\n\n".join(context_parts)

    def _has_material(self, user_id: str, material_id: Optional[str]) -> bool:
        try:
            chunks = self.doc_processor.get_relevant_chunks(
                query="test", user_id=user_id, material_id=material_id,
                use_all_materials=(material_id is None), top_k=1
            )
            return bool(chunks)
        except:
            return False

    def get_recent_messages(self, chat_id: str, limit: int = MAX_HISTORY_MESSAGES) -> List:
        try:
            msgs = self.db.get_last_messages(chat_id, limit)
            return [
                HumanMessage(content=m["content"]) if m["role"] == "user" 
                else AIMessage(content=m["content"])
                for m in msgs
            ]
        except Exception as e:
            logger.exception(f"[HISTORY] Error: {e}")
            return []

    def answer_question(
        self,
        question: str,
        user_id: str,
        chat_id: str,
        material_id: Optional[str],
        general_mode: bool
    ) -> Dict:
        """Optimized QA with local semantic attention."""
        start_ts = time.time()
        logger.info(f"[QA] Question: '{question}'")
        
        try:
            if not all([question, user_id, chat_id]):
                return {"answer": "Missing required fields", "sources": [], "mode": "error"}

            # Check for simple calculation first
            calc_result = self._is_calculation(question)
            if calc_result is not None:
                self.memory.set_last_calculation(chat_id, calc_result)
                answer = f"{question} = **{calc_result}**"
                self.db.add_message(chat_id, user_id, "assistant", answer)
                return {"answer": answer, "sources": [], "mode": "calculation"}

            # Resolve references to previous answers
            if self._is_reference_to_previous(question):
                question = self._resolve_reference(question, chat_id)
                # Try calculation again after resolution
                calc_result = self._is_calculation(question)
                if calc_result is not None:
                    self.memory.set_last_calculation(chat_id, calc_result)
                    answer = f"{question} = **{calc_result}**"
                    self.db.add_message(chat_id, user_id, "assistant", answer)
                    return {"answer": answer, "sources": [], "mode": "calculation"}

            # SEMANTIC RECALL CHECK - Must be before statement check
            recall_answer = self._detect_recall_question(question, chat_id)
            if recall_answer:
                self.db.add_message(chat_id, user_id, "assistant", recall_answer)
                return {"answer": recall_answer, "sources": [], "mode": "recall"}

            # Statement detection
            statement_result = self._detect_user_statement(question, chat_id)
            if statement_result:
                _, answer = statement_result
                self.db.add_message(chat_id, user_id, "assistant", answer)
                return {"answer": answer, "sources": [], "mode": "statement"}

            # Pronoun resolution
            pronoun_topic = self._detect_pronoun_reference(question, chat_id)
            if pronoun_topic:
                question = f"{question} (referring to {pronoun_topic})"

            topic = self._extract_topic_from_question(question)
            if topic:
                self.memory.set_last_topic(chat_id, topic)

            # Load history
            full_history = self.get_recent_messages(chat_id, limit=MAX_HISTORY_MESSAGES * 2)

            # GENERAL MODE
            if general_mode:
                relevant_history = self.attention.select_relevant_context(question, full_history)
                facts = self.memory.get_all_facts(chat_id)
                facts_context = ""
                if facts:
                    facts_list = []
                    for k, v in facts.items():
                        if k == "user_name":
                            facts_list.append(f"User's name: {v}")
                        elif k == "user_age":
                            facts_list.append(f"User's age: {v}")
                        elif k.startswith("var_"):
                            facts_list.append(f"{k.replace('var_', '')}: {v}")
                    facts_context = f"\n\nKnown facts about the user:\n" + "\n".join(facts_list)
                
                prompt = f"You are a helpful AI assistant. Be conversational and natural. Reference previous context when relevant.{facts_context}"
                messages = [SystemMessage(content=prompt)] + relevant_history + [HumanMessage(content=question)]
                
                response = self.llm.invoke(messages)
                answer = response.content.strip()
                self.memory.set_last_answer(chat_id, answer)
                self.db.add_message(chat_id, user_id, "assistant", answer)
                logger.info(f"[QA] Mode: general | Time: {time.time()-start_ts:.2f}s")
                return {"answer": answer, "sources": [], "mode": "general"}

            # Check material
            has_material = self._has_material(user_id, material_id)
            
            if not has_material:
                relevant_history = self.attention.select_relevant_context(question, full_history)
                facts = self.memory.get_all_facts(chat_id)
                facts_context = ""
                if facts:
                    facts_list = []
                    for k, v in facts.items():
                        if k == "user_name":
                            facts_list.append(f"User's name: {v}")
                        elif k == "user_age":
                            facts_list.append(f"User's age: {v}")
                        elif k.startswith("var_"):
                            facts_list.append(f"{k.replace('var_', '')}: {v}")
                    facts_context = f"\n\nKnown facts:\n" + "\n".join(facts_list)
                
                prompt = f"You are an AI tutor in CS/programming. Be conversational and reference context.{facts_context}"
                messages = [SystemMessage(content=prompt)] + relevant_history + [HumanMessage(content=question)]
                
                response = self.llm.invoke(messages)
                answer = response.content.strip()
                self.memory.set_last_answer(chat_id, answer)
                self.db.add_message(chat_id, user_id, "assistant", answer)
                logger.info(f"[QA] Mode: no_material | Time: {time.time()-start_ts:.2f}s")
                return {"answer": answer, "sources": [], "mode": "no_material"}

            # MATERIAL MODE
            if self._is_greeting(question):
                answer = "Hello! I'm here to help you with your studies."
                self.db.add_message(chat_id, user_id, "assistant", answer)
                return {"answer": answer, "sources": [], "mode": "greeting"}

            if self._is_off_topic(question):
                answer = "That's outside my scope. Ask about CS/programming topics!"
                self.db.add_message(chat_id, user_id, "assistant", answer)
                return {"answer": answer, "sources": [], "mode": "off_topic"}

            # Retrieve chunks
            chunks = self.doc_processor.get_relevant_chunks(
                query=question, user_id=user_id, material_id=material_id,
                use_all_materials=(material_id is None), top_k=RETRIEVE_TOP_K
            ) or []
            
            context = self._build_context(chunks)
            max_similarity = max([c.get("similarity", 0) for c in chunks], default=0)
            has_relevant_material = bool(context and max_similarity > 0.2)
            
            relevant_history = self.attention.select_relevant_context(question, full_history)
            
            facts = self.memory.get_all_facts(chat_id)
            facts_context = ""
            if facts:
                facts_list = []
                for k, v in facts.items():
                    if k == "user_name":
                        facts_list.append(f"User's name: {v}")
                    elif k == "user_age":
                        facts_list.append(f"User's age: {v}")
                    elif k.startswith("var_"):
                        facts_list.append(f"{k.replace('var_', '')}: {v}")
                facts_context = f"\n\nKnown facts:\n" + "\n".join(facts_list)
            
            if has_relevant_material:
                system_prompt = f"You are an AI tutor. Answer based on material. Be conversational and reference previous context.{facts_context}"
                user_msg = f"Material:\n{context}\n\nQuestion: {question}"
            else:
                system_prompt = f"You are a CS/programming tutor. Be conversational and reference context.{facts_context}"
                user_msg = f"Question: {question}"
            
            messages = [SystemMessage(content=system_prompt)] + relevant_history + [HumanMessage(content=user_msg)]
            
            response = self.llm.invoke(messages)
            answer = response.content.strip()
            self.memory.set_last_answer(chat_id, answer)
            self.db.add_message(chat_id, user_id, "assistant", answer)
            
            sources = []
            if has_relevant_material:
                for c in chunks[:5]:
                    sources.append({
                        "content": c.get("content", "")[:300],
                        "similarity": round(c.get("similarity", 0), 3)
                    })
            
            mode = "material" if has_relevant_material else "expert_knowledge"
            logger.info(f"[QA] Mode: {mode} | Time: {time.time()-start_ts:.2f}s")
            return {"answer": answer, "sources": [], "mode": mode}

        except Exception as e:
            logger.exception(f"[QA] ERROR: {e}")
            error_msg = "I encountered an error. Please try again."
            self.db.add_message(chat_id, user_id, "assistant", error_msg)
            return {"answer": error_msg, "sources": [], "mode": "error", "error": str(e)}