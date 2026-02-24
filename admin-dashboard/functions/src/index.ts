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
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

// Initialize Firebase Admin
admin.initializeApp();


interface EmailTransporter {
  sendMail: (options: nodemailer.SendMailOptions) => Promise<nodemailer.SentMessageInfo>;
}


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
  
};

// ==========================
// CHURCH IMPORT PARSING
// ==========================

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const setNestedValue = (target: Record<string, any>, path: string, value: unknown) => {
  const keys = path.split(".");
  let cursor = target;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    if (!cursor[key] || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, any>;
  }
  cursor[keys[keys.length - 1]] = value;
};

// All known labels used to detect field boundaries.
// Longer labels are listed first so they match before shorter prefixes.
const ALL_KNOWN_LABELS = [
  "Parish Name", "Church Name", "Parish", "Church",
  "Location Details", "Street Address", "Address",
  "Barangay", "Municipality", "City", "Town", "Province",
  "Current Parish Priest", "Parish Priest", "Current Priest", "Priest",
  "Parish Administrator",
  "Feast Day", "Patron Feast Day", "Patron Saint", "Patron",
  "Founding Year", "Year Founded", "Year Established", "Year Built",
  "Date Established", "Date Founded", "Construction Year", "Founded",
  "Founders", "Founded By", "Founding Organization",
  "Architectural Style", "Architecture",
  "Heritage Classification", "Heritage Class",
  "Religious Classification", "Religious Class",
  "Historical Background", "Historical background", "Church History", "History",
  "Architectural Information", "Architectural Features", "Design Features", "Building Features", "Notable Features",
  "Heritage Information", "Heritage Details", "Heritage Status", "Cultural Significance",
  "Contact Phone", "Contact Number", "Contact #", "Phone", "Telephone",
  "Mobile Number", "Mobile", "Tel",
  "Contact Email", "Email",
  "Official Website", "Website",
  "Facebook Page", "Facebook",
  "Mass Schedules", "Mass Schedule", "Schedule of Masses", "Worship Schedule",
  "GPS Coordinates", "Coordinates", "Latitude", "Longitude",
  "Diocese", "Vicariate"
].sort((a, b) => b.length - a.length);

// Fields whose values legitimately span multiple lines.
// For all other fields, continuation lines are NOT appended.
const MULTI_LINE_LABELS = new Set([
  "historical background", "church history", "history",
  "architectural information", "architectural features", "design features",
  "building features", "notable features",
  "heritage information", "heritage details", "heritage status", "cultural significance",
  "mass schedules", "mass schedule", "schedule of masses", "worship schedule"
]);

/**
 * Pre-process raw text: split concatenated fields onto separate lines
 * and join multi-line values that belong to the same field.
 */
const preprocessText = (text: string): Map<string, string> => {
  // Phase 1: Insert line breaks before any known "Label:" pattern so
  // concatenated text like "Municipality: DauisFounding Year: 1697" is split.
  const labelPattern = ALL_KNOWN_LABELS
    .map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const splitRegex = new RegExp(`(?<=[^\\n])(?=(${labelPattern})\\s*:)`, "gi");
  const normalized = text.replace(splitRegex, "\n");

  // Phase 2: Walk lines and pair each label with its (possibly multi-line) value.
  const lines = normalized.split(/\r?\n/);
  const result = new Map<string, string>();
  let currentLabel = "";
  let currentValue = "";

  const labelLineRegex = new RegExp(
    `^\\s*(${labelPattern})\\s*:\\s*(.*)$`, "i"
  );

  for (const line of lines) {
    const match = line.match(labelLineRegex);
    if (match) {
      // Store previous field
      if (currentLabel) {
        result.set(currentLabel.toLowerCase(), normalizeWhitespace(currentValue));
      }
      currentLabel = match[1];
      currentValue = match[2] || "";
    } else if (currentLabel) {
      // Only append continuation lines for multi-line fields (e.g. history, features).
      // For short fields like names/addresses, ignore stray continuation lines
      // to prevent address text bleeding into parish/church name fields.
      const trimmed = line.trim();
      if (trimmed && MULTI_LINE_LABELS.has(currentLabel.toLowerCase())) {
        currentValue += " " + trimmed;
      }
    }
  }
  // Store last field
  if (currentLabel) {
    result.set(currentLabel.toLowerCase(), normalizeWhitespace(currentValue));
  }

  return result;
};

/**
 * Normalize dropdown values so extracted text maps to valid form options.
 */
