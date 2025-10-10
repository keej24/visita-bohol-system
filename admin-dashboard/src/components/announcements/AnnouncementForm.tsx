// Announcement form component for creating and editing announcements
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Phone } from 'lucide-react';
import type { Announcement, AnnouncementFormData } from '@/types/announcement';
import { ANNOUNCEMENT_CATEGORIES } from '@/types/announcement';
import type { Diocese } from '@/contexts/AuthContext';

const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description too long'),
  scope: z.enum(['diocese', 'parish']),
  parishId: z.string().optional(),
  eventDate: z.string().optional(), // Optional for non-event announcements
  eventTime: z.string().optional(), // Optional for non-event announcements
  endTime: z.string().optional(), // New: End time for events
  venue: z.string().optional(), // Optional for non-event announcements
  category: z.string().min(1, 'Category is required'),
  endDate: z.string().optional(), // Optional for non-event announcements
  contactInfo: z.string().max(200, 'Contact info too long').optional(),
});

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
      category: announcement.category,
      endDate: announcement.endDate ? announcement.endDate.toISOString().split('T')[0] : '',
      contactInfo: announcement.contactInfo || '',
    } : {
      scope: forceParishScope ? 'parish' : 'diocese',
    },
  });

  const scope = watch('scope');

  const handleFormSubmit = async (data: AnnouncementFormData) => {
    try {
      console.log('🔍 Form data before submission:', data);
      
      // Validate form data
      if (!data.category) {
        throw new Error('Please select a category');
      }
      
      await onSubmit(data);
    } catch (error) {
      console.error('❌ Form submission error:', error);
      // Don't re-throw here, let the parent component handle it
    }
  };

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
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
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
              <Label htmlFor="category">Category</Label>
              <Select 
                defaultValue={announcement?.category}
                onValueChange={(value) => setValue('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
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

          {/* Contact Information */}
          <div>
            <Label htmlFor="contactInfo" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contact Information
            </Label>
            <Input
              id="contactInfo"
              {...register('contactInfo')}
              placeholder="Contact person or phone number (optional)"
            />
          </div>


          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="btn-heritage">
              {isLoading ? 'Saving...' : isEditing ? 'Update Announcement' : 'Create Announcement'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
