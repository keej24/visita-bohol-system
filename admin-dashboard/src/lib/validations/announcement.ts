import { z } from 'zod';

// Announcement scope and priority enums
export const announcementScopes = ['diocese', 'parish', 'all'] as const;
export const announcementPriorities = ['low', 'normal', 'high', 'urgent'] as const;
export const announcementStatuses = ['draft', 'published', 'archived'] as const;
export const announcementTypes = ['general', 'event', 'mass_schedule', 'special_service', 'maintenance', 'emergency'] as const;

// Base announcement schema
export const announcementSchema = z.object({
  // Basic Information
  title: z.string()
    .min(1, 'Title is required')
    .max(150, 'Title must be less than 150 characters')
    .trim(),
  
  content: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(2000, 'Content must be less than 2000 characters'),
  
  summary: z.string()
    .max(300, 'Summary must be less than 300 characters')
    .optional(),

  // Classification
  type: z.enum(announcementTypes, {
    required_error: 'Announcement type is required',
    invalid_type_error: 'Invalid announcement type',
  }).default('general'),
  
  priority: z.enum(announcementPriorities, {
    invalid_type_error: 'Invalid priority level',
  }).default('normal'),
  
  scope: z.enum(announcementScopes, {
    required_error: 'Announcement scope is required',
    invalid_type_error: 'Invalid announcement scope',
  }),

  // Targeting
  diocese: z.enum(['tagbilaran', 'talibon'], {
    required_error: 'Diocese is required',
  }),
  
  parish: z.string()
    .min(1, 'Parish is required for parish-scope announcements')
    .max(100, 'Parish name is too long')
    .optional(),
  
  targetAudience: z.array(z.enum(['parishioners', 'visitors', 'staff', 'all']))
    .min(1, 'At least one target audience is required')
    .default(['all']),

  // Event Information (for event-type announcements)
  eventDetails: z.object({
    startDate: z.string().datetime('Invalid start date format'),
    endDate: z.string().datetime('Invalid end date format').optional(),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
    venue: z.string().max(200, 'Venue name is too long').optional(),
    organizer: z.string().max(100, 'Organizer name is too long').optional(),
    contactInfo: z.object({
      phone: z.string().regex(/^(\+63|0)?[0-9]{10}$/, 'Invalid phone number').optional(),
      email: z.string().email('Invalid email format').optional(),
    }).optional(),
    registrationRequired: z.boolean().default(false),
    registrationUrl: z.string().url('Invalid registration URL').optional(),
    maxAttendees: z.number().int().positive('Maximum attendees must be positive').optional(),
  }).optional(),

  // Media and Attachments
  images: z.array(z.object({
    url: z.string().url('Invalid image URL'),
    caption: z.string().max(200, 'Caption is too long').optional(),
    alt: z.string().max(100, 'Alt text is too long').optional(),
  })).max(5, 'Too many images'),

  attachments: z.array(z.object({
    url: z.string().url('Invalid attachment URL'),
    filename: z.string().min(1, 'Filename is required').max(100, 'Filename is too long'),
    fileType: z.string().max(10, 'File type is too long'),
    fileSize: z.number().int().positive('File size must be positive').max(10 * 1024 * 1024, 'File too large (max 10MB)'),
  })).max(3, 'Too many attachments'),

  // Publishing and Status
  status: z.enum(announcementStatuses, {
    invalid_type_error: 'Invalid status',
  }).default('draft'),
  
  publishedAt: z.string().datetime().optional(),
  scheduledFor: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  
  // Settings
  isPinned: z.boolean().default(false),
  allowComments: z.boolean().default(true),
  notifyUsers: z.boolean().default(true),
  
  // Tags for organization
  tags: z.array(z.string().max(50, 'Tag is too long'))
    .max(10, 'Too many tags')
    .optional(),

  // Metadata
  createdBy: z.string().min(1, 'Creator is required'),
  lastUpdatedBy: z.string().optional(),
  viewCount: z.number().int().min(0).default(0),
  
  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
})
.refine(
  (data) => {
    // Parish is required for parish-scope announcements
    if (data.scope === 'parish' && !data.parish) {
      return false;
    }
    return true;
  },
  {
    message: 'Parish is required for parish-scope announcements',
    path: ['parish'],
  }
)
.refine(
  (data) => {
    // Event details are required for event-type announcements
    if (data.type === 'event' && !data.eventDetails) {
      return false;
    }
    return true;
  },
  {
    message: 'Event details are required for event announcements',
    path: ['eventDetails'],
  }
)
.refine(
  (data) => {
    // End date must be after start date for events
    if (data.eventDetails?.startDate && data.eventDetails?.endDate) {
      return new Date(data.eventDetails.endDate) >= new Date(data.eventDetails.startDate);
    }
    return true;
  },
  {
    message: 'End date must be after start date',
    path: ['eventDetails.endDate'],
  }
)
.refine(
  (data) => {
    // Expiry date must be in the future
    if (data.expiresAt) {
      return new Date(data.expiresAt) > new Date();
    }
    return true;
  },
  {
    message: 'Expiry date must be in the future',
    path: ['expiresAt'],
  }
);

