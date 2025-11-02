import React, { useState, useEffect } from 'react';
import { getDashboardStats } from '../services/api';

function Dashboard({ userId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getDashboardStats(userId);
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (!stats) {
    return <div className="no-data">No data available yet. Start learning!</div>;
  }

  return (
    <div className="dashboard-container">
      <h2>Your Learning Dashboard</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{stats.totalQuizzes}</div>
          <div className="stat-label">Quizzes Taken</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{stats.totalQuestions}</div>
          <div className="stat-label">Questions Answered</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-value">{stats.overallAccuracy}%</div>
          <div className="stat-label">Overall Accuracy</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-value">{stats.studyStreak}</div>
          <div className="stat-label">Day Streak</div>
        </div>
      </div>

      <div className="dashboard-row">
        <div className="dashboard-section">
          <h3>💪 Strong Topics</h3>
          {stats.strongTopics && stats.strongTopics.length > 0 ? (
            <ul className="topic-list">
              {stats.strongTopics.map((topic, index) => (
                <li key={index} className="topic-item strong">
                  {topic}
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">Keep practicing to identify your strengths!</p>
          )}
        </div>

        <div className="dashboard-section">
          <h3>📚 Topics to Review</h3>
          {stats.weakTopics && stats.weakTopics.length > 0 ? (
            <ul className="topic-list">
              {stats.weakTopics.map((topic, index) => (
                <li key={index} className="topic-item weak">
                  {topic}
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">Great job! No weak topics identified.</p>
          )}
        </div>
      </div>

      {stats.topicProgress && stats.topicProgress.length > 0 && (
        <div className="dashboard-section full-width">
          <h3>📈 Topic Performance</h3>
          <div className="topic-progress-list">
            {stats.topicProgress
              .sort((a, b) => b.questionsAnswered - a.questionsAnswered)
              .slice(0, 10)
              .map((topic, index) => (
                <div key={index} className="topic-progress-item">
                  <div className="topic-info">
                    <span className="topic-name">{topic.topic}</span>
                    <span className="topic-stats">
                      {topic.correctAnswers}/{topic.questionsAnswered} correct
                    </span>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${topic.accuracy}%`,
                        backgroundColor:
                          topic.accuracy >= 75
                            ? '#4caf50'
                            : topic.accuracy >= 50
                            ? '#ff9800'
                            : '#f44336'
                      }}
                    />
                  </div>
                  <div className="accuracy-display">
                    {topic.accuracy.toFixed(1)}%
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="tips-section">
        <h3>💡 Study Tips</h3>
        <ul className="tips-list">
          <li>Practice regularly to maintain your study streak!</li>
          <li>Focus on your weak topics to improve overall accuracy</li>
          <li>Try Socratic mode to deepen your understanding</li>
          <li>Use flashcards for quick revision before exams</li>
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;