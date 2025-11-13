# Generate Reports - User Functionality Test

**Module**: Generate Reports  
**User Roles**: Chancery Office (Admin), Parish Secretary  
**Last Updated**: November 12, 2025  
**Test Status**: ⏳ Pending Execution

---

## Test Overview

This document outlines comprehensive functionality tests for the Generate Reports module. The system provides two main report types:
1. **Church Summary Report** - Historical and heritage information
2. **Engagement & Feedback Analytics Report** - Visitor statistics and feedback analysis

Both reports support **PDF** and **Excel** export formats.

---

## Pre-Test Requirements

### Test Accounts Required:
1. **Chancery Office Account**
   - Role: `chancery_office`
   - Diocese: `tagbilaran` or `talibon`
   - Purpose: Test diocese-wide reporting

2. **Parish Secretary Account**
   - Role: `parish_secretary`
   - Diocese: `tagbilaran` or `talibon`
   - Parish: Assigned to specific church
   - Purpose: Test parish-specific reporting (limited scope)

### Data Requirements:
- At least 3-5 approved churches in the diocese
- Churches with different classifications (ICP, NCT, Non-Heritage)
- Visitor logs data (at least 30 days of data)
- Feedback entries with ratings (mixed 1-5 stars)
- Churches with complete historical information

---

## Test Section 1: Church Summary Report (Chancery Office)

### Test 1.1: Access Church Summary Report Tab
**Role**: Chancery Office  
**Steps**:
1. Log in as Chancery Office user
2. Navigate to "Reports" or "Generate Reports" from sidebar
3. Observe the default view

**Expected Results**:
- ✅ Page loads with title "Generate Reports"
- ✅ Subtitle shows: "Create comprehensive diocesan reports for [diocese] diocese"
- ✅ Four summary stat cards display:
  - Total Churches
  - Heritage Sites (ICP + NCT count)
  - Total Visitors
  - Average Rating
- ✅ Two tabs are visible: "Church Summary Report" and "Engagement & Feedback Analytics Report"
- ✅ "Church Summary Report" tab is active by default

---

### Test 1.2: Apply Classification Filter
**Role**: Chancery Office  
**Steps**:
1. In Church Summary Report tab, locate "Report Filters" section
2. Click on "Classification" dropdown
3. Select "Important Cultural Property"
4. Observe the church cards displayed below

**Expected Results**:
- ✅ Dropdown shows options: All Classifications, Important Cultural Property, National Cultural Treasure, Non-Heritage
- ✅ Only churches with "ICP" classification are displayed
- ✅ Each church card shows green badge with "ICP" label
- ✅ Other classification churches are hidden

---

### Test 1.3: Apply Parish Filter
**Role**: Chancery Office  
**Steps**:
1. Click on "Parish" dropdown in Report Filters
2. Select a specific parish/municipality from the list
3. Observe filtered results

**Expected Results**:
- ✅ Dropdown lists all parishes/municipalities in the diocese
- ✅ First option is "All Parishes"
- ✅ Only churches from selected parish are displayed
- ✅ Filter can be combined with classification filter

---

### Test 1.4: View Church Summary Card Details
**Role**: Chancery Office  
**Steps**:
1. Reset filters to "All Parishes" and "All Classifications"
2. Locate any church card in the results
3. Read all information displayed on the card

**Expected Results**:
- ✅ Church card shows:
  - **Header**: Church name, municipality with map pin icon, classification badge
  - **Historical Info**: Founded year, founders list, architectural style, heritage status
  - **Major Events**: Bulleted list of historical events (if available)
  - **Preservation History**: Bulleted list of preservation activities (if available)
  - **Statistics**: Visitors count, average rating with star icon, reviews count

---

### Test 1.5: Export Church Summary as PDF
**Role**: Chancery Office  
**Steps**:
1. In Report Filters section, set:
   - Parish: "All Parishes"
   - Classification: "All Classifications"
   - Export Format: "PDF Document"
