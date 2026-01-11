import { Timestamp } from 'firebase/firestore';

/**
 * Hotspot on a 360° scene
 */
export interface TourHotspot {
  id: string;
  type: 'navigation' | 'info'; // Navigation to another scene or info popup
  yaw: number; // -180 to 180
  pitch: number; // -90 to 90
  label: string;
  // Navigation hotspot fields
  targetSceneId?: string; // Required for navigation, not used for info
  // Info hotspot fields
  description?: string; // Required for info, not used for navigation
}

/**
 * A single 360° scene in a virtual tour
 */
export interface TourScene {
  id: string;
  title: string;
  imageUrl: string;
  isStartScene: boolean;
  hotspots: TourHotspot[];
}

/**
 * Complete virtual tour for a church
 */
export interface VirtualTour {
  scenes: TourScene[];
}

/**
 * Uploaded 360° image (before becoming a scene)
 */
export interface Uploaded360Image {
  id: string;
  file: File | null; // File object during upload, null after uploaded
  url: string; // Firebase Storage URL after upload
  uploadProgress: number; // 0-100
  uploading: boolean;
  error?: string;
  previewUrl?: string; // Object URL for preview before upload
  uploadTask?: any; // Firebase UploadTask reference for cancellation
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'canceled';
}