const ARCHITECTURAL_STYLE_MAP: Record<string, string> = {
  "baroque": "Baroque",
  "neo-gothic": "Neo-Gothic",
  "neogothic": "Neo-Gothic",
  "neo gothic": "Neo-Gothic",
  "gothic": "Neo-Gothic",
  "byzantine": "Byzantine",
  "neo-classical": "Neo-Classical",
  "neoclassical": "Neo-Classical",
  "neo classical": "Neo-Classical",
  "modern": "Modern",
  "mixed styles": "Mixed Styles",
  "mixed": "Mixed Styles",
  "other": "Other",
};

const normalizeArchitecturalStyle = (raw: string): string => {
  const lower = raw.toLowerCase().trim();
  // Direct match
  if (ARCHITECTURAL_STYLE_MAP[lower]) return ARCHITECTURAL_STYLE_MAP[lower];
  // Partial / contains match
  for (const [key, val] of Object.entries(ARCHITECTURAL_STYLE_MAP)) {
    if (lower.includes(key)) return val;
  }
  // If it mentions multiple styles, use Mixed Styles
  const matched = Object.keys(ARCHITECTURAL_STYLE_MAP).filter((k) => lower.includes(k));
  if (matched.length > 1) return "Mixed Styles";
  return raw.trim(); // Return as-is and let the UI handle it
};

const HERITAGE_CLASSIFICATION_MAP: Record<string, string> = {
  "none": "None",
  "national cultural treasure": "National Cultural Treasures",
  "national cultural treasures": "National Cultural Treasures",
  "nct": "National Cultural Treasures",
  "important cultural property": "Important Cultural Properties",
  "important cultural properties": "Important Cultural Properties",
  "icp": "Important Cultural Properties",
};

const normalizeHeritageClassification = (raw: string): string => {
  const lower = raw.toLowerCase().trim();
  if (HERITAGE_CLASSIFICATION_MAP[lower]) return HERITAGE_CLASSIFICATION_MAP[lower];
  for (const [key, val] of Object.entries(HERITAGE_CLASSIFICATION_MAP)) {
    if (lower.includes(key)) return val;
  }
  return raw.trim();
};

const RELIGIOUS_CLASSIFICATION_OPTIONS = [
  "Diocesan Shrine", "Jubilee Church", "Papal Basilica Affinity", "Holy Door"
];

const parseReligiousClassifications = (raw: string): string[] => {
  const lower = raw.toLowerCase();
  return RELIGIOUS_CLASSIFICATION_OPTIONS.filter(
    (opt) => lower.includes(opt.toLowerCase())
  );
};

interface MassScheduleEntry {
  day: string;
  time: string;
  endTime: string;
}

/**
 * Parse mass schedule text into structured MassSchedule objects.
 * Handles formats like:
 *   "Sunday 7:00 AM, 9:00 AM; Saturday 5:30 PM"
 *   "Sunday: 6:00 AM - 7:00 AM, 9:00 AM - 10:00 AM"
 *   "Mon-Fri 6:00 AM"
 */
