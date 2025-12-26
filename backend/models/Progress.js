const mongoose = require('mongoose');

const topicProgressSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true,
    trim: true
  },
  correct: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    default: 0,
    min: 0
  },
  accuracy: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  lastAttempted: {
    type: Date,
    default: Date.now
  },
  attempts: {
    type: Number,
    default: 0
  },
  // NEW FIELDS - with defaults for backward compatibility
  difficultyHistory: {
    type: [String],
    default: [],
    enum: ['easy', 'medium', 'hard', '']
  },
  scoreHistory: {
    type: [Number],
    default: []
  },
  weightedAccuracy: {
    type: Number,
    default: 0
  },
  trend: {
    type: String,
    enum: ['improving', 'declining', 'stable', 'neutral'],
    default: 'neutral'
  }
}, { _id: false });

const progressSchema = new mongoose.Schema({
  userId: {
    type: String,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  totalQuizzesTaken: {
    type: Number,
    default: 0,
    min: 0
  },
  totalQuestionsSeen: {
    type: Number,
    default: 0,
    min: 0
  },
  totalQuestionsCorrect: {
    type: Number,
    default: 0,
    min: 0
  },
  overallAccuracy: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  topicProgress: {
    type: Map,
    of: topicProgressSchema,
    default: new Map()
  },
  strongTopics: [{
    type: String,
    trim: true
  }],
  weakTopics: [{
    type: String,
    trim: true
  }],
  // NEW FIELDS - with defaults for backward compatibility
  improvingTopics: {
    type: [String],
    default: []
  },
  masteredTopics: {
    type: [String],
    default: []
  },
  challengingTopics: {
    type: [String],
    default: []
  },
  currentStreak: {
    type: Number,
    default: 0,
    min: 0
  },
  longestStreak: {
    type: Number,
    default: 0,
    min: 0
  },
  lastQuizDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'progress'
});

// ENHANCED: Method to update topic progress with difficulty tracking
progressSchema.methods.updateTopicProgress = async function(topic, isCorrect, difficulty = 'medium', quizScore = null) {
  // Initialize topic if doesn't exist
  if (!this.topicProgress) {
    this.topicProgress = new Map();
  }
  
  let topicData = this.topicProgress.get(topic);
  
  if (!topicData) {
    topicData = {
      topic: topic,
      correct: 0,
      total: 0,
      accuracy: 0,
      lastAttempted: new Date(),
      attempts: 0,
      difficultyHistory: [],
      scoreHistory: [],
      weightedAccuracy: 0,
      trend: 'neutral'
    };
  }
  
  // Update counts
  topicData.total += 1;
  if (isCorrect) {
    topicData.correct += 1;
  }
  
  // Calculate accuracy
  topicData.accuracy = (topicData.correct / topicData.total) * 100;
  topicData.lastAttempted = new Date();
  
  // Update the map
  this.topicProgress.set(topic, topicData);
  
  // Update global stats
  this.totalQuestionsSeen += 1;
  if (isCorrect) {
    this.totalQuestionsCorrect += 1;
  }
  
  // Recalculate overall accuracy
  this.overallAccuracy = this.totalQuestionsSeen > 0
    ? (this.totalQuestionsCorrect / this.totalQuestionsSeen) * 100
    : 0;
  
  // Update strong/weak topics lists
  this._updateTopicLists();
  
  // Update streak
  this._updateStreak();
  
  return this.save();
};

// NEW: Enhanced method to update topic after quiz completion
progressSchema.methods.updateTopicAfterQuiz = async function(topic, correctCount, totalQuestions, difficulty, quizScore) {
  if (!this.topicProgress) {
    this.topicProgress = new Map();
  }
  
  let topicData = this.topicProgress.get(topic);
  
  if (!topicData) {
    topicData = {
      topic: topic,
      correct: 0,
      total: 0,
      accuracy: 0,
      lastAttempted: new Date(),
      attempts: 0,
      difficultyHistory: [],
      scoreHistory: [],
      weightedAccuracy: 0,
      trend: 'neutral'
    };
  }
  
  // Update counts
  topicData.total += totalQuestions;
  topicData.correct += correctCount;
  topicData.attempts += 1;
  topicData.accuracy = (topicData.correct / topicData.total) * 100;
  topicData.lastAttempted = new Date();
  
  // Track difficulty and score history
  if (!topicData.difficultyHistory) topicData.difficultyHistory = [];
  if (!topicData.scoreHistory) topicData.scoreHistory = [];
  
  topicData.difficultyHistory.push(difficulty);
  topicData.scoreHistory.push(quizScore);
  
  // Keep only last 10 attempts
  if (topicData.difficultyHistory.length > 10) {
    topicData.difficultyHistory = topicData.difficultyHistory.slice(-10);
    topicData.scoreHistory = topicData.scoreHistory.slice(-10);
  }
  
  // Calculate weighted accuracy
  const difficultyWeight = {
    'easy': 0.8,
    'medium': 1.0,
    'hard': 1.3
  };
  
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  topicData.scoreHistory.forEach((score, idx) => {
    const diff = topicData.difficultyHistory[idx];
    const w = difficultyWeight[diff] || 1.0;
    totalWeightedScore += score * w;
    totalWeight += w;
  });
  
  topicData.weightedAccuracy = totalWeight > 0 ? totalWeightedScore / totalWeight : topicData.accuracy;
  
  // Calculate trend
  if (topicData.scoreHistory.length >= 3) {
    const recentScores = topicData.scoreHistory.slice(-3);
    const olderScores = topicData.scoreHistory.slice(0, -3);
    
    if (olderScores.length > 0) {
      const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
      
      if (recentAvg > olderAvg + 10) {
        topicData.trend = 'improving';
      } else if (recentAvg < olderAvg - 10) {
        topicData.trend = 'declining';
      } else {
        topicData.trend = 'stable';
      }
    }
  }
  
  this.topicProgress.set(topic, topicData);
  
  // Update global stats
  this.totalQuestionsSeen += totalQuestions;
  this.totalQuestionsCorrect += correctCount;
  this.overallAccuracy = this.totalQuestionsSeen > 0
    ? (this.totalQuestionsCorrect / this.totalQuestionsSeen) * 100
    : 0;
  
  // Update enhanced topic lists
  this._updateEnhancedTopicLists();
  
  // Update streak
  this._updateStreak();
  
  return this.save();
};

// ENHANCED: Private method to update strong/weak topic lists with new categories
progressSchema.methods._updateEnhancedTopicLists = function() {
  this.strongTopics = [];
  this.weakTopics = [];
  this.improvingTopics = this.improvingTopics || [];
  this.masteredTopics = this.masteredTopics || [];
  this.challengingTopics = this.challengingTopics || [];
  
  // Reset new categories
  this.improvingTopics = [];
  this.masteredTopics = [];
  this.challengingTopics = [];
  
  if (!this.topicProgress) return;
  
  this.topicProgress.forEach((data, topic) => {
    // Only consider topics with at least 3 attempts
    if ((data.attempts || 0) < 3) {
      return;
    }
    
    const weightedAcc = data.weightedAccuracy || data.accuracy;
    const rawAcc = data.accuracy;
    const trend = data.trend || 'neutral';
    const attempts = data.attempts || 0;
    
    // Get recent difficulties
    const recentDifficulties = (data.difficultyHistory || []).slice(-3);
    const hasHardAttempts = recentDifficulties.includes('hard');
    const hasMediumAttempts = recentDifficulties.includes('medium');
    
    // MASTERED: Consistently high performance on medium/hard
    if (weightedAcc >= 80 && rawAcc >= 80 && attempts >= 5 && 
        (hasHardAttempts || hasMediumAttempts)) {
      this.masteredTopics.push(topic);
    }
    // STRONG: Good performance with weighted consideration
    else if (weightedAcc >= 70 && rawAcc >= 65) {
      this.strongTopics.push(topic);
    }
    // IMPROVING: Positive trend
    else if (trend === 'improving' && rawAcc >= 50 && rawAcc < 70) {
      this.improvingTopics.push(topic);
    }
    // CHALLENGING: Low performance on harder difficulties
    else if (weightedAcc < 50 && (hasHardAttempts || hasMediumAttempts)) {
      this.challengingTopics.push(topic);
    }
    // WEAK: Low performance overall
    else if (rawAcc < 60) {
      this.weakTopics.push(topic);
    }
    // DEFAULT: Decent performance
    else if (!this.strongTopics.includes(topic) && !this.masteredTopics.includes(topic)) {
      this.strongTopics.push(topic);
    }
  });
  
  // Limit to top 10 each
  this.strongTopics = this.strongTopics.slice(0, 10);
  this.weakTopics = this.weakTopics.slice(0, 10);
  this.improvingTopics = this.improvingTopics.slice(0, 10);
  this.masteredTopics = this.masteredTopics.slice(0, 10);
  this.challengingTopics = this.challengingTopics.slice(0, 10);
};

// BACKWARD COMPATIBLE: Keep old method name
progressSchema.methods._updateTopicLists = function() {
  // Check if we should use enhanced classification
  const hasEnhancedData = Array.from(this.topicProgress.values()).some(
    data => data.difficultyHistory && data.difficultyHistory.length > 0
  );
  
  if (hasEnhancedData) {
    return this._updateEnhancedTopicLists();
  }
  
  // Fall back to old classification for backward compatibility
  this.strongTopics = [];
  this.weakTopics = [];
  
  if (!this.topicProgress) return;
  
  this.topicProgress.forEach((data, topic) => {
    if (data.total >= 3) {
      if (data.accuracy >= 75) {
        this.strongTopics.push(topic);
      } else if (data.accuracy < 60) {
        this.weakTopics.push(topic);
      }
    }
  });
  
  this.strongTopics = this.strongTopics.slice(0, 10);
  this.weakTopics = this.weakTopics.slice(0, 10);
};

// Private method to update streak
progressSchema.methods._updateStreak = function() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (!this.lastQuizDate) {
    this.currentStreak = 1;
    this.longestStreak = Math.max(this.longestStreak || 0, 1);
  } else {
    const lastQuizDay = new Date(
      this.lastQuizDate.getFullYear(),
      this.lastQuizDate.getMonth(),
      this.lastQuizDate.getDate()
    );
    
    const daysDiff = Math.floor((today - lastQuizDay) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      // Same day, streak continues
    } else if (daysDiff === 1) {
      // Consecutive day, increment streak
      this.currentStreak += 1;
      this.longestStreak = Math.max(this.longestStreak || 0, this.currentStreak);
    } else {
      // Streak broken
      this.currentStreak = 1;
    }
  }
  
  this.lastQuizDate = now;
};

