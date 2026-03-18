const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['teacher', 'student', 'parent'],
    required: true
  },
  // Student specific
  rollNumber: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  // Parent specific
  parentEmail: {
    type: String,
    default: ''
  },
  parentWhatsapp: {
    type: String,
    default: ''
  },
  // Which classes this user belongs to
  classes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  }],
  // Gamification
  xp: {
    type: Number,
    default: 0
  },
  badges: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);