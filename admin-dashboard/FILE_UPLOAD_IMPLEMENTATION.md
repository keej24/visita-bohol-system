# File Upload Implementation Summary

## Overview
Successfully implemented complete file upload functionality for the parish dashboard, allowing parishes to upload:
1. 360° Equirectangular Images (for virtual tours)
2. Church Photos (regular photos)
3. Historical Documents (PDFs, Word docs, images)

## Components Created

### 1. PhotoUploader (`src/components/parish/PhotoUploader.tsx`)
- **Purpose**: Upload regular church photos (exterior, interior, special features)
- **Features**:
  - Drag & drop support
  - Click to browse
  - Image preview grid (2-4 columns responsive)
  - Individual photo removal
  - Max 10 photos
  - Max 10MB per photo
  - Supports: JPEG, PNG

### 2. DocumentUploader (`src/components/parish/DocumentUploader.tsx`)
- **Purpose**: Upload historical documents and certificates
- **Features**:
  - Drag & drop support
  - Click to browse
  - Document list with file icons (PDF, Word, Image)
  - Individual document removal
  - Max 10 documents
  - Max 20MB per document
  - Supports: PDF, DOC, DOCX, JPEG, PNG

### 3. Virtual360Uploader (Already existed)
- **Purpose**: Upload 360° equirectangular panoramic images
- **Features**:
  - Automatic aspect ratio validation (2:1 required)
  - Image compression
  - 360° preview with Pannellum
  - Description/caption support
  - Max 5 images
  - Max 10MB per image

## Integration Points

### ChurchProfileForm.tsx
- **Location**: `src/components/parish/ChurchProfileForm.tsx`
- **Changes**:
  1. Added imports for PhotoUploader and DocumentUploader
  2. Added storage upload functions import
  3. Added local `uploading` state
  4. Made `handleSubmit` async to upload files before saving
  5. Replaced placeholder cards with actual uploader components
  6. Updated submit button to show "Uploading files..." state

### Upload Flow

When user clicks "Submit for Review" or "Update Profile":

1. **360° Images Upload** (lines 439-460)
   ```typescript
   for (const image of formData.virtual360Images) {
     if (image.file && image.isValid) {
       const url = await upload360Image(churchName, image.file, description);
       uploaded360URLs.push(url);
     }
   }
   ```

2. **Photos Upload** (lines 462-478)
   ```typescript
   for (const photo of formData.photos) {
     if (photo.file) {
       const url = await uploadChurchImage(churchName, photo.file);
       uploadedPhotoURLs.push(url);
     }
   }
   ```

3. **Documents Upload** (lines 480-497)
   ```typescript
   for (const doc of formData.documents) {
     if (doc.file) {
       const url = await uploadDocument(churchName, doc.file, doc.type);
       uploadedDocURLs.push(url);
     }
   }
   ```

4. **Data Submission**
   - All uploaded URLs are mapped to proper format
   - Form data is updated with Firebase Storage URLs
   - `onSubmit(updatedData)` is called with complete church data
   - Data is saved to Firestore by parent component

## Firebase Storage Structure

Files are organized in Firebase Storage as:

```
/churches/{churchName}/
  /images/
    main-{timestamp}.jpg
  /gallery/
    gallery-{timestamp}-{index}.jpg

/360-images/{churchName}/
  {description}-{timestamp}.jpg

/documents/{churchName}/
  {documentType}-{timestamp}.pdf
```

## Storage Functions Used

From `src/lib/storage.ts`:

- `uploadChurchImage(churchId, file)` - Uploads and compresses regular photos
- `upload360Image(churchId, file, spotName)` - Uploads 360° images (no compression)
- `uploadDocument(churchId, file, documentType)` - Uploads documents

## User Experience

1. **Upload Process**:
   - User selects/drags files
   - Files are validated (type, size, aspect ratio for 360°)
   - Preview is shown immediately
   - User can remove individual files
   - User clicks submit
   - All files upload to Firebase Storage
   - URLs are saved to Firestore
   - Success message shown

2. **Visual Feedback**:
   - Drag-over state (blue border)
   - File count badges
   - File size display
   - Loading spinner during upload
   - "Uploading files..." button text
   - Error toasts for failed uploads

## Data Flow to Mobile App

When files are uploaded and saved:

1. **360° Images**: Saved to `virtualTour360` array field
2. **Photos**: Saved to `images` array field (compatible with mobile app)
3. **Documents**: Saved to `documents` array field

Mobile app reads these fields:
- `virtualTour360` or `virtual360Images` → 360° viewer
- `images` → Photo gallery
- `documents` → Document links

## Testing Checklist

- [x] 360° uploader accepts equirectangular images
- [x] 360° uploader validates 2:1 aspect ratio
- [x] 360° uploader compresses images
- [x] 360° uploader shows preview
- [x] Photo uploader accepts JPEG/PNG
- [x] Photo uploader shows grid preview
- [x] Document uploader accepts PDF/DOC/DOCX/Images
- [x] All uploaders support drag & drop
- [x] File removal works
- [x] Files upload to Firebase Storage on submit
- [x] URLs are saved to Firestore
- [x] Submit button shows uploading state
- [x] Error handling for failed uploads

## Files Modified

1. **src/components/parish/ChurchProfileForm.tsx** - Integrated all uploaders
2. **src/components/parish/PhotoUploader.tsx** - Created new
3. **src/components/parish/DocumentUploader.tsx** - Created new
4. **src/components/360/Virtual360Uploader.tsx** - Already existed, working

## Next Steps for Users

1. Go to Parish Dashboard
2. Navigate to "Media & Documents" tab
3. Upload files using the three uploaders:
   - 360° Virtual Tour
   - Church Photos
   - Historical Documents
4. Click "Submit for Review" or "Update Profile"
5. Files will upload to Firebase Storage
6. Profile will be saved to Firestore
7. Mobile app will display the uploaded content

## Mobile App Display

The uploaded files will appear in the mobile app:

- **360° Tour Button**: Opens fullscreen 360° viewer
- **Photo Gallery**: Shows in church detail photos tab
- **Documents**: Available in church information section

## Notes

- All file uploads happen when user clicks submit, not immediately
- Files are validated on selection (client-side)
- Firebase Storage handles server-side storage
- URLs are publicly accessible (Firebase Storage rules apply)
- Image compression reduces file sizes before upload (except 360° images)
