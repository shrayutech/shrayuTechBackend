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
const sendAdminNotification = async ({ name, email, mobile, company, message }) => {
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
                    ${mobile ? `
                    <tr>
                      <td style="padding:20px 24px;border-bottom:1px solid #e2e8f0;">
                        <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Mobile Number</p>
                        <p style="margin:0;font-size:16px;color:#1e293b;"><a href="tel:${mobile.replace(/[^0-9+]/g, '')}" style="color:#2563eb;text-decoration:none;">${mobile}</a></p>
                      </td>
                    </tr>
                    ` : ''}
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
  // The auto-reply goes to an address the visitor typed, so keep their text in it to a short
  // plain name; this stops the form being used to mail links or spam text to third parties.
  const firstName = (name.split(' ')[0].replace(/&#x27;/g, "'").replace(/&[#\w]+;/g, '').replace(/[^\p{L}\p{M}'-]/gu, '').slice(0, 40)) || 'there';
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Message Received</title>
      <style>
        @media only screen and (max-width:620px) {
          .px { padding-left:24px !important; padding-right:24px !important; }
          .h1 { font-size:24px !important; line-height:32px !important; }
          .btn a { display:block !important; }
        }
      </style>
    </head>
    <body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#eef2f7;-webkit-font-smoothing:antialiased;">
      <!-- Inbox preview text -->
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;">We've received your enquiry. Expect a response from our team within 24 hours.</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#eef2f7" style="background:#eef2f7;">
        <tr>
          <td align="center" style="padding:40px 12px;">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
              <!-- Brand -->
              <tr>
                <td class="px" style="padding:0 8px 18px;">
                  <a href="https://shrayutech.vercel.app" style="text-decoration:none;font-size:15px;font-weight:700;letter-spacing:2px;color:#1e3a8a;">SHRAYU<span style="color:#3b82f6;"> TECHNOLOGIES</span></a>
                </td>
              </tr>
              <tr>
                <td>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
                    <!-- Accent bar -->
                    <tr>
                      <td height="6" bgcolor="#2563eb" style="height:6px;line-height:6px;font-size:0;background:#2563eb;background-image:linear-gradient(90deg,#1e40af,#3b82f6,#06b6d4);">&nbsp;</td>
                    </tr>
                    <!-- Hero -->
                    <tr>
                      <td class="px" style="padding:40px 48px 8px;">
                        <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#2563eb;">Enquiry received</p>
                        <h1 class="h1" style="margin:0 0 24px;font-size:28px;line-height:36px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;">Thank you for contacting Shrayu Technologies!</h1>
                        <p style="margin:0 0 14px;font-size:16px;line-height:26px;color:#0f172a;font-weight:600;">Hi ${firstName},</p>
                        <p style="margin:0 0 14px;font-size:16px;line-height:26px;color:#475569;">
                          Thank you for reaching out to Shrayu Technologies. We've successfully received your enquiry and our team will review your requirements carefully.
                        </p>
                        <p style="margin:0;font-size:16px;line-height:26px;color:#475569;">
                          You can expect a response from our team within <strong style="color:#0f172a;">24 hours</strong>.
                        </p>
                      </td>
                    </tr>
                    <!-- Services -->
                    <tr>
                      <td class="px" style="padding:32px 48px 8px;">
                        <p style="margin:0 0 14px;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;">What we specialise in</p>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          ${[
                            ['Web & Mobile App Development', 'Custom Software Development'],
                            ['AI/ML Solutions', 'Business Automation'],
                          ].map(row => `
                          <tr>
                            ${row.map(service => `
                            <td width="48%" valign="middle" bgcolor="#f8fafc" style="background:#f8fafc;border:1px solid #e2e8f0;border-left:3px solid #3b82f6;border-radius:8px;padding:14px 16px;font-size:14px;line-height:20px;font-weight:600;color:#1e293b;">${service}</td>`).join(`
                            <td width="12" style="font-size:0;line-height:0;">&nbsp;</td>`)}
                          </tr>
                          <tr><td colspan="3" height="12" style="height:12px;font-size:0;line-height:0;">&nbsp;</td></tr>`).join('')}
                        </table>
                      </td>
                    </tr>
                    <!-- CTA -->
                    <tr>
                      <td class="px" style="padding:20px 48px 0;">
                        <table role="presentation" cellpadding="0" cellspacing="0" class="btn">
                          <tr>
                            <td align="center" bgcolor="#2563eb" style="border-radius:10px;background:#2563eb;">
                              <a href="https://shrayutech.vercel.app" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">Explore our work &rarr;</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <!-- Sign-off -->
                    <tr>
                      <td class="px" style="padding:32px 48px 40px;">
                        <p style="margin:0 0 4px;font-size:15px;line-height:24px;color:#475569;">Best regards,</p>
                        <p style="margin:0 0 4px;font-size:16px;line-height:24px;font-weight:700;color:#0f172a;">Team Shrayu Technologies</p>
                        <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#3b82f6;">Ideas &nbsp;|&nbsp; Technology &nbsp;|&nbsp; Impact</p>
                      </td>
                    </tr>
                    <!-- Contact strip -->
                    <tr>
                      <td class="px" bgcolor="#f8fafc" style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 48px;">
                        <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#0f172a;">Have more to share?</p>
                        <p style="margin:0;font-size:14px;line-height:22px;color:#64748b;">
                          If you have any additional questions or information to share, simply reply to this email. You can also write to <a href="mailto:shrayutech@gmail.com" style="color:#2563eb;text-decoration:none;">shrayutech@gmail.com</a> or call <a href="tel:+917020041614" style="color:#2563eb;text-decoration:none;">+91 70200 41614</a>.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td class="px" align="center" style="padding:24px 8px 0;">
                  <p style="margin:0 0 6px;font-size:12px;line-height:18px;color:#94a3b8;">
                    You're receiving this because you submitted the contact form on
                    <a href="https://shrayutech.vercel.app" style="color:#64748b;text-decoration:underline;">shrayutech.vercel.app</a>.
                  </p>
                  <p style="margin:0;font-size:12px;color:#94a3b8;">&copy; ${new Date().getFullYear()} Shrayu Technologies. All rights reserved.</p>
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
    subject: 'Thank You for Contacting Shrayu Technologies!',
    html
  });
};

module.exports = { 
  sendEmail, 
  sendAdminNotification, 
  sendAutoReply 
};
