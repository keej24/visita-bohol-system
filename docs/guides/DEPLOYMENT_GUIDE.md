# VISITA System - Deployment Guide

This guide covers the deployment process for both the admin dashboard and mobile application components of the VISITA: Bohol Churches Information System.

## Prerequisites

### Required Tools
- **Node.js** (v18.0.0+)
- **npm** (v9.0.0+)
- **Flutter** (v3.0.0+) for mobile deployment
- **Firebase CLI** (v12.0.0+)
- **Git** (v2.0.0+)

### Required Services
- **Firebase Project** with:
  - Authentication enabled
  - Firestore database
  - Storage bucket
  - Hosting (for admin dashboard)
- **Google Play Console** account (for Android)
- **Apple Developer** account (for iOS)

## Environment Setup

### 1. Clone and Setup Repository

```bash
# Clone the repository
git clone <repository-url>
cd visita-system

# Run development setup
node scripts/setup-dev.js
```

### 2. Firebase Configuration

Create Firebase projects for different environments:

- `visita-dev` - Development environment
- `visita-staging` - Staging environment  
- `visita-prod` - Production environment

#### Admin Dashboard Environment Files

Create environment files in `admin-dashboard/`:

**`.env.development`**
```env
VITE_FIREBASE_API_KEY=your_dev_api_key
VITE_FIREBASE_AUTH_DOMAIN=visita-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=visita-dev
VITE_FIREBASE_STORAGE_BUCKET=visita-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
VITE_APP_ENV=development
VITE_DEBUG_MODE=true
```

**`.env.production`**
```env
VITE_FIREBASE_API_KEY=your_prod_api_key
VITE_FIREBASE_AUTH_DOMAIN=visita-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=visita-prod
VITE_FIREBASE_STORAGE_BUCKET=visita-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=987654321
VITE_FIREBASE_APP_ID=1:987654321:web:fedcba654321
VITE_APP_ENV=production
VITE_DEBUG_MODE=false
```

#### Mobile App Configuration

Update `mobile-app/lib/firebase_options.dart` with your Firebase configuration for each platform.

### 3. Firebase Security Rules

Deploy Firestore and Storage security rules:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in project
cd admin-dashboard
firebase init

# Deploy security rules
firebase deploy --only firestore:rules
firebase deploy --only storage
```

## Admin Dashboard Deployment

### Development Deployment

```bash
cd admin-dashboard

# Install dependencies
npm install

# Run development server
npm run dev

# Development server will be available at http://localhost:8080
```

### Production Deployment

#### Option 1: Firebase Hosting (Recommended)

```bash
cd admin-dashboard

# Build for production
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Your app will be available at https://your-project.web.app
```

#### Option 2: Manual Static Hosting

```bash
cd admin-dashboard

# Build for production
npm run build

# Upload dist/ folder contents to your web server
# Configure your web server to serve index.html for all routes (SPA)
```

#### Production Environment Variables

Set production environment variables:

```bash
# Using Firebase CLI
firebase functions:config:set app.env="production"

# Or set in hosting provider's environment variables
```

### Build Optimization

The production build includes several optimizations:

- **Code Splitting**: Automatic chunking for better loading performance
- **Tree Shaking**: Dead code elimination
- **Minification**: JavaScript and CSS compression
- **Source Maps**: Disabled in production for security
- **Console Removal**: Development logs removed

Monitor bundle sizes:

```bash
npm run build

# Check chunk sizes in build output
# Main bundle should be < 500KB after gzipping
```

## Mobile App Deployment

### Android Deployment

#### 1. Prepare for Release

```bash
cd mobile-app

# Update version in pubspec.yaml
# version: 1.0.0+1

# Update app configuration
# android/app/src/main/AndroidManifest.xml
```

#### 2. Create Signing Key

```bash
# Generate release keystore
keytool -genkey -v -keystore android/app/release-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias release

# Create android/key.properties
storePassword=your_store_password
keyPassword=your_key_password
keyAlias=release
storeFile=release-keystore.jks
```

#### 3. Build Release APK

```bash
# Build APK
flutter build apk --release

# Build App Bundle (recommended for Play Store)
flutter build appbundle --release
```

#### 4. Deploy to Google Play Console

1. Upload the `.aab` file to Google Play Console
2. Fill out store listing information
3. Set up content rating
4. Configure pricing and distribution
5. Submit for review

### iOS Deployment

#### 1. Prepare for Release

```bash
cd mobile-app

# Update iOS configuration
# ios/Runner/Info.plist

# Update version and build number
```

#### 2. Build for iOS

```bash
# Build iOS release
flutter build ios --release

# Open Xcode project
open ios/Runner.xcworkspace
```

#### 3. Archive and Upload

1. In Xcode, select "Product" → "Archive"
2. When archive completes, click "Distribute App"
3. Choose "App Store Connect"
4. Upload to App Store Connect

#### 4. App Store Submission

1. Complete app metadata in App Store Connect
2. Add screenshots and app preview
3. Set pricing and availability
4. Submit for App Store review

## Database Deployment

### 1. Seed Production Data

```bash
# Install Firebase Admin SDK
npm install firebase-admin

