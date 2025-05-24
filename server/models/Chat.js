const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  name: String,
  isGroup: Boolean,
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  lastMessage: {
    content: String,
    timestamp: Date,
  },
  groupImageUrl: String,
});

module.exports = mongoose.model('Chat', chatSchema);
