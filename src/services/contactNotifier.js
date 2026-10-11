const Contact = require('../models/Contact.model');
const { sendAdminNotification, sendAutoReply } = require('./emailService');
const logger = require('../utils/logger');

/**
 * Sends the admin notification and the visitor auto-reply for a contact submission.
 * Each step is recorded on the Contact document, so a retry skips emails that already
 * went out instead of sending duplicates.
 */
const deliverContactEmails = async ({ contactId, name, email, mobile, company, message }) => {
  const contact = contactId ? await Contact.findById(contactId).lean() : null;

  if (!contact?.adminEmailSent) {
    await sendAdminNotification({ name, email, mobile, company, message });
    if (contact) await Contact.updateOne({ _id: contactId }, { adminEmailSent: true });
  }

  if (!contact?.autoReplySent) {
    await sendAutoReply({ name, email });
    if (contact) await Contact.updateOne({ _id: contactId }, { autoReplySent: true });
  }

  if (contact) {
    await Contact.updateOne(
      { _id: contactId },
      { status: 'sent', emailStatus: 'sent', $unset: { errorMessage: 1 } }
    );
  }
};

/**
 * Records a failed delivery attempt. Only the final attempt marks the contact as failed.
 */
const recordFailedAttempt = async (contactId, error, attemptNumber, isFinal) => {
  if (!contactId) return;
  try {
    await Contact.updateOne(
      { _id: contactId },
      {
        retries: attemptNumber,
        errorMessage: error.message,
        ...(isFinal ? { status: 'failed', emailStatus: 'failed' } : {})
      }
    );
  } catch (dbError) {
    logger.error(`Could not record email failure for contact ${contactId}: ${dbError.message}`);
  }
};

module.exports = { deliverContactEmails, recordFailedAttempt };
