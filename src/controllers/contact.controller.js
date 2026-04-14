const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const Contact = require('../models/Contact.model');
const { addEmailJob } = require('../queues/emailQueue');
const logger = require('../utils/logger');

// reCAPTCHA v3 verification helper
const verifyCaptcha = async (token) => {
  // Development bypass: if secret key is a placeholder or not set, allow submission
  if (process.env.NODE_ENV === 'development' && 
      (!process.env.RECAPTCHA_SECRET_KEY || process.env.RECAPTCHA_SECRET_KEY === 'yours-secret-key-here')) {
    logger.info('reCAPTCHA verification bypassed in development mode.');
    return { success: true, score: 0.9 };
  }

  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`
    );
    return response.data;
  } catch (error) {
    logger.error('reCAPTCHA verification error:', error);
    return { success: false, 'error-codes': ['network-error'] };
  }
};

exports.submitContact = async (req, res, next) => {
  const requestId = uuidv4();
  req.requestId = requestId;

  try {
    const { name, email, company, message, captchaToken } = req.body;

    // 1. Verify reCAPTCHA
    const captchaResult = await verifyCaptcha(captchaToken);
    
    if (!captchaResult.success || captchaResult.score < 0.5) {
      logger.warn('Spam detected or reCAPTCHA failed:', { 
        captchaResult, 
        ip: req.ip,
        requestId 
      });
      return res.status(400).json({ 
        success: false, 
        error: 'Security check failed. Please try again.',
        requestId
      });
    }

    // 2. Save Contact to Database with metadata
    const newContact = new Contact({
      name,
      email,
      company: company || '',
      message,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      captchaScore: captchaResult.score,
      requestId,
      status: 'pending',
      emailStatus: 'pending'
    });

    await newContact.save();

    // 3. Add to Email Queue (or send directly if Redis is down)
    await addEmailJob({
      contactId: newContact._id,
      name,
      email,
      company,
      message,
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
