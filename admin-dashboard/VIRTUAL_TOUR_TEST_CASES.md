# Virtual Tour Manager - Test Cases

## Test Environment Setup
- **User Role**: Parish Secretary or Chancery Office
- **Authentication**: Must be logged in
- **Church Profile**: Must have an existing church profile with a valid Church ID
- **Browser**: Chrome/Edge (recommended for best compatibility)
- **Network**: Stable internet connection required

---

## Test Case 1: Upload 360° Panoramic Images

### Prerequisites
- User is logged in as Parish Secretary
- Church profile exists in the system
- At least 1 equirectangular 360° image prepared (2:1 aspect ratio)
- Image file size: 5MB - 15MB (test compression)
- Supported formats: JPEG, PNG, WebP

### Test Steps

#### 1.1 Navigate to Virtual Tour Section
1. Log in as Parish Secretary
2. Navigate to Parish Dashboard
3. Click "Edit Profile" or "Add Profile" button
4. Click on the "Media" tab
5. Scroll to "360° Virtual Tour" section
6. **Expected**: Should see "Upload 360° Images" upload area
7. **Expected**: Should see "Max 8 scenes" limit indicator
8. **Expected**: Should see "Click to select equirectangular panoramic images (images will be compressed)" text

#### 1.2 Upload Single 360° Image
1. Click the upload area or drag and drop a 360° image
2. Select a valid 360° panoramic image (e.g., `church_exterior_360.jpg`)
3. **Expected**: 
   - Image appears in upload queue with progress indicator
   - Console shows: `[VirtualTourManager] Selected 1 file(s) for upload`
   - Console shows: `[VirtualTourManager] Current scenes: 0/8`
   - Console shows: `[VirtualTourManager] Starting upload: [filename]`
4. Wait for upload to complete
5. **Expected**:
   - Console shows: `[Compression] [filename]: [original_size] → [compressed_size] (85% quality)`
   - Console shows: `[VirtualTourManager] Upload path: churches/[sanitized_church_id]/360tours/[timestamp]-[filename]`
   - Progress bar reaches 100%
   - Image disappears from upload queue
   - Success message: "360° image uploaded successfully"
6. **Expected**: Image now appears in the scenes list below
7. **Verify**: 
   - Scene card shows the 360° thumbnail
   - Scene has a default title (e.g., "Scene 1")
   - Scene shows "0 hotspots"
   - "Set as Default" button is visible
   - "Edit Scene" and "Delete" buttons are visible

#### 1.3 Upload Multiple 360° Images (Batch Upload)
1. Click the upload area
2. Select multiple 360° images (2-3 images)
3. **Expected**:
   - Console shows: `[VirtualTourManager] Selected [N] file(s) for upload`
   - All images appear in upload queue
   - Each image has its own progress bar
4. Wait for all uploads to complete
5. **Expected**:
   - Each image uploads sequentially
   - Success message appears for each uploaded image
   - All images appear in the scenes list
   - Scene count updates (e.g., "Current scenes: 3/8")

#### 1.4 Test Upload Limits
1. Upload 8 panoramic images one by one or in batches
2. **Expected**: After 8 scenes, upload area should be disabled
3. Try to upload a 9th image
4. **Expected**: Error message: "Maximum of 8 scenes reached"

#### 1.5 Test Invalid Image Upload
1. Try to upload a non-360° image (regular photo, 4:3 or 16:9 aspect ratio)
2. **Expected**: System should still allow upload (validation is not enforced client-side)
3. Try to upload a non-image file (PDF, Word document)
4. **Expected**: Error message about invalid file type

#### 1.6 Test Large File Compression
1. Upload a large 360° image (>10MB, ideally 15-20MB)
2. **Expected**:
   - Console shows compression details: `[Compression] [filename]: 15.2MB → 1.8MB (85% quality)`
   - Upload completes within reasonable time (30-60 seconds)
   - Image quality remains acceptable when viewed

---

## Test Case 2: Manage 360° Scenes

### Prerequisites
- At least 2 panoramic images uploaded (from Test Case 1)

### Test Steps

#### 2.1 Set Default Scene
1. Locate a scene card that is not the default
2. Click "Set as Default" button
3. **Expected**:
   - Scene card shows "Default Scene" badge
   - Previously default scene loses the "Default Scene" badge
   - Success message: "Default scene updated"