const parseMassSchedules = (raw: string): MassScheduleEntry[] => {
  const schedules: MassScheduleEntry[] = [];
  const entries = raw.split(/[;\n]/).map((s: string) => s.trim()).filter(Boolean);

  const dayAliases: Record<string, string> = {
    "sun": "Sunday", "sunday": "Sunday",
    "mon": "Monday", "monday": "Monday",
    "tue": "Tuesday", "tues": "Tuesday", "tuesday": "Tuesday",
    "wed": "Wednesday", "wednesday": "Wednesday",
    "thu": "Thursday", "thurs": "Thursday", "thursday": "Thursday",
    "fri": "Friday", "friday": "Friday",
    "sat": "Saturday", "saturday": "Saturday",
    "weekdays": "Weekdays", "weekday": "Weekdays",
    "daily": "Daily",
  };

  const timeRegex = /(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/g;

  for (const entry of entries) {
    const dayMatch = entry.match(/^([A-Za-z-]+)[:\s,]+(.+)$/i);
    let day = "";
    let rest = entry;
    if (dayMatch) {
      const dayKey = dayMatch[1].toLowerCase().replace(/-/g, "");
      if (dayAliases[dayKey]) {
        day = dayAliases[dayKey];
        rest = dayMatch[2];
      } else {
        const parts = dayMatch[1].split("-");
        if (parts.length === 2 && dayAliases[parts[0].toLowerCase()] && dayAliases[parts[1].toLowerCase()]) {
          day = `${dayAliases[parts[0].toLowerCase()]}-${dayAliases[parts[1].toLowerCase()]}`;
          rest = dayMatch[2];
        }
      }
    }

    const times = [...rest.matchAll(timeRegex)].map((m: RegExpMatchArray) => m[1].trim());
    if (times.length > 0 && day) {
      for (const time of times) {
        schedules.push({ day, time, endTime: "" });
      }
    } else if (day && rest.trim()) {
      schedules.push({ day, time: rest.trim(), endTime: "" });
    }
  }

  return schedules;
};

/**
 * Validate extracted values and compute dynamic confidence scores.
 */
const validateAndScore = (
  path: string,
  value: unknown
): { value: unknown; confidence: number } => {
  const str = typeof value === "string" ? value : "";

  switch (path) {
    case "parishName":
    case "churchName": {
      const addressPatterns = /\b(bohol|cebu|leyte|street|st\.|brgy\.|barangay|province|philippines)\b/i;
      if (addressPatterns.test(str)) return { value: str, confidence: 0.4 };
      if (str.length < 3) return { value: str, confidence: 0.3 };
      if (str.length > 200) return { value: str, confidence: 0.4 };
      return { value: str, confidence: 0.85 };
    }

    case "historicalDetails.foundingYear": {
      const yearMatch = str.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1], 10);
        const currentYear = new Date().getFullYear();
        if (year >= 1521 && year <= currentYear) return { value: String(year), confidence: 0.95 };
        return { value: String(year), confidence: 0.5 };
      }
      return { value: str, confidence: 0.3 };
    }

    case "historicalDetails.heritageClassification": {
      const validValues = ["National Cultural Treasures", "Important Cultural Properties", "None"];
      if (validValues.includes(str)) return { value: str, confidence: 0.95 };
      return { value: str, confidence: 0.4 };
    }

    case "historicalDetails.architecturalStyle": {
      const validStyles = ["Baroque", "Neo-Gothic", "Byzantine", "Neo-Classical", "Modern", "Mixed Styles", "Other"];
      if (validStyles.includes(str)) return { value: str, confidence: 0.9 };
      return { value: str, confidence: 0.5 };
    }

    case "contactInfo.email": {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return { value: str, confidence: 0.9 };
      return { value: str, confidence: 0.3 };
    }

    case "contactInfo.phone": {
      const digits = str.replace(/[^0-9]/g, "");
      if (digits.length >= 7) return { value: str, confidence: 0.85 };
      return { value: str, confidence: 0.4 };
    }

    case "historicalDetails.historicalBackground":
    case "historicalDetails.architecturalFeatures":
    case "historicalDetails.heritageInformation": {
      if (str.length > 100) return { value: str, confidence: 0.85 };
      if (str.length > 30) return { value: str, confidence: 0.7 };
      return { value: str, confidence: 0.5 };
    }

    case "massSchedules": {
      if (Array.isArray(value) && value.length > 0) return { value, confidence: 0.8 };
      return { value, confidence: 0.4 };
    }

    default:
      return { value, confidence: 0.7 };
  }
};

const buildParsedDataFromText = (text: string) => {
  const fieldValues = preprocessText(text);
  const parsedData: Record<string, any> = {};
  const confidence: Record<string, number> = {};

  // Mapping: field path -> list of label aliases (lowercase) to search in the map
  const fieldMap: Array<{ path: string; labels: string[]; transform?: (v: string) => unknown }> = [
    { path: "parishName", labels: ["parish name", "parish"] },
    { path: "churchName", labels: ["church name", "church"] },
    { path: "locationDetails.streetAddress", labels: ["street address", "address"] },
    { path: "locationDetails.barangay", labels: ["barangay"] },
    { path: "locationDetails.municipality", labels: ["municipality", "city", "town"] },
    { path: "locationDetails.province", labels: ["province"] },
    { path: "currentParishPriest", labels: ["current parish priest", "parish priest", "current priest", "priest", "parish administrator"] },
    { path: "feastDay", labels: ["feast day", "patron feast day"] },
    { path: "historicalDetails.foundingYear", labels: ["founding year", "year founded", "year established", "year built", "date established", "date founded", "construction year", "founded"] },
    { path: "historicalDetails.founders", labels: ["founders", "founded by", "founding organization"] },
    { path: "historicalDetails.architecturalStyle", labels: ["architectural style", "architecture"], transform: normalizeArchitecturalStyle },
    { path: "historicalDetails.heritageClassification", labels: ["heritage classification", "heritage class"], transform: normalizeHeritageClassification },
    { path: "historicalDetails.religiousClassifications", labels: ["religious classification", "religious class"], transform: (v) => { const arr = parseReligiousClassifications(v); return arr.length > 0 ? arr : undefined; } },
    { path: "historicalDetails.historicalBackground", labels: ["historical background", "church history", "history"] },
    { path: "historicalDetails.architecturalFeatures", labels: ["architectural information", "architectural features", "design features", "building features", "notable features"] },
    { path: "historicalDetails.heritageInformation", labels: ["heritage information", "heritage details", "heritage status", "cultural significance"] },
    { path: "contactInfo.phone", labels: ["contact phone", "contact number", "contact #", "phone", "telephone", "mobile number", "mobile", "tel"] },
    { path: "contactInfo.email", labels: ["contact email", "email"] },
    { path: "contactInfo.website", labels: ["official website", "website"] },
    { path: "contactInfo.facebookPage", labels: ["facebook page", "facebook"] },
    { path: "massSchedules", labels: ["mass schedules", "mass schedule", "schedule of masses", "worship schedule"], transform: (v) => { const arr = parseMassSchedules(v); return arr.length > 0 ? arr : undefined; } }
  ];

  fieldMap.forEach(({ path, labels, transform }) => {
    // Try each label alias — first match wins
    for (const label of labels) {
      const raw = fieldValues.get(label);
      if (raw) {
        const value = transform ? transform(raw) : raw;
        if (value !== undefined && value !== "") {
          const validated = validateAndScore(path, value);
          if (validated.value !== undefined && validated.value !== "") {
            setNestedValue(parsedData, path, validated.value);
            confidence[path] = validated.confidence;
          }
        }
        break;
      }
    }
  });

  return { parsedData, confidence };
};

