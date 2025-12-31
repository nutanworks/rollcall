const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  teacherId: { type: String, required: true },
  teacherName: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String },
  attachments: [{
    name: String,
    data: String,
    size: Number
  }],
  timestamp: { type: Number, default: Date.now }
});

module.exports = mongoose.model('Notice', noticeSchema);