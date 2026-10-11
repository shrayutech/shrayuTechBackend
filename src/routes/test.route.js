const express = require('express');
const router = express.Router();
const { sendEmail } = require('../services/emailService');
const validator = require('validator');
const logger = require('../utils/logger');
const { requireDiagnosticKey } = require('../middleware/security');

// Outside development the diagnostics require the secret DIAGNOSTIC_KEY in the
// `x-diagnostic-key` header; otherwise anyone could send email from this account to any address.
router.use(requireDiagnosticKey);

/**
 * Diagnostic endpoint to test direct email sending bypassing the queue
 * Access via: GET /api/test/email (outside development: send header x-diagnostic-key)
 */
router.get('/email', async (req, res) => {
  const testEmail = req.query.to || process.env.ADMIN_EMAIL;
  if (typeof testEmail !== 'string' || !validator.isEmail(testEmail)) {
    return res.status(400).json({ success: false, error: 'Invalid "to" address.' });
  }
  
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
