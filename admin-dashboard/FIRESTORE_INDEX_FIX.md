# Firestore Index Fix for Feedback Queries

## Problem
The mobile app queries feedback with:
```dart
.where('church_id', isEqualTo: churchId)
.where('status', isEqualTo: 'published')
.orderBy('date_submitted', descending: true)
```

This requires a **composite index** that doesn't exist yet.

## Solution

Add this index to `firestore.indexes.json` (after line 84):

```json
{
  "collectionGroup": "feedback",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "church_id",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "status",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "date_submitted",
      "order": "DESCENDING"
    }
  ]
},
```

## Deploy the Index

After adding the index to `firestore.indexes.json`, deploy it:

```bash
cd admin-dashboard
firebase deploy --only firestore:indexes
```

This will create the required composite index in Firestore.

## Alternative: Create Index via Firebase Console

If you prefer, you can also create the index through the Firebase Console:

1. Go to Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. Collection ID: `feedback`
4. Add fields:
   - `church_id` (Ascending)
   - `status` (Ascending)
   - `date_submitted` (Descending)
5. Query scope: Collection
6. Click "Create"

## Verification

After deploying, the mobile app should be able to query feedback without the 400 error.

Check the Flutter console for:
```
✅ [FEEDBACK SERVICE] Successfully loaded X feedback items
```
