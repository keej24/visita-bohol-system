# How to Change the VISITA App Logo

## Quick Guide

### Step 1: Prepare Your Logo
1. Create a **1024x1024 px PNG** image of your logo
2. Ensure it has a transparent background (or solid color background)
3. Make sure the logo looks good when scaled down to small sizes (48x48px)

### Step 2: Add Logo to Assets
1. Save your logo as `app_icon.png`
2. Place it in: `mobile-app/assets/images/app_icon.png`

### Step 3: Optional - Create Adaptive Icon (Android)
For better Android experience with adaptive icons:
1. Create a foreground layer: `app_icon_foreground.png` (1024x1024 px)
   - This should be your logo with extra padding (about 25% on all sides)
2. Place it in: `mobile-app/assets/images/app_icon_foreground.png`
3. The background color is set in `pubspec.yaml` (currently white)

### Step 4: Generate Icons
Run these commands in the mobile-app directory:

```powershell
# Install dependencies
flutter pub get

# Generate launcher icons for Android and iOS
flutter pub run flutter_launcher_icons
```

### Step 5: Rebuild the App
```powershell
# For Android
flutter build apk --release

# For iOS (macOS only)
flutter build ios --release

# Or just run to test
flutter run
```

## Configuration Location

The icon configuration is in `pubspec.yaml`:

```yaml
flutter_launcher_icons:
  android: true
  ios: true
  image_path: "assets/images/app_icon.png"
  adaptive_icon_background: "#FFFFFF"
  adaptive_icon_foreground: "assets/images/app_icon_foreground.png"
  remove_alpha_ios: true
```

## Troubleshooting

### Icons not updating?
1. Clean the build: `flutter clean`
2. Regenerate icons: `flutter pub run flutter_launcher_icons`
3. Rebuild the app completely

### Wrong icon shows on device?
- Uninstall the old app from the device first
- Then reinstall with the new build

### Want different icons for Android/iOS?
Modify the configuration:
```yaml
flutter_launcher_icons:
  android: "launcher_icon"
  ios: true
  image_path_android: "assets/images/android_icon.png"
  image_path_ios: "assets/images/ios_icon.png"
```

## Design Tips

1. **Keep it simple** - Complex logos don't scale well to small sizes
2. **High contrast** - Ensure logo is visible on different backgrounds
3. **Test on real devices** - Check how it looks on actual Android/iOS home screens
4. **Adaptive icons** - Consider creating a special Android adaptive icon version
5. **No text** - Avoid small text that becomes unreadable when scaled

## Current Logo Location

Your logo files will be automatically generated in:
- **Android**: `android/app/src/main/res/mipmap-*/ic_launcher.png`
- **iOS**: `ios/Runner/Assets.xcassets/AppIcon.appiconset/`

These are auto-generated - don't edit them manually!
