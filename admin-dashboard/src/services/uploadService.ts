import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import imageCompression from 'browser-image-compression';

// Compression options for different image types
const COMPRESSION_OPTIONS = {
  standard: {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
  },
  thumbnail: {
    maxSizeMB: 0.1,
    maxWidthOrHeight: 300,
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
  },
  panorama360: {
    maxSizeMB: 5,
    maxWidthOrHeight: 8192, // Keep high res for 360 photos
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
  },
};

export interface UploadProgress {
  progress: number;
  isComplete: boolean;
  error?: string;
  downloadURL?: string;
}

export interface UploadOptions {
  folder?: string;
  filename?: string;
  onProgress?: (progress: UploadProgress) => void;
  metadata?: Record<string, any>;
}

class UploadService {
  /**
   * Compress an image file before upload
   */
  async compressImage(
    file: File,
    compressionType: 'standard' | 'thumbnail' | 'panorama360' = 'standard'
  ): Promise<File> {
    // Skip compression for non-image files
    if (!file.type.startsWith('image/')) {
      return file;
    }

    // Skip compression for small files (under 500KB)
    if (file.size < 500 * 1024) {
      console.log(`⏭️ Skipping compression for small file: ${file.name} (${UploadService.formatFileSize(file.size)})`);
      return file;
    }

    try {
      const options = COMPRESSION_OPTIONS[compressionType];
      console.log(`🗜️ Compressing ${file.name}: ${UploadService.formatFileSize(file.size)} with ${compressionType} settings`);
      
      const compressedFile = await imageCompression(file, options);
      
      const compressionRatio = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
      console.log(`✅ Compressed: ${UploadService.formatFileSize(file.size)} → ${UploadService.formatFileSize(compressedFile.size)} (${compressionRatio}% reduction)`);
      
      return compressedFile;
    } catch (error) {
      console.warn(`⚠️ Compression failed for ${file.name}, uploading original:`, error);
      return file;
    }
  }

