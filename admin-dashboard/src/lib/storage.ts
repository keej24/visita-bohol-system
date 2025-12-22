import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

/**
 * Firebase Storage Service
 * Handles all file upload/download operations for the admin dashboard
 */

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Compress image before upload to save storage space and bandwidth
 */
export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1, // Max 1MB
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.warn('Image compression failed, using original:', error);
    return file;
  }
}

/**
 * Upload church main image
 */
export async function uploadChurchImage(
  churchId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  try {
    // Compress image first
    const compressedFile = await compressImage(file);
    
    // Create storage reference
    const fileName = `main-${Date.now()}.${file.name.split('.').pop()}`;
    const storageRef = ref(storage, `churches/${churchId}/images/${fileName}`);
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, compressedFile);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading church image:', error);
    throw new Error('Failed to upload church image');
  }
}

/**
 * Upload 360° tour image
 */
export async function upload360Image(
  churchId: string,
  file: File,
  spotName: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  try {
    // Don't compress 360 images to maintain quality
    const fileName = `${spotName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${file.name.split('.').pop()}`;
    const storageRef = ref(storage, `360-images/${churchId}/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading 360 image:', error);
    throw new Error('Failed to upload 360° image');
  }
}

/**
 * Upload historical document
 * Documents are stored under churches/{churchId}/documents/
 */
export async function uploadDocument(
  churchId: string,
  file: File,
  documentType: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  try {
    // Sanitize churchId to create a valid storage path
    const sanitizedChurchId = churchId
      .replace(/\s+/g, '_')           // Replace spaces with underscores
      .replace(/[^a-zA-Z0-9._-]/g, '') // Remove special characters
      .toLowerCase();
    
    // Sanitize filename
    const cleanFileName = file.name
      .replace(/\s+/g, '-')           // Replace spaces with hyphens
      .replace(/[^a-zA-Z0-9._-]/g, '') // Remove special characters
      .toLowerCase();
    
    const fileName = `${documentType}-${Date.now()}-${cleanFileName}`;
    // Use the new path structure under churches/
    const storageRef = ref(storage, `churches/${sanitizedChurchId}/documents/${fileName}`);
    
    console.log('[uploadDocument] Uploading to:', `churches/${sanitizedChurchId}/documents/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('[uploadDocument] Upload successful:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw new Error('Failed to upload document');
  }
}

/**
 * Upload gallery images (multiple)
 */
export async function uploadGalleryImages(
  churchId: string,
  files: File[],
  onProgress?: (fileIndex: number, progress: UploadProgress) => void
): Promise<string[]> {
  try {
    const uploadPromises = files.map(async (file, index) => {
      const compressedFile = await compressImage(file);
      const fileName = `gallery-${Date.now()}-${index}.${file.name.split('.').pop()}`;
      const storageRef = ref(storage, `churches/${churchId}/gallery/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, compressedFile);
      return getDownloadURL(snapshot.ref);
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading gallery images:', error);
    throw new Error('Failed to upload gallery images');
  }
}

/**
 * Delete file from storage
 * Accepts either a full Firebase Storage URL or a storage path
 */
export async function deleteFile(fileUrlOrPath: string): Promise<void> {
  try {
    let filePath = fileUrlOrPath;

    // If it's a full Firebase Storage URL, extract the path
    if (fileUrlOrPath.includes('firebasestorage.googleapis.com')) {
      // URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
      // Extract the path from the URL
      const urlMatch = fileUrlOrPath.match(/\/o\/(.+?)\?/);
      if (urlMatch && urlMatch[1]) {
        // Decode the URL-encoded path
        filePath = decodeURIComponent(urlMatch[1]);
      } else {
        throw new Error('Invalid Firebase Storage URL format');
      }
    }

    console.log(`Deleting file from path: ${filePath}`);
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
    console.log(`Successfully deleted file: ${filePath}`);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * List all files in a church folder
 */
export async function listChurchFiles(churchId: string, folder: string): Promise<string[]> {
  try {
    const folderRef = ref(storage, `churches/${churchId}/${folder}`);
    const result = await listAll(folderRef);
    
    const urlPromises = result.items.map(item => getDownloadURL(item));
    return await Promise.all(urlPromises);
  } catch (error) {
    console.error('Error listing church files:', error);
    return [];
  }
}

/**
 * Validate file type and size
 */
export function validateFile(file: File, options: {
  maxSizeMB?: number;
  allowedTypes?: string[];
}): { valid: boolean; error?: string } {
  const { maxSizeMB = 10, allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] } = options;
  
  // Check file size
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type must be ${allowedTypes.join(', ')}` };
  }
  
  return { valid: true };
}

/**
 * Get file extension from URL
 */
export function getFileExtension(url: string): string {
  const urlWithoutQuery = url.split('?')[0];
  const parts = urlWithoutQuery.split('.');
  return parts[parts.length - 1];
}

/**
 * Generate thumbnail URL from full image URL (if using Cloud Functions)
 */
export function getThumbnailUrl(imageUrl: string, size: number = 200): string {
  // For now, return original URL
  // In future, you can implement Cloud Functions to generate thumbnails
  return imageUrl;
}
