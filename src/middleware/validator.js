const Joi = require('joi');
const validator = require('validator');
const logger = require('../utils/logger');

// Field limits — keep in sync with frontend/src/views/Contact.jsx (LIMITS)
// Single-line fields must not carry control characters (CR/LF end up in email headers)
const NO_CONTROL_CHARS = /^[^\x00-\x1F\x7F]*$/;
// Letters in any script, combining marks, plain spaces (no tabs/line breaks), apostrophes, dots and hyphens
const NAME_PATTERN = /^[\p{L}\p{M} .'-]+$/u;
// Digits, spaces, +, - and (); 10-15 digits (E.164 allows at most 15)
const MOBILE_PATTERN = /^\+?[0-9\s\-()]+$/;

/**
 * Joi schema for contact form validation (runs on the raw, unescaped input)
 */
const contactSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).pattern(NAME_PATTERN).required().label('Full name')
    .messages({ 'string.pattern.base': '{{#label}} may only contain letters, spaces, apostrophes, dots or hyphens' }),
  email: Joi.string().trim().lowercase().email().max(254).required().label('Email address'),
  mobile: Joi.string().trim().max(20).pattern(MOBILE_PATTERN)
    .custom((value, helpers) => {
      const digits = value.replace(/\D/g, '').length;
      return digits >= 10 && digits <= 15 ? value : helpers.error('string.mobileDigits');
    })
    .required().label('Mobile number')
    .messages({
      'string.pattern.base': '{{#label}} may only contain digits, spaces, +, - and ()',
      'string.mobileDigits': '{{#label}} must contain 10-15 digits'
    }),
  company: Joi.string().trim().max(100).pattern(NO_CONTROL_CHARS).allow('').label('Company')
    .messages({ 'string.pattern.base': '{{#label}} contains invalid characters' }),
  message: Joi.string().trim().min(10).max(2000).required().label('Project brief'),
  captchaToken: Joi.string().max(4096).required()
}).messages({ 'object.unknown': '{{#label}} is not allowed' });

/**
 * Middleware to validate, then sanitize, contact form data
 */
const validateContact = (req, res, next) => {
  // 1. Validate the raw input, so lengths and patterns apply to what the visitor typed
  const { error, value } = contactSchema.validate(req.body ?? {}, { abortEarly: false, errors: { wrap: { label: false } } });

  if (error) {
    const errorDetails = error.details.map(detail => detail.message);
    logger.warn('Contact validation failed:', { errors: errorDetails, ip: req.ip });
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed', 
      details: errorDetails 
    });
  }

  // 2. HTML-escape every string so it is safe inside the notification email templates
  for (const key of Object.keys(value)) {
    if (typeof value[key] === 'string') {
      value[key] = validator.escape(value[key]);
    }
  }

  // Replace req.body with validated and sanitized value
  req.body = value;
  next();
};

module.exports = { validateContact };
