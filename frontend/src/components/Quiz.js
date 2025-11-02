import React, { useState } from 'react';
import { generateQuiz, submitQuiz } from '../services/api';

function Quiz({ userId, materialId, useAllMaterials, onQuizComplete }) {
  const [stage, setStage] = useState('setup'); // 'setup', 'taking', 'results'
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [quiz, setQuiz] = useState(null);
  const [quizId, setQuizId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateQuiz = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await generateQuiz(
        topic,
        userId,
        materialId,
        numQuestions,
        difficulty,
        useAllMaterials
      );

      if (response.quiz) {
        setQuiz(response.quiz);
        setQuizId(response.quizId);
        setAnswers({});
        setStage('taking');
      } else {
        alert('Failed to generate quiz: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleSubmitQuiz = async () => {
    const answersArray = quiz.questions.map((_, index) => answers[index] || '');
    
    if (answersArray.some(a => !a)) {
      if (!window.confirm('Some questions are unanswered. Submit anyway?')) {
        return;
      }
    }

    setLoading(true);

    try {
      const response = await submitQuiz(quizId, answersArray);
      setResults(response);
      setStage('results');
      
      if (onQuizComplete) {
        onQuizComplete();
      }
    } catch (error) {
      alert('Error submitting quiz: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = () => {
    setStage('setup');
    setQuiz(null);
    setQuizId(null);
    setAnswers({});
    setResults(null);
    setTopic('');
  };

  if (stage === 'setup') {
    return (
      <div className="quiz-container">
        <h2>Generate Quiz</h2>
        <p>Create a personalized quiz from your study materials</p>

        <form onSubmit={handleGenerateQuiz} className="quiz-setup-form">
          <div className="form-group">
            <label>Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Machine Learning Basics"
              required
            />
          </div>

          <div className="form-group">
            <label>Number of Questions</label>
            <select
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
            >
              <option value={3}>3 questions</option>
              <option value={5}>5 questions</option>
              <option value={10}>10 questions</option>
              <option value={15}>15 questions</option>
            </select>
          </div>

          <div className="form-group">
            <label>Difficulty</label>
            <div className="difficulty-buttons">
              <button
                type="button"
                className={difficulty === 'easy' ? 'active' : ''}
                onClick={() => setDifficulty('easy')}
              >
                Easy
              </button>
              <button
                type="button"
                className={difficulty === 'medium' ? 'active' : ''}
                onClick={() => setDifficulty('medium')}
              >
                Medium
              </button>
              <button
                type="button"
                className={difficulty === 'hard' ? 'active' : ''}
                onClick={() => setDifficulty('hard')}
              >
                Hard
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Generating...' : 'Generate Quiz'}
          </button>
        </form>
      </div>
    );
  }

  if (stage === 'taking' && quiz) {
    return (
      <div className="quiz-container">
        <div className="quiz-header">
          <h2>{quiz.topic}</h2>
          <div className="quiz-info">
            <span className="badge">{quiz.difficulty}</span>
            <span>Questions: {quiz.questions.length}</span>
            <span>Answered: {Object.keys(answers).length}/{quiz.questions.length}</span>
          </div>
        </div>

        <div className="questions-list">
          {quiz.questions.map((question, index) => (
            <div key={index} className="question-card">
              <h3>Question {index + 1}</h3>
              <p className="question-text">{question.question}</p>

              <div className="options">
                {Object.entries(question.options).map(([key, value]) => (
                  <label key={key} className="option">
                    
                    <input
                      type="radio"
                      name={`question-${index}`}
                      value={key}
                      checked={answers[index] === key}
                      onChange={() => handleAnswerSelect(index, key)}
                    />
                    <span className="option-text">{value}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="quiz-actions">
          <button onClick={handleRestart} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSubmitQuiz}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Submitting...' : 'Submit Quiz'}
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'results' && results) {
    return (
      <div className="quiz-container">
        <div className="results-header">
          <h2>Quiz Results</h2>
          <div className="score-display">
            <div className="score-circle">
              <span className="score">{results.score.toFixed(0)}%</span>
            </div>
            <p>{results.correctCount} out of {results.totalQuestions} correct</p>
          </div>
        </div>

        <div className="feedback-section">
          <h3>Feedback</h3>
          <div className="feedback-content">
            {results.feedback.feedback}
          </div>
        </div>

        {results.progress && (
          <div className="progress-section">
            <h3>Your Progress</h3>
            
            {results.progress.strongTopics.length > 0 && (
              <div className="topics-list">
                <h4>💪 Strong Topics</h4>
                <ul>
                  {results.progress.strongTopics.map((topic, i) => (
                    <li key={i}>{topic}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {results.progress.weakTopics.length > 0 && (
              <div className="topics-list">
                <h4>📚 Topics to Review</h4>
                <ul>
                  {results.progress.weakTopics.map((topic, i) => (
                    <li key={i}>{topic}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <p className="overall-accuracy">
              Overall Accuracy: <strong>{results.progress.overallAccuracy.toFixed(1)}%</strong>
            </p>
          </div>
        )}

        <div className="questions-review">
          <h3>Question Review</h3>
          {results.questions.map((question, index) => (
            <div key={index} className={`question-review ${question.isCorrect ? 'correct' : 'incorrect'}`}>
              <h4>
                Question {index + 1}
                {question.isCorrect ? ' ✅' : ' ❌'}
              </h4>
              <p className="question-text">{question.question}</p>
              <p>
                <strong>Your answer:</strong> {question.userAnswer}
                {!question.isCorrect && (
                  <span> (Correct: {question.correctAnswer})</span>
                )}
              </p>
              <div className="explanation">
                <strong>Explanation:</strong> {question.explanation}
              </div>
            </div>
          ))}
        </div>

        <div className="quiz-actions">
          <button onClick={handleRestart} className="btn-primary">
            Take Another Quiz
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default Quiz;