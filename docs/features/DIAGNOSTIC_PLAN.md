# Diagnostic Plan: Approved Churches Not Visible in Mobile App

## Problem Statement
Churches approved in the admin dashboard are NOT appearing in the mobile app, despite previous fixes.

---

## Data Flow Analysis

### Expected Flow:
```
1. Admin Dashboard → Approve Church → Firestore Update (status='approved')
2. Mobile App → Query Firestore → Filter (status='approved') → Display
```

### Actual Behavior:
- Admin approves church ✅
- Church status updated in Firestore ❓
- Mobile app queries Firestore ❓
- Mobile app displays churches ❌

---

## Critical Investigation Points

### 1. **Firestore Collection Name Mismatch?**

**Admin Dashboard**:
```typescript
const CHURCHES = 'churches';  // Line 52 in churches.ts
```

**Mobile App**:
```dart
static const String _churchesCollection = 'churches';
```

✅ Collection names match

---

### 2. **Status Field Name Mismatch?**

**Admin Dashboard writes**:
```typescript
await updateDoc(ref, {
  status,  // 'approved' | 'pending' | 'heritage_review'
  updatedAt: Timestamp.now(),
  ...
});
```

**Mobile App reads**:
```dart
.where('status', isEqualTo: ChurchStatus.approved)  // 'approved'
```

✅ Field names match

---

### 3. **Diocese Field Format Mismatch?** ⚠️ POTENTIAL ISSUE

**Admin Dashboard**:
```typescript
export interface Church {
  diocese: Diocese;  // 'tagbilaran' | 'talibon' (lowercase)
}
```

**Mobile App expects**:
```dart
diocese: j['diocese'] ?? 'Diocese of Tagbilaran',  // Full name format
```

**Mobile App announcement conversion**:
```dart
'diocese': data['diocese'] == 'tagbilaran'
    ? 'Diocese of Tagbilaran'
    : 'Diocese of Talibon',
```

❌ **MISMATCH DETECTED**: Admin stores lowercase ('tagbilaran'), mobile expects full name

---

### 4. **Required Fields Missing?** ⚠️ POTENTIAL ISSUE

**Mobile App Church.fromJson()**:
```dart
Church.fromJson({
  'id': doc.id,        // Required
  'name': j['name'],   // Required
  'location': j['location'] ?? '',  // Required, defaults to empty
  ...
})
```

**Admin Dashboard Church Interface**:
```typescript
{
  id: string;          // ✅
  name: string;        // ✅
  municipality?: string;  // Optional
  // NO 'location' field! ❌
}
```

❌ **CRITICAL MISMATCH**: Mobile requires 'location', admin has 'municipality'

---

### 5. **Firestore Query Index Issue**

Current mobile query:
```dart
.where('status', isEqualTo: ChurchStatus.approved)
```

**Potential Issues**:
- Single-field query should work without composite index ✅
- But Firestore might have permission rules blocking reads ⚠️

---

## Root Cause Hypothesis

### Primary Suspects (Ranked by Likelihood):

1. **🔴 CRITICAL: Field Name Mismatch - 'location' vs 'municipality'**
   - Admin Dashboard: Uses `municipality` field
   - Mobile App: Requires `location` field
   - **Impact**: Church.fromJson() receives empty string for location
   - **Symptom**: Churches might parse but fail validation/display

2. **🟡 MEDIUM: Diocese Format Mismatch**
   - Admin: Stores lowercase ('tagbilaran', 'talibon')
   - Mobile: Expects/displays full name ('Diocese of Tagbilaran')
   - **Impact**: Display issues, filtering might work but text is wrong

3. **🟡 MEDIUM: Firestore Security Rules**
   - Rules might block unauthenticated mobile app reads
   - **Impact**: Query returns empty even if data exists

4. **🟢 LOW: Composite Index (Already fixed)**
   - We switched to client-side filtering
   - Should work now

---

## Diagnostic Steps to Execute

### Step 1: Verify Firestore Data Structure
```bash
# Check what's actually in Firestore
# Look at one approved church document
```

**Expected Fields to Check**:
- `status`: Should be 'approved'
- `name`: Should exist
- `location` vs `municipality`: Which one exists?
- `diocese`: Format ('tagbilaran' vs 'Diocese of Tagbilaran')

---

### Step 2: Check Firestore Security Rules

**File**: `admin-dashboard/firestore.rules`

**Expected**:
```
match /churches/{churchId} {
  allow read: if true;  // Public read for approved churches
  allow write: if request.auth != null;  // Authenticated writes only
}
```

**Potential Issue**: Rules might require authentication for reads

---

### Step 3: Test Mobile App Query Directly

Add debug logging to mobile app:
```dart
Future<List<Church>> getAll() async {
  try {
    final QuerySnapshot snapshot = await _firestore
        .collection(_churchesCollection)
        .where('status', isEqualTo: ChurchStatus.approved)
        .get();

    debugPrint('🔍 Query returned ${snapshot.docs.length} documents');

    for (var doc in snapshot.docs) {
      debugPrint('📄 Document ${doc.id}: ${doc.data()}');
    }

    return snapshot.docs.map((doc) {
      // ...
    }).toList();
  } catch (e) {
    debugPrint('❌ Query error: $e');
    throw Exception('Failed to fetch churches: $e');
  }
}
```

