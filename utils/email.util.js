const nodemailer = require('nodemailer');

// Check if SMTP is configured
const isSmtpConfigured = () => {
    return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
};

// Create reusable transporter object using SMTP
const createTransporter = () => {
    if (!isSmtpConfigured()) {
        console.warn('⚠️ SMTP credentials not configured. Email sending will fail.');
        return null;
    }

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT) || 587;

    const config = {
        host: host,
        port: port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 60000,
        greetingTimeout: 60000,
        socketTimeout: 60000,
        // Force IPv4 (Fixes common Cloud/Gmail IPv6 timeouts)
        family: 4,
        debug: true, // Show basic debug info
        logger: true // Log to console
    };

    // ALLOW CUSTOM GMAIL PORT (Fix for Render/Cloud Timeout Issues)
    // We do NOT use 'service: gmail' here so we can explicitly control the port (465 vs 587)
    // via environment variables.


    console.log('📧 SMTP Config:', {
        host: config.host,
        port: config.port,
        secure: config.secure,
    });

    return nodemailer.createTransport(config);
};

const transporter = createTransporter();

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} resetToken - The plain reset token (not hashed)
 * @param {string} userName - User's name for personalization
 */
const sendPasswordResetEmail = async (email, resetToken, userName = 'User') => {
    const frontendUrl = process.env.USER_URL || process.env.LOCAL_URL || 'https://banoqabil-incubatees.vercel.app';
    const resetUrl = `${(frontendUrl || '').replace(/\/$/, '')}/reset-password/${resetToken}`;

    const mailOptions = {
        from: `"BQ Incubation" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Password Reset Request - BQ Incubation',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
                <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <div style="background: linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 100%); border-radius: 24px; padding: 40px; text-align: center;">
                        
                        <!-- Logo/Header -->
                        <div style="margin-bottom: 32px;">
                            <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center;">
                                <span style="color: white; font-size: 24px; font-weight: 900;">BQ</span>
                            </div>
                        </div>
                        
                        <h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0 0 16px 0; letter-spacing: -0.5px;">
                            Password Reset
                        </h1>
                        
                        <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin: 0 0 32px 0;">
                            Hi <strong style="color: #ffffff;">${userName}</strong>,<br>
                            We received a request to reset your password. Click the button below to set a new password.
                        </p>
                        
                        <a href="${resetUrl}" 
                           style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 8px 24px rgba(124, 58, 237, 0.4);">
                            Reset Password
                        </a>
                        
                        <p style="color: #71717a; font-size: 13px; margin: 32px 0 0 0;">
                            This link will expire in <strong style="color: #a855f7;">30 minutes</strong>.
                        </p>
                        
                        <div style="border-top: 1px solid #27272a; margin-top: 32px; padding-top: 24px;">
                            <p style="color: #52525b; font-size: 12px; margin: 0;">
                                If you didn't request this password reset, please ignore this email or contact support if you have concerns.
                            </p>
                        </div>
                        
                        <p style="color: #3f3f46; font-size: 11px; margin: 24px 0 0 0;">
                            © ${new Date().getFullYear()} BQ Incubation. All rights reserved.
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `Hi ${userName},\n\nWe received a request to reset your password.\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link will expire in 30 minutes.\n\nIf you didn't request this, please ignore this email.\n\n© ${new Date().getFullYear()} BQ Incubation`,
    };

    // Check if transporter is available
    if (!transporter) {
        console.error('❌ Email sending failed: SMTP not configured');
        throw new Error('Email service not configured. Please contact administrator.');
    }

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Password reset email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ SMTP TRANSPORT ERROR:', {
            message: error.message,
            code: error.code,
            command: error.command,
            response: error.response,
            stack: error.stack
        });
        throw new Error(`Email delivery failed: ${error.message}`);
    }
};

/**
 * Verify transporter connection
 */
const verifyEmailConnection = async () => {
    if (!transporter) {
        console.error('❌ Email server not configured: SMTP credentials missing');
        return false;
    }

    try {
        await transporter.verify();
        console.log('✅ Email server is ready');
        return true;
    } catch (error) {
        console.error('❌ Email server connection failed:', error.message || error);
        return false;
    }
};

module.exports = {
    sendPasswordResetEmail,
    verifyEmailConnection,
    isSmtpConfigured,
    transporter,
};
