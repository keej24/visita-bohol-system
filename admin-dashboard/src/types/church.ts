export type ChurchStatus = 'draft' | 'pending' | 'approved' | 'under_review' | 'heritage_review';
export type ChurchClassification = 'ICP' | 'NCT' | 'non_heritage' | 'parish_church' | 'pilgrimage_site' | 'historical_shrine';
export type ArchitecturalStyle = 'baroque' | 'gothic' | 'romanesque' | 'byzantine' | 'neoclassical' | 'modern' | 'mixed' | 'other';
export type ReligiousClassification = 'diocesan_shrine' | 'jubilee_church' | 'papal_basilica_affinity' | 'none';

// Church document interface
export interface ChurchDocument {
  url: string;
  name?: string;
}

// Church photo interface
export interface ChurchPhoto {
  id?: string;
  url: string;
  name?: string;
  uploadDate?: string;
  status?: 'pending' | 'approved';
  type?: 'photo';
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  address?: string;
}

export interface MassSchedule {
  day: string;
  time: string;
  endTime?: string;
  type?: string; // Sunday Mass, Daily Mass, etc.
  language?: string; // Language of the mass (Filipino, English, Cebuano, etc.)
  isFbLive?: boolean; // Whether the mass is live-streamed on Facebook
}

// Parish priest assignment record for historical tracking
export interface PriestAssignment {
  name: string;         // Full name of the priest (e.g., "Rev. Fr. Juan Dela Cruz")
  startDate: string;    // ISO date string or year (e.g., "2020-06-15" or "2020")
  endDate?: string;     // ISO date string or year; undefined means currently assigned
  isCurrent: boolean;   // Whether this is the active/current assignment
  notes?: string;       // Optional notes (e.g., reason for reassignment)
}

export interface Church {
  id: string;
  name: string;
  fullName: string;
  location: string;
  municipality: string;
  diocese: 'tagbilaran' | 'talibon';
  foundingYear: number;
  founders?: string;
  keyFigures?: string[];
  architecturalStyle: ArchitecturalStyle;
  historicalBackground: string;
  description: string;
  classification: ChurchClassification;
  religiousClassification?: ReligiousClassification;
  assignedPriest?: string;  // Current priest name (kept for backward compatibility)
  priestHistory?: PriestAssignment[];  // Historical record of all priest assignments
  assistantPriests?: string[];  // Assistant parish priest(s) - optional, supports multiple entries
  feastDay?: string; // Feast day of the parish patron saint (e.g., "December 8")
  massSchedules: MassSchedule[];
  coordinates?: Coordinates;
  contactInfo?: ContactInfo;

  // Media
  images: string[]; // Legacy: simple URL array (deprecated, use photos instead)
  photos?: (string | ChurchPhoto)[]; // Church photos
  documents: (string | ChurchDocument)[]; // Church documents, supports both legacy string URLs and object format
  virtualTour?: import('@/types/virtualTour').VirtualTour; // 360° virtual tour with scenes and hotspots

  // Heritage specific
  heritageDeclaration?: string; // Museum declaration document URL
  culturalSignificance?: string;
  preservationHistory?: string;
  restorationHistory?: string;
  architecturalFeatures?: string;
  heritageInformation?: string;

  // Status and workflow
  status: ChurchStatus;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // Parish secretary user ID
  submittedAt?: Date;
  approvedAt?: Date;

  // Unpublish audit trail
  unpublishReason?: string;
  unpublishedAt?: Date;
  unpublishedBy?: string;

  // Analytics
  monthlyVisitors?: number;
  visitCount?: number;
  averageRating?: number;

  // Tags and categories
  tags?: string[];
  category?: string;

  // Parish association
  parishId?: string;

  // Pending changes system - staged updates awaiting approval
  // When a parish updates an approved church's sensitive fields,
  // changes are stored here until Chancery (and Museum for heritage) approves
  pendingChanges?: {
    data: Partial<ChurchFormData>;  // The proposed changes
    submittedAt: Date;              // When the update was submitted
    submittedBy: string;            // User ID who submitted
    changedFields: string[];        // List of fields that were modified
    forwardedToMuseum?: boolean;    // True when Chancery forwarded heritage changes to Museum
    forwardedAt?: Date;             // When the changes were forwarded
    forwardedBy?: string;           // User ID who forwarded
  };
  hasPendingChanges?: boolean;      // Quick filter flag for queries
}

export interface ChurchFormData {
  name: string;
  fullName: string;
  location: string;
  municipality: string;
  foundingYear: number;
  founders?: string;
  keyFigures?: string[];
  architecturalStyle: ArchitecturalStyle;
  historicalBackground: string;
  description: string;
  classification: ChurchClassification;
  religiousClassification?: ReligiousClassification;
  historicalDetails?: {
    religiousClassifications?: string[];
  };
  assignedPriest?: string;
  priestHistory?: PriestAssignment[];  // Historical record of all priest assignments
  assistantPriests?: string[];  // Assistant parish priest(s)
  feastDay?: string; // Feast day of the parish patron saint
  massSchedules: MassSchedule[];
  coordinates?: Coordinates;
  contactInfo?: ContactInfo;
  images: string[]; // Legacy: simple URL array for backward compatibility
  photos?: (string | ChurchPhoto)[]; // Church photos
  documents: (string | ChurchDocument)[]; // Church documents, supports both legacy string URLs and object format
  virtualTour360?: string[];
  culturalSignificance?: string;
  preservationHistory?: string;
  restorationHistory?: string;
  architecturalFeatures?: string;
  heritageInformation?: string;
  tags?: string[];
  category?: string;
}

export interface ChurchFilters {
  status?: ChurchStatus | 'all';
  classification?: ChurchClassification | 'all';
  municipality?: string;
  diocese?: 'tagbilaran' | 'talibon' | 'all';
  architecturalStyle?: ArchitecturalStyle | 'all';
  search?: string;
  sortBy?: 'name' | 'foundingYear' | 'updatedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface ChurchReviewAction {
  churchId: string;
  action: 'approve' | 'forward_to_museum';
  notes?: string;
  reviewerId: string;
}

export interface ChurchStats {
  total: number;
  pending: number;
  approved: number;
  underReview: number;
  heritageReview: number;
  byClassification: Record<ChurchClassification, number>;
  byMunicipality: Record<string, number>;
  recentSubmissions: number;
}