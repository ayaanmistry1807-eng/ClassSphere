const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const auth = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, rollNumber, phone, parentEmail, parentWhatsapp } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      rollNumber: rollNumber || '',
      phone: phone || '',
      parentEmail: parentEmail || '',
      parentWhatsapp: parentWhatsapp || ''
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
        xp: user.xp
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({ email, role });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
        xp: user.xp,
        badges: user.badges
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get my profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update profile
router.put('/update-profile', auth, async (req, res) => {
  try {
    const { name, phone, parentEmail, parentWhatsapp } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (parentEmail) updateData.parentEmail = parentEmail;
    if (parentWhatsapp) updateData.parentWhatsapp = parentWhatsapp;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true }
    );

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
        phone: user.phone,
        parentEmail: user.parentEmail,
        parentWhatsapp: user.parentWhatsapp,
        xp: user.xp
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get child data for parent
router.get('/child', auth, async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({ message: 'Only parents can access this' });
    }

    const parent = await User.findById(req.user.userId);

    // First check User model
    let child = await User.findOne({
      parentEmail: { $regex: new RegExp(`^${parent.email}$`, 'i') },
      role: 'student'
    });

    if (child) {
      return res.json({ child });
    }

    // If not found in User model check Class students array
    const Class = require('../models/class');
    const classes = await Class.find({
      'students.parentEmail': { $regex: new RegExp(`^${parent.email}$`, 'i') }
    });

    if (classes.length > 0) {
      const studentData = classes[0].students.find(
        s => s.parentEmail?.toLowerCase() === parent.email.toLowerCase()
      );
      if (studentData) {
        const studentUser = await User.findById(studentData.userId);
        if (studentUser) {
          return res.json({
            child: {
              ...studentUser.toObject(),
              rollNumber: studentData.rollNumber || studentUser.rollNumber
            }
          });
        }
      }
    }

    return res.status(404).json({ message: 'No child linked' });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;