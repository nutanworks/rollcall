
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'TEACHER', 'STUDENT'], required: true },
  subjects: { type: [String], default: [] },
  teacherIds: { type: [String], default: [] }, // IDs of assigned teachers
  allowInvite: { type: Boolean, default: false }, // Admin permission for WhatsApp invites
  totalClasses: { type: Number, default: 0 }, // Total sessions conducted
  cie: {
    cie1: { type: Number, default: 0 },
    cie2: { type: Number, default: 0 },
    assignment: { type: Number, default: 0 },
    assignmentSubmitted: { type: Boolean, default: false }
  },
  gender: { type: String },
  branch: { type: String },
  createdAt: { type: Number, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