---

### Step 4: Fix Field Mapping

**Option A: Update Admin Dashboard** (Recommended)
Add 'location' field to match mobile app

**Option B: Update Mobile App**
Map 'municipality' to 'location'

**Option C: Use Both**
Support both field names for backwards compatibility

---

## Files That Need Changes

### Priority 1: Critical Fixes

1. **Admin Dashboard - Church Interface**
   - File: `admin-dashboard/src/lib/churches.ts`
   - Change: Add `location` field or rename `municipality` to `location`
   - OR: Ensure `municipality` is saved as `location` in Firestore

2. **Mobile App - Field Mapping**
   - File: `mobile-app/lib/models/church.dart`
   - Change: Update `fromJson` to handle both `location` and `municipality`
   ```dart
   location: j['location'] ?? j['municipality'] ?? '',
   ```

3. **Mobile App - Diocese Mapping**
   - File: `mobile-app/lib/models/church.dart`
   - Change: Convert diocese format
   ```dart
   diocese: _convertDiocese(j['diocese'] ?? 'Diocese of Tagbilaran'),

   static String _convertDiocese(String diocese) {
     if (diocese == 'tagbilaran') return 'Diocese of Tagbilaran';
     if (diocese == 'talibon') return 'Diocese of Talibon';
     return diocese; // Already in full format
   }
   ```

### Priority 2: Security & Permissions

4. **Firestore Security Rules**
   - File: `admin-dashboard/firestore.rules`
   - Change: Ensure public read access for approved churches
   ```
   match /churches/{churchId} {
     allow read: if resource.data.status == 'approved' || request.auth != null;
     allow write: if request.auth != null &&
                     request.auth.token.role in ['chancery_office', 'parish_secretary'];
   }
   ```

### Priority 3: Debug & Logging

5. **Mobile App - Add Debug Logging**
   - File: `mobile-app/lib/repositories/firestore_church_repository.dart`
   - Change: Add comprehensive logging to getAll() method

6. **Admin Dashboard - Verify Status Update**
   - File: `admin-dashboard/src/lib/churches.ts`
   - Change: Add console.log to confirm status is actually saved

---

## Testing Protocol

### Test 1: Create & Approve Church (Admin)
```
1. Login to admin dashboard
2. Create new church with:
   - name: "Test Church"
   - municipality: "Test Town"
   - diocese: "tagbilaran"
   - status: "pending"
3. Approve the church
4. Check Firestore console:
   - Verify status = 'approved'
   - Note which fields exist (location vs municipality)
```

### Test 2: Query from Mobile (Debug Mode)
```
1. Run mobile app with debug logging
2. Check console output:
   - Number of documents returned
   - Raw document data
   - Any errors
3. Identify exact mismatch
```

### Test 3: Field Mapping Fix
```
1. Apply field mapping fix to mobile app
2. Re-run mobile app
3. Verify churches appear
4. Check church detail screen displays correctly
```

---

## Quick Win: Immediate Test

**Add this to mobile app** to see what's actually being queried:

```dart
// In firestore_church_repository.dart, getAll() method:

@override
Future<List<Church>> getAll() async {
  try {
    debugPrint('🔍 Querying churches with status=${ChurchStatus.approved}');

    final QuerySnapshot snapshot = await _firestore
        .collection(_churchesCollection)
        .where('status', isEqualTo: ChurchStatus.approved)
        .get();

    debugPrint('📊 Found ${snapshot.docs.length} approved churches');

    if (snapshot.docs.isEmpty) {
      debugPrint('❌ No approved churches found!');
      debugPrint('💡 Check Firestore console for actual data');
    } else {
      debugPrint('✅ Sample church data:');
      final firstDoc = snapshot.docs.first;
      debugPrint('   ID: ${firstDoc.id}');
      debugPrint('   Data: ${firstDoc.data()}');
    }

    return snapshot.docs.map((doc) {
      final data = doc.data() as Map<String, dynamic>;
      debugPrint('🏛️ Processing church: ${data['name']}');
      return Church.fromJson({
        'id': doc.id,
        ...data,
      });
    }).toList();
  } catch (e) {
    debugPrint('💥 Error in getAll(): $e');
    throw Exception('Failed to fetch churches: $e');
  }
}
```

---

## Expected Outcome

After fixes:
1. ✅ Admin approves church → Status='approved' in Firestore
2. ✅ Mobile app queries → Finds approved churches
3. ✅ Mobile app maps fields → location/municipality handled
4. ✅ Mobile app displays → Churches visible in app

---

## Next Steps

1. **Immediate**: Add debug logging to mobile app
2. **Investigate**: Check Firestore console for actual data structure
3. **Fix**: Apply field mapping based on findings
4. **Test**: Verify churches appear in mobile app
5. **Document**: Update schemas to prevent future mismatches

---

## Status: 🔴 AWAITING INVESTIGATION
**Created**: January 2025
**Priority**: CRITICAL
