const axios = require('axios');

const nodemailer = require('nodemailer');

// Check if Email Service URL or SMTP is configured
const isSmtpConfigured = () => {
    return !!process.env.EMAIL_SERVICE_URL || !!process.env.SMTP_HOST;
};

/**
 * Generic function to send email via Vercel Serverless Function
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @param {string} text - Email text content (optional)
 */
const sendEmail = async ({ to, subject, html, text }) => {
    if (!isSmtpConfigured()) {
        const error = new Error('Email service not configured. Please set EMAIL_SERVICE_URL or SMTP_HOST.');
        console.error(`❌ ${error.message}`);
        throw error;
    }

    const errors = [];

    // 🚀 Priority 1: Vercel Microservice Relay
    if (process.env.EMAIL_SERVICE_URL) {
        try {
            console.log(`📡 Attempting email via Vercel Relay: ${process.env.EMAIL_SERVICE_URL}`);
            const response = await axios.post(process.env.EMAIL_SERVICE_URL, {
                to,
                subject,
                html,
                text
            }, { timeout: 10000 }); // 10s timeout

            console.log(`✅ Email sent successfully via Vercel Relay:`, response.data.messageId || 'Success');
            return response.data;
        } catch (error) {
            const relayError = error.response?.data?.details || error.response?.data?.error || error.message;
            console.error(`⚠️ Vercel Relay failed: ${relayError}`);
            errors.push(`Relay: ${relayError}`);

            // If strictly using relay or no SMTP fallback, throw now
            if (!process.env.SMTP_HOST) {
                throw new Error(`Email failed (Relay): ${relayError}`);
            }
            console.log('🔄 Falling back to direct SMTP...');
        }
    }

    // 📧 Priority 2: Direct SMTP (Nodemailer)
    if (process.env.SMTP_HOST) {
        try {
            console.log(`📧 Attempting direct SMTP: ${process.env.SMTP_HOST}`);
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: parseInt(process.env.SMTP_PORT || '587') === 465,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });

            const info = await transporter.sendMail({
                from: process.env.SMTP_FROM || `"BQ Incubation" <no-reply@bqincubation.com>`,
                to,
                subject,
                text: text || "HTML version only available.",
                html,
            });

            console.log(`✅ Email sent successfully via Direct SMTP: ${info.messageId}`);
            return info;
        } catch (error) {
            console.error(`❌ Direct SMTP failed: ${error.message}`);
            errors.push(`SMTP: ${error.message}`);
            throw new Error(`Email failed to send. [${errors.join(' | ')}]`);
        }
    }
};

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} resetToken - The plain reset token (not hashed)
 * @param {string} userName - User's name for personalization
 */
const sendPasswordResetEmail = async (email, resetToken, userName = 'User') => {
    // 🔗 Priority: USER_URL (frontend) > FRONTEND_URL > BACKEND_URL (fallback)
    const frontendUrl = process.env.USER_URL || 'https://banoqabil-incubatees.vercel.app';
    const resetUrl = `${(frontendUrl || '').replace(/\/$/, '')}/reset-password/${resetToken}`;

    const htmlContent = `
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
        `;

    const textContent = `Hi ${userName},\n\nWe received a request to reset your password.\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link will expire in 30 minutes.\n\nIf you didn't request this, please ignore this email.\n\n© ${new Date().getFullYear()} BQ Incubation`;

    return sendEmail({
        to: email,
        subject: 'Password Reset Request - BQ Incubation',
        html: htmlContent,
        text: textContent
    });
};

/**
 * Send verification email
 * @param {string} email - Recipient email
 * @param {string} token - Verification token
 * @param {string} userName - User's name
 */
const sendVerificationEmail = async (email, token, userName = 'User') => {
    // 🔗 Priority: USER_URL (frontend) > FRONTEND_URL > BACKEND_URL (fallback)
    const frontendUrl = process.env.USER_URL || 'https://banoqabil-incubatees.vercel.app';
    const verifyUrl = `${(frontendUrl || '').replace(/\/$/, '')}/verify-email/${token}`;

    const htmlContent = `
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
                            <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #10b981 0%, #34d399 100%); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center;">
                                <span style="color: white; font-size: 24px; font-weight: 900;">BQ</span>
                            </div>
                        </div>
                        
                        <h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0 0 16px 0; letter-spacing: -0.5px;">
                            Verify Your Email
                        </h1>
                        
                        <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin: 0 0 32px 0;">
                            Hi <strong style="color: #ffffff;">${userName}</strong>,<br>
                            Welcome to BQ Incubation! Please click the button below to verify your email address and activate your account.
                        </p>
                        
                        <a href="${verifyUrl}" 
                           style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);">
                            Verify Email
                        </a>
                        
                        <p style="color: #71717a; font-size: 13px; margin: 32px 0 0 0;">
                            This link will expire in <strong style="color: #34d399;">24 hours</strong>.
                        </p>
                        
                        <div style="border-top: 1px solid #27272a; margin-top: 32px; padding-top: 24px;">
                            <p style="color: #52525b; font-size: 12px; margin: 0;">
                                If you didn't create an account, you can safely ignore this email.
                            </p>
                        </div>
                        
                        <p style="color: #3f3f46; font-size: 11px; margin: 24px 0 0 0;">
                            © ${new Date().getFullYear()} BQ Incubation. All rights reserved.
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;

    const textContent = `Hi ${userName},\n\nWelcome to BQ Incubation! Please verify your email by clicking the link below:\n${verifyUrl}\n\nThis link will expire in 24 hours.\n\n© ${new Date().getFullYear()} BQ Incubation`;

    return sendEmail({
        to: email,
        subject: 'Verify Your Email - BQ Incubation',
        html: htmlContent,
        text: textContent
    });
};

/**
 * Verify transporter connection (No longer applicable, checks env var)
 */
const verifyEmailConnection = async () => {
    if (!isSmtpConfigured()) {
        console.error('❌ Email Service not configured: EMAIL_SERVICE_URL missing');
        return false;
    }
    console.log('✅ Email Service Configured (Remote Relay)');
    return true;
};

module.exports = {
    sendPasswordResetEmail,
    sendVerificationEmail,
    verifyEmailConnection,
    isSmtpConfigured,
    sendEmail
};
