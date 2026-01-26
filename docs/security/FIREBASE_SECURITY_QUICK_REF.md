# 🔐 Firebase Security Quick Reference Card

## Project Information
- **Project ID**: `visitaproject-5cd9f`
- **Project Name**: VISITA Bohol Churches

## 🔑 API Keys to Restrict

### Web API Key
```
AIzaSyDCbl4Zr7nco51NJ7fRafyBOh23-2qtOD4
```
**Action**: Restrict to HTTP referrers
**Allowed Referrers**:
- `http://localhost:*/*`
- `https://localhost:*/*`
- `https://visitaproject-5cd9f.web.app/*`
- `https://visitaproject-5cd9f.firebaseapp.com/*`

### Android API Key
```
AIzaSyAfenR2dQXnheuPWB2ED0kUNaBEyjsWjAE
```
**Action**: Restrict to Android apps
**Package Name**: `com.example.visitaMobile`

### iOS API Key
```
AIzaSyD1bvuDlhVeoHCopVepdgx8huYw48Urr40
```
**Action**: Restrict to iOS apps
**Bundle ID**: `com.example.visitaMobile`

---

## 🔗 Quick Links

### Google Cloud Console
https://console.cloud.google.com/apis/credentials?project=visitaproject-5cd9f

### Firebase Console
https://console.firebase.google.com/project/visitaproject-5cd9f

### Authentication Settings
https://console.firebase.google.com/project/visitaproject-5cd9f/authentication/providers

### Firestore Rules
https://console.firebase.google.com/project/visitaproject-5cd9f/firestore/rules

### Storage Rules
https://console.firebase.google.com/project/visitaproject-5cd9f/storage/rules

---

## ⚡ Quick Commands

### Check Tracked Sensitive Files
```powershell
git ls-files | Select-String -Pattern "(\.env$|firebase_options\.dart$|google-services\.json$)"
```

### Remove from Git (Keep Local)
```powershell
git rm --cached mobile-app/android/app/google-services.json
git rm --cached admin-dashboard/.env
```

### Firebase CLI Commands
```powershell
# Login
firebase login

# List projects
firebase projects:list

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules  
firebase deploy --only storage
```

### Get Android SHA-1 (Debug)
```powershell
cd $env:USERPROFILE\.android
keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android
```

---

## 👥 Test Accounts to Create

Create these accounts in Firebase Authentication:

1. **Tagbilaran Chancery**
   - Email: `dioceseoftagbilaran1941@gmail.com`
   - Role: `chancery_office`
   - Diocese: `tagbilaran`

2. **Talibon Chancery**
   - Email: `talibonchancery@gmail.com`
   - Role: `chancery_office`
   - Diocese: `talibon`

3. **Museum Researcher**
   - Email: `bohol@nationalmuseum.gov.ph`
   - Role: `museum_researcher`
   - Diocese: `tagbilaran`

---

## ✅ Verification Checklist

### Git Security
- [ ] No `.env` files tracked
- [ ] No `firebase_options.dart` tracked
- [ ] No `google-services.json` tracked
- [ ] `.gitignore` has all entries

### API Key Security
- [ ] Web API Key restricted
- [ ] Android API Key restricted
- [ ] iOS API Key restricted
- [ ] Apps still work after restrictions

### Authentication
- [ ] Email/Password enabled
- [ ] Test accounts created
- [ ] Login works in dashboard
- [ ] Login works in mobile app

### Firebase Rules
- [ ] Firestore rules deployed
- [ ] Storage rules deployed
- [ ] Rules tested with different roles

---

## 🚨 Emergency Rollback

If something breaks:

1. **Restore API Keys**:
   - Go to Google Cloud Console
   - Remove restrictions temporarily
   - Test app
   - Re-apply restrictions correctly

2. **Restore Git Files** (if needed):
   ```powershell
   git checkout HEAD -- .gitignore
   ```

3. **Restore from Backup**:
   ```powershell
   Copy-Item C:\VisitaBackups\*.backup .\
   ```

---

## 📞 Support Resources

- **Firebase Documentation**: https://firebase.google.com/docs
- **API Key Best Practices**: https://cloud.google.com/docs/authentication/api-keys
- **Firebase Security Rules**: https://firebase.google.com/docs/rules

---

**Print this card and keep it handy during setup!**

Last Updated: October 8, 2025
