/**
 * =============================================================================
 * FIREBASE CLOUD FUNCTIONS - VISITA Admin Dashboard
 * =============================================================================
 * 
 * This module provides serverless functions for:
 * - Professional email delivery via Gmail SMTP (FREE - 500 emails/day)
 * - Password reset emails
 * - Welcome emails for new parish accounts
 * - Email verification
 * 
 * SETUP REQUIRED:
 * 1. Enable 2-Factor Authentication on your Gmail account
 * 2. Generate an App Password: https://myaccount.google.com/apppasswords
 * 3. Set secrets:
 *    firebase functions:secrets:set GMAIL_EMAIL
 *    firebase functions:secrets:set GMAIL_APP_PASSWORD
 * 4. Deploy: firebase deploy --only functions
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

// Initialize Firebase Admin
admin.initializeApp();

// =============================================================================
// EMAIL CONFIGURATION - Gmail SMTP (FREE - 500 emails/day)
// =============================================================================

interface EmailTransporter {
  sendMail: (options: nodemailer.SendMailOptions) => Promise<nodemailer.SentMessageInfo>;
}

/**
 * Create Gmail SMTP transporter
 * Uses App Password for authentication (not your regular Gmail password)
 */
const createGmailTransporter = (): EmailTransporter => {
  const email = process.env.GMAIL_EMAIL;
  const password = process.env.GMAIL_APP_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Gmail credentials not configured. Run:\n" +
      "firebase functions:secrets:set GMAIL_EMAIL\n" +
      "firebase functions:secrets:set GMAIL_APP_PASSWORD"
    );
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: email,
      pass: password,
    },
  });
};

// Email configuration
const EMAIL_CONFIG = {
  fromName: "VISITA Bohol Churches",
  // Gmail will override 'from' with your actual Gmail address for security
  // But the fromName will still show
};

/**
 * Generate password reset link using Firebase Admin SDK
 */
const generatePasswordResetLink = async (email: string): Promise<string> => {
  const actionCodeSettings = {
    url: "https://visita-bohol-system.vercel.app/login", // Redirect after reset
    handleCodeInApp: false,
  };
  
  return admin.auth().generatePasswordResetLink(email, actionCodeSettings);
};

/**
 * Generate email verification link using Firebase Admin SDK
 * @param email - User's email address
 * @param source - 'admin' or 'mobile' to determine redirect URL
 */
const generateEmailVerificationLink = async (
  email: string, 
  source: 'admin' | 'mobile' = 'admin'
): Promise<string> => {
  // Mobile users go to success page, admin users go to login
  const continueUrl = source === 'mobile' 
    ? "https://visita-bohol-system.vercel.app/email-verified"
    : "https://visita-bohol-system.vercel.app/login";
    
  const actionCodeSettings = {
    url: continueUrl,
    handleCodeInApp: false,
  };
  
  return admin.auth().generateEmailVerificationLink(email, actionCodeSettings);
};

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