4. Refresh the page
5. **Expected**: Default scene setting persists

#### 2.2 Edit Scene Title
1. Click "Edit Scene" button on any scene card
2. Click on the scene title text field
3. Change title to "Church Main Entrance"
4. Click outside the text field or press Enter
5. **Expected**: 
   - Title updates immediately
   - No need to save separately
6. Refresh the page
7. **Expected**: Title change persists

#### 2.3 Preview 360° Scene
1. Click anywhere on the scene card (not on buttons)
2. **Expected**: 
   - Preview modal opens
   - 360° panorama loads in Pannellum viewer
   - Can drag to look around (mouse/touch controls work)
   - Hotspots are visible if any exist
3. Click the X button or outside the modal
4. **Expected**: Modal closes

#### 2.4 Delete Scene
1. Click the "Delete" button (trash icon) on a scene card
2. **Expected**: Confirmation dialog appears
3. Click "Cancel"
4. **Expected**: Scene is NOT deleted
5. Click "Delete" button again
6. Click "Confirm" in the confirmation dialog
7. **Expected**:
   - Scene is removed from the list
   - Success message: "Scene deleted successfully"
   - Scene count updates (e.g., "Current scenes: 2/8")
   - If deleted scene was default, another scene becomes default automatically

---

## Test Case 3: Add Hotspots to 360° Scenes

### Prerequisites
- At least 2 panoramic scenes uploaded
- Scenes have descriptive titles (e.g., "Exterior", "Interior")

### Test Steps

#### 3.1 Open Hotspot Editor
1. Click "Edit Scene" button on a scene card
2. Scroll down to the "Hotspots" section
3. **Expected**: 
   - See "Add Hotspot" button
   - See list of existing hotspots (empty if none)
   - See Pannellum viewer showing the current scene

#### 3.2 Add Information Hotspot
1. Click "Add Hotspot" button
2. Select "Information" from the hotspot type dropdown
3. **Expected**: Hotspot form appears with the following fields:
   - Hotspot Type: Information (selected)
   - Title (required)
   - Description (required)
   - Pitch (required, default: 0)
   - Yaw (required, default: 0)
4. Fill in the form:
   - Title: "Saint Joseph Statue"
   - Description: "This statue was erected in 1952 to honor the patron saint of workers"
   - Pitch: 10
   - Yaw: 45
5. Click "Save Hotspot" button
6. **Expected**:
   - Hotspot appears in the Pannellum viewer at the specified coordinates
   - Hotspot shows as an "i" (information) icon
   - Success message: "Hotspot added successfully"
   - Hotspot appears in the hotspots list below
   - Scene card shows "1 hotspot"

#### 3.3 Verify Information Hotspot in Viewer
1. In the Pannellum viewer, look for the hotspot icon at pitch=10, yaw=45
2. Hover over or click the hotspot
3. **Expected**: 
   - Tooltip appears showing title
   - Clicking shows description in a popup

#### 3.4 Add Navigation Hotspot (Scene Link)
1. Click "Add Hotspot" button again
2. Select "Scene Link" from the hotspot type dropdown
3. **Expected**: Form shows:
   - Hotspot Type: Scene Link (selected)
   - Title (required)
   - Target Scene (dropdown with other scenes)
   - Pitch (required)
   - Yaw (required)
4. Fill in the form:
   - Title: "Go to Interior"
   - Target Scene: Select "Interior" scene from dropdown
   - Pitch: 0
   - Yaw: 180
5. Click "Save Hotspot" button
6. **Expected**:
   - Navigation hotspot appears in viewer (different icon from info hotspot)
   - Shows as an arrow or door icon
   - Success message: "Hotspot added successfully"
   - Scene card shows "2 hotspots"

#### 3.5 Verify Navigation Hotspot in Viewer
1. In the Pannellum viewer, click the navigation hotspot
2. **Expected**: 
   - Viewer transitions to the target scene ("Interior")
   - Smooth transition animation
   - Navigation hotspot is clickable and functional