// Create announcement schema
export const createAnnouncementSchema = announcementSchema.omit({
  createdBy: true,
  lastUpdatedBy: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
});

// Update announcement schema
export const updateAnnouncementSchema = announcementSchema.partial().omit({
  createdBy: true,
  createdAt: true,
});

// Announcement filter/search schema
export const announcementFilterSchema = z.object({
  search: z.string().max(100).optional(),
  type: z.enum([...announcementTypes, 'all'] as const).default('all'),
  priority: z.enum([...announcementPriorities, 'all'] as const).default('all'),
  scope: z.enum([...announcementScopes, 'all'] as const).default('all'),
  status: z.enum([...announcementStatuses, 'all'] as const).default('all'),
  diocese: z.enum(['tagbilaran', 'talibon', 'all']).default('all'),
  parish: z.string().max(100).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  isPinned: z.boolean().optional(),
  hasEvents: z.boolean().optional(),
  sortBy: z.enum(['title', 'createdAt', 'publishedAt', 'priority', 'viewCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Announcement statistics schema
export const announcementStatsSchema = z.object({
  totalAnnouncements: z.number().int().min(0),
  publishedAnnouncements: z.number().int().min(0),
  draftAnnouncements: z.number().int().min(0),
  archivedAnnouncements: z.number().int().min(0),
  upcomingEvents: z.number().int().min(0),
  totalViews: z.number().int().min(0),
  averageViewsPerAnnouncement: z.number().min(0),
});

// Type definitions
export type Announcement = z.infer<typeof announcementSchema>;
export type CreateAnnouncement = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncement = z.infer<typeof updateAnnouncementSchema>;
export type AnnouncementFilter = z.infer<typeof announcementFilterSchema>;
export type AnnouncementStats = z.infer<typeof announcementStatsSchema>;

// Validation helper functions
export const validateAnnouncement = (data: unknown): Announcement => {
  return announcementSchema.parse(data);
};

export const validateCreateAnnouncement = (data: unknown): CreateAnnouncement => {
  return createAnnouncementSchema.parse(data);
};

export const validateUpdateAnnouncement = (data: unknown): UpdateAnnouncement => {
  return updateAnnouncementSchema.parse(data);
};

export const validateAnnouncementFilter = (data: unknown): AnnouncementFilter => {
  return announcementFilterSchema.parse(data);
};

export const validateAnnouncementStats = (data: unknown): AnnouncementStats => {
  return announcementStatsSchema.parse(data);
};

// Business logic helpers
export const canUserCreateAnnouncement = (userRole: string, announcementScope: string): boolean => {
  if (userRole === 'chancery_office') {
    return true; // Chancery can create any scope
  }
  if (userRole === 'parish') {
    return announcementScope === 'parish'; // Parish secretary can only create parish-scope
  }
  return false;
};

export const canUserEditAnnouncement = (
  userRole: string,
  userDiocese: string,
  userParish: string | undefined,
  announcement: Partial<Announcement>
): boolean => {
  if (userRole === 'chancery_office' && userDiocese === announcement.diocese) {
    return true; // Chancery can edit announcements in their diocese
  }
  if (
    userRole === 'parish' &&
    announcement.scope === 'parish' &&
    userParish === announcement.parish &&
    userDiocese === announcement.diocese
  ) {
    return true; // Parish secretary can edit their parish announcements
  }
  return false;
};

export const getAnnouncementPriorityColor = (priority: string): string => {
  const colors = {
    low: '#10B981',      // Green
    normal: '#3B82F6',   // Blue
    high: '#F59E0B',     // Orange
    urgent: '#EF4444',   // Red
  };
  return colors[priority as keyof typeof colors] || colors.normal;
};

export const getAnnouncementTypeIcon = (type: string): string => {
  const icons = {
    general: 'megaphone',
    event: 'calendar',
    mass_schedule: 'clock',
    special_service: 'church',
    maintenance: 'wrench',
    emergency: 'alert-triangle',
  };
  return icons[type as keyof typeof icons] || icons.general;
};

// Error formatting helper
export const formatAnnouncementValidationError = (error: z.ZodError): Record<string, string> => {
  const formattedErrors: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    formattedErrors[path] = err.message;
  });
  
  return formattedErrors;
};