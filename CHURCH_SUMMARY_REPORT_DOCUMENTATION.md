# Church Summary Report - Implementation Documentation

## Overview

The Church Summary Report has been redesigned to provide a comprehensive, well-organized document that presents church information in a professional, hierarchical manner suitable for official documentation, heritage applications, and historical records.

## Document Structure

The report is organized into **7 main sections** with professional formatting and layout:

### 1. COVER PAGE / HEADER
**Purpose:** Professional presentation and identification

**Contents:**
- Report title with blue header banner
- Church/Parish name prominently displayed
- Report generation date
- Report type (Official Church Documentation)
- Diocese information

**Visual Design:**
- Blue (#3B82F6) header banner spanning full width
- White text on colored background
- Centered alignment for professional appearance

---

### 2. BASIC INFORMATION SECTION
**Purpose:** Essential identifying information

**Fields Included:**
- Parish Name (single field - church name removed to avoid redundancy)
- Street Address
- Barangay
- Municipality
- Province (Bohol)
- Geographic Coordinates (Latitude/Longitude)
- Current Parish Priest
- Diocese (Tagbilaran or Talibon)

**Formatting:**
- Structured table format with two columns (Field | Details)
- Bold field names for easy scanning
- Blue header (#3B82F6) for visual consistency

**Note:** Church Name field removed to avoid redundancy with Parish Name

---

### 3. CLASSIFICATIONS & STATUS SECTION
**Purpose:** Document official designations and heritage status

**Fields Included:**
- **Heritage Classification:**
  - National Cultural Treasures (NCT)
  - Important Cultural Properties (ICP)
  - None
- **Religious Classification:**
  - Diocesan Shrine
  - Jubilee Church
  - Papal Basilica Affinity
  - None
- **Founding Year**
- **Architectural Style:**
  - Baroque / Spanish Colonial
  - Neo-Gothic
  - Byzantine
  - Neo-Classical
  - Modern
  - Mixed
  - Other

**Formatting:**
- Green header (#10B981) to distinguish from other sections
- Badge-style presentation of classifications

---

### 4. HISTORICAL INFORMATION SECTION
**Purpose:** Comprehensive historical narrative and context

**Subsections:**

#### 4.1 Founding Details
- Founding Year
- Founders (names and roles)

#### 4.2 Historical Background
- Detailed narrative of church history
- Evolution and transformations
- Connection to local/regional/national history
- Full text block with proper word wrapping

#### 4.3 Major Historical Events
- Significant events in church history
- Chronological milestones
- Community impact

**Formatting:**
- Subsection numbering (3.1, 3.2, 3.3)
- Gray subsection headers for hierarchy
- Plain table format for founding details
- Full-text blocks for narratives

---

### 5. ARCHITECTURAL & HERITAGE INFORMATION SECTION
**Purpose:** Document architectural significance and heritage value

**Subsections:**

#### 5.1 Architectural Style Details
- Primary architectural style display

#### 5.2 Architectural Features
- Detailed descriptions of architectural elements
- Structural features (dome, bell tower, facade, etc.)
- Interior design elements
- Unique characteristics
- Materials used

#### 5.3 Heritage Information
- Cultural significance documentation
- Heritage recognition records
- Links to heritage documentation
- Museum declarations

#### 5.4 Heritage Status
- Heritage Classification summary
- Religious Classification summary

**Formatting:**
- Detailed text blocks for descriptive content
- Conditional rendering (only shows sections with data)
- Proper text wrapping for long descriptions

---

### 6. PASTORAL & OPERATIONAL INFORMATION SECTION
**Purpose:** Document current church operations and pastoral care

**Subsections:**

#### 6.1 Current Parish Leadership
- Parish Priest name and details

#### 6.2 Mass Schedules
Organized hierarchically by day groups:
- **Daily Masses (Monday-Friday)**
  - Unique schedules with time formatting (12-hour AM/PM)
  - Language specifications
  - FB Live indicators
  - Bullet-point format

- **Saturday Masses**
  - Individual schedule entries
  - Special services notation

- **Sunday Masses**
  - Multiple service times
  - Language options
  - Special broadcasts

**Time Formatting:**
- Converted to 12-hour format with AM/PM
- Special handling for noon (12:00 NN)
- Consistent time range display (e.g., "8:00 AM - 9:00 AM")

#### 6.3 Contact Information
- Phone number(s)
- Email address

**Formatting:**
- Grouped mass schedules by day type
- Bold day headers for clarity
- Plain table for contact info

**Note:** Website URL and Facebook Page fields removed as they are not essential for official church documentation

---

### 7. APPENDICES & SUPPORTING DOCUMENTATION
**Purpose:** Reference materials and metadata

**Subsections:**

#### Appendix A: Heritage Documents
- Heritage documentation status
- Classification-specific documentation notes
- Conditional content based on heritage status

#### Appendix B: Report Metadata
- Report Version (1.0)
- Full generation timestamp (date and time)
- System identifier (Visita - Church Documentation System)
- Data source notation

**Formatting:**
- Small font size (9pt) for metadata
- Gray text color (#646464) for secondary information

**Note:** Media Assets section removed as it's not essential for official church documentation

---

## FOOTER (On Every Page)

**Contents:**
- **Left:** Church name (abbreviated if > 40 characters)
- **Center:** Generation date
- **Right:** Page numbering (Page X of Y)

**Visual Design:**
- Horizontal line separator above footer
- Small font size (8pt)
- Gray text color (#787878)
- Consistent positioning across all pages

---

## Helper Functions

### `checkPageBreak(doc, currentY, requiredSpace)`
Automatically manages page breaks to prevent content from being cut off.
- Checks if remaining space is sufficient
- Adds new page if needed
- Returns updated Y position

### `addSectionHeader(title, yPos, fontSize, color)`
Creates consistent section headers with:
- Bold font style
- Custom color (default: blue #3B82F6)
- Configurable font size (default: 14pt)
- Proper spacing

### `addSubsectionHeader(title, yPos)`
Creates subsection headers with:
- Smaller font (11pt)
- Gray color (#505050)
- Bold style
- Proper hierarchy

### `addTextBlock(text, yPos, maxWidth, fontSize)`
Handles long text content with:
- Automatic word wrapping
- Configurable width (default: 170 units)
- Proper line spacing
- "Not documented" fallback for empty content

### `formatTime(time)`
Converts 24-hour time to 12-hour format:
- Input: "08:30" → Output: "8:30 AM"
- Input: "14:00" → Output: "2:00 PM"
- Input: "12:00" → Output: "12:00 NN" (noon)
- Handles invalid formats gracefully

---

## Data Handling

### Missing Data
- Displays "Not documented" or "Not specified" for empty fields
- Maintains consistent formatting even with missing data
- Conditional rendering hides entirely empty sections
- Graceful fallbacks throughout

### Optional Fields
All optional fields are handled with proper checks:
- `coordinates` - Only shown if provided
- `diocese` - Only shown if specified
- `architecturalFeatures` - Only shown if documented
- `heritageInformation` - Only shown if available
- `majorHistoricalEvents` - Only shown if provided

---

## Color Scheme

| Element | Color | RGB | Usage |
|---------|-------|-----|-------|
| Primary Header | Blue | `[59, 130, 246]` | Cover page, Basic Info |
| Secondary Header | Green | `[16, 185, 129]` | Classifications |
| Text | Black | `[0, 0, 0]` | Main content |
| Subsection Text | Dark Gray | `[80, 80, 80]` | Subsection headers |
| Metadata | Medium Gray | `[100, 100, 100]` | Labels and metadata |
| Footer | Light Gray | `[120, 120, 120]` | Footer text |
| Divider Line | Lighter Gray | `[200, 200, 200]` | Footer line |

---

## Page Layout

- **Margins:** 20 units left/right
- **Content Width:** 170 units (for text wrapping)
- **Page Size:** A4 (210mm x 297mm)
- **Footer Position:** 282-287 units from top
- **Header Position:** 0-50 units from top (cover page)

---

## File Naming Convention

Format: `{ChurchName}_Church_Summary_{Year}.pdf`

Example: `Saint_Joseph_Parish_Church_Summary_2025.pdf`

- Spaces replaced with underscores
- Year automatically appended
- Consistent naming for easy filing

---

## Usage in Parish Dashboard

### Location
**File:** `admin-dashboard/src/components/parish/ParishReports.tsx`

### Trigger
1. User navigates to "Reports" tab in Parish Dashboard
2. Selects "Church Summary Report" tab
3. Clicks "Download PDF" button

### Data Flow
```
ChurchInfo (from ParishDashboard)
  ↓
ParishReports component
  ↓
generateChurchSummaryReport() → ChurchSummaryReport object
  ↓
handleDownloadReport('summary')
  ↓
PDFExportService.exportChurchSummary()
  ↓
Generated PDF file downloaded to user's device
```

---

## Technical Implementation

### Dependencies
- **jsPDF** - PDF generation
- **jspdf-autotable** - Table formatting
- **date-fns** - Date formatting

### Key Files Modified
1. `admin-dashboard/src/services/pdfExportService.ts` - Core PDF generation logic
2. `admin-dashboard/src/components/parish/ParishReports.tsx` - Report data preparation and UI
3. `admin-dashboard/src/components/parish/types.ts` - Type definitions

---

## Future Enhancements

### Potential Additions
1. **Photo Gallery Section** - Include actual church photos in PDF
2. **QR Code** - Link to church profile on mobile app
3. **Map Integration** - Embedded location map
4. **Timeline Visualization** - Historical events timeline
5. **Multiple Language Support** - Generate reports in Filipino/English
6. **Digital Signature** - Diocese official approval signature
7. **Comparison Reports** - Compare with other churches
8. **Custom Branding** - Diocese-specific logos and colors

---

## Testing Checklist

- [x] TypeScript compilation succeeds
- [ ] PDF generates without errors
- [ ] All sections render correctly
- [ ] Page breaks work properly
- [ ] Footer appears on all pages
- [ ] Time formatting displays correctly
- [ ] Missing data handled gracefully
- [ ] File downloads with correct name
- [ ] Mass schedules grouped properly
- [ ] Long text wraps correctly
- [ ] Tables format properly
- [ ] Color scheme applied consistently

---

## Support and Maintenance

### Common Issues
1. **Long text overflow** - Adjust `maxWidth` in `addTextBlock()`
2. **Page break issues** - Adjust `requiredSpace` parameter
3. **Table formatting** - Check `autoTable` column widths
4. **Time format errors** - Verify time string format in data

### Maintenance Notes
- Review and update section numbering if structure changes
- Test with various data completeness levels
- Verify PDF readability on different devices
- Check file size for very large reports (with many mass schedules)

---

## Version History

### Version 1.0 (January 2025)
- Initial comprehensive implementation
- 7-section structured document
- Professional formatting and layout
- Automated page breaks and footers
- Conditional rendering for optional fields
- Helper functions for consistency
- Time formatting utilities
- Media assets summary
- Heritage documentation tracking

---

## Contact

For questions or issues related to the Church Summary Report:
- Review code in `pdfExportService.ts`
- Check type definitions in `types.ts`
- Refer to this documentation for structure details
