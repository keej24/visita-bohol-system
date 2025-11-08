# Review Delete Feature

## Overview
Users can now delete their own reviews/feedback from the mobile app. A delete button appears only on reviews that belong to the currently logged-in user.

## Features Implemented

### 1. User Authentication Integration
**Files Modified**:
- [mobile-app/lib/screens/feedback_submit_screen.dart](mobile-app/lib/screens/feedback_submit_screen.dart)

**Changes**:
- Reviews now save with the actual Firebase Auth user ID
- Previously used hardcoded `'local-user'` string
- Now uses `currentUser?.uid` or generates anonymous ID if not logged in
- Stores user's display name with the review

### 2. Delete Button UI
**Files Modified**:
- [mobile-app/lib/screens/church_detail/tabs/reviews_tab.dart](mobile-app/lib/screens/church_detail/tabs/reviews_tab.dart)

**Changes**:
- Added a red delete icon button to each review card
- Button only appears if `currentUser.uid == review.userId`
- Shows tooltip "Delete review" on hover/long press
- Uses Material Icons `delete_outline` with red color (#EF4444)

### 3. Delete Confirmation Dialog
**Feature**: Professional confirmation dialog before deletion

**Design**:
- Warning icon with amber color
- Clear title: "Delete Review?"
- Descriptive message: "Are you sure you want to delete this review? This action cannot be undone."
- Two actions:
  - **Cancel** (gray text button)
  - **Delete** (red elevated button)

### 4. Delete Operation
**Process**:
1. User taps delete button
2. Confirmation dialog appears
3. If user confirms:
   - Shows loading snackbar: "Deleting review..."
   - Calls `FeedbackService.delete(reviewId)`
   - Deletes from Firestore
   - Reloads the reviews list
   - Shows success snackbar: "Review deleted successfully"
4. If deletion fails:
   - Shows error snackbar with error message

### 5. Visual Feedback
**SnackBars**:
- **Loading**: Gray background with spinner
- **Success**: Green background (#10B981) with checkmark icon
- **Error**: Red background (#EF4444) with error icon
- All use floating behavior with rounded corners

## User Experience Flow

### Viewing Reviews
1. User navigates to church detail → Reviews tab
2. User sees all published reviews
3. On their own reviews, a small red delete icon appears in the top-right

### Deleting a Review
1. User taps the delete icon on their review
2. Confirmation dialog slides up:
   ```
   ⚠️  Delete Review?

   Are you sure you want to delete this review?
   This action cannot be undone.

   [Cancel]  [Delete]
   ```
3. User taps "Delete"
4. Loading indicator shows briefly
5. Review disappears from the list
6. Success message confirms deletion

### Security
- Users can only delete their own reviews
- Delete button doesn't appear on other users' reviews
- Server-side deletion through Firestore (respects security rules)

## Technical Details

### User ID Handling
```dart
// In feedback_submit_screen.dart
final authService = Provider.of<AuthService>(context, listen: false);
final currentUser = authService.currentUser;
final userId = currentUser?.uid ?? 'anonymous-${DateTime.now().millisecondsSinceEpoch}';
final userName = currentUser?.displayName ?? 'Anonymous';
```

### Ownership Check
```dart
// In reviews_tab.dart
final authService = Provider.of<AuthService>(context, listen: false);
final currentUser = authService.currentUser;
final isOwnReview = currentUser != null && currentUser.uid == review.userId;

// Then in UI:
if (isOwnReview)
  IconButton(
    icon: const Icon(Icons.delete_outline),
    onPressed: () => _showDeleteConfirmation(review),
  ),
```

### Delete Flow
```dart
Future<void> _deleteReview(FeedbackModel review) async {
  // 1. Show loading snackbar
  // 2. Delete from Firestore
  await _feedbackService.delete(review.id);
  // 3. Reload reviews
  await _loadReviews();
  // 4. Show success snackbar
}
```

## Testing

### Manual Testing Steps

1. **Test as Logged-in User**:
   ```bash
   cd mobile-app
   flutter run
   ```
   - Log in with a test account
   - Navigate to any church
   - Submit a new review
   - Verify delete button appears on your review
   - Tap delete and confirm
   - Verify review is removed

2. **Test Ownership Check**:
   - View reviews from other users
   - Verify NO delete button appears on their reviews
   - Verify delete button only on your own reviews

3. **Test Confirmation Dialog**:
   - Tap delete on your review
   - Verify dialog appears with correct text
   - Tap "Cancel" - verify nothing happens
   - Tap delete again, then "Delete" - verify review deleted

4. **Test Anonymous Users**:
   - Log out
   - Submit a review while not logged in
   - Verify userId is `anonymous-{timestamp}`
   - Future sessions won't show delete button (different anonymous ID)

### Edge Cases Handled

- ✅ User not logged in (uses anonymous ID)
- ✅ Network errors (shows error snackbar)
- ✅ Review already deleted (handled by Firestore)
- ✅ Widget disposed during operation (checks `mounted`)
- ✅ Multiple rapid taps (dialog prevents duplicate operations)

## Firebase Security Rules

Ensure your `storage.rules` allows users to delete their own feedback:

```javascript
// In firestore.rules
match /feedback/{feedbackId} {
  // Allow users to read published feedback
  allow read: if resource.data.status == 'published';

  // Allow users to create feedback
  allow create: if request.auth != null;

  // Allow users to delete their own feedback
  allow delete: if request.auth != null &&
                   resource.data.userId == request.auth.uid;
}
```

## Files Modified

1. ✅ [mobile-app/lib/screens/feedback_submit_screen.dart](mobile-app/lib/screens/feedback_submit_screen.dart)
   - Added Provider import
   - Updated to use Firebase Auth user ID
   - Fixed async context warnings

2. ✅ [mobile-app/lib/screens/church_detail/tabs/reviews_tab.dart](mobile-app/lib/screens/church_detail/tabs/reviews_tab.dart)
   - Added Provider and AuthService imports
   - Added `_showDeleteConfirmation()` method
   - Added `_deleteReview()` method
   - Added delete button to review cards with ownership check
   - Added visual feedback with snackbars

3. ✅ [mobile-app/lib/services/feedback_service.dart](mobile-app/lib/services/feedback_service.dart)
   - Already had `delete()` method (no changes needed)

4. ✅ [admin-dashboard/firestore.rules](admin-dashboard/firestore.rules)
   - Added delete permission for users to delete their own feedback
   - Added delete permission for chancery office to moderate
   - **DEPLOYED** to production

## Screenshots

### Delete Button
```
┌─────────────────────────────────────┐
│  👤 John Doe                    🗑️  │
│  ⭐⭐⭐⭐⭐  2 days ago              │
│                                     │
│  Great church! Beautiful...         │
└─────────────────────────────────────┘
```

### Confirmation Dialog
```
┌─────────────────────────────────────┐
│  ⚠️  Delete Review?                 │
│                                     │
│  Are you sure you want to delete    │
│  this review? This action cannot    │
│  be undone.                         │
│                                     │
│         [Cancel]  [Delete]          │
└─────────────────────────────────────┘
```

## Future Enhancements

Potential improvements for future versions:

1. **Edit Review**: Allow users to edit their reviews instead of just deleting
2. **Delete Reason**: Optional reason field when deleting
3. **Soft Delete**: Mark as deleted instead of permanent removal
4. **Admin Moderation**: Allow admins to delete inappropriate reviews
5. **Bulk Delete**: Delete multiple reviews at once
6. **Restore**: Undo deletion within a time window

## Notes

- Delete operation is **permanent** - cannot be undone
- Review images in Firebase Storage are NOT automatically deleted
- Consider adding Cloud Functions to clean up orphaned images
- The feature respects Firebase security rules
- Anonymous users get unique IDs per session, so they can't delete reviews from previous sessions

## Support

If you encounter issues:
1. Check Firebase Auth is properly configured
2. Verify user is logged in
3. Check console logs for error messages
4. Ensure Firestore security rules allow deletion
