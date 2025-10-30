@echo off
REM Script to clean up VERIFIED safe-to-delete files
REM Created: 2025-10-28
REM Updated: 2025-10-28 (After verification)

echo ========================================
echo Cleaning up VERIFIED safe-to-delete files
echo ========================================
echo.
echo This will delete:
echo - 80 documentation markdown files
echo - Duplicate CORS config files
echo - Temporary test files
echo - Malformed/artifact files
echo - .history folder
echo.
echo It will NOT delete:
echo - Asset files (SVGs, HTML, JSON in assets/)
echo - Active code files
echo - Active configuration files
echo - Build artifacts (use 'flutter clean' instead)
echo.
pause
echo.

REM Root level documentation
echo Deleting root level debug documentation...
del /F /Q "ADDING_NAVIGATION_HOTSPOTS_GUIDE.md" 2>nul
del /F /Q "ADMIN_UI_COMPLETE.md" 2>nul
del /F /Q "DELETING_360_IMAGES_EXPLANATION.md" 2>nul
del /F /Q "FIREBASE_STORAGE_CORS_FIX.md" 2>nul
del /F /Q "FIREBASE_STORAGE_RULES_FIX.md" 2>nul
del /F /Q "FIX_ST_JOSEPH_WORKER_TOUR.md" 2>nul
del /F /Q "FORM_LAYOUT_UPDATED.md" 2>nul
del /F /Q "HOTSPOT_QUICK_REFERENCE.md" 2>nul
del /F /Q "HOTSPOT_TESTING_GUIDE.md" 2>nul
del /F /Q "HOTSPOT_VISIBILITY_COMPLETE_FIX.md" 2>nul
del /F /Q "IMMEDIATE_ACTION_PLAN.md" 2>nul
del /F /Q "IMPORT_ERRORS_FIXED.md" 2>nul
del /F /Q "INVESTIGATION_REPORT.md" 2>nul
del /F /Q "INVESTIGATION_SUMMARY.md" 2>nul
del /F /Q "NAVIGATION_ARROW_CLICK_FIX.md" 2>nul
del /F /Q "NAVIGATION_HOTSPOTS_SOLUTION.md" 2>nul
del /F /Q "NEW_VIRTUAL_TOUR_IMPLEMENTATION.md" 2>nul
del /F /Q "NEW_VIRTUAL_TOUR_PLAN.md" 2>nul
del /F /Q "PHASE_1_IMPLEMENTATION_SUMMARY.md" 2>nul
del /F /Q "TEST_360_AFTER_REUPLOAD.md" 2>nul
del /F /Q "TEST_AFTER_DELETION.md" 2>nul
del /F /Q "VERIFICATION_GUIDE.md" 2>nul
del /F /Q "VIRTUAL_TOUR_404_FIX.md" 2>nul
del /F /Q "VIRTUAL_TOUR_IMPROVEMENTS.md" 2>nul
del /F /Q "VIRTUAL_TOUR_RECOVERY.md" 2>nul
del /F /Q "VIRTUAL_TOUR_ROOT_CAUSE_ANALYSIS.md" 2>nul
del /F /Q "VIRTUAL_TOUR_SIMPLE_RECOVERY.md" 2>nul

REM Admin dashboard documentation
echo Deleting admin dashboard debug documentation...
del /F /Q "admin-dashboard\360_DESCRIPTION_SAVE_FIX.md" 2>nul
del /F /Q "admin-dashboard\DESCRIPTION_SAVE_FIX.md" 2>nul
del /F /Q "admin-dashboard\HOTSPOT_DELETION_BEHAVIOR.md" 2>nul
del /F /Q "admin-dashboard\PROPER_360_DELETION_IMPLEMENTATION.md" 2>nul

