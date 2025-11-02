const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  topicProgress: [{
    topic: String,
    questionsAnswered: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    lastPracticed: Date,
    recommendedDifficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    }
  }],
  totalQuizzesTaken: {
    type: Number,
    default: 0
  },
  totalQuestionsAnswered: {
    type: Number,
    default: 0
  },
  overallAccuracy: {
    type: Number,
    default: 0
  },
  strongTopics: [{
    type: String
  }],
  weakTopics: [{
    type: String
  }],
  studyStreak: {
    type: Number,
    default: 0
  },
  lastStudyDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Method to update progress
progressSchema.methods.updateTopicProgress = function(topic, isCorrect) {
  let topicIndex = this.topicProgress.findIndex(t => t.topic === topic);
  
  if (topicIndex === -1) {
    this.topicProgress.push({
      topic,
      questionsAnswered: 1,
      correctAnswers: isCorrect ? 1 : 0,
      accuracy: isCorrect ? 100 : 0,
      lastPracticed: new Date()
    });
  } else {
    let topicData = this.topicProgress[topicIndex];
    topicData.questionsAnswered += 1;
    if (isCorrect) topicData.correctAnswers += 1;
    topicData.accuracy = (topicData.correctAnswers / topicData.questionsAnswered) * 100;
    topicData.lastPracticed = new Date();
    
    // Update recommended difficulty
    if (topicData.accuracy >= 80) {
      topicData.recommendedDifficulty = 'hard';
    } else if (topicData.accuracy >= 50) {
      topicData.recommendedDifficulty = 'medium';
    } else {
      topicData.recommendedDifficulty = 'easy';
    }
  }
  
  // Update overall stats
  this.totalQuestionsAnswered += 1;
  let totalCorrect = this.topicProgress.reduce((sum, t) => sum + t.correctAnswers, 0);
  this.overallAccuracy = (totalCorrect / this.totalQuestionsAnswered) * 100;
  
  // Update strong/weak topics
  this.strongTopics = this.topicProgress
    .filter(t => t.accuracy >= 75)
    .map(t => t.topic);
  this.weakTopics = this.topicProgress
    .filter(t => t.accuracy < 50 && t.questionsAnswered >= 3)
    .map(t => t.topic);
  
  return this.save();
};

module.exports = mongoose.model('Progress', progressSchema);