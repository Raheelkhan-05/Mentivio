const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatSession", required: true },
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  mode: { type: String, default: "normal" },
  metadata: { type: Object, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