2. Click "Export Report" button
3. Wait for download to complete
4. Open the downloaded PDF file

**Expected Results**:
- ✅ Button triggers PDF generation
- ✅ Toast notification appears: "[Diocese] Diocese Church Summary PDF downloaded successfully"
- ✅ PDF file downloads with filename format: `[Diocese]_Diocese_Church_Summary_[Date].pdf`
- ✅ PDF contains:
  - Cover page with diocese name and date
  - Summary statistics section
  - List of all churches with complete details
  - Churches grouped by classification (ICP, NCT, Non-Heritage)
  - Professional formatting with proper spacing

---

### Test 1.6: Export Church Summary as Excel
**Role**: Chancery Office  
**Steps**:
1. In Report Filters section, set:
   - Parish: "All Parishes"
   - Classification: "Important Cultural Property"
   - Export Format: "Excel Spreadsheet"
2. Click "Export Report" button
3. Wait for download to complete
4. Open the downloaded Excel file

**Expected Results**:
- ✅ Toast notification: "[Diocese] Diocese Church Summary Excel downloaded successfully"
- ✅ Excel file downloads with filename format: `[Diocese]_Diocese_Church_Summary_[Date].xlsx`
- ✅ Excel file contains:
  - **Sheet 1 - Summary**: Diocese statistics overview
  - **Sheet 2 - Churches**: Table with columns:
    - Church Name
    - Municipality
    - Classification
    - Founding Year
    - Architectural Style
    - Heritage Status
    - Visitors
    - Avg Rating
    - Feedback Count
  - Only ICP churches included (due to filter)
  - Proper column headers and formatting

---

### Test 1.7: Export Filtered Report (Combined Filters)
**Role**: Chancery Office  
**Steps**:
1. Set filters:
   - Parish: Select specific parish
   - Classification: "National Cultural Treasure"
   - Export Format: "PDF Document"
2. Click "Export Report"
3. Verify downloaded file

**Expected Results**:
- ✅ PDF contains only NCT churches from selected parish
- ✅ If no churches match criteria, PDF shows "No churches match the selected filters"
- ✅ Toast notification confirms successful export

---

## Test Section 2: Church Summary Report (Parish Secretary)

### Test 2.1: Access Report as Parish Secretary
**Role**: Parish Secretary  
**Steps**:
1. Log in as Parish Secretary user
2. Navigate to "Reports" page
3. Observe Church Summary Report tab

**Expected Results**:
- ✅ Subtitle shows: "Create detailed reports for your parish church"
- ✅ Summary stats show data ONLY for assigned parish church
- ✅ **Parish filter dropdown is NOT visible** (restricted to own church)
- ✅ Only assigned church card is displayed
- ✅ Classification filter is available
- ✅ Export buttons are functional

---

### Test 2.2: Export Parish Report as PDF
**Role**: Parish Secretary  
**Steps**:
1. Set Export Format to "PDF Document"
2. Click "Export Report"
3. Open downloaded PDF

**Expected Results**:
- ✅ PDF contains only the parish secretary's assigned church
- ✅ Filename includes parish church name
- ✅ Toast notification confirms export
- ✅ PDF shows complete church details: history, events, preservation, statistics

---

### Test 2.3: Attempt to View Other Parish Data
**Role**: Parish Secretary  
**Steps**:
1. Inspect the page for any way to access other parish data
2. Try modifying URL parameters (if applicable)

**Expected Results**:
- ✅ No option to select other parishes
- ✅ Diocese-scoped security prevents access to other churches
- ✅ Page shows only assigned church data

---

## Test Section 3: Engagement & Feedback Analytics Report (Chancery Office)

### Test 3.1: Switch to Analytics Report Tab
**Role**: Chancery Office  
**Steps**:
1. Click on "Engagement & Feedback Analytics Report" tab
2. Observe the displayed content

