export type ArchitecturalStyle = 'baroque' | 'gothic' | 'romanesque' | 'neoclassical' | 'modern' | 'mixed' | 'other';

export type ChurchClassification = 'ICP' | 'NCT' | 'Parish Church' | 'Chapel' | 'Cathedral' | 'non-heritage';

export interface Church {
  id: string;
  name: string;
  fullName?: string;
  municipality?: string;
  parishId?: string;
  diocese: 'tagbilaran' | 'talibon';
  status: 'pending' | 'approved' | 'heritage_review';
  classification?: ChurchClassification;
  foundedYear?: number;
  architecturalStyle?: ArchitecturalStyle;
  historicalBackground?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  photos?: string[];
  documents?: string[];
  virtualTour360?: string[];
  massSchedules?: any[];
  assignedPriest?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: string;
  };
}
