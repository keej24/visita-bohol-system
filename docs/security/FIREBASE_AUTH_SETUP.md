# 🔥 Firebase Authentication Setup Guide

## Problem: "Authentication failed" Error

The registration is failing because **Email/Password authentication is not enabled** in your Firebase project.

---

## ✅ Solution: Enable Email/Password Authentication

### Step 1: Go to Firebase Console
1. Open: https://console.firebase.google.com
2. Select your project: **visitaproject-5cd9f**

### Step 2: Enable Email/Password Authentication
1. In the left sidebar, click **"Build"** → **"Authentication"**
2. Click **"Get Started"** (if first time) or go to **"Sign-in method"** tab
3. Click **"Email/Password"** provider
4. Toggle **"Enable"** switch to ON
5. Click **"Save"**

### Step 3: (Optional) Configure Authorized Domains
1. In Authentication, go to **"Settings"** tab
2. Scroll to **"Authorized domains"**
3. Make sure these are listed:
   - `localhost` (for testing)
   - `visitaproject-5cd9f.firebaseapp.com` (your Firebase domain)
   - Any custom domains you're using

---

## 🔍 Verify Setup

After enabling Email/Password authentication:

1. **Refresh your app** in Chrome (Ctrl+R)
2. **Try registering again** with:
   - Full Name: Test User
   - Email: test@example.com
   - Nationality: Filipino
   - Password: Test1234
   - Confirm Password: Test1234
   - ✅ Check "I agree to Terms..."
3. Click **"Create Account"**

If it works, you'll see:
- ✅ "Welcome to VISITA, Test User!" message
- ✅ Redirected to home screen

---

## 🐛 Still Not Working?

### Check Browser Console:
1. Press **F12** in Chrome
2. Go to **"Console"** tab
3. Look for Firebase error messages
4. Common errors:

**Error: "auth/operation-not-allowed"**
- Solution: Enable Email/Password in Firebase Console

**Error: "auth/invalid-api-key"**
- Solution: Check firebase_options.dart has correct API key

**Error: "auth/unauthorized-domain"**
- Solution: Add localhost to authorized domains

**Error: "auth/weak-password"**
- Solution: Use password with 8+ characters, uppercase, lowercase, number

---

## 📸 Visual Guide

### Firebase Console Steps:
```
Firebase Console
└── visitaproject-5cd9f (your project)
    └── Build
        └── Authentication
            └── Sign-in method
                └── Email/Password
                    └── Enable ✅
```

---

## 🔐 Current Firebase Configuration

Your project is already configured with:
- ✅ Project ID: `visitaproject-5cd9f`
- ✅ Web API Key: `AIzaSyC8XrVzTqg4mF5xJp7bQ9kL3nM8hE2vW6Y`
- ✅ Auth Domain: `visitaproject-5cd9f.firebaseapp.com`
- ✅ Storage Bucket: `visitaproject-5cd9f.appspot.com`

**What's Missing:**
- ❌ Email/Password provider needs to be enabled

---

## 🎯 Quick Fix Checklist

- [ ] Go to Firebase Console
- [ ] Navigate to Authentication
- [ ] Enable Email/Password sign-in method
- [ ] Save changes
- [ ] Refresh your app
- [ ] Try registration again

---

## 💡 Alternative: Use Admin Dashboard to Create User

If you need immediate access, you can:
1. Go to **Admin Dashboard** (admin-dashboard folder)
2. Use the **Chancery Office** account to create users
3. Or manually add users in Firebase Console → Authentication → Users → Add User

---

## 📝 After Enabling Authentication

Once Email/Password is enabled, your app will support:
- ✅ User registration (public users)
- ✅ Email/password login
- ✅ Password reset via email
- ✅ User profile creation in Firestore
- ✅ Nationality field stored in database

---

## 🚀 Next Steps

After enabling authentication:
1. **Test registration** with a new user
2. **Verify user appears** in Firebase Console → Authentication → Users
3. **Check Firestore** → users collection → new user document
4. **Test login** with the registered credentials

---

## Need Help?

If authentication still fails after enabling Email/Password:
1. Check browser console (F12) for specific error
2. Verify Firebase API key is correct
3. Make sure authorized domains include localhost
4. Try incognito mode to rule out cache issues

The error message will now show the **specific Firebase error** instead of generic "authentication failed" thanks to our recent fix!
