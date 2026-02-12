import { z } from 'zod';
import { useForm, UseFormProps, FieldValues, FieldPath, Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

// Base validation schemas
export const baseValidationSchemas = {
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().regex(/^[+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number'),
  required: (field: string) => z.string().min(1, `${field} is required`),
  optional: z.string().optional(),
  year: z.number().min(1500).max(new Date().getFullYear()).optional(),
  positiveNumber: z.number().positive().optional(),
};

// Church validation schemas
export const churchValidationSchema = z.object({
  name: baseValidationSchemas.required('Church name'),
  municipality: baseValidationSchemas.required('Municipality'),
  province: z.enum(['Bohol'], { message: 'Province must be Bohol' }),
  diocese: z.enum(['tagbilaran', 'talibon'], { message: 'Please select a diocese' }),
  
  // Optional fields
  yearBuilt: baseValidationSchemas.year,
  architect: baseValidationSchemas.optional,
  pastor: baseValidationSchemas.optional,
  
  // Heritage information
  heritageClassification: z.enum(['ICP', 'NCT', 'none'], { 
    message: 'Please select heritage classification' 
  }).optional(),
  historicalSignificance: z.string().max(2000, 'Historical significance must be less than 2000 characters').optional(),
  architecturalStyle: baseValidationSchemas.optional,
  
  // Contact information
  contactEmail: baseValidationSchemas.email.optional(),
  contactPhone: baseValidationSchemas.phone.optional(),
  
  // Location
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  address: baseValidationSchemas.optional,
  
  // Additional fields
  massSchedule: z.string().max(500, 'Mass schedule must be less than 500 characters').optional(),
  facilities: z.array(z.string()).optional(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor', 'critical']).optional(),
  lastRenovation: baseValidationSchemas.year,
  
  // Documents and media
  images: z.array(z.string()).optional(),
  documents: z.array(z.string()).optional(),
});

export type ChurchFormData = z.infer<typeof churchValidationSchema>;

// Announcement validation schema
export const announcementValidationSchema = z.object({
  title: baseValidationSchemas.required('Title'),
  content: z.string().min(10, 'Content must be at least 10 characters').max(5000, 'Content must be less than 5000 characters'),
  diocese: z.enum(['tagbilaran', 'talibon', 'both'], { message: 'Please select diocese scope' }),
  scope: z.enum(['diocese', 'parish', 'all'], { message: 'Please select announcement scope' }),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  
  // Scheduling
  publishAt: z.date().optional(),
  expiresAt: z.date().optional(),
  
  // Targeting
  targetAudience: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  
  // Media
  attachments: z.array(z.string()).optional(),
  featuredImage: z.string().optional(),
}).refine((data) => {
  if (data.expiresAt && data.publishAt) {
    return data.expiresAt > data.publishAt;
  }
  return true;
}, {
  message: 'Expiration date must be after publish date',
  path: ['expiresAt'],
});

export type AnnouncementFormData = z.infer<typeof announcementValidationSchema>;

// Feedback validation schema
export const feedbackValidationSchema = z.object({
  churchId: baseValidationSchemas.required('Church selection'),
  rating: z.number().min(1).max(5),
  comment: z.string().min(10, 'Please provide detailed feedback (at least 10 characters)').max(2000, 'Feedback must be less than 2000 characters'),
  
  // Visitor information
  visitorName: baseValidationSchemas.required('Visitor name'),
  visitorEmail: baseValidationSchemas.email.optional(),
  visitDate: z.date(),
  
  // Visit details
  visitPurpose: z.enum(['tourism', 'pilgrimage', 'research', 'worship', 'other']),
  groupSize: z.number().min(1).max(1000).optional(),
  
  // Specific feedback categories
  accessibility: z.number().min(1).max(5).optional(),
  facilities: z.number().min(1).max(5).optional(),
  cleanliness: z.number().min(1).max(5).optional(),
  staff: z.number().min(1).max(5).optional(),
  
  // Additional information
  suggestions: z.string().max(1000, 'Suggestions must be less than 1000 characters').optional(),
  wouldRecommend: z.boolean().optional(),
  
  // Privacy
  allowContact: z.boolean().default(false),
  allowPublicDisplay: z.boolean().default(true),
});

export type FeedbackFormData = z.infer<typeof feedbackValidationSchema>;

// User management validation schema
export const userValidationSchema = z.object({
  email: baseValidationSchemas.email,
  displayName: baseValidationSchemas.required('Display name'),
  role: z.enum(['chancery_office', 'parish', 'museum_researcher', 'admin'], {
    message: 'Please select a valid role'
  }),
  diocese: z.enum(['tagbilaran', 'talibon'], { message: 'Please select a diocese' }),
  
  // Optional profile information
  firstName: baseValidationSchemas.optional,
  lastName: baseValidationSchemas.optional,
  phone: baseValidationSchemas.phone.optional(),
  position: baseValidationSchemas.optional,
  parish: baseValidationSchemas.optional,
  
  // Permissions
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  
  // Contact preferences
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
});

export type UserFormData = z.infer<typeof userValidationSchema>;

// Enhanced form hook with optimistic updates and error handling
export interface OptimisticFormConfig<TData extends FieldValues> {
  mutationFn: (data: TData) => Promise<any>;
  optimisticUpdate?: (data: TData) => void;
  onSuccess?: (result: any, data: TData) => void;
  onError?: (error: Error, data: TData) => void;
  successMessage?: string;
  errorMessage?: string;
  queryKeysToInvalidate?: string[][];
  enableOptimisticUpdates?: boolean;
  retryAttempts?: number;
  debounceMs?: number;
}

export function useOptimisticForm<TData extends FieldValues>(
  schema: z.ZodSchema<TData>,
  config: OptimisticFormConfig<TData>,
  formOptions?: UseFormProps<TData>
) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempts, setSubmitAttempts] = useState(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  
  const form = useForm<TData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    ...formOptions,
  });

  const mutation = useMutation({
    mutationFn: config.mutationFn,
    onMutate: async (data: TData) => {
      // Cancel outgoing refetches
      if (config.queryKeysToInvalidate) {
        await Promise.all(
          config.queryKeysToInvalidate.map(key => 
            queryClient.cancelQueries({ queryKey: key })
          )
        );
      }

      // Perform optimistic update
      if (config.enableOptimisticUpdates && config.optimisticUpdate) {
        config.optimisticUpdate(data);
      }

      return { previousData: data };
    },
    onSuccess: (result, data) => {
      setSubmitAttempts(0);
      
      // Invalidate and refetch queries
      if (config.queryKeysToInvalidate) {
        config.queryKeysToInvalidate.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
      
      // Show success message
      if (config.successMessage) {
        toast.success(config.successMessage);
      }
      
      // Call success callback
      config.onSuccess?.(result, data);
    },
    onError: (error: Error, data, context) => {
      // Revert optimistic update if needed
      if (config.enableOptimisticUpdates && context?.previousData) {
        // Invalidate queries to revert to server state
        if (config.queryKeysToInvalidate) {
          config.queryKeysToInvalidate.forEach(key => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      }

      // Handle specific error types
      const errorMessage = getErrorMessage(error) || config.errorMessage || 'An error occurred';
      toast.error(errorMessage);
      
      // Set form errors if they're field-specific
      if (error.message.includes('validation')) {
        handleValidationErrors(error, form);
      }
      
      config.onError?.(error, data);
    },
    retry: (failureCount, error) => {
      // Don't retry validation errors
      if (error.message.includes('validation') || error.message.includes('permission')) {
        return false;
      }
      return failureCount < (config.retryAttempts || 2);
    },
  });

  const handleSubmit = useCallback((data: TData) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const submitFn = () => {
      setIsSubmitting(true);
      setSubmitAttempts(prev => prev + 1);
      
      mutation.mutate(data, {
        onSettled: () => {
          setIsSubmitting(false);
        },
      });
    };

    if (config.debounceMs && config.debounceMs > 0) {
      debounceTimeoutRef.current = setTimeout(submitFn, config.debounceMs);
    } else {
      submitFn();
    }
  }, [mutation, config.debounceMs]);

  // Auto-save functionality
  const enableAutoSave = useCallback((interval: number = 30000) => {
    const autoSaveInterval = setInterval(() => {
      if (form.formState.isDirty && form.formState.isValid && !isSubmitting) {
        const data = form.getValues();
        handleSubmit(data);
      }
    }, interval);

    return () => clearInterval(autoSaveInterval);
  }, [form, handleSubmit, isSubmitting]);

  // Field validation with debouncing
  const validateField = useCallback(async <TName extends FieldPath<TData>>(
    name: TName,
    debounce: number = 300
  ) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    return new Promise<boolean>((resolve) => {
      debounceTimeoutRef.current = setTimeout(async () => {
        const isValid = await form.trigger(name);
        resolve(isValid);
      }, debounce);
    });
  }, [form]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  }, []);

  return {
    form,
    handleSubmit: form.handleSubmit(handleSubmit),
    isSubmitting: isSubmitting || mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    submitAttempts,
    validateField,
    enableAutoSave,
    cleanup,
    reset: () => {
      form.reset();
      setSubmitAttempts(0);
    },
  };
}

// Error handling utilities
function getErrorMessage(error: Error): string {
  if (error.message.includes('permission-denied')) {
    return 'You do not have permission to perform this action';
  }
  if (error.message.includes('network')) {
    return 'Network error. Please check your connection and try again';
  }
  if (error.message.includes('validation')) {
    return 'Please check the form for errors';
  }
  if (error.message.includes('duplicate')) {
    return 'This record already exists';
  }
  return error.message;
}

function handleValidationErrors<TData extends FieldValues>(
  error: Error,
  form: ReturnType<typeof useForm<TData>>
) {
  try {
    const validationErrors = JSON.parse(error.message);
    Object.entries(validationErrors).forEach(([field, message]) => {
      form.setError(field as Path<TData>, {
        type: 'server',
        message: message as string,
      });
    });
  } catch {
    // If not a validation error object, ignore
  }
}

// Batch form operations
export class FormBatchOperations {
  private operations: Array<() => Promise<any>> = [];
  private queryClient: any;

  constructor(queryClient: any) {
    this.queryClient = queryClient;
  }

  addOperation(operation: () => Promise<any>) {
    this.operations.push(operation);
  }

  async executeAll(options?: {
    stopOnError?: boolean;
    showProgress?: boolean;
  }) {
    const { stopOnError = false, showProgress = true } = options || {};
    const results = [];
    const errors = [];

    for (let i = 0; i < this.operations.length; i++) {
      if (showProgress) {
        toast.loading(`Processing ${i + 1}/${this.operations.length}...`);
      }

      try {
        const result = await this.operations[i]();
        results.push(result);
      } catch (error) {
        errors.push({ index: i, error });
        
        if (stopOnError) {
          break;
        }
      }
    }

    if (showProgress) {
      toast.dismiss();
      
      if (errors.length === 0) {
        toast.success(`Successfully processed ${results.length} operations`);
      } else {
        toast.error(`Completed with ${errors.length} errors out of ${this.operations.length} operations`);
      }
    }

    return { results, errors };
  }

  clear() {
    this.operations = [];
  }
}

// Hook for batch operations
export function useBatchFormOperations() {
  const queryClient = useQueryClient();
  const batchRef = useRef(new FormBatchOperations(queryClient));

  return batchRef.current;
}

// Form field validation helpers
export const fieldValidators = {
  email: (value: string) => {
    if (!value) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Please enter a valid email address';
    }
    return true;
  },
  
  phone: (value: string) => {
    if (!value) return true; // Optional field
    if (!/^[+]?[1-9][\d]{0,15}$/.test(value)) {
      return 'Please enter a valid phone number';
    }
    return true;
  },
  
  required: (value: unknown, fieldName: string) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return true;
  },
  
  minLength: (value: string, min: number, fieldName: string) => {
    if (value && value.length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    return true;
  },
  
  maxLength: (value: string, max: number, fieldName: string) => {
    if (value && value.length > max) {
      return `${fieldName} must be less than ${max} characters`;
    }
    return true;
  },
};

export default {
  churchValidationSchema,
  announcementValidationSchema,
  feedbackValidationSchema,
  userValidationSchema,
  useOptimisticForm,
  FormBatchOperations,
  useBatchFormOperations,
  fieldValidators,
};