**Expected Results**:
- ✅ Tab switches successfully
- ✅ Page shows "Analytics Filters" section with:
  - Start Date picker (default: 3 months ago)
  - End Date picker (default: today)
  - Export Format dropdown
  - "Export Analytics" button
- ✅ Four main analytics cards are visible:
  - Visitor Activity Trends
  - Peak Visiting Periods
  - Rating Distribution
  - Geographic Heatmap
  - Comparative Parish Engagement (Chancery only)

---

### Test 3.2: Set Date Range Filter
**Role**: Chancery Office  
**Steps**:
1. Click "Start Date" button
2. Select a date 6 months ago from calendar popup
3. Click "End Date" button
4. Select today's date
5. Wait for data to reload

**Expected Results**:
- ✅ Calendar popup opens with current month displayed
- ✅ Selected date displays in button with format "MMM DD, YYYY" (e.g., "Jun 15, 2025")
- ✅ Analytics data refreshes to show 6-month period
- ✅ Visitor Activity Trends chart updates with monthly data
- ✅ Page shows loading spinner during data fetch

---

### Test 3.3: View Visitor Activity Trends
**Role**: Chancery Office  
**Steps**:
1. Locate "Visitor Activity Trends" card
2. Read the monthly visitor data displayed

**Expected Results**:
- ✅ Card shows title: "Visitor Activity Trends"
- ✅ Subtitle: "Monthly visitor statistics showing growth and decline patterns"
- ✅ Each row displays:
  - Month name (e.g., "January 2025")
  - Progress bar showing visitor volume
  - Visitor count (e.g., "12,450")
- ✅ Months are sorted chronologically
- ✅ If no data, shows message: "No visitor data available for the selected period"

---

### Test 3.4: View Peak Visiting Periods
**Role**: Chancery Office  
**Steps**:
1. Locate "Peak Visiting Periods" card
2. Observe the time-of-day breakdown

**Expected Results**:
- ✅ Card shows three periods: Morning, Afternoon, Evening
- ✅ Each period displays:
  - Period name
  - Visitor count
  - Badge labeled "Peak" for highest traffic period (red background)
- ✅ Non-peak periods have gray background
- ✅ Data represents selected date range

---

### Test 3.5: View Rating Distribution
**Role**: Chancery Office  
**Steps**:
1. Locate "Rating Distribution" card
2. Read the star rating breakdown

**Expected Results**:
- ✅ Card shows 5 rows, one for each star rating (5 stars to 1 star)
- ✅ Each row displays:
  - Star icons (filled for rating level)
  - Progress bar showing percentage
  - Count of ratings (e.g., "45")
  - Percentage (e.g., "25%")
- ✅ Progress bars are proportional to distribution
- ✅ Total percentages add up to 100%

---

### Test 3.6: View Geographic Heatmap
**Role**: Chancery Office  
**Steps**:
1. Locate "Geographic Heatmap" or "Interactive Diocese Map" card
2. Interact with the map

**Expected Results**:
- ✅ Map displays churches in the diocese
- ✅ Churches are marked with markers/pins
- ✅ Marker color intensity represents visitor activity (heatmap style)
- ✅ Clicking a marker shows church details:
  - Church name
  - Visitor count
  - Average rating
  - Feedback count
- ✅ Map is interactive (zoom, pan controls)

---

### Test 3.7: View Comparative Parish Engagement
**Role**: Chancery Office  
**Steps**:
1. Scroll to "Comparative Parish Engagement" card
2. Read the church comparison list

**Expected Results**:
- ✅ Card displays all churches in diocese
- ✅ Churches are sorted by visitor count (highest to lowest)
- ✅ Each church row shows:
  - Church name and municipality
  - Visitor count with eye icon
  - Average rating with star icon
  - Feedback count in parentheses
- ✅ Background styling differentiates rows

---

### Test 3.8: Export Analytics as PDF
**Role**: Chancery Office  
**Steps**:
1. In Analytics Filters, set:
   - Start Date: 3 months ago
   - End Date: Today
   - Export Format: "PDF Report"
