# SECURITY ALERT: Firebase Configuration Management

## 🚨 IMMEDIATE ACTION REQUIRED

### 1. **Environment File Security**
The `.env` file contains production Firebase credentials that should NOT be committed to version control.

### 2. **API Key Security Configuration**
Your Firebase API key `AIzaSyDCbl4Zr7nco51NJ7fRafyBOh23-2qtOD4` needs proper restrictions.

## 🔧 **IMMEDIATE FIXES NEEDED**

### **Step 1: Secure API Key**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Credentials"
3. Find API key: `AIzaSyDCbl4Zr7nco51NJ7fRafyBOh23-2qtOD4`
4. Click "RESTRICT KEY"
5. Set Application restrictions to:
   - **HTTP referrers (web sites)**
   - Add these referrers:
     ```
     http://localhost:*
     https://localhost:*
     http://127.0.0.1:*
     https://127.0.0.1:*
     https://your-production-domain.com/*
     https://visitaproject-5cd9f.web.app/*
     https://visitaproject-5cd9f.firebaseapp.com/*
     ```

### **Step 2: Environment Configuration**
1. **Remove from Git tracking:**
   ```bash
   git rm --cached admin-dashboard/.env
   echo "admin-dashboard/.env" >> .gitignore
   ```

2. **Create secure environment files:**
   - `.env.development` (for local development)
   - `.env.production` (for production builds)
   - Keep `.env.example` as template

### **Step 3: Firebase Security Rules**
Update Firestore security rules to be more restrictive:

```javascript
// Add IP restrictions if needed
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Add stricter rules here
    function isValidRequest() {
      return request.auth != null && 
             request.time > timestamp.date(2024, 1, 1);
    }
  }
}
```

### **Step 4: Production Deployment**
For production deployment:
1. Use Firebase CLI with service account
2. Set environment variables in hosting provider
3. Never embed credentials in source code

## 🛡️ **SECURITY BEST PRACTICES**

1. **Rotate API Keys**: Consider regenerating API keys periodically
2. **Monitor Usage**: Enable Firebase Analytics and monitoring
3. **Audit Access**: Regular review of Firebase users and permissions
4. **HTTPS Only**: Ensure all production traffic uses HTTPS
5. **Rate Limiting**: Implement client-side and server-side rate limiting

## 📋 **EMERGENCY CHECKLIST**

- [ ] Restrict API key in Google Cloud Console
- [ ] Remove `.env` from Git history
- [ ] Update `.gitignore`
- [ ] Create secure environment files
- [ ] Update deployment scripts
- [ ] Enable Firebase App Check (recommended)
- [ ] Set up monitoring and alerts

## 🔗 **HELPFUL LINKS**

- [Firebase Security Best Practices](https://firebase.google.com/docs/projects/api-keys#securing_an_api_key)
- [Google Cloud API Key Security](https://cloud.google.com/docs/authentication/api-keys)
- [Firebase App Check](https://firebase.google.com/docs/app-check)

**Priority Level: CRITICAL - Address immediately before any production deployment**