# Tabbed Church Detail Screen Implementation Plan

## Current State
The `church_detail_screen.dart` is currently a **StatelessWidget** with a **CustomScrollView** that displays all content inline:
- Church Information
- Parish Announcements
- Mass Schedule & Announcements buttons
- Virtual Tour & Map buttons
- Your Visit (Mark Visited/Wishlist) buttons
- Feedback & Reviews section (inline display)

## Target State
Convert to a **StatefulWidget** with **TabController** and **4 organized tabs**:

### Tab Structure
1. **History Tab** - Church historical information
   - Historical background text
   - Church information (location, founding year, architectural style)
   - Heritage badge if applicable

2. **Visit Tab** - Practical visit information
   - Location & Directions
   - Mass Schedule (link to full schedule)
   - Parish Announcements (upcoming events)

3. **Documents Tab** - Parish documents and archives
   - Official documents uploaded by parish
   - PDF viewers/download buttons
   - Empty state: "No Documents Available"

4. **Reviews Tab** - User feedback and reviews
   - **StatefulWidget** for refresh capability
   - List of published reviews
   - "Add Review" button
   - Pull-to-refresh functionality
   - Automatic refresh after new review submission

## Implementation Steps

### 1. Convert Main Class
- Change from `StatelessWidget` to `StatefulWidget`
- Add `SingleTickerProviderStateMixin`
- Create `TabController` with length=4
- Replace `CustomScrollView` with `NestedScrollView`

### 2. Update Header Section
- Keep SliverAppBar with church name and location
- Add hero image below header
- Add action button row: Map, 360° Tour, Wishlist
- Add sticky TabBar using `SliverPersistentHeader`

### 3. Create Tab Content Widgets
- **_HistoryTab** (StatelessWidget)
- **_VisitTab** (StatelessWidget)
- **_DocumentsTab** (StatelessWidget)
- **_ReviewsTab** (Stateful Widget with refresh capability)

### 4. Add Floating Action Button
- "Mark Visited" / "Visited" button
- Sacred green gradient when not visited
- Success green gradient when visited
- Proximity validation on tap

### 5. Reviews Tab Special Features
- Future<List<Feedback>> with setState for refresh
- RefreshIndicator for pull-to-refresh
- Automatic reload after review submission
- Proper loading states

## Key Design Elements

### Colors
- **Sacred Green**: `#2C5F2D` → `#1E4620` (primary religious)
- **Success Green**: `#10B981` → `#059669` (visited state)
- **Cyan**: `#06B6D4` → `#0891B2` (map)
- **Purple**: `#8B5CF6` → `#7C3AED` (360° tour)
- **Gold**: `#D4AF37` → `#B8941F` (wishlist active)

### Tab Icons
- History: `Icons.history_edu`
- Visit: `Icons.place`
- Documents: `Icons.folder_outlined`
- Reviews: `Icons.rate_review`

## Success Criteria
✅ Church detail screen uses tabs instead of inline scrolling
✅ Reviews tab refreshes automatically after submission
✅ Reviews tab supports pull-to-refresh
✅ All existing functionality preserved
✅ Matches documented design from CHURCH_DETAIL_IMPROVEMENTS.md
✅ Floating action button for Mark Visited with gradients
✅ Action buttons use gradient backgrounds

## Files to Modify
- `mobile-app/lib/screens/church_detail_screen.dart`

## Testing Checklist
- [ ] Tabs switch correctly
- [ ] Reviews load on Reviews tab
- [ ] New review submission refreshes list
- [ ] Pull-to-refresh works on Reviews tab
- [ ] Mark Visited button validates proximity
- [ ] Map button opens maps
- [ ] 360° Tour button opens VirtualTourScreen
- [ ] Wishlist button toggles state
- [ ] Heritage badge appears if church.isHeritage == true
