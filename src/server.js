require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { helmetMiddleware, corsMiddleware } = require('./middleware/security');
const { globalErrorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { emailQueue } = require('./queues/emailQueue');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.set('trust proxy', 1);
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: '10kb' }));

// Routes Import
const serviceRoutes = require('./routes/service.route');
const productRoutes = require('./routes/product.route');
const contactRoutes = require('./routes/contact.route');

// API Routes
app.use('/api/services', serviceRoutes);
app.use('/api/products', productRoutes);
app.use('/api/contact', contactRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global Error Handler
app.use(globalErrorHandler);

// Database connection & Server Start
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => {
      logger.info('Connected to MongoDB');
      app.listen(PORT, () => {
        logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
        console.log(`🚀 API: http://localhost:${PORT}/api`);
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
