// Main announcement management component for chancery dashboards
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AnnouncementService } from '@/services/announcementService';
import { AnnouncementList } from './AnnouncementList';
import { AnnouncementForm } from './AnnouncementForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Plus } from 'lucide-react';
import type { Announcement, AnnouncementFormData } from '@/types/announcement';
import type { Diocese } from '@/contexts/AuthContext';

interface AnnouncementManagementProps {
  diocese: Diocese;
}

export const AnnouncementManagement: React.FC<AnnouncementManagementProps> = ({ diocese }) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [archivedAnnouncements, setArchivedAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load active announcements
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

      // Then load current announcements - filter by creator to show only user's own announcements
      const data = await AnnouncementService.getAnnouncements(diocese, {
        isArchived: false,
        createdBy: userProfile?.uid // Only show announcements created by this user
      });
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
  }, [diocese, userProfile?.uid, toast]);

  // Load archived announcements
  const loadArchivedAnnouncements = React.useCallback(async () => {
    try {
      setIsLoadingArchived(true);
      // Filter by creator to show only user's own archived announcements
      const data = await AnnouncementService.getAnnouncements(diocese, {
        isArchived: true,
        createdBy: userProfile?.uid // Only show announcements created by this user
      });
      setArchivedAnnouncements(data);
    } catch (error) {
      console.error('Error loading archived announcements:', error);
      toast({
        title: "Error",
        description: "Failed to load archived announcements",
        variant: "destructive"
      });
    } finally {
      setIsLoadingArchived(false);
    }
  }, [diocese, userProfile?.uid, toast]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  // Load archived announcements when tab is switched
  useEffect(() => {
    if (activeTab === 'archived' && archivedAnnouncements.length === 0) {
      loadArchivedAnnouncements();
    }
  }, [activeTab, archivedAnnouncements.length, loadArchivedAnnouncements]);

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
        title: "Archived",
        description: "Announcement moved to archive"
      });
      // Refresh both lists to keep them in sync
      await loadAnnouncements();
      await loadArchivedAnnouncements();
    } catch (error) {
      console.error('Error archiving announcement:', error);
      toast({
        title: "Error",
        description: "Failed to archive announcement",
        variant: "destructive"
      });
    }
  };

  const handleUnarchiveAnnouncement = async (id: string) => {
    try {
      await AnnouncementService.unarchiveAnnouncement(id);
      toast({
        title: "Restored",
        description: "Announcement moved to active list"
      });
      await loadAnnouncements();
      await loadArchivedAnnouncements();
    } catch (error) {
      console.error('Error unarchiving announcement:', error);
      toast({
        title: "Error",
        description: "Failed to restore announcement",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await AnnouncementService.deleteAnnouncement(id);
      toast({
        title: "Deleted",
        description: "Announcement permanently deleted"
      });
      // Refresh both lists to keep them in sync
      await loadAnnouncements();
      await loadArchivedAnnouncements();
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Announcements</h2>
          {diocese && (
            <p className="text-muted-foreground">
              Manage announcements for the {diocese === 'tagbilaran' ? 'Diocese of Tagbilaran' : 'Diocese of Talibon'}
            </p>
          )}
        </div>
        <Button onClick={handleCreateAnnouncement} className="btn-heritage">
          <Plus className="w-4 h-4 mr-2" />
          New Announcement
        </Button>
      </div>

      {/* Tabs for Active vs Archived */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'active' | 'archived')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="active">
            Active {announcements.length > 0 && `(${announcements.length})`}
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived {archivedAnnouncements.length > 0 && `(${archivedAnnouncements.length})`}
          </TabsTrigger>
        </TabsList>

        {/* Active Announcements Tab */}
        <TabsContent value="active" className="space-y-4">
          <AnnouncementList
            announcements={announcements}
            diocese={diocese}
            isLoading={isLoading}
            onEdit={handleEditAnnouncement}
            onArchive={handleArchiveAnnouncement}
            onDelete={handleDeleteAnnouncement}
            onCreate={handleCreateAnnouncement}
            showHeader={false}
          />
        </TabsContent>

        {/* Archived Announcements Tab */}
        <TabsContent value="archived" className="space-y-4">
          <AnnouncementList
            announcements={archivedAnnouncements}
            diocese={diocese}
            isLoading={isLoadingArchived}
            onEdit={handleEditAnnouncement}
            onArchive={handleUnarchiveAnnouncement}
            onDelete={handleDeleteAnnouncement}
            showHeader={false}
            isArchivedView={true}
          />
        </TabsContent>
      </Tabs>

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