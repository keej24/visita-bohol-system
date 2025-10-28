export type ChurchStatus = 'pending' | 'approved' | 'rejected' | 'under_review' | 'needs_revision';
export type ChurchClassification = 'ICP' | 'NCT' | 'non_heritage' | 'parish_church' | 'pilgrimage_site' | 'historical_shrine';
export type ArchitecturalStyle = 'baroque' | 'gothic' | 'romanesque' | 'neoclassical' | 'modern' | 'mixed' | 'other';

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
  type?: string; // Sunday Mass, Daily Mass, etc.
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
  assignedPriest?: string;
  massSchedules: MassSchedule[];
  coordinates?: Coordinates;
  contactInfo?: ContactInfo;

  // Media
  images: string[];
  documents: string[];
  virtualTour?: import('@/types/virtualTour').VirtualTour; // 360° virtual tour with scenes and hotspots

  // Heritage specific
  heritageDeclaration?: string; // Museum declaration document URL
  culturalSignificance?: string;
  preservationHistory?: string;
  restorationHistory?: string;

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

  // Analytics
  monthlyVisitors?: number;
  visitCount?: number;
  averageRating?: number;

  // Tags and categories
  tags?: string[];
  category?: string;

  // Parish association
  parishId?: string;
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
  assignedPriest?: string;
  massSchedules: MassSchedule[];
  coordinates?: Coordinates;
  contactInfo?: ContactInfo;
  images: string[];
  documents: string[];
  virtualTour360?: string[];
  culturalSignificance?: string;
  preservationHistory?: string;
  restorationHistory?: string;
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
  action: 'approve' | 'reject' | 'request_revision' | 'forward_to_museum';
  notes?: string;
  reviewerId: string;
}

export interface ChurchStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  underReview: number;
  needsRevision: number;
  byClassification: Record<ChurchClassification, number>;
  byMunicipality: Record<string, number>;
  recentSubmissions: number;
}