#### 3.6 Test Interactive Hotspot Placement
1. In the Pannellum viewer, drag/rotate the view to a specific location
2. Note the Pitch and Yaw values displayed (if visible)
3. Click "Add Hotspot" button
4. **Expected**: Pitch and Yaw fields should auto-populate with current view position
5. Fill in title and description
6. Click "Save Hotspot"
7. **Expected**: Hotspot appears exactly where you were looking in the viewer

#### 3.7 Add Multiple Hotspots to One Scene
1. Add 3-5 different hotspots to the same scene (mix of info and navigation)
2. **Expected**:
   - All hotspots appear in the viewer
   - Scene card shows correct hotspot count (e.g., "5 hotspots")
   - Hotspots list shows all hotspots
3. Test each hotspot by clicking in the viewer
4. **Expected**: Each hotspot functions correctly

#### 3.8 Edit Existing Hotspot
1. In the hotspots list, click "Edit" button on a hotspot
2. **Expected**: Hotspot form appears with existing values pre-filled
3. Change the title to "Updated Title"
4. Change pitch to 15
5. Click "Save Hotspot" button
6. **Expected**:
   - Hotspot updates in the viewer at new position
   - Success message: "Hotspot updated successfully"
   - Changes reflected in hotspots list

#### 3.9 Delete Hotspot
1. In the hotspots list, click "Delete" button on a hotspot
2. **Expected**: Confirmation dialog appears
3. Click "Confirm"
4. **Expected**:
   - Hotspot disappears from viewer
   - Hotspot removed from hotspots list
   - Scene card hotspot count decreases
   - Success message: "Hotspot deleted successfully"

---

## Test Case 4: Create Connected Virtual Tour Navigation

### Prerequisites
- 4 scenes uploaded with titles:
  - "Exterior Front"
  - "Main Entrance"
  - "Interior Nave"
  - "Altar Area"

### Test Steps

#### 4.1 Create Navigation Path
1. Open "Exterior Front" scene for editing
2. Add navigation hotspot:
   - Title: "Enter Church"
   - Target: "Main Entrance"
   - Position: Center of view (Pitch: 0, Yaw: 0)
3. Save hotspot

4. Open "Main Entrance" scene for editing
5. Add two navigation hotspots:
   - Hotspot 1: "Go Outside" → Target: "Exterior Front" (Pitch: 0, Yaw: 180)
   - Hotspot 2: "Enter Interior" → Target: "Interior Nave" (Pitch: 0, Yaw: 0)
6. Save both hotspots

7. Open "Interior Nave" scene for editing
8. Add two navigation hotspots:
   - Hotspot 1: "Back to Entrance" → Target: "Main Entrance" (Pitch: 0, Yaw: 180)
   - Hotspot 2: "View Altar" → Target: "Altar Area" (Pitch: 0, Yaw: 0)
9. Save both hotspots

10. Open "Altar Area" scene for editing
11. Add navigation hotspot:
    - Title: "Back to Nave"
    - Target: "Interior Nave"
    - Position: Pitch: 0, Yaw: 180
12. Save hotspot

#### 4.2 Test Complete Navigation Flow
1. Preview "Exterior Front" scene
2. Click "Enter Church" hotspot
3. **Expected**: Transitions to "Main Entrance" scene
4. Click "Enter Interior" hotspot
5. **Expected**: Transitions to "Interior Nave" scene
6. Click "View Altar" hotspot
7. **Expected**: Transitions to "Altar Area" scene
8. Click "Back to Nave" hotspot
9. **Expected**: Transitions back to "Interior Nave"
10. **Expected**: All transitions are smooth and navigation works bidirectionally

#### 4.3 Test Navigation from Scene Card Preview
1. Close the scene editor
2. From the main Virtual Tour Manager view, click on "Exterior Front" scene card
3. **Expected**: Preview modal opens with the scene
4. Navigate through all hotspots to test the complete tour
5. **Expected**: Can navigate the entire tour from the preview modal

---

## Test Case 5: Save and Persist Virtual Tour Data

### Prerequisites
- Virtual tour with multiple scenes and hotspots created

### Test Steps

#### 5.1 Auto-Save Verification
1. Add a new scene or hotspot
2. Wait 2-3 seconds
3. **Expected**: Data saves automatically (no manual save button needed)
4. Check browser console for Firebase update logs