const getStoragePathFromUrl = (url: string) => {
  try {
    const decoded = decodeURIComponent(url);
    const marker = "/o/";
    const start = decoded.indexOf(marker);
    if (start === -1) return null;
    const pathPart = decoded.slice(start + marker.length);
    const end = pathPart.indexOf("?");
    const objectPath = end === -1 ? pathPart : pathPart.slice(0, end);
    return objectPath;
  } catch (error) {
    functions.logger.warn("Failed to parse storage path from URL", error);
    return null;
  }
};

const isPdf = (contentType: string, fileName?: string) =>
  contentType === "application/pdf" || /\.pdf$/i.test(fileName || "");

const isDocx = (contentType: string, fileName?: string) =>
  contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
  /\.docx$/i.test(fileName || "");

const isDoc = (contentType: string, fileName?: string) =>
  contentType === "application/msword" || /\.doc$/i.test(fileName || "");

const isImage = (contentType: string, fileName?: string) =>
  contentType.startsWith("image/") || /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(fileName || "");

const extractTextFromPdf = async (buffer: Buffer) => {
  const pdfParse = (await import("pdf-parse")).default as (data: Buffer) => Promise<{ text: string }>;
  const result = await pdfParse(buffer);
  return result.text || "";
};

const extractTextFromDocx = async (buffer: Buffer) => {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
};

const extractTextFromImage = async (buffer: Buffer) => {
  const vision = await import("@google-cloud/vision");
  const client = new vision.ImageAnnotatorClient();
  const [result] = await client.textDetection({ image: { content: buffer } });
  const annotations = result?.textAnnotations;
  return annotations && annotations.length > 0 ? annotations[0].description || "" : "";
};

const extractTextFromFile = async (buffer: Buffer, contentType: string, fileName?: string) => {
  if (contentType.startsWith("text/")) {
    return buffer.toString("utf8");
  }
  if (isPdf(contentType, fileName)) {
    return extractTextFromPdf(buffer);
  }
  if (isDocx(contentType, fileName)) {
    return extractTextFromDocx(buffer);
  }
  if (isDoc(contentType, fileName)) {
    throw new Error("DOC format is not supported. Please upload DOCX instead.");
  }
  if (isImage(contentType, fileName)) {
    return extractTextFromImage(buffer);
  }
  throw new Error("Unsupported file type for parsing.");
};

/**
 * Generate password reset link using Firebase Admin SDK
 * @param email - User's email address
 * @param source - 'admin' or 'mobile' to determine redirect URL
 */
const generatePasswordResetLink = async (
  email: string,
  source: 'admin' | 'mobile' = 'admin'
): Promise<string> => {
  // Redirect URL after password reset completes
  const continueUrl = source === 'mobile'
    ? "https://visita-bohol-system.vercel.app/password-reset-success"  // Mobile-friendly success page
    : "https://visita-bohol-system.vercel.app/login";  // Admin dashboard login
  
  const actionCodeSettings = {
    url: continueUrl,
    handleCodeInApp: false,
  };
  
  return admin.auth().generatePasswordResetLink(email, actionCodeSettings);
};

/**
 * Generate email verification link using Firebase Admin SDK
 * @param email - User's email address
 * @param source - 'admin' or 'mobile' to determine redirect URL
 * 
 * Uses custom action handler at /auth/action for branded verification experience
 * instead of Firebase's default handler with "Continue" button
 */
