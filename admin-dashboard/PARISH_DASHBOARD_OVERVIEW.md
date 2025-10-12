# Parish Dashboard - Comprehensive Overview

## Overview
The Parish Dashboard is the main interface for **Parish Secretaries** to manage their church profile, announcements, feedback, and generate reports. It follows a **tab-based navigation** with conditional access based on church approval status.

---

## Architecture

### File Location
`admin-dashboard/src/pages/ParishDashboard.tsx` (1053 lines)

### Key Dependencies
```typescript
- ChurchService (Firebase operations)
- ChurchProfileForm (Main form component)
- ParishReports (Analytics & reporting)
- ParishAccount (User account management)
- ParishAnnouncements (Parish-specific announcements)
- ParishFeedback (Visitor feedback management)
- VirtualTour360 (360° photo viewer)
- Layout (Sidebar navigation wrapper)
```

---

## Tab Structure

### Navigation Tabs (Sidebar)
The dashboard uses `activeTab` state managed by the Layout component sidebar:

1. **Overview** (`'overview'`)
   - Default tab
   - Shows church profile or profile form
   - Always accessible

2. **Announcements** (`'announcements'`)
   - Manage parish-specific announcements
   - ⚠️ **Requires approved church profile**

3. **Visitor Feedback** (`'feedback'`)
   - View and respond to visitor feedback
   - ⚠️ **Requires approved church profile**

4. **Generate Reports** (`'reports'`)
   - Analytics and visitor statistics
   - ⚠️ **Requires approved church profile**

5. **My Account** (`'account'`)
   - User profile and settings
   - Always accessible

---

## State Management

### Core States
```typescript
const [activeTab, setActiveTab] = useState('overview');
const [showProfileForm, setShowProfileForm] = useState(false);
const [showReports, setShowReports] = useState(false);
const [showAccount, setShowAccount] = useState(false);
const [showAnnouncements, setShowAnnouncements] = useState(false);
const [showFeedback, setShowFeedback] = useState(false);
const [churchId, setChurchId] = useState<string | null>(null);
const [isSubmitting, setIsSubmitting] = useState(false);
const [isLoading, setIsLoading] = useState(true);
const [existingChurch, setExistingChurch] = useState<Church | null>(null);
const [churchInfo, setChurchInfo] = useState<ChurchInfo>({...});
```

### Church Status States
- `draft` - Initial state, not yet submitted
- `pending` - Under chancery review
- `needs_revision` - Chancery requested changes
- `under_review` - Forwarded to museum researcher for heritage validation
- `heritage_review` - Under museum researcher review
- `approved` - Published and visible to public
- `rejected` - Submission denied

---

## User Flow

### First-Time Parish Secretary
```
1. Login → Parish Dashboard loads
2. No existing church data found
3. ChurchProfileForm automatically shown
4. Secretary fills out church information
5. Clicks "Save Draft" (stores locally) or "Submit for Review"
6. Status: pending → Waits for chancery approval
```

### Returning User - Profile Pending
```
1. Login → Dashboard loads existing draft/pending submission
2. Status banner shows "Review in Progress"
3. ChurchProfileForm shown if needs_revision
4. Can edit and resubmit
5. Other tabs disabled until approved
```

### Returning User - Profile Approved
```
1. Login → Dashboard shows Parish Profile view
2. Green banner: "Church Profile Approved!"
3. All tabs now accessible:
   - Overview → Full profile display
   - Announcements → Create parish announcements
   - Feedback → View visitor reviews
   - Reports → Analytics dashboard
4. Can edit profile using "Update Church Profile" button
```

---

## Key Features

### 1. Church Profile Management

#### Profile Form Sections:
- **Basic Information**
  - Church name, parish name
  - Location details (street, barangay, municipality)
  - Coordinates (lat/lng)
  
- **Historical Details**
  - Founding year and founders
  - Architectural style
  - Historical background
  - Major historical events
  - Heritage classification (NCT, ICP, None)
  
- **Parish Information**
  - Current parish priest
  - Mass schedules (day, time, language, FB Live)
  - Contact info (phone, email, website, Facebook)
  
- **Media**
  - Photos (church exterior/interior)
  - Documents (historical records)
  - 360° virtual tour images

