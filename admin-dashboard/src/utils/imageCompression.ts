import imageCompression from 'browser-image-compression';

/**
 * Compression options for different image types
 */
export const CompressionOptions = {
  standard: {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg' as const
  },
  thumbnail: {
    maxSizeMB: 0.2,
    maxWidthOrHeight: 400,
    useWebWorker: true,
    fileType: 'image/jpeg' as const
  },
  panorama: {
    maxSizeMB: 5,
    maxWidthOrHeight: 4096,
    useWebWorker: true,
    fileType: 'image/jpeg' as const
  }
};

/**
 * Compress a standard image file
 * @param file - The image file to compress
 * @returns Compressed file
 */
export async function compressImage(file: File): Promise<File> {
  try {
    const compressedFile = await imageCompression(file, CompressionOptions.standard);

    // Preserve original filename
    return new File([compressedFile], file.name, {
      type: compressedFile.type,
      lastModified: Date.now()
    });
  } catch (error) {
    console.error('Error compressing image:', error);
    throw new Error('Failed to compress image. Please try a different file.');
  }
}

/**
 * Compress a thumbnail image
 * @param file - The image file to compress
 * @returns Compressed thumbnail file
 */
export async function compressThumbnail(file: File): Promise<File> {
  try {
    const compressedFile = await imageCompression(file, CompressionOptions.thumbnail);

    return new File([compressedFile], file.name, {
      type: compressedFile.type,
      lastModified: Date.now()
    });
  } catch (error) {
    console.error('Error compressing thumbnail:', error);
    throw new Error('Failed to compress thumbnail. Please try a different file.');
  }
}

/**
 * Compress a 360° panorama image
 * @param file - The 360° image file to compress
 * @returns Compressed panorama file
 */
export async function compress360Image(file: File): Promise<File> {
  try {
    const compressedFile = await imageCompression(file, CompressionOptions.panorama);

    return new File([compressedFile], file.name, {
      type: compressedFile.type,
      lastModified: Date.now()
    });
  } catch (error) {
    console.error('Error compressing 360° image:', error);
    throw new Error('Failed to compress 360° image. Please try a different file.');
  }
}

/**
 * Compress multiple image files
 * @param files - Array of image files to compress
 * @param onProgress - Optional callback for progress updates
 * @returns Array of compressed files
 */
export async function compressMultipleImages(
  files: File[],
  onProgress?: (progress: number) => void
): Promise<File[]> {
  const compressedFiles: File[] = [];

  for (let i = 0; i < files.length; i++) {
    const compressedFile = await compressImage(files[i]);
    compressedFiles.push(compressedFile);

    if (onProgress) {
      const progress = Math.round(((i + 1) / files.length) * 100);
      onProgress(progress);
    }
  }

  return compressedFiles;
}

/**
 * Get the size reduction information
 * @param originalFile - Original file
 * @param compressedFile - Compressed file
 * @returns Size reduction info
 */
export function getSizeReduction(originalFile: File, compressedFile: File) {
  const originalSizeMB = originalFile.size / (1024 * 1024);
  const compressedSizeMB = compressedFile.size / (1024 * 1024);
  const reductionPercent = ((originalSizeMB - compressedSizeMB) / originalSizeMB) * 100;

  return {
    originalSizeMB: originalSizeMB.toFixed(2),
    compressedSizeMB: compressedSizeMB.toFixed(2),
    reductionPercent: reductionPercent.toFixed(1),
    savedMB: (originalSizeMB - compressedSizeMB).toFixed(2)
  };
}

/**
 * Check if file needs compression based on size threshold
 * @param file - File to check
 * @param maxSizeMB - Maximum size in MB (default: 1MB)
 * @returns True if file needs compression
 */
export function needsCompression(file: File, maxSizeMB: number = 1): boolean {
  const fileSizeMB = file.size / (1024 * 1024);
  return fileSizeMB > maxSizeMB;
}