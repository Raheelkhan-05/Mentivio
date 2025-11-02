import React, { useState } from 'react';
import { generateFlashcards } from '../services/api';

function Flashcards({ userId, materialId, useAllMaterials }) {
  const [stage, setStage] = useState('setup'); // 'setup', 'studying'
  const [topic, setTopic] = useState('');
  const [numCards, setNumCards] = useState(10);
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);

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

      // ✅ The response already has .flashcards
      const flashcardsData = result.flashcards;

      // Check it’s an array before setting
      if (Array.isArray(flashcardsData)) {
        setFlashcards(flashcardsData);
        setCurrentIndex(0);
        setFlipped(false);
        setStage('studying');
      } else {
        console.error("Invalid flashcards data:", flashcardsData);
        alert("Failed to generate flashcards: invalid data format");
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

  const handleRestart = () => {
    setStage('setup');
    setFlashcards([]);
    setCurrentIndex(0);
    setFlipped(false);
    setTopic('');
  };

  if (stage === 'setup') {
    return (
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
    );
  }

  if (stage === 'studying' && flashcards.length > 0) {
    const currentCard = flashcards[currentIndex];

    return (
      <div className="flashcards-container">
        <div className="flashcard-header">
          <h2>{topic}</h2>
          <div className="card-counter">
            Card {currentIndex + 1} of {flashcards.length}
          </div>
        </div>

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

        <div className="flashcard-actions">
          <button onClick={handleRestart} className="btn-secondary">
            Generate New Set
          </button>
        </div>

        <div className="card-list">
          <h3>All Cards</h3>
          <div className="card-thumbnails">
            {flashcards.map((card, index) => (
              <div
                key={index}
                className={`card-thumbnail ${index === currentIndex ? 'active' : ''}`}
                onClick={() => {
                  setCurrentIndex(index);
                  setFlipped(false);
                }}
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default Flashcards;