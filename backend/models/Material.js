const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    default: 'General'
  },
  topics: [{
    type: String
  }],
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  chunksCount: {
    type: Number,
    default: 0
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
materialSchema.index({ userId: 1, processingStatus: 1 });

module.exports = mongoose.model('Material', materialSchema);