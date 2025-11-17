from flask import Flask, request, jsonify
from flask_cors import CORS
from services.document_processor import DocumentProcessor
from services.qa_service import QAService
from services.quiz_generator import QuizGenerator
from services.socratic_tutor import SocraticTutor
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize services
doc_processor = DocumentProcessor()
qa_service = QAService()
quiz_generator = QuizGenerator()
socratic_tutor = SocraticTutor()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"}), 200

@app.route('/process-document', methods=['POST'])
def process_document():
    try:
        data = request.get_json(force=True)
        file_path = data.get('file_path')
        user_id = data.get('user_id')
        material_id = data.get('material_id')

        print("Received data:", data)

        if not file_path:
            return jsonify({"success": False, "error": "Missing file_path"}), 400

        # Normalize path (handles both \\ and /)
        file_path = os.path.normpath(file_path)

        # Optional: restrict access to uploads directory
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        full_path = os.path.join(base_dir, file_path) if not os.path.isabs(file_path) else file_path

        if not os.path.exists(full_path):
            return jsonify({
                "success": False,
                "error": f"File not found at {full_path}"
            }), 400

        result = doc_processor.process_document(full_path, user_id, material_id)
        print("Processing Done...", result)
        return jsonify(result), 200

    except Exception as e:
        print("Error in /process-document:", str(e))
        return jsonify({"error": str(e)}), 500


@app.route('/ask-question', methods=['POST'])
def ask_question():
    """Contextual Q&A from user's materials with conversation memory"""
    try:
        data = request.json
        question = data.get('question')
        user_id = data.get('user_id')
        material_id = data.get('material_id')
        use_all_materials = data.get('use_all_materials', False)
        
        if not question or not user_id:
            return jsonify({"error": "Missing required fields"}), 400
        
        result = qa_service.answer_question(
            question, 
            user_id, 
            material_id, 
            use_all_materials
        )
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@app.route('/clear-conversation', methods=['POST'])
def clear_conversation():
    """Clear conversation history for a user"""
    try:
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({"error": "Missing user_id"}), 400
        
        qa_service.clear_conversation(user_id)
        
        return jsonify({
            "message": "Conversation history cleared successfully"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/socratic-question', methods=['POST'])
def socratic_question():
    """Socratic questioning mode"""
    try:
        data = request.json
        question = data.get('question')
        user_id = data.get('user_id')
        material_id = data.get('material_id')
        use_all_materials = data.get('use_all_materials', False)
        
        response = socratic_tutor.generate_questions(
            question,
            user_id,
            material_id,
            use_all_materials
        )
        return jsonify({"questions": response}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/generate-quiz', methods=['POST'])
def generate_quiz():
    """Generate quiz from materials"""
    try:
        data = request.json
        topic = data.get('topic')
        user_id = data.get('user_id')
        material_id = data.get('material_id')
        num_questions = data.get('num_questions', 5)
        difficulty = data.get('difficulty', 'medium')
        use_all_materials = data.get('use_all_materials', False)
        
        quiz = quiz_generator.generate_quiz(
            topic,
            user_id,
            material_id,
            num_questions,
            difficulty,
            use_all_materials
        )
        return jsonify({"quiz": quiz}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/generate-flashcards', methods=['POST'])
def generate_flashcards():
    try:
        data = request.json
        topic = data.get('topic')
        user_id = data.get('user_id')
        material_id = data.get('material_id')
        num_cards = data.get('num_cards', 10)
        use_all_materials = data.get('use_all_materials', False)
        
        flashcards = quiz_generator.generate_flashcards(
            topic,
            user_id,
            material_id,
            num_cards,
            use_all_materials
        )
        return jsonify({"flashcards": flashcards}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/evaluate-answers', methods=['POST'])
def evaluate_answers():
    """Evaluate quiz answers and provide feedback"""
    try:
        data = request.json
        answers = data.get('answers')
        correct_answers = data.get('correct_answers')
        topic = data.get('topic')
        
        feedback = quiz_generator.evaluate_answers(answers, correct_answers, topic)
        return jsonify({"feedback": feedback}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)