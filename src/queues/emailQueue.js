const Queue = require('bull');
const IORedis = require('ioredis');
const logger = require('../utils/logger');
const { deliverContactEmails, recordFailedAttempt } = require('../services/contactNotifier');

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_PUBLIC_URL;
const redisOptions = REDIS_URL ? REDIS_URL : {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  connectTimeout: 5000,
};

const JOB_ATTEMPTS = 3;
const QUEUE_ADD_TIMEOUT_MS = 5000;
const DIRECT_RETRY_DELAYS_MS = [2000, 8000]; // waits between the 3 direct-send attempts

let redisActive = false;
let emailQueue = null;
let processingStarted = false;
let processOnReady = false;

// Initialize monitoring connection
const connection = new IORedis(redisOptions);

connection.on('ready', () => {
  redisActive = true;
  logger.info('🚀 Redis connection established. Email queue is active.');
  if (processOnReady) startEmailProcessing();
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
      attempts: JOB_ATTEMPTS,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: 100,
    }
  });

  emailQueue.on('error', (error) => {
    // Suppress spammy log messages if Redis is down, but log genuine queue errors
    if (redisActive) logger.error('Queue Error:', error);
  });
} catch (error) {
  logger.error('Failed to initialize Bull queue:', error.message);
}

const withTimeout = (promise, ms) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Bull job handler. Throwing lets Bull retry; already-sent emails are skipped on retry.
 */
const processEmailJob = async (job) => {
  const { contactId, email } = job.data;
  const attemptNumber = job.attemptsMade + 1;
  const maxAttempts = job.opts.attempts || 1;

  logger.info(`Processing email job ${job.id} for: ${email} (attempt ${attemptNumber}/${maxAttempts})`);

  try {
    await deliverContactEmails(job.data);
    logger.info(`✅ Successfully processed job ${job.id}`);
  } catch (error) {
    logger.error(`❌ Failed to process job ${job.id}: ${error.message}`);
    await recordFailedAttempt(contactId, error, attemptNumber, attemptNumber >= maxAttempts);
    throw error;
  }
};

/**
 * Starts consuming the queue in this process. Safe to call more than once.
 */
function startEmailProcessing() {
  if (processingStarted || !emailQueue) return;
  processingStarted = true;
  emailQueue.process(processEmailJob).catch((error) => {
    processingStarted = false;
    logger.error(`Email queue processor stopped: ${error.message}`);
  });
  logger.info('📬 Email queue processor running.');
}

/**
 * Process queued jobs inside the API server whenever Redis is available, so emails are
 * delivered even when no separate worker process is deployed.
 */
const enableInlineProcessing = () => {
  processOnReady = true;
  if (redisActive) startEmailProcessing();
};

/**
 * Direct delivery used when Redis is unavailable. Retries in the background.
 */
const deliverDirectly = async (data) => {
  const { contactId } = data;
  const maxAttempts = DIRECT_RETRY_DELAYS_MS.length + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await deliverContactEmails(data);
      logger.info(`Successfully sent direct fallback emails for contact ${contactId}`);
      return;
    } catch (error) {
      logger.error(`Direct fallback email attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
      await recordFailedAttempt(contactId, error, attempt, attempt === maxAttempts);
      if (attempt < maxAttempts) await sleep(DIRECT_RETRY_DELAYS_MS[attempt - 1]);
    }
  }
};

/**
 * Transparent helper to add email jobs or send directly if Redis is down
 */
const addEmailJob = async (data) => {
  const { contactId, email } = data;

  if (redisActive && emailQueue) {
    try {
      // jobId de-duplicates: one delivery job per contact submission
      await withTimeout(
        emailQueue.add(data, contactId ? { jobId: String(contactId) } : {}),
        QUEUE_ADD_TIMEOUT_MS
      );
      logger.info(`Email job added to queue for: ${email}`);
      return;
    } catch (error) {
      logger.error('Failed to add to queue, falling back to direct send:', error.message);
    }
  }

  // Fallback: Direct Sending (Redis Inactive). Runs in the background without blocking the response.
  logger.info(`Sending emails directly (Redis inactive) for: ${email}`);
  deliverDirectly(data).catch((err) => {
    logger.error('Critical internal error in direct fallback:', err);
  });
};

module.exports = { emailQueue, addEmailJob, startEmailProcessing, enableInlineProcessing };