const generateEmailVerificationLink = async (
  email: string, 
  source: 'admin' | 'mobile' = 'admin'
): Promise<string> => {
  // Success page after verification completes
  const continueUrl = source === 'mobile' 
    ? "https://visita-bohol-system.vercel.app/email-verified"
    : "https://visita-bohol-system.vercel.app/login";
  
  // Use our custom action handler URL  
  const actionCodeSettings = {
    url: continueUrl,
    handleCodeInApp: true, // This allows us to handle the action in our app
  };
  
  // Get the Firebase-generated verification link
  const firebaseLink = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);
  
  // Extract the oobCode from Firebase's link and redirect to custom handler
  const url = new URL(firebaseLink);
  const oobCode = url.searchParams.get('oobCode');
  const mode = url.searchParams.get('mode');
  
  // Build our custom action handler URL
  const customUrl = `https://visita-bohol-system.vercel.app/auth/action?mode=${mode}&oobCode=${oobCode}&continueUrl=${encodeURIComponent(continueUrl)}`;
  
  return customUrl;
};

// =================
// EMAIL TEMPLATES
// =================

const emailTemplates = {
  passwordReset: (resetLink: string, source: 'admin' | 'mobile' = 'admin') => {
    const isAdmin = source === 'admin';
    const appName = isAdmin ? 'VISITA Admin' : 'VISITA Bohol';
    const subtitle = 'Bohol Churches Information System';
    const description = isAdmin 
      ? 'We received a request to reset the password for your VISITA admin account. Click the button below to create a new password.'
      : 'We received a request to reset the password for your VISITA account. Click the button below to create a new password.';
    
    return {
      subject: isAdmin ? 'Reset Your VISITA Admin Password' : 'Reset Your VISITA Password',
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
                    <img src="https://visita-bohol-system.vercel.app/visita-logo.png" alt="VISITA Logo" width="100" height="100" style="display: block; margin: 0 auto 20px; border-radius: 12px;">
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
                      Reset Your Password
                    </h2>
                    <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #475569;">
                      ${description}
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
${appName} - Password Reset

${description}

Click this link to reset your password:
${resetLink}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.

---
Diocese of Tagbilaran & Diocese of Talibon
Bohol, Philippines
      `.trim(),
    };
  },

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
                    <img src="https://visita-bohol-system.vercel.app/visita-logo.png" alt="VISITA Logo" width="100" height="100" style="display: block; margin: 0 auto 20px; border-radius: 12px;">
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

  /**
   * Welcome email with temporary credentials
   * Used when chancery creates a parish account with a generated password
   * Parish secretary can use these credentials OR click reset password
   */
  welcomeWithCredentials: (
    email: string,
    tempPassword: string,
    parishName: string,
    diocese: string,
    resetLink: string
  ) => ({
    subject: `Your VISITA Admin Account - ${parishName}`,
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
              <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center;">
                    <img src="https://visita-bohol-system.vercel.app/visita-logo.png" alt="VISITA Logo" width="100" height="100" style="display: block; margin: 0 auto 20px; border-radius: 12px;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1e293b;">
                      Welcome to VISITA Admin!
                    </h1>
                    <p style="margin: 8px 0 0; font-size: 14px; color: #64748b;">
                      Bohol Churches Information System
                    </p>
                  </td>
                </tr>
                
                <!-- Parish Info -->
                <tr>
                  <td style="padding: 0 40px 20px;">
                    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; text-align: center;">
                      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #166534;">
                        ${parishName}
                      </p>
                      <p style="margin: 4px 0 0; font-size: 14px; color: #15803d;">
                        Diocese of ${diocese || "Bohol"}
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Credentials Box -->
                <tr>
                  <td style="padding: 0 40px 24px;">
                    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #475569;">
                      Your parish secretary account has been created. Here are your login credentials:
                    </p>
                    
                    <div style="background-color: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 20px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                        <tr>
                          <td style="padding: 0 0 12px;">
                            <p style="margin: 0; font-size: 12px; font-weight: 600; color: #a16207; text-transform: uppercase; letter-spacing: 0.5px;">
                              Email Address
                            </p>
                            <p style="margin: 4px 0 0; font-size: 16px; font-weight: 600; color: #713f12; font-family: monospace;">
                              ${email}
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="border-top: 1px dashed #fde047; padding: 12px 0 0;">
                            <p style="margin: 0; font-size: 12px; font-weight: 600; color: #a16207; text-transform: uppercase; letter-spacing: 0.5px;">
                              Temporary Password
                            </p>
                            <p style="margin: 4px 0 0; font-size: 16px; font-weight: 600; color: #713f12; font-family: monospace; letter-spacing: 1px;">
                              ${tempPassword}
                            </p>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>

                <!-- Login Button -->
                <tr>
                  <td style="padding: 0 40px 16px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                      <tr>
                        <td align="center">
                          <a href="https://visita-bohol-system.vercel.app/login" 
                             style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; width: 100%; max-width: 280px; text-align: center; box-sizing: border-box;">
                            Login to Your Dashboard
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Reset Password Option -->
                <tr>
                  <td style="padding: 0 40px 24px;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center;">
                      <p style="margin: 0 0 8px; font-size: 13px; color: #64748b;">
                        Want to set your own password instead?
                      </p>
                      <a href="${resetLink}" 
                         style="font-size: 13px; color: #6366f1; text-decoration: underline; font-weight: 500;">
                        Click here to reset password
                      </a>
                    </div>
                  </td>
                </tr>
                
                <!-- Security Notice -->
                <tr>
                  <td style="padding: 0 40px 24px;">
                    <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #94a3b8; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px;">
                      <strong style="color: #dc2626;">Security Tip:</strong> We recommend changing your password after your first login. Go to Account Settings to update your password.
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

=== YOUR LOGIN CREDENTIALS ===

Email: ${email}
Temporary Password: ${tempPassword}

Login URL: https://visita-bohol-system.vercel.app/login

=== WANT TO SET YOUR OWN PASSWORD? ===

Click this link to reset your password:
${resetLink}

Security Tip: We recommend changing your password after your first login.

---
VISITA: Bohol Churches Information System
Diocese of Tagbilaran & Diocese of Talibon
    `.trim(),
  }),

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
                    <img src="https://visita-bohol-system.vercel.app/visita-logo.png" alt="VISITA Logo" width="100" height="100" style="display: block; margin: 0 auto 20px; border-radius: 12px;">
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
    const { email, source } = data;

    // Log received parameters for debugging
    functions.logger.info(`Password reset requested - email: ${email}, source: ${source || 'undefined'}`);

    // Determine source: 'admin' or 'mobile' (default to 'admin' for backward compatibility)
    const emailSource: 'admin' | 'mobile' = source === 'mobile' ? 'mobile' : 'admin';
    
    functions.logger.info(`Using email template for: ${emailSource}`);

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

      // Generate reset link with source parameter
      const resetLink = await generatePasswordResetLink(email, emailSource);

      // Send email via Gmail SMTP
      const transporter = createGmailTransporter();
      const template = emailTemplates.passwordReset(resetLink, emailSource);
      
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


export const sendWelcomeEmailWithCredentials = functions
  .runWith({ secrets: ["GMAIL_EMAIL", "GMAIL_APP_PASSWORD"] })
  .https.onCall(async (data, context) => {
    // Verify caller is authenticated (must be chancery)
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to send welcome emails"
      );
    }

    const { email, tempPassword, parishName, diocese } = data;

    // Validate required fields
    if (!email || !tempPassword || !parishName) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Email, temporary password, and parish name are required"
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid email address format"
      );
    }

    try {
      // Generate password reset link (in case user wants to set their own password)
      const resetLink = await generatePasswordResetLink(email);

      // Send email via Gmail SMTP
      const transporter = createGmailTransporter();
      const template = emailTemplates.welcomeWithCredentials(
        email,
        tempPassword,
        parishName,
        diocese || "Bohol",
        resetLink
      );
      
      await transporter.sendMail({
        from: `"${EMAIL_CONFIG.fromName}" <${process.env.GMAIL_EMAIL}>`,
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      functions.logger.info(`Welcome email with credentials sent to ${email} for ${parishName}`);
      
      return { 
        success: true, 
        message: "Welcome email with credentials sent successfully",
        emailSent: true
      };

    } catch (error) {
      functions.logger.error("Error sending welcome email with credentials:", error);
      
      // Check if it's an email delivery error
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("Invalid recipient") || 
          errorMessage.includes("Recipient not found") ||
          errorMessage.includes("mailbox not found")) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "The email address appears to be invalid or does not exist. Please verify the email address."
        );
      }
      
      throw new functions.https.HttpsError(
        "internal",
        "Failed to send welcome email. Please try again."
      );
    }
  });

