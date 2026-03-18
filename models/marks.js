const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: {
    type: String,
    default: ''
  },
  rollNumber: {
    type: String,
    default: ''
  },
  subject: {
    type: String,
    required: true
  },
  examType: {
    type: String,
    enum: ['unit test', 'midterm', 'final', 'assignment', 'quiz'],
    default: 'unit test'
  },
  marksObtained: {
    type: Number,
    required: true
  },
  totalMarks: {
    type: Number,
    required: true
  },
  grade: {
    type: String,
    default: ''
  },
  remarks: {
    type: String,
    default: ''
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Marks', marksSchema);