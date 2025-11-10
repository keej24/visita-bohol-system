# Forced Password Change Feature

## Overview

The VISITA admin dashboard now includes a **forced password change** feature for pre-configured accounts. This security enhancement ensures that users with default passwords (Chancery Office and Museum Researcher accounts) must change their password upon first login before accessing the system.

## Purpose

Pre-configured accounts are created with default passwords for initial system setup:
- `dioceseoftagbilaran@gmail.com` - Chancery Tagbilaran
- `talibonchancery@gmail.com` - Chancery Talibon
- `researcher.heritage@museum.ph` - Museum Researcher

While these default passwords are necessary for deployment, they pose a security risk if not changed. This feature **mandates** password changes on first login to ensure secure access.

---

## How It Works

### 1. User Profile Flag
Each user profile includes a `requirePasswordChange` boolean field:
- **`true`**: User must change password before accessing dashboard
- **`false`**: User can access dashboard normally

### 2. Login Flow
When a user logs in:

```
User Logs In
     ↓
[Authentication Successful]
     ↓
[Load User Profile]
     ↓
requirePasswordChange = true?
     ↓ YES                    ↓ NO
[Show Password Modal]   [Access Dashboard]
     ↓
[User Changes Password]
     ↓
[Update: requirePasswordChange = false]
     ↓
[Reload & Access Dashboard]
```

### 3. Password Change Modal
- **Non-dismissible**: User cannot close the modal or navigate away
- **Full-screen overlay**: Dashboard is blurred in background
- **Real-time validation**: Password strength checked as user types
- **Success feedback**: Clear confirmation when password is changed

---

## Technical Implementation

### Files Modified/Created

#### 1. **User Schema** (`admin-dashboard/src/lib/validations/user.ts`)
```typescript
// Added field to user schema
requirePasswordChange: z.boolean().default(false)
```

#### 2. **Auth Context** (`admin-dashboard/src/contexts/AuthContext.tsx`)
```typescript
export interface UserProfile {
  // ... existing fields
  requirePasswordChange?: boolean;  // Force password change on first login
}
```

#### 3. **Password Change Modal** (`admin-dashboard/src/components/PasswordChangeModal.tsx`)
- New component for password change UI
- Handles Firebase password update
- Updates Firestore `requirePasswordChange` flag
- Real-time password strength validation

#### 4. **Protected Route** (`admin-dashboard/src/components/ProtectedRoute.tsx`)
- Checks `requirePasswordChange` flag after authentication
- Renders modal over dashboard when password change required
- Reloads page after successful password change

#### 5. **Pre-configured Accounts** (`admin-dashboard/src/lib/setup-accounts.ts`)
```typescript
profile: {
  // ... other fields
  requirePasswordChange: true  // Force password change on first login
}
```

#### 6. **Auth Utils** (`admin-dashboard/src/lib/auth-utils.ts`)
- Updated `getKnownAccountProfile` to include `requirePasswordChange: true`

#### 7. **Firestore Rules** (`admin-dashboard/firestore.rules`)
- Added comment clarifying users can update their own `requirePasswordChange` field

---

## Password Requirements

The system enforces strong password requirements:

