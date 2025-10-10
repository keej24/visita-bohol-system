# 🔒 SECURITY_SETUP_GUIDE.md

## 🚨 IMMEDIATE ACTIONS REQUIRED

### 1. Firebase API Key Restrictions

#### Web API Key: `AIzaSyDCbl4Zr7nco51NJ7fRafyBOh23-2qtOD4`
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select project: `visitaproject-5cd9f`
3. Find the API key and click "RESTRICT KEY"
4. Set Application restrictions to "HTTP referrers (web sites)"
5. Add these referrers:
   ```
   http://localhost:*/*
   https://localhost:*/*
   http://127.0.0.1:*/*
   https://127.0.0.1:*/*
   https://visitaproject-5cd9f.web.app/*
   https://visitaproject-5cd9f.firebaseapp.com/*
   ```

#### Android API Key: `AIzaSyAfenR2dQXnheuPWB2ED0kUNaBEyjsWjAE`
1. Set Application restrictions to "Android apps"
2. Add package name: `com.example.visitaMobile`
3. Add SHA-1 certificate fingerprint (get from your keystore)

#### iOS API Key: `AIzaSyD1bvuDlhVeoHCopVepdgx8huYw48Urr40`
1. Set Application restrictions to "iOS apps"
2. Add bundle ID: `com.example.visitaMobile`

### 2. Enable Firebase Authentication
1. Go to [Firebase Console](https://console.firebase.google.com/project/visitaproject-5cd9f)
2. Navigate to Authentication → Sign-in method
3. Enable "Email/Password" provider
4. Save changes

### 3. Secure Git Repository

The following files contain sensitive information and should not be in version control:

```bash
# Remove sensitive files from git tracking
git rm --cached admin-dashboard/.env
git rm --cached mobile-app/lib/firebase_options.dart
git rm --cached mobile-app/android/app/google-services.json

# Update .gitignore
echo "# Firebase Configuration Files" >> .gitignore
echo "admin-dashboard/.env" >> .gitignore
echo "mobile-app/lib/firebase_options.dart" >> .gitignore
echo "mobile-app/android/app/google-services.json" >> .gitignore
echo "mobile-app/ios/GoogleService-Info.plist" >> .gitignore
```

### 4. Firestore Security Rules

Update your Firestore rules with enhanced security:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User documents - only owner can access
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Church data - authenticated read, admin write
    match /churches/{churchId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'chancery'];
    }
    
    // Announcements - authenticated read, admin write
    match /announcements/{announcementId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'chancery'];
    }
  }
}
```

## ✅ Verification Checklist

- [ ] All API keys restricted in Google Cloud Console
- [ ] Email/Password authentication enabled in Firebase
- [ ] Sensitive files removed from git tracking
- [ ] .gitignore updated with security patterns
- [ ] Firestore security rules updated
- [ ] Test user registration and login functionality

## 🚨 NEVER COMMIT THESE FILES:
- `mobile-app/lib/firebase_options.dart`
- `admin-dashboard/.env`
- `mobile-app/android/app/google-services.json`
- `mobile-app/ios/GoogleService-Info.plist`

## 📞 Need Help?
If you encounter issues:
1. Check Firebase Console for authentication status
2. Verify API key restrictions in Google Cloud Console
3. Test authentication with a new user registration
4. Monitor browser console for Firebase errors