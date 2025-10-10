# 🐛 ANNOUNCEMENT CREATION DEBUG GUIDE

## Common Causes of "Failed to create announcement" Error

### 1. **Authentication & Permissions Issues** ⚠️

#### Check User Role:
```javascript
// Open browser console on announcements page and run:
console.log('User Profile:', JSON.stringify(userProfile, null, 2));
```

**Expected Output:**
```json
{
  "uid": "user123",
  "email": "chancery@tagbilaran.diocese",
  "role": "chancery_office",  // ✅ Must be "chancery_office"
  "diocese": "tagbilaran",   // ✅ Must be "tagbilaran" or "talibon"
  "name": "Chancery User"
}
```

#### Firestore Rules Check:
- User MUST have `role: "chancery_office"`
- User MUST have matching `diocese` field
- Document being created MUST have `diocese` matching user's diocese

### 2. **Form Validation Issues** ⚠️

#### Required Fields:
```typescript
// All these fields are REQUIRED:
{
  title: "string (1-200 chars)",      // ✅ Cannot be empty
  description: "string (1-1000 chars)", // ✅ Cannot be empty
  category: "string",                 // ✅ Must be selected from dropdown
  eventDate: "YYYY-MM-DD",           // ✅ Valid date format
  endDate: "YYYY-MM-DD",             // ✅ Valid date format  
  eventTime: "HH:MM",                // ✅ Valid time format
  venue: "string (1-200 chars)",     // ✅ Cannot be empty
  scope: "diocese",                  // ✅ Fixed to "diocese" for chancery
  contactInfo: "string (optional)"   // ⚪ Optional field
}
```

### 3. **Network/Firebase Issues** ⚠️

#### Check Browser Console:
1. Open **Developer Tools** (F12)
2. Go to **Console** tab
3. Try creating announcement
4. Look for error messages

#### Common Console Errors:
```
❌ "Missing or insufficient permissions"
   → User role/diocese mismatch

❌ "Invalid argument: Expected type 'string', but got 'undefined'"
   → Missing required form field

❌ "Network request failed"
   → Internet connectivity issue

❌ "Quota exceeded"
   → Firebase quota limits reached
```

### 4. **Environment Configuration** ⚠️

#### Check Firebase Config:
```bash
# In admin-dashboard directory, check if .env exists:
ls -la .env

# Verify Firebase variables are set:
cat .env | grep VITE_FIREBASE
```

**Expected Variables:**
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

## 🔧 DEBUGGING STEPS

### Step 1: Check User Authentication
```javascript
// Browser console:
import { useAuth } from './contexts/AuthContext';
const { userProfile } = useAuth();
console.log('User Role:', userProfile?.role);
console.log('User Diocese:', userProfile?.diocese);
```

### Step 2: Test Form Data
```javascript
// Add this in AnnouncementForm.tsx handleFormSubmit:
console.log('🔍 Form data before submission:', data);
console.log('🔍 All required fields present:', {
  title: !!data.title,
  description: !!data.description,
  category: !!data.category,
  eventDate: !!data.eventDate,
  endDate: !!data.endDate,
  venue: !!data.venue,
  eventTime: !!data.eventTime
});
```

### Step 3: Check Firestore Rules
```javascript
// Test in Firebase Console:
// Go to Firestore > Rules > Playground
// Simulate: Collection "announcements", Operation "create"
// Use your actual user UID and test data
```

### Step 4: Check Network Tab
1. Open **Developer Tools** (F12)
2. Go to **Network** tab
3. Try creating announcement
4. Look for failed requests to Firestore

## 🚀 QUICK FIXES

### Fix 1: Ensure User Has Correct Role
```sql
-- In Firestore Console, check users collection:
-- Document ID: [your-uid]
-- Verify fields:
{
  "role": "chancery_office",
  "diocese": "tagbilaran" // or "talibon"
}
```

### Fix 2: Test with Minimal Data
```json
{
  "title": "Test Announcement",
  "description": "This is a test",
  "category": "Festival",
  "eventDate": "2024-12-25",
  "endDate": "2024-12-26", 
  "eventTime": "10:00",
  "venue": "Test Venue"
}
```

### Fix 3: Clear Browser Cache
```bash
# Clear browser cache and try again
# Or use incognito/private browsing mode
```

## 📞 IMMEDIATE HELP

If still failing, run this in browser console when on announcements page:

```javascript
// Complete debug information:
console.log('=== ANNOUNCEMENT DEBUG INFO ===');
console.log('User:', JSON.stringify(userProfile, null, 2));
console.log('Firebase Config:', JSON.stringify(firebaseConfig, null, 2));
console.log('Current URL:', window.location.href);
console.log('Auth State:', !!auth.currentUser);
console.log('Firestore DB:', !!db);
console.log('==================================');
```

Send me the output and I can pinpoint the exact issue! 🎯