2. Click "Export Analytics" button
3. Open downloaded PDF

**Expected Results**:
- ✅ Toast notification: "[Diocese] Diocese Analytics PDF downloaded successfully"
- ✅ PDF filename format: `[Diocese]_Diocese_Analytics_[Date].pdf`
- ✅ PDF contains:
  - Cover page with date range
  - Visitor activity trends chart/table
  - Peak visiting periods summary
  - Rating distribution chart
  - Top churches by engagement table
  - Professional formatting

---

### Test 3.9: Export Analytics as Excel
**Role**: Chancery Office  
**Steps**:
1. Set Export Format to "Excel Spreadsheet"
2. Click "Export Analytics" button
3. Open downloaded Excel file

**Expected Results**:
- ✅ Toast notification: "[Diocese] Diocese Engagement Analytics Excel downloaded successfully"
- ✅ Excel filename format: `[Diocese]_Diocese_Engagement_[Date].xlsx`
- ✅ Excel file contains multiple sheets:
  - **Sheet 1 - Summary**: Overall engagement statistics
  - **Sheet 2 - Visitor Trends**: Monthly visitor data table
  - **Sheet 3 - Peak Periods**: Time-of-day breakdown
  - **Sheet 4 - Ratings**: Rating distribution table
  - **Sheet 5 - Churches**: Church-by-church engagement comparison
- ✅ All sheets have proper headers and formatting

---

### Test 3.10: Export with Custom Date Range
**Role**: Chancery Office  
**Steps**:
1. Set Start Date to 1 year ago
2. Set End Date to 6 months ago (past date range)
3. Export as PDF

**Expected Results**:
- ✅ System accepts past date range
- ✅ Analytics data filters to specified period
- ✅ PDF exports successfully with historical data
- ✅ Report cover page shows custom date range

---

## Test Section 4: Analytics Report (Parish Secretary)

### Test 4.1: View Analytics as Parish Secretary
**Role**: Parish Secretary  
**Steps**:
1. Switch to "Engagement & Feedback Analytics Report" tab
2. Observe displayed analytics

**Expected Results**:
- ✅ All analytics cards display data for assigned parish church only
- ✅ Visitor Activity Trends shows parish-specific data
- ✅ Rating Distribution shows only parish church feedback
- ✅ **"Comparative Parish Engagement" card is NOT visible** (Chancery-only feature)
- ✅ Export buttons are functional

---

### Test 4.2: Export Parish Analytics
**Role**: Parish Secretary  
**Steps**:
1. Set date range and export format
2. Export as PDF and Excel
3. Verify downloaded files

**Expected Results**:
- ✅ PDF contains only parish church analytics
- ✅ Excel contains single church data
- ✅ Filenames include parish church name
- ✅ No diocese-wide comparisons included

---

## Test Section 5: Error Handling & Edge Cases

### Test 5.1: Export with No Data Available
**Role**: Chancery Office  
**Steps**:
1. Set filters to eliminate all churches (e.g., select parish with no NCT churches + NCT filter)
2. Click "Export Report"

**Expected Results**:
- ✅ System handles gracefully
- ✅ Either:
  - PDF/Excel generates with "No data available" message, OR
  - Toast notification: "No data to export with current filters"
- ✅ No system errors or crashes

---

### Test 5.2: Export Before Data Loads
**Role**: Chancery Office  
**Steps**:
1. Immediately after login, navigate to Reports
2. Click "Export Report" before loading spinner disappears

**Expected Results**:
- ✅ Export button is disabled during loading, OR
- ✅ Toast notification: "Please wait for data to load before exporting"
- ✅ No broken/empty reports generated

---

### Test 5.3: Invalid Date Range
**Role**: Chancery Office  
**Steps**:
1. In Analytics tab, set:
   - Start Date: Today
   - End Date: 1 month ago (invalid - end before start)
2. Attempt to export

