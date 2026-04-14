const Joi = require('joi');
const validator = require('validator');
const logger = require('../utils/logger');

/**
 * Joi schema for contact form validation
 */
const contactSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().trim(),
  email: Joi.string().email().required().lowercase().trim(),
  company: Joi.string().max(100).allow('').trim(),
  message: Joi.string().min(10).max(2000).required().trim(),
  captchaToken: Joi.string().required()
});

/**
 * Middleware to sanitize and validate contact form data
 */
const validateContact = (req, res, next) => {
  // 1. Sanitize all string inputs to prevent XSS (Basic escaping)
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        // Using validator.escape to remove potentially dangerous characters
        // while remaining 100% compatible with CommonJS environments
        req.body[key] = validator.escape(req.body[key].trim());
      }
    }
  }

  // 2. Validate against schema
  const { error, value } = contactSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorDetails = error.details.map(detail => detail.message);
    logger.warn('Contact validation failed:', { errors: errorDetails, ip: req.ip });
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed', 
      details: errorDetails 
    });
  }

  // Replace req.body with validated and sanitized value
  req.body = value;
  next();
};

module.exports = { validateContact };
