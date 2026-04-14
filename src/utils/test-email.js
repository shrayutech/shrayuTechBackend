require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('--- Email Configuration Test ---');
  console.log(`User: ${process.env.EMAIL_USER}`);
  console.log(`Pass: ${process.env.EMAIL_PASS ? '********' : 'MISSING'}`);
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    console.log('\nAttempting to send test email...');
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: '📧 SMTP Test Successful',
      text: 'If you are reading this, your Gmail SMTP configuration is correct!',
    });
    console.log('✅ Success! Your email credentials are working.');
  } catch (error) {
    console.error('❌ Failed!');
    if (error.message.includes('535-5.7.8')) {
      console.error('\nERROR: Invalid Login. This means you are likely using your regular password.');
      console.error('FIX: You MUST use a 16-character "App Password" from your Google Account settings.');
    } else {
      console.error(error.message);
    }
  }
}

testEmail();
