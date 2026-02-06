# Church Data Import Feature - Implementation Plan

## Overview

This document outlines the implementation plan for a document upload feature that automatically processes and extracts church information, reducing the time-consuming manual data entry for parish secretaries.

---

## Problem Statement

Manual entry of church information in the Parish Dashboard is time-consuming. Users need the ability to upload structured documents (spreadsheets, CSV files) or semi-structured documents (Word/PDF) containing church details, which the system can process automatically to populate the `ChurchProfileForm`.

---

## Proposed Solution

Implement a **two-tier document import system**:

1. **Structured Data Import** (Excel/CSV) - Highly reliable, direct field mapping
2. **Semi-Structured Document Parsing** (Word/PDF) - AI-assisted extraction with user verification

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DOCUMENT IMPORT FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │   File       │───>│   Parser     │───>│   Mapper     │───>│   Review   │ │
│  │   Upload     │    │   Service    │    │   Service    │    │   UI       │ │
│  └──────────────┘    └──────────────┘    └──────────────┘    └────────────┘ │
│        │                   │                   │                   │        │
│        ▼                   ▼                   ▼                   ▼        │
│  - Excel (.xlsx)     - SheetJS (xlsx)    - Field mapping     - Side-by-side│
│  - CSV (.csv)        - PapaParse (csv)   - Validation        - Edit values │
│  - Word (.docx)      - Mammoth.js        - Type conversion   - Confirm     │
│  - PDF (.pdf)        - PDF.js            - Error reporting   - Save/Submit │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Structured Data Import (Excel/CSV)

### 1.1 Template System

Create downloadable templates that users can fill in with church data.

**Template Fields** (mapping to `ChurchFormData`):

| Template Column | Target Field | Type | Required |
|----------------|--------------|------|----------|
| Church Name | `name` | string | ✓ |
| Full Parish Name | `fullName` | string | ✓ |
| Street Address | `location` | string | ✓ |
| Municipality | `municipality` | string | ✓ |
| Founding Year | `foundingYear` | number | ✓ |
| Founders | `founders` | string | |
| Architectural Style | `architecturalStyle` | enum | |
| Historical Background | `historicalBackground` | text | |
| Description | `description` | text | |
| Heritage Classification | `classification` | enum | |
| Religious Classification | `religiousClassification` | enum | |
| Assigned Priest | `assignedPriest` | string | |
| Feast Day | `feastDay` | string | |
| Phone | `contactInfo.phone` | string | |
| Email | `contactInfo.email` | string | |
| Website | `contactInfo.website` | string | |
| Facebook Page | `contactInfo.facebookPage` | string | |
| Latitude | `coordinates.lat` | number | |
| Longitude | `coordinates.lng` | number | |
| Sunday Mass Times | `massSchedules` (parsed) | string | |
| Daily Mass Times | `massSchedules` (parsed) | string | |
| Cultural Significance | `culturalSignificance` | text | |
| Preservation History | `preservationHistory` | text | |
| Architectural Features | `architecturalFeatures` | text | |

### 1.2 Files to Create

```
admin-dashboard/src/
├── services/
│   └── churchImportService.ts          # Main import orchestration
├── lib/
│   └── import/
│       ├── excelParser.ts              # Parse Excel/CSV files
│       ├── documentParser.ts           # Parse Word/PDF (Phase 2)
│       ├── fieldMapper.ts              # Map parsed data to ChurchFormData
│       └── importValidation.ts         # Validate imported data
├── components/
│   └── parish/
│       ├── ChurchDataImport.tsx        # Import modal/drawer UI
│       ├── ImportPreview.tsx           # Review extracted data
│       ├── FieldMappingEditor.tsx      # Manual field mapping adjustments
│       └── ImportTemplateDownload.tsx  # Download template buttons
└── templates/
    ├── church-data-template.xlsx       # Excel template
    └── church-data-template.csv        # CSV template
```

### 1.3 Import Service Implementation

