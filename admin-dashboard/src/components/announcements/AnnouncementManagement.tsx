// Main announcement management component for chancery dashboards
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AnnouncementService } from '@/services/announcementService';
import { AnnouncementList } from './AnnouncementList';
import { AnnouncementForm } from './AnnouncementForm';
import { AnnouncementDetailDialog } from './AnnouncementDetailDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent as AlertContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as AlertTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2 } from 'lucide-react';
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
  const [detailAnnouncement, setDetailAnnouncement] = useState<Announcement | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailReturnMeta, setDetailReturnMeta] = useState<{ id: string } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<{ id: string; title: string } | null>(null);

  // Load active announcements
  const loadAnnouncements = React.useCallback(async () => {
    try {
      setIsLoading(true);

      // First, auto-archive past events
      const archivedCount = await AnnouncementService.autoArchivePastEvents(diocese);

      if (archivedCount > 0) {
        toast({
          title: "Auto-Archive",
          description: `${archivedCount} past event${archivedCount > 1 ? 's' : ''} automatically archived`,
        });
      }

      // Then load current announcements - filter by creator to show only user's own announcements
      const data = await AnnouncementService.getAnnouncements(diocese, {
        isArchived: false,
        createdBy: userProfile?.uid,
      });
      setAnnouncements(data);
    } catch (error) {
      console.error('Error loading announcements:', error);
      toast({
        title: "Error",
        description: "Failed to load announcements",
        variant: "destructive",
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
    setDetailAnnouncement(null);
    setIsDetailOpen(false);
    setDetailReturnMeta(null);
    setSelectedAnnouncement(null);
    setIsFormOpen(true);
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    if (detailAnnouncement && detailAnnouncement.id === announcement.id) {
      setDetailReturnMeta({ id: announcement.id });
    } else {
      setDetailReturnMeta(null);
    }
    setIsDetailOpen(false);
    setIsFormOpen(true);
  };

  const handleViewAnnouncement = (announcement: Announcement) => {
    setDetailAnnouncement(announcement);
    setIsDetailOpen(true);
    setDetailReturnMeta(null);
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
          description: "Announcement updated successfully."
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
          description: "Announcement successfully published."
        });
      }

      setIsFormOpen(false);
      setSelectedAnnouncement(null);
      await loadAnnouncements();
      // Also refresh archived list if we're on that tab or if we just updated an archived announcement
      if (activeTab === 'archived' || selectedAnnouncement?.isArchived) {
        await loadArchivedAnnouncements();
      }
      if (detailReturnMeta) {
        const refreshedList = await AnnouncementService.getAnnouncements(diocese, {
          createdBy: userProfile.uid,
        });
        const refreshedAnnouncement = refreshedList.find((item) => item.id === detailReturnMeta.id);
        if (refreshedAnnouncement) {
          setDetailAnnouncement(refreshedAnnouncement);
          setIsDetailOpen(true);
        } else {
          setDetailAnnouncement(null);
          setIsDetailOpen(false);
        }
        setDetailReturnMeta(null);
      }
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
        description: "Announcement archived successfully."
      });
      // Refresh both lists to keep them in sync
      await loadAnnouncements();
      await loadArchivedAnnouncements();
      setIsDetailOpen(false);
      setDetailAnnouncement(null);
      setDetailReturnMeta(null);
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
      setIsDetailOpen(false);
      setDetailAnnouncement(null);
      setDetailReturnMeta(null);
    } catch (error) {
      console.error('Error unarchiving announcement:', error);
      toast({
        title: "Error",
        description: "Failed to restore announcement",
        variant: "destructive"
      });
    }
  };

  // Opens delete confirmation dialog
  const handleDeleteClick = (id: string, title: string) => {
    setAnnouncementToDelete({ id, title });
    setDeleteDialogOpen(true);
  };

  // Executes the delete after confirmation
  const handleConfirmDelete = async () => {
    if (!announcementToDelete) return;
    
    try {
      await AnnouncementService.deleteAnnouncement(announcementToDelete.id);
      toast({
        title: "Deleted",
        description: "Announcement deleted permanently"
      });
      await loadArchivedAnnouncements();
      setIsDetailOpen(false);
      setDetailAnnouncement(null);
      setDetailReturnMeta(null);
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast({
        title: "Error",
        description: "Failed to delete announcement",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setAnnouncementToDelete(null);
    }
  };

  // Legacy handler for components that pass the id directly
  const handleDeleteAnnouncement = (id: string) => {
    // Find the announcement title for the dialog
    const announcement = [...announcements, ...archivedAnnouncements].find(a => a.id === id);
    handleDeleteClick(id, announcement?.title || 'this announcement');
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setSelectedAnnouncement(null);
    if (detailReturnMeta) {
      const combined = [...announcements, ...archivedAnnouncements];
      const original = combined.find((item) => item.id === detailReturnMeta.id);
      if (original) {
        setDetailAnnouncement(original);
        setIsDetailOpen(true);
      }
      setDetailReturnMeta(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Announcements</h2>
          {diocese && (
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage announcements for {diocese === 'tagbilaran' ? 'Tagbilaran' : 'Talibon'} Diocese
            </p>
          )}
        </div>
        <Button onClick={handleCreateAnnouncement} className="btn-heritage w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">New Announcement</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      {/* Tabs for Active vs Archived */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'active' | 'archived')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-auto">
          <TabsTrigger value="active" className="text-xs sm:text-sm py-2">
            Active {announcements.length > 0 && `(${announcements.length})`}
          </TabsTrigger>
          <TabsTrigger value="archived" className="text-xs sm:text-sm py-2">
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
            onCreate={handleCreateAnnouncement}
            onView={handleViewAnnouncement}
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
            onView={handleViewAnnouncement}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto w-[calc(100%-1rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
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

      <AnnouncementDetailDialog
        announcement={detailAnnouncement}
        isOpen={isDetailOpen && !!detailAnnouncement}
        onClose={() => {
          setIsDetailOpen(false);
          setDetailAnnouncement(null);
          setDetailReturnMeta(null);
        }}
        onEdit={handleEditAnnouncement}
        onArchive={(announcement) => handleArchiveAnnouncement(announcement.id)}
        onUnarchive={(announcement) => handleUnarchiveAnnouncement(announcement.id)}
        onDelete={(announcement) => handleDeleteAnnouncement(announcement.id)}
      />

      {/* Delete Announcement Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertContent className="bg-white border shadow-lg">
          <AlertDialogHeader>
            <AlertTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Delete Announcement?
            </AlertTitle>
            <AlertDialogDescription className="text-left">
              {announcementToDelete && (
                <>
                  You are about to permanently delete <strong className="text-foreground">"{announcementToDelete.title}"</strong>.
                  <br /><br />
                  This action cannot be undone. The announcement will be permanently removed.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertContent>
      </AlertDialog>
    </div>
  );
};