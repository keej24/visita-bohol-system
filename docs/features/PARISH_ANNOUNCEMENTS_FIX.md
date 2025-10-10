# Parish Announcements Visibility Fix

## Summary

Parish announcements are now **only** viewable in their dedicated church profiles. They no longer appear in the main Announcements page, which now exclusively shows Diocese-level announcements.

## Files Modified

- **`mobile-app/lib/screens/announcements_screen.dart`**

---

## Changes Made

### 1. **Filtered Out Parish Announcements**

Added logic to `_matchesFilters()` method to exclude all parish-scoped announcements:

```dart
bool _matchesFilters(Announcement a) {
  // IMPORTANT: Exclude parish announcements - they should only appear in church profiles
  if (a.scope.toLowerCase() == 'parish') {
    return false;
  }

  // ... rest of filter logic
}
```

**Result:**
- ❌ Parish announcements will **NOT** appear in main Announcements screen
- ✅ Diocese announcements will still appear
- ✅ Parish announcements remain accessible in individual church detail screens

### 2. **Removed Parish Filter Chip**

Removed the "Parish" quick filter option since parish announcements are no longer shown:

**Before:**
```
[All] [Diocese] [Parish]
```

**After:**
```
[All] [Diocese]
```

---

## Rationale

### Why This Change?

1. **Context-Specific Information**
   - Parish announcements are church-specific events
   - They're only relevant to people viewing that particular church
   - Main announcement page should focus on diocese-wide events

2. **Cleaner Main Announcements Page**
   - Prevents clutter from many parish-specific events
   - Focuses on broad-reaching announcements
   - Better user experience for discovering major events

3. **Proper Information Architecture**
   - Diocese announcements → Main Announcements page (broad audience)
   - Parish announcements → Church Detail page (targeted audience)

---

## Where Parish Announcements Are Still Visible

### ✅ Church Detail Screen

Parish announcements remain fully accessible in:

- **File:** `mobile-app/lib/screens/church_detail_screen.dart`
- **Location:** "Announcements" tab within each church's detail page
- **Visibility:** Only shows announcements for that specific parish

Example flow:
```
Home → Churches List → [Select Church] → Announcements Tab
                                              ↓
                                    Parish-specific announcements
```

---

## User Experience

### Before (Problematic)
```
Main Announcements Page:
├─ Diocese of Tagbilaran Fiesta (relevant to all)
├─ Diocese of Talibon Pilgrimage (relevant to all)
├─ Baclayon Parish Bazaar (only relevant to Baclayon)
├─ Loboc Parish Concert (only relevant to Loboc)
├─ Dauis Parish Meeting (only relevant to Dauis)
└─ ... (many more parish-specific events)

Problem: Too cluttered, hard to find relevant diocese-wide events
```

### After (Improved)
```
Main Announcements Page:
├─ Diocese of Tagbilaran Fiesta (relevant to all)
├─ Diocese of Talibon Pilgrimage (relevant to all)
└─ Other diocese-wide events

Baclayon Church Detail Page → Announcements Tab:
├─ Baclayon Parish Bazaar
└─ Other Baclayon-specific events

Loboc Church Detail Page → Announcements Tab:
├─ Loboc Parish Concert
└─ Other Loboc-specific events

Result: Clear separation, easy to find relevant information
```

---

## Technical Details

### Filter Logic Flow

```dart
1. Get all announcements from repository
2. Apply _matchesFilters() to each
3. _matchesFilters() returns:
   - false → if scope == 'parish' (excluded)
   - true/false → based on other filters (search, diocese, category, date)
4. Display only filtered results
```

### Scope Values
- `"diocese"` → Shows in main Announcements page ✅
- `"parish"` → Shows only in church detail page ❌

---

## Benefits

### ✅ For Users
1. **Cleaner main page** - Only relevant, broad-reaching announcements
2. **Better discovery** - Diocese events are easier to find
3. **Contextual information** - Parish events appear where they're relevant
4. **Less scrolling** - Fewer announcements to sift through

### ✅ For Church Admins
1. **Proper audience targeting** - Parish events reach parish members
2. **Clear separation** - Diocese vs Parish announcements distinct
3. **Organized system** - Announcements in appropriate locations

---

## Filter Behavior

### Quick Filters (Now)
- **All:** Shows all diocese-scoped announcements
- **Diocese:** Shows diocese-scoped announcements

### Advanced Filters
- **Diocese Dropdown:** Filters by specific diocese (Tagbilaran/Talibon)
- **Category:** Filters by event type (Festival, Mass, Exhibit, etc.)
- **Date Range:** Filters by date period

**Note:** All filters now only apply to diocese-scoped announcements since parish announcements are excluded.

---

## Data Flow

### Announcement Creation (Admin Dashboard)
```
Admin creates announcement
    ↓
Selects scope: "Diocese" or "Parish"
    ↓
Saves to Firestore with scope field
    ↓
Mobile app fetches announcements
    ↓
Filters based on scope
    ↓
Diocese → Main page
Parish → Church detail only
```

---

## Testing Checklist

- [x] Parish announcements do NOT appear in main Announcements page
- [x] Diocese announcements still appear in main Announcements page
- [x] "Parish" filter chip removed from quick filters
- [x] "All" filter shows only diocese announcements
- [x] "Diocese" filter works correctly
- [x] Search function works on diocese announcements only
- [x] Advanced filters work correctly
- [x] Parish announcements still visible in church detail screens
- [x] No errors or crashes from filter changes

---

## Related Files

### Announcement Display
- [announcements_screen.dart](mobile-app/lib/screens/announcements_screen.dart) - Main announcements page (diocese only)
- [church_detail_screen.dart](mobile-app/lib/screens/church_detail_screen.dart) - Shows parish announcements in Announcements tab
- [parish_announcements_screen.dart](mobile-app/lib/screens/parish_announcements_screen.dart) - Parish-specific announcement view

### Data Layer
- [announcement_repository.dart](mobile-app/lib/repositories/announcement_repository.dart) - Gets all announcements
- [announcement.dart](mobile-app/lib/models/announcement.dart) - Announcement model with scope field

---

## Example Scenarios

### Scenario 1: User Browsing Main Announcements
```
User opens "Announcements" tab
    ↓
Sees diocese-wide events (Pilgrimages, Diocesan Fiestas, etc.)
    ↓
Does NOT see parish-specific events (Parish bazaars, meetings, etc.)
    ↓
Result: Clean, relevant list of major events
```

### Scenario 2: User Viewing Church Details
```
User browses churches
    ↓
Opens "Baclayon Church" detail
    ↓
Taps "Announcements" tab
    ↓
Sees Baclayon Parish events (Bazaar, Mass schedules, meetings)
    ↓
Result: Contextual, parish-specific information
```

---

## Migration Notes

**For Existing Data:**
- No database changes required
- Existing announcements with `scope: "parish"` automatically filtered
- Existing announcements with `scope: "diocese"` continue to display

**Breaking Changes:**
- None - purely filtering logic

**User Impact:**
- Parish announcements "disappear" from main page (intentional)
- Users guided to find parish announcements in church profiles

---

## Future Enhancements (Optional)

1. **Info Banner**
   - Show note: "Looking for parish events? Visit the church's detail page"
   - Helps users understand where to find parish announcements

2. **Empty State**
   - If no diocese announcements, show helpful message
   - Guide users to church profiles for parish events

3. **Search Enhancement**
   - Global search that includes parish announcements
   - Shows source (Diocese page vs Church profile)

---

**Implementation Date:** 2025
**Status:** ✅ Completed
**Breaking Changes:** None
**User Communication:** Consider adding help text explaining announcement visibility