```typescript
// services/churchImportService.ts

import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface ImportResult {
  success: boolean;
  data?: Partial<ChurchFormData>;
  errors: ImportError[];
  warnings: ImportWarning[];
  unmappedFields: string[];
}

export interface ImportError {
  field: string;
  value: any;
  message: string;
  row?: number;
}

export interface ImportWarning {
  field: string;
  message: string;
  suggestedValue?: any;
}

export class ChurchImportService {
  // Parse Excel file and extract church data
  static async parseExcelFile(file: File): Promise<ImportResult>;
  
  // Parse CSV file and extract church data
  static async parseCsvFile(file: File): Promise<ImportResult>;
  
  // Parse Word document and extract church data (Phase 2)
  static async parseWordDocument(file: File): Promise<ImportResult>;
  
  // Parse PDF document and extract church data (Phase 2)
  static async parsePdfDocument(file: File): Promise<ImportResult>;
  
  // Map raw data to ChurchFormData structure
  static mapToChurchFormData(rawData: Record<string, any>): Partial<ChurchFormData>;
  
  // Validate imported data
  static validateImportedData(data: Partial<ChurchFormData>): ImportError[];
  
  // Generate import template
  static generateTemplate(format: 'xlsx' | 'csv'): Blob;
}
```

### 1.4 Dependencies to Add

```json
{
  "dependencies": {
    "xlsx": "^0.18.5",           // Already exists (used for export)
    "papaparse": "^5.4.1",       // CSV parsing
    "mammoth": "^1.6.0",         // Word document parsing (Phase 2)
    "pdfjs-dist": "^4.0.379"     // PDF parsing (Phase 2)
  },
  "devDependencies": {
    "@types/papaparse": "^5.3.14"
  }
}
```

---

## Phase 2: Semi-Structured Document Parsing (Word/PDF)

### 2.1 Document Parsing Strategy

For Word/PDF documents, implement pattern-based extraction:

```typescript
// lib/import/documentParser.ts

interface ExtractionPattern {
  fieldName: keyof ChurchFormData;
  patterns: RegExp[];
  processor?: (value: string) => any;
}

const EXTRACTION_PATTERNS: ExtractionPattern[] = [
  {
    fieldName: 'name',
    patterns: [
      /church\s*name[:\s]+(.+)/i,
      /name\s*of\s*church[:\s]+(.+)/i,
      /parish[:\s]+(.+)/i
    ]
  },
  {
    fieldName: 'foundingYear',
    patterns: [
      /founded[:\s]+(\d{4})/i,
      /established[:\s]+(\d{4})/i,
      /year\s*built[:\s]+(\d{4})/i
    ],
    processor: (value) => parseInt(value, 10)
  },
  // ... more patterns
];
```

### 2.2 AI-Assisted Extraction (Optional Enhancement)

If higher accuracy is needed, integrate with OpenAI or local LLM:

```typescript
// Optional: AI-assisted extraction for complex documents
export class AIDocumentExtractor {
  static async extractChurchData(
    documentText: string,
    schema: ChurchFormData
  ): Promise<Partial<ChurchFormData>>;
}
```

---

## Phase 3: User Interface

### 3.1 Import Entry Point in Parish Dashboard

Add an "Import Data" button to the Parish Dashboard and ChurchProfileForm:

```tsx
// In ParishDashboard.tsx - Add import button to "Add New Church" flow

<Button
  variant="outline"
  onClick={() => setShowImportModal(true)}
>
  <FileSpreadsheet className="h-4 w-4 mr-2" />
  Import from Document
</Button>
```

### 3.2 Import Modal Component

```tsx
// components/parish/ChurchDataImport.tsx

const ChurchDataImport: React.FC<{
  onImportComplete: (data: Partial<ChurchInfo>) => void;
  onCancel: () => void;
}> = ({ onImportComplete, onCancel }) => {
  // Steps:
  // 1. File Upload (drag & drop + file picker)
  // 2. Processing (show progress)
  // 3. Preview & Edit (side-by-side comparison)
  // 4. Confirm & Import
  
  return (
    <Dialog>
      <Tabs value={currentStep}>
        <TabsContent value="upload">
          {/* File upload dropzone */}
        </TabsContent>
        <TabsContent value="preview">
          {/* Extracted data preview with edit capability */}
        </TabsContent>
        <TabsContent value="confirm">
          {/* Final confirmation before import */}
        </TabsContent>
      </Tabs>
    </Dialog>
  );
};
```

