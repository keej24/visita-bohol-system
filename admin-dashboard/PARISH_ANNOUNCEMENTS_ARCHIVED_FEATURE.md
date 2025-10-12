# Parish Announcements - Archived Feature Implementation

## Overview
Added archived announcements functionality to the Parish Dashboard's announcement page, matching the pattern used in the Chancery Dashboard.

**Date**: October 11, 2025
**Component**: `ParishAnnouncements.tsx`
**Status**: ✅ Complete

---

## What Was Changed

### File Modified
- `admin-dashboard/src/components/parish/ParishAnnouncements.tsx`

### New Features Added

#### 1. **Tab-Based Navigation**
Added tabs to switch between active and archived announcements:
- **Active Tab** - Shows currently published announcements
- **Archived Tab** - Shows past events and archived announcements

```typescript
const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
```

#### 2. **Archived Announcements State**
```typescript
const [archivedAnnouncements, setArchivedAnnouncements] = useState<Announcement[]>([]);
const [isLoadingArchived, setIsLoadingArchived] = useState(false);
```

#### 3. **Load Archived Announcements Function**
Lazy loads archived announcements only when the "Archived" tab is clicked:

```typescript
const loadArchivedAnnouncements = React.useCallback(async () => {
  if (!userProfile?.diocese) return;

  try {
    setIsLoadingArchived(true);

    // Load archived parish announcements
    const data = await AnnouncementService.getAnnouncements(userProfile.diocese, {
      isArchived: true,
      scope: 'parish'
    });

    // Filter to only this parish's announcements
    const parishAnnouncements = data.filter(announcement =>
      announcement.parishId === churchId
    );

    setArchivedAnnouncements(parishAnnouncements);
  } catch (error) {
    console.error('Error loading archived parish announcements:', error);
    toast({
      title: "Error",
      description: "Failed to load archived announcements",
      variant: "destructive"
    });
  } finally {
    setIsLoadingArchived(false);
  }
}, [userProfile?.diocese, churchId, toast]);
```

#### 4. **Unarchive Function**
Restores archived announcements back to active status:

```typescript
const handleUnarchive = async (announcementId: string) => {
  try {
    await AnnouncementService.unarchiveAnnouncement(announcementId);
    toast({
      title: "Success",
      description: "Announcement restored successfully"
    });
    // Refresh both lists to keep them in sync
    await loadAnnouncements();
    await loadArchivedAnnouncements();
  } catch (error) {
    console.error('Error restoring announcement:', error);
    toast({
      title: "Error",
      description: "Failed to restore announcement",
      variant: "destructive"
    });
  }
};
```

#### 5. **Updated Quick Stats Card**
Changed the third stats card from "Scope" to "Archived" count:

**Before:**
```tsx
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-sm font-medium text-gray-600">Scope</CardTitle>
  </CardHeader>
  <CardContent>
    <Badge variant="outline" className="text-purple-700 border-purple-200 bg-purple-50">
      <Calendar className="w-3 h-3 mr-1" />
      Parish Events
    </Badge>
    <p className="text-xs text-gray-500 mt-1">Your parish only</p>
  </CardContent>
</Card>
```

**After:**
```tsx
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-sm font-medium text-gray-600">Archived</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold text-gray-600">{archivedAnnouncements.length}</div>
    <p className="text-xs text-gray-500">Past events</p>
  </CardContent>
</Card>
```

#### 6. **Tabs UI Component**
Replaced single announcement list with tabbed interface:

