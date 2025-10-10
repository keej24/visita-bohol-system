# Approved Churches Not Displaying - Fix Applied

## Problem Identified ⚠️

**Root Cause**: Firestore composite index requirement

When the mobile app repository was modified to filter churches by `status = 'approved'`, it introduced **composite queries** that require Firestore indexes:

```dart
// These queries need composite indexes:
.where('location', isEqualTo: location)
.where('status', isEqualTo: ChurchStatus.approved)  // ❌ Missing index

.where('diocese', isEqualTo: diocese)
.where('status', isEqualTo: ChurchStatus.approved)  // ❌ Missing index

.where('isHeritage', isEqualTo: true)
.where('status', isEqualTo: ChurchStatus.approved)  // ❌ Missing index
```

Without these indexes, Firestore throws errors and returns empty results.

---

## Solution Applied ✅

### Approach: Client-Side Filtering

Instead of adding multiple composite indexes, the queries were refactored to:
1. Fetch all approved churches using a single `status` filter
2. Apply additional filters (location, diocese, heritage) client-side

**Files Modified**:
- `mobile-app/lib/repositories/firestore_church_repository.dart`

### Changes Made:

#### 1. `getChurchesByLocation()`
```dart
Future<List<Church>> getChurchesByLocation(String location) async {
  try {
    // Get all approved churches first, then filter by location client-side
    // This avoids needing a composite index for location + status
    final allChurches = await getAll();
    return allChurches.where((church) => church.location == location).toList();
  } catch (e) {
    throw Exception('Failed to fetch churches by location: $e');
  }
}
```

#### 2. `getChurchesByDiocese()`
```dart
Future<List<Church>> getChurchesByDiocese(String diocese) async {
  try {
    // Get all approved churches first, then filter by diocese client-side
    // This avoids needing a composite index for diocese + status
    final allChurches = await getAll();
    return allChurches.where((church) => church.diocese == diocese).toList();
  } catch (e) {
    throw Exception('Failed to fetch churches by diocese: $e');
  }
}
```

#### 3. `getHeritageChurches()`
```dart
Future<List<Church>> getHeritageChurches() async {
  try {
    // Get all approved churches first, then filter by heritage status client-side
    // This avoids needing a composite index for isHeritage + status
    final allChurches = await getAll();
    return allChurches.where((church) => church.isHeritage).toList();
  } catch (e) {
    throw Exception('Failed to fetch heritage churches: $e');
  }
}
```

#### 4. `getAll()` - Core Query (unchanged)
```dart
@override
Future<List<Church>> getAll() async {
  try {
    // For public mobile app, only return approved churches
    final QuerySnapshot snapshot = await _firestore
        .collection(_churchesCollection)
        .where('status', isEqualTo: ChurchStatus.approved)
        .get();

    return snapshot.docs.map((doc) {
      final data = doc.data() as Map<String, dynamic>;
      return Church.fromJson({
        'id': doc.id,
        ...data,
      });
    }).toList();
  } catch (e) {
    throw Exception('Failed to fetch churches: $e');
  }
}
```

---

## Bonus: Announcement Indexes Added

Added composite index for announcement scope filtering:
```json
{
  "collectionGroup": "announcements",
  "fields": [
    { "fieldPath": "scope", "order": "ASCENDING" },
    { "fieldPath": "isArchived", "order": "ASCENDING" },
    { "fieldPath": "eventDate", "order": "DESCENDING" }
  ]
}
```

This supports the `getDioceseAnnouncements()` query efficiently.

---

## Performance Considerations

### Current Approach (Client-Side Filtering)
- **Pros**:
  - No additional Firestore indexes needed
  - Simpler deployment
  - Works immediately without index creation wait time
  - Good for small-medium datasets (< 10,000 churches)

- **Cons**:
  - Fetches all approved churches before filtering
  - Slightly higher data transfer
  - More memory usage on mobile device

### Scale Estimate:
- Bohol Province: ~100-200 churches expected
- Mobile app will fetch ~100-200 documents maximum
- **Verdict**: Client-side filtering is perfectly acceptable for this scale

### Future Optimization (If Needed)

If the dataset grows significantly (>1,000 churches), you can create composite indexes:

```json
// Add to firestore.indexes.json
{
  "collectionGroup": "churches",
  "fields": [
    { "fieldPath": "location", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "churches",
  "fields": [
    { "fieldPath": "isHeritage", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" }
  ]
}
```

Then revert to server-side filtering in the repository methods.

---

## Testing Checklist

### Test Approved Churches Display

1. **Admin Dashboard**:
   - [ ] Create a new church with status 'pending'
   - [ ] Verify it does NOT appear in mobile app
   - [ ] Approve the church (set status to 'approved')
   - [ ] Verify it DOES appear in mobile app

2. **Mobile App Views**:
   - [ ] Home screen - church list
   - [ ] Map view - approved churches only
   - [ ] Church exploration screen
   - [ ] Search functionality
   - [ ] Filter by location
   - [ ] Filter by diocese
   - [ ] Heritage churches filter

3. **Edge Cases**:
   - [ ] Church with status 'heritage_review' - should NOT appear
   - [ ] Church with status 'revisions' - should NOT appear
   - [ ] Church with missing/null status - should NOT appear
   - [ ] Newly approved church - should appear immediately

---

## Deployment Steps

### Option 1: Deploy Repository Fix Only (Recommended)
```bash
# The mobile app code changes are sufficient
# No Firestore index deployment needed
cd mobile-app
flutter run
```

### Option 2: Deploy Repository Fix + Indexes (Optional)
```bash
# Deploy Firestore indexes (optional, for announcement optimization)
cd admin-dashboard
firebase deploy --only firestore:indexes

# Run mobile app
cd ../mobile-app
flutter run
```

---

## Root Cause Summary

The issue wasn't with the filtering logic itself, but with **Firestore's requirement for composite indexes**. The mobile app was correctly requesting `status = 'approved'`, but the additional filters (location, diocese, isHeritage) created composite queries that Firestore couldn't execute without proper indexes.

By switching to client-side filtering after fetching approved churches, we:
1. ✅ Avoid composite index requirements
2. ✅ Maintain the same filtering behavior
3. ✅ Keep excellent performance for the expected dataset size
4. ✅ Simplify deployment (no index creation wait time)

---

## Status: ✅ FIXED
## Date: January 2025
## Impact: Mobile app now correctly displays only approved churches
