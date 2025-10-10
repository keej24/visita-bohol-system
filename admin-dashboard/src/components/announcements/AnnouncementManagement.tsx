// Main announcement management component for chancery dashboards
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AnnouncementService } from '@/services/announcementService';
import { AnnouncementList } from './AnnouncementList';
import { AnnouncementForm } from './AnnouncementForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import type { Announcement, AnnouncementFormData } from '@/types/announcement';
import type { Diocese } from '@/hooks/useAuth';

interface AnnouncementManagementProps {
  diocese: Diocese;
}

export const AnnouncementManagement: React.FC<AnnouncementManagementProps> = ({ diocese }) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load announcements
  const loadAnnouncements = React.useCallback(async () => {
    try {
      setIsLoading(true);

      // First, auto-archive past events
      const archivedCount = await AnnouncementService.autoArchivePastEvents(diocese);

      // Show notification if events were auto-archived
      if (archivedCount > 0) {
        toast({
          title: "Auto-Archive",
          description: `${archivedCount} past event${archivedCount > 1 ? 's' : ''} automatically archived`,
        });
      }

      // Then load current announcements
      const data = await AnnouncementService.getAnnouncements(diocese, { isArchived: false });
      setAnnouncements(data);
    } catch (error) {
      console.error('Error loading announcements:', error);
      toast({
        title: "Error",
        description: "Failed to load announcements",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [diocese, toast]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const handleCreateAnnouncement = () => {
    setSelectedAnnouncement(null);
    setIsFormOpen(true);
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (formData: AnnouncementFormData) => {
    console.log('📝 Form submitted with data:', formData);
    console.log('👤 Current user profile:', userProfile);
    console.log('🏛️ Target diocese:', diocese);

    if (!userProfile) {
      console.error('❌ No user profile found');
      toast({
        title: "Error",
        description: "User not authenticated. Please refresh and try again.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);

      if (selectedAnnouncement) {
        // Update existing announcement
        console.log('🔄 Updating announcement:', selectedAnnouncement.id);
        await AnnouncementService.updateAnnouncement(
          selectedAnnouncement.id,
          formData,
          diocese,
          userProfile.uid
        );
        toast({
          title: "Success",
          description: "Announcement updated successfully"
        });
      } else {
        // Create new announcement
        console.log('➕ Creating new announcement');
        await AnnouncementService.createAnnouncement(
          formData,
          diocese,
          userProfile.uid
        );
        toast({
          title: "Success",
          description: "Announcement created successfully"
        });
      }

      setIsFormOpen(false);
      setSelectedAnnouncement(null);
      await loadAnnouncements();
    } catch (error) {
      console.error('❌ Error saving announcement:', error);

      // Show specific error message if available
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Error message:', errorMessage);

      toast({
        title: "Error",
        description: errorMessage || (selectedAnnouncement ? 'Failed to update announcement' : 'Failed to create announcement'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveAnnouncement = async (id: string) => {
    try {
      await AnnouncementService.archiveAnnouncement(id);
      toast({
        title: "Success",
        description: "Announcement archived successfully"
      });
      await loadAnnouncements();
    } catch (error) {
      console.error('Error archiving announcement:', error);
      toast({
        title: "Error",
        description: "Failed to archive announcement",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await AnnouncementService.deleteAnnouncement(id);
      toast({
        title: "Success",
        description: "Announcement deleted successfully"
      });
      await loadAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast({
        title: "Error",
        description: "Failed to delete announcement",
        variant: "destructive"
      });
    }
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setSelectedAnnouncement(null);
  };

  const handleAutoArchive = async () => {
    try {
      const archivedCount = await AnnouncementService.autoArchivePastEvents(diocese);
      if (archivedCount > 0) {
        toast({
          title: "Success",
          description: `${archivedCount} past event${archivedCount > 1 ? 's' : ''} archived successfully`,
        });
        await loadAnnouncements();
      } else {
        toast({
          title: "Info",
          description: "No past events found to archive",
        });
      }
    } catch (error) {
      console.error('Error auto-archiving:', error);
      toast({
        title: "Error",
        description: "Failed to archive past events",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <AnnouncementList
        announcements={announcements}
        diocese={diocese}
        isLoading={isLoading}
        onEdit={handleEditAnnouncement}
        onArchive={handleArchiveAnnouncement}
        onDelete={handleDeleteAnnouncement}
        onCreate={handleCreateAnnouncement}
        onAutoArchive={handleAutoArchive}
      />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
            </DialogTitle>
          </DialogHeader>
          <AnnouncementForm
            diocese={diocese}
            announcement={selectedAnnouncement || undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