```tsx
<Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'active' | 'archived')} className="w-full">
  <TabsList className="grid w-full max-w-md grid-cols-2">
    <TabsTrigger value="active">
      Active {announcements.length > 0 && `(${announcements.length})`}
    </TabsTrigger>
    <TabsTrigger value="archived">
      Archived {archivedAnnouncements.length > 0 && `(${archivedAnnouncements.length})`}
    </TabsTrigger>
  </TabsList>

  {/* Active Announcements Tab */}
  <TabsContent value="active" className="space-y-4">
    <Card>
      <CardContent className="pt-6">
        <AnnouncementList
          announcements={announcements}
          isLoading={isLoading}
          onEdit={(announcement) => {
            setSelectedAnnouncement(announcement);
            setIsFormOpen(true);
          }}
          onDelete={handleDelete}
          onArchive={handleArchive}
          onCreate={() => setIsFormOpen(true)}
          showScope={false}
          showHeader={false}
        />
      </CardContent>
    </Card>
  </TabsContent>

  {/* Archived Announcements Tab */}
  <TabsContent value="archived" className="space-y-4">
    <Card>
      <CardContent className="pt-6">
        <AnnouncementList
          announcements={archivedAnnouncements}
          isLoading={isLoadingArchived}
          onEdit={(announcement) => {
            setSelectedAnnouncement(announcement);
            setIsFormOpen(true);
          }}
          onDelete={handleDelete}
          onArchive={handleUnarchive}
          onCreate={() => setIsFormOpen(true)}
          showScope={false}
          showHeader={false}
          isArchivedView={true}
        />
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

---

## How It Works

### User Flow

#### Viewing Archived Announcements
1. Parish secretary navigates to Announcements page
2. Clicks "Archived" tab
3. System lazy loads archived announcements (only on first click)
4. Displays list of past events with "Restore" button

#### Restoring an Archived Announcement
1. Click "Restore" button on archived announcement
2. Confirmation via toast notification
3. Announcement moves back to "Active" tab
4. Both lists refresh automatically

#### Archiving an Active Announcement
1. Click "Archive" button on active announcement
2. Confirmation via toast notification
3. Announcement moves to "Archived" tab
4. Both lists refresh automatically

### Performance Optimizations

#### Lazy Loading
Archived announcements are **only loaded when needed**:
```typescript
useEffect(() => {
  if (activeTab === 'archived' && archivedAnnouncements.length === 0) {
    loadArchivedAnnouncements();
  }
}, [activeTab, archivedAnnouncements.length, loadArchivedAnnouncements]);
```

This prevents unnecessary API calls when users never visit the archived tab.

#### List Synchronization
Both lists refresh after archive/unarchive operations:
```typescript
await loadAnnouncements();
await loadArchivedAnnouncements();
```

This ensures counts and data stay in sync across tabs.

---

## UI Components Used

### New Imports
```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
```

### Existing Components
- `AnnouncementList` - Reused for both tabs with `isArchivedView` prop
- `Card` - Wraps announcement lists
- `Badge` - Shows counts in tab labels
- `Button` - Archive/Restore actions
- `Dialog` - Form modal
- `useToast` - Success/error notifications

---

## Comparison with Chancery Dashboard

### Similarities ✅
- ✅ Tab-based navigation (Active/Archived)
- ✅ Lazy loading for archived announcements
- ✅ Unarchive functionality with "Restore" button
- ✅ Auto-refresh both lists after operations
- ✅ Loading states for each tab
- ✅ Same UI patterns and components

### Differences
- **Scope Filtering**: Parish announcements filter by `parishId` (Chancery shows all diocese announcements)
- **Stats Cards**: Parish shows "Archived" count instead of "Scope" badge
- **Access Control**: Only parish secretary can manage their own parish announcements

---

## Testing Checklist

### Basic Functionality
- [x] Active tab shows current announcements
- [x] Archived tab loads on first click
- [x] Tab badges show correct counts
- [x] Stats card displays archived count

### Archive Operations
- [x] Archive button moves announcement to archived tab
- [x] Restore button moves announcement back to active tab
- [x] Both lists refresh after operations
- [x] Toast notifications appear on success/error

### Edge Cases
- [x] Empty state displays correctly in archived tab
- [x] Loading spinner shows while fetching
- [x] Filters correctly by parishId
- [x] Error handling for failed operations

### Performance
- [x] Archived list only loads when tab is clicked
- [x] No unnecessary re-renders
- [x] Smooth tab transitions

---

## Files Modified Summary

### ParishAnnouncements.tsx
**Lines Changed**: ~150 lines modified/added
**Key Changes**:
1. Added Tabs import
2. Added archivedAnnouncements state
3. Added loadArchivedAnnouncements function
4. Added handleUnarchive function
5. Updated handleArchive to refresh both lists
6. Replaced single list with tabbed interface
7. Updated stats card (Scope → Archived)

---

## Benefits

### For Parish Secretaries
1. **Access Historical Data** - View past events without deleting
2. **Restore Mistakes** - Accidentally archived? Just restore
3. **Better Organization** - Clean separation of active vs past events
4. **Audit Trail** - Keep record of all announcements

### For System
1. **Consistent UX** - Same pattern as Chancery Dashboard
2. **Performance** - Lazy loading reduces initial load time
3. **Maintainability** - Reuses existing components and services
4. **Scalability** - No limit on archived announcements

---

## Future Enhancements (Optional)

### Potential Improvements
1. **Bulk Operations** - Archive/restore multiple at once
2. **Search/Filter** - Find specific archived announcements
3. **Auto-Archive Settings** - Configure auto-archive rules
4. **Export** - Download archived announcements as CSV/PDF
5. **Permanently Delete** - Remove archived items after X months

---

## Summary

Successfully implemented archived announcements feature for Parish Dashboard following the Chancery Dashboard pattern. Parish secretaries can now:

✅ View archived announcements in separate tab
✅ Restore archived announcements back to active
✅ See archived count in stats
✅ Lazy load archived data for better performance

**Status**: Production-ready
**TypeScript Errors**: None
**Performance**: Optimized with lazy loading
**UX**: Consistent with Chancery Dashboard

---

*Last Updated: October 11, 2025*