// =============================================================================
// CHURCH IMPORT FUNCTIONS
// =============================================================================

export const parseChurchImport = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be authenticated to parse church imports"
    );
  }

  const { importId } = data || {};
  if (!importId || typeof importId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "importId is required");
  }

  const db = admin.firestore();
  const importRef = db.collection("church_imports").doc(importId);
  const importSnap = await importRef.get();

  if (!importSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Import session not found");
  }

  const importData = importSnap.data() || {};
  if (importData.createdBy && importData.createdBy !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Not allowed to parse this import session");
  }

  await importRef.update({
    status: "processing",
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  const sourceFile = importData.sourceFile || {};
  const storagePath = sourceFile.storagePath || getStoragePathFromUrl(sourceFile.url || "");
  if (!storagePath) {
    await importRef.update({
      status: "failed",
      errorMessage: "Storage path not available for this file.",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: false };
  }

  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);
  const [metadata] = await file.getMetadata();
  const contentType = metadata?.contentType || sourceFile.contentType || "";
  const fileName = sourceFile.name || metadata?.name || "";

  let text = "";
  try {
    const [contents] = await file.download();
    text = await extractTextFromFile(contents, contentType, fileName);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to parse this document.";
    await importRef.update({
      status: "failed",
      errorMessage: message,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: false };
  }

  const { parsedData, confidence } = buildParsedDataFromText(text);

  await importRef.update({
    status: "ready",
    parsedData,
    confidence,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { success: true };
});

// =============================================================================
// CLEANUP JOBS
// =============================================================================

const cleanupChurchImportsInternal = async (retentionDays: number) => {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const cutoffDate = admin.firestore.Timestamp.fromDate(new Date(cutoff));

  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  const snapshot = await db
    .collection("church_imports")
    .where("createdAt", "<=", cutoffDate)
    .get();

  if (snapshot.empty) {
    return { deleted: 0 };
  }

  const deleteTasks: Promise<unknown>[] = [];

  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const sourceFile = data.sourceFile || {};
    const storagePath = sourceFile.storagePath || getStoragePathFromUrl(sourceFile.url || "");

    if (storagePath) {
      deleteTasks.push(bucket.file(storagePath).delete({ ignoreNotFound: true }));
    }

    deleteTasks.push(docSnap.ref.delete());
  });

  await Promise.all(deleteTasks);
  return { deleted: snapshot.size };
};

export const cleanupChurchImportsManual = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated to run cleanup");
  }

  const userDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
  const userData = userDoc.data();
  if (!userData || userData.role !== "chancery_office") {
    throw new functions.https.HttpsError("permission-denied", "Only chancery office can run cleanup");
  }

  const retentionDays = Number(data?.retentionDays ?? 30);
  if (!Number.isFinite(retentionDays) || retentionDays < 1 || retentionDays > 365) {
    throw new functions.https.HttpsError("invalid-argument", "retentionDays must be between 1 and 365");
  }

  const result = await cleanupChurchImportsInternal(retentionDays);
  return { success: true, deleted: result.deleted, retentionDays };
});

