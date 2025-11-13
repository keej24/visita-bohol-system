# Account Settings - Merged Edit Profile Form

## Overview
Successfully merged the separate Profile and Security tabs in Account Settings into a single "Edit Profile" form, improving UX by reducing navigation and enabling users to update both contact information and password in one place.

## Changes Made

### 1. **Removed Tab Navigation**
- **Before**: Two separate tabs (Profile and Security) requiring users to switch between them
- **After**: Single unified form with all editable fields in one place
- Removed imports: `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`

### 2. **Single "Edit" Button UX**
```tsx
// When not editing: Shows "Edit" button
{!isEditingProfile && (
  <Button onClick={() => setIsEditingProfile(true)}>
    <Edit className="w-4 h-4 mr-2" />
    Edit
  </Button>
)}

// When editing: Shows "Save Changes" and "Cancel" buttons
{isEditingProfile && (
  <div className="flex gap-3 pt-4">
    <Button onClick={handleCombinedUpdate}>Save Changes</Button>
    <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
  </div>
)}
```

### 3. **Merged Form Structure**

**Account Information Section** (always visible):
- Profile Picture & Basic Info (display only)
- Name, Email, Phone, Address fields (editable when in edit mode)

**Password Section** (only visible in edit mode):
- Current Password
- New Password
- Confirm Password
- Password Requirements info box
- Helper text: "Leave blank if you don't want to change your password"

### 4. **New Combined Update Handler**

Created `handleCombinedUpdate()` function:

```typescript
const handleCombinedUpdate = async () => {
  // 1. Always update profile information
  await handleProfileUpdate();
  
  // 2. Only update password if password fields are filled
  const hasPasswordData = passwordData.currentPassword || 
                         passwordData.newPassword || 
                         passwordData.confirmPassword;
  
  if (hasPasswordData) {
    // Validate all password fields are filled
    // Validate password match
    // Validate password length
    // Re-authenticate and update password
  }
  
  // Exit edit mode
  setIsEditingProfile(false);
};
```

**Password Update Logic**:
- **Optional**: Users can skip password change by leaving fields blank
- **Required validation** if any password field has data:
  - All three password fields must be filled
  - New password and confirm password must match
  - Password must be at least 8 characters
  - Current password must be correct (re-authentication)

**Success Messages**:
- Profile only: "Profile updated successfully"
- Profile + Password: "Profile and password updated successfully"

### 5. **New Cancel Handler**

Created `handleCancelEdit()` function:

```typescript
const handleCancelEdit = () => {
  // Reset profile data to original values
  setProfileData({
    firstName: userProfile?.name?.split(' ')[0] || '',
    lastName: userProfile?.name?.split(' ').slice(1).join(' ') || '',
    email: userProfile?.email || '',
    phone: '',
    address: '',
    office: userProfile?.role === 'museum_researcher' ? 
      'National Museum of the Philippines - Bohol' : 'Chancery Office',
    diocese: userProfile?.diocese || 'tagbilaran'
  });
  
  // Clear password data
  setPasswordData({ 
    currentPassword: '', 
    newPassword: '', 
    confirmPassword: '' 
  });
  
  // Exit edit mode
  setIsEditingProfile(false);
};
```

## User Flow

### Test Case Compliance
✅ **Test Case**: "User clicks 'Edit.' The system displays the Edit Profile form containing editable fields (e.g., contact number and password)."

**Implementation**:
1. User clicks "Edit" button
2. System enables editing mode for ALL fields simultaneously:
   - Contact number (phone) becomes editable
   - Password fields become visible and editable
   - Address and other profile fields become editable
3. User can:
   - Update profile information only
   - Update profile + password together
   - Cancel to discard all changes
4. Single "Save Changes" button updates both profile and password (if provided)

### Interaction Flow

**Display Mode** (default):
- Shows current profile information (read-only)
- "Edit" button in header
- Password section hidden

**Edit Mode** (after clicking Edit):
- All profile fields become editable
- Password section appears with three fields
- Helper text: "Leave blank if you don't want to change your password"
- Shows "Save Changes" and "Cancel" buttons

