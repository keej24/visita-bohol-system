// Parish Dashboard Types

export interface MassSchedule {
  day: string;
  time: string;
  endTime: string;
  language?: string;
  isFbLive?: boolean;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ContactInfo {
  phone: string;
  email: string;
  website?: string;
  facebookPage?: string;
}

export interface LocationDetails {
  streetAddress: string;
  barangay: string;
  municipality: string;
  province: string;
}

export interface HistoricalDetails {
  foundingYear: string;
  founders: string;
  architecturalStyle: string;
  historicalBackground: string;
  majorHistoricalEvents: string;
  heritageClassification: 'National Cultural Treasures' | 'Important Cultural Properties' | 'None';
  religiousClassification: 'Diocesan Shrine' | 'Jubilee Church' | 'Papal Basilica Affinity' | 'None';
  supportingDocuments?: FileUpload[];
}

export interface FileUpload {
  id: string;
  name: string;
  type: 'photo' | 'document' | '360' | 'heritage-doc';
  category?: 'exterior' | 'interior' | 'altar' | 'belfry' | 'historical';
  url?: string;
  uploadDate: string;
  status: 'pending' | 'approved' | 'rejected';
  fileSize?: number;
  description?: string;
}

export interface Virtual360Image {
  id: string;
  file?: File;
  url: string;
  name: string;
  size?: number;
  description?: string;
  isProcessing?: boolean;
  isValid?: boolean;
  error?: string;
  uploadDate: string;
  status: 'pending' | 'approved' | 'rejected';
  category: 'interior' | 'exterior' | 'altar' | 'entrance' | 'grounds';
  aspectRatio?: number;
  dimensions?: { width: number; height: number };
}

export interface ChurchInfo {
  // Unique identifier
  id?: string; // Optional for backward compatibility
  
  // Basic Information
  churchName: string;
  parishName?: string;
  locationDetails: LocationDetails;
  coordinates: Coordinates;
  
  // Historical & Cultural Details
  historicalDetails: HistoricalDetails;
  
  // Current Parish Information
  currentParishPriest: string;
  massSchedules: MassSchedule[];
  contactInfo: ContactInfo;
  
  // Media
  photos: FileUpload[];
  documents: FileUpload[];
  virtual360Images: Virtual360Image[];
  
  // Legacy fields for compatibility
  name: string;
  location: string;
  priest: string;
  founded: string;
  classification: string;
  description: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  capacity?: number;
  architecturalStyle?: string;
  patronSaint?: string;
  diocese?: string;
}

export interface FeedbackItem {
  id: string;
  visitor: string;
  rating: number;
  comment: string;
  date: string;
  hasResponse: boolean;
  response?: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  date: string;
  status: 'draft' | 'published' | 'archived';
}

export interface PhotoItem {
  id: string;
  name: string;
  type: 'photo' | 'document' | '360';
  uploadDate: string;
  status: 'approved' | 'pending' | 'rejected';
  description?: string;
  fileSize?: number;
  url?: string;
}

export interface ParishStats {
  totalPhotos: number;
  announcements: number;
  feedback: number;
  avgRating: string;
  documentsCount: number;
  photos360Count: number;
}

// Parish Reporting Types
export interface VisitorLog {
  id: string;
  date: string;
  visitorCount: number;
  source: 'mobile_app' | 'website' | 'qr_code';
  timeOfDay: 'morning' | 'afternoon' | 'evening';
}

export interface FeedbackAnalytics {
  id: string;
  date: string;
  rating: number;
  comment: string;
  category: 'general' | 'accessibility' | 'facilities' | 'experience';
  respondedDate?: string;
}

export interface ChurchSummaryReport {
  churchName: string;
  parishName: string;
  documentationDetails: {
    foundingYear: string;
    founders: string;
    keyFigures: string[];
    architecturalStyle: string;
    architecturalEvolution: string;
    majorHistoricalEvents: string[];
    heritageClassification: string;
    heritageRecognitionRecords: string[];
    preservationHistory: string;
    restorationHistory: string;
  };
  generatedDate: string;
}

export interface EngagementAnalyticsReport {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  visitorStats: {
    totalVisitors: number;
    averageDaily: number;
    peakDay: string;
    peakTime: string;
    growthRate: number;
  };
  feedbackStats: {
    totalFeedback: number;
    averageRating: number;
    ratingTrend: number;
    responseRate: number;
    categoryBreakdown: Record<string, number>;
  };
  visualizations: {
    visitorHeatMap: Array<{ date: string; visitors: number; timeSlot: string }>;
    trendData: Array<{ date: string; visitors: number; rating: number }>;
    peakPeriods: Array<{ period: string; count: number }>;
  };
  generatedDate: string;
}