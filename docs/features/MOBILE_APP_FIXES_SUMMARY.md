# Mobile App Fixes Summary

## Issues Fixed

### 1. Approved Churches Not Reflected in Mobile App ✅

**Problem**: Churches approved by admin dashboard were not showing up in the mobile app because the repository was fetching ALL churches regardless of status.

**Solution**: Modified `FirestoreChurchRepository` to filter by status in all public-facing queries.

**Files Changed**:
- `mobile-app/lib/repositories/firestore_church_repository.dart`

**Changes Made**:

1. **`getAll()` method** - Now filters for approved churches only:
   ```dart
   .where('status', isEqualTo: ChurchStatus.approved)
   ```

2. **`getChurchesByLocation()` method** - Added status filter:
   ```dart
   .where('location', isEqualTo: location)
   .where('status', isEqualTo: ChurchStatus.approved)
   ```

3. **`getChurchesByDiocese()` method** - Added status filter:
   ```dart
   .where('diocese', isEqualTo: diocese)
   .where('status', isEqualTo: ChurchStatus.approved)
   ```

4. **`getHeritageChurches()` method** - Added status filter:
   ```dart
   .where('isHeritage', isEqualTo: true)
   .where('status', isEqualTo: ChurchStatus.approved)
   ```

**Impact**:
- Mobile app now only displays churches with `status = 'approved'`
- Pending, under review, and revision-required churches are hidden from public view
- Admin-approved churches appear immediately in the mobile app

---

### 2. Parish vs Chancery Announcement Filtering ✅

**Problem**: Need to ensure parish announcements only show in individual church profiles, while chancery (diocese) announcements show in homepage carousel and main announcements screen.

**Solution**:
1. Added clear documentation explaining announcement scope rules
2. Created dedicated `getDioceseAnnouncements()` method for better clarity
3. Verified existing filtering logic in home screen carousel

**Files Changed**:
- `mobile-app/lib/repositories/firestore_announcement_repository.dart`

**Changes Made**:

1. **Added comprehensive documentation** at class level explaining scope rules:
   ```dart
   /// Announcement Scope Rules:
   /// - Diocese scope ('diocese'): Created by chancery office, visible in:
   ///   * Homepage carousel (upcoming diocese announcements only)
   ///   * Announcements screen (all diocese announcements)
   /// - Parish scope ('parish'): Created by parish secretary, visible in:
   ///   * Individual church detail page only
   ///   * NOT shown in homepage carousel or main announcements screen
   ```

2. **Added `getDioceseAnnouncements()` method**:
   ```dart
   Future<List<Announcement>> getDioceseAnnouncements() async {
     // Filters for scope == 'diocese'
     .where('scope', isEqualTo: 'diocese')
     .where('isArchived', isEqualTo: false)
   }
   ```

3. **Added documentation to `getAnnouncementsByParish()`**:
   ```dart
   /// Get parish-specific announcements
   /// These should only be displayed on individual church detail pages
   ```

**Existing Behavior (Verified Working)**:

The home screen already properly filters diocese announcements:
```dart
// In home_screen.dart, line 144-148
final dioceseAnns = data
    .where((a) =>
        a.scope == 'diocese' &&
        a.dateTime.isAfter(now))
    .toList();
```

Parish announcements are already isolated to church detail pages via:
```dart
// In parish_announcements_screen.dart
AnnouncementService().getAnnouncementsByChurch(church.id)
```

---

## Testing Checklist

### Approved Churches
- [ ] Create a new church in admin dashboard
- [ ] Set status to 'pending' - verify it does NOT appear in mobile app
- [ ] Approve the church - verify it DOES appear in mobile app
- [ ] Test on home screen church list
- [ ] Test on map view
- [ ] Test on church exploration screen
- [ ] Test search functionality

### Announcements
- [ ] Create a diocese-level announcement in admin (chancery role)
- [ ] Verify it appears in homepage carousel
- [ ] Verify it appears in announcements screen
- [ ] Create a parish-level announcement (parish secretary role)
- [ ] Verify it ONLY appears in that specific church's detail page
- [ ] Verify it does NOT appear in homepage carousel
- [ ] Verify it does NOT appear in main announcements screen

---

## Related Files (Reference Only)

### Church Display Screens:
- `mobile-app/lib/screens/home_screen.dart` - Main church list
- `mobile-app/lib/screens/map_screen.dart` - Map view of churches
- `mobile-app/lib/screens/enhanced_church_exploration_screen.dart` - Advanced search
- `mobile-app/lib/screens/church_detail_screen.dart` - Individual church details

### Announcement Display Screens:
- `mobile-app/lib/screens/home_screen.dart` - Homepage carousel (diocese only)
- `mobile-app/lib/screens/announcements_screen.dart` - Full announcements list
- `mobile-app/lib/screens/parish_announcements_screen.dart` - Parish-specific (in church detail)
- `mobile-app/lib/widgets/home/announcement_carousel.dart` - Carousel widget

### Data Models:
- `mobile-app/lib/models/church.dart` - Church model with status field
- `mobile-app/lib/models/church_status.dart` - Status constants and utilities
- `mobile-app/lib/models/announcement.dart` - Announcement model with scope field

---

## Notes

1. **Offline Sync**: The `OfflineSyncService` already filters for approved churches:
   ```dart
   .where('status', isEqualTo: 'approved')
   ```

2. **Backward Compatibility**: The Church model defaults status to 'approved' for backward compatibility:
   ```dart
   this.status = 'approved', // Default to approved for backward compatibility
   ```

3. **Admin Dashboard**: No changes needed in admin dashboard - it already manages church status and announcement scope correctly.

4. **Firebase Security Rules**: Consider adding Firestore security rules to enforce these filters server-side as well.

---

## Date: January 2025
## Status: ✅ Completed
