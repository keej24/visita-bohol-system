// TypeScript interfaces for announcement management
export interface Announcement {
  id: string;
  title: string;
  description: string;
  scope: 'diocese' | 'parish';
  diocese: 'tagbilaran' | 'talibon';
  parishId?: string; // Only for parish scope

  // Event details (optional for non-event announcements)
  eventDate?: Date;
  eventTime?: string;
  endTime?: string; // End time for events
  venue?: string;
  category: string;
  endDate?: Date; // For automatic archiving
  contactInfo?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // uid
  isArchived: boolean;
  archivedAt?: Date;
}

export interface AnnouncementFormData {
  title: string;
  description: string;
  scope: 'diocese' | 'parish';
  parishId?: string;
  eventDate?: string; // Optional for non-event announcements
  eventTime?: string; // Optional for non-event announcements
  endTime?: string; // End time for events
  venue?: string; // Optional for non-event announcements
  category: string;
  endDate?: string; // Optional for non-event announcements
  contactInfo?: string;
}

export interface AnnouncementFilters {
  scope?: 'diocese' | 'parish' | 'all';
  category?: string;
  isArchived?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
}

export const ANNOUNCEMENT_CATEGORIES = [
  'Festival',
  'Mass',
  'Exhibit',
  'Community Event',
  'Celebration',
  'Pilgrimage',
  'Conference',
  'Meeting',
  'Other'
] as const;

export type AnnouncementCategory = typeof ANNOUNCEMENT_CATEGORIES[number];