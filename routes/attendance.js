const express = require('express');
const router = express.Router();
const Attendance = require('../models/attendance');
const Class = require('../models/class');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');

// Email + WhatsApp notification
async function notifyParent(studentName, subject, date, parentEmail, parentWhatsapp) {
  try {
    // Email notification
    if (parentEmail) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: parentEmail,
        subject: `ClassSphere Alert — ${studentName} was absent`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#04010f;color:white;padding:30px;border-radius:12px;">
            <h1 style="color:#00ffe0;">ClassSphere 🌐</h1>
            <h2 style="color:#ff6b35;">Absence Alert</h2>
            <p>Dear Parent,</p>
            <p>Your child <strong>${studentName}</strong> was marked <strong style="color:#ff6b35;">ABSENT</strong> in:</p>
            <div style="background:rgba(255,255,255,0.05);padding:16px;border-radius:8px;margin:16px 0;">
              <p>📚 Subject: <strong>${subject}</strong></p>
              <p>📅 Date: <strong>${date}</strong></p>
            </div>
            <p>Please ensure regular attendance.</p>
            <p style="color:#00ffe0;">— ClassSphere Team</p>
          </div>
        `
      });
    }

    // WhatsApp Click to Chat
    if (parentWhatsapp) {
      const phone = parentWhatsapp.replace(/[^0-9]/g, '');
      const message = encodeURIComponent(
        `🚨 *ClassSphere Absence Alert*\n\nDear Parent,\n\nYour child *${studentName}* was marked *ABSENT* in:\n\n📚 Subject: ${subject}\n📅 Date: ${date}\n\nPlease ensure regular attendance.\n\n— ClassSphere Team`
      );
      const whatsappLink = `https://wa.me/${phone}?text=${message}`;
      console.log(`📱 WhatsApp Link for ${studentName}'s parent: ${whatsappLink}`);
    }

  } catch (error) {
    console.log('Notification error:', error.message);
  }
}

// Mark attendance
router.post('/mark', auth, async (req, res) => {
  try {
    const { classId, date, lecture, subject, records } = req.body;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Only teachers can mark attendance' });
    }

    // Check if attendance already marked for this date and lecture
    const existing = await Attendance.findOne({ classId, date, lecture });
    if (existing) {
      return res.status(400).json({ message: 'Attendance already marked for this lecture' });
    }

    // Get class data for parent details
    const classData = await Class.findById(classId);

    const attendance = new Attendance({
      classId,
      date,
      lecture,
      subject,
      records,
      takenBy: req.user.userId
    });

    await attendance.save();

    // Notify parents of absent students
    for (const record of records) {
      if (record.status === 'absent') {
        const student = classData.students.find(
          s => s.userId.toString() === record.studentId
        );
        if (student && student.parentEmail) {
          await notifyParent(
            student.name,
            subject,
            date,
            student.parentEmail,
            student.parentWhatsapp
          );

          // Update notified status
          record.parentNotified = true;
          record.notifiedAt = new Date();
        }
      }
    }

    await attendance.save();

    res.status(201).json({
      message: 'Attendance marked successfully',
      attendance
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get attendance for a class
router.get('/:classId', auth, async (req, res) => {
  try {
    const attendance = await Attendance.find({ classId: req.params.classId })
      .sort({ createdAt: -1 });
    res.json({ attendance });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get attendance for a specific student
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const attendance = await Attendance.find({
      'records.studentId': req.params.studentId
    }).sort({ createdAt: -1 });
    res.json({ attendance });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;