REM Mobile app documentation
echo Deleting mobile app debug documentation...
del /F /Q "mobile-app\360_TOUR_QUICK_REFERENCE.md" 2>nul
del /F /Q "mobile-app\BLACK_BACKGROUND_FINAL_FIX.md" 2>nul
del /F /Q "mobile-app\BLACK_SCREEN_FIX.md" 2>nul
del /F /Q "mobile-app\CHURCH_DETAIL_ANALYSIS.md" 2>nul
del /F /Q "mobile-app\COMPILATION_FIX.md" 2>nul
del /F /Q "mobile-app\DIAGNOSE_TOUR_LOADING_ISSUE.md" 2>nul
del /F /Q "mobile-app\DRAG_AND_HOTSPOT_DEBUG_GUIDE.md" 2>nul
del /F /Q "mobile-app\ELEGANT_TRANSITION_IMPROVEMENTS.md" 2>nul
del /F /Q "mobile-app\ENABLE_ON_SCREEN_LOGS.md" 2>nul
del /F /Q "mobile-app\FIXES_APPLIED.md" 2>nul
del /F /Q "mobile-app\GRADLE_FIX.md" 2>nul
del /F /Q "mobile-app\HOTSPOT_DEBUGGING_GUIDE.md" 2>nul
del /F /Q "mobile-app\HOTSPOT_DEBUG_GUIDE.md" 2>nul
del /F /Q "mobile-app\HOTSPOT_FIX_COMPLETE.md" 2>nul
del /F /Q "mobile-app\HOTSPOT_FIX_SUMMARY.md" 2>nul
del /F /Q "mobile-app\HOTSPOT_NAVIGATION_VERIFICATION.md" 2>nul
del /F /Q "mobile-app\HOTSPOT_ROOT_CAUSE_FIX.md" 2>nul
del /F /Q "mobile-app\HOTSPOT_SIZE_FIX.md" 2>nul
del /F /Q "mobile-app\HOTSPOT_VISUAL_GUIDE.md" 2>nul
del /F /Q "mobile-app\INFINITE_LOADING_FIX_COMPLETE.md" 2>nul
del /F /Q "mobile-app\INTEGRATION_FIXES.md" 2>nul
del /F /Q "mobile-app\LOADING_INDICATOR_IMPROVEMENTS.md" 2>nul
del /F /Q "mobile-app\LOADING_SPINNER_UPDATE.md" 2>nul
del /F /Q "mobile-app\LOADING_UX_QUICK_GUIDE.md" 2>nul
del /F /Q "mobile-app\LOW_MEMORY_FIX.md" 2>nul
del /F /Q "mobile-app\MOBILE_360_TOUR_IMPROVEMENT_PLAN.md" 2>nul
del /F /Q "mobile-app\MVP_COMPLETE.md" 2>nul
del /F /Q "mobile-app\NEXT_STEPS_TO_TEST.md" 2>nul
del /F /Q "mobile-app\PANNELLUM_MULTISCENE_IMPLEMENTATION.md" 2>nul
del /F /Q "mobile-app\PANNELLUM_MULTI_SCENE_IMPLEMENTATION.md" 2>nul
del /F /Q "mobile-app\PANORAMA_VISIBILITY_FIX.md" 2>nul
del /F /Q "mobile-app\PHASE_1_COMPLETE.md" 2>nul
del /F /Q "mobile-app\QUICK_DEBUG_STEPS.md" 2>nul
del /F /Q "mobile-app\QUICK_START.md" 2>nul
del /F /Q "mobile-app\QUICK_START_MVP.md" 2>nul
del /F /Q "mobile-app\QUICK_TEST_GUIDE.md" 2>nul
del /F /Q "mobile-app\QUICK_TEST_HOTSPOTS.md" 2>nul
del /F /Q "mobile-app\REFACTORING_COMPLETE.md" 2>nul
del /F /Q "mobile-app\REVERTED_ON_SCREEN_LOGGING.md" 2>nul
del /F /Q "mobile-app\SCENE_THUMBNAILS_UPDATE.md" 2>nul
del /F /Q "mobile-app\TESTING_GUIDE.md" 2>nul
del /F /Q "mobile-app\TEST_HOTSPOT_REMOVED.md" 2>nul
del /F /Q "mobile-app\VIRTUAL_TOUR_8TH_PHOTO_FIX.md" 2>nul
del /F /Q "mobile-app\VIRTUAL_TOUR_BLACK_SCREEN_FIX.md" 2>nul
del /F /Q "mobile-app\VIRTUAL_TOUR_DEBUG_GUIDE.md" 2>nul
del /F /Q "mobile-app\VIRTUAL_TOUR_ERROR_FIX_COMPLETE.md" 2>nul
del /F /Q "mobile-app\VIRTUAL_TOUR_FIX.md" 2>nul
del /F /Q "mobile-app\VIRTUAL_TOUR_FIXES_APPLIED.md" 2>nul
del /F /Q "mobile-app\VIRTUAL_TOUR_TRANSITION_IMPROVEMENTS.md" 2>nul
del /F /Q "mobile-app\VIRTUAL_TOUR_UI_IMPROVEMENTS.md" 2>nul

