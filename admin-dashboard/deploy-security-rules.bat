@echo off
REM Firebase Security Rules Deployment Script for Windows
REM Run this script to deploy updated security rules to Firebase

echo 🔒 Deploying Firebase Security Rules...
echo =====================================

REM Check if Firebase CLI is installed
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Firebase CLI not found. Please install it first:
    echo    npm install -g firebase-tools
    pause
    exit /b 1
)

REM Login check
echo 📋 Checking Firebase authentication...
firebase use --add

REM Deploy database rules
echo.
echo 🔐 Deploying Realtime Database security rules...
firebase deploy --only database

REM Deploy other rules as well
echo.
echo 📊 Deploying Firestore security rules...
firebase deploy --only firestore:rules

echo.
echo ☁️ Deploying Storage security rules...
firebase deploy --only storage

echo.
echo ✅ Security rules deployment complete!
echo.
echo Your Realtime Database is now secured with proper authentication rules.
echo The following access levels are configured:
echo   📖 Public read: churches, announcements
echo   🔐 Authenticated access: feedback, reports
echo   👑 Admin only: users, analytics
echo.
pause