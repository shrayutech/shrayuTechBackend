const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const { requireDiagnosticKey } = require('../middleware/security');

router.get('/', serviceController.getAllServices);
router.post('/seed', requireDiagnosticKey, serviceController.seedServices);

module.exports = router;
