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

      {/* Enhanced Topic Categories */}
      <div className="dashboard-row">
        <div className="dashboard-section">
          <h3>🏆 Mastered Topics</h3>
          <p className="category-description">Consistently excellent performance on challenging content</p>
          {stats.masteredTopics && stats.masteredTopics.length > 0 ? (
            <ul className="topic-list">
              {stats.masteredTopics.map((topic, index) => (
                <li key={index} className="topic-item mastered">
                  <span className="topic-badge">Master</span>
                  {topic}
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">Keep practicing on medium/hard difficulties to master topics!</p>
          )}
        </div>

        <div className="dashboard-section">
          <h3>💪 Strong Topics</h3>
          <p className="category-description">Good understanding with solid performance</p>
          {stats.strongTopics && stats.strongTopics.length > 0 ? (
            <ul className="topic-list">
              {stats.strongTopics.map((topic, index) => (
                <li key={index} className="topic-item strong">
                  <span className="topic-badge">Strong</span>
                  {topic}
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">Complete more quizzes to identify your strengths!</p>
          )}
        </div>
      </div>

      <div className="dashboard-row">
        <div className="dashboard-section">
        <h3>📈 Improving Topics</h3>
        <p className="category-description">
          Showing positive progress based on recent attempts
        </p>

        {stats.topicProgress &&
        stats.topicProgress.filter(t => t.trend === 'improving').length > 0 ? (
          <ul className="topic-list">
            {stats.topicProgress
              .filter(t => t.trend === 'improving')
              .map((topic, index) => (
                <li key={index} className="topic-item improving">
                  <span className="topic-badge">📈</span>
                  {topic.topic}
                </li>
              ))}
          </ul>
        ) : (
          <p className="no-data">
            No improving topics yet — score higher in recent quizzes to build an upward trend.
          </p>
        )}
      </div>


        <div className="dashboard-section">
          <h3>🎯 Challenging Topics</h3>
          <p className="category-description">Difficult content that needs focused practice</p>
          {stats.challengingTopics && stats.challengingTopics.length > 0 ? (
            <ul className="topic-list">
              {stats.challengingTopics.map((topic, index) => (
                <li key={index} className="topic-item challenging">
                  <span className="topic-badge">Challenge</span>
                  {topic}
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">No challenging topics yet - great work!</p>
          )}
        </div>
      </div>

      <div className="dashboard-row">
        <div className="dashboard-section full-width">
          <h3>📚 Topics to Review</h3>
          <p className="category-description">Areas needing more attention and practice</p>
          {stats.weakTopics && stats.weakTopics.length > 0 ? (
            <ul className="topic-list">
              {stats.weakTopics.map((topic, index) => (
                <li key={index} className="topic-item weak">
                  <span className="topic-badge">Review</span>
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
          <h3>📊 Detailed Topic Performance</h3>
          <div className="topic-progress-list">
            {stats.topicProgress
              .sort((a, b) => b.questionsAnswered - a.questionsAnswered)
              .slice(0, 10)
              .map((topic, index) => {
                const categoryBadge = getCategoryBadge(topic, stats);
                const trendIcon = getTrendIcon(topic.trend);
                
                return (
                  <div key={index} className="topic-progress-item">
                    <div className="topic-info">
                      <div className="topic-header">
                        <span className="topic-name">{topic.topic}</span>
                        {categoryBadge && (
                          <span className={`category-badge ${categoryBadge.class}`}>
                            {categoryBadge.text}
                          </span>
                        )}
                        {trendIcon && (
                          <span className="trend-icon" title={topic.trend}>
                            {trendIcon}
                          </span>
                        )}
                      </div>
                      <span className="topic-stats">
                        {topic.correctAnswers}/{topic.questionsAnswered} correct
                        {topic.attempts && ` • ${topic.attempts} attempts`}
                        {topic.weightedAccuracy && 
                          ` • Weighted: ${topic.weightedAccuracy.toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="progress-bar-container">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${topic.accuracy}%`,
                          backgroundColor:
                            topic.accuracy >= 80
                              ? '#10b981'
                              : topic.accuracy >= 70
                              ? '#3b82f6'
                              : topic.accuracy >= 60
                              ? '#f59e0b'
                              : '#ef4444'
                        }}
                      />
                    </div>
                    <div className="accuracy-display">
                      {topic.accuracy.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="tips-section">
      <h3>💡 Personalized Study Tips</h3>
      <ul className="tips-list">

        {stats.unclassifiedTopics && stats.unclassifiedTopics.length > 0 && (
          <li>
            🟡 You have {stats.unclassifiedTopics.length} unclassified topic(s). 
            Attempt at least <strong>3 quizzes</strong> to unlock classification.
          </li>
        )}

        {stats.masteredTopics && stats.masteredTopics.length > 0 && (
          <li>
            🏆 You’ve mastered {stats.masteredTopics.length} topic(s)! 
            Maintain performance on <strong>Medium/Hard</strong> difficulties to retain mastery.
          </li>
        )}

        {stats.strongTopics && stats.strongTopics.length > 0 && (
          <li>
            💪 Strong performance in {stats.strongTopics.length} topic(s). 
            Try <strong>Hard difficulty</strong> and score 80%+ to move toward Mastery.
          </li>
        )}

        {stats.improvingTopics && stats.improvingTopics.length > 0 && (
          <li>
            📈 You’re improving in {stats.improvingTopics.length} topic(s)! 
            Keep recent scores higher than earlier ones to strengthen the upward trend.
          </li>
        )}

        {stats.challengingTopics && stats.challengingTopics.length > 0 && (
          <li>
            🎯 {stats.challengingTopics.length} topic(s) are challenging. 
            Focus on <strong>Easy → Medium progression</strong> before retrying Hard questions.
          </li>
        )}

        {stats.reviewTopics && stats.reviewTopics.length > 0 && (
          <li>
            📚 {stats.reviewTopics.length} topic(s) need review due to low raw accuracy. 
            Rebuild fundamentals and aim for <strong>60%+ raw accuracy</strong> first.
          </li>
        )}

        <li>
          🔥 Your recent attempts matter most — the latest quizzes carry higher weight. 
          Stay consistent to improve classification faster.
        </li>

        <li>
          🧠 Use <strong>Socratic Mode</strong> on weak topics to fix conceptual gaps, not just scores.
        </li>

      </ul>
    </div>


      <div className="legend-section">
        <h4>📖 Classification Guide</h4>

        <div className="legend-grid">

          <div className="legend-item">
            <span className="legend-badge unclassified">🟡 Unclassified</span>
            <span>Fewer than 3 attempts — more data required</span>
          </div>

          <div className="legend-item">
            <span className="legend-badge mastered">🏆 Mastered</span>
            <span>
              ≥80% weighted <strong>and</strong> ≥80% raw accuracy, 5+ attempts, 
              with Medium/Hard quizzes
            </span>
          </div>

          <div className="legend-item">
            <span className="legend-badge strong">💪 Strong</span>
            <span>
              ≥70% weighted accuracy <strong>and</strong> ≥65% raw accuracy
            </span>
          </div>

          <div className="legend-item">
            <span className="legend-badge improving">📈 Improving</span>
            <span>
              Raw accuracy 50–70% with a clear positive recent trend
            </span>
          </div>

          <div className="legend-item">
            <span className="legend-badge challenging">🎯 Challenging</span>
            <span>
              Weighted accuracy &lt;50% on Medium/Hard attempts
            </span>
          </div>

          <div className="legend-item">
            <span className="legend-badge review">📚 Needs Review</span>
            <span>
              Raw accuracy &lt;60% — fundamentals need reinforcement
            </span>
          </div>

        </div>

        <p className="legend-note">
          * Final score = Difficulty Weight × Recency Weight  
          (Easy: 0.8x, Medium: 1.0x, Hard: 1.3x | Newest attempts weighted highest)
        </p>
      </div>

    </div>
  );
}

// Helper function to get category badge
function getCategoryBadge(topic, stats) {
  if (stats.masteredTopics?.includes(topic.topic)) {
    return { text: '🏆 Mastered', class: 'mastered' };
  }
  if (stats.strongTopics?.includes(topic.topic)) {
    return { text: '💪 Strong', class: 'strong' };
  }
  if (stats.improvingTopics?.includes(topic.topic)) {
    return { text: '📈 Improving', class: 'improving' };
  }
  if (stats.challengingTopics?.includes(topic.topic)) {
    return { text: '🎯 Challenging', class: 'challenging' };
  }
  if (stats.weakTopics?.includes(topic.topic)) {
    return { text: '📚 Review', class: 'review' };
  }
  return null;
}

// Helper function to get trend icon
function getTrendIcon(trend) {
  switch (trend) {
    case 'improving':
      return '📈';
    case 'declining':
      return '📉';
    case 'stable':
      return '➡️';
    default:
      return null;
  }
}

export default Dashboard;