#### 5.2 Page Refresh Persistence
1. Note the current state (number of scenes, hotspots, titles, default scene)
2. Refresh the browser page (F5 or Ctrl+R)
3. **Expected**:
   - All scenes load correctly
   - Scene titles are preserved
   - Default scene is still marked as default
   - Hotspot counts are correct
4. Open a scene for editing
5. **Expected**: All hotspots are still present with correct data

#### 5.3 Cross-Session Persistence
1. Note the current virtual tour state
2. Log out completely
3. Close the browser
4. Open a new browser session
5. Log in as the same Parish Secretary
6. Navigate to Parish Dashboard → Media tab → Virtual Tour
7. **Expected**: All virtual tour data is preserved exactly as before

#### 5.4 Firebase Storage Verification
1. Open Firebase Console (https://console.firebase.google.com)
2. Navigate to Storage section
3. Browse to: `churches/[sanitized_church_id]/360tours/`
4. **Expected**: 
   - All uploaded 360° images are present
   - File names follow pattern: `[timestamp]-[sanitized_filename].jpg`
   - File sizes show compression worked (1-2MB per image)

#### 5.5 Firestore Data Verification
1. Open Firebase Console → Firestore Database
2. Navigate to `churches` collection
3. Find your church document
4. **Expected**: Document contains:
   - `virtual360Tour` field with object containing:
     - `scenes` array with all scene data
     - Each scene has: `id`, `imageUrl`, `title`, `isDefault`, `hotspots` array
     - Each hotspot has: `id`, `type`, `title`, `pitch`, `yaw`, and type-specific data

---

## Test Case 6: Error Handling and Edge Cases

### Test Steps

#### 6.1 Network Interruption During Upload
1. Start uploading a large 360° image
2. Disconnect internet while upload is in progress (turn off WiFi)
3. **Expected**: 
   - Upload fails with error message
   - Error message: "Upload failed. Please check your internet connection and try again."
   - Image removed from upload queue
4. Reconnect internet
5. Try uploading again
6. **Expected**: Upload succeeds

#### 6.2 Browser Refresh During Upload
1. Start uploading multiple 360° images
2. Refresh the page while uploads are in progress
3. **Expected**: 
   - Partially uploaded images are abandoned
   - Need to re-upload images
   - Already completed uploads are preserved

#### 6.3 Invalid Hotspot Coordinates
1. Try to add a hotspot with invalid values:
   - Pitch: 500 (should be -90 to 90)
   - Yaw: 400 (should be -180 to 180)
2. **Expected**: 
   - Validation error or warning
   - OR values are clamped to valid ranges

#### 6.4 Delete Default Scene
1. Mark a scene as default
2. Try to delete the default scene
3. **Expected**: 
   - Confirmation dialog warns about deleting default scene
   - After deletion, another scene automatically becomes default

#### 6.5 Navigation Hotspot to Deleted Scene
1. Create navigation hotspot from Scene A to Scene B
2. Delete Scene B
3. Open Scene A in viewer
4. Click the navigation hotspot
5. **Expected**: 
   - Hotspot doesn't crash the viewer
   - Shows error message: "Target scene not found"
   - OR hotspot is automatically removed

#### 6.6 Maximum File Size Exceeded
1. Try to upload a 360° image larger than 50MB
2. **Expected**: Error message about file size limit

#### 6.7 Session Timeout During Editing
1. Open virtual tour editor
2. Let browser sit idle for 1+ hour (test session timeout)
3. Try to add a scene or hotspot
4. **Expected**: 
   - Permission error OR auto-refresh authentication
   - Prompt to log in again if session expired

---

## Test Case 7: Mobile App Integration (If Applicable)

### Prerequisites
- Virtual tour created in admin dashboard
- Mobile app installed and church data synced

### Test Steps

#### 7.1 View Virtual Tour in Mobile App
1. Open mobile app
2. Navigate to church detail page
3. Look for Virtual Tour section
4. **Expected**: Virtual tour button/section is visible
5. Tap on Virtual Tour
6. **Expected**:
   - 360° viewer loads
   - Can drag to look around
   - All scenes are accessible
   - Hotspots are functional
   - Navigation between scenes works

---

## Expected Results Summary

### ✅ Success Criteria
- All 360° images upload successfully and are compressed
- Images are stored in correct Firebase Storage path: `churches/{churchId}/360tours/`
- Storage rules allow authenticated parish secretaries to upload
- Scene management (add, edit, delete, set default) works correctly
- Hotspots can be added, edited, and deleted
- Information hotspots display correct content
- Navigation hotspots enable scene transitions
- Data persists across page refreshes and sessions
- Preview functionality works in both scene editor and scene cards
- Virtual tour is accessible from mobile app (if implemented)

### ❌ Known Issues (As of Current Version)
- 360° images are compressed (may reduce quality for high-res tours)
- No visual picker for hotspot coordinates (must enter manually)
- Maximum 8 scenes limit is hardcoded
- No undo/redo functionality
- No bulk hotspot operations

---

## Testing Checklist

- [ ] Test Case 1.1: Navigate to Virtual Tour Section
- [ ] Test Case 1.2: Upload Single 360° Image
- [ ] Test Case 1.3: Upload Multiple Images (Batch)
- [ ] Test Case 1.4: Test Upload Limits (8 scenes)
- [ ] Test Case 1.5: Test Invalid Image Upload
- [ ] Test Case 1.6: Test Large File Compression
- [ ] Test Case 2.1: Set Default Scene
- [ ] Test Case 2.2: Edit Scene Title
- [ ] Test Case 2.3: Preview 360° Scene
- [ ] Test Case 2.4: Delete Scene
- [ ] Test Case 3.1: Open Hotspot Editor
- [ ] Test Case 3.2: Add Information Hotspot
- [ ] Test Case 3.3: Verify Information Hotspot
- [ ] Test Case 3.4: Add Navigation Hotspot
- [ ] Test Case 3.5: Verify Navigation Hotspot
- [ ] Test Case 3.6: Test Interactive Hotspot Placement
- [ ] Test Case 3.7: Add Multiple Hotspots
- [ ] Test Case 3.8: Edit Existing Hotspot
- [ ] Test Case 3.9: Delete Hotspot
- [ ] Test Case 4.1: Create Navigation Path (4 scenes)
- [ ] Test Case 4.2: Test Complete Navigation Flow
- [ ] Test Case 4.3: Test Navigation from Scene Card
- [ ] Test Case 5.1: Auto-Save Verification
- [ ] Test Case 5.2: Page Refresh Persistence
- [ ] Test Case 5.3: Cross-Session Persistence
- [ ] Test Case 5.4: Firebase Storage Verification
- [ ] Test Case 5.5: Firestore Data Verification
- [ ] Test Case 6.1: Network Interruption During Upload
- [ ] Test Case 6.2: Browser Refresh During Upload
- [ ] Test Case 6.3: Invalid Hotspot Coordinates
- [ ] Test Case 6.4: Delete Default Scene
- [ ] Test Case 6.5: Navigation Hotspot to Deleted Scene
- [ ] Test Case 6.6: Maximum File Size Exceeded
- [ ] Test Case 6.7: Session Timeout During Editing
- [ ] Test Case 7.1: View Virtual Tour in Mobile App

---

## Bug Reporting Template

**Bug Title**: [Brief description]

**Test Case**: [Which test case revealed the bug]

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**: 

**Actual Behavior**: 

**Screenshots/Console Logs**: 

**Browser/Device**: 

**User Role**: 

**Severity**: [Critical / High / Medium / Low]

---

## Notes for Testers

1. **Console Logging**: Keep browser console open during testing to see detailed logs from VirtualTourManager
2. **Network Tab**: Monitor Firebase Storage uploads in Network tab for debugging
3. **File Preparation**: Prepare test 360° images in advance (use free 360° camera apps or sample images)
4. **Test Data**: Use a test church account, not production data
5. **Compression Testing**: Upload same image multiple times to verify consistent compression
6. **Cross-Browser**: Test in Chrome, Firefox, Safari, and Edge if possible
7. **Mobile Testing**: Test on both Android and iOS if mobile app integration exists

---

*Document Version: 1.0*  
*Last Updated: November 16, 2025*  
*Tested System Version: VISITA Admin Dashboard - Virtual Tour Manager*
