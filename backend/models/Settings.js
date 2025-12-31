const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: 'global' },
  schoolName: { type: String, default: 'Smart Attendance' },
  academicYear: { type: String, default: '2024-2025' },
  systemNotification: { type: String, default: '' },
  notificationType: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' }
});

module.exports = mongoose.model('Settings', settingsSchema);