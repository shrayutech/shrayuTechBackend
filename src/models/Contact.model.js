const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  company: {
    type: String,
    default: '',
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  emailStatus: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  ipAddress: String,
  userAgent: String,
  captchaScore: Number,
  requestId: {
    type: String,
    unique: true
  },
  retries: {
    type: Number,
    default: 0
  },
  errorMessage: String
}, { timestamps: true });

module.exports = mongoose.model('Contact', contactSchema);
