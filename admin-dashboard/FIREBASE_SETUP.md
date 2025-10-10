# Firebase Setup Guide

## Issue: Firestore Rules Not Deployed

The error you're seeing indicates that the updated Firestore security rules haven't been deployed to your Firebase project yet.

## Solution Steps:

### 1. Deploy Firestore Rules

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not already done)
firebase init firestore

# Deploy the updated rules
firebase deploy --only firestore:rules
```

### 2. Create Test User Profile

Since the app is trying to fetch a user profile that doesn't exist, you need to create a test user profile in Firestore. You can do this through the Firebase Console:

1. Go to https://console.firebase.google.com/
2. Select your project
3. Go to Firestore Database
4. Create a new collection called `users`
5. Add a document with the authenticated user's UID as the document ID
6. Add the following fields:

```json
{
  "email": "your-test-email@example.com",
  "role": "chancery_office",
  "name": "Test Chancery User",
  "diocese": "tagbilaran",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 3. Alternative: Quick Test Script

I've created a quick test script that you can run to set up the test data:

```bash
cd admin-dashboard
npm run setup-test-data
```

## Updated Firestore Rules

The key fix in the Firestore rules was changing line 46 from:
```
allow read, write: if isOwner(userId);
```

To:
```
allow read, write: if isAuthenticated() && request.auth.uid == userId;
```

This prevents the circular dependency issue where the `getUserData()` function was trying to access the user's own document to check permissions.

## Verification

After deploying the rules and creating the test user profile:

1. Refresh your admin dashboard
2. The error should disappear
3. You should be able to navigate to /announcements and /feedback pages
4. The sidebar should show the proper role-based navigation items

## Troubleshooting

If you still see the error:

1. Check the browser console for detailed error messages
2. Verify the user UID matches the Firestore document ID
3. Ensure the Firebase project ID matches your configuration
4. Check that Authentication is enabled in Firebase Console