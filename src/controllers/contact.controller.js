const crypto = require('crypto');
const Contact = require('../models/Contact.model');
const { addEmailJob } = require('../queues/emailQueue');
const logger = require('../utils/logger');

exports.submitContact = async (req, res, next) => {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;

  try {
    const { name, email, mobile, company, message, referral } = req.body;

    // 1. Save Contact to Database with metadata
    const newContact = new Contact({
      name,
      email,
      mobile,
      company: company || '',
      message,
      referral,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestId,
      status: 'pending',
      emailStatus: 'pending'
    });

    await newContact.save();

    // 2. Add to Email Queue (or send directly if Redis is down)
    await addEmailJob({
      contactId: newContact._id,
      name,
      email,
      mobile,
      company,
      message,
      referral,
      requestId
    });

    logger.info(`Contact submission successful: ${newContact._id}`, { requestId });

    res.status(202).json({
      success: true,
      message: 'Your message has been received! We will get back to you soon.',
      requestId
    });

  } catch (error) {
    next(error); // Pass to global error handler
  }
};
