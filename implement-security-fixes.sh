#!/bin/bash
# 🚨 VISITA Security Fix Script - Phase 1 Implementation
# Execute this script to implement critical security fixes

echo "🚨 VISITA Mobile App - Security Fix Implementation"
echo "=================================================="

# Check if we're in the right directory
if [[ ! -f "mobile-app/pubspec.yaml" ]]; then
    echo "❌ Error: Please run this script from the visita-system root directory"
    exit 1
fi

echo "📍 Current directory: $(pwd)"
echo ""

# Phase 1A: Secure Git Repository
echo "🔒 Phase 1A: Securing Git Repository"
echo "-------------------------------------"

# Remove sensitive files from git tracking
echo "📝 Removing sensitive files from git tracking..."

# Check if files exist before trying to remove them
if git ls-files --error-unmatch admin-dashboard/.env >/dev/null 2>&1; then
    git rm --cached admin-dashboard/.env
    echo "✅ Removed admin-dashboard/.env from git tracking"
else
    echo "ℹ️  admin-dashboard/.env not tracked in git"
fi

if git ls-files --error-unmatch mobile-app/android/app/google-services.json >/dev/null 2>&1; then
    git rm --cached mobile-app/android/app/google-services.json
    echo "✅ Removed mobile-app/android/app/google-services.json from git tracking"
else
    echo "ℹ️  google-services.json not tracked in git"
fi

# Create backup of sensitive files
echo "💾 Creating backup of sensitive files..."
if [[ -f "mobile-app/lib/firebase_options.dart" ]]; then
    cp mobile-app/lib/firebase_options.dart mobile-app/lib/firebase_options.backup.dart
    echo "✅ Backed up firebase_options.dart"
fi

if [[ -f "admin-dashboard/.env" ]]; then
    cp admin-dashboard/.env admin-dashboard/.env.backup
    echo "✅ Backed up admin-dashboard/.env"
fi

# Update .gitignore
echo "📝 Updating .gitignore..."
cat >> .gitignore << EOF

# 🔒 VISITA Security - Sensitive Firebase Configuration
mobile-app/lib/firebase_options.dart
mobile-app/android/app/google-services.json
mobile-app/ios/GoogleService-Info.plist
admin-dashboard/.env
admin-dashboard/.env.local
admin-dashboard/.env.production

# 💾 Backup files
*.backup
*.backup.*

# 🔑 API Keys and Secrets
*.key
*.pem
*.p12
*-key.json
EOF

echo "✅ Updated .gitignore with security patterns"

# Phase 1B: Create Secure Templates
echo ""
echo "📋 Phase 1B: Creating Secure Configuration Templates"
echo "----------------------------------------------------"

# Create firebase_options.example.dart
cat > mobile-app/lib/firebase_options.example.dart << 'EOF'
// Example Firebase configuration file
// Copy this to firebase_options.dart and replace with your actual values
// NEVER commit firebase_options.dart to version control

import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        return macos;
      case TargetPlatform.windows:
        return windows;
      case TargetPlatform.linux:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for linux',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'YOUR_WEB_API_KEY_HERE',
    appId: 'YOUR_WEB_APP_ID_HERE',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID_HERE',
    projectId: 'YOUR_PROJECT_ID_HERE',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    databaseURL: 'https://YOUR_PROJECT_ID-default-rtdb.REGION.firebasedatabase.app',
    storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
    measurementId: 'G-XXXXXXXXXX',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'YOUR_ANDROID_API_KEY_HERE',
    appId: 'YOUR_ANDROID_APP_ID_HERE',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID_HERE',
    projectId: 'YOUR_PROJECT_ID_HERE',
    databaseURL: 'https://YOUR_PROJECT_ID-default-rtdb.REGION.firebasedatabase.app',
    storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'YOUR_IOS_API_KEY_HERE',
    appId: 'YOUR_IOS_APP_ID_HERE',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID_HERE',
    projectId: 'YOUR_PROJECT_ID_HERE',
    databaseURL: 'https://YOUR_PROJECT_ID-default-rtdb.REGION.firebasedatabase.app',
    storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
    iosBundleId: 'com.example.visitaMobile',
  );

  static const FirebaseOptions macos = FirebaseOptions(
    apiKey: 'YOUR_MACOS_API_KEY_HERE',
    appId: 'YOUR_MACOS_APP_ID_HERE',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID_HERE',
    projectId: 'YOUR_PROJECT_ID_HERE',
    storageBucket: 'YOUR_PROJECT_ID.appspot.com',
    iosBundleId: 'com.example.visitaMobile',
  );

  static const FirebaseOptions windows = FirebaseOptions(
    apiKey: 'YOUR_WINDOWS_API_KEY_HERE',
    appId: 'YOUR_WINDOWS_APP_ID_HERE',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID_HERE',
    projectId: 'YOUR_PROJECT_ID_HERE',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    databaseURL: 'https://YOUR_PROJECT_ID-default-rtdb.REGION.firebasedatabase.app',
    storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
    measurementId: 'G-XXXXXXXXXX',
  );
}
EOF

echo "✅ Created firebase_options.example.dart template"

# Create admin dashboard .env.example
if [[ ! -f "admin-dashboard/.env.example" ]]; then
    cat > admin-dashboard/.env.example << 'EOF'
# VISITA Admin Dashboard - Environment Configuration Template
# Copy this to .env and replace with your actual values
# NEVER commit .env files to version control

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here

# Application Configuration
VITE_APP_NAME=VISITA Admin Dashboard
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=development

# Development Settings
VITE_DEBUG_MODE=true
VITE_ENABLE_LOGGING=true
EOF
    echo "✅ Created admin-dashboard/.env.example template"
fi

# Phase 1C: Security Documentation
echo ""
echo "📚 Phase 1C: Creating Security Documentation"
echo "---------------------------------------------"

cat > SECURITY_SETUP_GUIDE.md << 'EOF'
# 🔒 VISITA Security Setup Guide

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

### 3. Configuration Files Setup

#### Mobile App:
```bash
cd mobile-app/lib
cp firebase_options.example.dart firebase_options.dart
# Edit firebase_options.dart with your actual values
```

#### Admin Dashboard:
```bash
cd admin-dashboard
cp .env.example .env
# Edit .env with your actual values
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
- [ ] firebase_options.dart configured with actual values
- [ ] admin-dashboard/.env configured with actual values
- [ ] Firestore security rules updated
- [ ] Sensitive files removed from git tracking
- [ ] .gitignore updated with security patterns

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
EOF

echo "✅ Created SECURITY_SETUP_GUIDE.md"

# Phase 1D: Commit Security Changes
echo ""
echo "📝 Phase 1D: Committing Security Improvements"
echo "----------------------------------------------"

git add .gitignore
git add mobile-app/lib/firebase_options.example.dart
git add admin-dashboard/.env.example
git add SECURITY_SETUP_GUIDE.md

echo "🎯 Ready to commit security changes!"
echo ""
echo "📋 Next Steps:"
echo "1. Review the changes: git status"
echo "2. Commit changes: git commit -m '🔒 Security: Implement Phase 1 security fixes'"
echo "3. Follow SECURITY_SETUP_GUIDE.md to configure your environment"
echo "4. Test authentication: flutter run (mobile-app) or npm run dev (admin-dashboard)"
echo ""
echo "🚨 CRITICAL: Complete the API key restrictions in Google Cloud Console before deploying!"
echo ""
echo "✅ Security fix script completed successfully!"