### 3.3 Preview Component

```tsx
// components/parish/ImportPreview.tsx

interface ImportPreviewProps {
  extractedData: Partial<ChurchFormData>;
  errors: ImportError[];
  warnings: ImportWarning[];
  onEdit: (field: string, value: any) => void;
  onConfirm: () => void;
}

// Shows side-by-side:
// - Original document excerpt (for reference)
// - Extracted values (editable)
// - Validation errors/warnings
// - Unmapped fields
```

---

## Phase 4: Validation & Error Handling

### 4.1 Validation Rules

```typescript
// lib/import/importValidation.ts

export const validationRules: ValidationRule[] = [
  // Required fields
  { field: 'name', rule: 'required', message: 'Church name is required' },
  { field: 'municipality', rule: 'required', message: 'Municipality is required' },
  
  // Type validation
  { field: 'foundingYear', rule: 'number', min: 1500, max: 2030 },
  { field: 'coordinates.lat', rule: 'number', min: 9.0, max: 10.5 }, // Bohol bounds
  { field: 'coordinates.lng', rule: 'number', min: 123.5, max: 125.0 },
  
  // Enum validation
  { 
    field: 'architecturalStyle', 
    rule: 'enum', 
    values: ['baroque', 'gothic', 'romanesque', 'neoclassical', 'modern', 'mixed', 'other'] 
  },
  { 
    field: 'classification', 
    rule: 'enum', 
    values: ['ICP', 'NCT', 'non_heritage', 'parish_church'] 
  },
  
  // Format validation
  { field: 'contactInfo.email', rule: 'email' },
  { field: 'contactInfo.phone', rule: 'phone' },
];
```

### 4.2 Error Display

- **Blocking Errors**: Prevent import until fixed (missing required fields, invalid types)
- **Warnings**: Allow import but highlight for review (unusual values, possible typos)
- **Suggestions**: Auto-correct common issues (e.g., "Baroque" → "baroque")

---

## Phase 5: Mass Schedule Parsing

### 5.1 Schedule Format Support

Support common formats in import documents:

```typescript
// lib/import/scheduleParser.ts

const SCHEDULE_PATTERNS = [
  // "Sunday: 6:00 AM, 8:00 AM, 10:00 AM"
  /(\w+day)[:\s]+(.+)/i,
  
  // "Sun 6AM, 8AM | Mon-Fri 6AM"
  /(\w+)\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM))/gi,
  
  // "Daily Mass: 6:00 AM"
  /daily\s*mass[:\s]+(.+)/i,
];

export function parseMassSchedules(scheduleText: string): MassSchedule[] {
  // Parse various schedule formats into structured MassSchedule[]
}
```

---

## Implementation Timeline

### Sprint 1 (Week 1-2): Foundation
- [ ] Create `churchImportService.ts` with Excel/CSV parsing
- [ ] Create `fieldMapper.ts` with field mapping logic
- [ ] Create `importValidation.ts` with validation rules
- [ ] Generate downloadable Excel/CSV templates

### Sprint 2 (Week 3-4): UI Components
- [ ] Create `ChurchDataImport.tsx` modal component
- [ ] Create `ImportPreview.tsx` for data review
- [ ] Create `ImportTemplateDownload.tsx` for template access
- [ ] Integrate import button into `ParishDashboard.tsx`

### Sprint 3 (Week 5-6): Integration & Testing
- [ ] Connect import flow to `ChurchProfileForm`
- [ ] Add mass schedule parsing
- [ ] Write unit tests for parsers and validators
- [ ] User acceptance testing with real parish data

### Sprint 4 (Week 7-8): Phase 2 - Document Parsing (Optional)
- [ ] Add Word document parsing with Mammoth.js
- [ ] Add PDF parsing with PDF.js
- [ ] Implement pattern-based extraction
- [ ] Enhanced validation for unstructured data

---

## Security Considerations

