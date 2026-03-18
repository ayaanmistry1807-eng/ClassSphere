const express = require('express');
const router = express.Router();
const Class = require('../models/class');
const User = require('../models/user');
const auth = require('../middleware/auth');

// Generate unique class code
function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new class (Teacher only)
router.post('/create', auth, async (req, res) => {
  try {
    const { name, subject, division, year } = req.body;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can create classes' });
    }

    // Generate unique code
    let classCode;
    let exists = true;
    while (exists) {
      classCode = generateCode();
      exists = await Class.findOne({ classCode });
    }

    const newClass = new Class({
      name,
      subject,
      division,
      year,
      classCode,
      teacher: req.user.userId,
      students: []
    });

    await newClass.save();

    res.status(201).json({
      message: 'Class created successfully',
      class: newClass
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all classes for a teacher
router.get('/my-classes', auth, async (req, res) => {
  try {
    const classes = await Class.find({ teacher: req.user.userId });
    res.json({ classes });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single class details
router.get('/:classCode', auth, async (req, res) => {
  try {
    const classData = await Class.findOne({ classCode: req.params.classCode })
      .populate('teacher', 'name email');
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.json({ class: classData });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Join a class (Student only)
router.post('/join', auth, async (req, res) => {
  try {
    const { classCode, name, rollNumber, phone, parentEmail, parentWhatsapp } = req.body;

    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can join classes' });
    }

    const classData = await Class.findOne({ classCode });
    if (!classData) {
      return res.status(404).json({ message: 'Invalid class code' });
    }

    // Check if already joined
    const alreadyJoined = classData.students.find(
      s => s.userId.toString() === req.user.userId
    );
    if (alreadyJoined) {
      return res.status(400).json({ message: 'Already joined this class' });
    }

    // Add student to class
    classData.students.push({
      userId: req.user.userId,
      name,
      rollNumber,
      phone,
      parentEmail,
      parentWhatsapp
    });

    await classData.save();

    // Add class to student's profile
    await User.findByIdAndUpdate(req.user.userId, {
      $push: { classes: classData._id }
    });

    res.json({
      message: 'Joined class successfully',
      class: classData
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get classes for student
router.get('/student/my-classes', auth, async (req, res) => {
  try {
    const classes = await Class.find({
      'students.userId': req.user.userId
    }).populate('teacher', 'name email');
    res.json({ classes });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// Get leaderboard for a class
router.get('/leaderboard/:classId', auth, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.classId);
    if (!classData) {
      return res.status(404).json({ message: 'Class not found' });
    }
    const User = require('../models/user');
    const students = await Promise.all(
      classData.students.map(async (s) => {
        const user = await User.findById(s.userId);
        return {
          userId: s.userId,
          name: s.name,
          rollNumber: s.rollNumber,
          xp: user?.xp || 0,
          badges: user?.badges || []
        };
      })
    );
    const sorted = students.sort((a, b) => b.xp - a.xp);
    res.json({ leaderboard: sorted });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get global leaderboard
router.get('/leaderboard-global/all', auth, async (req, res) => {
  try {
    const User = require('../models/user');
    const students = await User.find({ role: 'student' })
      .select('name email rollNumber xp badges')
      .sort({ xp: -1 })
      .limit(20);
    res.json({ leaderboard: students });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
module.exports = router;