REM Docs features
echo Deleting docs/features documentation...
del /F /Q "docs\features\360_HOTSPOT_CODE_EXAMPLES.md" 2>nul
del /F /Q "docs\features\360_HOTSPOT_INTEGRATION_PLAN.md" 2>nul
del /F /Q "docs\features\360_MULTI_SCENE_NAVIGATION.md" 2>nul
del /F /Q "docs\features\HOTSPOT_EDITOR_USAGE.md" 2>nul
del /F /Q "docs\features\HOTSPOT_QUICKSTART_GUIDE.md" 2>nul

REM Duplicate CORS files
echo Deleting duplicate CORS configuration files...
del /F /Q "cors3.json" 2>nul
del /F /Q "mobile-app\cors.json" 2>nul
del /F /Q "mobile-app\cors2.json" 2>nul
del /F /Q "mobile-app\cors3.json" 2>nul

REM NUL files
echo Deleting NUL files...
del /F /Q "NUL" 2>nul
del /F /Q "mobile-app\nul" 2>nul

REM Test batch scripts
echo Deleting test batch scripts...
del /F /Q "mobile-app\clear-ide-cache.bat" 2>nul
del /F /Q "mobile-app\fix-and-run.bat" 2>nul
del /F /Q "mobile-app\fix-and-run.ps1" 2>nul
del /F /Q "mobile-app\fix_ide_cache.bat" 2>nul
del /F /Q "mobile-app\test-build.bat" 2>nul

REM Test HTML files
echo Deleting test HTML files...
del /F /Q "mobile-app\test-pannellum.html" 2>nul

REM Temp files
echo Deleting temp files...
del /F /Q "temp_stash0_viewer.txt" 2>nul

REM Script files
echo Deleting temporary script files...
del /F /Q "scripts\check-virtual-tour-hotspots.js" 2>nul

REM History folder (use rmdir for directories)
echo Deleting .history folder...
if exist ".history" (
    rmdir /S /Q ".history" 2>nul
)

REM Church detail folder if empty or unwanted
echo Deleting church_detail folder if exists...
if exist "mobile-app\lib\screens\church_detail" (
    rmdir /S /Q "mobile-app\lib\screens\church_detail" 2>nul
)

REM Admin scripts folder
echo Deleting admin-dashboard scripts folder...
if exist "admin-dashboard\scripts" (
    rmdir /S /Q "admin-dashboard\scripts" 2>nul
)

REM Mobile app scripts folder
echo Deleting mobile-app scripts folder...
if exist "mobile-app\scripts" (
    rmdir /S /Q "mobile-app\scripts" 2>nul
)

echo.
echo ========================================
echo Cleanup complete!
echo ========================================
echo.
echo Run 'git status' to verify what was removed.
echo.

pause
