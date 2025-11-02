from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from services.document_processor import DocumentProcessor
import os
from dotenv import load_dotenv
from typing import List, Dict, Optional

load_dotenv()

class ConversationMemory:
    """Manages conversation history per user"""
    def __init__(self):
        self.conversations = {}  # {user_id: [messages]}
        self.max_history = 10  # Keep last 10 exchanges
    
    def add_message(self, user_id: str, role: str, content: str):
        """Add a message to user's conversation history"""
        if user_id not in self.conversations:
            self.conversations[user_id] = []
        
        if role == "user":
            self.conversations[user_id].append(HumanMessage(content=content))
        elif role == "assistant":
            self.conversations[user_id].append(AIMessage(content=content))
        
        # Keep only recent history
        if len(self.conversations[user_id]) > self.max_history * 2:
            self.conversations[user_id] = self.conversations[user_id][-self.max_history * 2:]
    
    def get_history(self, user_id: str) -> List:
        """Get user's conversation history"""
        return self.conversations.get(user_id, [])
    
    def clear_history(self, user_id: str):
        """Clear user's conversation history"""
        if user_id in self.conversations:
            self.conversations[user_id] = []


class QAService:
    def __init__(self):
        # Initialize Azure OpenAI LLM
        self.llm = AzureChatOpenAI(
            azure_endpoint=os.getenv("AZURE_OPENAI_API_BASE"),
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
            azure_deployment=os.getenv("AZURE_OPENAI_API_NAME"),
            model_name="gpt-4o",
            temperature=0.7
        )
        
        # Initialize document processor for retrieval
        self.doc_processor = DocumentProcessor()
        
        # Initialize conversation memory
        self.memory = ConversationMemory()
    
    def _is_general_query(self, question: str) -> bool:
        """Detect if query is general conversation (greetings, personal info, etc.)"""
        general_patterns = [
            'hello', 'hi', 'hey', 'how are you', 'what is your name',
            'who are you', 'remember', 'my name is', 'i am', 'what is my',
            'do you remember', 'good morning', 'good evening', 'thanks', 'thank you'
        ]
        question_lower = question.lower()
        return any(pattern in question_lower for pattern in general_patterns)
    
    def _requires_course_context(self, question: str) -> bool:
        """Detect if query specifically asks about uploaded materials"""
        context_patterns = [
            'according to', 'in the material', 'in my notes', 'from the document',
            'in the course', 'in my syllabus', 'from my', 'what does the material say'
        ]
        question_lower = question.lower()
        return any(pattern in question_lower for pattern in context_patterns)
    
    def answer_question(self, question: str, user_id: str, material_id: Optional[str] = None, 
                       use_all_materials: bool = False) -> Dict:
        """Answer questions with intelligent context usage and conversation memory"""
        try:
            # Get conversation history
            conversation_history = self.memory.get_history(user_id)
            
            # Determine if we should use document context
            is_general = self._is_general_query(question)
            needs_context = self._requires_course_context(question)
            
            # MODE 1: General conversation or "use_all_materials" mode
            # In "use_all_materials" mode, use LLM's general knowledge
            if is_general or use_all_materials:
                messages = [
                    SystemMessage(content="""You are a friendly and knowledgeable AI tutor assistant.
                    
Your role:
- Engage in natural conversation with students
- Remember information shared with you in the conversation
- Answer questions using your general knowledge
- Be concise and helpful
- When students share personal information (like their name), acknowledge and remember it

Keep responses professional but friendly. Don't be overly verbose.""")
                ]
                
                # Add conversation history for context
                messages.extend(conversation_history[-6:])  # Last 3 exchanges
                
                # Add current question
                messages.append(HumanMessage(content=question))
                
                # Generate response
                response = self.llm.invoke(messages)
                
                # Store in memory
                self.memory.add_message(user_id, "user", question)
                self.memory.add_message(user_id, "assistant", response.content)
                
                return {
                    'answer': response.content,
                    'sources': [],
                    'mode': 'general' if is_general else 'knowledge_base'
                }
            
            # MODE 2: Document-based Q&A (default mode with uploaded materials)
            else:
                # Retrieve relevant chunks
                relevant_chunks = self.doc_processor.get_relevant_chunks(
                    question,
                    user_id,
                    material_id,
                    use_all_materials=False,  # Only use specific materials
                    top_k=5
                )
                
                if not relevant_chunks:
                    # Fallback to general knowledge with a note
                    messages = [
                        SystemMessage(content="""You are a knowledgeable AI tutor.
                        
The student has asked a question, but no relevant information was found in their uploaded materials.
Provide a helpful answer using your general knowledge, but mention that this isn't from their specific materials.""")
                    ]
                    
                    messages.extend(conversation_history[-4:])  # Last 2 exchanges
                    messages.append(HumanMessage(content=question))
                    
                    response = self.llm.invoke(messages)
                    
                    self.memory.add_message(user_id, "user", question)
                    self.memory.add_message(user_id, "assistant", response.content)
                    
                    return {
                        'answer': f"I couldn't find this specific information in your uploaded materials. Based on general knowledge: {response.content}",
                        'sources': [],
                        'mode': 'fallback'
                    }
                
                # Prepare context from chunks
                context = "\n\n".join([chunk['content'] for chunk in relevant_chunks])
                
                # Check relevance of top chunk
                top_similarity = relevant_chunks[0].get('similarity', 0)
                
                # If similarity is low, blend with general knowledge
                if top_similarity < 0.3:
                    system_prompt = """You are an expert AI tutor.
                    
Provide a clear, concise answer to the student's question. Use the provided context if relevant, but feel free to supplement with general knowledge to give a complete answer.

Be natural - don't constantly reference "the context" or "the materials". Just answer the question professionally."""
                else:
                    system_prompt = """You are an expert AI tutor helping students learn from their study materials.
                    
Provide a clear, concise answer based on the context provided. Be direct and professional.

- Answer the question naturally without constantly saying "according to the context"
- Only mention the source if directly asked or when it adds value
- Be concise but thorough
- If context is insufficient, say so briefly and provide general guidance"""
                
                messages = [SystemMessage(content=system_prompt)]
                
                # Add recent conversation history for continuity
                messages.extend(conversation_history[-4:])  # Last 2 exchanges
                
                # Add current question with context
                messages.append(HumanMessage(content=f"""Context from study materials:
{context}

Question: {question}"""))
                
                # Generate answer
                response = self.llm.invoke(messages)
                
                # Store in memory
                self.memory.add_message(user_id, "user", question)
                self.memory.add_message(user_id, "assistant", response.content)
                
                return {
                    'answer': response.content,
                    'sources': [
                        {
                            'content': chunk['content'][:200] + '...' if len(chunk['content']) > 200 else chunk['content'],
                            'similarity': chunk['similarity']
                        }
                        for chunk in relevant_chunks[:3]
                    ],
                    'mode': 'document_based'
                }
            
        except Exception as e:
            return {
                'answer': f"I encountered an error: {str(e)}. Please try again.",
                'sources': [],
                'mode': 'error'
            }
    
    def clear_conversation(self, user_id: str):
        """Clear conversation history for a user"""
        self.memory.clear_history(user_id)