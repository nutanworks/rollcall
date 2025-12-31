
const mongoose = require('mongoose');

const questionPaperSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  teacherId: { type: String, required: true },
  teacherName: { type: String, required: true },
  subject: { type: String, required: true },
  year: { type: String, required: true },
  title: { type: String, required: true },
  fileName: { type: String, required: true },
  fileData: { type: String, required: true }, // Base64 string
  uploadedAt: { type: Number, default: Date.now }
});

module.exports = mongoose.model('QuestionPaper', questionPaperSchema);
