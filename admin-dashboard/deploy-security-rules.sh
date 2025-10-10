#!/bin/bash
# Firebase Security Rules Deployment Script
# Run this script to deploy updated security rules to Firebase

echo "🔒 Deploying Firebase Security Rules..."
echo "=====================================\n"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "   npm install -g firebase-tools"
    exit 1
fi

# Login check
echo "📋 Checking Firebase authentication..."
firebase use --add

# Deploy database rules
echo "\n🔐 Deploying Realtime Database security rules..."
firebase deploy --only database

# Deploy other rules as well
echo "\n📊 Deploying Firestore security rules..."
firebase deploy --only firestore:rules

echo "\n☁️ Deploying Storage security rules..."
firebase deploy --only storage

echo "\n✅ Security rules deployment complete!"
echo "\nYour Realtime Database is now secured with proper authentication rules."
echo "The following access levels are configured:"
echo "  📖 Public read: churches, announcements"
echo "  🔐 Authenticated access: feedback, reports"
echo "  👑 Admin only: users, analytics"