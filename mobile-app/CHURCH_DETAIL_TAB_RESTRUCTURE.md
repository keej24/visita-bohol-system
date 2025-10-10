# Church Detail Screen 4-Tab Restructure Plan

## Overview
Restructuring `church_detail_screen.dart` from a single scrolling page to a **4-tab interface** with organized information display.

## Current Structure (685 lines, StatelessWidget)
- Single CustomScrollView with multiple _TonedCard sections
- SliverAppBar with church name/location
- Sections: Church Information, Parish Announcements, Parish Information (2 buttons), Explore buttons, Your Visit actions, Feedback & Reviews
- Complex validation logic for visit marking

## New Structure (StatefulWidget with TabController)

### Architecture Changes
```dart
class ChurchDetailScreen extends StatefulWidget {
  // Add SingleTickerProviderStateMixin for TabController
  // Add state variables: TabController, TextEditingController for reviews, star rating
}
```

### Tab Layout
```
SliverAppBar (expandedHeight: 300)
├── FlexibleSpaceBar (church image)
├── Heritage Badge (if applicable)
└── TabBar (4 tabs: History | Mass | News | Reviews)

TabBarView
├── Tab 1: History Tab
├── Tab 2: Mass Schedules Tab
├── Tab 3: Announcements Tab
└── Tab 4: Reviews Tab
```

---

## TAB 1: HISTORY (Historical Information)

### Content Organization
1. **Basic Information Card**
   - Full Name (if available)
   - Location
   - Municipality
   - Diocese
   - Founding Year

2. **Founders & Key Figures Card**
   - Founders section (church.founders)
   - Key Historical Figures list (church.keyFigures)

3. **Historical Background Card**
   - church.history (formatted text with justify alignment)

4. **Description Card**
   - church.description

5. **Architectural Details Card**
   - Architectural Style
   - Heritage Classification

6. **Heritage Information Card** (if heritage site)
   - Cultural Significance
   - Preservation History
   - Restoration History

7. **Historical Documents Card**
   - List of documents with PDF icons
   - Download/open functionality

8. **Photo Gallery Card** (if multiple images)
   - 3-column grid of church images

9. **Virtual Tour Button** (if available)
   - Launch virtual tour in external browser

### Data Fields Used
- `fullName`, `location`, `municipality`, `diocese`, `foundingYear`
- `founders`, `keyFigures`
- `history`, `description`
- `architecturalStyle`, `heritageClassification`
- `culturalSignificance`, `preservationHistory`, `restorationHistory`
- `documents` (List<String>)
- `images` (List<String>)
- `virtualTourUrl`

---

## TAB 2: MASS SCHEDULES & CONTACT

### Content Organization
1. **Contact Information Card**
   - Phone (tap to call)
   - Email (tap to email)
   - Address (display only)
   - Website (tap to open)
   - Each with clickable actions

2. **Parish Priest Card**
   - Assigned priest name with church icon

3. **Mass Schedules Card**
   - List of schedules by day/time
   - Each schedule in styled container
   - Show day, time, and type (if available)
   - Empty state if no schedules

4. **Quick Actions Card**
   - "Call Parish Office" button (green)
   - "Get Directions" button (blue)

### Data Fields Used
- `contactInfo` (Map: phone, email, address, website)
- `assignedPriest`
- `massSchedules` (List<Map>: day, time, type)
- `latitude`, `longitude` (for directions)

### URL Actions
- `tel:` for phone calls
- `mailto:` for emails
- `https://` for website
- Google Maps URL for directions

---

## TAB 3: ANNOUNCEMENTS (Parish News)

### Content Organization
- **FutureBuilder** loading announcements from AnnouncementRepository
- Filter: `getParishAnnouncements(churchId)`
- Display announcement cards with:
  - Icon header
  - Title (bold)
  - Content text
  - Event date (if available)
  - Image (if available)

### States
- **Loading**: CircularProgressIndicator
- **Error**: Error message with icon
- **Empty**: "No announcements yet" placeholder
- **Data**: Scrollable list of announcement cards

### Data Source
- `AnnouncementRepository` (via context.read)
- Fetch parish-specific announcements
- Filter by `scope: 'parish'` and `churchId`

---

## TAB 4: REVIEWS (User Reviews - TO BE IMPLEMENTED)

### Content Organization
1. **Write Review Card**
   - Star rating selector (1-5 stars)
   - Text field for review comment
   - "Add Photos" button (photo upload)
   - "Submit Review" button

2. **User Reviews List Card**
   - Display existing reviews
   - Each review shows:
     - User avatar (first letter of name)
     - User name
     - Star rating (visual stars)
     - Review date
     - Comment text
   - Empty state: "Be the first to review!"

### TO IMPLEMENT (Not in current codebase)
1. **Review Model** (models/review.dart)
   ```dart
   class Review {
     String id, userId, userName, churchId;
     int rating; // 1-5
     String comment;
     List<String> photoUrls;
     DateTime createdAt;
   }
   ```

2. **Firestore Collection**: `reviews/{reviewId}`
   - Fields: userId, churchId, rating, comment, photoUrls[], createdAt
   - Security rules: authenticated users can create, read all

