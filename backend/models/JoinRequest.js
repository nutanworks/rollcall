
const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  teacherId: { type: String, required: true },
  teacherName: { type: String },
  status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED'], default: 'PENDING' },
  timestamp: { type: Number, default: Date.now }
});

module.exports = mongoose.model('JoinRequest', joinRequestSchema);
