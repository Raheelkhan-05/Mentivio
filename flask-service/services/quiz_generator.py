from langchain_openai import AzureChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage
from services.document_processor import DocumentProcessor
import os
import json
from dotenv import load_dotenv

load_dotenv()

class QuizGenerator:
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
        
        self.doc_processor = DocumentProcessor()
    
    def generate_quiz(self, topic, user_id, material_id=None, num_questions=5, difficulty='medium', use_all_materials=False):
        """Generate quiz questions from materials"""
        try:
            # Retrieve relevant chunks
            relevant_chunks = self.doc_processor.get_relevant_chunks(
                topic,
                user_id,
                material_id,
                use_all_materials,
                top_k=10
            )
            
            if not relevant_chunks:
                return {'error': 'No relevant materials found for this topic'}
            
            context = "\n\n".join([chunk['content'] for chunk in relevant_chunks])
            
            # Difficulty mapping
            difficulty_instructions = {
                'easy': 'Focus on basic concepts, definitions, and recall. Questions should be straightforward.',
                'medium': 'Include application and understanding questions. Mix recall with analysis.',
                'hard': 'Focus on analysis, synthesis, and application. Include complex scenarios.'
            }
            
            prompt = ChatPromptTemplate.from_messages([
                SystemMessage(content=f"""You are an expert quiz generator for educational purposes.

Generate {num_questions} multiple-choice questions based on the provided content.

Difficulty Level: {difficulty}
{difficulty_instructions.get(difficulty, difficulty_instructions['medium'])}

Requirements:
- Each question must have 4 options (A, B, C, D)
- Only one correct answer per question
- Include brief explanations for correct answers
- Questions should test understanding, not just memorization
- Ensure questions are clear and unambiguous

Return ONLY a valid JSON array with this exact structure:
[
  {{
    "question": "Question text here?",
    "options": {{
      "A": "Option A text",
      "B": "Option B text",
      "C": "Option C text",
      "D": "Option D text"
    }},
    "correct_answer": "A",
    "explanation": "Brief explanation of why this is correct"
  }}
]"""),
                HumanMessage(content=f"""Topic: {topic}

Content:
{context}

Generate {num_questions} multiple-choice questions.""")
            ])
            
            messages = prompt.format_messages()
            response = self.llm.invoke(messages)
            
            # Parse JSON response
            try:
                # Extract JSON from response
                content = response.content.strip()
                if content.startswith('```json'):
                    content = content[7:]
                if content.startswith('```'):
                    content = content[3:]
                if content.endswith('```'):
                    content = content[:-3]
                content = content.strip()
                
                quiz_data = json.loads(content)
                return {
                    'topic': topic,
                    'difficulty': difficulty,
                    'questions': quiz_data
                }
            except json.JSONDecodeError:
                # Fallback if JSON parsing fails
                return {
                    'topic': topic,
                    'difficulty': difficulty,
                    'questions': [],
                    'error': 'Failed to parse quiz format'
                }
                
        except Exception as e:
            return {'error': str(e)}
    
    def generate_flashcards(self, topic, user_id, material_id=None, num_cards=10, use_all_materials=False):
        """Generate flashcards from materials"""
        try:
            relevant_chunks = self.doc_processor.get_relevant_chunks(
                topic,
                user_id,
                material_id,
                use_all_materials,
                top_k=15
            )
            
            if not relevant_chunks:
                return {'error': 'No relevant materials found for this topic'}
            
            context = "\n\n".join([chunk['content'] for chunk in relevant_chunks])
            
            prompt = ChatPromptTemplate.from_messages([
                SystemMessage(content=f"""You are an expert at creating effective study flashcards.

Generate {num_cards} flashcards from the provided content.

Guidelines:
- Front: Clear, concise question or prompt
- Back: Concise answer (2-3 sentences max)
- Focus on key concepts, definitions, and important facts
- Make questions specific and answerable
- Ensure cards are useful for quick revision

Return ONLY a valid JSON array:
[
  {{
    "front": "Question or prompt",
    "back": "Concise answer"
  }}
]"""),
                HumanMessage(content=f"""Topic: {topic}

Content:
{context}

Generate {num_cards} flashcards.""")
            ])
            
            messages = prompt.format_messages()
            response = self.llm.invoke(messages)
            
            try:
                content = response.content.strip()
                if content.startswith('```json'):
                    content = content[7:]
                if content.startswith('```'):
                    content = content[3:]
                if content.endswith('```'):
                    content = content[:-3]
                content = content.strip()
                
                flashcards = json.loads(content)
                return {
                    'topic': topic,
                    'flashcards': flashcards
                }
            except json.JSONDecodeError:
                return {'error': 'Failed to parse flashcard format'}
                
        except Exception as e:
            return {'error': str(e)}
    
    def evaluate_answers(self, user_answers, correct_answers, topic):
        """Evaluate quiz answers and provide feedback"""
        try:
            # Calculate score
            total = len(correct_answers)
            correct = sum(1 for i, ans in enumerate(user_answers) if ans == correct_answers[i])
            score = (correct / total) * 100
            
            # Generate feedback
            prompt = ChatPromptTemplate.from_messages([
                SystemMessage(content="""You are an encouraging AI tutor providing feedback on quiz performance.

Analyze the student's performance and provide:
1. Overall assessment of their understanding
2. Specific strengths (topics they did well on)
3. Areas for improvement (topics to revise)
4. Encouraging next steps
5. Suggested difficulty adjustment for next quiz

Be supportive and constructive."""),
                HumanMessage(content=f"""Topic: {topic}
Score: {correct}/{total} ({score:.1f}%)

Provide personalized feedback and recommendations.""")
            ])
            
            messages = prompt.format_messages()
            response = self.llm.invoke(messages)
            
            return {
                'score': score,
                'correct': correct,
                'total': total,
                'feedback': response.content,
                'suggested_difficulty': 'hard' if score >= 80 else 'medium' if score >= 50 else 'easy'
            }
            
        except Exception as e:
            return {'error': str(e)}