**Expected Results**:
- ✅ System validates date range
- ✅ Error message: "End date must be after start date"
- ✅ Export button disabled or validation prevents export
- ✅ User prompted to correct dates

---

### Test 5.4: Network Error During Export
**Role**: Chancery Office  
**Steps**:
1. Start export process
2. Simulate network interruption (disconnect internet or use DevTools offline mode)
3. Observe behavior

**Expected Results**:
- ✅ Toast notification: "Export Failed - Failed to export report. Please try again."
- ✅ No partial/corrupted file downloads
- ✅ User can retry export after reconnection

---

### Test 5.5: No Churches in Diocese
**Role**: Chancery Office (new diocese with no churches)  
**Steps**:
1. Log in to account with diocese that has no approved churches
2. Navigate to Reports page

**Expected Results**:
- ✅ Summary stats show zeros:
  - Total Churches: 0
  - Heritage Sites: 0
  - Total Visitors: 0
  - Average Rating: 0.0
- ✅ Church Summary tab shows empty state message:
  - Church icon
  - "No Churches Found"
  - "There are no approved churches in the [diocese] diocese yet. Churches will appear here once they are approved."
- ✅ Export buttons are disabled or show "No data to export"

---

### Test 5.6: Large Dataset Performance
**Role**: Chancery Office  
**Steps**:
1. Use diocese with 50+ churches and thousands of visitor logs
2. Export Church Summary as Excel
3. Monitor export time and file size

**Expected Results**:
- ✅ Export completes within reasonable time (under 30 seconds)
- ✅ Progress indicator shown during generation
- ✅ File size is reasonable (under 10MB)
- ✅ Excel file opens without errors
- ✅ All data is complete and accurate

---

## Test Section 6: UI/UX & Accessibility

### Test 6.1: Responsive Design - Mobile View
**Steps**:
1. Resize browser to mobile width (375px)
2. Navigate Reports page
3. Test all interactions

**Expected Results**:
- ✅ Summary stat cards stack vertically
- ✅ Filter dropdowns are full-width
- ✅ Church cards display properly in single column
- ✅ Tabs are scrollable/responsive
- ✅ Export buttons remain accessible
- ✅ Date pickers open correctly on mobile

---

### Test 6.2: Tablet View
**Steps**:
1. Resize browser to tablet width (768px)
2. Test all report features

**Expected Results**:
- ✅ Two-column layout for church cards
- ✅ Filters displayed in responsive grid
- ✅ Charts/graphs scale appropriately
- ✅ No horizontal scrolling required

---

### Test 6.3: Loading States
**Steps**:
1. Navigate to Reports page with slow network (throttle in DevTools)
2. Observe loading indicators

**Expected Results**:
- ✅ Spinner displayed with message: "Loading diocese analytics..."
- ✅ Page doesn't render incomplete data
- ✅ Skeleton loaders or placeholders shown (optional)
- ✅ Export buttons disabled until data loads

---

### Test 6.4: Button States
**Steps**:
1. Hover over "Export Report" button
2. Click and observe active state
3. Check disabled state when no data

**Expected Results**:
- ✅ Hover shows visual feedback (background change)
- ✅ Active state shows button press animation
- ✅ Disabled state is visually distinct (grayed out, no cursor pointer)
- ✅ Download icon displays correctly

---

### Test 6.5: Empty State Messages
**Steps**:
1. Test scenarios with no data:
   - No visitor trends
   - No rating distribution
   - No peak periods
2. Verify empty state messages

**Expected Results**:
- ✅ Each card shows appropriate icon (grayed out)
- ✅ Clear message explains lack of data
- ✅ Consistent empty state styling across all cards

---

## Test Section 7: Data Accuracy & Validation

### Test 7.1: Verify Church Summary Data Accuracy
**Role**: Chancery Office  
**Steps**:
1. Note details of a specific church from Churches page
2. Navigate to Reports > Church Summary
3. Compare displayed data

