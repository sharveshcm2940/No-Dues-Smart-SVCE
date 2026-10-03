const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_USER !== 'dev_test@svce.ac.in') {
    transporter = nodemailer.createTransport({
      host: env.SMTP.HOST,
      port: env.SMTP.PORT,
      secure: env.SMTP.SECURE,
      auth: {
        user: env.SMTP.USER,
        pass: env.SMTP.PASS
      }
    });
  } else {
    // Development / Test fallback using Ethereal or Mock
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('📧 Ethereal test mailer initialized for password resets.');
    } catch (e) {
      // Mock transporter for offline tests
      transporter = {
        sendMail: async (mailOptions) => {
          console.log(`[MOCK EMAIL SENT to ${mailOptions.to}]: ${mailOptions.subject}`);
          return { messageId: 'mock-' + Date.now() };
        }
      };
    }
  }

  return transporter;
}

async function sendPasswordResetEmail({ toEmail, recipientName, resetUrl }) {
  try {
    const mail = await getTransporter();
    const info = await mail.sendMail({
      from: env.SMTP.FROM,
      to: toEmail,
      subject: 'SVCE No-Dues ERP - Password Reset Request',
      text: `Hello ${recipientName || 'User'},\n\nA password reset request was requested for your SVCE No-Dues ERP account.\n\nPlease reset your password using the secure link below (valid for 15 minutes):\n${resetUrl}\n\nIf you did not request this, please ignore this email.\n\nSVCE IT Department`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
          <h2 style="color: #1e3a8a; margin-top: 0;">SVCE No-Dues ERP Password Reset</h2>
          <p>Hello <strong>${recipientName || 'User'}</strong>,</p>
          <p>A password reset request was initiated for your institutional account. Click the button below to choose a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset My Password</a>
          </div>
          <p style="color: #64748b; font-size: 13px;">This link is single-use and will automatically expire in <strong>15 minutes</strong>.</p>
          <p style="color: #64748b; font-size: 13px;">If the button above does not work, copy and paste this URL into your browser:<br><a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a></p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 11px;">Sri Venkateswara College of Engineering • IT Department ERP</p>
        </div>
      `
    });

    if (nodemailer.getTestMessageUrl && info) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`🔗 Password Reset Email Preview: ${previewUrl}`);
      }
    }

    return { success: true, messageId: info?.messageId };
  } catch (err) {
    console.error('Failed to send password reset email:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendPasswordResetEmail,
  getTransporter
};
