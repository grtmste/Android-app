const nodemailer = require('nodemailer');

/**
 * Creates a transporter from env vars.
 * Falls back to Ethereal (test) when SMTP_HOST is not configured.
 */
async function getTransporter() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback: Ethereal test account (captures outgoing mail at ethereal.email)
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

/**
 * POST /api/email/send
 * Body: { to, subject, message, documentType, documentId }
 */
async function sendDocument(req, res) {
  const { to, subject, message, documentType, documentId } = req.body;

  if (!to || !subject || !message) {
    return res.status(400).json({ error: 'to, subject, and message are required' });
  }

  try {
    const transporter = await getTransporter();

    const fromName = process.env.SMTP_FROM_NAME || 'Stereo Sound OÜ';
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'billing@stereosound.ee';

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text: message,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1A3C6E;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:18px;">Stereo Sound OÜ</h2>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          ${message.replace(/\n/g, '<br>')}
          <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">
            Stereo Sound OÜ · Tartu mnt 84, 10112 Tallinn, Estonia<br>
            reg. 12345678 · VAT EE123456789 · billing@stereosound.ee
          </p>
        </div>
      </div>`,
    });

    // In dev, log the Ethereal preview URL
    if (!process.env.SMTP_HOST) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    res.json({
      success: true,
      messageId: info.messageId,
      previewUrl: !process.env.SMTP_HOST ? nodemailer.getTestMessageUrl(info) : null,
    });
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ error: 'Failed to send email', detail: err.message });
  }
}

module.exports = { sendDocument };
