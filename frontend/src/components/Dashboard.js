import React, { useState, useEffect } from 'react';
import { BarChart3, Target, Flame, BookOpen, Zap, Info, Trophy, Sparkles } from 'lucide-react';
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

  const getUncategorizedTopics = () => {
    if (!stats?.topicProgress) return [];

    return stats.topicProgress.filter(topic => {
      const isInAnyCategory =
        stats.masteredTopics?.includes(topic.topic) ||
        stats.strongTopics?.includes(topic.topic) ||
        stats.improvingTopics?.includes(topic.topic) ||
        stats.challengingTopics?.includes(topic.topic) ||
        stats.weakTopics?.includes(topic.topic);

      return !isInAnyCategory;
    });
  };

  const getCategoryReason = (topic) => {
    if (topic.attempts < 3) {
      return `Need ${3 - topic.attempts} more quiz${3 - topic.attempts > 1 ? 'zes' : ''} to classify`;
    }
    if (topic.questionsAnswered < 10) {
      return `Need ${10 - topic.questionsAnswered} more questions for better analysis`;
    }
    return 'Gathering more data to determine category';
  };

  const getAllCategorizedTopics = () => {
    const categorized = [];

    if (stats.masteredTopics) {
      stats.masteredTopics.forEach(topic => {
        const topicData = stats.topicProgress?.find(t => t.topic === topic);
        categorized.push({
          name: topic,
          category: 'mastered',
          icon: '🏆',
          color: 'yellow',
          data: topicData
        });
      });
    }

    if (stats.strongTopics) {
      stats.strongTopics.forEach(topic => {
        const topicData = stats.topicProgress?.find(t => t.topic === topic);
        categorized.push({
          name: topic,
          category: 'strong',
          icon: '💪',
          color: 'blue',
          data: topicData
        });
      });
    }

    if (stats.topicProgress) {
      stats.topicProgress.filter(t => t.trend === 'improving').forEach(topic => {
        if (!stats.masteredTopics?.includes(topic.topic) && !stats.strongTopics?.includes(topic.topic)) {
          categorized.push({
            name: topic.topic,
            category: 'improving',
            icon: '📈',
            color: 'green',
            data: topic
          });
        }
      });
    }

    if (stats.challengingTopics) {
      stats.challengingTopics.forEach(topic => {
        const topicData = stats.topicProgress?.find(t => t.topic === topic);
        categorized.push({
          name: topic,
          category: 'challenging',
          icon: '🎯',
          color: 'red',
          data: topicData
        });
      });
    }

    if (stats.weakTopics) {
      stats.weakTopics.forEach(topic => {
        const topicData = stats.topicProgress?.find(t => t.topic === topic);
        categorized.push({
          name: topic,
          category: 'review',
          icon: '📚',
          color: 'purple',
          data: topicData
        });
      });
    }

    return categorized;
  };

  if (loading) {
    return (
      <div className="flex flex-col bg-gray-50 h-full max-h-screen overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Your Learning Dashboard</h2>
                <p className="text-xs sm:text-sm text-gray-600">Track your progress and insights</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col bg-gray-50 h-full max-h-screen overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Your Learning Dashboard</h2>
                <p className="text-xs sm:text-sm text-gray-600">Track your progress and insights</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Start Your Learning Journey</h3>
            <p className="text-gray-600">No data available yet. Upload materials and take quizzes to see your progress!</p>
          </div>
        </div>
      </div>
    );
  }

  const uncategorizedTopics = getUncategorizedTopics();
  const allCategorizedTopics = getAllCategorizedTopics();

  return (
    <div className="flex flex-col bg-gray-50 h-[93vh] max-h-screen overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Your Learning Dashboard</h2>
              <p className="text-xs sm:text-sm text-gray-600">Track your progress and insights</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalQuizzes}</div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">Quizzes Taken</div>
              </div>

              <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalQuestions}</div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">Questions Answered</div>
              </div>

              <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.overallAccuracy}%</div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">Overall Accuracy</div>
              </div>

              <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Flame className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.studyStreak}</div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">Current Streak</div>
              </div>

              <div className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.longestStreak}</div>
                <div className="text-xs sm:text-sm text-gray-600 mt-1">Longest Streak</div>
              </div>
            </div>

            {/* All Topics Performance - Single Unified Section */}
            <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Your Topics Performance</h3>
              </div>

              {allCategorizedTopics.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allCategorizedTopics.map((topic, index) => (
                    <div
                      key={index}
                      className={`rounded-lg p-3 border-2 transition-all hover:shadow-md ${topic.color === 'yellow' ? 'bg-yellow-50 border-yellow-200 hover:border-yellow-300' :
                          topic.color === 'blue' ? 'bg-blue-50 border-blue-200 hover:border-blue-300' :
                            topic.color === 'green' ? 'bg-green-50 border-green-200 hover:border-green-300' :
                              topic.color === 'purple' ? 'bg-purple-50 border-purple-200 hover:border-purple-300' :
                                'bg-red-50 border-red-200 hover:border-red-300'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-lg flex-shrink-0">{topic.icon}</span>
                          <span className="text-sm font-semibold text-gray-900 truncate">{topic.name}</span>
                        </div>
                        {topic.data && (
                          <span className="text-xs font-bold text-gray-900 flex-shrink-0">
                            {topic.data.accuracy.toFixed(0)}%
                          </span>
                        )}
                      </div>

                      {topic.data && (
                        <>
                          <div className="w-full bg-white bg-opacity-50 rounded-full h-1.5 mb-2">
                            <div
                              className={`h-full rounded-full transition-all ${topic.color === 'yellow' ? 'bg-yellow-500' :
                                  topic.color === 'blue' ? 'bg-blue-500' :
                                    topic.color === 'green' ? 'bg-green-400' :
                                      topic.color === 'purple' ? 'bg-purple-500' :
                                        'bg-red-500'
                                }`}
                              style={{ width: `${topic.data.accuracy}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>{topic.data.correctAnswers}/{topic.data.questionsAnswered} correct</span>
                            <span>{topic.data.attempts} attempts</span>
                          </div>
                        </>
                      )}

                      <div className={`mt-2 px-2 py-1 rounded text-xs font-medium inline-block ${topic.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                          topic.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                            topic.color === 'green' ? 'bg-green-100 text-green-800' :
                              topic.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                                'bg-red-100 text-red-800'
                        }`}>
                        {topic.category === 'mastered' ? 'Mastered' :
                          topic.category === 'strong' ? 'Strong' :
                            topic.category === 'improving' ? 'Improving' :
                              topic.category === 'challenging' ? 'Challenging' :
                                'Needs Review'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">No categorized topics yet. Complete more quizzes to see your performance!</p>
                </div>
              )}
            </div>

            {/* Topics to Review - Uncategorized */}
            {uncategorizedTopics.length > 0 && (
              <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-5 h-5 text-gray-700" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Topics Being Analyzed</h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-4">These topics need more data to be properly categorized</p>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {uncategorizedTopics.map((topic, index) => (
                    <div key={index} className="min-w-0 bg-gray-50 rounded-lg p-3 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-lg flex-shrink-0">⚪</span>
                          <span className="text-sm font-semibold text-gray-900 truncate">{topic.topic}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900 flex-shrink-0">
                          {topic.accuracy.toFixed(0)}%
                        </span>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                        <div
                          className="h-full rounded-full bg-gray-400 transition-all"
                          style={{ width: `${topic.accuracy}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                        <span>{topic.correctAnswers}/{topic.questionsAnswered} correct</span>
                        <span>{topic.attempts} attempts</span>
                      </div>

                      <div className="bg-gray-100 rounded px-2 py-1 text-xs text-gray-700">
                        {getCategoryReason(topic)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Study Tips */}
            <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-xl p-4 sm:p-6 border border-blue-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-blue-600" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Personalized Study Tips</h3>
              </div>
              <div className="space-y-2">
                {stats.masteredTopics && stats.masteredTopics.length > 0 && (
                  <div className="bg-white bg-opacity-70 backdrop-blur-sm rounded-lg p-3 border border-yellow-200">
                    <p className="text-sm text-gray-700">🏆 You've mastered {stats.masteredTopics.length} topic(s)! Maintain performance on <strong>Medium/Hard</strong> difficulties to retain mastery.</p>
                  </div>
                )}
                {stats.strongTopics && stats.strongTopics.length > 0 && (
                  <div className="bg-white bg-opacity-70 backdrop-blur-sm rounded-lg p-3 border border-blue-200">
                    <p className="text-sm text-gray-700">💪 Strong performance in {stats.strongTopics.length} topic(s). Try <strong>Hard difficulty</strong> and score 80%+ to move toward Mastery.</p>
                  </div>
                )}
                {stats.challengingTopics && stats.challengingTopics.length > 0 && (
                  <div className="bg-white bg-opacity-70 backdrop-blur-sm rounded-lg p-3 border border-purple-200">
                    <p className="text-sm text-gray-700">🎯 {stats.challengingTopics.length} topic(s) are challenging. Focus on <strong>Easy → Medium progression</strong> before retrying Hard questions.</p>
                  </div>
                )}
                {stats.weakTopics && stats.weakTopics.length > 0 && (
                  <div className="bg-white bg-opacity-70 backdrop-blur-sm rounded-lg p-3 border border-red-200">
                    <p className="text-sm text-gray-700">📚 {stats.weakTopics.length} topic(s) need review due to low raw accuracy. Rebuild fundamentals and aim for <strong>60%+ raw accuracy</strong> first.</p>
                  </div>
                )}
                {uncategorizedTopics.length > 0 && (
                  <div className="bg-white bg-opacity-70 backdrop-blur-sm rounded-lg p-3 border border-gray-200">
                    <p className="text-sm text-gray-700">⚪ {uncategorizedTopics.length} topic(s) need more attempts. Complete at least <strong>3 quizzes per topic</strong> to unlock classification.</p>
                  </div>
                )}
                <div className="bg-white bg-opacity-70 backdrop-blur-sm rounded-lg p-3 border border-green-200">
                  <p className="text-sm text-gray-700">🔥 Your recent attempts matter most — the latest quizzes carry higher weight. Stay consistent to improve classification faster.</p>
                </div>
              </div>
            </div>

            {/* Classification Guide */}
            <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">📖 Classification Guide</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="border-2 border-yellow-200 bg-yellow-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🏆</span>
                    <span className="text-sm font-semibold text-gray-900">Mastered</span>
                  </div>
                  <p className="text-xs text-gray-600">≥80% weighted and raw accuracy, 5+ attempts, with Medium/Hard quizzes</p>
                </div>

                <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">💪</span>
                    <span className="text-sm font-semibold text-gray-900">Strong</span>
                  </div>
                  <p className="text-xs text-gray-600">≥70% weighted accuracy and ≥65% raw accuracy</p>
                </div>

                <div className="border-2 border-green-200 bg-green-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">📈</span>
                    <span className="text-sm font-semibold text-gray-900">Improving</span>
                  </div>
                  <p className="text-xs text-gray-600">Raw accuracy 50–70% with a clear positive recent trend</p>
                </div>

                <div className="border-2 border-purple-200 bg-purple-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🎯</span>
                    <span className="text-sm font-semibold text-gray-900">Challenging</span>
                  </div>
                  <p className="text-xs text-gray-600">Weighted accuracy &lt;50% on Medium/Hard attempts</p>
                </div>

                <div className="border-2 border-red-200 bg-red-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">📚</span>
                    <span className="text-sm font-semibold text-gray-900">Needs Review</span>
                  </div>
                  <p className="text-xs text-gray-600">Raw accuracy &lt;60% — fundamentals need reinforcement</p>
                </div>

                <div className="border-2 border-gray-200 bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">⚪</span>
                    <span className="text-sm font-semibold text-gray-900">Unclassified</span>
                  </div>
                  <p className="text-xs text-gray-600">Fewer than 3 attempts — more data required</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center">
                * Final score = Difficulty Weight × Recency Weight (Easy: 0.8x, Medium: 1.0x, Hard: 1.3x)
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;