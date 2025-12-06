import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AnnouncementService } from '@/services/announcementService';
import { AnnouncementList } from '@/components/announcements/AnnouncementList';
import { AnnouncementForm } from '@/components/announcements/AnnouncementForm';
import { AnnouncementDetailDialog } from '@/components/announcements/AnnouncementDetailDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Calendar, Bell, ArrowLeft } from 'lucide-react';
import type { Announcement, AnnouncementFormData } from '@/types/announcement';

interface ParishAnnouncementsProps {
  churchId: string;
  onClose: () => void;
}

export const ParishAnnouncements: React.FC<ParishAnnouncementsProps> = ({
  churchId,
  onClose
}) => {
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

  // Load parish announcements
  const loadAnnouncements = React.useCallback(async () => {
    if (!userProfile?.diocese) return;

    try {
      setIsLoading(true);
      console.log('🔍 [PARISH ANNOUNCEMENTS] Loading announcements for:', {
        churchId,
        diocese: userProfile.diocese,
        userId: userProfile.uid
      });

      // Auto-archive past events
      const archivedCount = await AnnouncementService.autoArchivePastEvents(userProfile.diocese);

      if (archivedCount > 0) {
        toast({
          title: "Auto-Archive",
          description: `${archivedCount} past event${archivedCount > 1 ? 's' : ''} automatically archived`,
        });
      }

      // Load current parish announcements - only show announcements created by this user
      const data = await AnnouncementService.getAnnouncements(userProfile.diocese, {
        isArchived: false,
        scope: 'parish',
        createdBy: userProfile.uid // Only show announcements created by this user
      });

      console.log('📋 [PARISH ANNOUNCEMENTS] Fetched announcements:', {
        total: data.length,
        parishIds: data.map(a => ({ id: a.id, parishId: a.parishId, title: a.title })),
        filteringFor: churchId
      });

      // Filter to only this parish's announcements (additional client-side filter for safety)
      const parishAnnouncements = data.filter(announcement =>
        announcement.parishId === churchId
      );

      console.log('✅ [PARISH ANNOUNCEMENTS] After filter:', parishAnnouncements.length);

      setAnnouncements(parishAnnouncements);
    } catch (error) {
      console.error('Error loading parish announcements:', error);
      toast({
        title: "Error",
        description: "Failed to load announcements",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [userProfile?.diocese, userProfile?.uid, churchId, toast]);

  // Load archived parish announcements
  const loadArchivedAnnouncements = React.useCallback(async () => {
    if (!userProfile?.diocese) return;

    try {
      setIsLoadingArchived(true);

      // Load archived parish announcements - only show announcements created by this user
      const data = await AnnouncementService.getAnnouncements(userProfile.diocese, {
        isArchived: true,
        scope: 'parish',
        createdBy: userProfile.uid // Only show announcements created by this user
      });

      // Filter to only this parish's announcements (additional client-side filter for safety)
      const parishAnnouncements = data.filter(announcement =>
        announcement.parishId === churchId
      );

      setArchivedAnnouncements(parishAnnouncements);
    } catch (error) {
      console.error('Error loading archived parish announcements:', error);
      toast({
        title: "Error",
        description: "Failed to load archived announcements",
        variant: "destructive"
      });
    } finally {
      setIsLoadingArchived(false);
    }
  }, [userProfile?.diocese, userProfile?.uid, churchId, toast]);

  // Track if archived tab has been visited
  const [hasLoadedArchived, setHasLoadedArchived] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  // Lazy load archived announcements when tab is first accessed
  useEffect(() => {
    if (activeTab === 'archived' && !hasLoadedArchived) {
      loadArchivedAnnouncements();
      setHasLoadedArchived(true);
    }
  }, [activeTab, hasLoadedArchived, loadArchivedAnnouncements]);

  // Handle view announcement
  const handleViewAnnouncement = (announcement: Announcement) => {
    setDetailAnnouncement(announcement);
    setIsDetailOpen(true);
    setDetailReturnMeta(null);
  };

  // Handle edit announcement
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

  // Handle form submission
  const handleSubmit = async (formData: AnnouncementFormData) => {
    if (!userProfile) return;

    setIsSubmitting(true);
    try {
      // Force parish scope and set parishId
      const parishFormData: AnnouncementFormData = {
        ...formData,
        scope: 'parish',
        parishId: churchId
      };

      if (selectedAnnouncement) {
        await AnnouncementService.updateAnnouncement(selectedAnnouncement.id, parishFormData, userProfile.diocese, userProfile.uid);
        toast({
          title: "Success",
          description: "Announcement updated successfully."
        });
      } else {
        await AnnouncementService.createAnnouncement(parishFormData, userProfile.diocese, userProfile.uid);
        toast({
          title: "Success",
          description: "Announcement successfully published."
        });
      }

      setIsFormOpen(false);
      setSelectedAnnouncement(null);
      await loadAnnouncements();
      
      // If edit was triggered from detail view, reopen detail dialog
      if (detailReturnMeta) {
        const refreshedList = await AnnouncementService.getAnnouncements(userProfile.diocese, {
          createdBy: userProfile.uid,
          scope: 'parish'
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
      console.error('Error saving announcement:', error);
      toast({
        title: "Error",
        description: "Failed to save announcement",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle archive
  const handleArchive = async (announcementId: string) => {
    try {
      await AnnouncementService.archiveAnnouncement(announcementId);
      toast({
        title: "Success",
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

  // Handle unarchive
  const handleUnarchive = async (announcementId: string) => {
    try {
      await AnnouncementService.unarchiveAnnouncement(announcementId);
      toast({
        title: "Success",
        description: "Announcement restored successfully"
      });
      // Refresh both lists to keep them in sync
      await loadAnnouncements();
      await loadArchivedAnnouncements();
      setIsDetailOpen(false);
      setDetailAnnouncement(null);
      setDetailReturnMeta(null);
    } catch (error) {
      console.error('Error restoring announcement:', error);
      toast({
        title: "Error",
        description: "Failed to restore announcement",
        variant: "destructive"
      });
    }
  };

  // Handle delete
  const handleDelete = async (announcementId: string) => {
    try {
      await AnnouncementService.deleteAnnouncement(announcementId);
      toast({
        title: "Deleted",
        description: "Announcement deleted permanently"
      });
      // Refresh archived list
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
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-6 h-6 text-blue-600" />
              Parish Announcements
            </h1>
            <p className="text-gray-600">Manage announcements and events for your parish</p>
          </div>
        </div>
        <Button
          onClick={() => {
            setSelectedAnnouncement(null);
            setDetailAnnouncement(null);
            setIsDetailOpen(false);
            setDetailReturnMeta(null);
            setIsFormOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Announcement
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{announcements.length}</div>
            <p className="text-xs text-gray-500">Currently published</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {announcements.filter(a => {
                const eventDate = new Date(a.eventDate);
                const now = new Date();
                return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
              }).length}
            </div>
            <p className="text-xs text-gray-500">Events this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Archived</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{archivedAnnouncements.length}</div>
            <p className="text-xs text-gray-500">Past events</p>
          </CardContent>
        </Card>
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
          <Card>
            <CardContent className="pt-6">
              <AnnouncementList
                announcements={announcements}
                isLoading={isLoading}
                onEdit={handleEditAnnouncement}
                onArchive={handleArchive}
                onView={handleViewAnnouncement}
                onCreate={() => setIsFormOpen(true)}
                showScope={false}
                showHeader={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Archived Announcements Tab */}
        <TabsContent value="archived" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <AnnouncementList
                announcements={archivedAnnouncements}
                isLoading={isLoadingArchived}
                onEdit={handleEditAnnouncement}
                onArchive={handleUnarchive}
                onDelete={handleDelete}
                onView={handleViewAnnouncement}
                onCreate={() => setIsFormOpen(true)}
                showScope={false}
                showHeader={false}
                isArchivedView={true}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
            </DialogTitle>
          </DialogHeader>
          <AnnouncementForm
            diocese={userProfile?.diocese || 'tagbilaran'}
            announcement={selectedAnnouncement}
            onSubmit={handleSubmit}
            onCancel={() => {
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
            }}
            isLoading={isSubmitting}
            forceParishScope={true}
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
        onArchive={(announcement) => handleArchive(announcement.id)}
        onUnarchive={(announcement) => handleUnarchive(announcement.id)}
        onDelete={(announcement) => handleDelete(announcement.id)}
      />
    </div>
  );
};