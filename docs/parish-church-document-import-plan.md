# Parish Church Details Document Import Plan

## Goal
Allow parish staff to upload a document (PDF/DOCX/scan) containing church details and automatically populate the Church Profile form, reducing manual data entry while preserving review/approval controls.

## Current Flow (Context)
- Parish Secretary manages church details in `admin-dashboard/src/pages/ParishDashboard.tsx`.
- Church details are edited via `admin-dashboard/src/components/parish/ChurchProfileForm.tsx`.
- Historical documents are handled by `admin-dashboard/src/components/parish/DocumentUploader.tsx`.

## Proposed UX
1) Add an "Import From Document" section in the Parish Profile view (ChurchProfileForm, likely in the Basic tab header or top of the form).
2) Upload control accepts PDF/DOCX/JPG/PNG (max size configurable, e.g. 15–20 MB).
3) After upload:
   - Show parsing status (Queued → Processing → Ready to Review).
   - Present a side-by-side preview: extracted values + current form values.
   - User can accept all or selectively apply fields.
4) Log final applied changes with attribution (user + source document).

## Parsing Pipeline (Backend)
1) File upload to storage (Firebase Storage or server-side object store).
2) Text extraction:
   - PDFs/DOCX: direct text extraction.
   - Scans/images: OCR.
3) Structured extraction using a schema-driven prompt (or rules + LLM):
   - Target schema = `ChurchInfo` + sub-objects (locationDetails, historicalDetails, contactInfo, massSchedules, etc.).
4) Validation + normalization:
   - Validate date formats, location fields, phone/email formatting, enum values.
   - Normalize parish name to match existing rules (see `parish-utils`).
5) Confidence scoring per field:
   - Low confidence fields flagged for manual review.
6) Return structured data + confidence + source snippet references.

## Data Model Extensions
Add a new "import session" record (Firestore suggested):
- `church_imports/{id}`
  - `churchId`
  - `createdBy`
  - `uploadedFileUrl`
  - `status` (queued|processing|ready|failed)
  - `parsedData` (partial ChurchInfo)
  - `confidence` (per field)
  - `sourceSnippets` (optional text for review)
  - `createdAt`, `updatedAt`

## Frontend Integration
1) New component: `admin-dashboard/src/components/parish/ChurchDocumentImport.tsx`.
   - Upload control + status display.
   - Parsed result viewer + field-level apply toggles.
2) Hook into `ChurchProfileForm`:
   - When parsed data is accepted, merge into `formData`.
   - Track `appliedFromImport` for audit (optional).
3) Validation:
   - Reuse existing inline validation for required fields.
   - Highlight low confidence fields with warning badge.

## API Endpoints (Example)
- `POST /api/church-imports` → create import session, upload file metadata.
- `POST /api/church-imports/:id/parse` → trigger extraction and parsing.
- `GET /api/church-imports/:id` → fetch status + parsed data.

## Security and Compliance
- Virus scan uploaded files.
- Enforce size/type restrictions.
- Strip or mask sensitive content in logs.
- Document retention policy (auto-delete after X days).

## Error Handling
- Parsing errors return failure with actionable guidance.
- Allow retry if parsing fails.
- Log errors with correlation IDs.

## Testing
- Unit: schema validation, normalization, field mapping.
- Integration: upload → parse → populate form.
- E2E: user uploads document, reviews parsed fields, submits profile.

## Rollout
- Feature flag for pilot parishes.
- Track metrics: time-to-complete profile, error rate, acceptance rate of parsed fields.

