const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');
const { contactRateLimiter } = require('../middleware/security');
const { validateContact } = require('../middleware/validator');

router.post('/', contactRateLimiter, validateContact, contactController.submitContact);

module.exports = router;
