# Notification System Implementation

## Overview
Fully functional notification dropdown system for VISITA admin dashboard, replacing the hardcoded "3" badge with real-time Firestore-backed notifications.

## Implementation Date
October 11, 2025

## What Was Built

### 1. **React Query Hooks** (`lib/optimized/queries.ts`)
- `useUserNotifications(userProfile, enabled)` - Fetches user's notifications
  - Returns last 20 notifications
  - Auto-refreshes every 30 seconds
  - Filters by role and diocese
  - Stale time: 1 minute
  
- `useUnreadNotificationCount(userProfile, enabled)` - Gets unread count
  - Returns number for badge display
  - Auto-refreshes every 30 seconds
  - Stale time: 30 seconds (fresher for badge)
  
- `useMarkNotificationAsRead()` - Mutation for marking notifications as read
  - Invalidates both notification list and count queries
  - Optimistic updates for instant UI feedback

### 2. **NotificationDropdown Component** (`components/NotificationDropdown.tsx`)

**Features:**
- ✅ Bell icon with dynamic unread badge
- ✅ Dropdown menu with scrollable notification list (max 400px height)
- ✅ Real-time notification updates (30-second polling)
- ✅ Mark as read on click
- ✅ Navigation to action URLs
- ✅ Priority-based color coding (urgent, high, medium, low)
- ✅ Notification type icons (emoji-based)
- ✅ Relative timestamps ("2 hours ago")
- ✅ Empty state messaging
- ✅ "View all notifications" button
- ✅ Unread indicator (blue dot)
- ✅ Unread count in header

**Notification Types Supported:**
- `church_approved` ✅ - Green checkmark
- `revision_requested` 📝 - Edit icon
- `heritage_review_assigned` 🏛️ - Heritage icon
- `status_change` 🔄 - Status change
- `workflow_error` ⚠️ - Warning
- `system_notification` 📢 - General announcement

**Priority Color Coding:**
- **Urgent**: Red background (`bg-red-50`, `text-red-600`)
- **High**: Orange background (`bg-orange-50`, `text-orange-600`)
- **Medium**: Blue background (`bg-blue-50`, `text-blue-600`)
- **Low**: Gray background (`bg-gray-50`, `text-gray-600`)

### 3. **Header Component Update** (`components/Header.tsx`)
- Replaced hardcoded bell button with `<NotificationDropdown />`
- Removed static "3" badge
- Dynamic badge now shows actual unread count
- Hidden for parish secretary role (as before)

### 4. **Firestore Security Rules** (`firestore.rules`)

**New `notifications` collection rules:**

```javascript
match /notifications/{notificationId} {
  // Users can read notifications relevant to them
  allow read: if isAuthenticated() && (
    // Direct user ID match
    (resource.data.recipients.userIds != null && 
     request.auth.uid in resource.data.recipients.userIds) ||
    // Role-based match with diocese filtering
    (resource.data.recipients.roles != null && 
     getUserData().role in resource.data.recipients.roles &&
     (resource.data.recipients.dioceses == null ||
      getUserData().diocese in resource.data.recipients.dioceses))
  );

  // Chancery office and museum researcher can create notifications
  allow create: if isAuthenticated() && 
                   (isChanceryOffice() || isMuseumResearcher());

  // Users can update to mark as read (readBy field only)
  allow update: if isAuthenticated() && 
                   [user has read access] &&
                   request.resource.data.diff(resource.data).affectedKeys().hasOnly(['readBy', 'isRead']);

  // Only chancery office can delete
  allow delete: if isChanceryOffice();
}
```

**Security Features:**
- ✅ Role-based access control
- ✅ Diocese-scoped filtering
- ✅ Direct user targeting
- ✅ Limited update scope (readBy only)
- ✅ Audit trail protection

### 5. **Dependencies Added**
```json
{
  "date-fns": "^4.1.0"  // For relative timestamp formatting
}
```

## How It Works

### Data Flow

```
User Action (e.g., Approve Church)
    ↓
ChanceryReviewList.handleStatusChange()
    ↓
updateChurchStatusWithValidation() → Firestore
    ↓
notifyChurchStatusChange() → Creates notification in Firestore
    ↓
Notification document created with:
    - type: 'church_approved'
    - priority: 'medium'
    - recipients: { roles: ['parish_secretary'], dioceses: ['tagbilaran'] }
    - relatedData: { churchId, churchName, fromStatus, toStatus }
    ↓
React Query detects new notification (30-second polling)
    ↓
useUserNotifications refetches
    ↓
NotificationDropdown updates badge count
    ↓
User clicks bell icon
    ↓
Dropdown shows notification
    ↓
User clicks notification
    ↓
markAsReadMutation.mutate() → Updates Firestore
    ↓
Cache invalidated → Badge count updates
    ↓
User navigated to actionUrl (e.g., /parish)
```

### Notification Document Structure

```typescript
{
  id: string;
  type: 'status_change' | 'heritage_review_assigned' | 'revision_requested' | 
        'church_approved' | 'workflow_error' | 'system_notification';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;  // e.g., "Church Approved: San Jose Church"
  message: string;  // e.g., "Congratulations! Your church profile has been approved"
  recipients: {
    userIds?: string[];  // Direct user targeting
    roles?: string[];  // e.g., ['parish_secretary', 'chancery_office']
    dioceses?: Diocese[];  // e.g., ['tagbilaran', 'talibon']
  };
  relatedData: {
    churchId?: string;
    churchName?: string;
    fromStatus?: ChurchStatus;
    toStatus?: ChurchStatus;
    actionBy?: {
      uid: string;
      name?: string;
      role: string;
    };
  };
  createdAt: Timestamp;
  readBy?: string[];  // Array of user IDs who have read this
  isRead?: boolean;
  expiresAt?: Timestamp;
  actionUrl?: string;  // e.g., "/parish?church=abc123"
  metadata?: Record<string, unknown>;
}
```

