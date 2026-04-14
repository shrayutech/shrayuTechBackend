const Queue = require('bull');
const IORedis = require('ioredis');
const logger = require('../utils/logger');
const { sendAdminNotification, sendAutoReply } = require('../services/emailService');

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_PUBLIC_URL;
const redisOptions = REDIS_URL ? REDIS_URL : {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  connectTimeout: 5000,
};

let redisActive = false;
let emailQueue = null;

// Initialize monitoring connection
const connection = new IORedis(redisOptions);

connection.on('connect', () => {
  redisActive = true;
  logger.info('🚀 Redis connection established. Email queue is active.');
});

connection.on('error', (err) => {
  if (redisActive) {
    logger.warn(`⚠️ Redis connection lost: ${err.message}. Falling back to direct email sending.`);
  }
  redisActive = false;
});

// Setup the Bull queue
try {
  emailQueue = new Queue('emailQueue', {
    redis: redisOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    }
  });

  emailQueue.on('error', (error) => {
    // Suppress spammy log messages if Redis is down, but log genuine queue errors
    if (redisActive) logger.error('Queue Error:', error);
  });
} catch (error) {
  logger.error('Failed to initialize Bull queue:', error.message);
}

/**
 * Transparent helper to add email jobs or send directly if Redis is down
 */
const addEmailJob = async (data) => {
  const { contactId, name, email, company, message } = data;

  if (redisActive && emailQueue) {
    try {
      await emailQueue.add(data);
      logger.info(`Email job added to queue for: ${email}`);
      return;
    } catch (error) {
      logger.error('Failed to add to queue, falling back to direct send:', error.message);
    }
  }

  // Fallback: Direct Sending (Redis Inactive)
  logger.info(`Sending emails directly (Redis inactive) for: ${email}`);
  try {
    // Run these in the "background" without blocking the response
    Promise.all([
      sendAdminNotification({ name, email, company, message }),
      sendAutoReply({ name, email })
    ]).then(async () => {
      if (contactId) {
        const Contact = require('../models/Contact.model');
        await Contact.findByIdAndUpdate(contactId, { status: 'sent', emailStatus: 'sent' });
      }
      logger.info(`Successfully sent direct fallback emails for contact ${contactId}`);
    }).catch(async (err) => {
      logger.error(`Direct fallback email failed: ${err.message}`);
      if (contactId) {
        const Contact = require('../models/Contact.model');
        await Contact.findByIdAndUpdate(contactId, { 
          status: 'failed', 
          emailStatus: 'failed', 
          errorMessage: err.message 
        });
      }
    });
  } catch (err) {
    logger.error('Critical internal error in direct fallback:', err);
  }
};

module.exports = { emailQueue, addEmailJob };