  /**
   * Upload a file to Firebase Storage
   */
  async uploadFile(file: File, options: UploadOptions = {}): Promise<string> {
    const {
      folder = 'uploads',
      filename = `${uuidv4()}_${file.name}`,
      onProgress,
      metadata = {}
    } = options;

    // Compress image files before upload (skip for 360 photos which need special handling)
    const isImage = file.type.startsWith('image/');
    const is360Photo = folder.includes('/360');
    const fileToUpload = isImage 
      ? await this.compressImage(file, is360Photo ? 'panorama360' : 'standard')
      : file;

    // Create storage reference
    const storageRef = ref(storage, `${folder}/${filename}`);

    // Create upload metadata
    const uploadMetadata = {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        ...metadata
      }
    };

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, uploadMetadata);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress monitoring
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.({
            progress,
            isComplete: false
          });
        },
        (error) => {
          // Error handling
          console.error('Upload failed:', error);
          onProgress?.({
            progress: 0,
            isComplete: false,
            error: this.getErrorMessage(error)
          });
          reject(new Error(this.getErrorMessage(error)));
        },
        async () => {
          // Upload completed successfully
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            onProgress?.({
              progress: 100,
              isComplete: true,
              downloadURL
            });
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  /**
   * Upload multiple files concurrently
   */
  async uploadMultipleFiles(
    files: File[],
    options: UploadOptions = {}
  ): Promise<{ successful: string[]; failed: { file: File; error: string }[] }> {
    const results = await Promise.allSettled(
      files.map(file => this.uploadFile(file, {
        ...options,
        filename: `${uuidv4()}_${file.name}`
      }))
    );

    const successful: string[] = [];
    const failed: { file: File; error: string }[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push({
          file: files[index],
          error: result.reason.message
        });
      }
    });

    return { successful, failed };
  }

  /**
   * Upload church images with proper organization and compression
   * Uses batched uploads to prevent overwhelming the network
   */
  async uploadChurchImages(
    churchId: string,
    files: File[],
    onProgress?: (fileIndex: number, progress: UploadProgress) => void
  ): Promise<string[]> {
    // Compress all images first (in parallel for speed)
    const compressionPromises = files.map(async (file) => {
      return this.compressImage(file, 'standard');
    });
    const compressedFiles = await Promise.all(compressionPromises);

    // Upload in batches of 3 to prevent network congestion
    const BATCH_SIZE = 3;
    const results: string[] = [];
    
    for (let i = 0; i < compressedFiles.length; i += BATCH_SIZE) {
      const batch = compressedFiles.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map((file, batchIndex) => {
        const globalIndex = i + batchIndex;
        return this.uploadFile(file, {
          folder: `churches/${churchId}/images`,
          filename: `${Date.now()}_${globalIndex}_${files[globalIndex].name}`,
          onProgress: (progress) => onProgress?.(globalIndex, progress),
          metadata: {
            churchId,
            imageType: 'church_photo',
            originalSize: files[globalIndex].size,
            compressedSize: file.size
          }
        });
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });
    }
    
    return results;
  }

  /**
   * Legacy upload method - kept for backwards compatibility
   */
  async uploadChurchImagesLegacy(
    churchId: string,
    files: File[],
    onProgress?: (fileIndex: number, progress: UploadProgress) => void
  ): Promise<string[]> {
    const uploadPromises = files.map((file, index) =>
      this.uploadFile(file, {
        folder: `churches/${churchId}/images`,
        filename: `${Date.now()}_${index}_${file.name}`,
        onProgress: (progress) => onProgress?.(index, progress),
        metadata: {
          churchId,
          imageType: 'church_photo'
        }
      })
    );

    const results = await Promise.allSettled(uploadPromises);
    return results
      .filter((result): result is PromiseFulfilledResult<string> =>
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }

  /**
   * Upload heritage documents
   */
  async uploadHeritageDocuments(
    churchId: string,
    files: File[],
    documentType: 'heritage_declaration' | 'historical_document' | 'restoration_record',
    onProgress?: (fileIndex: number, progress: UploadProgress) => void
  ): Promise<Array<{ url: string; name: string; type: string }>> {
    const uploadPromises = files.map(async (file, index) => {
      const url = await this.uploadFile(file, {
        folder: `churches/${churchId}/heritage/${documentType}`,
        filename: `${documentType}_${Date.now()}_${index}_${file.name}`,
        onProgress: (progress) => onProgress?.(index, progress),
        metadata: {
          churchId,
          documentType,
          fileType: file.type
        }
      });

      return {
        url,
        name: file.name,
        type: documentType
      };
    });

    const results = await Promise.allSettled(uploadPromises);
    return results
      .filter((result): result is PromiseFulfilledResult<{ url: string; name: string; type: string }> =>
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }

  /**
   * Delete a file from Firebase Storage
   */
  async deleteFile(url: string): Promise<void> {
    try {
      const storageRef = ref(storage, url);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Get user-friendly error messages
   */
  private getErrorMessage(error: any): string {
    switch (error.code) {
      case 'storage/unauthorized':
        return 'You do not have permission to upload files';
      case 'storage/canceled':
        return 'Upload was canceled';
      case 'storage/unknown':
        return 'An unknown error occurred during upload';
      case 'storage/invalid-format':
        return 'Invalid file format';
      case 'storage/invalid-checksum':
        return 'File upload was corrupted';
      case 'storage/retry-limit-exceeded':
        return 'Upload failed after multiple retries';
      case 'storage/invalid-url':
        return 'Invalid file URL';
      case 'storage/quota-exceeded':
        return 'Storage quota exceeded';
      default:
        return error.message || 'Upload failed. Please try again.';
    }
  }

  /**
   * Get file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate file type and size
   */
  static validateFile(file: File, options: {
    maxSize?: number;
    allowedTypes?: string[];
  } = {}): { isValid: boolean; error?: string } {
    const { maxSize = 10 * 1024 * 1024, allowedTypes = ['image/*'] } = options; // Default 10MB

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size too large. Maximum size is ${this.formatFileSize(maxSize)}`
      };
    }

    const isAllowedType = allowedTypes.some(type => {
      if (type.endsWith('*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isAllowedType) {
      return {
        isValid: false,
        error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    return { isValid: true };
  }
}

export const uploadService = new UploadService();
export default uploadService;