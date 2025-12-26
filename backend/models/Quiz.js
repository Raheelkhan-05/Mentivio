const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: Map,
    of: String,
    required: true,
    validate: {
      validator: function(v) {
        // Must have exactly 4 options: A, B, C, D
        const keys = Array.from(v.keys());
        return keys.length === 4 && 
               keys.includes('A') && 
               keys.includes('B') && 
               keys.includes('C') && 
               keys.includes('D');
      },
      message: 'Options must contain exactly A, B, C, and D'
    }
  },
  correctAnswer: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C', 'D'],
    trim: true
  },
  explanation: {
    type: String,
    required: true,
    trim: true
  },
  userAnswer: {
    type: String,
    enum: ['A', 'B', 'C', 'D', null],
    default: null
  },
  isCorrect: {
    type: Boolean,
    default: null
  }
}, { _id: false });

const quizSchema = new mongoose.Schema({
  userId: {
    type: String,
    ref: 'User',
    required: true,
    index: true
  },
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    default: null,
    index: true
  },
  topic: {
    type: String,
    required: true,
    trim: true,
    index: true,
    // This is the normalized topic from LLM
  },
  originalTopic: {
    type: String,
    trim: true,
    // User's original input (may contain typos)
  },
  difficulty: {
    type: String,
    required: true,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
    index: true
  },
  questions: {
    type: [questionSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0 && v.length <= 20;
      },
      message: 'Quiz must have between 1 and 20 questions'
    }
  },
  totalQuestions: {
    type: Number,
    required: true,
    min: 1,
    max: 20
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned'],
    default: 'in_progress',
    index: true
  },
  materialScope: {
    type: String,
    enum: ['specific', 'all'],
    required: true,
    // 'specific' = single material, 'all' = all user materials
  },
  metadata: {
    topicConfidence: {
      type: String,
      enum: ['high', 'medium', 'low']
    },
    topicReasoning: String,
    numSources: Number,
    generatedAt: Date
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'quizzes'
});

// Indexes for common queries
quizSchema.index({ userId: 1, createdAt: -1 });
quizSchema.index({ userId: 1, status: 1 });
quizSchema.index({ userId: 1, topic: 1 });
quizSchema.index({ userId: 1, materialId: 1 });

// Virtual for correct answer count
quizSchema.virtual('correctCount').get(function() {
  if (this.status !== 'completed') return null;
  return this.questions.filter(q => q.isCorrect === true).length;
});

// Method to calculate score
quizSchema.methods.calculateScore = function() {
  const correct = this.questions.filter(q => q.isCorrect === true).length;
  this.score = (correct / this.totalQuestions) * 100;
  return this.score;
};

// Static method to get user statistics
quizSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), status: 'completed' } },
    {
      $group: {
        _id: null,
        totalQuizzes: { $sum: 1 },
        averageScore: { $avg: '$score' },
        totalQuestions: { $sum: '$totalQuestions' },
        byDifficulty: {
          $push: {
            difficulty: '$difficulty',
            score: '$score'
          }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalQuizzes: 0,
    averageScore: 0,
    totalQuestions: 0,
    byDifficulty: []
  };
};

// Pre-save validation
quizSchema.pre('save', function(next) {
  // Ensure totalQuestions matches questions array length
  if (this.questions) {
    this.totalQuestions = this.questions.length;
  }
  
  // If quiz is being completed, calculate score
  if (this.status === 'completed' && this.score === null) {
    this.calculateScore();
  }
  
  next();
});

// Ensure virtuals are included in JSON
quizSchema.set('toJSON', { virtuals: true });
quizSchema.set('toObject', { virtuals: true });

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;