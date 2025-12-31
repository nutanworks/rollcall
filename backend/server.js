
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // Load environment variables

const User = require('./models/User');
const Attendance = require('./models/Attendance');
const Settings = require('./models/Settings');
const Notice = require('./models/Notice');
const JoinRequest = require('./models/JoinRequest');
const QuestionPaper = require('./models/QuestionPaper');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for PDF/File Base64 uploads

// Connect to MongoDB Atlas
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB Atlas successfully');
    await seedAdmin();
  }).catch(err => {
    console.error('MongoDB connection error:', err);
  });

// Seed Admin Account
const seedAdmin = async () => {
  const adminEmail = 'nutan123@gmail.com';
  const adminPassword = 'Admin@123';

  try {
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const admin = new User({
        id: 'admin-001',
        name: 'System Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'ADMIN',
        createdAt: Date.now()
      });
      await admin.save();
      console.log('Admin account created in database');
    } else {
      console.log('Admin account already exists in database');
    }
  } catch (err) {
    console.error('Error seeding admin:', err);
  }
};

// Routes

// Login
app.post('/api/login', async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const user = await User.findOne({ email, password, role });
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Forgot Password (Simulated)
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address.' });
    }
    console.log(`[SIMULATION] Password reset link sent to: ${email}`);
    res.json({ message: 'Password reset instructions have been sent to your email.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Users (Get all or filter by role)
app.get('/api/users', async (req, res) => {
  const { role } = req.query;
  try {
    const query = role ? { role } : {};
    const users = await User.find(query);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add User
app.post('/api/users', async (req, res) => {
  try {
    const newUser = new User(req.body);
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Bulk Assign Teachers to Students
app.post('/api/users/bulk-assign', async (req, res) => {
  const { studentIds, teacherIds } = req.body;

  if (!Array.isArray(studentIds) || !Array.isArray(teacherIds)) {
    return res.status(400).json({ message: 'Invalid data format' });
  }

  try {
    // Update all selected students
    await User.updateMany(
      { id: { $in: studentIds }, role: 'STUDENT' },
      { $addToSet: { teacherIds: { $each: teacherIds } } }
    );

    // Return updated students
    const updatedStudents = await User.find({ id: { $in: studentIds } });
    res.json(updatedStudents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update User
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const updatedUser = await User.findOneAndUpdate({ id }, req.body, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete User
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedUser = await User.findOneAndDelete({ id });
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Attendance
app.get('/api/attendance', async (req, res) => {
  const { studentId, startDate, endDate, subject } = req.query;
  try {
    const query = {};
    if (studentId) query.studentId = studentId;
    if (subject && subject !== 'All') query.subject = subject;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const records = await Attendance.find(query).sort({ timestamp: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/attendance', async (req, res) => {
  const { studentId, subject, date } = req.body;
  try {
    const exists = await Attendance.findOne({ studentId, subject, date });
    if (exists) {
      return res.status(400).json({ message: 'Attendance already marked for this subject today.' });
    }
    const record = new Attendance(req.body);
    await record.save();
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Notices
app.get('/api/notices', async (req, res) => {
  const { teacherId, studentId } = req.query;
  try {
    let query = {};

    if (teacherId) {
      // Get notices created by this teacher
      query.teacherId = teacherId;
    } else if (studentId) {
      // Get notices from teachers assigned to this student
      const student = await User.findOne({ id: studentId });
      if (student && student.teacherIds && student.teacherIds.length > 0) {
        query.teacherId = { $in: student.teacherIds };
      } else {
        // No teachers assigned or student not found
        return res.json([]);
      }
    }

    const notices = await Notice.find(query).sort({ timestamp: -1 });
    res.json(notices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/notices', async (req, res) => {
  try {
    const notice = new Notice(req.body);
    await notice.save();
    res.status(201).json(notice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/notices/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const updatedNotice = await Notice.findOneAndUpdate({ id }, req.body, { new: true });
    if (!updatedNotice) {
      return res.status(404).json({ message: 'Notice not found' });
    }
    res.json(updatedNotice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/notices/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await Notice.findOneAndDelete({ id });
    res.json({ message: 'Notice deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Settings
app.get('/api/settings', async (req, res) => {
  try {
    let settings = await Settings.findOne({ id: 'global' });
    if (!settings) {
      settings = new Settings({ id: 'global' });
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { id: 'global' },
      req.body,
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Join Requests
app.get('/api/requests', async (req, res) => {
  const { teacherId } = req.query;
  try {
    const requests = await JoinRequest.find({ teacherId, status: 'PENDING' });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/requests', async (req, res) => {
  const { studentId, teacherId } = req.body;
  try {
    // Verify Teacher
    const teacher = await User.findOne({ id: teacherId, role: 'TEACHER' });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    // Check already assigned
    const student = await User.findOne({ id: studentId });
    if (student.teacherIds.includes(teacherId)) {
      return res.status(400).json({ message: 'Already assigned to this teacher' });
    }

    // Check pending
    const existing = await JoinRequest.findOne({ studentId, teacherId, status: 'PENDING' });
    if (existing) return res.status(400).json({ message: 'Request already pending' });

    const request = new JoinRequest({
      ...req.body,
      teacherName: teacher.name
    });
    await request.save();
    res.status(201).json(request);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/requests/respond', async (req, res) => {
  const { requestId, status } = req.body;
  try {
    const request = await JoinRequest.findOne({ id: requestId });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = status;
    await request.save();

    if (status === 'ACCEPTED') {
      await User.findOneAndUpdate(
        { id: request.studentId },
        { $addToSet: { teacherIds: request.teacherId } }
      );
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Question Papers Routes
app.get('/api/papers', async (req, res) => {
  const { teacherId, studentId } = req.query;
  try {
    let query = {};
    if (teacherId) {
      query.teacherId = teacherId;
    } else if (studentId) {
      const student = await User.findOne({ id: studentId });
      if (student && student.teacherIds && student.teacherIds.length > 0) {
        query.teacherId = { $in: student.teacherIds };
      } else {
        return res.json([]);
      }
    }
    const papers = await QuestionPaper.find(query).sort({ uploadedAt: -1 });
    res.json(papers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/papers', async (req, res) => {
  try {
    const paper = new QuestionPaper(req.body);
    await paper.save();
    res.status(201).json(paper);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/papers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await QuestionPaper.findOneAndDelete({ id });
    res.json({ message: 'Paper deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
