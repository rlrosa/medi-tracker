import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'user',
    pass: process.env.SMTP_PASS || 'pass',
  },
});

export async function sendVerificationEmail(to: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verificationUrl = `${baseUrl}/api/auth/verify?token=${token}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || '"MediTracker" <noreply@meditracker.app>',
    to,
    subject: 'Verify your MediTracker Account',
    text: `Welcome to MediTracker! Please verify your email by clicking the following link: ${verificationUrl}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to MediTracker!</h2>
        <p>Thank you for registering. Please confirm your email address to activate your account.</p>
        <div style="margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${verificationUrl}">${verificationUrl}</a></p>
      </div>
    `,
  };

  try {
    // Only attempt to send if SMTP is actually configured (otherwise we just log it for dev)
    if (process.env.SMTP_HOST) {
      await transporter.sendMail(mailOptions);
      console.log(`Verification email sent to ${to}`);
    } else {
      console.log(`[DEV MODE] Verification link for ${to}: ${verificationUrl}`);
    }
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}
