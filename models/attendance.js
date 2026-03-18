const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  date: {
    type: String,
    required: true
  },
  lecture: {
    type: String,
    default: '1'
  },
  subject: {
    type: String,
    default: ''
  },
  records: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    rollNumber: String,
    status: {
      type: String,
      enum: ['present', 'absent', 'late'],
      default: 'present'
    },
    parentNotified: {
      type: Boolean,
      default: false
    },
    notifiedAt: {
      type: Date
    }
  }],
  takenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Attendance', attendanceSchema);