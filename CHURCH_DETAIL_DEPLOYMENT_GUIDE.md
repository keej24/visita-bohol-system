# Church Detail Screen - Quick Deployment Guide

**Status:** ✅ Enhanced file created and ready for deployment
**File:** `mobile-app/lib/screens/church_detail_screen_enhanced.dart`

---

## 🚀 Quick Start (5 Steps)

### Step 1: Add Parish Priest Field to Church Model

Edit **`mobile-app/lib/models/church.dart`**:

```dart
class Church {
  final String id;
  final String name;
  final String location;
  final double? latitude;
  final double? longitude;
  final int? foundingYear;
  final ArchitecturalStyle architecturalStyle;
  final HeritageClassification heritageClassification;
  final String? history;
  final List<String> images;
  final bool isHeritage;
  final String diocese;
  final String? virtualTourUrl;
  final String status;
  final String? assignedPriest; // ← ADD THIS LINE

  Church({
    required this.id,
    required this.name,
    required this.location,
    this.latitude,
    this.longitude,
    this.foundingYear,
    this.architecturalStyle = ArchitecturalStyle.other,
    this.heritageClassification = HeritageClassification.none,
    this.history,
    this.images = const [],
    this.isHeritage = false,
    this.diocese = 'Diocese of Tagbilaran',
    this.virtualTourUrl,
    this.status = 'approved',
    this.assignedPriest, // ← ADD THIS LINE
  });

  factory Church.fromJson(Map<String, dynamic> j) => Church(
    id: j['id'] ?? '',
    name: j['name'] ?? '',
    location: j['location'] ?? '',
    foundingYear: j['foundingYear'] != null ? j['foundingYear'] as int : null,
    architecturalStyle: ArchitecturalStyleX.fromLabel(j['architecturalStyle']),
    heritageClassification: j['heritageClassification'] != null
        ? HeritageClassificationX.fromLabel(j['heritageClassification'])
        : (j['isHeritage'] == true
            ? HeritageClassification.icp
            : HeritageClassification.none),
    history: j['history'],
    images: _parseImages(j['images']),
    isHeritage: j['isHeritage'] ?? false,
    latitude: j['latitude'] != null ? (j['latitude'] as num).toDouble() : null,
    longitude: j['longitude'] != null ? (j['longitude'] as num).toDouble() : null,
    diocese: j['diocese'] ?? 'Diocese of Tagbilaran',
    virtualTourUrl: j['virtualTourUrl'],
    status: j['status'] ?? 'approved',
    assignedPriest: j['assignedPriest'], // ← ADD THIS LINE
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'location': location,
    'foundingYear': foundingYear,
    'architecturalStyle': architecturalStyle.label,
    'heritageClassification': heritageClassification.label,
    'history': history,
    'images': images,
    'isHeritage': isHeritage,
    'latitude': latitude,
    'longitude': longitude,
    'diocese': diocese,
    'virtualTourUrl': virtualTourUrl,
    'status': status,
    'assignedPriest': assignedPriest, // ← ADD THIS LINE
  };

  // ... rest of the class remains the same
}
```

---

### Step 2: Update Enhanced File to Use Priest Field

Edit **`mobile-app/lib/screens/church_detail_screen_enhanced.dart`** at line 244:

```dart
// FIND (around line 244):
final String? priestName = null; // TODO: widget.church.assignedPriest

// REPLACE WITH:
final String? priestName = widget.church.assignedPriest;
```

---

### Step 3: Backup and Replace Current File

**Option A: Complete Replacement (Recommended)**

```bash
cd mobile-app/lib/screens

# Backup old file
cp church_detail_screen.dart church_detail_screen_old.dart

# Replace with enhanced version
cp church_detail_screen_enhanced.dart church_detail_screen.dart

# Clean up
# (keep church_detail_screen_enhanced.dart as backup)
```

**Option B: Side-by-Side Testing (Safe Approach)**

Keep both files and update imports in files that use ChurchDetailScreen:

```dart
// Update imports in files like:
// - home_screen.dart
// - churchs_list_screen.dart
// - map_screen.dart
// etc.

// OLD:
// import '../screens/church_detail_screen.dart';

// NEW (temporary for testing):
import '../screens/church_detail_screen_enhanced.dart';
```

---

### Step 4: Test Compilation

```bash
cd mobile-app

# Get dependencies (should already be installed)
flutter pub get

# Analyze for errors
flutter analyze

# Expected output: No issues found!
```

---

### Step 5: Run and Test the App

```bash
flutter run
```

**Testing Checklist:**

#### Visual Features:
- [ ] ✅ Photo carousel displays and auto-plays every 5 seconds
- [ ] ✅ Photo indicators show current position
- [ ] ✅ Parish priest section appears (if data exists)
- [ ] ✅ All 4 action buttons render correctly
- [ ] ✅ Tab bar displays with 4 tabs

#### Functional Features:
- [ ] ✅ **Map button** opens Google/Apple Maps
- [ ] ✅ **360° Tour button** opens virtual tour (if URL exists)
- [ ] ✅ **For Visit button** toggles wishlist state
- [ ] ✅ **Mark Visited button** shows loading spinner during GPS check

