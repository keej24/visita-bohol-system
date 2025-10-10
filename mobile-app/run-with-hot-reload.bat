@echo off
echo.
echo ========================================
echo   VISITA Mobile App - Hot Reload Mode
echo ========================================
echo.
echo Starting Flutter on Chrome with hot reload enabled...
echo.
echo Hot Reload Commands:
echo   r - Hot reload (preserves state)
echo   R - Hot restart (resets state)
echo   q - Quit
echo.
echo ========================================
echo.

flutter run -d chrome --dart-define=FLUTTER_WEB_USE_SKIA=true

pause
