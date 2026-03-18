const express = require('express');
const router = express.Router();
const Marks = require('../models/marks');
const auth = require('../middleware/auth');

// Add marks (Teacher only)
router.post('/add', auth, async (req, res) => {
  try {
    const {
      classId, studentId, studentName,
      rollNumber, subject, examType,
      marksObtained, totalMarks, remarks
    } = req.body;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can add marks' });
    }

    // Calculate grade
    const percentage = (marksObtained / totalMarks) * 100;
    let grade = '';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B+';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C';
    else if (percentage >= 40) grade = 'D';
    else grade = 'F';

    const marks = new Marks({
      classId,
      studentId,
      studentName,
      rollNumber,
      subject,
      examType,
      marksObtained,
      totalMarks,
      grade,
      remarks,
      addedBy: req.user.userId
    });

    await marks.save();

    // Add XP to student for getting marks
    const User = require('../models/user');
    if (percentage >= 90) {
      await User.findByIdAndUpdate(studentId, { $inc: { xp: 50 } });
    } else if (percentage >= 70) {
      await User.findByIdAndUpdate(studentId, { $inc: { xp: 30 } });
    } else if (percentage >= 50) {
      await User.findByIdAndUpdate(studentId, { $inc: { xp: 15 } });
    }

    res.status(201).json({
      message: 'Marks added successfully',
      marks
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get marks for a class
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const marks = await Marks.find({ classId: req.params.classId })
      .sort({ createdAt: -1 });
    res.json({ marks });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get marks for a student
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const marks = await Marks.find({ studentId: req.params.studentId })
      .sort({ createdAt: -1 });
    res.json({ marks });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update marks
router.put('/update/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can update marks' });
    }

    const marks = await Marks.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true }
    );

    res.json({ message: 'Marks updated successfully', marks });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;