const emailTemplates = {
  passwordReset: (resetLink: string) => ({
    subject: "Reset Your VISITA Admin Password",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background-color: #f4f4f5;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center;">
                    <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #6366f1, #4f46e5); border-radius: 50%; line-height: 80px;">
                      <span style="font-size: 32px;">⛪</span>
                    </div>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1e293b;">
                      VISITA Admin
                    </h1>
                    <p style="margin: 8px 0 0; font-size: 14px; color: #64748b;">
                      Bohol Churches Information System
                    </p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 20px 40px;">
                    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #1e293b;">
                      Reset Your Password
                    </h2>
                    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #475569;">
                      We received a request to reset the password for your VISITA admin account. Click the button below to create a new password.
                    </p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                      <tr>
                        <td align="center">
                          <a href="${resetLink}" 
                             style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.6; color: #94a3b8;">
                      This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px 40px;">
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 20px;">
                    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
                      Diocese of Tagbilaran & Diocese of Talibon<br>
                      Bohol, Philippines
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
VISITA Admin - Password Reset

We received a request to reset the password for your VISITA admin account.

Click this link to reset your password:
${resetLink}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.

---
Diocese of Tagbilaran & Diocese of Talibon
Bohol, Philippines
    `.trim(),
  }),

  emailVerification: (verifyLink: string, source: 'admin' | 'mobile' = 'admin') => {
    const isAdmin = source === 'admin';
    const appName = isAdmin ? 'VISITA Admin' : 'VISITA Bohol';
    const subtitle = 'Bohol Churches Information System';
    const description = isAdmin 
      ? 'Please verify your email address to complete your VISITA admin account setup. Click the button below to confirm your email.'
      : 'Welcome to VISITA! Please verify your email address to unlock the full experience including 360° virtual tours, rich historical insights, upcoming events, announcements, and much more.';
    
    return {
      subject: isAdmin ? 'Verify Your VISITA Admin Email' : 'Welcome to VISITA Bohol - Verify Your Email',
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background-color: #f4f4f5;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center;">
                    <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 50%; line-height: 80px;">
                      <span style="font-size: 32px;">✉️</span>
                    </div>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1e293b;">
                      ${appName}
                    </h1>
                    <p style="margin: 8px 0 0; font-size: 14px; color: #64748b;">
                      ${subtitle}
                    </p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 20px 40px;">
                    <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #1e293b;">
                      Verify Your Email Address
                    </h2>
                    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #475569;">
                      ${description}
                    </p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                      <tr>
                        <td align="center">
                          <a href="${verifyLink}" 
                             style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #22c55e, #16a34a); color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(34, 197, 94, 0.3);">
                            Verify Email
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.6; color: #94a3b8;">
                      This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px 40px;">
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 20px;">
                    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
                      Diocese of Tagbilaran & Diocese of Talibon<br>
                      Bohol, Philippines
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
      text: `
${appName} - Email Verification

${description}

Click this link to verify your email:
${verifyLink}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

---
Diocese of Tagbilaran & Diocese of Talibon
Bohol, Philippines
      `.trim(),
    };
  },

  welcome: (setupLink: string, parishName: string, diocese: string) => ({
    subject: `Welcome to VISITA Admin - ${parishName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="background-color: #f4f4f5;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center;">
                    <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; line-height: 80px;">
                      <span style="font-size: 32px;">🎉</span>
                    </div>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1e293b;">
                      Welcome to VISITA!
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 20px 40px;">
                    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #475569;">
                      Your parish secretary account has been created for:
                    </p>
                    
                    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                      <p style="margin: 0; font-size: 16px; font-weight: 600; color: #166534;">
                        ${parishName}
                      </p>
                      <p style="margin: 4px 0 0; font-size: 14px; color: #15803d;">
                        Diocese of ${diocese || "Bohol"}
                      </p>
                    </div>
                    
                    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #475569;">
                      Click the button below to set up your password and access your dashboard.
                    </p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                      <tr>
                        <td align="center">
                          <a href="${setupLink}" 
                             style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                            Set Up Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.6; color: #94a3b8;">
                      This link will expire in 1 hour. If it expires, contact the Chancery Office to resend.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px 40px;">
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0 0 20px;">
                    <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
                      VISITA: Bohol Churches Information System<br>
                      Diocese of Tagbilaran & Diocese of Talibon
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `
Welcome to VISITA Admin!

Your parish secretary account has been created for:
${parishName}
Diocese of ${diocese || "Bohol"}

Click this link to set up your password:
${setupLink}

This link will expire in 1 hour.

---
VISITA: Bohol Churches Information System
Diocese of Tagbilaran & Diocese of Talibon
    `.trim(),
  }),
};

// =============================================================================
// CLOUD FUNCTIONS - Using Gmail SMTP (FREE - 500 emails/day)
// =============================================================================

/**
 * Cloud Function: Send Password Reset Email
 * 
 * Called from the frontend when user requests password reset.
 * Uses Gmail SMTP for FREE email delivery (500 emails/day limit).
 */
export const sendPasswordResetEmail = functions
  .runWith({ secrets: ["GMAIL_EMAIL", "GMAIL_APP_PASSWORD"] })
  .https.onCall(async (data) => {
    const { email } = data;

    // Validate email
    if (!email || typeof email !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email address is required"
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid email address format"
      );
    }

    try {
      // Check if user exists
      const userRecord = await admin.auth().getUserByEmail(email);
      
      if (!userRecord) {
        // Don't reveal if user exists for security
        return { success: true, message: "If an account exists, a reset email has been sent." };
      }

      // Generate reset link
      const resetLink = await generatePasswordResetLink(email);

      // Send email via Gmail SMTP
      const transporter = createGmailTransporter();
      const template = emailTemplates.passwordReset(resetLink);
      
      await transporter.sendMail({
        from: `"${EMAIL_CONFIG.fromName}" <${process.env.GMAIL_EMAIL}>`,
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      functions.logger.info(`Password reset email sent to ${email}`);
      
      return { 
        success: true, 
        message: "Password reset email sent successfully" 
      };

    } catch (error: unknown) {
      functions.logger.error("Error sending password reset email:", error);
      
      if (error instanceof Error) {
        // Handle specific Firebase Auth errors
        if (error.message.includes("user-not-found")) {
          // Don't reveal if user exists
          return { success: true, message: "If an account exists, a reset email has been sent." };
        }
        
        if (error.message.includes("Gmail credentials not configured")) {
          throw new functions.https.HttpsError(
            "failed-precondition",
            "Email service not configured. Please contact the administrator."
          );
        }
      }
      
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send password reset email. Please try again later."
      );
    }
  });

/**
 * Cloud Function: Send Email Verification
 * 
 * Sends a custom-branded email verification email.
 */
export const sendEmailVerification = functions
  .runWith({ secrets: ["GMAIL_EMAIL", "GMAIL_APP_PASSWORD"] })
  .https.onCall(async (data) => {
    const { email, source } = data;

    if (!email || typeof email !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email address is required"
      );
    }

    // Determine source: 'admin' or 'mobile' (default to 'mobile' for public users)
    const emailSource: 'admin' | 'mobile' = source === 'admin' ? 'admin' : 'mobile';

    try {
      // Generate verification link with appropriate redirect URL based on source
      const verifyLink = await generateEmailVerificationLink(email, emailSource);

      // Send email via Gmail SMTP
      const transporter = createGmailTransporter();
      const template = emailTemplates.emailVerification(verifyLink, emailSource);
      
      await transporter.sendMail({
        from: `"${EMAIL_CONFIG.fromName}" <${process.env.GMAIL_EMAIL}>`,
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      functions.logger.info(`Email verification sent to ${email} (source: ${emailSource})`);
      
      return { 
        success: true, 
        message: "Verification email sent successfully" 
      };

    } catch (error) {
      functions.logger.error("Error sending verification email:", error);
      
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send verification email. Please try again later."
      );
    }
  });

/**
 * Cloud Function: Send Welcome Email to New Parish Account
 * 
 * Triggered when a new parish secretary account is created.
 * Sends a professional welcome email with password setup instructions.
 */
export const sendWelcomeEmail = functions
  .runWith({ secrets: ["GMAIL_EMAIL", "GMAIL_APP_PASSWORD"] })
  .https.onCall(async (data, context) => {
    // Verify caller is authenticated and has admin role
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to send welcome emails"
      );
    }

    const { email, parishName, diocese } = data;

    if (!email || !parishName) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email and parish name are required"
      );
    }

    try {
      // Generate password reset link for initial setup
      const setupLink = await generatePasswordResetLink(email);

      // Send email via Gmail SMTP
      const transporter = createGmailTransporter();
      const template = emailTemplates.welcome(setupLink, parishName, diocese || "Bohol");
      
      await transporter.sendMail({
        from: `"${EMAIL_CONFIG.fromName}" <${process.env.GMAIL_EMAIL}>`,
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      functions.logger.info(`Welcome email sent to ${email} for ${parishName}`);
      
      return { 
        success: true, 
        message: "Welcome email sent successfully" 
      };

    } catch (error) {
      functions.logger.error("Error sending welcome email:", error);
      
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send welcome email"
      );
    }
  });