1. **File Validation**: Verify file type matches extension (prevent malicious files)
2. **Size Limits**: Max 10MB for spreadsheets, 25MB for documents
3. **Content Sanitization**: Strip scripts/macros from uploaded files
4. **Rate Limiting**: Limit import attempts per user per hour
5. **Audit Logging**: Log all import activities for accountability

```typescript
// Security checks before processing
const validateUploadedFile = (file: File): ValidationResult => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) return { valid: false, error: 'File too large' };
  
  // Check MIME type matches extension
  const expectedTypes = ALLOWED_MIME_TYPES[getFileExtension(file.name)];
  if (!expectedTypes?.includes(file.type)) return { valid: false, error: 'Invalid file type' };
  
  return { valid: true };
};
```

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER JOURNEY                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Parish Secretary opens Parish Dashboard                                  │
│     ↓                                                                        │
│  2. Clicks "Add Church" or "Edit Profile"                                   │
│     ↓                                                                        │
│  3. Sees option: "Import from Document" or "Download Template"              │
│     ↓                                                                        │
│  4a. Downloads template → Fills in Excel/CSV → Uploads file                 │
│  4b. Uploads existing document with church info                              │
│     ↓                                                                        │
│  5. System parses and extracts data                                         │
│     ↓                                                                        │
│  6. Review screen shows extracted data with any errors/warnings             │
│     ↓                                                                        │
│  7. User edits/corrects any fields as needed                                │
│     ↓                                                                        │
│  8. Clicks "Import" → Data populates ChurchProfileForm                      │
│     ↓                                                                        │
│  9. User reviews full form, adds photos/documents manually                  │
│     ↓                                                                        │
│  10. Submits for approval (existing workflow)                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to enter church data | 50% reduction | Before/after timing |
| Import success rate | > 90% | Successful imports / attempts |
| Data accuracy | > 95% | Fields correctly mapped |
| User adoption | > 60% | Users using import vs manual entry |

---

## Files Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `src/services/churchImportService.ts` | Main import orchestration service |
| `src/lib/import/excelParser.ts` | Excel/CSV file parsing |
| `src/lib/import/documentParser.ts` | Word/PDF parsing (Phase 2) |
| `src/lib/import/fieldMapper.ts` | Map raw data to ChurchFormData |
| `src/lib/import/importValidation.ts` | Validate imported data |
| `src/lib/import/scheduleParser.ts` | Parse mass schedule text |
| `src/components/parish/ChurchDataImport.tsx` | Import modal UI |
| `src/components/parish/ImportPreview.tsx` | Review extracted data |
| `src/components/parish/ImportTemplateDownload.tsx` | Template download buttons |
| `public/templates/church-data-template.xlsx` | Excel template |
| `public/templates/church-data-template.csv` | CSV template |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/ParishDashboard.tsx` | Add import button and modal trigger |
| `src/components/parish/ChurchProfileForm.tsx` | Accept pre-filled data from import |
| `package.json` | Add papaparse, mammoth, pdfjs-dist dependencies |

---

## Appendix: Template Structure

### Excel Template Columns

```
| Column A        | Column B              | Column C       | ...
|----------------|-----------------------|----------------|----
| Church Name*   | Full Parish Name*     | Street Address*| ...
| (Required)     | (Required)            | (Required)     | ...
|----------------|------------------------|----------------|----
| San Agustin    | San Agustin Parish    | 123 Main St    | ...
```

### CSV Template Format

```csv
Church Name,Full Parish Name,Street Address,Municipality,Founding Year,Founders,Architectural Style,Historical Background,Description,Heritage Classification,Religious Classification,Assigned Priest,Feast Day,Phone,Email,Website,Facebook Page,Latitude,Longitude,Sunday Mass Times,Daily Mass Times
"San Agustin Church","San Agustin Parish","123 Main Street","Tagbilaran",1595,"Augustinian Missionaries","baroque","Built during Spanish colonial period...","A historic church...","ICP","diocesan_shrine","Fr. Juan Dela Cruz","August 28","+63 38 411 1234","sanagustin@example.com","","","9.6407","123.8524","6:00 AM, 8:00 AM, 10:00 AM","6:00 AM"
```

---

*Document prepared: February 2026*
*Version: 1.0*
*Author: Development Team*
