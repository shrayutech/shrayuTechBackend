const axios = require('axios');
const crypto = require('crypto');
const Contact = require('../models/Contact.model');
const { addEmailJob } = require('../queues/emailQueue');
const logger = require('../utils/logger');

// Must match the action the frontend passes to grecaptcha.execute() (frontend/src/views/Contact.jsx)
const RECAPTCHA_ACTION = 'contact_form';
const RECAPTCHA_MIN_SCORE = 0.5;

// reCAPTCHA v3 verification helper
const verifyCaptcha = async (token) => {
  if (!process.env.RECAPTCHA_SECRET_KEY) {
    // Local development may run without keys. Anywhere else this fails closed.
    if (process.env.NODE_ENV === 'development') {
      logger.info('reCAPTCHA verification bypassed in development mode.');
      return { success: true, score: 0.9, action: RECAPTCHA_ACTION };
    }
    logger.error('RECAPTCHA_SECRET_KEY is not set; rejecting contact submissions.');
    return { success: false, 'error-codes': ['missing-input-secret'] };
  }

  try {
    // Form-encoded body: the token cannot inject extra parameters, and the secret stays out of URLs/logs
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      new URLSearchParams({ secret: process.env.RECAPTCHA_SECRET_KEY, response: token }),
      { timeout: 5000 }
    );
    return response.data;
  } catch (error) {
    logger.error(`reCAPTCHA verification error: ${error.message}`);
    return { success: false, 'error-codes': ['network-error'] };
  }
};

const isHuman = (result) =>
  result.success === true &&
  typeof result.score === 'number' &&
  result.score >= RECAPTCHA_MIN_SCORE &&
  result.action === RECAPTCHA_ACTION;

exports.submitContact = async (req, res, next) => {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;

  try {
    const { name, email, mobile, company, message, referral, captchaToken } = req.body;

    // 1. Verify reCAPTCHA
    const captchaResult = await verifyCaptcha(captchaToken);

    if (!isHuman(captchaResult)) {
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
      mobile,
      company: company || '',
      message,
      referral,
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
