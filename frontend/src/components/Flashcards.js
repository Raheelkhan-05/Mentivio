import React, { useState, useEffect, useMemo, memo } from 'react';
import { Search, Clock, ChevronLeft, ChevronRight, RotateCw, Check, X, Home, Trophy } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';

import {
  generateFlashcards,
  getFlashcardHistory,
  getFlashcardSetDetails,
  updateFlashcardMastery,
  recordStudySession
} from '../services/api';

// Move HistorySidePanel OUTSIDE and wrap with React.memo
const HistorySidePanel = memo(({
  showHistory,
  setShowHistory,
  searchQuery,
  setSearchQuery,
  flashcardHistory,
  historyLoading,
  handleViewHistorySet,
  formatDate,
  getMasteryColor
}) => {
  const filteredFlashcards = useMemo(() =>
    flashcardHistory.filter(item =>
      item.topic.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [flashcardHistory, searchQuery]
  );

  if (!showHistory) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={() => setShowHistory(false)}
      />

      <div
        className="fixed inset-y-0 left-0 w-80 lg:w-96
                      bg-white border-r border-gray-200 shadow-2xl
                      z-50 flex flex-col animate-slideIn slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200
                        bg-gradient-to-r from-green-50 via-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="text-gray-900 font-bold text-base">
                Flashcard Sets
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

        {/* Search */}
        <div className="p-4 relative">
          <Search className="absolute left-7 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search flashcards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
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
          ) : filteredFlashcards.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full
                              flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 text-sm font-medium">
                {searchQuery ? 'No matching flashcard sets' : 'No flashcard sets yet'}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {searchQuery ? 'Try a different search term' : 'Create your first set'}
              </p>
            </div>
          ) : (
            filteredFlashcards.map((historyItem) => {
              const mastery =
                historyItem.totalCards > 0
                  ? (historyItem.masteredCount / historyItem.totalCards) * 100
                  : 0;

              return (
                <div
                  key={historyItem._id}
                  onClick={() => handleViewHistorySet(historyItem._id)}
                  className="group bg-white p-3 rounded-lg cursor-pointer
                      border border-gray-200 transition-all
                      hover:shadow-md hover:border-blue-300"
                >
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-semibold text-gray-900 text-sm flex-1 pr-2 line-clamp-2">
                      {historyItem.topic}
                    </h4>
                    <span className={`text-lg font-bold ${getMasteryColor(mastery)}`}>
                      {mastery.toFixed(0)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs mb-1">
                    <span className="text-gray-600 font-medium">
                      {historyItem.totalCards} cards
                    </span>
                    <span className="text-green-600 font-medium">
                      {historyItem.masteredCount} mastered
                    </span>
                  </div>

                  <div className="pt-1 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      {formatDate(historyItem.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
});

HistorySidePanel.displayName = 'HistorySidePanel';

const Confetti = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-50">
      {Array.from({ length: 28 }).map((_, i) => (
        <span
          key={i}
          className="absolute animate-confetti-fall"
          style={{
            width: '6px',
            height: '10px',
            left: `${Math.random() * 100}%`,
            top: `${-20 - Math.random() * 80}px`,
            backgroundColor: ['#22c55e', '#3b82f6', '#a855f7'][i % 3],
            animationDelay: `${Math.random() * 0.8}s`,
            animationDuration: `${3.5 + Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  );
};

function Flashcards({ userId, materialId, useAllMaterials }) {
  const [stage, setStage] = useState('setup');
  const [topic, setTopic] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [numCards, setNumCards] = useState(10);
  const [flashcards, setFlashcards] = useState([]);
  const [sortedIndices, setSortedIndices] = useState([]);
  const [currentFlashcardSetId, setCurrentFlashcardSetId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [visitedCards, setVisitedCards] = useState(new Set());

  const [showHistory, setShowHistory] = useState(false);
  const [flashcardHistory, setFlashcardHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistorySet, setSelectedHistorySet] = useState(null);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);

  useEffect(() => {
    fetchFlashcardHistory();
  }, [userId]);

  useEffect(() => {
    if (flashcards.length > 0 && sortedIndices.length === 0) {
      const indices = createSortedIndices(flashcards);
      setSortedIndices(indices);
      setCurrentIndex(0);
      setVisitedCards(new Set([indices[0]]));
    }
  }, [flashcards.length]);

  const isStudyStage =
    (stage === 'studying' || stage === 'history-detail') &&
    flashcards.length > 0;

  let actualCardIndex;
  let currentCard;
  let isHistoryView;
  let masteredCount;
  let masteryPercentage;

  if (isStudyStage) {
    actualCardIndex = sortedIndices[currentIndex];
    currentCard = flashcards[actualCardIndex];
    isHistoryView = stage === 'history-detail';
    masteredCount = flashcards.filter(card => card.mastered).length;
    masteryPercentage = (
      (masteredCount / flashcards.length) * 100
    ).toFixed(0);
  }

  const createSortedIndices = (cards) => {
    const needReview = [];
    const mastered = [];

    cards.forEach((card, index) => {
      if (card.mastered) {
        mastered.push(index);
      } else {
        needReview.push(index);
      }
    });

    return [...needReview, ...mastered];
  };

  const fetchFlashcardHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await getFlashcardHistory(userId);
      setFlashcardHistory(response || []);
    } catch (error) {
      console.error('Error fetching flashcard history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleViewHistorySet = async (flashcardSetId) => {
    setLoading(true);
    try {
      const response = await getFlashcardSetDetails(flashcardSetId);
      const historySet = response;

      setSelectedHistorySet(historySet);
      setFlashcards(historySet.flashcards);
      const indices = createSortedIndices(historySet.flashcards);
      setSortedIndices(indices);
      setCurrentFlashcardSetId(historySet._id);
      setCurrentIndex(0);
      setFlipped(false);
      setVisitedCards(new Set([indices[0]]));
      setStage('history-detail');
      setShowHistory(false);

      await recordStudySession(flashcardSetId);
      fetchFlashcardHistory();
    } catch (error) {
      alert('Error loading flashcard set: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await generateFlashcards(
        topic,
        userId,
        materialId,
        numCards,
        useAllMaterials
      );

      if (result.flashcards) {
        const flashcardsData = result.flashcards;

        if (Array.isArray(flashcardsData)) {
          setFlashcards(flashcardsData);
          const indices = createSortedIndices(flashcardsData);
          setSortedIndices(indices);
          setCurrentFlashcardSetId(result._id);
          setCurrentIndex(0);
          setFlipped(false);
          setVisitedCards(new Set([indices[0]]));
          setStage('studying');
          setSelectedHistorySet(null);
          fetchFlashcardHistory();
        } else {
          alert("Failed to generate flashcards: invalid data format");
        }
      } else {
        alert("Failed to generate flashcards: " + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFlip = () => {
    setFlipped(!flipped);
  };

  const handleNext = () => {
    if (currentIndex < sortedIndices.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setFlipped(false);
      setVisitedCards(prev => new Set([...prev, sortedIndices[nextIndex]]));
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prevIndex => {
        const newIndex = prevIndex - 1;

        setVisitedCards(prev => {
          const arr = Array.from(prev);
          arr.pop();
          return new Set(arr);
        });

        return newIndex;
      });

      setFlipped(false);
    }
  };

  const handleMarkMastered = async (mastered) => {
    
    if (!currentFlashcardSetId) return;

    const actualCardIndex = sortedIndices[currentIndex];

    try {
      await updateFlashcardMastery(currentFlashcardSetId, actualCardIndex, mastered);

      const updatedFlashcards = [...flashcards];
      updatedFlashcards[actualCardIndex].mastered = mastered;
      setFlashcards(updatedFlashcards);

      fetchFlashcardHistory();
    } catch (error) {
      console.error('Error updating mastery:', error);
    }
    handleNext();
  };

  const handleRestart = () => {
    setStage('setup');
    setFlashcards([]);
    setSortedIndices([]);
    setCurrentIndex(0);
    setFlipped(false);
    setTopic('');
    setSelectedHistorySet(null);
    setCurrentFlashcardSetId(null);
    setVisitedCards(new Set());
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

  const getMasteryColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-blue-600';
    return 'text-gray-500';
  };

  const allCardsVisited = sortedIndices.length === (currentIndex + 1);

  useEffect(() => {
    if (allCardsVisited) {
      setShowCompletionPopup(true);

      const timer = setTimeout(() => {
        setShowCompletionPopup(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
    if (!allCardsVisited) {
      setShowCompletionPopup(false);
    }
  }, [allCardsVisited]);

  return (
    <div className="flex bg-gray-50 relative h-[100vh] lg:h-[100vh]">
      <HistorySidePanel
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        flashcardHistory={flashcardHistory}
        historyLoading={historyLoading}
        handleViewHistorySet={handleViewHistorySet}
        formatDate={formatDate}
        getMasteryColor={getMasteryColor}
      />

      {/* SETUP STAGE */}
      {stage === 'setup' && (
        <div className="flex-1 flex flex-col min-w-0 h-[76vh] sm:h-[83vh]">
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Generate Flashcards</h2>
                <p className="text-sm text-gray-600">
                  Create flashcards for quick revision
                </p>
              </div>

              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100
                           text-gray-700 rounded-lg transition-colors text-sm
                           font-medium border border-gray-200"
              >
                <Clock className="w-4 h-4" />
                <span className="hidden md:inline">History</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 pt-2 sm:p-6 sm:pt-3">
            <div className="max-w-2xl mx-auto mt-12 lg:mt-12">
              <form onSubmit={handleGenerate} className="space-y-6">
                <div className="mb-5 rounded-lg bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 p-[1px]">
                  <div className="rounded-lg bg-white/90 backdrop-blur px-4 py-3">
                    <p className="text-md font-semibold text-gray-800">
                      What do you want to study?
                    </p>
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                      Enter a clear and specific material to generate accurate, focused flashcards.
                    </p>
                  </div>
                </div>




                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">

                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Topic
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Key Definitions in Biology"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-blue-500
                               transition-all text-sm"
                  />
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Number of Cards
                  </label>
                  <select
                    value={numCards}
                    onChange={(e) => setNumCards(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-blue-500
                               transition-all text-sm bg-white"
                  >
                    <option value={5}>5 cards</option>
                    <option value={10}>10 cards</option>
                    <option value={15}>15 cards</option>
                    <option value={20}>20 cards</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500
                             hover:from-blue-600 hover:to-purple-600
                             focus:ring-4 focus:ring-blue-200 text-white rounded-lg
                             font-semibold transition-all duration-200
                             disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </span>
                  ) : (
                    'Generate Flashcards'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {isStudyStage && (
        <>
          <div className="flex-1 flex flex-col min-w-0 h-[89vh] sm:h-[89vh]">
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {selectedHistorySet ? selectedHistorySet.topic : topic}
                    </h2>
                    <p className="text-xs text-gray-600">
                      {masteredCount} of {flashcards.length} mastered • {masteryPercentage}% complete
                    </p>
                  </div>
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

            <div className="flex-1 overflow-y-auto p-3 sm:p-5">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700">
                      Card {actualCardIndex + 1} of {flashcards.length}
                    </span>
                    <span className="text-xs font-semibold text-gray-700">
                      Progress: {currentIndex + 1}/{sortedIndices.length}
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${((currentIndex + 1) / sortedIndices.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {flashcards.map((card, index) => {
                      const isCurrent = index === actualCardIndex;

                      return (
                        <button
                          key={index}
                          onClick={() => {
                            const newPosition = sortedIndices.indexOf(index);
                            if (newPosition !== -1) {
                              setCurrentIndex(newPosition);
                              setFlipped(false);
                            }
                          }}
                          className={`relative w-11 h-11 rounded-lg font-semibold text-sm transition-all duration-200 ${isCurrent
                            ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-md scale-105 ring-2 ring-blue-300'
                            : card.mastered
                              ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                            }`}
                        >
                          {index + 1}
                          {card.mastered && !isCurrent && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {showCompletionPopup && (
                  <div className="fixed inset-0 z-50 flex items-start justify-center pointer-events-none">
                    <Confetti />
                    <div className="pointer-events-auto mt-6 animate-popup-enter bg-gradient-to-r from-green-50 via-blue-50 to-purple-50 rounded-xl p-4 shadow-lg border border-green-200 w-[90%] max-w-md relative overflow-hidden">
                      <div className="absolute bottom-0 left-0 h-[3px] w-full bg-transparent">
                        <div className="h-full bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 animate-[progress-fill_5s_linear_forwards]" />
                      </div>
                      <div className="flex items-start gap-3">
                        <Trophy className="w-8 h-8 text-green-600 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="text-sm font-bold text-gray-900">
                            🎉 Congratulations!
                          </h3>
                          <p className="text-xs text-gray-600 mt-1">
                            You've reviewed all flashcards. Great consistency!
                          </p>
                        </div>
                        <button
                          onClick={() => setShowCompletionPopup(false)}
                          className="text-gray-400 hover:text-gray-600 transition"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                )}

<div className="perspective-1000">
                  <div
                    className="relative w-full bg-white rounded-xl shadow-lg border border-gray-200 cursor-pointer transition-all duration-500 transform-style-3d"
                    style={{
                      minHeight: '280px',
                      transformStyle: 'preserve-3d',
                      transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                    onClick={handleFlip}
                  >
                    <div
                      className="absolute inset-0 p-6 flex flex-col justify-between backface-hidden rounded-xl"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <div className="relative h-full text-center">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-2">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500 text-white rounded-full text-xs font-semibold">
                            Question
                          </div>
                        </div>
                        <div className="flex items-center justify-center h-full px-4">
                          <p className="text-lg sm:text-xl font-semibold text-gray-900 leading-relaxed">
                            {currentCard.front}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-gray-400 text-xs font-medium">
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Click to reveal answer</span>
                      </div>
                    </div>

                    <div
                      className="absolute inset-0 p-6 flex flex-col justify-between backface-hidden rounded-xl bg-gradient-to-br from-green-50 via-blue-50 to-purple-50"
                      style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)'
                      }}
                    >
                      <div className="relative h-full flex flex-col items-center text-center">
                        <div className="block justify-center text-center mt-2">
                          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-green-500 text-white rounded-full text-xs font-semibold">
                            Answer
                          </div>
                        </div>
                        <div className="flex flex-1 items-center justify-center px-4">
                          <p className="text-lg sm:text-xl font-semibold text-gray-900 leading-relaxed">
                            {currentCard.back}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-gray-500 text-xs font-medium">
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Click to show question</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-2 px-2 sm:px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-all font-semibold text-sm border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden md:inline">Previous</span>
                  </button>

                  {currentCard.mastered !== undefined && (
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => handleMarkMastered(false)}
                        className={`flex items-center justify-center gap-2 h-11 px-6 rounded-lg font-semibold text-sm transition-all duration-200 ${currentCard.mastered === false
                          ? 'bg-yellow-500 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-yellow-50 border border-gray-300'
                          }`}
                      >
                        <AlertTriangle
                          className={`w-4 h-4 shrink-0 ${currentCard.mastered === false
                            ? 'text-white'
                            : 'text-yellow-500'
                            }`}
                        />
                        <span className="leading-none">Need Review</span>
                      </button>

                      <button
                        onClick={() => handleMarkMastered(true)}
                        className={`flex items-center justify-center gap-2 h-11 px-6 rounded-lg font-semibold text-sm transition-all duration-200 ${currentCard.mastered === true
                          ? 'bg-green-500 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                          }`}
                      >
                        <Check className="w-4 h-4 shrink-0" />
                        <span className="leading-none">Mastered</span>
                      </button>
                    </div>
                  )}

                  {!allCardsVisited ? (
                    <button
                      onClick={handleNext}
                      className="flex items-center gap-2 px-2 sm:px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-all font-semibold text-sm border border-gray-300"
                    >
                      <span className="hidden md:inline">Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleRestart}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold shadow-md transition-all text-sm"
                    >
                      New Topic?
                    </button>
                  )}
                </div>
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
            .perspective-1000 {
              perspective: 1000px;
            }
            .transform-style-3d {
              transform-style: preserve-3d;
            }
            .backface-hidden {
              backface-visibility: hidden;
            }
          `}</style>
        </>
      )}
    </div>
  );
}

export default Flashcards;