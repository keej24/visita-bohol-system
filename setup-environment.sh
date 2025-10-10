#!/bin/bash

# VISITA System Environment Setup Script
echo "🚀 Setting up VISITA System Environment..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

if ! command_exists flutter; then
    echo "❌ Flutter is not installed. Please install Flutter first."
    exit 1
fi

echo "✅ Prerequisites check passed!"

# Setup Admin Dashboard
echo "📱 Setting up Admin Dashboard..."
cd admin-dashboard

if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit admin-dashboard/.env with your actual Firebase credentials"
else
    echo "✅ .env file already exists"
fi

echo "📦 Installing admin dashboard dependencies..."
npm install

echo "🏗️  Building admin dashboard..."
npm run build:dev

cd ..

# Setup Mobile App
echo "📱 Setting up Mobile App..."
cd mobile-app

echo "📦 Installing mobile app dependencies..."
flutter pub get

echo "🔧 Configuring Firebase for Flutter..."
if command_exists flutterfire; then
    echo "🔥 FlutterFire CLI found. You can run 'flutterfire configure' to set up Firebase automatically."
else
    echo "⚠️  FlutterFire CLI not found. Install it with: dart pub global activate flutterfire_cli"
fi

cd ..

# Create initial Firebase setup script
echo "🔥 Creating Firebase initialization script..."
cat > scripts/init-firebase.js << 'FIREBASE_EOF'
// Firebase Initialization Script for VISITA
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../admin-dashboard/firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
  storageBucket: `${serviceAccount.project_id}.appspot.com`
});

const db = admin.firestore();

async function initializeFirebase() {
  console.log('🔥 Initializing Firebase collections...');

  // Create initial dioceses
  await db.collection('dioceses').doc('tagbilaran').set({
    name: 'Diocese of Tagbilaran',
    bishop: 'Most Rev. Alberto Uy',
    established: 1968,
    province: 'Bohol',
    cathedral: 'Cathedral of St. Joseph the Worker',
    address: 'Bishop Epifanio Surban St, Tagbilaran City, Bohol',
    createdAt: admin.firestore.Timestamp.now()
  });

  await db.collection('dioceses').doc('talibon').set({
    name: 'Diocese of Talibon',
    bishop: 'Most Rev. Patrick Daniel Parcon',
    established: 1986,
    province: 'Bohol',
    cathedral: 'Cathedral of St. Michael the Archangel',
    address: 'Talibon, Bohol',
    createdAt: admin.firestore.Timestamp.now()
  });

  console.log('✅ Firebase initialization complete!');
}

if (require.main === module) {
  initializeFirebase().catch(console.error);
}

module.exports = { initializeFirebase };
FIREBASE_EOF

echo "📋 Creating deployment checklist..."
cat > DEPLOYMENT_CHECKLIST.md << 'CHECKLIST_EOF'
# VISITA System Deployment Checklist

## Pre-deployment Setup

### 1. Environment Configuration
- [ ] Copy `.env.example` to `.env` in admin-dashboard
- [ ] Configure Firebase credentials in `.env`
- [ ] Set up Firebase project in console
- [ ] Enable Authentication, Firestore, Storage

### 2. Firebase Setup
- [ ] Create Firebase project
- [ ] Enable Email/Password authentication
- [ ] Set up Firestore database
- [ ] Configure Storage bucket
- [ ] Deploy security rules: `firebase deploy --only firestore:rules,storage`

### 3. Admin Dashboard
- [ ] Install dependencies: `npm install`
- [ ] Build for production: `npm run build`
- [ ] Deploy to Firebase Hosting: `firebase deploy --only hosting`

### 4. Mobile App
- [ ] Install dependencies: `flutter pub get`
- [ ] Configure Firebase: `flutterfire configure`
- [ ] Build for Android: `flutter build apk`
- [ ] Build for iOS: `flutter build ios`

### 5. Data Seeding
- [ ] Run database initialization: `node scripts/init-firebase.js`
- [ ] Seed sample church data: `node scripts/seed-data.js`
- [ ] Create admin accounts: `node scripts/create-admin-accounts.js`

### 6. Testing
- [ ] Test admin dashboard login
- [ ] Test mobile app registration
- [ ] Test church creation workflow
- [ ] Test feedback submission
- [ ] Test announcement system

## Post-deployment
- [ ] Monitor error logs
- [ ] Set up backup schedule
- [ ] Configure monitoring alerts
- [ ] Create user documentation
CHECKLIST_EOF

echo "✅ Environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit admin-dashboard/.env with your Firebase credentials"
echo "2. Run 'firebase login' and 'firebase use your-project-id'"
echo "3. Deploy Firebase rules: 'firebase deploy --only firestore:rules,storage'"
echo "4. Run 'node scripts/init-firebase.js' to initialize the database"
echo "5. See DEPLOYMENT_CHECKLIST.md for complete deployment steps"