3. **ReviewRepository** (repositories/review_repository.dart)
   - `Future<List<Review>> getReviewsByChurch(String churchId)`
   - `Future<void> submitReview(Review review)`
   - `Future<String> uploadReviewPhoto(File photo)`

4. **Photo Upload Integration**
   - Firebase Storage: `/reviews/{reviewId}/{photoId}.jpg`
   - Use `image_picker` package
   - Compress before upload

5. **Star Rating Widget**
   - Interactive 5-star selector
   - Tap to set rating
   - Visual feedback (filled vs outline stars)

### Current State
- Placeholder reviews with sample data
- Submit button shows "Coming soon" toast
- Photo upload shows "Coming soon" toast
- Form validation (rating required, comment required)

---

## Implementation Steps

### Step 1: Convert to StatefulWidget
```dart
class ChurchDetailScreen extends StatefulWidget {
  final Church church;
  const ChurchDetailScreen({super.key, required this.church});

  @override
  State<ChurchDetailScreen> createState() => _ChurchDetailScreenState();
}

class _ChurchDetailScreenState extends State<ChurchDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _reviewController = TextEditingController();
  int _starRating = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _reviewController.dispose();
    super.dispose();
  }
}
```

### Step 2: Update SliverAppBar
- Increase expandedHeight to 300
- Move title to FlexibleSpaceBar
- Replace OptimizedChurchImage in background
- Add TabBar as bottom widget

### Step 3: Replace Content with TabBarView
- Remove all _TonedCard sections
- Add TabBarView with 4 children
- Each child is a method: `_buildHistoryTab()`, etc.

### Step 4: Build Each Tab
- **History**: Organize historical data into clean sections
- **Mass**: Display schedules and contact with action buttons
- **Announcements**: Integrate existing AnnouncementRepository
- **Reviews**: Create UI (placeholder for now)

### Step 5: Extract Helper Widgets
- `_buildCard()` - Styled container with icon header
- `_buildInfoRow()` - Label/value row
- `_buildContactRow()` - Clickable contact item
- `_buildActionButton()` - Full-width action button
- `_buildAnnouncementCard()` - Announcement display
- `_buildReviewItem()` - Review display

### Step 6: Implement URL Actions
- `_openDocument(url)` - Launch PDF
- `_openVirtualTour(url)` - Launch 360° tour
- `_makePhoneCall(phone)` - tel: URI
- `_sendEmail(email)` - mailto: URI
- `_openWebsite(url)` - https: URI
- `_openMaps(lat, lng)` - Google Maps URI

### Step 7: Add Date Formatting
```dart
String _formatDate(DateTime date) {
  final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return '${months[date.month - 1]} ${date.day}, ${date.year}';
}
```

### Step 8: Review System (Phase 2)
- Create Review model
- Add Firestore collection + security rules
- Create ReviewRepository
- Implement photo upload
- Update Reviews tab with real data
- Add Firebase Storage rules

---

## Features Removed (From Current Implementation)
These were in the old screen but won't be in the tabbed version (intentionally):

1. **Visit Tracking** (Mark as Visited, Add to Wishlist)
   - This belongs in a separate action button/fab
   - Too cluttered in tabs

2. **Proximity Validation** (_validateProximity)
   - Keep this logic but move to a dedicated service

3. **Local Feedback Storage** (FeedbackService with File-based storage)
   - Will be replaced with Firestore-based reviews

4. **SVG Image Support** (_buildChurchImage with SvgPicture)
   - Now using OptimizedChurchImage widget

5. **Legacy AppState Consumer** (Provider for visit tracking)
   - May add back later in a different pattern

---

## Dependencies
- `url_launcher` (already imported)
- `provider` (already imported)
- `image_picker` (for review photos - add later)
- `firebase_storage` (for review photos - add later)

## Testing Checklist
- [ ] All 4 tabs display correctly
- [ ] Church data displays in History tab
- [ ] Mass schedules display correctly
- [ ] Contact actions work (call, email, directions)
- [ ] Announcements load from Firestore
- [ ] Review form validation works
- [ ] Star rating selector works
- [ ] Tab navigation smooth
- [ ] Heritage badge displays for heritage sites
- [ ] Photo gallery displays multiple images
- [ ] Virtual tour button works
- [ ] Historical documents open correctly

---

## Color Scheme
- Primary: `Color(0xFF8B5E3C)` (Brown)
- Secondary: `Color(0xFF2563EB)` (Blue)
- Success: `Color(0xFF10B981)` (Green)
- Heritage Gold: `Color(0xFFD4AF37)`
- Star Gold: `Color(0xFFFFD700)`
- Text Primary: `Color(0xFF333333)`
- Text Secondary: `Color(0xFF666666)`

## File Size Estimate
- New file: ~1200 lines (vs current 685)
- Increase due to 4 separate tab builders
- More organized, easier to maintain

---

## Next Steps
1. Review this plan
2. Create backup of current file ✅
3. Implement Step 1-3 (convert to tabs)
4. Implement Step 4 (build tab content)
5. Test on device
6. Phase 2: Implement Review system

---

*Created: 2025-06-05*  
*Status: PLANNING*  
*Estimated Time: 4-6 hours implementation + 2-4 hours testing*
