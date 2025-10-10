import { z } from 'zod';

// Base church schema
export const churchSchema = z.object({
  // Basic Information
  name: z.string()
    .min(1, 'Church name is required')
    .max(100, 'Church name must be less than 100 characters'),
  
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),

  // Location Information
  municipality: z.string()
    .min(1, 'Municipality is required')
    .max(50, 'Municipality name is too long'),
  
  province: z.string()
    .default('Bohol'),
  
  address: z.string()
    .min(5, 'Complete address is required')
    .max(200, 'Address is too long'),
  
  coordinates: z.object({
    latitude: z.number()
      .min(-90, 'Invalid latitude')
      .max(90, 'Invalid latitude'),
    longitude: z.number()
      .min(-180, 'Invalid longitude')
      .max(180, 'Invalid longitude'),
  }),

  // Diocese and Parish
  diocese: z.enum(['tagbilaran', 'talibon'], {
    required_error: 'Diocese is required',
    invalid_type_error: 'Invalid diocese selection',
  }),
  
  parish: z.string()
    .min(1, 'Parish name is required')
    .max(100, 'Parish name is too long'),

  // Historical Information
  foundingYear: z.number()
    .int('Founding year must be a whole number')
    .min(1500, 'Founding year seems too early')
    .max(new Date().getFullYear(), 'Founding year cannot be in the future')
    .optional(),
  
  founders: z.string()
    .max(200, 'Founders information is too long')
    .optional(),
  
  historicalSignificance: z.string()
    .max(500, 'Historical significance description is too long')
    .optional(),

  // Architectural Information
  architecturalStyle: z.string()
    .max(100, 'Architectural style description is too long')
    .optional(),
  
  architecturalFeatures: z.array(z.string())
    .max(10, 'Too many architectural features')
    .optional(),

  // Heritage Classification
  heritageClassification: z.enum(['ICP', 'NCT', 'none'], {
    invalid_type_error: 'Invalid heritage classification',
  }).default('none'),
  
  heritageDeclaration: z.object({
    number: z.string().optional(),
    date: z.string().datetime().optional(),
    description: z.string().max(300).optional(),
  }).optional(),

  // Mass Schedule
  massSchedule: z.array(z.object({
    day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
    time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    type: z.enum(['Regular', 'Children', 'Youth', 'Evening', 'Special']).default('Regular'),
  })).max(14, 'Too many mass schedules').optional(),

  // Contact Information
  contactInfo: z.object({
    phone: z.string()
      .regex(/^(\+63|0)?[0-9]{10}$/, 'Invalid Philippine phone number format')
      .optional(),
    email: z.string()
      .email('Invalid email format')
      .optional(),
    website: z.string()
      .url('Invalid website URL')
      .optional(),
    facebook: z.string()
      .url('Invalid Facebook URL')
      .optional(),
  }).optional(),

  // Priest Information
  priest: z.object({
    name: z.string().max(100, 'Priest name is too long'),
    title: z.enum(['Rev. Fr.', 'Msgr.', 'Bishop', 'Archbishop']).default('Rev. Fr.'),
    contactInfo: z.object({
      phone: z.string().optional(),
      email: z.string().email().optional(),
    }).optional(),
  }).optional(),

  // Images and Media
  images: z.array(z.object({
    url: z.string().url('Invalid image URL'),
    caption: z.string().max(200, 'Caption is too long').optional(),
    type: z.enum(['exterior', 'interior', 'altar', 'facade', 'historical', 'artwork']).default('exterior'),
    isPrimary: z.boolean().default(false),
  })).max(20, 'Too many images'),

  // 360 Tour
  virtualTour: z.object({
    url: z.string().url('Invalid virtual tour URL'),
    thumbnailUrl: z.string().url('Invalid thumbnail URL').optional(),
    description: z.string().max(200).optional(),
  }).optional(),

  // Status and Approval
  status: z.enum(['draft', 'pending', 'heritage_review', 'approved', 'needs_revision'], {
    required_error: 'Status is required',
  }).default('draft'),
  
  reviewNotes: z.string()
    .max(500, 'Review notes are too long')
    .optional(),

  // Metadata
  createdBy: z.string().min(1, 'Created by is required'),
  lastUpdatedBy: z.string().optional(),
  submittedAt: z.string().datetime().optional(),
  reviewedAt: z.string().datetime().optional(),
  approvedAt: z.string().datetime().optional(),
});

// Create church schema (for new submissions)
export const createChurchSchema = churchSchema.omit({
  createdBy: true,
  lastUpdatedBy: true,
  submittedAt: true,
  reviewedAt: true,
  approvedAt: true,
});

// Update church schema (for modifications)
export const updateChurchSchema = churchSchema.partial();

// Church review schema (for chancery/museum reviewer actions)
export const churchReviewSchema = z.object({
  status: z.enum(['approved', 'needs_revision', 'heritage_review']),
  reviewNotes: z.string()
    .min(1, 'Review notes are required when changing status')
    .max(500, 'Review notes are too long'),
  heritageClassification: z.enum(['ICP', 'NCT', 'none']).optional(),
  heritageDeclaration: z.object({
    number: z.string().optional(),
    date: z.string().datetime().optional(),
    description: z.string().max(300).optional(),
  }).optional(),
});

// Church search/filter schema
export const churchFilterSchema = z.object({
  search: z.string().max(100).optional(),
  municipality: z.string().max(50).optional(),
  diocese: z.enum(['tagbilaran', 'talibon']).optional(),
  heritageClassification: z.enum(['ICP', 'NCT', 'none']).optional(),
  status: z.enum(['draft', 'pending', 'heritage_review', 'approved', 'needs_revision']).optional(),
  foundingYearFrom: z.number().int().min(1500).optional(),
  foundingYearTo: z.number().int().max(new Date().getFullYear()).optional(),
  hasVirtualTour: z.boolean().optional(),
  sortBy: z.enum(['name', 'municipality', 'foundingYear', 'createdAt', 'updatedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Type definitions
export type Church = z.infer<typeof churchSchema>;
export type CreateChurch = z.infer<typeof createChurchSchema>;
export type UpdateChurch = z.infer<typeof updateChurchSchema>;
export type ChurchReview = z.infer<typeof churchReviewSchema>;
export type ChurchFilter = z.infer<typeof churchFilterSchema>;

// Validation helper functions
export const validateChurch = (data: unknown): Church => {
  return churchSchema.parse(data);
};

export const validateCreateChurch = (data: unknown): CreateChurch => {
  return createChurchSchema.parse(data);
};

export const validateUpdateChurch = (data: unknown): UpdateChurch => {
  return updateChurchSchema.parse(data);
};

export const validateChurchReview = (data: unknown): ChurchReview => {
  return churchReviewSchema.parse(data);
};

export const validateChurchFilter = (data: unknown): ChurchFilter => {
  return churchFilterSchema.parse(data);
};

// Validation error formatter
export const formatValidationError = (error: z.ZodError): Record<string, string> => {
  const formattedErrors: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    formattedErrors[path] = err.message;
  });
  
  return formattedErrors;
};