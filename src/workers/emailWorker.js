require('../config/env');
const mongoose = require('mongoose');
const { emailQueue, startEmailProcessing } = require('../queues/emailQueue');
const logger = require('../utils/logger');

// Optional standalone worker. The API server already processes the queue itself
// (see enableInlineProcessing in server.js); run this to scale email delivery separately.

if (!emailQueue) {
  logger.error('❌ Email Queue is not initialized. Worker cannot start.');
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  logger.error('❌ MONGO_URI is not set. Worker cannot update contact status.');
  process.exit(1);
}

// The worker updates Contact documents, so it needs its own database connection
mongoose.connect(process.env.MONGO_URI, { family: 4 })
  .then(() => {
    logger.info('Worker connected to MongoDB');
    startEmailProcessing();
    logger.info('🚀 Email Worker started and listening for jobs...');
  })
  .catch((err) => {
    logger.error('Worker failed to connect to MongoDB', err);
    process.exit(1);
  });

const shutdown = async () => {
  logger.info('Email Worker shutting down...');
  await emailQueue.close().catch(() => {});
  await mongoose.disconnect().catch(() => {});
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
