# 🔑 How to Restrict Firebase API Keys - Step-by-Step Guide

## 📋 Overview

You need to restrict **3 API keys** for the VISITA project to prevent unauthorized use:
1. **Web API Key** - For admin dashboard
2. **Android API Key** - For mobile app (Android)
3. **iOS API Key** - For mobile app (iOS)

**Time Required**: 15-20 minutes  
**Skill Level**: Beginner-friendly

---

## 🎯 Your API Keys

```
Web:     AIzaSyDCbl4Zr7nco51NJ7fRafyBOh23-2qtOD4
Android: AIzaSyAfenR2dQXnheuPWB2ED0kUNaBEyjsWjAE
iOS:     AIzaSyD1bvuDlhVeoHCopVepdgx8huYw48Urr40
```

---

## 🌐 Step 1: Restrict Web API Key (5 minutes)

### A. Open Google Cloud Console

1. **Click this link**: https://console.cloud.google.com/apis/credentials?project=visitaproject-5cd9f
2. You'll see a page titled **"APIs & Services"** → **"Credentials"**

### B. Find Your Web API Key

1. Look for the **"API Keys"** section on the page
2. Find the key that starts with `AIzaSyDCbl4...` (your web key)
3. Click on the **key name** or the **pencil icon** (✏️) to edit it

### C. Restrict the Key

You'll see a form with several options. Follow these steps:

#### **1. Application Restrictions**
- Find the section labeled **"Application restrictions"**
- Select **"HTTP referrers (web sites)"** (click the radio button)
- A text box will appear

#### **2. Add Allowed Referrers**
Click **"ADD AN ITEM"** and add these URLs **one by one**:

```
http://localhost:*/*
https://localhost:*/*
http://127.0.0.1:*/*
https://127.0.0.1:*/*
https://visitaproject-5cd9f.web.app/*
https://visitaproject-5cd9f.firebaseapp.com/*
```

**Visual Guide**:
```
┌─────────────────────────────────────────┐
│ Website restrictions                     │
├─────────────────────────────────────────┤
│ ✓ http://localhost:*/*                  │
│ ✓ https://localhost:*/*                 │
│ ✓ http://127.0.0.1:*/*                  │
│ ✓ https://127.0.0.1:*/*                 │
│ ✓ https://visitaproject-5cd9f.web.app/* │
│ ✓ https://visitaproject-5cd9f...        │
│ [+ ADD AN ITEM]                          │
└─────────────────────────────────────────┘
```

#### **3. API Restrictions**
- Scroll down to **"API restrictions"**
- Select **"Restrict key"** (click the radio button)
- Click **"Select APIs"** dropdown
- Check these APIs:
  - ✅ **Cloud Firestore API**
  - ✅ **Firebase Authentication API**  
  - ✅ **Cloud Storage for Firebase API**
  - ✅ **Identity Toolkit API**

**Note**: You might need to enable some APIs first. Click "Enable API" if prompted.

#### **4. Save**
- Click the blue **"SAVE"** button at the bottom
- Wait for confirmation message: "API key saved"

---

## 📱 Step 2: Restrict Android API Key (5 minutes)

### A. Find Your Android API Key

1. In the same **"Credentials"** page
2. Find the key `AIzaSyAfenR2...` (your Android key)
3. Click on it to edit

### B. Restrict the Key

#### **1. Application Restrictions**
- Select **"Android apps"** (click the radio button)
- Click **"ADD AN ITEM"**

#### **2. Add Your Android App**
Fill in these details:

```
Package name: com.example.visitaMobile
```

**Getting SHA-1 Certificate Fingerprint** (Required):

Open PowerShell and run:
```powershell
# For debug builds (development):
cd $env:USERPROFILE\.android
keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android | Select-String -Pattern "SHA1"
```

Copy the SHA-1 value that appears (looks like: `12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78`)

Paste it in the **"SHA-1 certificate fingerprint"** field.

**Visual Guide**:
```
┌─────────────────────────────────────────┐
│ Android applications                     │
├─────────────────────────────────────────┤
│ Package name                             │
│ com.example.visitaMobile                 │
│                                          │
│ SHA-1 certificate fingerprint            │
│ 12:34:56:...:78  [From command above]   │
│                                          │
│ [+ ADD AN ITEM]                          │
└─────────────────────────────────────────┘
```

#### **3. API Restrictions**
Same as Web API Key:
- Select **"Restrict key"**
- Enable: Firestore API, Firebase Auth API, Storage API, Identity Toolkit API

#### **4. Save**
Click **"SAVE"**

---

## 🍎 Step 3: Restrict iOS API Key (5 minutes)

### A. Find Your iOS API Key

1. Find the key `AIzaSyD1bvuD...` (your iOS key)
2. Click on it to edit

### B. Restrict the Key

#### **1. Application Restrictions**
- Select **"iOS apps"** (click the radio button)
- Click **"ADD AN ITEM"**

#### **2. Add Your iOS App**
Fill in:

```
iOS bundle ID: com.example.visitaMobile
```

**Visual Guide**:
```
┌─────────────────────────────────────────┐
│ iOS applications                         │
├─────────────────────────────────────────┤
│ iOS bundle identifier                    │
│ com.example.visitaMobile                 │
│                                          │
│ [+ ADD AN ITEM]                          │
└─────────────────────────────────────────┘
```

#### **3. API Restrictions**
Same as previous:
- Select **"Restrict key"**
- Enable: Firestore API, Firebase Auth API, Storage API, Identity Toolkit API

#### **4. Save**
Click **"SAVE"**