#### Tab Navigation:
- [ ] ✅ **History tab** shows founding info and history text
- [ ] ✅ **Mass tab** has "View Full Schedule" button
- [ ] ✅ **Announcements tab** loads parish announcements
- [ ] ✅ **Reviews tab** shows reviews and "Write a Review" button

#### GPS Validation (Must test at actual church location):
- [ ] ✅ Within 100m: Successfully marks as visited
- [ ] ✅ Beyond 100m: Shows distance feedback
- [ ] ✅ Loading spinner appears during GPS check
- [ ] ✅ Success message shows after marking visited

---

## 📝 Optional: Update Firestore Data

To populate parish priest information for existing churches:

### Using Firebase Console:
1. Go to Firebase Console → Firestore Database
2. Navigate to `churches` collection
3. Select a church document
4. Click "Add field"
5. Field name: `assignedPriest`
6. Field value: `"Rev. Fr. John Doe"` (example)
7. Click "Update"

### Using Admin Dashboard:
Add priest field to church edit form in:
- `admin-dashboard/src/components/forms/ChurchForm.tsx`

### Bulk Update Script (if needed):
```javascript
// Run in Firebase Console or Node.js with firebase-admin
const admin = require('firebase-admin');
const db = admin.firestore();

const updateChurches = async () => {
  const churchesRef = db.collection('churches');
  const snapshot = await churchesRef.get();

  const batch = db.batch();

  snapshot.forEach(doc => {
    // Add default priest or leave empty
    batch.update(doc.ref, {
      assignedPriest: null // or specific priest name
    });
  });

  await batch.commit();
  console.log('Updated all churches with assignedPriest field');
};

updateChurches();
```

---

## 🔧 Troubleshooting

### Issue: Compilation errors after replacing file

**Solution:**
```bash
cd mobile-app
flutter clean
flutter pub get
flutter run
```

### Issue: "TabController is not defined"

**Solution:** Ensure the widget extends `StatefulWidget` with `SingleTickerProviderStateMixin`:
```dart
class _ChurchDetailScreenState extends State<ChurchDetailScreen>
    with SingleTickerProviderStateMixin {
  // ...
}
```

### Issue: "carousel_slider not found"

**Solution:** Verify in `pubspec.yaml`:
```yaml
dependencies:
  carousel_slider: ^5.0.0
```

Then run:
```bash
flutter pub get
```

### Issue: GPS validation not working

**Checklist:**
- [ ] Location permissions granted on device
- [ ] Location services enabled on device
- [ ] Testing at actual church location (within 100m)
- [ ] Church has valid latitude/longitude coordinates

### Issue: Priest section not showing

**Checklist:**
- [ ] Church model has `assignedPriest` field
- [ ] Firestore document has `assignedPriest` value
- [ ] Line 244 updated to use `widget.church.assignedPriest`
- [ ] Priest name is not null or empty

---

## 📊 Feature Verification Matrix

After deployment, verify all 10 features:

| # | Feature | Status | How to Test |
|---|---------|--------|-------------|
| 1 | Photo Carousel | ⬜ | Open church with multiple images, wait 5 seconds |
| 2 | Parish Priest | ⬜ | Open church with assigned priest, check section below header |
| 3 | Map Button | ⬜ | Tap "Map" button, verify external app opens |
| 4 | 360° Tour | ⬜ | Tap "360° Tour", verify tour screen opens |
| 5 | For Visit | ⬜ | Tap "Add to Wishlist", verify icon changes |
| 6 | History Tab | ⬜ | Open History tab, verify founding info displays |
| 7 | Mass Tab | ⬜ | Open Mass tab, verify schedule button works |
| 8 | Announcements | ⬜ | Open Announcements tab, verify announcements load |
| 9 | Reviews | ⬜ | Open Reviews tab, verify reviews display |
| 10 | Mark Visited | ⬜ | At church location, tap "Mark Visited" |

---

## ✅ Deployment Complete Checklist

- [ ] Church model updated with `assignedPriest` field
- [ ] Enhanced file updated to use priest field (line 244)
- [ ] Old file backed up
- [ ] Enhanced file replaces old file (or imports updated)
- [ ] `flutter pub get` executed
- [ ] `flutter analyze` shows no errors
- [ ] App runs without crashes
- [ ] All 10 features tested and working
- [ ] GPS validation tested at actual church
- [ ] Parish priest data added to Firestore (optional)

---

## 🎉 Success!

Once all checklist items are complete, your enhanced Church Detail screen is **live in production**!

**Key Improvements Delivered:**
- 📸 Beautiful photo carousel
- 👤 Parish priest information
- 🗺️ One-tap map navigation
- 🌐 360° virtual tour integration
- 📌 Wishlist functionality
- 📑 Organized tabbed interface
- ⭐ Live reviews and announcements
- 📍 GPS-validated visit tracking

**Need Help?**
- See full implementation details in `CHURCH_DETAIL_ENHANCED_IMPLEMENTATION.md`
- Review current status in `CHURCH_DETAIL_CURRENT_STATUS.md`
- Check issues fixed in `CHURCH_DETAIL_SCREEN_FIXES.md`

---

**Last Updated:** October 9, 2025
**Version:** 2.0 (Enhanced)
**Status:** Production Ready ✅
