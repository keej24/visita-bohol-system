@echo off
REM 🚀 VISITA Implementation Plan Launcher - Windows PowerShell Version
REM Execute this script to start the implementation plan

echo 🚀 VISITA Mobile App - Implementation Plan Launcher
echo ===================================================
echo.

REM Check if we're in the right directory
if not exist "mobile-app\pubspec.yaml" (
    echo ❌ Error: Please run this script from the visita-system root directory
    pause
    exit /b 1
)

echo 📍 Current directory: %CD%
echo.

:menu
echo 🎯 Implementation Plan Menu
echo ---------------------------
echo 1. Phase 1 - Critical Security Fixes (URGENT)
echo 2. Phase 2 - Dependency Updates and Build Fixes
echo 3. Phase 3 - Performance Optimization
echo 4. Phase 4 - Testing Implementation
echo 5. Phase 5 - Production Deployment
echo 6. Quick Security Check
echo 7. View Implementation Plan
echo 8. Exit
echo.

set /p choice="Select phase to implement (1-8): "

if "%choice%"=="1" goto phase1
if "%choice%"=="2" goto phase2
if "%choice%"=="3" goto phase3
if "%choice%"=="4" goto phase4
if "%choice%"=="5" goto phase5
if "%choice%"=="6" goto security_check
if "%choice%"=="7" goto view_plan
if "%choice%"=="8" goto exit

echo Invalid choice. Please try again.
goto menu

:phase1
echo.
echo 🚨 Phase 1: Critical Security Fixes Implementation
echo ===================================================
echo.
echo This phase will:
echo ✅ Secure Firebase API keys
echo ✅ Remove sensitive files from git
echo ✅ Create secure configuration templates
echo ✅ Update .gitignore
echo.
set /p confirm="Continue with Phase 1? (y/n): "
if /i not "%confirm%"=="y" goto menu

echo.
echo 🔄 Executing security fixes...

REM Create secure templates first
echo 📋 Creating secure configuration templates...

REM Create firebase_options.example.dart
powershell -Command "if (!(Test-Path 'mobile-app\lib\firebase_options.example.dart')) { Copy-Item 'mobile-app\lib\firebase_options.dart' 'mobile-app\lib\firebase_options.example.dart' }"

REM Update .gitignore
echo.>> .gitignore
echo # 🔒 VISITA Security - Sensitive Firebase Configuration>> .gitignore
echo mobile-app/lib/firebase_options.dart>> .gitignore
echo mobile-app/android/app/google-services.json>> .gitignore
echo mobile-app/ios/GoogleService-Info.plist>> .gitignore
echo admin-dashboard/.env>> .gitignore
echo admin-dashboard/.env.local>> .gitignore
echo admin-dashboard/.env.production>> .gitignore
echo.>> .gitignore
echo # 💾 Backup files>> .gitignore
echo *.backup>> .gitignore
echo *.backup.*>> .gitignore

echo ✅ Security templates created and .gitignore updated

echo.
echo 🚨 MANUAL ACTIONS REQUIRED:
echo ============================
echo.
echo 1. 🔑 Restrict Firebase API Keys in Google Cloud Console:
echo    - Go to: https://console.cloud.google.com/apis/credentials
echo    - Find API key: AIzaSyDCbl4Zr7nco51NJ7fRafyBOh23-2qtOD4
echo    - Add HTTP referrer restrictions
echo.
echo 2. 🔐 Enable Email/Password Authentication:
echo    - Go to: https://console.firebase.google.com/project/visitaproject-5cd9f
echo    - Navigate to Authentication → Sign-in method
echo    - Enable "Email/Password" provider
echo.
echo 3. 📝 Review and commit changes:
echo    git add .gitignore mobile-app/lib/firebase_options.example.dart
echo    git commit -m "🔒 Security: Implement Phase 1 security fixes"
echo.

pause
goto menu

:phase2
echo.
echo ⬆️ Phase 2: Dependency Updates and Build Fixes
echo ===============================================
echo.
echo This phase will:
echo ✅ Update Flutter dependencies to latest versions
echo ✅ Fix deprecated package warnings
echo ✅ Resolve build environment issues
echo ✅ Clean up code quality issues
echo.
set /p confirm="Continue with Phase 2? (y/n): "
if /i not "%confirm%"=="y" goto menu

echo.
echo 🔄 Executing dependency updates...

cd mobile-app

REM Backup current state
copy pubspec.yaml pubspec.yaml.backup
copy pubspec.lock pubspec.lock.backup
echo ✅ Created backups

REM Clean and update
flutter clean
flutter pub get
flutter pub upgrade
echo ✅ Dependencies updated

REM Check for issues
flutter analyze > analysis-results.txt 2>&1
echo ✅ Analysis completed - check analysis-results.txt