// =============================================================================
// USER VERIFICATION FUNCTIONS
// =============================================================================

/**
 * Cloud Function: Verify Users Exist in Firebase Auth
 * 
 * Checks which user UIDs from Firestore still exist in Firebase Authentication.
 * This helps sync Firestore user documents with actual Firebase Auth users.
 * 
 * Returns an array of UIDs that exist in Firebase Auth.
 */
export const verifyUsersExist = functions.https.onCall(async (data, context) => {
  // Verify caller is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be authenticated to verify users"
    );
  }

  const { uids } = data;

  if (!uids || !Array.isArray(uids)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "UIDs array is required"
    );
  }

  try {
    const existingUids: string[] = [];
    const deletedUids: string[] = [];

    // Check each UID against Firebase Auth
    // Process in batches to avoid rate limits
    const batchSize = 100;
    for (let i = 0; i < uids.length; i += batchSize) {
      const batch = uids.slice(i, i + batchSize);
      
      const checkPromises = batch.map(async (uid: string) => {
        try {
          await admin.auth().getUser(uid);
          return { uid, exists: true };
        } catch (error: unknown) {
          // User not found in Firebase Auth
          if (error instanceof Error && error.message.includes("no user record")) {
            return { uid, exists: false };
          }
          // For other errors, assume user exists to be safe
          return { uid, exists: true };
        }
      });

      const results = await Promise.all(checkPromises);
      
      results.forEach(({ uid, exists }) => {
        if (exists) {
          existingUids.push(uid);
        } else {
          deletedUids.push(uid);
        }
      });
    }

    functions.logger.info(
      `Verified ${uids.length} users: ${existingUids.length} exist, ${deletedUids.length} deleted`
    );

    return {
      success: true,
      existingUids,
      deletedUids,
      totalChecked: uids.length,
    };
  } catch (error) {
    functions.logger.error("Error verifying users:", error);
    
    throw new functions.https.HttpsError(
      "internal",
      "Failed to verify users"
    );
  }
});

/**
 * Cloud Function: Clean Up Deleted Users from Firestore
 * 
 * Marks Firestore user documents as 'deleted' if the corresponding
 * Firebase Auth user no longer exists.
 * 
 * This is useful for maintaining data integrity after users are
 * deleted directly from Firebase Console.
 */
