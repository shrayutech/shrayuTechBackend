const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { requireDiagnosticKey } = require('../middleware/security');

router.get('/', productController.getAllProducts);
router.post('/seed', requireDiagnosticKey, productController.seedProducts);

module.exports = router;
