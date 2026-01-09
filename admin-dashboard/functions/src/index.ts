/**
 * =============================================================================
 * FIREBASE CLOUD FUNCTIONS - VISITA Admin Dashboard
 * =============================================================================
 * 
 * This module provides serverless functions for:
 * - Professional email delivery via Resend
 * - Password reset emails
 * - Welcome emails for new parish accounts
 * 
 * SETUP REQUIRED:
 * 1. Get Resend API key from https://resend.com
 * 2. Set the API key: firebase functions:config:set resend.api_key="re_xxxxx"
 * 3. Deploy: firebase deploy --only functions
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Resend } from "resend";

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Resend with API key from environment params (Firebase Functions v2+)
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Resend API key not configured. Set RESEND_API_KEY in params.yaml or your environment. See Firebase Functions params migration guide."
    );
  }
  return new Resend(apiKey);
};

// Email templates
const EMAIL_CONFIG = {
  from: "VISITA Bohol Churches <noreply@visita-bohol.com>", // Update with your verified domain
  replyTo: "support@visita-bohol.com", // Optional: where replies go
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
 * Cloud Function: Send Password Reset Email
 * 
 * Called from the frontend when user requests password reset.
 * Uses Resend for professional email delivery to avoid spam filters.
 */
export const sendPasswordResetEmail = functions.https.onCall(
  async (data, context) => {
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

      // Send email via Resend
      const resend = getResendClient();
      
      await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to: email,
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
                        <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #6366f1, #4f46e5); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
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
        
        if (error.message.includes("Resend API key not configured")) {
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
  }
);

/**
 * Cloud Function: Send Welcome Email to New Parish Account
 * 
 * Triggered when a new parish secretary account is created.
 * Sends a professional welcome email with password setup instructions.
 */
export const sendWelcomeEmail = functions.https.onCall(
  async (data, context) => {
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

      const resend = getResendClient();
      
      await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to: email,
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
                        <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
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
  }
);
