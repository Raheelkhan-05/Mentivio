const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material'
  },
  topic: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  questions: [{
    question: String,
    options: {
      A: String,
      B: String,
      C: String,
      D: String
    },
    correctAnswer: String,
    explanation: String,
    userAnswer: String,
    isCorrect: Boolean
  }],
  score: {
    type: Number,
    default: 0
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  completedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed'],
    default: 'in-progress'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Quiz', quizSchema);