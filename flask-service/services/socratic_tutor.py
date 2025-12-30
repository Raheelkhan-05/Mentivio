# services/socratic_tutor.py
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from services.document_processor import DocumentProcessor
from database.messages import MongoMessageDB
import os
from dotenv import load_dotenv
from typing import List, Dict, Optional
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

RETRIEVE_TOP_K = 20
MAX_CONTEXT_CHUNKS = 15
MAX_HISTORY_MESSAGES = 10
CONTEXT_WINDOW_CHARS = 10000
SEMANTIC_THRESHOLD = 0.3

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
        """Select relevant messages using semantic similarity."""
        if not history or len(history) <= max_msgs:
            return history
        
        msg_texts = [msg.content if hasattr(msg, 'content') else str(msg) for msg in history]
        attention_scores = self.compute_attention_scores(query, msg_texts)
        
        # Always include last 3 messages for continuity
        relevant_indices = set(range(max(0, len(history) - 3), len(history)))
        
        # Add semantically relevant messages
        ranked_indices = np.argsort(attention_scores)[::-1]
        for idx in ranked_indices:
            if attention_scores[idx] > SEMANTIC_THRESHOLD or len(relevant_indices) < 4:
                relevant_indices.add(idx)
            if len(relevant_indices) >= max_msgs:
                break
        
        selected = sorted(relevant_indices)
        return [history[i] for i in selected]

