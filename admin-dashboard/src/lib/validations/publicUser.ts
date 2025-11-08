import { z } from 'zod';

// Public user preferences schema
export const publicUserPreferencesSchema = z.object({
  enableNotifications: z.boolean().default(true),
  enableFeastDayReminders: z.boolean().default(false),
  enableLocationReminders: z.boolean().default(false),
  shareProgressPublically: z.boolean().default(false),
  preferredLanguage: z.string().default('en'),
  darkMode: z.boolean().default(false),
});

// Journal entry schema
export const journalEntrySchema = z.object({
  id: z.string(),
  churchId: z.string(),
  churchName: z.string(),
  content: z.string(),
  visitDate: z.string().datetime(),
  createdAt: z.string().datetime(),
  mood: z.enum(['reflective', 'joyful', 'peaceful', 'grateful', 'inspired']).optional(),
  photos: z.array(z.string()).default([]),
});

// Public user schema (mobile app users)
export const publicUserSchema = z.object({
  // Core Identity
  id: z.string().min(1, 'User ID is required'),
  displayName: z.string()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name is too long')
    .trim(),
  email: z.string()
    .email('Invalid email format')
    .toLowerCase(),

  // Profile Information
  profileImageUrl: z.string().url().optional().nullable(),
  phoneNumber: z.string()
    .regex(/^(\+63|0)?[0-9]{10}$/, 'Invalid Philippine phone number format')
    .optional()
    .nullable(),
  location: z.string().max(200, 'Location is too long').optional().nullable(),
  bio: z.string().max(500, 'Bio is too long').optional().nullable(),
  nationality: z.string().max(100, 'Nationality is too long').optional().nullable(),

  // Account Type & Affiliation
  parish: z.string().default('Not specified'),
  affiliation: z.string().default('Public User'),
  accountType: z.literal('public').default('public'),

  // User Activity
  visitedChurches: z.array(z.string()).default([]),
  favoriteChurches: z.array(z.string()).default([]),
  forVisitChurches: z.array(z.string()).default([]),
  journalEntries: z.array(journalEntrySchema).default([]),

  // Preferences
  preferences: publicUserPreferencesSchema.default({}),

  // Status
  isActive: z.boolean().default(true),
  isBlocked: z.boolean().default(false),
  blockReason: z.string().optional().nullable(),
  blockedAt: z.string().datetime().optional().nullable(),
  blockedBy: z.string().optional().nullable(),

  // Timestamps
  createdAt: z.string().datetime(),
  lastLoginAt: z.string().datetime().optional().nullable(),
  lastUpdatedAt: z.string().datetime().optional().nullable(),
});

// Public user with statistics (for management view)
export const publicUserWithStatsSchema = publicUserSchema.extend({
  stats: z.object({
    totalVisits: z.number().int().nonnegative(),
    totalReviews: z.number().int().nonnegative(),
    averageRating: z.number().min(0).max(5),
    totalFavorites: z.number().int().nonnegative(),
    totalPlanned: z.number().int().nonnegative(),
    totalJournalEntries: z.number().int().nonnegative(),
    lastVisitDate: z.string().datetime().optional().nullable(),
    lastReviewDate: z.string().datetime().optional().nullable(),
  }),
});

// Update public user schema (for admin updates)
export const updatePublicUserSchema = z.object({
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  blockReason: z.string().max(500).optional().nullable(),
  blockedAt: z.string().datetime().optional().nullable(),
  blockedBy: z.string().optional().nullable(),
});

// Public user filter schema (for search/filter)
export const publicUserFilterSchema = z.object({
  search: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  hasVisitedChurch: z.string().optional(), // Filter by specific church ID
  nationality: z.string().optional(),
  minVisits: z.number().int().nonnegative().optional(),
  minReviews: z.number().int().nonnegative().optional(),
  sortBy: z.enum([
    'displayName',
    'email',
    'createdAt',
    'lastLoginAt',
    'totalVisits',
    'totalReviews',
    'averageRating'
  ]).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Block user schema
export const blockPublicUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  blockReason: z.string()
    .min(10, 'Block reason must be at least 10 characters')
    .max(500, 'Block reason is too long'),
  blockedBy: z.string().min(1, 'Blocker ID is required'),
});

// Unblock user schema
export const unblockPublicUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

// Type exports
export type PublicUser = z.infer<typeof publicUserSchema>;
export type PublicUserWithStats = z.infer<typeof publicUserWithStatsSchema>;
export type UpdatePublicUser = z.infer<typeof updatePublicUserSchema>;
export type PublicUserFilter = z.infer<typeof publicUserFilterSchema>;
export type BlockPublicUser = z.infer<typeof blockPublicUserSchema>;
export type UnblockPublicUser = z.infer<typeof unblockPublicUserSchema>;
export type JournalEntry = z.infer<typeof journalEntrySchema>;
export type PublicUserPreferences = z.infer<typeof publicUserPreferencesSchema>;

// Validation helper functions
export const validatePublicUser = (data: unknown): PublicUser => {
  return publicUserSchema.parse(data);
};

export const validatePublicUserWithStats = (data: unknown): PublicUserWithStats => {
  return publicUserWithStatsSchema.parse(data);
};

export const validateUpdatePublicUser = (data: unknown): UpdatePublicUser => {
  return updatePublicUserSchema.parse(data);
};

export const validatePublicUserFilter = (data: unknown): PublicUserFilter => {
  return publicUserFilterSchema.parse(data);
};

export const validateBlockPublicUser = (data: unknown): BlockPublicUser => {
  return blockPublicUserSchema.parse(data);
};

export const validateUnblockPublicUser = (data: unknown): UnblockPublicUser => {
  return unblockPublicUserSchema.parse(data);
};

// Error formatting helper
export const formatPublicUserValidationError = (error: z.ZodError): Record<string, string> => {
  const formattedErrors: Record<string, string> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    formattedErrors[path] = err.message;
  });

  return formattedErrors;
};
