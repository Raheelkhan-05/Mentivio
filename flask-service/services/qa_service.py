# services/qa_service.py
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

# Enhanced logging configuration
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

class ConversationMemory:
    """Track user-stated facts with enhanced parsing."""
    def __init__(self):
        self.user_facts = {}  # {chat_id: {key: value}}
        self.last_topic = {}  # {chat_id: last_discussed_topic}
    
    def set_fact(self, chat_id: str, key: str, value: str):
        if chat_id not in self.user_facts:
            self.user_facts[chat_id] = {}
        self.user_facts[chat_id][key] = value
        logger.info(f"[MEMORY] Set fact for chat {chat_id}: {key} = {value}")
    
    def get_fact(self, chat_id: str, key: str) -> Optional[str]:
        value = self.user_facts.get(chat_id, {}).get(key)
        logger.info(f"[MEMORY] Get fact for chat {chat_id}: {key} = {value}")
        return value
    
    def get_all_facts(self, chat_id: str) -> Dict:
        facts = self.user_facts.get(chat_id, {})
        logger.info(f"[MEMORY] All facts for chat {chat_id}: {facts}")
        return facts
    
    def set_last_topic(self, chat_id: str, topic: str):
        self.last_topic[chat_id] = topic
        logger.info(f"[MEMORY] Set last topic for chat {chat_id}: {topic}")
    
    def get_last_topic(self, chat_id: str) -> Optional[str]:
        return self.last_topic.get(chat_id)
    
    def clear_facts(self, chat_id: str):
        if chat_id in self.user_facts:
            del self.user_facts[chat_id]
        if chat_id in self.last_topic:
            del self.last_topic[chat_id]
        logger.info(f"[MEMORY] Cleared all facts for chat {chat_id}")

class SemanticAttention:
    """Multi-head attention mechanism using sentence transformers."""
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        logger.info(f"[ATTENTION] Initializing SemanticAttention with model: {model_name}")
        self.model = SentenceTransformer(model_name)
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.model.to(self.device)
        logger.info(f"[ATTENTION] Model loaded on device: {self.device}")
    
    def compute_attention_scores(self, query: str, texts: List[str]) -> np.ndarray:
        """Compute attention scores using semantic embeddings."""
        if not texts:
            return np.array([])
        
        logger.info(f"[ATTENTION] Computing attention for query: '{query}' over {len(texts)} texts")
        
        # Encode query and texts
        query_embedding = self.model.encode(query, convert_to_tensor=True)
        text_embeddings = self.model.encode(texts, convert_to_tensor=True)
        
        # Compute cosine similarity (attention scores)
        similarities = torch.nn.functional.cosine_similarity(
            query_embedding.unsqueeze(0), 
            text_embeddings
        ).cpu().numpy()
        
        logger.info(f"[ATTENTION] Attention scores - min: {similarities.min():.3f}, max: {similarities.max():.3f}, mean: {similarities.mean():.3f}")
        
        return similarities
    
    def select_relevant_context(self, query: str, history: List, max_msgs: int = 8) -> List:
        """Select most relevant messages using semantic attention."""
        if not history or len(history) <= max_msgs:
            logger.info(f"[ATTENTION] History length {len(history)} <= {max_msgs}, returning all")
            return history
        
        # Extract text content from messages
        msg_texts = []
        for msg in history:
            if hasattr(msg, 'content'):
                msg_texts.append(msg.content)
            else:
                msg_texts.append(str(msg))
        
        # Compute attention scores
        attention_scores = self.compute_attention_scores(query, msg_texts)
        
        # Always include last 3-5 messages (recency bias is critical for context)
        relevant_indices = set(range(max(0, len(history) - 5), len(history)))
        logger.info(f"[ATTENTION] Including last 5 messages by default: indices {list(relevant_indices)}")
        
        # Add most relevant messages based on attention scores
        ranked_indices = np.argsort(attention_scores)[::-1]
        for idx in ranked_indices:
            if attention_scores[idx] > SEMANTIC_THRESHOLD or len(relevant_indices) < 4:
                relevant_indices.add(idx)
                logger.info(f"[ATTENTION] Adding message {idx} with score {attention_scores[idx]:.3f}")
            if len(relevant_indices) >= max_msgs:
                break
        
        selected = sorted(relevant_indices)
        logger.info(f"[ATTENTION] Selected {len(selected)} messages: indices {selected}")
        return [history[i] for i in selected]

