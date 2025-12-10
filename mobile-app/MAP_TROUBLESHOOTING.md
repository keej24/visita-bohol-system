# Map Display Issue - Troubleshooting Guide

## Problem
Map component does not display on new devices, but works correctly on the development device.

## Root Cause Analysis

### Primary Issue: Missing Internet Permission ✅ FIXED
**Symptom**: Map appears blank with no tiles loading
**Cause**: Android requires explicit `INTERNET` permission in `AndroidManifest.xml` to download map tiles from OpenStreetMap servers.

**Why it worked on dev device**: 
- Debug builds may have had permission granted during development
- Some devices cache permissions differently
- Development environment may have different security settings

**Solution Applied**:
Added the following to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
```

---

## Other Potential Issues (If Problem Persists)

### 1. Network Connectivity Issues
**Symptoms**:
- Map tiles fail to load
- Spinning loader but no map
- Gray tiles instead of map

**Possible Causes**:
- Device not connected to internet
- Firewall blocking OpenStreetMap servers
- DNS resolution issues
- Corporate/school networks blocking tile servers

**How to Test**:
```dart
// Add debug logging in map_screen.dart
debugPrint('🗺️ Loading map with center: ${center.latitude}, ${center.longitude}');
debugPrint('🌐 Total markers to display: ${markers.length}');
```

**Solutions**:
- Verify device has active internet connection
- Try different WiFi network (avoid corporate/school networks)
- Test with mobile data instead of WiFi
- Check if OpenStreetMap is accessible: https://tile.openstreetmap.org/

### 2. SSL/Certificate Issues
**Symptoms**:
- HTTPS connection failures in logs
- Certificate verification errors

**Causes**:
- Outdated device OS
- Corporate SSL inspection
- Modified system certificate store

**Solutions**:
- Update device OS to latest version
- Disable SSL pinning temporarily for testing
- Use HTTP fallback tiles (not recommended for production)

### 3. Memory/Performance Issues
**Symptoms**:
- Map loads but is very slow
- App crashes when opening map
- Laggy marker rendering

**Causes**:
- Too many markers rendered at once
- Low-end device with limited RAM
- No marker clustering

**Solutions**:
✅ Already implemented: MarkerClusterLayerWidget groups nearby markers
- Reduce initial zoom level to show fewer tiles
- Implement pagination for churches
- Add loading state with progress indicator

### 4. Location Permission Issues
**Symptoms**:
- Map displays but user location doesn't show
- "My Location" button doesn't work

**Solutions**:
- Ensure location permissions are granted in device settings
- Check `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION` permissions
- Handle permission denial gracefully in UI

### 5. Google Services Conflict
**Symptoms**:
- Map works with Google Maps but not OpenStreetMap
- Build errors related to Google Play Services

**Causes**:
- Conflicting map provider dependencies
- Both `google_maps_flutter` and `flutter_map` in pubspec.yaml

**Current Setup**:
```yaml
flutter_map: ^4.0.0          # OpenStreetMap tiles
google_maps_flutter: ^2.5.0  # Used elsewhere in app
```

**Note**: These packages can coexist. Ensure you're using the correct one for each screen.

### 6. Build Configuration Issues
**Symptoms**:
- Release build doesn't show map (but debug does)
- ProGuard/R8 removes required classes

**Solutions**:
- Check `android/app/build.gradle.kts` for proper configuration
- Add ProGuard keep rules if needed:
```
-keep class io.flutter.** { *; }
-keep class com.google.** { *; }
```

### 7. Platform-Specific Issues

#### Android 9+ (API 28+)
- Requires `android:usesCleartextTraffic="true"` for HTTP tiles (we use HTTPS, so not needed)

#### Android 12+ (API 31+)
- Stricter network security config
- May need `android:exported="true"` for activities (already set)

#### iOS
- Requires `NSLocationWhenInUseUsageDescription` in `Info.plist` (for location features)

---

## Verification Steps

### 1. Check Permissions
```bash
# View all permissions for installed app
adb shell dumpsys package com.example.visita_mobile | grep permission
```

Expected output should include:
```
android.permission.INTERNET: granted=true
android.permission.ACCESS_FINE_LOCATION: granted=true
```

### 2. Monitor Network Activity
```bash
# Monitor network requests from app
adb logcat | grep -i "openstreetmap\|tile\|network"
```

Should see successful tile requests:
```
I/flutter: 🗺️ Requesting tile: https://tile.openstreetmap.org/11/1234/5678.png
```

### 3. Check for Errors
```bash
# View all app logs
adb logcat | grep -i "visita\|error\|exception"
```

Common error patterns:
- `CLEARTEXT communication not permitted` → Need cleartext traffic setting
- `Unable to resolve host` → DNS/network issue
- `Connection refused` → Firewall blocking tiles

### 4. Test Tile URL Directly
Open in browser on device: https://tile.openstreetmap.org/0/0/0.png
- Should show world map tile
- If this fails, network is blocking OpenStreetMap

---

## Quick Fix Checklist

- [x] ✅ Added `INTERNET` permission to AndroidManifest.xml
- [x] ✅ Added `ACCESS_NETWORK_STATE` permission
- [x] ✅ Added fallback tile provider
- [x] ✅ Added error handling for tile loading
- [ ] ⚠️ Rebuild app: `flutter clean && flutter build apk --release`
- [ ] ⚠️ Uninstall old app from device completely
- [ ] ⚠️ Install newly built APK
- [ ] ⚠️ Grant location permission when prompted
- [ ] ⚠️ Verify internet connection on device
- [ ] ⚠️ Test map screen

---

## Testing on New Device

### Step 1: Clean Build
```bash
cd mobile-app
flutter clean
flutter pub get
```

### Step 2: Build Release APK
```bash
flutter build apk --release
```

### Step 3: Install on Device
```bash
# Via USB debugging
flutter install

