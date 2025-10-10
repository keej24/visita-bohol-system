/**
 * Validation result for 360° images
 */
export interface ValidationResult {
  isValid: boolean;
  message: string;
  details?: {
    width: number;
    height: number;
    aspectRatio: number;
    expectedRatio: string;
  };
}

/**
 * Validate if an image is in equirectangular format (2:1 aspect ratio)
 * Equirectangular images are the standard format for 360° panoramas
 * @param file - The image file to validate
 * @returns Promise with validation result
 */
export function validate360Image(file: File): Promise<ValidationResult> {
  return new Promise((resolve) => {
    // Check file type first
    if (!file.type.startsWith('image/')) {
      resolve({
        isValid: false,
        message: 'File must be an image (JPEG, PNG, etc.)'
      });
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const aspectRatio = width / height;

      // Equirectangular images should have a 2:1 aspect ratio
      // Allow some tolerance (1.9 to 2.1) to account for minor variations
      const isValidRatio = aspectRatio >= 1.9 && aspectRatio <= 2.1;

      // Clean up object URL
      URL.revokeObjectURL(objectUrl);

      if (isValidRatio) {
        resolve({
          isValid: true,
          message: '✓ Valid 360° equirectangular image',
          details: {
            width,
            height,
            aspectRatio: Math.round(aspectRatio * 100) / 100,
            expectedRatio: '2:1'
          }
        });
      } else {
        resolve({
          isValid: false,
          message: `Invalid aspect ratio. Expected 2:1 (width:height), got ${Math.round(aspectRatio * 100) / 100}:1`,
          details: {
            width,
            height,
            aspectRatio: Math.round(aspectRatio * 100) / 100,
            expectedRatio: '2:1'
          }
        });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        isValid: false,
        message: 'Failed to load image. The file may be corrupted or in an unsupported format.'
      });
    };

    img.src = objectUrl;
  });
}

/**
 * Validate multiple 360° images
 * @param files - Array of image files to validate
 * @returns Promise with array of validation results
 */
export async function validateMultiple360Images(files: File[]): Promise<ValidationResult[]> {
  const validationPromises = files.map(file => validate360Image(file));
  return Promise.all(validationPromises);
}

/**
 * Check if image dimensions are suitable for 360° panorama
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns True if dimensions are suitable
 */
export function isValidPanoramaDimensions(width: number, height: number): boolean {
  const aspectRatio = width / height;
  return aspectRatio >= 1.9 && aspectRatio <= 2.1;
}

/**
 * Get recommended dimensions for 360° panorama based on input dimensions
 * @param width - Current width
 * @param height - Current height
 * @returns Recommended dimensions that maintain 2:1 ratio
 */
export function getRecommendedDimensions(width: number, height: number) {
  const aspectRatio = width / height;

  if (isValidPanoramaDimensions(width, height)) {
    return {
      width,
      height,
      isOptimal: true
    };
  }

  // If width is correct, adjust height
  if (aspectRatio > 2.1) {
    return {
      width,
      height: Math.round(width / 2),
      isOptimal: false
    };
  }

  // If height is correct, adjust width
  return {
    width: Math.round(height * 2),
    height,
    isOptimal: false
  };
}

/**
 * Common 360° panorama resolutions
 */
export const COMMON_360_RESOLUTIONS = [
  { width: 4096, height: 2048, quality: 'High Quality' },
  { width: 3840, height: 1920, quality: '4K' },
  { width: 2048, height: 1024, quality: 'Standard' },
  { width: 1024, height: 512, quality: 'Low (Preview)' }
];

/**
 * Validate file size for 360° images
 * @param file - File to check
 * @param maxSizeMB - Maximum size in MB (default: 10MB)
 * @returns Validation result
 */
export function validateFileSize(file: File, maxSizeMB: number = 10): ValidationResult {
  const fileSizeMB = file.size / (1024 * 1024);

  if (fileSizeMB > maxSizeMB) {
    return {
      isValid: false,
      message: `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size (${maxSizeMB}MB)`
    };
  }

  return {
    isValid: true,
    message: `File size is acceptable (${fileSizeMB.toFixed(2)}MB)`
  };
}

/**
 * Comprehensive validation for 360° panorama upload
 * Checks both aspect ratio and file size
 * @param file - File to validate
 * @param maxSizeMB - Maximum size in MB
 * @returns Promise with detailed validation result
 */
export async function validatePanoramaUpload(
  file: File,
  maxSizeMB: number = 10
): Promise<ValidationResult> {
  // First check file size
  const sizeValidation = validateFileSize(file, maxSizeMB);
  if (!sizeValidation.isValid) {
    return sizeValidation;
  }

  // Then check aspect ratio
  const ratioValidation = await validate360Image(file);
  return ratioValidation;
}