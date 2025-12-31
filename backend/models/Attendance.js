const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  teacherId: { type: String, required: true },
  subject: { type: String, required: true },
  timestamp: { type: Number, required: true },
  date: { type: String, required: true },
  status: { type: String, enum: ['PRESENT', 'ABSENT'], default: 'PRESENT' }
});

module.exports = mongoose.model('Attendance', attendanceSchema);