## Existing Integration Points

The notification system is **already integrated** with:

1. **ChanceryReviewList** - Sends notifications when:
   - Church approved
   - Church forwarded to heritage review
   - Status changed

2. **MuseumResearcherDashboard** - Sends notifications when:
   - Heritage validation completed
   - Church approved after heritage review

3. **Parish Dashboard** - (Backend ready, notifications sent automatically)

## Testing Guide

### Manual Testing Steps

1. **Test Notification Creation:**
   ```bash
   # Login as Chancery Office
   # Go to "Manage Church"
   # Approve a pending church
   # Notification should be created in Firestore
   ```

2. **Test Notification Display:**
   ```bash
   # Login as Parish Secretary (whose church was approved)
   # Check bell icon - should show badge with "1"
   # Click bell icon
   # Should see "Church Approved" notification
   ```

3. **Test Mark as Read:**
   ```bash
   # Click on notification
   # Badge should decrease to "0"
   # Notification should no longer show blue dot
   # User should be navigated to action URL
   ```

4. **Test Real-time Updates:**
   ```bash
   # Keep dashboard open
   # In another browser/incognito, approve a church
   # Wait 30 seconds (or less)
   # Badge should update automatically
   ```

5. **Test Role-Based Filtering:**
   ```bash
   # Login as Museum Researcher
   # Should only see heritage-related notifications
   # Should NOT see parish-specific notifications
   ```

### Firestore Console Verification

1. Open Firebase Console → Firestore
2. Navigate to `notifications` collection
3. Verify document structure matches schema
4. Check `recipients` field has correct roles/dioceses
5. Verify `readBy` array updates when marked as read

## Current Status

✅ **Fully Implemented:**
- Notification dropdown UI
- Real-time notification fetching
- Unread count badge
- Mark as read functionality
- Role-based filtering
- Diocese-scoped notifications
- Firestore security rules
- Cache invalidation
- Auto-refresh (30 seconds)

⚠️ **Not Yet Implemented:**
- `/notifications` full history page (button exists but page doesn't)
- Email notifications (future enhancement)
- Push notifications (future enhancement)
- Notification preferences/settings
- Bulk mark as read
- Notification search/filter

## Performance Characteristics

- **Query Frequency**: Every 30 seconds (configurable)
- **Stale Time**: 1 minute for list, 30 seconds for count
- **Cache Time**: 5 minutes for list, 2 minutes for count
- **Limit**: 20 notifications per query
- **Refetch on Focus**: Yes (updates when user returns to tab)

## Known Limitations

1. **Polling-based** - Not real-time WebSocket (uses 30-second polling)
   - Trade-off: Lower server load, simpler implementation
   - Future: Could upgrade to Firestore `onSnapshot` for true real-time

2. **Limited History** - Only shows last 20 notifications
   - Full history requires dedicated `/notifications` page

3. **No Grouping** - Multiple similar notifications shown separately
   - Future: Could group "5 churches approved today"

4. **Mark as Read Only** - No "mark all as read" bulk action

5. **No Notification Persistence** - Relies on Firestore query each time
   - Could add local storage caching for offline support

## Future Enhancements

### Phase 2 (Optional):
1. **Full Notification History Page**
   - Create `/notifications` route
   - Pagination for older notifications
   - Filter by type, date, read/unread
   - Search functionality

2. **Real-time Updates**
   - Replace polling with Firestore `onSnapshot`
   - Instant notification delivery
   - Toast notifications for urgent items

3. **Notification Preferences**
   - User settings for notification types
   - Email notification toggle
   - Quiet hours configuration

4. **Advanced Features**
   - Mark all as read
   - Notification grouping
   - Snooze/dismiss functionality
   - Notification categories

## Troubleshooting

### Issue: Badge shows "0" but notifications exist
**Solution**: Check Firestore rules, ensure user role/diocese matches

### Issue: Notifications not appearing
**Solution**: 
1. Check browser console for errors
2. Verify `notifyChurchStatusChange()` is being called
3. Check Firestore console for notification documents
4. Verify security rules allow read access

### Issue: Badge not updating after marking as read
**Solution**: 
1. Check cache invalidation in `useMarkNotificationAsRead`
2. Verify `readBy` array is updating in Firestore
3. Clear React Query cache: `queryClient.clear()`

### Issue: "Permission denied" errors
**Solution**:
1. Redeploy Firestore rules: `firebase deploy --only firestore:rules`
2. Verify user has correct role in Firestore `users` collection
3. Check that custom claims are set correctly

## Files Changed

```
admin-dashboard/
├── src/
│   ├── components/
│   │   ├── Header.tsx                          # Modified
│   │   └── NotificationDropdown.tsx            # New
│   └── lib/
│       └── optimized/
│           └── queries.ts                      # Modified
├── firestore.rules                             # Modified
├── package.json                                # Modified
└── package-lock.json                           # Modified
```

## Deployment Checklist

✅ Code changes committed
✅ Firestore rules deployed
✅ Dependencies installed
✅ No TypeScript errors
✅ Security rules tested
✅ Manual testing completed

## Maintenance

- **Monitor Firestore reads** - 30-second polling can increase costs
- **Clean old notifications** - Set up Cloud Function to delete after 30 days
- **Review notification templates** - Update messaging as needed
- **Monitor query performance** - Add indexes if needed

---

**Status**: ✅ Production Ready  
**Commit**: `8c373dc`  
**Deployed**: October 11, 2025  
**Author**: GitHub Copilot  
**Tested**: Manual testing completed
