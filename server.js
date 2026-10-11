require('./src/config/env');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const express = require('express');
const mongoose = require('mongoose');
const { helmetMiddleware, corsMiddleware, apiRateLimiter } = require('./src/middleware/security');
const { globalErrorHandler } = require('./src/middleware/errorHandler');
const logger = require('./src/utils/logger');
const { enableInlineProcessing } = require('./src/queues/emailQueue');

const app = express();
const PORT = process.env.PORT || 5000;

// Env Pre-flight check
const requiredEnv = ['MONGO_URI', 'BREVO_API_KEY', 'EMAIL_USER', 'ADMIN_EMAIL'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length > 0) {
  logger.error(`❌ CRITICAL: Missing required environment variables: ${missingEnv.join(', ')}`);
  if (process.env.NODE_ENV === 'production') {
    logger.error('App will not start without these variables. Please check your Dashboard settings.');
    process.exit(1);
  }
}

// Security Middlewares
app.set('trust proxy', 1);
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: '10kb' }));

// Routes Import
const serviceRoutes = require('./src/routes/service.route');
const productRoutes = require('./src/routes/product.route');
const contactRoutes = require('./src/routes/contact.route');
const testRoutes = require('./src/routes/test.route');

// API Routes
app.use('/api', apiRateLimiter);
app.use('/api/services', serviceRoutes);
app.use('/api/products', productRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/test', testRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    message: 'Backend is running'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global Error Handler
app.use(globalErrorHandler);

// Database connection & Server Start
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI, { family: 4 })
    .then(() => {
      logger.info('Connected to MongoDB');
      logger.info(`📧 Email setup: Sender=${process.env.EMAIL_USER}, Admin=${process.env.ADMIN_EMAIL}`);
      // Deliver queued contact emails from this process unless a separate worker handles them
      if (process.env.EMAIL_INLINE_WORKER !== 'false') {
        enableInlineProcessing();
      }
      app.listen(PORT, "0.0.0.0", () => {
        logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch(err => {
      logger.error('Failed to connect to MongoDB', err);
      process.exit(1);
    });
} else {
  logger.error('ERROR: No MONGO_URI provided in .env');
  process.exit(1);
}

module.exports = app;