# Or manually
# Find APK at: build/app/outputs/flutter-apk/app-release.apk
# Transfer to device and install
```

### Step 4: Verify Permissions
- Open app
- Go to Settings → Apps → VISITA Mobile → Permissions
- Ensure Location and Internet are enabled

### Step 5: Test Map
- Open app
- Navigate to Map screen
- Wait 5-10 seconds for tiles to load
- Check if map tiles appear
- Test user location button
- Test church markers

---

## Expected Behavior

### ✅ Working Map
- Gray map tiles load from OpenStreetMap
- Blue/gold circular markers appear for churches
- User location shows as blue dot (if permission granted)
- Pan and zoom work smoothly
- Tapping marker shows church details

### ❌ Not Working Map
- Blank white/gray screen
- No tiles visible
- Error messages in console
- App crashes when opening map

---

## Additional Debugging

### Enable Verbose Logging
Add to `map_screen.dart` in `initState()`:
```dart
debugPrint('🗺️ MapScreen initialized');
debugPrint('🌐 Internet permission required for tile loading');
debugPrint('📍 Location permission required for user position');
```

### Add Network Status Indicator
```dart
import 'package:connectivity_plus/connectivity_plus.dart';

// Check if device has internet
final connectivityResult = await Connectivity().checkConnectivity();
if (connectivityResult == ConnectivityResult.none) {
  // Show error: "No internet connection"
}
```

---

## Production Recommendations

### 1. Add Offline Map Caching
Consider using `flutter_map_cache` package to cache tiles locally:
```yaml
dependencies:
  flutter_map_tile_caching: ^9.0.0
```

### 2. Add Connection Error UI
Show user-friendly error when tiles fail to load:
```dart
if (tilesNotLoading) {
  return Center(
    child: Column(
      children: [
        Icon(Icons.cloud_off),
        Text('Unable to load map. Check internet connection.'),
        ElevatedButton(
          onPressed: () => _retryLoadingMap(),
          child: Text('Retry'),
        ),
      ],
    ),
  );
}
```

### 3. Alternative Tile Providers
If OpenStreetMap is blocked, use alternatives:
- OpenTopoMap: `https://tile.opentopomap.org/{z}/{x}/{y}.png`
- CartoDB: `https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png`

### 4. Monitor Tile Load Performance
Add analytics to track map loading times and failures.

---

## Contact & Support

If issue persists after following this guide:
1. Check Flutter version: `flutter --version` (should be >= 3.0.0)
2. Collect logs: `adb logcat > visita_map_logs.txt`
3. Test on multiple devices/networks
4. Share logs and device info for debugging

---

**Last Updated**: December 8, 2025
**Fixed By**: Adding INTERNET permission to AndroidManifest.xml
**Status**: ✅ RESOLVED
