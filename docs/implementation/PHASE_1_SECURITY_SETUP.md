# 🔒 VISITA Security Setup - Phase 1

## ⚠️ CRITICAL: Execute These Steps Immediately

This guide walks you through securing your Firebase configuration and removing sensitive data from version control.

---

## Step 1: Remove Sensitive Files from Git (10 minutes)

### Current Status:
- ✅ `.gitignore` is properly configured
- ❌ `google-services.json` is currently tracked in git
- ⚠️ Need to verify other sensitive files

### Execute These Commands:

```powershell
# Navigate to project root
cd C:\Users\Kejay\OneDrive\Desktop\visita-system

# Check which sensitive files are currently tracked
git ls-files | Select-String -Pattern "(\.env$|firebase_options\.dart$|google-services\.json$|GoogleService-Info\.plist$)"

# Remove tracked sensitive files (safe - keeps local copies)
git rm --cached mobile-app/android/app/google-services.json
git rm --cached admin-dashboard/.env -ErrorAction SilentlyContinue
git rm --cached mobile-app/lib/firebase_options.dart -ErrorAction SilentlyContinue
git rm --cached mobile-app/ios/GoogleService-Info.plist -ErrorAction SilentlyContinue

# Verify removal
git status

# Commit the changes
git add .gitignore
git commit -m "🔒 Security: Remove sensitive Firebase config files from version control"
```

### ✅ Verification:
```powershell
# These commands should return empty results:
git ls-files | Select-String -Pattern "google-services.json"
git ls-files | Select-String -Pattern "firebase_options.dart"
git ls-files | Select-String -Pattern "\.env$"
```

---

## Step 2: Secure Firebase API Keys (15 minutes)

### 🔑 Your Firebase Project API Keys:

Based on your `SECURITY_ALERT_FIREBASE.md`, these are your API keys:

1. **Web API Key**: `AIzaSyDCbl4Zr7nco51NJ7fRafyBOh23-2qtOD4`
2. **Android API Key**: `AIzaSyAfenR2dQXnheuPWB2ED0kUNaBEyjsWjAE`
3. **iOS API Key**: `AIzaSyD1bvuDlhVeoHCopVepdgx8huYw48Urr40`

### 🛠️ Restrict API Keys in Google Cloud Console:

#### A. Web API Key Restriction:

1. **Open Google Cloud Console**: https://console.cloud.google.com/apis/credentials
2. **Select Project**: `visitaproject-5cd9f`
3. **Find API Key**: Click on `AIzaSyDCbl4Zr7nco51NJ7fRafyBOh23-2qtOD4`
4. **Click**: "RESTRICT KEY" or "Edit"
5. **Application Restrictions**:
   - Select: "HTTP referrers (web sites)"
   - Add referrers:
     ```
     http://localhost:*/*
     https://localhost:*/*
     http://127.0.0.1:*/*
     https://127.0.0.1:*/*
     https://visitaproject-5cd9f.web.app/*
     https://visitaproject-5cd9f.firebaseapp.com/*
     ```
6. **API Restrictions**:
   - Select: "Restrict key"
   - Enable only:
     - Firebase Authentication API
     - Cloud Firestore API
     - Cloud Storage for Firebase API
7. **Click**: "SAVE"

#### B. Android API Key Restriction:

1. **Find API Key**: `AIzaSyAfenR2dQXnheuPWB2ED0kUNaBEyjsWjAE`
2. **Application Restrictions**:
   - Select: "Android apps"
   - Add app:
     - **Package name**: `com.example.visitaMobile`
     - **SHA-1 fingerprint**: Get from your Android signing certificate
       ```powershell
       # Get SHA-1 from debug keystore:
       cd C:\Users\Kejay\.android
       keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android
       ```
3. **API Restrictions**: Same as Web (Firebase APIs only)
4. **Click**: "SAVE"

#### C. iOS API Key Restriction:

1. **Find API Key**: `AIzaSyD1bvuDlhVeoHCopVepdgx8huYw48Urr40`
2. **Application Restrictions**:
   - Select: "iOS apps"
   - Add app:
     - **Bundle ID**: `com.example.visitaMobile`
3. **API Restrictions**: Same as Web (Firebase APIs only)
4. **Click**: "SAVE"

### ✅ Verification:
Test your app after restrictions:
```powershell
# Mobile app
cd mobile-app
flutter run

# Admin dashboard
cd admin-dashboard
npm run dev
```

---

## Step 3: Enable Firebase Authentication (5 minutes)

### 🔐 Enable Email/Password Authentication:

1. **Open Firebase Console**: https://console.firebase.google.com/project/visitaproject-5cd9f
2. **Navigate**: Authentication → Sign-in method
3. **Enable Email/Password**:
   - Click on "Email/Password"
   - Toggle "Enable"
   - **Do NOT enable** "Email link (passwordless sign-in)" (unless needed)
   - Click "SAVE"
