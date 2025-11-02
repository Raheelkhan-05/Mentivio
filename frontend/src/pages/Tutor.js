import React, { useState, useEffect } from 'react';
import Upload from '../components/Upload';
import Chat from '../components/Chat';
import Quiz from '../components/Quiz';
import Flashcards from '../components/Flashcards';
import Dashboard from '../components/Dashboard';
import { getMaterials, getProgress } from '../services/api';
import './App.css';

function Tutor() {
  const [activeTab, setActiveTab] = useState('chat');
  const [userId] = useState('user_123'); // In production, get from auth
  const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [useAllMaterials, setUseAllMaterials] = useState(false);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    loadMaterials();
    loadProgress();
  }, []);

  const loadMaterials = async () => {
    try {
      const data = await getMaterials(userId);
      setMaterials(data.materials);
    } catch (error) {
      console.error('Failed to load materials:', error);
    }
  };

  const loadProgress = async () => {
    try {
      const data = await getProgress(userId);
      setProgress(data.progress);
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  const handleUploadSuccess = () => {
    loadMaterials();
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🧠 AI Tutor</h1>
        <p>Your Personal Learning Companion</p>
      </header>

      <div className="app-container">
        <aside className="sidebar">
          <div className="material-selector">
            <h3>Study Materials</h3>
            
            <div className="material-scope">
              <label>
                <input
                  type="checkbox"
                  checked={useAllMaterials}
                  onChange={(e) => setUseAllMaterials(e.target.checked)}
                />
                Use all my materials
              </label>
            </div>

            {!useAllMaterials && (
              <div className="material-list">
                {materials.length === 0 ? (
                  <p className="no-materials">No materials uploaded yet</p>
                ) : (
                  materials.map(material => (
                    <div
                      key={material._id}
                      className={`material-item ${selectedMaterial?._id === material._id ? 'active' : ''}`}
                      onClick={() => setSelectedMaterial(material)}
                    >
                      <div className="material-title">{material.title}</div>
                      <div className="material-info">
                        <span>{material.subject}</span>
                        {material.processingStatus === 'completed' && (
                          <span className="status-badge success">Ready</span>
                        )}
                        {material.processingStatus === 'processing' && (
                          <span className="status-badge processing">Processing...</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="progress-summary">
            <h4>Your Progress</h4>
            {progress && (
              <div>
                <div className="stat">
                  <span>Accuracy:</span>
                  <strong>{progress.overallAccuracy.toFixed(1)}%</strong>
                </div>
                <div className="stat">
                  <span>Quizzes:</span>
                  <strong>{progress.totalQuizzesTaken}</strong>
                </div>
                <div className="stat">
                  <span>Streak:</span>
                  <strong>{progress.studyStreak} days 🔥</strong>
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="main-content">
          <nav className="tabs">
            <button
              className={activeTab === 'chat' ? 'active' : ''}
              onClick={() => setActiveTab('chat')}
            >
              💬 Chat
            </button>
            <button
              className={activeTab === 'quiz' ? 'active' : ''}
              onClick={() => setActiveTab('quiz')}
            >
              📝 Quiz
            </button>
            <button
              className={activeTab === 'flashcards' ? 'active' : ''}
              onClick={() => setActiveTab('flashcards')}
            >
              🎴 Flashcards
            </button>
            <button
              className={activeTab === 'upload' ? 'active' : ''}
              onClick={() => setActiveTab('upload')}
            >
              📤 Upload
            </button>
            <button
              className={activeTab === 'dashboard' ? 'active' : ''}
              onClick={() => setActiveTab('dashboard')}
            >
              📊 Dashboard
            </button>
          </nav>

          <div className="tab-content">
            {activeTab === 'chat' && (
              <Chat
                userId={userId}
                materialId={selectedMaterial?._id}
                useAllMaterials={useAllMaterials}
              />
            )}
            {activeTab === 'quiz' && (
              <Quiz
                userId={userId}
                materialId={selectedMaterial?._id}
                useAllMaterials={useAllMaterials}
                onQuizComplete={loadProgress}
              />
            )}
            {activeTab === 'flashcards' && (
              <Flashcards
                userId={userId}
                materialId={selectedMaterial?._id}
                useAllMaterials={useAllMaterials}
              />
            )}
            {activeTab === 'upload' && (
              <Upload
                userId={userId}
                onUploadSuccess={handleUploadSuccess}
              />
            )}
            {activeTab === 'dashboard' && (
              <Dashboard userId={userId} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Tutor;