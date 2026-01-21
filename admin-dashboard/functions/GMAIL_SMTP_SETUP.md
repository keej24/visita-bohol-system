# Gmail SMTP Setup Guide for VISITA Cloud Functions

This guide explains how to set up **FREE** email sending using Gmail SMTP (500 emails/day limit).

## Why Gmail SMTP?

| Feature | Gmail SMTP | Resend/SendGrid |
|---------|------------|-----------------|
| Cost | **FREE** | Requires paid domain |
| Daily Limit | 500 emails/day | Varies by plan |
| Custom Domain | ❌ Not required | ✅ Required |
| Setup Difficulty | Easy | Moderate |
| Best For | Small-medium apps | Production at scale |

## Step 1: Enable 2-Factor Authentication

Gmail requires 2FA before you can generate App Passwords.

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Under "How you sign in to Google", click **2-Step Verification**
3. Follow the prompts to enable 2FA

## Step 2: Generate App Password

App Passwords let apps access your Gmail without using your main password.

1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Or: Google Account → Security → 2-Step Verification → App passwords
2. Click **Select app** → Choose "Mail"
3. Click **Select device** → Choose "Other (Custom name)"
4. Enter: `VISITA Cloud Functions`
5. Click **Generate**
6. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)
   - ⚠️ You won't be able to see this again!

## Step 3: Set Firebase Secrets

Firebase Functions use secrets to securely store credentials.

Open a terminal in the `admin-dashboard` folder and run:

```bash
# Navigate to admin-dashboard
cd admin-dashboard

# Set your Gmail address
firebase functions:secrets:set GMAIL_EMAIL
# When prompted, enter your Gmail address (e.g., visita.bohol@gmail.com)

# Set your App Password (remove spaces)
firebase functions:secrets:set GMAIL_APP_PASSWORD
# When prompted, enter the 16-character App Password (without spaces)
```

### Verify Secrets Are Set

```bash
firebase functions:secrets:access GMAIL_EMAIL
firebase functions:secrets:access GMAIL_APP_PASSWORD
```

## Step 4: Deploy Cloud Functions

```bash
cd admin-dashboard/functions

# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy to Firebase
firebase deploy --only functions
```

## Step 5: Test the Setup

### Test Password Reset Email

```javascript
// In browser console (while logged into VISITA admin)
const { getFunctions, httpsCallable } = await import('firebase/functions');
const functions = getFunctions();
const sendReset = httpsCallable(functions, 'sendPasswordResetEmail');
await sendReset({ email: 'your-test-email@gmail.com' });
```

### Test Welcome Email

```javascript
const sendWelcome = httpsCallable(functions, 'sendWelcomeEmail');
await sendWelcome({ 
  email: 'test@example.com', 
  parishName: 'Test Parish',
  diocese: 'Tagbilaran'
});
```

## Troubleshooting

### "Gmail credentials not configured"

Secrets are not set properly. Re-run:
```bash
firebase functions:secrets:set GMAIL_EMAIL
firebase functions:secrets:set GMAIL_APP_PASSWORD
```

### "Invalid login" or "Authentication failed"

1. Make sure 2FA is enabled on your Google account
2. Regenerate the App Password
3. Ensure you're entering the password without spaces

### "Less secure app access" errors

This is outdated advice. Gmail no longer uses "less secure app access". Use App Passwords instead (as described above).

### Emails going to spam

Gmail SMTP has good deliverability, but if emails go to spam:
1. Ask recipients to add your Gmail address to contacts
2. Ensure email content isn't spammy (no ALL CAPS, excessive links)
3. Consider upgrading to a custom domain with Resend/SendGrid later

### Daily limit reached (500 emails)

You've hit Gmail's daily limit. Options:
1. Wait 24 hours for limit reset
2. Use a second Gmail account
3. Upgrade to Google Workspace ($6/month) for 2,000 emails/day
4. Migrate to Brevo/SendGrid (free tiers available)

## Email Functions Available

### `sendPasswordResetEmail`

Sends a branded password reset email.

```typescript
// Frontend usage
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const sendPasswordReset = httpsCallable(functions, 'sendPasswordResetEmail');

await sendPasswordReset({ email: 'user@example.com' });
```

### `sendEmailVerification`

Sends a branded email verification email.

```typescript
const sendVerification = httpsCallable(functions, 'sendEmailVerification');
await sendVerification({ email: 'user@example.com' });
```

### `sendWelcomeEmail`

Sends a welcome email to new parish accounts (requires authentication).

```typescript
const sendWelcome = httpsCallable(functions, 'sendWelcomeEmail');
await sendWelcome({ 
  email: 'parish@example.com',
  parishName: 'San Jose Parish',
  diocese: 'Tagbilaran'
});
```

## Security Best Practices

1. **Never commit credentials** - Always use Firebase Secrets
2. **Use a dedicated Gmail account** - Don't use your personal email
3. **Monitor usage** - Check Firebase Functions logs for email activity
4. **Rotate App Passwords** - Regenerate periodically for security

## Cost Comparison

| Solution | Free Tier | Custom Domain |
|----------|-----------|---------------|
| Gmail SMTP | 500/day | ❌ Not needed |
| Brevo | 300/day | ❌ Not needed |
| Resend | 100/month | ✅ Required |
| SendGrid | 100/day | ✅ Required |
| Mailgun | 5 verified recipients | ✅ Required |

Gmail SMTP is the best free option that doesn't require purchasing a domain!

## Upgrading Later

When your app grows beyond 500 emails/day:

1. **Google Workspace** ($6/user/month): 2,000 emails/day
2. **Brevo Free**: 300/day on shared domain
3. **Resend/SendGrid**: Custom domain + professional deliverability

The Cloud Functions are designed to be easily swapped - just change the email transporter configuration.
