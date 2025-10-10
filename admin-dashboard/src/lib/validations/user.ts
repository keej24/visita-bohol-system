import { z } from 'zod';

// User roles enum
export const userRoles = ['chancery_office', 'museum_researcher', 'parish_secretary'] as const;
export const dioceses = ['tagbilaran', 'talibon'] as const;

// Base user schema
export const userSchema = z.object({
  // Authentication
  uid: z.string().min(1, 'User ID is required'),
  email: z.string()
    .email('Invalid email format')
    .toLowerCase(),

  // Profile Information
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long')
    .trim(),
  
  // Role and Access
  role: z.enum(userRoles, {
    required_error: 'User role is required',
    invalid_type_error: 'Invalid user role',
  }),
  
  diocese: z.enum(dioceses, {
    required_error: 'Diocese is required',
    invalid_type_error: 'Invalid diocese',
  }),
  
  parish: z.string()
    .min(1, 'Parish is required for parish secretaries')
    .max(100, 'Parish name is too long')
    .optional(),

  // Contact Information
  phone: z.string()
    .regex(/^(\+63|0)?[0-9]{10}$/, 'Invalid Philippine phone number format')
    .optional(),
  
  // Status and Permissions
  isActive: z.boolean().default(true),
  isVerified: z.boolean().default(false),
  
  // Timestamps
  createdAt: z.string().datetime(),
  lastLoginAt: z.string().datetime().optional(),
  lastUpdatedAt: z.string().datetime().optional(),
  
  // Profile Settings
  preferences: z.object({
    notifications: z.object({
      email: z.boolean().default(true),
      churchSubmissions: z.boolean().default(true),
      announcements: z.boolean().default(true),
      reports: z.boolean().default(false),
    }).default({}),
    dashboard: z.object({
      defaultView: z.enum(['grid', 'list']).default('grid'),
      itemsPerPage: z.number().int().min(10).max(100).default(20),
    }).default({}),
  }).default({}),
});

// Create user schema (for account creation)
export const createUserSchema = userSchema.omit({
  uid: true,
  createdAt: true,
  lastLoginAt: true,
  lastUpdatedAt: true,
  isVerified: true,
}).refine(
  (data) => {
    // Parish secretaries must have a parish
    if (data.role === 'parish_secretary' && !data.parish) {
      return false;
    }
    return true;
  },
  {
    message: 'Parish is required for parish secretary role',
    path: ['parish'],
  }
);

// Update user schema
export const updateUserSchema = userSchema.partial().omit({
  uid: true,
  email: true, // Email cannot be changed
  createdAt: true,
});

// User profile update schema (for self-updates)
export const userProfileUpdateSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long')
    .trim()
    .optional(),
  
  phone: z.string()
    .regex(/^(\+63|0)?[0-9]{10}$/, 'Invalid Philippine phone number format')
    .optional(),
  
  preferences: z.object({
    notifications: z.object({
      email: z.boolean().default(true),
      churchSubmissions: z.boolean().default(true),
      announcements: z.boolean().default(true),
      reports: z.boolean().default(false),
    }).optional(),
    dashboard: z.object({
      defaultView: z.enum(['grid', 'list']).default('grid'),
      itemsPerPage: z.number().int().min(10).max(100).default(20),
    }).optional(),
  }).optional(),
});

// Account invitation schema
export const invitationSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase(),
  
  role: z.enum(['parish_secretary'], {
    required_error: 'Role is required for invitation',
  }),
  
  diocese: z.enum(dioceses, {
    required_error: 'Diocese is required',
  }),
  
  parish: z.string()
    .min(1, 'Parish is required for parish secretary invitation')
    .max(100, 'Parish name is too long'),
  
  invitedBy: z.string().min(1, 'Inviter ID is required'),
  expiresAt: z.string().datetime(),
  message: z.string()
    .max(500, 'Invitation message is too long')
    .optional(),
});

// User search/filter schema
export const userFilterSchema = z.object({
  search: z.string().max(100).optional(),
  role: z.enum([...userRoles, 'all'] as const).default('all'),
  diocese: z.enum([...dioceses, 'all'] as const).default('all'),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  sortBy: z.enum(['name', 'email', 'role', 'createdAt', 'lastLoginAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Password change schema
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
);

// Authentication schemas
export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase(),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
});

export const passwordResetSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase(),
});

// Type definitions
export type User = z.infer<typeof userSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>;
export type Invitation = z.infer<typeof invitationSchema>;
export type UserFilter = z.infer<typeof userFilterSchema>;
export type PasswordChange = z.infer<typeof passwordChangeSchema>;
export type Login = z.infer<typeof loginSchema>;
export type PasswordReset = z.infer<typeof passwordResetSchema>;

// Validation helper functions
export const validateUser = (data: unknown): User => {
  return userSchema.parse(data);
};

export const validateCreateUser = (data: unknown): CreateUser => {
  return createUserSchema.parse(data);
};

export const validateUpdateUser = (data: unknown): UpdateUser => {
  return updateUserSchema.parse(data);
};

export const validateUserProfileUpdate = (data: unknown): UserProfileUpdate => {
  return userProfileUpdateSchema.parse(data);
};

export const validateInvitation = (data: unknown): Invitation => {
  return invitationSchema.parse(data);
};

export const validateUserFilter = (data: unknown): UserFilter => {
  return userFilterSchema.parse(data);
};

export const validatePasswordChange = (data: unknown): PasswordChange => {
  return passwordChangeSchema.parse(data);
};

export const validateLogin = (data: unknown): Login => {
  return loginSchema.parse(data);
};

export const validatePasswordReset = (data: unknown): PasswordReset => {
  return passwordResetSchema.parse(data);
};

// Permission checking helpers
export const canAccessDiocese = (user: User, targetDiocese: string): boolean => {
  if (user.role === 'museum_researcher') {
    return true; // Museum researchers have access across dioceses
  }
  return user.diocese === targetDiocese;
};

export const canManageParish = (user: User, parishId: string): boolean => {
  if (user.role === 'chancery_office') {
    return true; // Chancery can manage all parishes in their diocese
  }
  if (user.role === 'parish_secretary') {
    return user.parish === parishId;
  }
  return false;
};

export const canReviewChurch = (user: User): boolean => {
  return user.role === 'chancery_office' || user.role === 'museum_researcher';
};

export const canCreateUser = (user: User): boolean => {
  return user.role === 'chancery_office';
};

// Error formatting helper
export const formatUserValidationError = (error: z.ZodError): Record<string, string> => {
  const formattedErrors: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    formattedErrors[path] = err.message;
  });
  
  return formattedErrors;
};
