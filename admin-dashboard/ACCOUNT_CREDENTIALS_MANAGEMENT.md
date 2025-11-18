# Account Credentials Management System

## Overview

This document describes the secure account credentials management system implemented for the VISITA admin dashboard. The system addresses the issue where chancery office staff may lose temporary passwords after creating parish accounts.

## Problem Statement

When the chancery creates a new parish account, there was a risk that:
1. Temporary password and account details are not copied or retained
2. No way to retrieve or view credentials after account creation
3. Parish secretaries could not access their accounts if credentials were lost

## Solution Implemented

### 1. Enhanced Account Creation Modal

**File**: `admin-dashboard/src/components/CreateParishAccountModal.tsx`

#### Features:
- **Improved Success Screen**: After account creation, displays a clear, well-organized view of credentials
- **Copy to Clipboard**: One-click button to copy all account details including:
  - Email
  - Temporary password
  - Login URL
  - Instructions for password reset
- **Security Warning**: Prominently displays message that password cannot be viewed again
- **Visual Feedback**: Shows confirmation when credentials are copied

#### Security Best Practices:
- Passwords are never stored in Firestore (Firebase security best practice)
- Clear warning that password cannot be retrieved later
- Encourages immediate copying of credentials
- Suggests password reset option as backup

### 2. View Account Details Modal

**File**: `admin-dashboard/src/components/ViewAccountDetailsModal.tsx`

#### Purpose:
Provides a secure way to view account information and manage credentials for existing accounts.

#### Features:

**Account Information Display**:
- Email address
- Parish name and municipality
- Diocese
- Parish ID (unique identifier)
- Account status (active/inactive)
- Creation date and creator information

**Password Management**:
- **Password Reset Email**: Send Firebase password reset link to user's email
- **Copy Account Details**: Copy all account information to share with parish secretary
- **Security Notice**: Explains that passwords cannot be viewed for security reasons

**User Interface**:
- Clean, organized layout with icons
- Color-coded status badges
- Loading states for async operations
- Success/error feedback messages

### 3. Integration with User Management

**File**: `admin-dashboard/src/components/UserManagement.tsx`

#### New Button Added:
- **View Details (Info Icon)**: Opens the View Account Details Modal
- Positioned before the "Send Password Reset" button
- Available for all parish secretary accounts

#### Button Layout:
```
[View Details] [Send Password Reset] [Edit] [Activate/Deactivate] [Delete]
```

## User Workflows

### Workflow 1: Creating a New Account

1. Chancery clicks "Add Parish Account"
2. Fills in parish name, municipality, email, password
3. Clicks "Create Account"
4. **Success screen appears** with:
   - Email
   - Temporary password
   - Login URL
5. Chancery clicks "Copy All Details"
6. Shares credentials with parish secretary via secure channel
7. Clicks "Done" to close modal

**Best Practice**: Always copy credentials immediately and share them securely.

### Workflow 2: Lost Credentials Scenario

If a parish secretary loses their password or chancery needs to resend credentials:

1. Chancery goes to User Management
2. Finds the parish account in the list
3. Clicks the "View Details" (Info icon) button
4. Modal opens showing:
   - Account email
   - Parish information
   - Status and creation details
5. Chancery has two options:

   **Option A: Send Password Reset Email**
   - Click "Send Password Reset Email"
   - Parish secretary receives email with reset link
   - They create their own new password
   - **Recommended**: More secure, user controls their password

   **Option B: Copy Account Details**
   - Click "Copy Account Details"
   - Copies email, login URL, and instructions
   - Share with parish secretary
   - Parish secretary uses "Forgot Password" on login page
   - **Use case**: When email needs to be confirmed or shared again

### Workflow 3: Proactive Password Reset

If a parish secretary hasn't logged in for a while or reports access issues:

1. Chancery locates account in User Management
2. Clicks "View Details" button
3. Clicks "Send Password Reset Email"
4. System sends Firebase password reset email
5. Parish secretary receives email and creates new password
6. Success message confirms email was sent

## Security Implementation

### Password Security
- ✅ Passwords are **never stored** in Firestore
- ✅ Only Firebase Authentication stores hashed passwords
- ✅ No way to retrieve original password (by design)
- ✅ Password reset uses Firebase's secure email system
- ✅ Temporary passwords shown only once during creation

### Data Protection
- ✅ Account details require chancery role to access
- ✅ Diocese filtering prevents cross-diocese access
- ✅ Audit trail: tracks who created each account
- ✅ Copy-to-clipboard instead of displaying permanently

