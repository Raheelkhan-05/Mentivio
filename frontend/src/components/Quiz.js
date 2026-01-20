import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { generateQuiz, submitQuiz, getQuizHistory, getQuizDetails } from '../services/api';
import { updateGoalPathProgress, fetchGoalPath } from '../services/api';

function Quiz({ userId, materialId, useAllMaterials, onQuizComplete }) {
  const [stage, setStage] = useState('setup');
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [quiz, setQuiz] = useState(null);
  const [quizId, setQuizId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [quizHistory, setQuizHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryQuiz, setSelectedHistoryQuiz] = useState(null);

  useEffect(() => {
    fetchQuizHistory();
  }, [userId]);

  const fetchQuizHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await getQuizHistory(userId);
      setQuizHistory(response.quizzes || []);
    } catch (error) {
      console.error('Error fetching quiz history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleViewHistoryQuiz = async (historyQuizId) => {
    setLoading(true);
    try {
      const response = await getQuizDetails(historyQuizId);
      setSelectedHistoryQuiz(response.quiz);
      setStage('history-detail');
    } catch (error) {
      alert('Error loading quiz details: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

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

      fetchQuizHistory();

      if (onQuizComplete) {
        onQuizComplete();
      }
    } catch (error) {
      alert('Error submitting quiz: ' + error.message);
    } finally {
      setLoading(false);
    }

    // Update goal path progress after quiz completion
    try {
      
      // First check if user has a goal path
      const goalPathResponse = await fetchGoalPath(userId);
      
      if (goalPathResponse.success && goalPathResponse.goalPath) {
        const currentGoal = goalPathResponse.goalPath.goal.original;
        
        console.log('Updating goal path progress after quiz completion...');
        await updateGoalPathProgress(userId, currentGoal);
        console.log('Goal path updated successfully');
      }
    } catch (goalError) {
      // Silently fail if goal path update fails - don't interrupt quiz flow
      console.warn('Could not update goal path:', goalError.message);
    }

  };

  const handleRestart = () => {
    setStage('setup');
    setQuiz(null);
    setQuizId(null);
    setAnswers({});
    setResults(null);
    setSelectedHistoryQuiz(null);
    setTopic('');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-orange-400';
    return 'text-red-600';
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'from-green-500 to-green-600';
    if (score >= 60) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-red-600';
  };



  const getDifficultyColor = (diff) => {
    if (diff === 'easy') return 'bg-green-100 text-green-700 border-green-300';
    if (diff === 'medium') return 'bg-orange-100 text-orange-700 border-orange-300';
    return 'bg-red-100 text-red-700 border-red-300';

  };

  const HistorySidePanel = () => (
    <>
      {showHistory && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={() => setShowHistory(false)}
          />

          <div className="fixed inset-y-0 left-0 w-80 lg:w-96
                        bg-white border-r border-gray-200 shadow-2xl
                        z-50 flex flex-col animate-slideIn slide-in">

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200
                          bg-gradient-to-r from-green-50 via-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <h3 className="text-gray-900 font-bold text-base">
                    Quiz History
                  </h3>
                </div>

                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-white/60 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" />
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce delay-150" />
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce delay-300" />
                  </div>
                </div>
              ) : quizHistory.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full
                                flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 text-sm font-medium">
                    No quizzes yet
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Start your first quiz
                  </p>
                </div>
              ) : (
                quizHistory.map((historyItem) => (
                  <div
                    key={historyItem._id}
                    onClick={() => {
                      handleViewHistoryQuiz(historyItem._id); // existing logic
                      setShowHistory(false);                  // close sidebar
                    }}
                    className="group bg-white p-4 rounded-xl cursor-pointer
                             border border-gray-200 transition-all
                             hover:shadow-md hover:border-blue-300"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-gray-900 text-sm flex-1 pr-2 line-clamp-2">
                        {historyItem.topic}
                      </p>
                      <span className={`text-lg font-bold ${getScoreColor(historyItem.score)}`}>
                        {historyItem.score}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className={`px-2 py-0.5 rounded-full border ${getDifficultyColor(historyItem.difficulty)}`}>
                        {historyItem.difficulty}
                      </span>
                      <span className="text-gray-500">
                        {historyItem.totalQuestions} Qs
                      </span>
                      <span className="text-gray-400">
                        {formatDate(historyItem.completedAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );


  if (stage === 'setup') {
    return (
      <div className="flex bg-gray-50 relative h-[100vh]">
        <HistorySidePanel />

        <div className="flex-1 flex flex-col min-w-0 h-[76vh] sm:h-[83vh]">
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Generate Quiz</h2>
                  <p className="text-sm text-gray-500">Create a personalized quiz from your study materials</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors text-sm font-medium border border-gray-200"
              >
                <Clock className="w-4 h-4" />
                <span className="hidden md:inline">History</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 pt-2 sm:p-6 sm:pt-3">
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleGenerateQuiz} className="space-y-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Topic</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Machine Learning Basics"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                  />
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Questions</label>
                  <select
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm bg-white"
                  >
                    <option value={3}>3 questions</option>
                    <option value={5}>5 questions</option>
                    <option value={10}>10 questions</option>
                    <option value={15}>15 questions</option>
                  </select>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Difficulty</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setDifficulty('easy')}
                      className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 text-sm ${difficulty === 'easy'
                          ? 'bg-green-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      Easy
                    </button>
                    <button
                      type="button"
                      onClick={() => setDifficulty('medium')}
                      className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 text-sm ${difficulty === 'medium'
                          ? 'bg-orange-400 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      Medium
                    </button>
                    <button
                      type="button"
                      onClick={() => setDifficulty('hard')}
                      className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 text-sm ${difficulty === 'hard'
                          ? 'bg-red-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      Hard
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 focus:ring-4 focus:ring-blue-200 text-white rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-base"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </span>
                  ) : (
                    'Generate Quiz'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes slideIn {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
          .animate-slideIn {
            animation: slideIn 0.3s ease-out;
          }
        `}</style>
      </div>
    );
  }

  if (stage === 'taking' && quiz) {
    return (
      <div className="flex bg-gray-50 relative h-[100vh]">
        <HistorySidePanel />

        <div className="flex-1 flex flex-col min-w-0 h-[89vh] sm:h-[89vh]">
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{quiz.topic}</h2>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getDifficultyColor(quiz.difficulty)}`}>
                    {quiz.difficulty}
                  </span>
                  <span className="text-sm text-gray-600">
                    {quiz.questions.length} Questions
                  </span>
                  <span className="text-sm text-gray-600">
                    Answered: {Object.keys(answers).length}/{quiz.questions.length}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors text-sm font-medium border border-gray-200"
              >
                <Clock className="w-4 h-4" />
                <span className="hidden md:inline">History</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {quiz.questions.map((question, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 transition-all duration-200 hover:shadow-md"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <p className="text-gray-900 font-medium flex-1 leading-relaxed">
                      {question.question}
                    </p>
                  </div>

                  <div className="space-y-2 ml-11">
                    {Object.entries(question.options).map(([key, value]) => (
                      <label
                        key={key}
                        className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all duration-200 border-2 ${answers[index] === key
                            ? 'bg-blue-50 border-blue-500'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <input
                          type="radio"
                          name={`question-${index}`}
                          value={key}
                          checked={answers[index] === key}
                          onChange={() => handleAnswerSelect(index, key)}
                          className="mt-1 w-4 h-4 text-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="flex-1 text-sm text-gray-700">
                          <span className="font-semibold mr-2">{key.toUpperCase()}.</span>
                          {value}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border-t border-gray-200 p-4 sm:p-6">
            <div className="max-w-3xl mx-auto flex gap-3">
              <button
                onClick={handleRestart}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all duration-200 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitQuiz}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 focus:ring-4 focus:ring-blue-200 text-white rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  'Submit Quiz'
                )}
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes slideIn {
            from { transform: translateX(-100%); }
            to { transform: translateX(0); }
          }
          .animate-slideIn {
            animation: slideIn 0.3s ease-out;
          }
        `}</style>
      </div>
    );
  }

  if (stage === 'results' && results) {
    return (
      <div className="flex bg-gray-50 relative h-[100vh]">
        <HistorySidePanel />

        <div className="flex-1 flex flex-col min-w-0 h-[89vh] sm:h-[89vh]">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Quiz Results</h2>
                  <p className="text-sm text-gray-500">Your performance summary</p>
                </div>
              </div>

              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors text-sm font-medium border border-gray-200"
              >
                <Clock className="w-4 h-4" />
                <span className="hidden md:inline">History</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Score Card */}
              <div className="bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-gray-200">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div
                    className={`w-32 h-32 rounded-full bg-gradient-to-br ${getScoreBgColor(
                      results.score
                    )} p-1 shadow-lg`}
                  >
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                      <div className="text-center">
                        <div
                          className={`text-4xl font-bold ${getScoreColor(
                            results.score
                          )}`}
                        >
                          {results.score.toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Score</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {results.score >= 80
                        ? 'Excellent Work!'
                        : results.score >= 60
                          ? 'Good Job!'
                          : 'Keep Practicing!'}
                    </h3>
                    <p className="text-gray-600 text-lg">
                      You answered{' '}
                      <span className="font-semibold text-gray-900">
                        {results.correctCount}
                      </span>{' '}
                      out of{' '}
                      <span className="font-semibold text-gray-900">
                        {results.totalQuestions}
                      </span>{' '}
                      questions correctly
                    </p>
                  </div>
                </div>
              </div>



              {/* Question Review */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Question Review
                </h3>

                {results.questions.map((q, index) => (
                  <div
                    key={index}
                    className={`bg-white rounded-xl p-6 border shadow-sm ${q.isCorrect
                        ? 'border-green-200'
                        : 'border-red-200'
                      }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold ${q.isCorrect
                            ? 'bg-green-500'
                            : 'bg-red-500'
                          }`}
                      >
                        {index + 1}
                      </div>
                      <p className="text-gray-900 font-medium flex-1">
                        {q.question}
                      </p>
                    </div>

                    <div className="ml-11 space-y-2 text-sm">
                      {/* <p>
                      <span className="font-semibold text-gray-700">
                        Your Answer:
                      </span>{' '}
                      <span
                        className={
                          q.isCorrect
                            ? 'text-green-700'
                            : 'text-red-700'
                        }
                      >
                        {q.userAnswer}
                      </span>
                    </p> */}
                      {Object.entries(q.options).map(([key, value]) => {
                        const isCorrect = key === q.correctAnswer;
                        const isUser = key === q.userAnswer;
                        const isUserCorrect = isUser && isCorrect;

                        return (
                          <div
                            key={key}
                            className={`p-3 rounded-lg border flex items-start gap-2 ${isUserCorrect
                                ? 'bg-green-50 border-green-400'
                                : isUser
                                  ? 'bg-red-50 border-red-400'
                                  : isCorrect
                                    ? 'bg-green-50 border-green-300'
                                    : 'bg-gray-50 border-gray-200'
                              }`}
                          >
                            <span className="font-semibold">{key}.</span>
                            <span className="flex-1">{value}</span>

                            {isUserCorrect && (
                              <span className="text-xs font-semibold text-green-700">
                                Your Answer
                              </span>
                            )}

                            {!isUserCorrect && isUser && (
                              <span className="text-xs font-semibold text-red-700">
                                Your Answer
                              </span>
                            )}

                            {!isUserCorrect && isCorrect && (
                              <span className="text-xs font-semibold text-green-700">
                                Correct Answer
                              </span>
                            )}
                          </div>
                        );
                      })}


                      <div
                        className="
    rounded-lg p-[1px]
    bg-gradient-to-r from-green-400 via-blue-500 to-purple-500
  "
                      >
                        <div
                          className="
      rounded-lg
      bg-white/90 backdrop-blur
      p-3
      ring-1 ring-inset ring-white/60
    "
                        >
                          <span className="font-semibold text-gray-700">
                            Explanation:
                          </span>

                          <p className="text-gray-700 mt-1">
                            {q.explanation}
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleRestart}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold shadow-md transition-all text-sm"
                >
                  Take Another Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'history-detail' && selectedHistoryQuiz) {
    return (
      <div className="flex bg-gray-50 relative h-[100vh]">
        <HistorySidePanel />

        <div className="flex-1 flex flex-col min-w-0 h-[89vh] sm:h-[89vh]">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedHistoryQuiz.topic}
                </h2>
                {selectedHistoryQuiz.originalTopic !==
                  selectedHistoryQuiz.topic && (
                    <p className="text-sm text-gray-500">
                      Original: “{selectedHistoryQuiz.originalTopic}”
                    </p>
                  )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRestart}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold shadow-md transition-all text-sm"
                >
                  Back
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors text-sm font-medium border border-gray-200"
                >
                  <Clock className="w-4 h-4" />
                  <span className="hidden md:inline">History</span>
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Score Summary */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-green-400 to-purple-500 p-1">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                      <span className="text-3xl font-bold text-gray-900">
                        {selectedHistoryQuiz.score}%
                      </span>
                    </div>
                  </div>

                  <div className="text-center sm:text-left">
                    <p className="text-lg font-semibold text-gray-900">
                      {Math.round(
                        (selectedHistoryQuiz.totalQuestions *
                          selectedHistoryQuiz.score) /
                        100
                      )}{' '}
                      / {selectedHistoryQuiz.totalQuestions} correct
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Completed on{' '}
                      {new Date(
                        selectedHistoryQuiz.completedAt
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <span className="text-sm font-medium text-gray-500">
                    Difficulty
                  </span>
                  <div className="mt-1">
                    <span
                      className={`inline-block px-3 py-1 capitalize rounded-full text-xs font-semibold ${getDifficultyColor(
                        selectedHistoryQuiz.difficulty
                      )}`}
                    >
                      {selectedHistoryQuiz.difficulty}
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <span className="text-sm font-medium text-gray-500">
                    Material Scope
                  </span>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {selectedHistoryQuiz.materialScope === 'specific'
                      ? 'Specific Material'
                      : 'Global Knowledge'}
                  </p>
                </div>
              </div>

              {/* Question Review */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Question Review
                </h3>

                {selectedHistoryQuiz.questions.map((q, index) => (
                  <div
                    key={index}
                    className={`bg-white rounded-xl p-6 shadow-sm border ${q.isCorrect
                        ? 'border-green-200'
                        : 'border-red-200'
                      }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold ${q.isCorrect
                            ? 'bg-green-500'
                            : 'bg-red-500'
                          }`}
                      >
                        {index + 1}
                      </div>
                      <p className="text-gray-900 font-medium flex-1">
                        {q.question}
                      </p>
                    </div>

                    <div className="ml-11 space-y-2 text-sm">
                      {Object.entries(q.options).map(([key, value]) => {
                        const isCorrect = key === q.correctAnswer;
                        const isUser = key === q.userAnswer;
                        const isUserCorrect = isUser && isCorrect;

                        return (
                          <div
                            key={key}
                            className={`p-3 rounded-lg border flex items-start gap-2 ${isUserCorrect
                                ? 'bg-green-50 border-green-400'
                                : isUser
                                  ? 'bg-red-50 border-red-400'
                                  : isCorrect
                                    ? 'bg-green-50 border-green-300'
                                    : 'bg-gray-50 border-gray-200'
                              }`}
                          >
                            <span className="font-semibold">{key}.</span>
                            <span className="flex-1">{value}</span>

                            {isUserCorrect && (
                              <span className="text-xs font-semibold text-green-700">
                                Your Answer
                              </span>
                            )}

                            {!isUserCorrect && isUser && (
                              <span className="text-xs font-semibold text-red-700">
                                Your Answer
                              </span>
                            )}

                            {!isUserCorrect && isCorrect && (
                              <span className="text-xs font-semibold text-green-700">
                                Correct
                              </span>
                            )}
                          </div>
                        );
                      })}

                      <div
                        className="
    relative mt-2 rounded-xl p-[1px]
    bg-gradient-to-r from-green-400 via-blue-500 to-purple-500
  "
                      >
                        <div
                          className="
      rounded-xl
      bg-white/90 backdrop-blur
      p-4
      shadow-sm
      ring-1 ring-inset ring-white/60
    "
                        >
                          <span className="font-semibold tracking-wide text-gray-900">
                            Explanation
                          </span>

                          <p className="mt-2 leading-relaxed text-gray-700">
                            {q.explanation}
                          </p>
                        </div>
                      </div>







                    </div>

                  </div>
                ))}
              </div>

              {/* Action */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleRestart}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold shadow-md transition-all text-sm"
                >
                  Back to Quiz Setup
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return null;
}

export default Quiz;