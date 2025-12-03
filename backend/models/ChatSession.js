const mongoose = require('mongoose');

const ChatSessionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, default: "New Chat" }
}, { timestamps: true });

module.exports = mongoose.model('ChatSession', ChatSessionSchema);
