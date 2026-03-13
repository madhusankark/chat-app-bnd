const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  sender: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'text' }, // text, emoji, sticker
  timestamp: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);