// Method to get topic recommendations
progressSchema.methods.getRecommendations = function() {
  const recommendations = [];
  
  if (!this.topicProgress) {
    return recommendations;
  }
  
  // Enhanced recommendations based on new categories
  if (this.weakTopics && this.weakTopics.length > 0) {
    this.weakTopics.forEach(topic => {
      const data = this.topicProgress.get(topic);
      if (data) {
        recommendations.push({
          topic: topic,
          reason: 'needs_review',
          accuracy: data.accuracy,
          questionsAttempted: data.total,
          priority: 'high'
        });
      }
    });
  }
  
  if (this.challengingTopics && this.challengingTopics.length > 0) {
    this.challengingTopics.forEach(topic => {
      const data = this.topicProgress.get(topic);
      if (data) {
        recommendations.push({
          topic: topic,
          reason: 'try_easier_difficulty',
          accuracy: data.accuracy,
          questionsAttempted: data.total,
          suggestedDifficulty: 'easy',
          priority: 'high'
        });
      }
    });
  }
  
  if (this.improvingTopics && this.improvingTopics.length > 0) {
    this.improvingTopics.forEach(topic => {
      const data = this.topicProgress.get(topic);
      if (data) {
        recommendations.push({
          topic: topic,
          reason: 'keep_momentum',
          accuracy: data.accuracy,
          questionsAttempted: data.total,
          priority: 'medium'
        });
      }
    });
  }
  
  // Recommend topics not attempted recently
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  this.topicProgress.forEach((data, topic) => {
    if (data.lastAttempted < oneWeekAgo && 
        !this.weakTopics.includes(topic) && 
        !this.challengingTopics.includes(topic)) {
      recommendations.push({
        topic: topic,
        reason: 'practice_needed',
        accuracy: data.accuracy,
        questionsAttempted: data.total,
        daysSinceLastAttempt: Math.floor((Date.now() - data.lastAttempted) / (1000 * 60 * 60 * 24)),
        priority: 'medium'
      });
    }
  });
  
  // Sort by priority
  recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
  
  return recommendations.slice(0, 5);
};

// Static method to get leaderboard
progressSchema.statics.getLeaderboard = async function(limit = 10) {
  return await this.find()
    .sort({ overallAccuracy: -1, totalQuestionsSeen: -1 })
    .limit(limit)
    .populate('userId', 'name email')
    .select('userId overallAccuracy totalQuizzesTaken totalQuestionsSeen currentStreak');
};

// Virtual for performance level
progressSchema.virtual('performanceLevel').get(function() {
  if (this.overallAccuracy >= 90) return 'Expert';
  if (this.overallAccuracy >= 80) return 'Advanced';
  if (this.overallAccuracy >= 70) return 'Intermediate';
  if (this.overallAccuracy >= 60) return 'Beginner';
  return 'Novice';
});

// Ensure virtuals are included in JSON
progressSchema.set('toJSON', { virtuals: true });
progressSchema.set('toObject', { virtuals: true });

const Progress = mongoose.model('Progress', progressSchema);

module.exports = Progress;