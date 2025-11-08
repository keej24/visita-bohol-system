# Public User Management - Implementation Guide

## Overview

Public User Management has been added to the Chancery Dashboard, allowing chancery office users to view and manage mobile app users (public users) who interact with the VISITA system.

## Features

### 1. **User Management Dashboard**
   - Located at: User Management page → "Public Users" tab
   - Access: Chancery Office role only
   - Two tabs: "Admin Users" and "Public Users"

### 2. **Summary Statistics**
   - **Total Users**: All public users registered
   - **Active Users**: Non-blocked, active users
   - **Blocked Users**: Users who have been blocked
   - **Total Visits**: All church visits by public users
   - **Total Reviews**: All feedback/reviews submitted
   - **Average Rating**: Overall average rating from reviews

### 3. **User List Features**
   - **Search**: By name or email
   - **Filter**:
     - All Users
     - Active Only
     - Blocked Only
   - **Sort Options**:
     - Newest First / Oldest First
     - Name (A-Z / Z-A)
     - Most Visits
     - Most Reviews

### 4. **User Information Displayed**
   For each user, you can see:
   - Display name and nationality
   - Email and phone number
   - Visit count and review count
   - Favorite churches and engagement metrics
   - Account status (Active/Blocked)
   - Rating statistics

### 5. **User Details Modal**
   Click the eye icon to view comprehensive user details:
   - **Basic Information**: Name, email, nationality, phone, location, parish
   - **Activity Statistics**:
     - Total visits, reviews, favorites
     - Planned visits, journal entries
     - Average rating
   - **Account Information**:
     - Join date, last login, last visit, last review
   - **Block Information** (if blocked):
     - Block reason, blocked date, blocker info

### 6. **User Management Actions**
   - **Block User**:
     - Click the ban icon
     - Provide a reason (minimum 10 characters)
     - Confirmation required
   - **Unblock User**:
     - Click the user check icon
     - Confirmation required

## Technical Implementation

### Files Created

1. **`src/lib/validations/publicUser.ts`**
   - Type definitions and validation schemas
   - PublicUser, PublicUserWithStats types
   - Filter and update schemas

2. **`src/services/publicUserService.ts`**
   - Firebase Firestore integration
   - Functions:
     - `getPublicUsers()` - Fetch with filters
     - `getPublicUserById()` - Get single user
     - `blockPublicUser()` - Block a user
     - `unblockPublicUser()` - Unblock a user
     - `getPublicUserSummaryStats()` - Get statistics

3. **`src/components/PublicUserManagement.tsx`**
   - Main UI component
   - User list, search, filters
   - User details modal
   - Block/unblock modals

4. **`src/pages/UserManagementPage.tsx`** (Updated)
   - Added tabs for Admin Users and Public Users
   - Tab navigation
   - Access control

### Firestore Collections Used

1. **`users`** collection:
   - Filter: `accountType == 'public'`
   - Fields: displayName, email, nationality, visitedChurches, etc.

2. **`church_visited`** collection:
   - Used for calculating visit statistics
   - Fields: pub_user_id, church_id, visit_date, etc.

3. **`feedback`** collection:
   - Used for review statistics
   - Fields: pub_user_id, rating, comment, etc.

### Security Rules Updated

The Firestore rules have been updated to allow:
- Chancery office can read ALL public users (regardless of diocese)
- Chancery office can update public users (for blocking/unblocking)
- Restricted to specific fields: `isBlocked`, `blockReason`, `blockedAt`, `blockedBy`, `isActive`, `lastUpdatedAt`

**Rules Location**: `admin-dashboard/firestore.rules`

## How to Access

1. Log in as a Chancery Office user
2. Navigate to "User Management" from the sidebar
3. Click on the "Public Users" tab
4. View, search, and manage public users

## Data Sources

### Mobile App Integration
Public users are created when users:
1. Register via the mobile app (Flutter app)
2. Sign in with email/password
3. Profile is automatically created in Firestore

### User Data Flow
```
Mobile App → Firebase Auth → Firestore users collection
                               ↓
                          accountType: 'public'
                               ↓
                      Admin Dashboard reads data
```

### Activity Tracking
- **Visits**: Logged when user physically visits a church (GPS validated)
- **Reviews**: Submitted through mobile app feedback system
- **Favorites**: Churches marked as favorites in mobile app
- **Journal Entries**: Personal reflections written in mobile app

## Testing

### To test the feature:

1. **Start the admin dashboard**:
   ```bash
   cd admin-dashboard
   npm run dev
   ```

2. **Log in as Chancery Office**:
   - Email: `dioceseoftagbilaran@gmail.com` (Tagbilaran)
   - Email: `talibonchancery@gmail.com` (Talibon)
   - (Use the password configured in Firebase Authentication)

3. **Navigate to User Management**:
   - Click "User Management" in the sidebar
   - Click "Public Users" tab

4. **Test Features**:
   - Search for users
   - Filter by status
   - View user details
   - Block/unblock users (if needed for testing)

## Future Enhancements

Potential improvements:
1. Export user data to CSV/Excel
2. Bulk operations (block multiple users)
3. User activity timeline
4. Email notifications to users
5. Advanced filters (by location, registration date range)
6. User engagement charts and graphs
7. Diocese-specific filtering option

## Troubleshooting

### No users showing up?
- Check if mobile app users have `accountType: 'public'` field
- Verify Firestore rules have been deployed
- Check Firebase Console → Firestore → users collection

### Permission denied errors?
- Ensure you're logged in as chancery_office role
- Verify Firestore rules are deployed: `firebase deploy --only firestore:rules`
- Check browser console for detailed error messages

### Statistics not accurate?
- Verify `church_visited` and `feedback` collections exist
- Check that documents have correct field names:
  - `pub_user_id` (not `userId`)
  - `church_id`
  - `rating`, `visit_date`, etc.

## Support

For issues or questions:
1. Check browser console for errors
2. Review Firebase Console → Firestore logs
3. Verify authentication and permissions
4. Check that collections and fields match expected schema

## Notes

- Public users cannot be deleted, only blocked
- Blocking prevents user from certain actions in mobile app
- All actions are logged with timestamps and admin IDs
- Diocese restrictions don't apply to public users (they're global)
- Statistics are calculated in real-time from related collections
