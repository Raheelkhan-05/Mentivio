// models/Flashcard.js
const mongoose = require('mongoose');

const flashcardItemSchema = new mongoose.Schema({
  front: {
    type: String,
    required: true,
    trim: true
  },
  back: {
    type: String,
    required: true,
    trim: true
  },
  // Optional: track if user marked this as mastered
  mastered: {
    type: Boolean,
    default: false
  },
  // Optional: number of times reviewed
  reviewCount: {
    type: Number,
    default: 0
  }
}, { _id: false });

const flashcardSetSchema = new mongoose.Schema({
  userId: {
    type: String,
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
    index: true
  },
  originalTopic: {
    type: String,
    trim: true
  },
  flashcards: {
    type: [flashcardItemSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0 && v.length <= 50;
      },
      message: 'Flashcard set must have between 1 and 50 cards'
    }
  },
  totalCards: {
    type: Number,
    required: true,
    min: 1,
    max: 50
  },
  materialScope: {
    type: String,
    enum: ['specific', 'global_knowledge'],
    required: true
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
  // Study session tracking
  lastStudiedAt: {
    type: Date,
    default: null
  },
  studySessionCount: {
    type: Number,
    default: 0
  },
  // Progress tracking
  masteredCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'flashcards'
});

// Indexes for common queries
flashcardSetSchema.index({ userId: 1, createdAt: -1 });
flashcardSetSchema.index({ userId: 1, topic: 1 });
flashcardSetSchema.index({ userId: 1, materialId: 1 });

// Virtual for mastery percentage
flashcardSetSchema.virtual('masteryPercentage').get(function() {
  if (this.totalCards === 0) return 0;
  return (this.masteredCount / this.totalCards) * 100;
});

// Method to update study session
flashcardSetSchema.methods.recordStudySession = function() {
  this.lastStudiedAt = new Date();
  this.studySessionCount += 1;
  
  // Recalculate mastered count
  this.masteredCount = this.flashcards.filter(card => card.mastered === true).length;
  
  return this.save();
};

// Pre-save validation
flashcardSetSchema.pre('save', function(next) {
  // Ensure totalCards matches flashcards array length
  if (this.flashcards) {
    this.totalCards = this.flashcards.length;
  }
  
  // Update mastered count
  this.masteredCount = this.flashcards.filter(card => card.mastered === true).length;
  
  next();
});

// Ensure virtuals are included in JSON
flashcardSetSchema.set('toJSON', { virtuals: true });
flashcardSetSchema.set('toObject', { virtuals: true });

const Flashcard = mongoose.model('Flashcard', flashcardSetSchema);

module.exports = Flashcard;