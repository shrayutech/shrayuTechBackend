const Joi = require('joi');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const logger = require('../utils/logger');

const contactSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().trim(),
  email: Joi.string().email().required().lowercase().trim(),
  company: Joi.string().max(100).allow('').trim(),
  message: Joi.string().min(10).max(2000).required().trim(),
  captchaToken: Joi.string().required()
});

const validateContact = (req, res, next) => {
  // 1. Sanitize all string inputs to prevent XSS
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = DOMPurify.sanitize(req.body[key]);
      }
    }
  }

  // 2. Validate against schema
  const { error, value } = contactSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorDetails = error.details.map(detail => detail.message);
    logger.warn('Contact validation failed:', { errors: errorDetails, ip: req.ip });
    return res.status(400).json({ success: false, error: 'Validation failed', details: errorDetails });
  }

  // Replace req.body with validated and sanitized value
  req.body = value;
  next();
};

module.exports = { validateContact };