### Minimum Requirements
- ✅ At least **8 characters**
- ✅ At least **one uppercase letter** (A-Z)
- ✅ At least **one lowercase letter** (a-z)
- ✅ At least **one number** (0-9)
- ✅ At least **one special character** (!@#$%^&*)

### Real-time Validation
As the user types their new password, the modal displays:
- **Missing requirements** in amber/yellow
- **Green checkmark** when all requirements are met
- **Password mismatch error** if confirm password doesn't match

### Example Valid Passwords
- `Visita2025!`
- `Bohol#Church99`
- `Tagbilaran@2025`

---

## User Experience Flow

### First Login Experience

**Step 1: User logs in with default password**
```
Email: dioceseoftagbilaran@gmail.com
Password: ChanceryTagbilaran2025!
```

**Step 2: Authentication succeeds, modal appears**
- Dashboard loads in background (blurred)
- Non-dismissible modal appears
- User sees: "For security reasons, you must change your password"

**Step 3: User enters passwords**
```
Current Password: [default password]
New Password: [strong password]
Confirm Password: [strong password]
```

**Step 4: Real-time feedback**
- As user types, validation messages appear
- Submit button disabled until requirements met

**Step 5: Success**
- Green checkmark appears
- "Password Changed Successfully!" message
- Page reloads automatically
- User can now access dashboard

### Subsequent Logins
- User logs in with new password
- No modal appears
- Direct access to dashboard

---

## Security Features

### 1. **Cannot Be Bypassed**
- Modal is non-dismissible (no close button)
- No navigation while modal is active
- Protected routes check the flag

### 2. **Firebase Auth Integration**
- Password stored securely in Firebase Auth
- Old password cannot be reused
- Session maintained during password change

### 3. **Firestore Security Rules**
- Users can only update their own profile
- Diocese isolation maintained
- Audit trail preserved

### 4. **Password Strength Validation**
- Client-side validation (immediate feedback)
- Schema validation (Zod)
- Firebase built-in validation

---

## For Administrators

### Initial Account Setup

When setting up the system for the first time:

1. **Run account creation script**:
   ```bash
   npm run setup-accounts
   ```

2. **Accounts created with default passwords**:
   - All pre-configured accounts have `requirePasswordChange: true`

3. **First login for each account**:
   - User must change password before accessing system
   - Document the new passwords securely

### Communicating Default Passwords

**DO NOT** send default passwords via:
- ❌ Email
- ❌ Chat/Messenger
- ❌ SMS

**RECOMMENDED** methods:
- ✅ In-person handover (written on paper)
- ✅ Phone call (verbal only, no voicemail)
- ✅ Encrypted communication (Signal, ProtonMail)

### Resetting Password Requirement

If you need to force a user to change their password again:

```typescript
// In Firebase Console or admin script
await updateDoc(doc(db, 'users', userId), {
  requirePasswordChange: true
});
```

---

## Troubleshooting

### Modal doesn't appear on first login
**Cause**: Profile may not have `requirePasswordChange: true`

**Solution**:
1. Check Firestore user document
2. Manually set `requirePasswordChange: true`
3. User logs out and logs back in

### "Requires recent login" error
**Cause**: Firebase requires recent authentication for password changes

**Solution**:
1. User logs out completely
2. Logs back in with current password
3. Tries password change again

### Password validation fails
**Cause**: Password doesn't meet requirements

**Solution**:
- Check all requirements are met
- Ensure special character is included
- Verify no copy-paste issues (trailing spaces)

### Page doesn't reload after password change
**Cause**: Browser blocking window.location.reload()

**Solution**:
- User manually refreshes page (F5 or Ctrl+R)
- Password has been changed successfully

---

## Testing Checklist

Before deployment, verify:

- [ ] Pre-configured accounts have `requirePasswordChange: true`
- [ ] Modal appears on first login
- [ ] Modal is non-dismissible
- [ ] Password validation works correctly
- [ ] All requirement checks function
- [ ] "Passwords don't match" error appears
- [ ] Submit button disabled until valid
- [ ] Password change succeeds in Firebase
- [ ] Firestore flag updates to `false`
- [ ] Page reloads after success
- [ ] Subsequent login works with new password
- [ ] No modal on subsequent logins
- [ ] Works for all three pre-configured accounts

---

## Future Enhancements

Potential improvements for future versions:

1. **Password Expiry**
   - Force password change every N days
   - Add `passwordExpiresAt` field

2. **Password History**
   - Prevent reusing last 5 passwords
   - Store hashed password history

3. **Two-Factor Authentication**
   - Add 2FA for chancery accounts
   - SMS or authenticator app

4. **Password Strength Meter**
   - Visual strength indicator
   - Suggestions for improvement

5. **Account Recovery**
   - Email-based password reset
   - Security questions

---

## Related Documentation

- [Authentication System](./AUTHENTICATION.md)
- [Security Guide](./SECURITY.md)
- [User Management](./USER_MANAGEMENT.md)
- [Deployment Guide](./DEPLOYMENT.md)

---

## Questions & Support

For questions about this feature:
- Review this documentation
- Check Firestore user documents
- Verify Firebase Auth settings
- Test with pre-configured account

**Last Updated**: 2025-01-10
**Feature Version**: 1.0.0
**Status**: ✅ Implemented & Documented