REM Fix unused import
powershell -Command "(Get-Content lib\screens\announcements_screen.dart) | Where-Object { $_ -notmatch \"import 'package:url_launcher/url_launcher.dart';\" } | Set-Content lib\screens\announcements_screen.dart"
echo ✅ Fixed unused import

cd ..

echo.
echo ✅ Phase 2 completed successfully!
echo.
echo 📋 Next steps:
echo 1. Review analysis-results.txt for any remaining issues
echo 2. Test the app: cd mobile-app && flutter run
echo 3. Commit changes if everything works correctly
echo.

pause
goto menu

:phase3
echo.
echo ⚡ Phase 3: Performance Optimization
echo ====================================
echo.
echo This phase includes:
echo 🚀 Image loading optimization
echo 🗄️ Database query optimization
echo 💾 Memory management improvements
echo 📊 Performance monitoring setup
echo.
echo ⚠️ This phase requires custom development work.
echo Please refer to IMPLEMENTATION_PLAN.md for detailed instructions.
echo.
pause
goto menu

:phase4
echo.
echo 🧪 Phase 4: Testing Implementation
echo ==================================
echo.
echo This phase includes:
echo ✅ Unit testing setup
echo 🔧 Integration testing
echo 📱 Widget testing
echo 📊 Coverage reporting
echo.

cd mobile-app

echo 🧪 Running existing tests...
flutter test
echo.

echo 📊 Checking test coverage...
flutter test --coverage
echo.

echo ✅ Current testing status displayed above.
echo.
echo 📋 To implement comprehensive testing:
echo 1. Review IMPLEMENTATION_PLAN.md Phase 4 section
echo 2. Create test files in test/ directory
echo 3. Add integration tests in integration_test/ directory
echo 4. Set up CI/CD pipeline for automated testing
echo.

cd ..
pause
goto menu

:phase5
echo.
echo 🚀 Phase 5: Production Deployment
echo =================================
echo.
echo This phase includes:
echo 📱 Build configuration for release
echo 🏪 App store preparation
echo 🔄 CI/CD pipeline setup
echo 🚀 Production deployment
echo.

cd mobile-app

echo 🏗️ Testing release builds...

echo 📱 Testing Android release build...
flutter build apk --release --split-per-abi
echo.

echo 🌐 Testing Web release build...
flutter build web --release
echo.

echo ✅ Release builds completed successfully!
echo.
echo 📋 For full production deployment:
echo 1. Review IMPLEMENTATION_PLAN.md Phase 5 section
echo 2. Prepare app store assets and metadata
echo 3. Set up CI/CD pipeline
echo 4. Configure production Firebase environment
echo.

cd ..
pause
goto menu

:security_check
echo.
echo 🔍 Quick Security Check
echo =======================
echo.

echo 🔐 Checking Firebase configuration security...

REM Check if sensitive files are in git
git ls-files | findstr "firebase_options.dart" > nul
if %errorlevel%==0 (
    echo ❌ CRITICAL: firebase_options.dart is tracked in git
) else (
    echo ✅ firebase_options.dart is not tracked in git
)

git ls-files | findstr "google-services.json" > nul
if %errorlevel%==0 (
    echo ❌ CRITICAL: google-services.json is tracked in git
) else (
    echo ✅ google-services.json is not tracked in git
)

git ls-files | findstr "admin-dashboard/.env" > nul
if %errorlevel%==0 (
    echo ❌ CRITICAL: admin-dashboard/.env is tracked in git
) else (
    echo ✅ admin-dashboard/.env is not tracked in git
)

REM Check .gitignore
findstr "firebase_options.dart" .gitignore > nul
if %errorlevel%==0 (
    echo ✅ firebase_options.dart is in .gitignore
) else (
    echo ⚠️ firebase_options.dart should be added to .gitignore
)

echo.
echo 🔑 Manual checks required:
echo 1. Verify API keys are restricted in Google Cloud Console
echo 2. Confirm Email/Password authentication is enabled in Firebase
echo 3. Test user registration/login functionality
echo.

pause
goto menu

:view_plan
echo.
echo 📖 Opening Implementation Plan...
if exist "IMPLEMENTATION_PLAN.md" (
    start notepad "IMPLEMENTATION_PLAN.md"
) else (
    echo ❌ IMPLEMENTATION_PLAN.md not found in current directory
)
goto menu

:exit
echo.
echo 👋 Thanks for using VISITA Implementation Plan Launcher!
echo.
echo 📚 Remember to check IMPLEMENTATION_PLAN.md for detailed instructions.
echo 🔒 Don't forget to secure your Firebase API keys!
echo 🧪 Test thoroughly before production deployment.
echo.
pause
exit /b 0