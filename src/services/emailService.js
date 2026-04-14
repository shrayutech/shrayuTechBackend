const brevo = require('../config/brevo');
const logger = require('../utils/logger');

/**
 * Core function to send email via Brevo SDK
 */
const sendEmail = async ({ to, subject, html, replyTo }) => {
  const SENDER_EMAIL = (process.env.EMAIL_USER || "").trim();
  const RECIPIENT_EMAIL = (to || "").trim();

  try {
    const sendOptions = {
      to: [{ email: RECIPIENT_EMAIL }],
      sender: {
        email: SENDER_EMAIL,
        name: "Shrayu Technologies",
      },
      subject: subject,
      htmlContent: html,
    };

    if (replyTo) {
      sendOptions.replyTo = { email: replyTo.email, name: replyTo.name };
    }

    const data = await brevo.transactionalEmails.sendTransacEmail(sendOptions);
    logger.info(`✅ Email sent successfully to ${to}. Message ID: ${data.messageId}`);
    return data;
  } catch (err) {
    logger.error(`❌ Brevo Email Error: ${err.message}`);
    throw err;
  }
};

/**
 * Sends notification to Admin about a new contact inquiry
 */
const sendAdminNotification = async ({ name, email, company, message }) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>New Contact Inquiry</title>
    </head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:36px 40px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Shrayu Technologies</h1>
                  <p style="margin:8px 0 0;color:#bfdbfe;font-size:14px;">Website Inquiry Notification</p>
                </td>
              </tr>
              <!-- Details Card -->
              <tr>
                <td style="padding:28px 40px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
                    <tr>
                      <td style="padding:20px 24px;border-bottom:1px solid #e2e8f0;">
                        <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Full Name</p>
                        <p style="margin:0;font-size:16px;font-weight:600;color:#1e293b;">${name}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:20px 24px;border-bottom:1px solid #e2e8f0;">
                        <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Email Address</p>
                        <p style="margin:0;font-size:16px;color:#1e293b;"><a href="mailto:${email}" style="color:#2563eb;text-decoration:none;">${email}</a></p>
                      </td>
                    </tr>
                    ${company ? `
                    <tr>
                      <td style="padding:20px 24px;border-bottom:1px solid #e2e8f0;">
                        <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Company</p>
                        <p style="margin:0;font-size:16px;color:#1e293b;">${company}</p>
                      </td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td style="padding:20px 24px;">
                        <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Message</p>
                        <p style="margin:0;font-size:15px;color:#334155;line-height:1.7;white-space:pre-wrap;">${message}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#94a3b8;">Automated notification • ${new Date().toLocaleString()}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: (process.env.ADMIN_EMAIL || "").trim(),
    subject: `🔔 New Contact Inquiry from ${name}`,
    html,
    replyTo: { email, name }
  });
};

/**
 * Sends auto-reply to the visitor
 */
const sendAutoReply = async ({ name, email }) => {
  const firstName = name.split(' ')[0];
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Message Received</title>
    </head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:36px 40px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Shrayu Technologies</h1>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:40px 40px 32px;text-align:center;">
                  <h2 style="margin:0 0 12px;font-size:24px;color:#0f172a;">Thanks for reaching out, ${firstName}!</h2>
                  <p style="margin:0 0 20px;font-size:16px;color:#475569;line-height:1.7;">
                    We've received your message and our team will get back to you within 24 hours.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} Shrayu Technologies</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `We received your message, ${firstName}! 👋`,
    html
  });
};

module.exports = { 
  sendEmail, 
  sendAdminNotification, 
  sendAutoReply 
};