class QAService:
    def __init__(self):
        logger.info("[QA_SERVICE] Initializing QAService")
        self.llm = AzureChatOpenAI(
            azure_endpoint=os.getenv("AZURE_OPENAI_API_BASE"),
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
            azure_deployment=os.getenv("AZURE_OPENAI_API_NAME"),
            model_name=os.getenv("AZURE_OPENAI_MODEL", "gpt-4o"),
            temperature=float(os.getenv("QA_TEMPERATURE", 0.3))
        )
        self.doc_processor = DocumentProcessor()
        self.db = MongoMessageDB()
        self.memory = ConversationMemory()
        self.attention = SemanticAttention()
        logger.info("[QA_SERVICE] Initialization complete")

    def _is_explicit_variable_assignment(self, question: str) -> bool:
        """Check if this is an EXPLICIT variable assignment like 'A = 55' or 'let x = 100'."""
        q = question.strip()
        # Only match if it starts with variable name = value (no other words before)
        return bool(re.match(r'^(?:let\s+)?([a-zA-Z_]\w*)\s*=\s*(.+)$', q, re.IGNORECASE))

    def _is_explicit_variable_recall(self, question: str) -> bool:
        """Check if this is EXPLICITLY asking about a defined variable (not common concepts)."""
        q = question.lower().strip()
        
        # Match patterns like "what is A" where A is a single letter or clearly a variable name
        match = re.search(r'(?:what(?:\'?s| is| was)|value\s+of|tell me)\s+([a-zA-Z_]\w*)', q)
        if match:
            var_name = match.group(1).lower()
            # Only treat as variable recall if it's a single letter or starts with underscore
            # This excludes common words like "python", "recursion", etc.
            if len(var_name) == 1 or var_name.startswith('_'):
                logger.info(f"[VAR_CHECK] '{var_name}' detected as explicit variable")
                return True
            else:
                logger.info(f"[VAR_CHECK] '{var_name}' is a common word, not a variable")
                return False
        return False

    def _detect_user_statement(self, question: str, chat_id: str) -> Optional[Tuple[str, str]]:
        """Enhanced detection of user statements - ONLY name/age, NOT variable assignments."""
        q = question.strip()
        logger.info(f"[STATEMENT_DETECT] Checking: '{q}'")
        
        # Check for variable assignment first - handle separately
        if self._is_explicit_variable_assignment(q):
            match = re.match(r'^(?:let\s+)?([a-zA-Z_]\w*)\s*=\s*(.+)$', q, re.IGNORECASE)
            if match:
                var_name = match.group(1).lower()
                value = match.group(2).strip()
                self.memory.set_fact(chat_id, f"var_{var_name}", value)
                response = f"Got it! I've noted that {var_name} = {value}."
                logger.info(f"[STATEMENT_DETECT] Variable assignment: {response}")
                return ("variable", response)
        
        # Pattern 1: "my name is X and age is Y" or "my name is X and my age is Y"
        match = re.search(
            r'(?:my\s+)?name\s+is\s+([a-zA-Z]+)(?:\s+and\s+(?:my\s+)?age\s+is\s+(\d+))?',
            q,
            re.IGNORECASE
        )
        if match:
            name = match.group(1).strip()
            age = match.group(2).strip() if match.group(2) else None
            
            self.memory.set_fact(chat_id, "user_name", name)
            response_parts = [f"Nice to meet you, {name}!"]
            
            if age:
                self.memory.set_fact(chat_id, "user_age", age)
                response_parts.append(f"And I've noted that you're {age} years old.")
            
            response = " ".join(response_parts)
            logger.info(f"[STATEMENT_DETECT] Name statement detected: {response}")
            return ("name_age", response)
        
        # Pattern 2: "my age is X" or "I am X years old"
        match = re.search(
            r'(?:my\s+age\s+is|i\s+am|i\'m)\s+(\d+)(?:\s+years?\s+old)?',
            q,
            re.IGNORECASE
        )
        if match:
            age = match.group(1).strip()
            self.memory.set_fact(chat_id, "user_age", age)
            response = f"Got it! You're {age} years old."
            logger.info(f"[STATEMENT_DETECT] Age statement detected: {response}")
            return ("age", response)
        
        # Pattern 3: "my name is X" (standalone)
        match = re.search(r'(?:my\s+)?name\s+is\s+([a-zA-Z]+)', q, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            self.memory.set_fact(chat_id, "user_name", name)
            response = f"Nice to meet you, {name}!"
            logger.info(f"[STATEMENT_DETECT] Name statement detected: {response}")
            return ("name", response)
        
        logger.info("[STATEMENT_DETECT] No statement pattern matched")
        return None

    def _detect_recall_question(self, question: str, chat_id: str) -> Optional[str]:
        """Enhanced recall detection - ONLY for explicit user facts, NOT technical questions."""
        q = question.lower().strip()
        logger.info(f"[RECALL_DETECT] Checking: '{q}'")
        
        # Pattern 1: "what is my name" or "what's my name" or "who am i"
        if re.search(r"(?:what(?:'?s| is| was)|tell me|do you know)\s+my\s+name|who\s+am\s+i", q):
            name = self.memory.get_fact(chat_id, "user_name")
            if name:
                response = f"Your name is {name}."
                logger.info(f"[RECALL_DETECT] Name recall: {response}")
                return response
            else:
                response = "You haven't told me your name yet."
                logger.info(f"[RECALL_DETECT] Name not found: {response}")
                return response
        
        # Pattern 2: "what is my age" or "how old am i"
        if re.search(r"(?:what(?:'?s| is| was)|tell me)\s+my\s+age|how\s+old\s+am\s+i", q):
            age = self.memory.get_fact(chat_id, "user_age")
            if age:
                response = f"You're {age} years old."
                logger.info(f"[RECALL_DETECT] Age recall: {response}")
                return response
            else:
                response = "You haven't told me your age yet."
                logger.info(f"[RECALL_DETECT] Age not found: {response}")
                return response
        
        # Pattern 3: EXPLICIT variable recall - only single letters or _variables
        if self._is_explicit_variable_recall(q):
            match = re.search(r'(?:what(?:\'?s| is| was)|value\s+of|tell me)\s+([a-zA-Z_]\w*)', q)
            if match:
                var_name = match.group(1).lower()
                value = self.memory.get_fact(chat_id, f"var_{var_name}")
                if value:
                    response = f"The value of {var_name} is {value}."
                    logger.info(f"[RECALL_DETECT] Variable recall: {response}")
                    return response
                else:
                    response = f"I don't have a value stored for {var_name}. You haven't defined it yet."
                    logger.info(f"[RECALL_DETECT] Variable not found: {response}")
                    return response
        
        logger.info("[RECALL_DETECT] No recall pattern matched - treating as normal question")
        return None

    def _detect_pronoun_reference(self, question: str, chat_id: str) -> Optional[str]:
        """Detect if question uses pronouns like 'it', 'that', 'this' referring to previous topic."""
        q = question.lower().strip()
        
        # Patterns that indicate pronoun reference
        pronoun_patterns = [
            r'^(?:explain|what is|tell me about|describe)\s+(?:it|that|this)(?:\s|$|\?)',
            r'^(?:it|that|this)(?:\s|$|\?)',
            r'^(?:more about|details on)\s+(?:it|that|this)(?:\s|$|\?)'
        ]
        
        for pattern in pronoun_patterns:
            if re.search(pattern, q):
                last_topic = self.memory.get_last_topic(chat_id)
                if last_topic:
                    logger.info(f"[PRONOUN] Detected pronoun reference to: {last_topic}")
                    return last_topic
                else:
                    logger.info(f"[PRONOUN] Pronoun detected but no last topic found")
        
        return None

    def _extract_topic_from_question(self, question: str) -> Optional[str]:
        """Extract the main topic from a question."""
        q = question.lower()
        
        # Pattern: "what is X", "explain X", "tell me about X"
        patterns = [
            r'(?:what is|what\'s|whats)\s+([a-zA-Z][a-zA-Z0-9\s]+?)(?:\?|$)',
            r'(?:explain|describe)\s+([a-zA-Z][a-zA-Z0-9\s]+?)(?:\?|$)',
            r'(?:tell me about|help me with|learn about)\s+([a-zA-Z][a-zA-Z0-9\s]+?)(?:\?|$)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, q)
            if match:
                topic = match.group(1).strip()
                logger.info(f"[TOPIC_EXTRACT] Extracted topic: '{topic}'")
                return topic
        
        return None

    def _is_off_topic(self, question: str) -> bool:
        """Detect off-topic questions using semantic understanding."""
        q = question.lower()
        logger.info(f"[OFF_TOPIC] Checking: '{q}'")
        
        # Technical/educational keywords (allowed)
        tech_keywords = [
            'program', 'code', 'algorithm', 'data', 'software', 'web', 'api', 'database',
            'python', 'java', 'javascript', 'react', 'node', 'machine learning', 'ai',
            'neural', 'model', 'system', 'design', 'function', 'class', 'variable',
            'framework', 'library', 'server', 'client', 'frontend', 'backend', 'stack',
            'computer', 'engineering', 'science', 'math', 'calculate', 'solve', 'explain',
            'what is', 'how to', 'why does', 'concept', 'theory', 'project', 'develop',
            'array', 'loop', 'string', 'object', 'recursion', 'sorting', 'search',
            'language', 'syntax', 'compiler', 'interpreter', 'debugging', 'testing'
        ]
        
        # Check for technical keywords
        if any(kw in q for kw in tech_keywords):
            logger.info("[OFF_TOPIC] Technical keyword found - ON TOPIC")
            return False
        
        # Off-topic keywords (blocked)
        offtopic_keywords = [
            'cafe racer', 'motorcycle', 'bike', 'bikes', 'motor', 'vehicle', 'car',
            'recipe', 'cook', 'cooking', 'food', 'restaurant', 'dish', 'meal',
            'sports', 'football', 'cricket', 'basketball', 'tennis',
            'music', 'song', 'album', 'concert', 'band',
            'movie', 'film', 'actor', 'actress', 'celebrity',
            'fashion', 'clothing', 'dress', 'style',
            'travel', 'vacation', 'trip', 'holiday', 'tourist',
            'weather', 'rain', 'sunny', 'temperature',
            'news', 'politics', 'election', 'government'
        ]
        
        if any(kw in q for kw in offtopic_keywords):
            logger.info("[OFF_TOPIC] Off-topic keyword found - OFF TOPIC")
            return True
        
        logger.info("[OFF_TOPIC] No clear indicators - ON TOPIC (default)")
        return False

    def _is_greeting(self, question: str) -> bool:
        """Detect greetings."""
        q = question.lower().strip()
        greetings = [
            'hi', 'hello', 'hey', 'yo', 'sup', "what's up", 'whats up',
            'how are you', 'good morning', 'good evening', 'good afternoon'
        ]
        is_greeting = q in greetings or (any(q.startswith(g) for g in greetings) and len(q.split()) <= 4)
        logger.info(f"[GREETING] '{q}' is greeting: {is_greeting}")
        return is_greeting

    def _build_context(self, chunks: List[Dict]) -> str:
        """Build context from chunks."""
        if not chunks:
            logger.info("[CONTEXT] No chunks to build context")
            return ""
        
        sorted_chunks = sorted(chunks, key=lambda x: x.get("similarity", 0), reverse=True)
        context_parts = []
        total_chars = 0
        
        for chunk in sorted_chunks[:MAX_CONTEXT_CHUNKS]:
            content = chunk.get("content", "").strip()
            if content and total_chars < CONTEXT_WINDOW_CHARS:
                context_parts.append(content)
                total_chars += len(content)
        
        logger.info(f"[CONTEXT] Built context with {len(context_parts)} chunks, {total_chars} chars")
        return "\n\n---\n\n".join(context_parts)

    def _has_material(self, user_id: str, material_id: Optional[str]) -> bool:
        """Check if user has material."""
        try:
            chunks = self.doc_processor.get_relevant_chunks(
                query="test", user_id=user_id, material_id=material_id,
                use_all_materials=(material_id is None), top_k=1
            )
            has_mat = bool(chunks)
            logger.info(f"[MATERIAL_CHECK] User {user_id} has material: {has_mat}")
            return has_mat
        except Exception as e:
            logger.error(f"[MATERIAL_CHECK] Error: {e}")
            return False

    def get_recent_messages(self, chat_id: str, limit: int = MAX_HISTORY_MESSAGES) -> List:
        """Load conversation history."""
        try:
            msgs = self.db.get_last_messages(chat_id, limit)
            history = [
                HumanMessage(content=m["content"]) if m["role"] == "user" 
                else AIMessage(content=m["content"])
                for m in msgs
            ]
            logger.info(f"[HISTORY] Loaded {len(history)} messages for chat {chat_id}")
            return history
        except Exception as e:
            logger.exception(f"[HISTORY] get_recent_messages failed: {e}")
            return []

    def answer_question(
        self,
        question: str,
        user_id: str,
        chat_id: str,
        material_id: Optional[str],
        general_mode: bool
    ) -> Dict:
        """Smart QA with enhanced context understanding and pronoun resolution."""
        start_ts = time.time()
        logger.info(f"[QA] ========== NEW QUERY ==========")
        logger.info(f"[QA] Question: '{question}'")
        logger.info(f"[QA] User: {user_id}, Chat: {chat_id}, Material: {material_id}, General: {general_mode}")
        
        try:
            if not all([question, user_id, chat_id]):
                logger.error("[QA] Missing required fields")
                return {"answer": "Missing required fields", "sources": [], "mode": "error"}

            # Check for user statements (name/age/variables)
            statement_result = self._detect_user_statement(question, chat_id)
            if statement_result:
                _, answer = statement_result
                self.db.add_message(chat_id, user_id, "assistant", answer)
                elapsed = time.time() - start_ts
                logger.info(f"[QA] Mode: statement | Time: {elapsed:.2f}s")
                return {"answer": answer, "sources": [], "mode": "statement"}

            # Check for recall questions (explicit user facts only)
            recall_answer = self._detect_recall_question(question, chat_id)
            if recall_answer:
                self.db.add_message(chat_id, user_id, "assistant", recall_answer)
                elapsed = time.time() - start_ts
                logger.info(f"[QA] Mode: recall | Time: {elapsed:.2f}s")
                return {"answer": recall_answer, "sources": [], "mode": "recall"}

            # Check for pronoun reference (e.g., "explain it")
            pronoun_topic = self._detect_pronoun_reference(question, chat_id)
            if pronoun_topic:
                logger.info(f"[QA] Pronoun reference detected, expanding question with topic: {pronoun_topic}")
                question = f"{question} (referring to {pronoun_topic})"

            # Extract and store topic for future pronoun references
            topic = self._extract_topic_from_question(question)
            if topic:
                self.memory.set_last_topic(chat_id, topic)

            # Load history
            full_history = self.get_recent_messages(chat_id, limit=MAX_HISTORY_MESSAGES)

            # GENERAL MODE
            if general_mode:
                logger.info("[QA] Processing in GENERAL mode")
                relevant_history = self.attention.select_relevant_context(question, full_history)
                
                facts = self.memory.get_all_facts(chat_id)
                facts_context = ""
                if facts:
                    facts_list = [f"{k.replace('var_', '').replace('user_', '')}: {v}" for k, v in facts.items()]
                    facts_context = f"\n\nUser context:\n" + "\n".join(facts_list)
                
                prompt = f"You are a helpful, friendly AI assistant. Answer naturally and concisely. Use conversation history to understand context and pronouns.{facts_context}"
                messages = [SystemMessage(content=prompt)] + relevant_history + [HumanMessage(content=question)]
                
                response = self.llm.invoke(messages)
                answer = response.content.strip()
                
                self.db.add_message(chat_id, user_id, "assistant", answer)
                elapsed = time.time() - start_ts
                logger.info(f"[QA] Mode: general | Time: {elapsed:.2f}s")
                return {"answer": answer, "sources": [], "mode": "general"}

            # Check for material
            has_material = self._has_material(user_id, material_id)
            
            if not has_material:
                logger.info("[QA] No material found - using expert knowledge")
                relevant_history = self.attention.select_relevant_context(question, full_history)
                
                facts = self.memory.get_all_facts(chat_id)
                facts_context = ""
                if facts:
                    facts_list = [f"{k.replace('var_', '').replace('user_', '')}: {v}" for k, v in facts.items()]
                    facts_context = f"\n\nUser context:\n" + "\n".join(facts_list)
                
                prompt = f"You are a helpful AI tutor specializing in computer science and programming. Answer naturally and concisely. Use conversation history to understand context and pronouns.{facts_context}"
                messages = [SystemMessage(content=prompt)] + relevant_history + [HumanMessage(content=question)]
                
                response = self.llm.invoke(messages)
                answer = response.content.strip()
                
                self.db.add_message(chat_id, user_id, "assistant", answer)
                elapsed = time.time() - start_ts
                logger.info(f"[QA] Mode: no_material | Time: {elapsed:.2f}s")
                return {"answer": answer, "sources": [], "mode": "no_material"}

            # MATERIAL MODE
            logger.info("[QA] Processing in MATERIAL mode")
            
            # Handle greetings
            if self._is_greeting(question):
                answer = "Hello! I'm here to help you with your studies. What would you like to learn about?"
                self.db.add_message(chat_id, user_id, "assistant", answer)
                elapsed = time.time() - start_ts
                logger.info(f"[QA] Mode: greeting | Time: {elapsed:.2f}s")
                return {"answer": answer, "sources": [], "mode": "greeting"}

            # Check if off-topic
            if self._is_off_topic(question):
                answer = (
                    "That topic is outside my scope. I'm here to help with your study material, which covers "
                    "computer science, programming, software development, and related technical topics. "
                    "Feel free to ask me anything in those areas!"
                )
                self.db.add_message(chat_id, user_id, "assistant", answer)
                elapsed = time.time() - start_ts
                logger.info(f"[QA] Mode: off_topic | Time: {elapsed:.2f}s")
                return {"answer": answer, "sources": [], "mode": "off_topic"}

            # Retrieve relevant chunks
            logger.info("[QA] Retrieving relevant material chunks")
            chunks = self.doc_processor.get_relevant_chunks(
                query=question,
                user_id=user_id,
                material_id=material_id,
                use_all_materials=(material_id is None),
                top_k=RETRIEVE_TOP_K
            ) or []
            
            context = self._build_context(chunks)
            max_similarity = max([c.get("similarity", 0) for c in chunks], default=0)
            has_relevant_material = bool(context and max_similarity > 0.2)
            logger.info(f"[QA] Material relevance: {has_relevant_material}, max_sim: {max_similarity:.3f}")
            
            # Select relevant history using attention mechanism
            relevant_history = self.attention.select_relevant_context(question, full_history)
            
            # Add conversation memory
            facts = self.memory.get_all_facts(chat_id)
            facts_context = ""
            if facts:
                facts_list = [f"{k.replace('var_', '').replace('user_', '')}: {v}" for k, v in facts.items()]
                facts_context = f"\n\nUser's stated facts:\n" + "\n".join(facts_list)
            
            # Build prompt
            if has_relevant_material:
                logger.info("[QA] Using material-based prompt")
                system_prompt = (
                    "You are a helpful AI tutor. Answer questions based on the user's study material and conversation history.\n\n"
                    "CRITICAL RULES:\n"
                    "1. **Context awareness**: Use conversation history to understand pronouns like 'it', 'that', 'this'\n"
                    "2. **Be concise**: Simple questions = 1-2 sentences. Complex questions = 2-3 paragraphs\n"
                    "3. **Direct answers**: For 'What is X?' questions, answer directly without preamble\n"
                    "4. **Prioritize material**: Check uploaded material first before using general knowledge\n"
                    "5. **Natural tone**: Talk like a knowledgeable friend, not a textbook\n"
                    "6. **Follow-up questions**: If user asks 'explain it', refer to the last discussed topic\n"
                    "7. **Respect stated facts**: User's name/age/variables override material info\n\n"
                    "Examples:\n"
                    "- User: 'What is Python?' → 'Python is a high-level programming language...' (check material first)\n"
                    "- User: 'Explain it' (after Python discussion) → Explain Python in detail using context\n"
                    "- User: 'What is my age?' → 'You're X years old' (from stated facts, NOT material)\n"
                    f"{facts_context}"
                )
                user_msg = f"Material context:\n{context}\n\nQuestion: {question}"
            else:
                logger.info("[QA] Using expert knowledge prompt")
                system_prompt = (
                    "You are a knowledgeable AI tutor specializing in computer science and programming.\n\n"
                    "CRITICAL RULES:\n"
                    "1. **Context awareness**: Use conversation history to understand pronouns like 'it', 'that', 'this'\n"
                    "2. **Be concise**: Simple questions = 1-2 sentences. Complex = 2-3 paragraphs\n"
                    "3. **Direct answers**: Answer straightforward questions directly\n"
                    "4. **Natural tone**: Talk like a knowledgeable friend\n"
                    "5. **Expert knowledge**: Answer from your expertise when material doesn't cover it\n"
                    "6. **Follow-up understanding**: Track conversation flow for pronoun references\n"
                    f"{facts_context}"
                )
                user_msg = f"Question: {question}"
            
            messages = [SystemMessage(content=system_prompt)] + relevant_history + [HumanMessage(content=user_msg)]
            
            logger.info("[QA] Invoking LLM")
            response = self.llm.invoke(messages)
            answer = response.content.strip()
            
            self.db.add_message(chat_id, user_id, "assistant", answer)
            
            # Prepare sources
            sources = []
            if has_relevant_material:
                for c in chunks[:5]:
                    sources.append({
                        "content": c.get("content", "")[:300],
                        "similarity": round(c.get("similarity", 0), 3),
                        "metadata": c.get("metadata", {})
                    })
            
            mode = "material" if has_relevant_material else "expert_knowledge"
            elapsed = time.time() - start_ts
            logger.info(f"[QA] Mode: {mode} | Time: {elapsed:.2f}s")
            logger.info(f"[QA] ========== QUERY COMPLETE ==========\n")
            return {"answer": answer, "sources": sources, "mode": mode}

        except Exception as e:
            logger.exception(f"[QA] ERROR: {e}")
            error_msg = "I encountered an error. Please try rephrasing your question."
            self.db.add_message(chat_id, user_id, "assistant", error_msg)
            return {"answer": error_msg, "sources": [], "mode": "error", "error": str(e)}