**Expected Results**:
- ✅ Church name matches exactly
- ✅ Classification badge matches
- ✅ Founding year is correct
- ✅ Founders list matches
- ✅ Major events list matches
- ✅ Visitor count matches dashboard stats
- ✅ Average rating matches

---

### Test 7.2: Verify Visitor Statistics Accuracy
**Role**: Chancery Office  
**Steps**:
1. Export Engagement Analytics for last month
2. Manually verify visitor count from individual church data
3. Compare totals

**Expected Results**:
- ✅ Total visitors in report matches sum of individual church visitors
- ✅ Monthly breakdown is accurate
- ✅ Peak periods reflect actual visitor logs
- ✅ No duplicate or missing visitor records

---

### Test 7.3: Verify Rating Distribution Accuracy
**Role**: Chancery Office  
**Steps**:
1. Check Feedback page for rating breakdown
2. Compare with Rating Distribution in Analytics report

**Expected Results**:
- ✅ Rating counts match between pages
- ✅ Percentages calculate correctly
- ✅ Average rating is mathematically correct
- ✅ Data is filtered by selected date range

---

### Test 7.4: Cross-Reference Exported Data
**Role**: Chancery Office  
**Steps**:
1. Export Church Summary as PDF
2. Export same report as Excel
3. Compare data between formats

**Expected Results**:
- ✅ Church list is identical in both formats
- ✅ Statistics match exactly (visitors, ratings, feedback count)
- ✅ Both exports include same date range
- ✅ No data loss or corruption between formats

---

## Test Section 8: Security & Permissions

### Test 8.1: Verify Diocese Data Isolation
**Role**: Chancery Office (Tagbilaran)  
**Steps**:
1. Log in as Tagbilaran Chancery user
2. View all reports
3. Log out and log in as Talibon Chancery user
4. Compare visible data

**Expected Results**:
- ✅ Tagbilaran user sees ONLY Tagbilaran churches
- ✅ Talibon user sees ONLY Talibon churches
- ✅ No cross-diocese data leakage
- ✅ Summary stats reflect correct diocese only

---

### Test 8.2: Verify Parish Secretary Restrictions
**Role**: Parish Secretary  
**Steps**:
1. Log in as Parish Secretary
2. Inspect page source and network requests
3. Attempt to access other parish data via URL manipulation

**Expected Results**:
- ✅ API requests filter by parish ID
- ✅ Cannot access other parishes via URL params
- ✅ Firestore security rules block unauthorized queries
- ✅ Only assigned church data is visible

---

### Test 8.3: Museum Researcher Access (if applicable)
**Role**: Museum Researcher  
**Steps**:
1. Log in as Museum Researcher
2. Navigate to Reports page

**Expected Results**:
- ✅ Museum researcher has read-only access to reports, OR
- ✅ Reports page is restricted (access denied), OR
- ✅ Limited view showing only heritage site validation data

---

## Test Section 9: Export Format Validation

### Test 9.1: PDF Format Validation
**Steps**:
1. Export any report as PDF
2. Open in multiple PDF readers (Adobe, browser, mobile)
3. Verify rendering

**Expected Results**:
- ✅ PDF opens in all standard readers
- ✅ Fonts render correctly
- ✅ Images/charts display properly
- ✅ No broken layouts or overlapping text
- ✅ Links are clickable (if any)
- ✅ Metadata shows correct title and author

---

### Test 9.2: Excel Format Validation
**Steps**:
1. Export any report as Excel
2. Open in Microsoft Excel, Google Sheets, LibreOffice
3. Verify compatibility

**Expected Results**:
- ✅ File opens in all spreadsheet applications
- ✅ Multiple sheets load correctly
- ✅ Column widths are appropriate
- ✅ Number formatting is correct (commas for thousands)
- ✅ Headers are bold/styled
- ✅ No formula errors
- ✅ Data is sortable and filterable

---

