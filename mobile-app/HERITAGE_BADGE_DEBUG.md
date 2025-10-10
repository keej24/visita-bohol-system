# Heritage Badge Debug Guide

## Issue RESOLVED ✅
Heritage badges (ICP/NCT indicators) were not showing on church cards for heritage churches like "St. Joseph the Worker Parish" which was marked as ICP in the admin dashboard.

## ROOT CAUSE IDENTIFIED
The admin dashboard saves heritage classification to the `classification` field (line 440 in `ChurchProfileForm.tsx`), but the mobile app was only checking the `heritageClassification` field.

**Fix Applied**: Updated `Church.fromJson()` in `lib/models/church.dart` to check both fields:
```dart
final classificationValue = j['heritageClassification'] ?? j['classification'];
```

This ensures compatibility with the admin dashboard's field naming convention.

## Debug Logging Added

We've added comprehensive debug logging at multiple levels to diagnose the issue:

### 1. Firestore Repository Level
**File**: `lib/repositories/firestore_church_repository.dart`

When loading churches from Firestore, you'll see:
```
🏛️  [RAW DATA] St. Joseph the Worker Parish:
   - heritageClassification (raw): "Important Cultural Properties"
   - isHeritage: true

✅ [PARSED] St. Joseph the Worker Parish:
   - classification (enum): HeritageClassification.icp
   - isHeritage: true
```

### 2. Church Model Parsing Level
**File**: `lib/models/church.dart`

When parsing heritage classification from JSON:
```
🏛️ [St. Joseph the Worker Parish] Raw heritageClassification: "Important Cultural Properties"
🏛️ [St. Joseph the Worker Parish] Parsed to: HeritageClassification.icp
```

### 3. Enum Conversion Level
**File**: `lib/models/enums.dart`

When converting string to enum:
```
🔍 HeritageClassification.fromLabel: "Important Cultural Properties" -> "important cultural properties"
✅ Matched ICP
```

### 4. UI Rendering Level
**File**: `lib/widgets/home/church_card.dart`

When building church cards:
```
🎨 Building church card for: St. Joseph the Worker Parish
   - isHeritage: true
   - classification: HeritageClassification.icp

🏛️ Heritage Church: St. Joseph the Worker Parish - HeritageClassification.icp
```

## What to Look For

### Run the mobile app and check the Flutter console for:

1. **Check if data is being fetched correctly**:
   - Look for `🏛️  [RAW DATA]` messages showing the exact value from Firestore
   - Verify the heritage classification string matches what's in the admin dashboard

2. **Check if parsing is working**:
   - Look for `🔍 HeritageClassification.fromLabel` messages
   - Verify it shows `✅ Matched ICP` or `✅ Matched NCT`
   - If you see `⚠️ No match, returning none`, the string format doesn't match our expected values

3. **Check if UI is rendering**:
   - Look for `🎨 Building church card for` messages
   - This confirms the church card widget received the correct data
   - Look for `🏛️ Heritage Church` messages in the Wrap widget section

4. **Check the heritage filter**:
   - Toggle the "Heritage Sites" filter button
   - Verify heritage churches (ICP/NCT) are shown when filter is active

## Expected Values

The `fromLabel()` method in `enums.dart` handles these values (case-insensitive):

### For ICP:
- "icp"
- "important cultural property"
- "important cultural properties" ← **Admin dashboard uses this (plural)**

### For NCT:
- "nct"
- "national cultural treasure"
- "national cultural treasures" ← **Admin dashboard uses this (plural)**

## Possible Issues

If the badge still doesn't show after adding all this logging:

1. **Wrong Firestore value**: The admin dashboard might be saving a different string
   - Solution: Check the raw data logs and add the actual string to `fromLabel()`

2. **Status not approved**: Church might have wrong status
   - Solution: Check admin dashboard, ensure status is "approved"

3. **Network/Firestore issue**: Data not syncing properly
   - Solution: Clear app data and reload

4. **Build cache issue**: Old code still running
   - Solution: Run `flutter clean` and rebuild

## Files Modified

1. `lib/models/enums.dart` - Added plural form handling and debug logging
2. `lib/models/church.dart` - Added debug logging for parsing
3. `lib/repositories/firestore_church_repository.dart` - Added raw data logging
4. `lib/widgets/home/church_card.dart` - Added UI rendering debug logging
5. `lib/models/church_filter.dart` - Enhanced heritage filter to check both isHeritage and classification
6. `lib/screens/church_detail_screen.dart` - Added heritage badge to detail screen header

## Next Steps

1. Run the app: `flutter run`
2. Check the console output
3. Look for the debug messages listed above
4. Share the console output if the badge still doesn't appear
