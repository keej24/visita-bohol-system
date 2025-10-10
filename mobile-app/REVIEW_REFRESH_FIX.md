# Review Tab Refresh Fix

## Problem
After submitting a review, the new review doesn't appear in the Reviews tab until the app is restarted.

## Solution
Convert the `_ReviewsTab` widget from StatelessWidget to StatefulWidget and refresh the reviews list after submission.

---

## Changes Required

### File: `lib/screens/church_detail_screen.dart`

#### Change 1: Add import for web support (line 1-2)

**Before:**
```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
```

**After:**
```dart
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:provider/provider.dart';
```

---

#### Change 2: Convert _ReviewsTab to StatefulWidget (around line 1611)

**Before:**
```dart
class _ReviewsTab extends StatelessWidget {
  final Church church;
  final FeedbackService fbSvc;

  const _ReviewsTab({required this.church, required this.fbSvc});

  @override
  Widget build(BuildContext context) {
```

**After:**
```dart
class _ReviewsTab extends StatefulWidget {
  final Church church;
  final FeedbackService fbSvc;

  const _ReviewsTab({required this.church, required this.fbSvc});

  @override
  State<_ReviewsTab> createState() => _ReviewsTabState();
}

class _ReviewsTabState extends State<_ReviewsTab> {
  late Future<List<fbm.FeedbackModel>> _reviewsFuture;

  @override
  void initState() {
    super.initState();
    _loadReviews();
  }

  void _loadReviews() {
    setState(() {
      _reviewsFuture = widget.fbSvc.load();
    });
  }

  Widget _buildReviewPhoto(String photoPath) {
    if (kIsWeb) {
      return Image.network(
        photoPath,
        width: 80,
        height: 80,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Container(
          width: 80,
          height: 80,
          color: Colors.grey[300],
          child: const Icon(Icons.broken_image, color: Colors.grey),
        ),
      );
    } else {
      return Image.file(
        File(photoPath),
        width: 80,
        height: 80,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Container(
          width: 80,
          height: 80,
          color: Colors.grey[300],
          child: const Icon(Icons.broken_image, color: Colors.grey),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
```

---

#### Change 3: Update references from `church` to `widget.church` (around line 1625-1640)

**Before:**
```dart
onPressed: () async {
  final result = await Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => FeedbackSubmitScreen(churchId: church.id),
    ),
  );
  if (result == true && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Review submitted successfully!'),
        backgroundColor: Color(0xFF10B981),
      ),
    );
  }
},
```

**After:**
```dart
onPressed: () async {
  final result = await Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => FeedbackSubmitScreen(churchId: widget.church.id),
    ),
  );
  if (result == true && mounted) {
    _loadReviews(); // ← ADD THIS LINE to refresh reviews
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Review submitted successfully!'),
        backgroundColor: Color(0xFF10B981),
      ),
    );
  }
},
```

---

#### Change 4: Update FutureBuilder to use state variable (around line 1656-1664)

**Before:**
```dart
Expanded(
  child: FutureBuilder<List<fbm.FeedbackModel>>(
    future: fbSvc.load(),
    builder: (context, snap) {
      if (snap.connectionState != ConnectionState.done) {
        return const Center(child: CircularProgressIndicator());
      }
      final list = (snap.data ?? [])
          .where((f) => f.churchId == church.id)
          .toList();
```

**After:**
```dart
Expanded(
  child: FutureBuilder<List<fbm.FeedbackModel>>(
    future: _reviewsFuture,  // ← CHANGED from fbSvc.load()
    builder: (context, snap) {
      if (snap.connectionState != ConnectionState.done) {
        return const Center(child: CircularProgressIndicator());
      }
      final list = (snap.data ?? [])
          .where((f) => f.churchId == widget.church.id)  // ← CHANGED from church.id
          .toList();
```

---

#### Change 5: Fix photo display for web compatibility (around line 1754-1762)

**Before:**
```dart
itemBuilder: (_, i) => ClipRRect(
  borderRadius: BorderRadius.circular(8),
  child: Image.file(
    File(feedback.photos[i]),
    width: 80,
    height: 80,
    fit: BoxFit.cover,
  ),
),
```

**After:**
```dart
itemBuilder: (_, i) => ClipRRect(
  borderRadius: BorderRadius.circular(8),
  child: _buildReviewPhoto(feedback.photos[i]),  // ← CHANGED to use helper method
),
```

---

## Expected Behavior After Fix

1. User submits a review
2. Review saves to Firestore
3. User returns to church detail screen
4. Green SnackBar appears: "Review submitted successfully!"
5. **Reviews list automatically refreshes**
6. **New review appears immediately in the list**
7. **Photos display correctly on both mobile and web**

---

## Testing Steps

1. Open the mobile app
2. Navigate to any church detail screen
3. Tap "Reviews" tab
4. Tap "Write a Review"
5. Fill out the review form with rating, comment, and optional photo
6. Submit the review
7. ✅ Verify you see the success message
8. ✅ Verify the new review appears in the list immediately
9. ✅ Verify photos display correctly (if added)

---

## Files Modified

- `lib/screens/church_detail_screen.dart` - Reviews tab refresh and web photo support