#### Form Actions:
- **Save Draft** - Local storage backup
- **Submit for Review** - Send to chancery for approval
- **Cancel** - Return to profile view

### 2. Real-Time Status Updates

**Live Firebase Listener:**
```typescript
ChurchService.subscribeToChurches((churches) => {
  // Detect status changes
  // Show toast notifications
  // Update UI automatically
})
```

**Status Banners:**
- ✅ **Green** - Approved
- 🟠 **Orange** - Needs Revision
- 🔵 **Blue** - Under Review
- 🟣 **Purple** - Heritage Review

### 3. Parish Profile Display

When church is approved, displays:
- **Header Section**
  - Church name and location
  - Status badge
  - "Update Church Profile" button
  
- **Contact Information**
  - Phone, email, website, Facebook
  
- **About Section**
  - Historical background
  - Architectural style
  - Founding year and founders
  
- **360° Virtual Tour**
  - Interactive Pannellum viewer
  - Multiple 360° photos
  
- **Mass Schedules**
  - Grouped by day
  - Shows time, language, FB Live indicator

### 4. Parish Announcements (`ParishAnnouncements` component)
- Create parish-scoped announcements
- Event details (date, time, venue)
- Categories (Mass, Fiesta, Fundraising, etc.)
- Image upload
- Auto-archive after end date

### 5. Visitor Feedback (`ParishFeedback` component)
- View feedback submitted by mobile app users
- Rating display (1-5 stars)
- Respond to feedback
- Moderation tools

### 6. Reports & Analytics (`ParishReports` component)
- Visitor statistics
- Feedback summary
- Engagement metrics
- Export capabilities

### 7. Account Settings (`ParishAccount` component)
- User profile editing
- Password change
- Notification preferences

---

## Access Control Logic

### Tab Protection
```typescript
useEffect(() => {
  if (activeTab === 'announcements' || 
      activeTab === 'feedback' || 
      activeTab === 'reports') {
    if (churchInfo.status !== 'approved') {
      toast({
        title: "Profile Not Approved",
        description: "This feature requires approved church profile",
        variant: "destructive"
      });
      setActiveTab('overview');
      return;
    }
  }
}, [activeTab, churchInfo.status]);
```

### Always Accessible:
- Overview tab (shows form or profile)
- My Account tab

### Conditionally Accessible (requires approval):
- Announcements
- Visitor Feedback
- Generate Reports

---

## Data Flow

### Loading Church Data
```
1. useEffect triggers on mount
   ↓
2. ChurchService.getChurch(userProfile.parish)
   ↓
3. If exists:
   - Load data into state
   - Convert to ChurchInfo format
   - Show form if pending/needs_revision
   - Show profile if approved
   ↓
4. If not exists:
   - Initialize empty form
   - Auto-show ChurchProfileForm
```

### Saving Changes
```
1. User edits form
   ↓
2. Clicks "Save Draft"
   → localStorage backup
   → Toast notification
   
3. Clicks "Submit for Review"
   ↓
4. convertToFormData(churchInfo)
   ↓
5. ChurchService.createOrUpdateChurch()
   ↓
6. Firebase write
   ↓
7. Status → 'pending'
   ↓
8. Real-time listener updates UI
```

### Status Change Detection
```
ChurchService.subscribeToChurches listener
   ↓
Compare previousStatus !== newStatus
   ↓
Show toast notification
   ↓
Update UI (banners, form visibility)
```

---

## UI Components Hierarchy

```
ParishDashboard
├── Layout (sidebar wrapper)
│   ├── Sidebar (tab navigation)
│   └── Header (top bar)
│
├── Loading State (Loader2 spinner)
│
├── Status Banners
│   ├── Approved (green)
│   ├── Needs Revision (orange)
│   ├── Under Review (blue)
│   └── Heritage Review (purple)
│
├── Conditional Content:
│   ├── ChurchProfileForm (if showProfileForm)
│   ├── ParishAccount (if showAccount)
│   ├── ParishReports (if showReports)
│   ├── ParishAnnouncements (if showAnnouncements)
│   ├── ParishFeedback (if showFeedback)
│   └── Parish Profile Display (default)
│       ├── Header Section
│       ├── Contact Info Card
│       ├── About Card
│       ├── 360° Virtual Tour
│       └── Mass Schedules
```