class SocraticTutor:
    """Production Socratic tutor with natural conversation."""
    
    def __init__(self):
        logger.info("[INIT] Socratic Tutor")
        self.llm = AzureChatOpenAI(
            azure_endpoint=os.getenv("AZURE_OPENAI_API_BASE"),
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
            azure_deployment=os.getenv("AZURE_OPENAI_API_NAME"),
            model_name=os.getenv("AZURE_OPENAI_MODEL", "gpt-4o"),
            temperature=0.7
        )
        self.doc_processor = DocumentProcessor()
        self.db = MongoMessageDB()
        self.semantic_attention = SemanticAttention()
        # Track state per chat
        self.chat_states = {}

    def _get_state(self, chat_id: str) -> Dict:
        """Get or create chat state."""
        if chat_id not in self.chat_states:
            self.chat_states[chat_id] = {
                "current_topic": None,
                "original_question": None,  # Track original question
                "probes_asked": 0,
                "got_good_answer": False
            }
        return self.chat_states[chat_id]

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
        return "\n\n".join(context_parts)

    def _get_history(self, chat_id: str) -> List:
        try:
            msgs = self.db.get_last_messages(chat_id, MAX_HISTORY_MESSAGES * 2)  # Get more for semantic filtering
            return [
                HumanMessage(content=m["content"]) if m["role"] == "user" 
                else AIMessage(content=m["content"])
                for m in msgs
            ]
        except:
            return []

    def _extract_topic(self, text: str) -> str:
        """Extract topic from question - preserving original terms."""
        t = text.strip()
        # Remove question words but keep the core topic
        t = re.sub(r'^(what is|what are|whats|what\'s|explain|tell me about|describe|how does|why does)\s+', '', t, flags=re.IGNORECASE)
        t = re.sub(r'\?+$', '', t).strip()
        
        # Keep acronyms and technical terms intact
        if t and len(t) > 1:
            words = t.split()[:5]  # Max 5 words
            return ' '.join(words)
        return text.strip()[:50]

    def _is_question_about_topic(self, text: str) -> bool:
        """Check if text is a new question."""
        lower = text.lower().strip()
        return bool(re.match(r'^(what|how|why|when|where|who|explain|tell|describe)', lower)) or text.endswith('?')

    def _is_confusion(self, text: str) -> bool:
        """Check if student is confused."""
        lower = text.lower().strip()
        confusion_phrases = [
            "don't know", "dont know", "idk", "no idea", 
            "not sure", "confused", "don't understand", "dont understand"
        ]
        return any(phrase in lower for phrase in confusion_phrases) or lower in ["no", "nope", "nah"]

    def _is_good_answer(self, text: str, topic: str) -> bool:
        """Check if student gave a substantive answer."""
        lower = text.lower().strip()
        words = lower.split()
        
        # Must be at least 5 words
        if len(words) < 5:
            return False
        
        # Check if mentions topic or related terms
        topic_words = set(topic.lower().split())
        text_words = set(words)
        has_topic = bool(topic_words & text_words)
        
        # Check for explanation patterns
        has_explanation = any(pattern in lower for pattern in [
            "is a", "is used", "used for", "used to", "is when",
            "helps", "allows", "creates", "runs", "works", 
            "means", "refers to", "involves", "processes", "analyzes"
        ])
        
        return has_topic and has_explanation

    def generate_questions(
        self,
        student_question: str,
        user_id: str,
        chat_id: str,
        material_id: Optional[str],
        use_all_materials: bool
    ) -> Dict:
        """Main generation method."""
        start = time.time()
        
        try:
            if not student_question or not chat_id:
                return {"answer": "What would you like to learn about?", "sources": [], "mode": "error"}
            
            if not user_id:
                use_all_materials = False
                material_id = None
            
            # Save user message
            if user_id:
                self.db.add_message(chat_id, user_id, "user", student_question)
            
            # Get state
            state = self._get_state(chat_id)
            
            # Determine what type of input this is
            is_new_question = self._is_question_about_topic(student_question)
            is_confused = self._is_confusion(student_question)
            
            topic = self._extract_topic(student_question)
            
            # Decision logic
            if is_new_question:
                # New topic - reset state
                state["current_topic"] = topic
                state["original_question"] = student_question  # Save original question
                state["probes_asked"] = 0
                state["got_good_answer"] = False
                mode = "initial_probe"
                logger.info(f"[NEW TOPIC] {topic}")
            
            elif is_confused:
                # Student doesn't know
                state["probes_asked"] += 1
                logger.info(f"[CONFUSED] Probe count: {state['probes_asked']}")
                
                if state["probes_asked"] >= 2:
                    # Give full answer after 2 failed attempts
                    mode = "full_explanation"
                    state["got_good_answer"] = True
                else:
                    # Simplify question
                    mode = "simpler_probe"
            
            elif self._is_good_answer(student_question, state.get("current_topic", "")):
                # Student gave good answer!
                state["got_good_answer"] = True
                state["probes_asked"] = 0
                mode = "celebrate"
                logger.info(f"[GOOD ANSWER] Topic: {state['current_topic']}")
            
            else:
                # Some other response
                if state["probes_asked"] >= 2:
                    mode = "full_explanation"
                    state["got_good_answer"] = True
                else:
                    state["probes_asked"] += 1
                    mode = "follow_up"
            
            # Get context
            chunks = []
            if user_id:
                try:
                    # Use original question for context retrieval
                    query_for_context = state.get("original_question") or student_question
                    chunks = self.doc_processor.get_relevant_chunks(
                        query=query_for_context,
                        user_id=user_id,
                        material_id=material_id,
                        use_all_materials=use_all_materials,
                        top_k=RETRIEVE_TOP_K
                    ) or []
                except Exception as e:
                    logger.warning(f"[CHUNKS] Error: {e}")
            
            context = self._build_context(chunks)
            
            # Get full history
            full_history = self._get_history(chat_id)
            
            # Use semantic attention to select relevant messages
            relevant_history = self.semantic_attention.select_relevant_context(
                query=state.get("original_question") or student_question,
                history=full_history,
                max_msgs=MAX_HISTORY_MESSAGES
            )
            
            # Generate response
            answer = self._generate(
                mode=mode,
                student_input=student_question,
                topic=state.get("current_topic", topic),
                original_question=state.get("original_question", student_question),
                context=context,
                history=relevant_history,
                probe_count=state["probes_asked"]
            )
            
            # Clean up any quotes from response
            answer = self._clean_response(answer)
            
            # Save bot message
            if user_id:
                self.db.add_message(chat_id, user_id, "assistant", answer)
            
            # Sources
            sources = []
            if chunks:
                for c in chunks[:3]:
                    sources.append({
                        "content": c.get("content", "")[:200],
                        "similarity": round(c.get("similarity", 0), 3),
                        "metadata": c.get("metadata", {})
                    })
            
            elapsed = time.time() - start
            logger.info(f"[DONE] {mode} in {elapsed:.2f}s")
            
            return {"answer": answer, "sources": sources, "mode": mode}
            
        except Exception as e:
            logger.exception(f"[ERROR] {e}")
            return {"answer": "Let me know what you'd like to explore!", "sources": [], "mode": "error"}

    def _clean_response(self, text: str) -> str:
        """Remove surrounding quotes and clean response."""
        text = text.strip()
        # Remove surrounding quotes
        if (text.startswith('"') and text.endswith('"')) or (text.startswith("'") and text.endswith("'")):
            text = text[1:-1].strip()
        return text

    def _generate(
        self,
        mode: str,
        student_input: str,
        topic: str,
        original_question: str,
        context: str,
        history: List,
        probe_count: int
    ) -> str:
        """Generate response based on mode."""
        
        # Get last few exchanges for context
        recent = ""
        if history:
            last_4 = history[-4:]
            lines = []
            for msg in last_4:
                if isinstance(msg, HumanMessage):
                    lines.append(f"Student: {msg.content}")
                elif isinstance(msg, AIMessage):
                    lines.append(f"You: {msg.content}")
            recent = "\n".join(lines)
        
        if mode == "initial_probe":
            # First question - ask a leading question that makes them think
            prompt = f"""You're a Socratic tutor. Student asked: "{original_question}"

Topic: {topic}

Context material (use for accuracy):
{context}

Your task: Ask ONE leading question that guides them to think about the answer. Don't ask what they know - ask a question that leads them toward understanding.

Good examples:
- "Think about how computers understand human language - what challenges might they face?"
- "If you wanted to teach a machine to understand text, what would it need to do?"
- "Consider apps like Siri or Google Translate - what must they do behind the scenes?"

Bad examples (don't do this):
- "What do you already know about {topic}?"
- "Have you heard of {topic} before?"

Keep it to 1-2 sentences. Be natural and curious, not robotic. Never say "Great question!"

CRITICAL: Output ONLY the question, with NO surrounding quotes."""

        elif mode == "simpler_probe":
            # They said "I don't know" once - ask simpler
            prompt = f"""Original question: "{original_question}"
Topic: {topic}
Student said: "{student_input}" (they don't know)
Probe count: {probe_count}/2

Recent chat:
{recent}

Give an encouraging response with a SIMPLER leading question. Make it easier and more concrete.

Examples:
- "No worries! Think about when you use voice assistants - what must the computer do to understand you?"
- "That's okay! Have you used Google Translate? What do you think it's doing when it translates?"

Keep it to 2 sentences max. Be encouraging and casual.

CRITICAL: Output ONLY your response, with NO surrounding quotes."""

        elif mode == "follow_up":
            # They gave some response but not complete
            prompt = f"""Original question: "{original_question}"
Topic: {topic}
Student said: "{student_input}"
Probe count: {probe_count}/2

Recent chat:
{recent}

They gave a partial answer. Ask a natural follow-up that helps them expand their thinking.

Examples:
- "You're on the right track! What specific steps would that involve?"
- "Good start! How do you think that actually works?"

1-2 sentences. Keep it conversational and guiding.

CRITICAL: Output ONLY your response, with NO surrounding quotes."""

        elif mode == "full_explanation":
            # They don't know after 2 tries - explain fully
            prompt = f"""Original question: "{original_question}"
Topic: {topic}
Student said: "{student_input}" 
They've struggled {probe_count} times. Time to explain clearly.

Recent chat:
{recent}

Context material (use this for accurate information):
{context}

Write a clear, friendly explanation:
1. Start: "No problem! Let me explain."
2. Explain what {topic} is (2-3 simple sentences) - use the context material
3. Give a concrete example related to {topic}
4. End: "Make sense?"

Be conversational, not textbook-like. Use the context for accuracy. Stay on the topic of {topic} - don't explain unrelated concepts.

CRITICAL: Output ONLY your explanation, with NO surrounding quotes."""

        elif mode == "celebrate":
            # They got it right! Celebrate and add knowledge
            prompt = f"""IMPORTANT: Student correctly explained {topic}!

Original question: "{original_question}"
Their answer: "{student_input}"

Recent chat:
{recent}

Context material:
{context}

Your response:
1. Celebrate enthusiastically (1 sentence): "Exactly!" or "Spot on!" or "Yes, that's right!"
2. Acknowledge their answer briefly
3. Add 2-3 NEW interesting facts from the context about {topic}
4. Ask if they want to know more: "Want to dive deeper?" or "Curious about anything else?"

Be natural and enthusiastic. Don't ask them to explain more - they already did!

CRITICAL: Output ONLY your response, with NO surrounding quotes."""

        else:
            prompt = f"""Original question: "{original_question}"
Topic: {topic}
Student: "{student_input}"

Respond naturally as a friendly tutor. Keep it conversational.

CRITICAL: Output ONLY your response, with NO surrounding quotes."""
        
        # Build messages
        messages = [
            SystemMessage(content="You are a Socratic tutor. Keep responses natural and conversational. Never wrap your response in quotes. Output your text directly without any quotation marks around it."),
            HumanMessage(content=prompt)
        ]
        
        # Generate
        response = self.llm.invoke(messages)
        return response.content.strip()