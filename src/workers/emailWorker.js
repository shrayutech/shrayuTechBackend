require('dotenv').config();
const { emailQueue } = require('../queues/emailQueue');
const { sendAdminNotification, sendAutoReply } = require('../services/emailService');
const Contact = require('../models/Contact.model');
const logger = require('../utils/logger');

if (!emailQueue) {
  logger.error('❌ Email Queue is not initialized. Worker cannot start.');
  process.exit(1);
}

// Process email jobs
emailQueue.process(async (job) => {
  const { contactId, name, email, company, message } = job.data;
  
  logger.info(`Processing email job ${job.id} for: ${email}`);

  try {
    // 1. Send Admin Notification
    await sendAdminNotification({ name, email, company, message });
    
    // 2. Send Auto-Reply to Visitor
    await sendAutoReply({ name, email });

    // 3. Update Database Status
    if (contactId) {
      await Contact.findByIdAndUpdate(contactId, {
        status: 'sent',
        emailStatus: 'sent'
      });
    }

    logger.info(`✅ Successfully processed job ${job.id}`);
  } catch (error) {
    logger.error(`❌ Failed to process job ${job.id}: ${error.message}`);
    
    // Update database with error
    if (contactId) {
      await Contact.findByIdAndUpdate(contactId, {
        status: 'failed',
        emailStatus: 'failed',
        errorMessage: error.message
      });
    }

    throw error; // Re-throw to allow Bull to handle retries
  }
});

logger.info('🚀 Email Worker started and listening for jobs...');