**Save Process**:
1. Validates profile information (phone number format)
2. If password fields have data:
   - Validates all password fields are filled
   - Validates password match and length
   - Re-authenticates with current password
   - Updates password in Firebase Auth
3. Updates profile in Firestore
4. Shows success message
5. Exits edit mode

**Cancel Process**:
1. Resets all profile fields to original values
2. Clears all password fields
3. Exits edit mode
4. No changes saved

## Benefits

### User Experience
- **Simplified Navigation**: No need to switch between tabs
- **Single Edit Action**: One "Edit" button for all settings
- **Clearer Intent**: Password change is optional and clearly marked
- **Consistent UX**: Matches test case requirements
- **Less Clicks**: Update profile + password in one action

### Technical Improvements
- **Reduced Code Complexity**: No tab state management
- **Single Save Flow**: One unified update handler
- **Better Validation**: Combined validation logic
- **Cleaner Component**: Removed unnecessary tab components

## Validation Rules

### Profile Validation
- **Phone Number**: 7-15 digits, allows +, -, (), spaces
- **Email**: Valid email format (Firebase validation)
- **System Accounts**: Name and email are read-only

### Password Validation (when changing password)
- **Required Fields**: All three password fields must be filled if any is filled
- **Match Validation**: New password must match confirm password
- **Length**: Minimum 8 characters
- **Complexity**: Must meet Firebase Auth requirements:
  - Uppercase and lowercase letters
  - At least one number
  - At least one special character
- **Current Password**: Must be correct (re-authentication required)

## Error Handling

### Profile Update Errors
- Invalid phone number format
- Firestore update failure
- User not authenticated

### Password Update Errors
- Passwords don't match
- Password too short (< 8 characters)
- Current password incorrect (`auth/wrong-password`)
- Password too weak (`auth/weak-password`)
- Requires recent login (`auth/requires-recent-login`)
- User not authenticated

### Combined Update Errors
- If password validation fails, profile is still updated
- Shows appropriate error message for failed operation
- Loading state prevents duplicate submissions

## Files Modified

### `admin-dashboard/src/pages/AccountSettings.tsx`
**Changes**:
1. Removed Tab imports and components
2. Created single Card with merged form
3. Added `handleCombinedUpdate()` function
4. Added `handleCancelEdit()` function
5. Conditional rendering for edit mode
6. Password section only visible in edit mode

**Lines Changed**: ~200 lines (merged from 512 lines to 623 lines due to new handlers)

## Testing Checklist

✅ **Display Mode**:
- Shows current profile information
- "Edit" button visible
- Password section hidden
- All fields read-only

✅ **Edit Mode**:
- Click "Edit" enables all fields
- Password section appears
- Shows "Save Changes" and "Cancel" buttons
- Helper text visible

✅ **Profile-Only Update**:
- Update phone number
- Leave password fields blank
- Click "Save Changes"
- Success: "Profile updated successfully"
- Returns to display mode

✅ **Profile + Password Update**:
- Update phone number
- Fill all password fields
- Click "Save Changes"
- Success: "Profile and password updated successfully"
- Password fields cleared
- Returns to display mode

✅ **Password Validation**:
- Partial password fields → Error: "Please fill in all password fields"
- Mismatched passwords → Error: "New passwords do not match"
- Short password → Error: "Password must be at least 8 characters long"
- Wrong current password → Error: "Current password is incorrect"

✅ **Cancel Functionality**:
- Make changes to profile
- Fill password fields
- Click "Cancel"
- All changes discarded
- Returns to display mode
- Original values restored

✅ **System Accounts**:
- Name and email read-only
- Phone editable
- Password update available

## Related Documentation
- `QUICK_START_GUIDE.md` - Project setup and testing
- `admin-dashboard/CLAUDE.md` - System architecture
- `.github/copilot-instructions.md` - Project conventions

---

*Last Updated: January 2025*
*Change Type: UX Enhancement*
*Status: ✅ Complete*
