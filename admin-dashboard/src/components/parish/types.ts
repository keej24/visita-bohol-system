export interface ChurchInfo {
  churchName: string;
  parishName?: string;
  locationDetails: {
    streetAddress?: string;
    barangay?: string;
    municipality?: string;
  };
  historicalDetails: {
    foundingYear?: string;
    founders?: string;
    architecturalStyle?: string;
    heritageClassification?: string;
    historicalBackground?: string;
    majorHistoricalEvents?: string;
  };
  currentParishPriest?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
  };
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  photos?: Array<{ url: string; name?: string }>;
  documents?: Array<{ url: string; name?: string }>;
  virtual360Images?: Array<{ url: string; name?: string }>;
  massSchedules?: any[];
  status?: string;
}
