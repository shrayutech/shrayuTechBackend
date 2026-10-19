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
  mobile: {
    type: String,
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
  // Where the visit came from, when known (only Reddit is detected); no personal data
  referral: {
    type: new mongoose.Schema({
      source: { type: String, enum: ['reddit'] },
      detectedBy: { type: String, enum: ['utm', 'referrer'] },
      campaign: String,
      content: String,
      landingPath: String
    }, { _id: false }),
    default: undefined
  },
  ipAddress: String,
  userAgent: String,
  requestId: {
    type: String,
    unique: true
  },
  adminEmailSent: {
    type: Boolean,
    default: false
  },
  autoReplySent: {
    type: Boolean,
    default: false
  },
  retries: {
    type: Number,
    default: 0
  },
  errorMessage: String
}, { timestamps: true });

module.exports = mongoose.model('Contact', contactSchema);
