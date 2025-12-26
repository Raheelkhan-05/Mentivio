import React, { useState, useEffect } from 'react';
import { 
  generateFlashcards, 
  getFlashcardHistory, 
  getFlashcardSetDetails,
  updateFlashcardMastery,
  recordStudySession 
} from '../services/api';

function Flashcards({ userId, materialId, useAllMaterials }) {
  const [stage, setStage] = useState('setup'); // 'setup', 'studying', 'history-detail'
  const [topic, setTopic] = useState('');
  const [numCards, setNumCards] = useState(10);
  const [flashcards, setFlashcards] = useState([]);
  const [currentFlashcardSetId, setCurrentFlashcardSetId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);

  // History panel state
  const [showHistory, setShowHistory] = useState(true);
  const [flashcardHistory, setFlashcardHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistorySet, setSelectedHistorySet] = useState(null);

  // Load flashcard history on mount
  useEffect(() => {
    fetchFlashcardHistory();
  }, [userId]);

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
      setCurrentFlashcardSetId(historySet._id);
      setCurrentIndex(0);
      setFlipped(false);
      setStage('history-detail');
      
      // Record study session
      await recordStudySession(flashcardSetId);
      
      // Refresh history to update study count
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

      console.log("Flashcard API result:", result);

      // Check the new response format
      if (result.flashcards) {
        const flashcardsData = result.flashcards;
        
        if (Array.isArray(flashcardsData)) {
          setFlashcards(flashcardsData);
          setCurrentFlashcardSetId(result.flashcardSetId);
          setCurrentIndex(0);
          setFlipped(false);
          setStage('studying');
          setSelectedHistorySet(null);
          
          // Refresh history
          fetchFlashcardHistory();
        } else {
          console.error("Invalid flashcards data:", flashcardsData);
          alert("Failed to generate flashcards: invalid data format");
        }
      } else {
        alert("Failed to generate flashcards: " + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error("Error generating flashcards:", error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFlip = () => {
    setFlipped(!flipped);
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setFlipped(false);
    }
  };

  const handleMarkMastered = async (mastered) => {
    if (!currentFlashcardSetId) return;

    try {
      await updateFlashcardMastery(currentFlashcardSetId, currentIndex, mastered);
      
      // Update local state
      const updatedFlashcards = [...flashcards];
      updatedFlashcards[currentIndex].mastered = mastered;
      setFlashcards(updatedFlashcards);
      
      // Refresh history
      fetchFlashcardHistory();
    } catch (error) {
      console.error('Error updating mastery:', error);
    }
  };

  const handleRestart = () => {
    setStage('setup');
    setFlashcards([]);
    setCurrentIndex(0);
    setFlipped(false);
    setTopic('');
    setSelectedHistorySet(null);
    setCurrentFlashcardSetId(null);
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
    if (percentage >= 80) return '#10b981';
    if (percentage >= 50) return '#f59e0b';
    return '#6b7280';
  };

  // History Side Panel Component
  const HistorySidePanel = () => (
    <div className="history-side-panel">
      <div className="history-header">
        <h3>Flashcard Sets</h3>
        <button 
          className="toggle-history-btn"
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? '−' : '+'}
        </button>
      </div>
      
      {showHistory && (
        <div className="history-content">
          {historyLoading ? (
            <div className="history-loading">Loading...</div>
          ) : flashcardHistory.length === 0 ? (
            <div className="history-empty">No flashcard sets yet</div>
          ) : (
            <div className="history-list">
              {flashcardHistory.map((historyItem) => {
                const masteryPercentage = historyItem.totalCards > 0 
                  ? (historyItem.masteredCount / historyItem.totalCards * 100) 
                  : 0;

                return (
                  <div 
                    key={historyItem._id} 
                    className="history-item"
                    onClick={() => handleViewHistorySet(historyItem._id)}
                  >
                    <div className="history-item-header">
                      <span className="history-topic">{historyItem.topic}</span>
                      
                    </div>
                    <div className="history-item-meta">
                      <span className="history-cards">
                        {historyItem.totalCards} cards
                      </span>&nbsp;&nbsp;
                      <span 
                        className="history-mastery"
                        style={{ color: getMasteryColor(masteryPercentage) }}
                      >
                        {masteryPercentage.toFixed(0)}%
                      </span>&nbsp;
                      <span className="history-mastered">
                        mastered
                      </span>
                    </div>
                    
                    <div className="history-date">
                      {formatDate(historyItem.createdAt)}
                    </div>
                    <button className="view-details-link">Study →</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (stage === 'setup') {
    return (
      <div className="flashcards-layout">
        <HistorySidePanel />
        <div className="flashcards-container">
          <h2>Generate Flashcards</h2>
          <p>Create flashcards for quick revision</p>

          <form onSubmit={handleGenerate} className="flashcard-setup-form">
            <div className="form-group">
              <label>Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Key Definitions in Biology"
                required
              />
            </div>

            <div className="form-group">
              <label>Number of Cards</label>
              <select
                value={numCards}
                onChange={(e) => setNumCards(Number(e.target.value))}
              >
                <option value={5}>5 cards</option>
                <option value={10}>10 cards</option>
                <option value={15}>15 cards</option>
                <option value={20}>20 cards</option>
              </select>
            </div>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Generating...' : 'Generate Flashcards'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if ((stage === 'studying' || stage === 'history-detail') && flashcards.length > 0) {
    const currentCard = flashcards[currentIndex];
    const isHistoryView = stage === 'history-detail';

    return (
      <div className="flashcards-layout">
        <HistorySidePanel />
        <div className="flashcards-container">
          <div className="flashcard-header">
            <div>
              <h2>{selectedHistorySet ? selectedHistorySet.topic : topic}</h2>
              {isHistoryView && selectedHistorySet?.originalTopic !== selectedHistorySet?.topic && (
                <p className="original-topic">Original: "{selectedHistorySet.originalTopic}"</p>
              )}
            </div>
            <div className="card-counter">
              Card {currentIndex + 1} of {flashcards.length}
            </div>
          </div>

          {isHistoryView && selectedHistorySet && (
            <div className="flashcard-metadata">
              <div className="metadata-item">
                <strong>Total Cards:</strong> {selectedHistorySet.totalCards}
              </div>
              <div className="metadata-item">
                <strong>Mastered:</strong> {selectedHistorySet.masteredCount}
              </div>
              <div className="metadata-item">
                <strong>Created:</strong> {formatDate(selectedHistorySet.createdAt)}
              </div>
            </div>
          )}

          <div className="flashcard-display">
            <div
              className={`flashcard ${flipped ? 'flipped' : ''}`}
              onClick={handleFlip}
            >
              <div className="flashcard-front">
                <div className="card-label">Question</div>
                <div className="card-content">{currentCard.front}</div>
                <div className="flip-hint">Click to flip</div>
              </div>
              <div className="flashcard-back">
                <div className="card-label">Answer</div>
                <div className="card-content">{currentCard.back}</div>
                <div className="flip-hint">Click to flip back</div>
              </div>
            </div>
          </div>

          {currentCard.mastered !== undefined && (
            <div className="mastery-controls">
              <span className="mastery-label">Mark as:</span>
              <button 
                className={`btn-mastery ${currentCard.mastered ? 'active' : ''}`}
                onClick={() => handleMarkMastered(true)}
              >
                ✓ Mastered
              </button>
              <button 
                className={`btn-mastery ${!currentCard.mastered ? 'active' : ''}`}
                onClick={() => handleMarkMastered(false)}
              >
                ✗ Need Review
              </button>
            </div>
          )}

          <div className="flashcard-controls">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="btn-secondary"
            >
              ← Previous
            </button>
            
            <button onClick={handleFlip} className="btn-flip">
              {flipped ? 'Show Question' : 'Show Answer'}
            </button>
            
            <button
              onClick={handleNext}
              disabled={currentIndex === flashcards.length - 1}
              className="btn-secondary"
            >
              Next →
            </button>
          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
            />
          </div>

          <div className="card-list">
            <h3>All Cards</h3>
            <div className="card-thumbnails">
              {flashcards.map((card, index) => (
                <div
                  key={index}
                  className={`card-thumbnail ${index === currentIndex ? 'active' : ''} ${card.mastered ? 'mastered' : ''}`}
                  onClick={() => {
                    setCurrentIndex(index);
                    setFlipped(false);
                  }}
                  title={card.mastered ? 'Mastered' : 'Need review'}
                >
                  {index + 1}
                  {card.mastered && <span className="mastery-badge">✓</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="flashcard-actions">
            <button onClick={handleRestart} className="btn-secondary">
              {isHistoryView ? 'Back to Setup' : 'Generate New Set'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default Flashcards;