4. **Test Accounts** (Create these for testing):
   - `dioceseoftagbilaran@gmail.com`
   - `talibonchancery@gmail.com`
   - `researcher.heritage@museum.ph`

### ✅ Verification:
```powershell
# Test login in admin dashboard
cd admin-dashboard
npm run dev
# Try logging in with one of the test accounts
```

---

## Step 4: Create Backup Files (2 minutes)

### 📦 Backup Your Sensitive Configuration:

```powershell
# Create secure backup directory (not in git)
mkdir C:\VisitaBackups

# Backup admin dashboard .env
Copy-Item "admin-dashboard\.env" "C:\VisitaBackups\.env.backup" -ErrorAction SilentlyContinue

# Backup Firebase options
Copy-Item "mobile-app\lib\firebase_options.dart" "C:\VisitaBackups\firebase_options.dart.backup" -ErrorAction SilentlyContinue

# Backup google-services.json
Copy-Item "mobile-app\android\app\google-services.json" "C:\VisitaBackups\google-services.json.backup" -ErrorAction SilentlyContinue

# Backup iOS config
Copy-Item "mobile-app\ios\GoogleService-Info.plist" "C:\VisitaBackups\GoogleService-Info.plist.backup" -ErrorAction SilentlyContinue

Write-Host "✅ Backups created at C:\VisitaBackups"
```

---

## Step 5: Update Firebase Security Rules (10 minutes)

### 📜 Deploy Updated Security Rules:

```powershell
# Navigate to admin dashboard
cd admin-dashboard

# Login to Firebase (if not already)
firebase login

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage

# Verify deployment
firebase projects:list
```

### ✅ Verification:
Check Firebase Console → Firestore Database → Rules to confirm deployment.

---

## Step 6: Additional Security Measures (Optional)

### 🔐 Enable Firebase App Check (Recommended):

1. **Firebase Console**: https://console.firebase.google.com/project/visitaproject-5cd9f/appcheck
2. **Register Web App**:
   - Select reCAPTCHA v3
   - Add site key to your web app
3. **Register Mobile Apps**:
   - Android: Use Play Integrity API
   - iOS: Use DeviceCheck/App Attest

### 🚨 Set Up Monitoring:

1. **Firebase Console** → Monitoring
2. Enable alerts for:
   - Authentication failures
   - Unusual API usage
   - Storage quota warnings
   - Firestore read/write spikes

---

## ✅ Phase 1 Completion Checklist

- [ ] **Git Security**
  - [ ] Removed `google-services.json` from git tracking
  - [ ] Verified no `.env` files are tracked
  - [ ] Verified no `firebase_options.dart` is tracked
  - [ ] Committed `.gitignore` changes

- [ ] **API Key Restrictions**
  - [ ] Web API Key restricted
  - [ ] Android API Key restricted
  - [ ] iOS API Key restricted
  - [ ] Tested app functionality after restrictions

- [ ] **Firebase Authentication**
  - [ ] Email/Password authentication enabled
  - [ ] Test accounts created
  - [ ] Login tested in admin dashboard
  - [ ] Login tested in mobile app

- [ ] **Backup & Documentation**
  - [ ] Sensitive files backed up to secure location
  - [ ] Team members notified of changes
  - [ ] Documentation updated

- [ ] **Security Rules**
  - [ ] Firestore rules deployed
  - [ ] Storage rules deployed
  - [ ] Rules tested with different user roles

---

## 🆘 Troubleshooting

### Issue: "App can't connect after API restrictions"
**Solution**: Double-check that you added ALL necessary domains/bundle IDs to the restrictions.

### Issue: "Authentication not working"
**Solution**: Ensure Email/Password provider is enabled in Firebase Console.

### Issue: "Git still tracking sensitive files"
**Solution**: 
```powershell
git rm -r --cached .
git add .
git commit -m "Refresh git index"
```

### Issue: "Can't find API keys in Google Cloud Console"
**Solution**: Make sure you're in the correct project (`visitaproject-5cd9f`).

---

## 📞 Support

If you encounter issues:
1. Check Firebase Console for error messages
2. Review Firebase Auth logs
3. Check browser console for detailed errors
4. Verify `.env` and `firebase_options.dart` have correct values

---

## 🎯 What's Next?

After completing Phase 1, proceed to:
- **Phase 2**: Dependency Updates (`IMPLEMENTATION_CHECKLIST.md`)
- **Phase 3**: Performance Optimization
- **Phase 4**: Testing Implementation
- **Phase 5**: Production Deployment

---

**Last Updated**: October 8, 2025  
**Status**: 🔴 Critical - Execute Immediately