export const syncDeletedUsers = functions.https.onCall(async (data, context) => {
  // Verify caller is authenticated and has admin role
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be authenticated to sync users"
    );
  }

  const { diocese } = data;

  try {
    const usersRef = admin.firestore().collection("users");
    let usersQuery = usersRef.where("role", "==", "parish");
    
    if (diocese) {
      usersQuery = usersQuery.where("diocese", "==", diocese);
    }

    const snapshot = await usersQuery.get();
    
    const deletedUsers: string[] = [];
    const updatePromises: Promise<FirebaseFirestore.WriteResult>[] = [];

    for (const doc of snapshot.docs) {
      const userData = doc.data();
      const uid = userData.uid || doc.id;

      try {
        await admin.auth().getUser(uid);
        // User exists, no action needed
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes("no user record")) {
          // User deleted from Firebase Auth, mark as deleted in Firestore
          deletedUsers.push(uid);
          updatePromises.push(
            doc.ref.update({
              status: "deleted",
              deletedAt: admin.firestore.FieldValue.serverTimestamp(),
              deletedReason: "User removed from Firebase Authentication",
            })
          );
        }
      }
    }

    await Promise.all(updatePromises);

    functions.logger.info(
      `Synced deleted users: ${deletedUsers.length} users marked as deleted`
    );

    return {
      success: true,
      deletedUsers,
      totalSynced: deletedUsers.length,
    };
  } catch (error) {
    functions.logger.error("Error syncing deleted users:", error);
    
    throw new functions.https.HttpsError(
      "internal",
      "Failed to sync deleted users"
    );
  }
});

/**
 * Firestore Trigger: On Auth User Deletion
 * 
 * Automatically marks the Firestore user document as 'deleted' when
 * a user is deleted from Firebase Authentication.
 */
export const onUserDeleted = functions.auth.user().onDelete(async (user) => {
  try {
    const usersRef = admin.firestore().collection("users");
    const snapshot = await usersRef.where("uid", "==", user.uid).get();

    if (snapshot.empty) {
      functions.logger.info(`No Firestore document found for deleted user: ${user.uid}`);
      return;
    }

    const updatePromises = snapshot.docs.map((doc) =>
      doc.ref.update({
        status: "deleted",
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        deletedReason: "User deleted from Firebase Authentication",
      })
    );

    await Promise.all(updatePromises);

    functions.logger.info(
      `Marked ${snapshot.docs.length} Firestore document(s) as deleted for user: ${user.uid}`
    );
  } catch (error) {
    functions.logger.error(`Error handling user deletion for ${user.uid}:`, error);
  }
});

/**
 * Firestore Trigger: On Feedback Created
 * 
 * Sends a notification to the parish secretary when new visitor feedback
 * is submitted for their church.
 */
export const onFeedbackCreated = functions.firestore
  .document("feedback/{feedbackId}")
  .onCreate(async (snapshot, context) => {
    try {
      const feedbackData = snapshot.data();
      const feedbackId = context.params.feedbackId;
      
      functions.logger.info(`New feedback created: ${feedbackId}`);
      
      if (!feedbackData.church_id) {
        functions.logger.warn("Feedback missing church_id, skipping notification");
        return;
      }

      // Get the church to find its diocese and parish info
      const churchDoc = await admin.firestore()
        .collection("churches")
        .doc(feedbackData.church_id)
        .get();

      if (!churchDoc.exists) {
        functions.logger.warn(`Church not found: ${feedbackData.church_id}`);
        return;
      }

      const churchData = churchDoc.data();
      if (!churchData) {
        functions.logger.warn("Church data is empty");
        return;
      }

      // Create the notification for parish secretary
      const notification = {
        type: "feedback_received",
        priority: "medium",
        title: `New Visitor Feedback: ${churchData.name || "Your Church"}`,
        message: `A visitor has left a ${feedbackData.rating || 0}-star review for ${churchData.name || "your church"}. Check the feedback section to view details.`,
        recipients: {
          roles: ["parish"],
          dioceses: [churchData.diocese],
          parishId: feedbackData.church_id,
        },
        relatedData: {
          churchId: feedbackData.church_id,
          churchName: churchData.name || "Unknown Church",
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isRead: false,
        readBy: [],
        actionUrl: "/parish?tab=feedback",
        metadata: {
          feedbackId: feedbackId,
          rating: feedbackData.rating || 0,
          reviewerName: feedbackData.userName || feedbackData.pub_user_name || "Anonymous Visitor",
        },
      };

      await admin.firestore().collection("notifications").add(notification);
      
      functions.logger.info(
        `Feedback notification sent for church: ${churchData.name} (${feedbackData.church_id})`
      );
    } catch (error) {
      functions.logger.error("Error creating feedback notification:", error);
      // Don't throw - notification failure shouldn't affect feedback creation
    }
  });
