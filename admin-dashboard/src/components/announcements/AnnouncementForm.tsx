// Announcement form component for creating and editing announcements
import React, { useState } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, AlertCircle } from 'lucide-react';
import type { Announcement, AnnouncementFormData } from '@/types/announcement';
import { ANNOUNCEMENT_CATEGORIES } from '@/types/announcement';
import type { Diocese } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description too long'),
  scope: z.enum(['diocese', 'parish']),
  parishId: z.string().optional(),
  eventDate: z.string().optional(), // Optional for non-event announcements
  eventTime: z.string().optional(), // Optional for non-event announcements
  endTime: z.string().optional(), // New: End time for events
  venue: z.string().optional(), // Optional for non-event announcements
  category: z.string().min(1, 'Type is required'),
  customCategory: z.string().max(100, 'Custom type too long').optional(), // For custom types
  endDate: z.string().optional(), // Optional for non-event announcements
}).refine(
  (data) => {
    // If both dates are provided, validate end date is not before start date
    if (data.eventDate && data.endDate) {
      const startDate = new Date(data.eventDate);
      const endDate = new Date(data.endDate);
      return endDate >= startDate;
    }
    return true;
  },
  {
    message: 'Invalid input format.',
    path: ['endDate'], // Show error on endDate field
  }
);

interface AnnouncementFormProps {
  diocese: Diocese;
  announcement?: Announcement;
  onSubmit: (data: AnnouncementFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  forceParishScope?: boolean; // Force parish scope (for parish secretary)
}

export const AnnouncementForm: React.FC<AnnouncementFormProps> = ({
  diocese,
  announcement,
  onSubmit,
  onCancel,
  isLoading = false,
  forceParishScope = false,
}) => {
  const isEditing = !!announcement;
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Check if the announcement has a custom category (not in predefined list)
  const isCustomCategory = announcement?.category &&
    !ANNOUNCEMENT_CATEGORIES.includes(announcement.category as typeof ANNOUNCEMENT_CATEGORIES[number]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: announcement ? {
      title: announcement.title,
      description: announcement.description,
      scope: announcement.scope,
      parishId: announcement.parishId || '',
      eventDate: announcement.eventDate ? announcement.eventDate.toISOString().split('T')[0] : '',
      eventTime: announcement.eventTime || '',
      endTime: announcement.endTime || '',
      venue: announcement.venue || '',
      category: isCustomCategory ? 'Other' : announcement.category,
      customCategory: isCustomCategory ? announcement.category : '',
      endDate: announcement.endDate ? announcement.endDate.toISOString().split('T')[0] : '',
    } : {
      scope: forceParishScope ? 'parish' : 'diocese',
    },
  });

  const scope = watch('scope');
  const selectedCategory = watch('category');
  const showCustomCategoryInput = selectedCategory === 'Other';

  const handleInvalidSubmit = (errors: FieldErrors<AnnouncementFormData>) => {
    const hasFormatError = Object.values(errors).some((error) => {
      if (!error) return false;
      const message = 'message' in error ? error.message : undefined;
      return typeof message === 'string' && message.toLowerCase().includes('invalid input format');
    });
    setGeneralError(hasFormatError ? 'Invalid input format.' : 'Please fill out all required fields.');
  };

  const handleFormSubmit = async (data: AnnouncementFormData) => {
    try {
      setGeneralError(null);
      console.log('🔍 Form data before submission:', data);

      // Validate form data
      if (!data.category) {
        throw new Error('Please select a type');
      }

      // If "Other" is selected, validate and use custom type
      if (data.category === 'Other') {
        if (!data.customCategory || data.customCategory.trim() === '') {
          throw new Error('Please specify a custom type');
        }
        // Replace category with custom type value
        data.category = data.customCategory.trim();
      }

      // Remove customCategory field before submission
      const { customCategory, ...submitData } = data;

      await onSubmit(submitData);
    } catch (error) {
      console.error('❌ Form submission error:', error);
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      setGeneralError(message);
      // Re-throw to show error to user
      throw error;
    }
  };

  const onSubmitWithValidation = handleSubmit(handleFormSubmit, handleInvalidSubmit);

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {isEditing ? 'Edit Announcement' : 'Create New Announcement'}
        </CardTitle>
        <CardDescription>
          {isEditing 
            ? 'Update the announcement details below.'
            : `Create a new announcement for the ${diocese === 'tagbilaran' ? 'Diocese of Tagbilaran' : 'Diocese of Talibon'}.`
          }
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={onSubmitWithValidation} className="space-y-6">
          {generalError && (
            <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{generalError}</AlertDescription>
            </Alert>
          )}
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Enter announcement title"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe the announcement details"
                rows={4}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
              )}
            </div>

            {/* Hidden field to register the scope value */}
            <input type="hidden" {...register('scope')} value={forceParishScope ? 'parish' : 'diocese'} />

            <div>
              <Label htmlFor="category">Type</Label>
              <Select
                defaultValue={announcement?.category}
                onValueChange={(value) => setValue('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ANNOUNCEMENT_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>
              )}
            </div>

            {/* Custom Category Input - shown when "Other" is selected */}
            {showCustomCategoryInput && (
              <div>
                <Label htmlFor="customCategory">Custom Type</Label>
                <Input
                  id="customCategory"
                  {...register('customCategory')}
                  placeholder="Enter custom type name"
                  className={errors.customCategory ? 'border-red-500' : ''}
                />
                {errors.customCategory && (
                  <p className="text-sm text-red-600 mt-1">{errors.customCategory.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Event Details (Optional for non-event announcements) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Event Details (Optional - fill if this is an event)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="eventDate">Start Date</Label>
                <Input
                  id="eventDate"
                  type="date"
                  {...register('eventDate')}
                  className={errors.eventDate ? 'border-red-500' : ''}
                />
                {errors.eventDate && (
                  <p className="text-sm text-red-600 mt-1">{errors.eventDate.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...register('endDate')}
                  className={errors.endDate ? 'border-red-500' : ''}
                />
                {errors.endDate && (
                  <p className="text-sm text-red-600 mt-1">{errors.endDate.message}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Announcement will be archived after this date
                </p>
              </div>

              <div>
                <Label htmlFor="eventTime">Start Time</Label>
                <Input
                  id="eventTime"
                  type="time"
                  {...register('eventTime')}
                  className={errors.eventTime ? 'border-red-500' : ''}
                />
                {errors.eventTime && (
                  <p className="text-sm text-red-600 mt-1">{errors.eventTime.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  {...register('endTime')}
                  className={errors.endTime ? 'border-red-500' : ''}
                />
                {errors.endTime && (
                  <p className="text-sm text-red-600 mt-1">{errors.endTime.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  {...register('venue')}
                  placeholder="Event venue (optional)"
                  className={errors.venue ? 'border-red-500' : ''}
                />
                {errors.venue && (
                  <p className="text-sm text-red-600 mt-1">{errors.venue.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="btn-heritage">
              {isLoading ? 'Posting...' : isEditing ? 'Update Announcement' : 'Post Announcement'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};