### Best Practices Followed
1. **Principle of Least Privilege**: Only show necessary information
2. **Defense in Depth**: Multiple security layers (Firebase Auth + Firestore rules + role checks)
3. **Secure by Default**: Password reset preferred over password retrieval
4. **User Education**: Clear warnings about password security
5. **Audit Trail**: Track who created accounts and when

## Technical Details

### Firebase Authentication Integration

```typescript
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Send password reset email
await sendPasswordResetEmail(auth, userEmail);
```

### Component Props

**ViewAccountDetailsModal**:
```typescript
interface Props {
  user: UserProfile | null;  // User account to display
  open: boolean;             // Modal open state
  onOpenChange: (open: boolean) => void;  // State handler
}
```

### State Management

**UserManagement.tsx**:
```typescript
const [isViewDetailsModalOpen, setIsViewDetailsModalOpen] = useState(false);
const [userToView, setUserToView] = useState<UserAccount | null>(null);
```

## User Interface Components

### Icons Used
- **Info** (`Info`): View account details
- **Key** (`Key`): Password reset actions
- **Copy** (`Copy`): Copy to clipboard
- **CheckCircle2**: Success states
- **AlertTriangle**: Warnings and important notices
- **Loader2**: Loading states

### Color Coding
- **Blue**: Information and account details
- **Green**: Success messages
- **Amber/Yellow**: Warnings and important notices
- **Red**: Errors and destructive actions

## Testing Scenarios

### Test Case 1: Account Creation and Credential Copy
1. Create new parish account
2. Verify success screen displays all credentials
3. Click "Copy All Details"
4. Verify toast notification shows success
5. Paste into text editor to verify format
6. Close modal and verify cannot reopen to see password

### Test Case 2: View Account Details
1. Navigate to User Management
2. Click "View Details" on any parish account
3. Verify all account information displays correctly
4. Verify password reset button is available
5. Close modal

### Test Case 3: Send Password Reset
1. Open View Details modal
2. Click "Send Password Reset Email"
3. Verify loading state shows
4. Verify success message appears
5. Check user's email for reset link
6. Verify reset link works

### Test Case 4: Copy Account Details
1. Open View Details modal
2. Click "Copy Account Details"
3. Verify copied text includes:
   - Parish name
   - Email
   - Municipality
   - Diocese
   - Login URL
   - Instructions for password reset
4. Verify toast shows success

## Future Enhancements

### Potential Improvements
1. **Email Template Customization**: Customize password reset email content
2. **Bulk Operations**: Send password resets to multiple users
3. **Password Expiry**: Force password change after certain period
4. **Login History**: Show last login attempts
5. **Two-Factor Authentication**: Add 2FA option for parish accounts
6. **Account Recovery Questions**: Additional verification method
7. **SMS Notifications**: Alternative to email for password reset

### Considerations
- Balance between security and usability
- Compliance with data protection regulations
- User education and training materials
- Automated password expiry policies

## Troubleshooting

### Issue: Password reset email not received
**Solution**:
1. Check spam/junk folder
2. Verify email address is correct in system
3. Check Firebase Console → Authentication → Templates
4. Ensure SMTP is configured correctly
5. Try resending after a few minutes

### Issue: Cannot copy to clipboard
**Solution**:
1. Check browser permissions for clipboard access
2. Try manual selection and copy
3. Use keyboard shortcut (Ctrl+C)
4. Check if HTTPS is enabled (required for clipboard API)

### Issue: Modal not opening
**Solution**:
1. Refresh the page
2. Check console for JavaScript errors
3. Verify user has chancery role
4. Check if modal component is imported correctly

## References

- [Firebase Authentication - Password Reset](https://firebase.google.com/docs/auth/web/manage-users#send_a_password_reset_email)
- [Clipboard API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
- [React Dialog Component - Radix UI](https://www.radix-ui.com/docs/primitives/components/dialog)

## Change Log

### Version 1.0 (November 18, 2025)
- ✅ Implemented enhanced account creation success screen
- ✅ Added View Account Details modal
- ✅ Integrated password reset functionality
- ✅ Added copy-to-clipboard for credentials
- ✅ Implemented security warnings and best practices
- ✅ Added visual feedback for all actions
- ✅ Updated User Management with view details button

---

**Status**: ✅ Implemented and tested
**Security Review**: ✅ Approved
**Documentation**: ✅ Complete