# Set up service account credentials
export FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# Run data seeding (be careful in production!)
node scripts/seed-data.js
```

### 2. Database Indexes

Create composite indexes in Firebase Console:

**Churches Collection:**
```
- diocese (Ascending), status (Ascending)
- municipality (Ascending), status (Ascending)  
- heritageClassification (Ascending), status (Ascending)
- createdAt (Descending), status (Ascending)
```

**Announcements Collection:**
```
- diocese (Ascending), status (Ascending), publishedAt (Descending)
- scope (Ascending), status (Ascending), publishedAt (Descending)
- priority (Ascending), status (Ascending), publishedAt (Descending)
```

**Feedback Collection:**
```
- churchId (Ascending), status (Ascending), createdAt (Descending)
- diocese (Ascending), status (Ascending), rating (Descending)
```

### 3. Security Rules Validation

Test security rules:

```bash
# Install Firestore emulator
firebase setup:emulators:firestore

# Run emulator with rules
firebase emulators:start --only firestore

# Run security rules tests
npm test -- --testMatch="**/*security*.test.js"
```

## Monitoring and Analytics

### 1. Firebase Analytics

Enable Firebase Analytics in both admin dashboard and mobile app:

```javascript
// Admin Dashboard - Add to main.tsx
import { getAnalytics } from "firebase/analytics";

const analytics = getAnalytics(app);
```

```dart
// Mobile App - Add to main.dart
import 'package:firebase_analytics/firebase_analytics.dart';

FirebaseAnalytics analytics = FirebaseAnalytics.instance;
```

### 2. Error Monitoring

Set up error monitoring service:

**Option 1: Firebase Crashlytics**
```bash
# Install Firebase Crashlytics
flutter pub add firebase_crashlytics

# Initialize in main.dart
```

**Option 2: Sentry**
```bash
# Install Sentry
npm install @sentry/react
flutter pub add sentry_flutter
```

### 3. Performance Monitoring

Enable Firebase Performance Monitoring:

```bash
# Add to both admin dashboard and mobile app
# Follow Firebase Performance setup guide
```

## Backup and Recovery

### 1. Database Backup

Set up automated Firestore backups:

```bash
# Enable Firestore backup via Firebase Console
# Configure backup schedule and retention
```

### 2. Storage Backup

Implement Cloud Storage backup:

```javascript
// Backup script for Firebase Storage
const backup = require('./scripts/backup-storage.js');

// Run backup
backup.backupAllFiles();
```

### 3. Code Repository Backup

Ensure code is backed up to multiple locations:

- Primary: GitHub/GitLab
- Secondary: Cloud storage backup
- Local: Development machines

## SSL and Security

### 1. HTTPS Configuration

Firebase Hosting provides HTTPS by default. For custom domains:

```bash
# Add custom domain in Firebase Console
# Configure DNS settings
# SSL certificates are automatically provisioned
```

### 2. Security Headers

Configure security headers in `firebase.json`:

```json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options", 
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          }
        ]
      }
    ]
  }
}
```

### 3. Content Security Policy

Add CSP headers for enhanced security:

```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline'"
}
```

## Post-Deployment Checklist

### Admin Dashboard
- [ ] Application loads without errors
- [ ] Authentication works correctly
- [ ] All user roles have appropriate access
- [ ] Firebase integration is working
- [ ] Charts and data visualization display correctly
- [ ] File upload functionality works
- [ ] Error boundaries catch and display errors properly
- [ ] Performance metrics are acceptable (< 3s load time)

### Mobile App
- [ ] App installs and launches successfully
- [ ] Firebase integration is working
- [ ] Authentication flow works
- [ ] Church data loads correctly
- [ ] Maps and location services work
- [ ] Image loading and caching works
- [ ] Offline functionality works (if implemented)
- [ ] Push notifications work (if implemented)

### Database & Security
- [ ] Security rules are deployed and working
- [ ] All required indexes are created
- [ ] Data seeding completed successfully
- [ ] Backup systems are configured
- [ ] Monitoring and analytics are active

### Performance & Monitoring
- [ ] Error tracking is configured
- [ ] Analytics are collecting data
- [ ] Performance monitoring is active
- [ ] SSL certificates are valid
- [ ] CDN is configured (if using)

## Rollback Procedures

### Admin Dashboard Rollback

```bash
# Rollback to previous Firebase Hosting deployment
firebase hosting:versions:list
firebase hosting:versions:restore <version-id>
```

### Mobile App Rollback

**Android:**
- Use Google Play Console to rollback to previous version
- Or upload previous APK/AAB as new version

**iOS:**  
- Use App Store Connect to rollback to previous version
- Or submit previous build as new version

### Database Rollback

```bash
# Restore from Firestore backup
# Use Firebase Console or gcloud command
gcloud firestore import gs://backup-bucket/backup-folder
```

## Troubleshooting Common Issues

### Build Failures
- Check Node.js and Flutter versions
- Clear node_modules and reinstall dependencies
- Verify environment variables are set correctly

### Firebase Connection Issues  
- Verify Firebase configuration
- Check security rules
- Ensure service account has proper permissions

### Performance Issues
- Analyze bundle size and optimize imports
- Check database query efficiency
- Review image optimization

### Mobile App Issues
- Clean and rebuild the app
- Check platform-specific configurations
- Verify signing certificates

---

## Support and Maintenance

For ongoing support and maintenance:

1. **Monitor Error Reports**: Check error tracking dashboards daily
2. **Update Dependencies**: Regular security and feature updates  
3. **Performance Monitoring**: Weekly performance reviews
4. **User Feedback**: Regular collection and review of user feedback
5. **Security Audits**: Quarterly security reviews and updates

For technical support, refer to:
- Firebase Documentation
- Flutter Documentation  
- React/Vite Documentation
- This project's technical documentation