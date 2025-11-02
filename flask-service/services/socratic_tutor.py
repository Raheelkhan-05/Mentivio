from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage
from services.document_processor import DocumentProcessor
import os
from dotenv import load_dotenv

load_dotenv()

class SocraticTutor:
    def __init__(self):
        # Initialize Azure OpenAI LLM
        self.llm = AzureChatOpenAI(
            azure_endpoint=os.getenv("AZURE_OPENAI_API_BASE"),
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
            azure_deployment=os.getenv("AZURE_OPENAI_API_NAME"),
            model_name="gpt-4o",
            temperature=0.8
        )
        
        # Initialize document processor
        self.doc_processor = DocumentProcessor()
    
    def generate_questions(self, student_question, user_id, material_id=None, use_all_materials=False):
        """Generate Socratic questions to guide student thinking"""
        try:
            # Retrieve relevant chunks
            relevant_chunks = self.doc_processor.get_relevant_chunks(
                student_question,
                user_id,
                material_id,
                use_all_materials,
                top_k=3
            )
            
            if not relevant_chunks:
                return {
                    'questions': ["What materials have you studied on this topic?", 
                                "Can you break down what you already know about this?"],
                    'hint': "Upload your study materials first so I can guide you better!"
                }
            
            # Prepare context
            context = "\n\n".join([chunk['content'] for chunk in relevant_chunks])
            
            # Create Socratic prompt
            prompt = ChatPromptTemplate.from_messages([
                SystemMessage(content="""You are a Socratic AI tutor. Your goal is to guide students to discover answers themselves through thoughtful questioning.

Guidelines:
- Never give direct answers
- Ask 2-3 thought-provoking questions that lead to understanding
- Questions should be progressive (simple to complex)
- Encourage critical thinking and deeper analysis
- Reference the context subtly without revealing the answer
- Be encouraging and supportive

Your questions should help students:
1. Recall what they already know
2. Make connections between concepts
3. Think about implications and applications
4. Arrive at the answer through their own reasoning"""),
                HumanMessage(content=f"""Context from study materials:
{context}

Student Question: {student_question}

Generate 2-3 Socratic questions to guide the student toward understanding, without giving away the answer directly.""")
            ])
            
            # Generate questions
            messages = prompt.format_messages()
            response = self.llm.invoke(messages)
            
            # Parse questions (assuming they come as numbered list)
            questions_text = response.content
            questions = [q.strip() for q in questions_text.split('\n') if q.strip() and (q.strip()[0].isdigit() or q.strip().startswith('-'))]
            
            # Clean up questions
            cleaned_questions = []
            for q in questions:
                # Remove numbering
                q = q.lstrip('0123456789.-) ')
                if q:
                    cleaned_questions.append(q)
            
            return {
                'questions': cleaned_questions if cleaned_questions else [questions_text],
                'hint': "Think through these questions step by step. Try to connect what you already know!"
            }
            
        except Exception as e:
            return {
                'questions': [f"Let's break this down. What do you already know about this topic?"],
                'hint': f"Error: {str(e)}"
            }