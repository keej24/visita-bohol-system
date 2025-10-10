# Firebase 400 Error Troubleshooting Guide

## Problem: "Failed to load resource: the server responded with a status of 400 ()"

This error typically occurs when Firebase API calls are being rejected. Here are the most common causes and solutions:

### 1. API Key Restrictions (Most Common)
**Symptom**: 400 errors on Firebase Auth or Firestore API calls
**Cause**: The Firebase API key has HTTP referrer restrictions that don't include your development domain

**Solution**:
1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Select your project: visitaproject-5cd9f
3. Navigate to "APIs & Services" > "Credentials"
4. Find your API key: AIzaSyDCbl4Zr7nco51NJ7fRafyBOh23-2qtOD4
5. Click "Edit" on the API key
6. Under "Application restrictions", make sure either:
   - "None" is selected (for development), OR
   - "HTTP referrers" includes:
     - http://localhost:*
     - http://127.0.0.1:*
     - https://localhost:*
     - Your production domain

### 2. Firebase Project Configuration
**Symptom**: 400 errors on initialization
**Cause**: Incorrect project configuration or disabled APIs

**Solution**:
1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project: visitaproject-5cd9f
3. Go to "Project Settings" > "General"
4. Verify the configuration matches your .env file
5. Check "Authentication" > "Settings" > "Authorized domains"
6. Add localhost and 127.0.0.1 to authorized domains

### 3. CORS Issues
**Symptom**: 400 or CORS errors in browser console
**Cause**: Cross-origin request restrictions

**Solution**: Usually resolved by fixing API key restrictions above

### 4. Firestore Security Rules
**Symptom**: 400 errors when accessing Firestore
**Cause**: User doesn't have permission to read user profile

**Note**: Your security rules look correct, but ensure the user document exists in Firestore

### Quick Test Commands:
Run these in your browser console on localhost:8082 to test:

```javascript
// Test 1: Check if Firebase project is accessible
fetch('https://visitaproject-5cd9f-default-rtdb.firebaseio.com/.json')
  .then(r => console.log('Firebase project test:', r.status))
  .catch(e => console.error('Firebase project error:', e));

// Test 2: Check API key restrictions
fetch('https://identitytoolkit.googleapis.com/v1/projects/visitaproject-5cd9f?key=AIzaSyDCbl4Zr7nco51NJ7fRafyBOh23-2qtOD4')
  .then(r => console.log('API key test:', r.status))
  .catch(e => console.error('API key error:', e));
```

### Immediate Action Required:
1. Check Google Cloud Console API key restrictions
2. Add localhost domains to Firebase authorized domains
3. Verify the API key is not quota-limited or disabled

The error is most likely due to API key domain restrictions in the Google Cloud Console.