### Test 9.3: Filename Conventions
**Steps**:
1. Export multiple reports with different settings
2. Check downloaded filenames

**Expected Results**:
- ✅ Filenames follow pattern: `[Diocese]_[ReportType]_[Date].[ext]`
- ✅ Examples:
  - `Tagbilaran_Diocese_Church_Summary_2025-11-12.pdf`
  - `Talibon_Diocese_Engagement_2025-11-12.xlsx`
- ✅ No special characters that cause file system issues
- ✅ Date format is consistent (YYYY-MM-DD)

---

## Test Section 10: Integration Testing

### Test 10.1: Data Sync with Churches Module
**Steps**:
1. Approve a new church in Churches module
2. Navigate to Reports page
3. Verify new church appears

**Expected Results**:
- ✅ New church appears in Church Summary report immediately (after page refresh)
- ✅ Summary stats update (total churches count increases)
- ✅ Church details are complete and accurate

---

### Test 10.2: Data Sync with Feedback Module
**Steps**:
1. Add new feedback via Feedback module (or mobile app)
2. Refresh Reports page Analytics tab
3. Check Rating Distribution and stats

**Expected Results**:
- ✅ New feedback reflects in rating distribution
- ✅ Average rating updates correctly
- ✅ Feedback count increases
- ✅ Data syncs within reasonable time (real-time or after refresh)

---

### Test 10.3: Data Sync with Visitor Logs
**Steps**:
1. Simulate visitor activity (via mobile app or test data)
2. Refresh Analytics report
3. Verify visitor trends update

**Expected Results**:
- ✅ Visitor count increases in summary stats
- ✅ Monthly trends chart updates
- ✅ Peak periods reflect new data
- ✅ Heatmap updates with activity

---

## Summary & Test Execution Checklist

### Chancery Office Tests:
- [ ] Test 1.1 - 1.7: Church Summary Report (Full Access)
- [ ] Test 3.1 - 3.10: Engagement Analytics Report (Full Access)
- [ ] Test 5.1 - 5.6: Error Handling
- [ ] Test 7.1 - 7.4: Data Accuracy
- [ ] Test 8.1: Diocese Isolation
- [ ] Test 9.1 - 9.3: Export Formats
- [ ] Test 10.1 - 10.3: Integration

### Parish Secretary Tests:
- [ ] Test 2.1 - 2.3: Church Summary (Restricted)
- [ ] Test 4.1 - 4.2: Analytics (Restricted)
- [ ] Test 8.2: Permission Restrictions

### UI/UX Tests (All Roles):
- [ ] Test 6.1 - 6.5: Responsive Design & States

### Critical Success Criteria:
✅ All reports generate without errors  
✅ PDF and Excel formats are valid and readable  
✅ Diocese data isolation is enforced  
✅ Parish secretary sees only assigned church  
✅ Filters apply correctly  
✅ Export filenames follow conventions  
✅ Data accuracy matches source modules  
✅ Loading states display properly  
✅ Error messages are user-friendly  

---

## Notes for Testers

1. **Test Data Setup**: Ensure sufficient test data exists before running tests
2. **Browser Compatibility**: Test on Chrome, Firefox, Edge, Safari
3. **Performance**: Monitor export times, especially for large datasets
4. **Accessibility**: Test keyboard navigation and screen reader compatibility
5. **Documentation**: Screenshot any bugs or unexpected behavior
6. **Regression Testing**: Re-run tests after any code changes to reports module

---

## Bug Reporting Template

**Bug ID**: [Auto-generated]  
**Test Case**: [e.g., Test 1.5]  
**Severity**: [Critical / High / Medium / Low]  
**Description**: [What went wrong]  
**Steps to Reproduce**:  
1. [Step 1]  
2. [Step 2]  
**Expected Result**: [What should happen]  
**Actual Result**: [What actually happened]  
**Screenshots**: [Attach if applicable]  
**Environment**: [Browser, OS, user role]  

---

**End of Generate Reports Test Document**