---

## ✅ Step 4: Verify Your Restrictions

### A. Visual Verification

After saving, you should see:

```
┌──────────────────────────────────────────────────┐
│ API Key: AIzaSyDCbl4... (Web)                    │
│ ✓ Restricted to: HTTP referrers                  │
│ ✓ APIs: 4 APIs enabled                           │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ API Key: AIzaSyAfenR2... (Android)               │
│ ✓ Restricted to: Android apps                    │
│ ✓ Package: com.example.visitaMobile              │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ API Key: AIzaSyD1bvuD... (iOS)                   │
│ ✓ Restricted to: iOS apps                        │
│ ✓ Bundle ID: com.example.visitaMobile            │
└──────────────────────────────────────────────────┘
```

### B. Test Your Applications

After restricting keys, **test immediately**:

#### Test Admin Dashboard:
```powershell
cd admin-dashboard
npm run dev
# Open browser: http://localhost:8080
# Try logging in
```

#### Test Mobile App:
```powershell
cd mobile-app
flutter run
# Try using the app features
```

**If something doesn't work**:
- Check browser console for errors (F12)
- Verify you added ALL required referrers/package names
- Make sure APIs are enabled

---

## 🚨 Troubleshooting

### Error: "API key not valid. Please pass a valid API key."

**Solution**: 
- Wait 5 minutes for restrictions to propagate
- Clear browser cache
- Restart your app

### Error: "This API key is not authorized to use this service or API"

**Solution**:
- Go back to Google Cloud Console
- Make sure you enabled all required APIs in "API restrictions"
- Specifically enable: **Identity Toolkit API**

### App works on localhost but not on deployed site

**Solution**:
- Add your production domain to HTTP referrers
- Format: `https://your-domain.com/*`

### Can't find debug.keystore

**Solution**:
```powershell
# Check if it exists:
Test-Path "$env:USERPROFILE\.android\debug.keystore"

# If False, run Flutter app once to generate it:
cd mobile-app
flutter run
```

---

## 📱 Quick Commands Reference

### Get Android SHA-1 (Debug):
```powershell
cd $env:USERPROFILE\.android
keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### Get Android SHA-1 (Release):
```powershell
# You'll need your release keystore path and password
keytool -list -v -keystore path\to\your\release.keystore
```

### Test Admin Dashboard:
```powershell
cd admin-dashboard
npm run dev
```

### Test Mobile App:
```powershell
cd mobile-app
flutter run
```

---

## 📸 Screenshots Guide

If you get stuck, here's what to look for:

### Google Cloud Console - Main Page:
```
┌─────────────────────────────────────────────────┐
│ APIs & Services > Credentials                    │
├─────────────────────────────────────────────────┤
│ OAuth 2.0 Client IDs                             │
│ • Web client...                                  │
│                                                  │
│ API Keys ← LOOK HERE                             │
│ • AIzaSyDCbl4... ✏️                              │
│ • AIzaSyAfenR2... ✏️                             │
│ • AIzaSyD1bvuD... ✏️                             │
└─────────────────────────────────────────────────┘
```

### Edit API Key Page:
```
┌─────────────────────────────────────────────────┐
│ Edit API key                                     │
├─────────────────────────────────────────────────┤
│ Name: [Your API Key Name]                        │
│                                                  │
│ Application restrictions                         │
│ ◯ None                                           │
│ ● HTTP referrers (web sites) ← SELECT THIS      │
│ ◯ IP addresses                                   │
│ ◯ Android apps                                   │
│ ◯ iOS apps                                       │
│                                                  │
│ API restrictions                                 │
│ ◯ Don't restrict key                             │
│ ● Restrict key ← SELECT THIS                     │
│   [Select APIs ▼]                                │
│                                                  │
│ [SAVE] [CANCEL]                                  │
└─────────────────────────────────────────────────┘
```

---

## ✅ Completion Checklist

Mark these off as you complete them:

- [ ] Opened Google Cloud Console
- [ ] Found all 3 API keys
- [ ] **Web Key**:
  - [ ] Set to "HTTP referrers"
  - [ ] Added all 6 referrer URLs
  - [ ] Restricted to Firebase APIs
  - [ ] Saved successfully
- [ ] **Android Key**:
  - [ ] Set to "Android apps"
  - [ ] Added package name
  - [ ] Added SHA-1 fingerprint
  - [ ] Restricted to Firebase APIs
  - [ ] Saved successfully
- [ ] **iOS Key**:
  - [ ] Set to "iOS apps"
  - [ ] Added bundle ID
  - [ ] Restricted to Firebase APIs
  - [ ] Saved successfully
- [ ] Tested admin dashboard
- [ ] Tested mobile app
- [ ] All features working

---

## 🎉 Success!

Once all checkboxes are marked, your API keys are properly secured! 

**What you've accomplished**:
- ✅ Prevented unauthorized use of your API keys
- ✅ Limited access to only your applications
- ✅ Protected your Firebase quota and billing
- ✅ Followed security best practices

**Next Step**: Continue to Phase 2 - Dependency Updates (see `IMPLEMENTATION_CHECKLIST.md`)

---

## 📞 Need More Help?

- **Google Cloud Documentation**: https://cloud.google.com/docs/authentication/api-keys
- **Firebase Security**: https://firebase.google.com/docs/projects/api-keys
- **Your Project Console**: https://console.cloud.google.com/apis/credentials?project=visitaproject-5cd9f

---

**Created**: October 8, 2025  
**Last Updated**: October 8, 2025  
**Project**: VISITA Bohol Churches Information System
