const express = require('express');
const router = express.Router();
const { sendEmail } = require('../services/emailService');
const logger = require('../utils/logger');

/**
 * Diagnostic endpoint to test direct email sending bypassing the queue
 * Access via: GET /api/test/email
 */
router.get('/email', async (req, res) => {
  const testEmail = req.query.to || process.env.ADMIN_EMAIL;
  
  logger.info(`Running email diagnostic for: ${testEmail}`);
  
  try {
    const result = await sendEmail({
      to: testEmail,
      subject: "🧬 Production Email Diagnostic Test",
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2>Diagnostic Connection Test</h2>
          <p>If you are reading this, your <strong>Brevo API Key</strong> and <strong>Sender Email</strong> are configured correctly on Render.</p>
          <hr/>
          <p><strong>Configured Sender:</strong> ${process.env.EMAIL_USER}</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
      `
    });

    res.status(200).json({
      success: true,
      message: 'Diagnostic email sent! If you don\'t receive it, check your verified senders in Brevo.',
      result
    });
  } catch (error) {
    logger.error('Diagnostic Email Failed:', error);
    res.status(500).json({
      success: false,
      error: 'Email failed to send.',
      details: error.message,
      check: [
        'Is BREVO_API_KEY correct in Render?',
        `Is ${process.env.EMAIL_USER} a verified sender in Brevo?`,
        'Check Render logs for more details.'
      ]
    });
  }
});

module.exports = router;
