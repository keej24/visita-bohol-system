import { db, storage } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import imageCompression from 'browser-image-compression';

export interface LogoData {
  dioceseLogoUrl?: string;
  parishLogoUrl?: string;
}

export interface DioceseSetting {
  logoUrl?: string;
  updatedAt?: Date;
  updatedBy?: string;
}

// In-memory cache for logo base64 data (avoids re-fetching during batch exports)
const logoBase64Cache: Record<string, string> = {};

/**
 * Service for managing diocese and parish logos used in report branding.
 * Handles upload, retrieval, deletion, and base64 conversion for PDF embedding.
 */
export class LogoService {
  // ===========================
  // DIOCESE LOGO OPERATIONS
  // ===========================

  /**
   * Get diocese logo URL from Firestore diocese_settings collection
   */
  static async getDioceseLogoUrl(dioceseId: string): Promise<string | null> {
    try {
      const settingsRef = doc(db, 'diocese_settings', dioceseId);
      const settingsDoc = await getDoc(settingsRef);
      if (settingsDoc.exists()) {
        return settingsDoc.data()?.logoUrl || null;
      }
      return null;
    } catch (error) {
      console.error('❌ Error fetching diocese logo URL:', error);
      return null;
    }
  }

  /**
   * Upload a diocese logo to Firebase Storage and save URL to Firestore
   */
  static async uploadDioceseLogo(
    dioceseId: string,
    file: File,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    // Validate file
    const validation = this.validateLogoFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Compress the image
    const compressedFile = await this.compressLogo(file);

    // Upload to Firebase Storage
    const storagePath = `logos/diocese/${dioceseId}/logo_${Date.now()}.${this.getFileExtension(file)}`;
    const storageRef = ref(storage, storagePath);

    const downloadURL = await new Promise<string>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, compressedFile, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
          originalName: file.name,
        },
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.(progress);
        },
        (error) => reject(error),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });

    // Save URL to Firestore diocese_settings
    const settingsRef = doc(db, 'diocese_settings', dioceseId);
    await setDoc(settingsRef, {
      logoUrl: downloadURL,
      updatedAt: new Date(),
      updatedBy: userId,
    }, { merge: true });

    // Clear cache for this diocese
    this.clearCachedLogo(`diocese_${dioceseId}`);

    console.log(`✅ Diocese logo uploaded for ${dioceseId}`);
    return downloadURL;
  }

  /**
   * Delete diocese logo from Storage and remove URL from Firestore
   */
  static async deleteDioceseLogo(dioceseId: string): Promise<void> {
    try {
      // Get current logo URL
      const currentUrl = await this.getDioceseLogoUrl(dioceseId);
      
      // Remove from Firestore
      const settingsRef = doc(db, 'diocese_settings', dioceseId);
      await setDoc(settingsRef, { logoUrl: null, updatedAt: new Date() }, { merge: true });

      // Try to delete from Storage (may fail if URL format changed)
      if (currentUrl) {
        try {
          const storageRef = ref(storage, currentUrl);
          await deleteObject(storageRef);
        } catch (storageError) {
          console.warn('⚠️ Could not delete old logo from storage:', storageError);
        }
      }

      // Clear cache
      this.clearCachedLogo(`diocese_${dioceseId}`);
      console.log(`✅ Diocese logo deleted for ${dioceseId}`);
    } catch (error) {
      console.error('❌ Error deleting diocese logo:', error);
      throw new Error('Failed to delete diocese logo');
    }
  }

  // ===========================
  // PARISH LOGO OPERATIONS
  // ===========================

  /**
   * Get parish logo URL from the parishes collection
   */
  static async getParishLogoUrl(parishId: string): Promise<string | null> {
    try {
      const parishRef = doc(db, 'parishes', parishId);
      const parishDoc = await getDoc(parishRef);
      if (parishDoc.exists()) {
        return parishDoc.data()?.logoUrl || null;
      }
      // Fallback: try the churches collection (parish may be stored as church)
      const churchRef = doc(db, 'churches', parishId);
      const churchDoc = await getDoc(churchRef);
      if (churchDoc.exists()) {
        return churchDoc.data()?.logoUrl || null;
      }
      return null;
    } catch (error) {
      console.error('❌ Error fetching parish logo URL:', error);
      return null;
    }
  }

  /**
   * Upload a parish logo to Firebase Storage and save URL to Firestore
   */
  static async uploadParishLogo(
    parishId: string,
    file: File,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    // Validate file
    const validation = this.validateLogoFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Compress the image
    const compressedFile = await this.compressLogo(file);

    // Upload to Firebase Storage
    const storagePath = `logos/parish/${parishId}/logo_${Date.now()}.${this.getFileExtension(file)}`;
    const storageRef = ref(storage, storagePath);

    const downloadURL = await new Promise<string>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, compressedFile, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
          originalName: file.name,
        },
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.(progress);
        },
        (error) => reject(error),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });

    // Save URL to the parish document — try parishes collection first, then churches
    try {
      const parishRef = doc(db, 'parishes', parishId);
      const parishDoc = await getDoc(parishRef);
      if (parishDoc.exists()) {
        await setDoc(parishRef, { logoUrl: downloadURL, updatedAt: new Date() }, { merge: true });
      } else {
        // Save to churches collection instead
        const churchRef = doc(db, 'churches', parishId);
        await setDoc(churchRef, { logoUrl: downloadURL, updatedAt: new Date() }, { merge: true });
      }
    } catch {
      // As fallback, save to churches collection
      const churchRef = doc(db, 'churches', parishId);
      await setDoc(churchRef, { logoUrl: downloadURL, updatedAt: new Date() }, { merge: true });
    }

    // Clear cache
    this.clearCachedLogo(`parish_${parishId}`);

    console.log(`✅ Parish logo uploaded for ${parishId}`);
    return downloadURL;
  }

  /**
   * Delete parish logo from Storage and remove URL from Firestore
   */
  static async deleteParishLogo(parishId: string): Promise<void> {
    try {
      const currentUrl = await this.getParishLogoUrl(parishId);

      // Remove from Firestore (try parishes first, then churches)
      try {
        const parishRef = doc(db, 'parishes', parishId);
        const parishDoc = await getDoc(parishRef);
        if (parishDoc.exists()) {
          await setDoc(parishRef, { logoUrl: null, updatedAt: new Date() }, { merge: true });
        } else {
          const churchRef = doc(db, 'churches', parishId);
          await setDoc(churchRef, { logoUrl: null, updatedAt: new Date() }, { merge: true });
        }
      } catch {
        const churchRef = doc(db, 'churches', parishId);
        await setDoc(churchRef, { logoUrl: null, updatedAt: new Date() }, { merge: true });
      }

      // Try to delete from Storage
      if (currentUrl) {
        try {
          const storageRef = ref(storage, currentUrl);
          await deleteObject(storageRef);
        } catch (storageError) {
          console.warn('⚠️ Could not delete old parish logo from storage:', storageError);
        }
      }

      // Clear cache
      this.clearCachedLogo(`parish_${parishId}`);
      console.log(`✅ Parish logo deleted for ${parishId}`);
    } catch (error) {
      console.error('❌ Error deleting parish logo:', error);
      throw new Error('Failed to delete parish logo');
    }
  }

  // ===========================
  // BASE64 CONVERSION FOR PDFs
  // ===========================

  /**
   * Fetch a logo URL and convert to base64 for embedding in jsPDF.
   * Results are cached in memory to avoid re-fetching during batch exports.
   */
  static async getLogoAsBase64(url: string, cacheKey?: string): Promise<string | null> {
    const key = cacheKey || url;

    // Check cache first
    if (logoBase64Cache[key]) {
      return logoBase64Cache[key];
    }

    try {
      const response = await fetch(url);
      const blob = await response.blob();

      return new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Cache it
          logoBase64Cache[key] = base64;
          resolve(base64);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('⚠️ Could not fetch logo for base64 conversion:', error);
      return null;
    }
  }

  /**
   * Get both diocese and parish logos as base64 for PDF embedding.
   * Returns null for any logo that doesn't exist.
   */
  static async getLogosForReport(
    dioceseId: string,
    parishId?: string
  ): Promise<{ dioceseLogo: string | null; parishLogo: string | null }> {
    const [dioceseLogoUrl, parishLogoUrl] = await Promise.all([
      this.getDioceseLogoUrl(dioceseId),
      parishId ? this.getParishLogoUrl(parishId) : Promise.resolve(null),
    ]);

    const [dioceseLogo, parishLogo] = await Promise.all([
      dioceseLogoUrl ? this.getLogoAsBase64(dioceseLogoUrl, `diocese_${dioceseId}`) : Promise.resolve(null),
      parishLogoUrl ? this.getLogoAsBase64(parishLogoUrl, `parish_${parishId}`) : Promise.resolve(null),
    ]);

    return { dioceseLogo, parishLogo };
  }

  // ===========================
  // VALIDATION & COMPRESSION
  // ===========================

  /**
   * Validate a logo file before upload.
   * Accepts PNG and JPEG, max 2MB, image files only.
   */
  static validateLogoFile(file: File): { isValid: boolean; error?: string } {
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: 'Only PNG, JPEG, or WebP images are allowed for logos.',
      };
    }

    if (file.size > MAX_SIZE) {
      return {
        isValid: false,
        error: `Logo file too large. Maximum size is 2MB (current: ${(file.size / 1024 / 1024).toFixed(1)}MB).`,
      };
    }

    return { isValid: true };
  }

  /**
   * Compress a logo image to a reasonable size for PDF embedding.
   */
  private static async compressLogo(file: File): Promise<File> {
    // Skip compression for small files
    if (file.size < 200 * 1024) {
      return file;
    }

    try {
      return await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 512,
        useWebWorker: true,
      });
    } catch (error) {
      console.warn('⚠️ Logo compression failed, using original:', error);
      return file;
    }
  }

  /**
   * Clear a cached logo base64 entry
   */
  private static clearCachedLogo(key: string): void {
    delete logoBase64Cache[key];
  }

  /**
   * Clear entire logo base64 cache
   */
  static clearCache(): void {
    Object.keys(logoBase64Cache).forEach((key) => delete logoBase64Cache[key]);
  }

  /**
   * Get file extension from File object
   */
  private static getFileExtension(file: File): string {
    const parts = file.name.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : 'png';
  }
}
