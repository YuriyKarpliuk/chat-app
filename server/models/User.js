const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false},
  avatarUrl: { type: String },
  isOnline: { type: Boolean, default: false },
  pushToken: { type: String },
});

module.exports = mongoose.model('User', userSchema);