---

## Integration Points

### Firebase Collections Used
- `churches` - Church profile data
- `announcements` - Parish-specific announcements (scope: 'parish')
- `feedback` - Visitor feedback
- `users` - Parish secretary profile

### Services Used
- **ChurchService**
  - `getChurch(parishId)`
  - `createOrUpdateChurch(data)`
  - `subscribeToChurches(callback)`
  
- **FeedbackService**
  - Query feedback by churchId
  
- **AnnouncementService**
  - CRUD operations for parish announcements

---

## localStorage Usage

### Keys Used
```typescript
`parish_dashboard_visited_${userProfile.email}`
  → Tracks if user has seen dashboard before
  
`church_profile_draft_${userProfile.parish}`
  → Auto-save draft data (ChurchProfileForm)
```

---

## Performance Optimizations

1. **Lazy Loading**
   - Components only render when tab is active
   - Real-time listener only subscribes on mount
   
2. **Memoization**
   - `convertChurchToInfo` wrapped in `useCallback`
   - Prevents unnecessary re-renders
   
3. **Conditional Rendering**
   - Shows loading spinner while fetching data
   - Only one main component visible at a time

---

## Known Issues & Limitations

### Current Limitations:
1. **No Multi-Parish Support** - One secretary = one parish
2. **No Bulk Operations** - Can't manage multiple churches
3. **Limited Offline Support** - Requires internet for Firebase
4. **No Draft Version History** - Can't restore previous drafts
5. **No Collaborative Editing** - Single-user editing only

### Edge Cases Handled:
- ✅ Church doesn't exist yet → Show form
- ✅ Status changes → Real-time UI updates
- ✅ Form validation → Prevents invalid submissions
- ✅ Network errors → Error messages with retry
- ✅ Missing data → Graceful defaults

---

## Testing Checklist

### First-Time User Flow
- [ ] Dashboard loads with empty form
- [ ] Can save draft to localStorage
- [ ] Can submit for review
- [ ] Status changes to 'pending'
- [ ] Other tabs disabled

### Returning User - Pending
- [ ] Existing data loads correctly
- [ ] Status banner shows "Under Review"
- [ ] Can edit and resubmit
- [ ] Form validation works

### Returning User - Approved
- [ ] Profile display shows all sections
- [ ] All tabs are accessible
- [ ] Announcements management works
- [ ] Feedback display works
- [ ] Reports generate correctly
- [ ] Can edit profile

### Status Changes
- [ ] Real-time listener detects changes
- [ ] Toast notifications appear
- [ ] UI updates automatically
- [ ] Status banners display correctly

---

## Future Enhancements (Recommended)

### High Priority:
1. **Revision History** - Track all submitted versions
2. **Comments/Notes** - Chancery can leave feedback inline
3. **Progress Indicators** - Show completion percentage
4. **Image Optimization** - Auto-compress uploads
5. **Bulk Upload** - Multiple photos at once

### Medium Priority:
6. **Export Profile** - Download as PDF
7. **Preview Mode** - See how public will see it
8. **Version Comparison** - Diff between versions
9. **Notification Center** - All status changes in one place
10. **Mobile Responsive** - Better mobile UX

### Low Priority:
11. **AI Suggestions** - Help write descriptions
12. **Translation** - Multi-language support
13. **Analytics Dashboard** - More detailed insights
14. **Social Media Integration** - Auto-post announcements
15. **Calendar View** - Visual mass schedule editor

---

## Summary

The Parish Dashboard is a **comprehensive church management system** with:
- ✅ **1053 lines** of well-structured code
- ✅ **5 main tabs** with conditional access
- ✅ **Real-time Firebase sync** for status updates
- ✅ **Role-based access control** (parish secretary only)
- ✅ **Approval workflow** integration (pending → review → approved)
- ✅ **Rich media support** (photos, documents, 360° tours)
- ✅ **Full CRUD** operations for church profile

**Status**: ✅ Production-ready, fully functional
**Last Updated**: October 11, 2025
