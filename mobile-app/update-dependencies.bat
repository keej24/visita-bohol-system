@echo off
REM =============================================================================
REM Update Mobile App Dependencies After Email Migration
REM =============================================================================
REM
REM This script updates Flutter dependencies after removing cloud_functions
REM Run this script from the mobile-app directory
REM
REM Author: VISITA Development Team
REM Date: January 2026
REM =============================================================================

echo.
echo ====================================================================
echo VISITA Mobile App - Dependency Update
echo ====================================================================
echo.
echo This will update your Flutter dependencies after email migration...
echo.

REM Check if we're in the right directory
if not exist "pubspec.yaml" (
    echo ERROR: pubspec.yaml not found!
    echo Please run this script from the mobile-app directory.
    echo.
    pause
    exit /b 1
)

echo [1/3] Cleaning Flutter build cache...
flutter clean
if errorlevel 1 (
    echo ERROR: Flutter clean failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Getting updated dependencies...
flutter pub get
if errorlevel 1 (
    echo ERROR: Flutter pub get failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Verifying installation...
flutter doctor
if errorlevel 1 (
    echo WARNING: Flutter doctor found issues.
    echo You may need to fix these before running the app.
)

echo.
echo ====================================================================
echo SUCCESS! Dependencies updated successfully.
echo ====================================================================
echo.
echo Changes applied:
echo   - Removed cloud_functions package (not used)
echo   - Cleaned up auth_service.dart imports
echo   - Removed redundant fallback methods
echo.
echo The app still uses Firebase Auth for password reset emails.
echo No functional changes - everything works the same way!
echo.
echo Next steps:
echo   1. Test password reset: flutter run
echo   2. Go to Forgot Password screen
echo   3. Enter an email and verify reset email arrives
echo.
echo See docs/EMAIL_SETUP_GUIDE.md for more details.
echo.
pause
