// Enhanced Parish Dashboard Hook with real Firebase integration
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { ParishDataService } from '@/services/parishDataService';
import type { ChurchInfo, FileUpload, AnnouncementItem } from '@/components/parish/types';

interface UseParishDashboardReturn {
  // Church Profile
  churchInfo: ChurchInfo | null;
  isLoading: boolean;
  hasExistingChurch: boolean;
  
  // Files
  files: FileUpload[];
  isUploadingFile: boolean;
  
  // Announcements
  announcements: AnnouncementItem[];
  
  // Actions
  saveChurchProfile: (churchInfo: ChurchInfo) => Promise<void>;
  uploadFile: (file: File, category: 'photos' | 'documents' | '360') => Promise<void>;
  deleteFile: (fileId: string, filePath: string) => Promise<void>;
  createAnnouncement: (announcement: Omit<AnnouncementItem, 'id'>) => Promise<void>;
  submitForReview: (notes?: string) => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Status
  error: string | null;
  lastSaved: Date | null;
}

export const useParishDashboard = (): UseParishDashboardReturn => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  // State
  const [churchInfo, setChurchInfo] = useState<ChurchInfo | null>(null);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const parishId = userProfile?.parish || userProfile?.uid || '';
  const hasExistingChurch = churchInfo !== null;

  // Load initial data
  const loadChurchData = useCallback(async () => {
    if (!parishId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Load church profile
      const profile = await ParishDataService.getChurchProfile(parishId);
      setChurchInfo(profile);
      
      // Load files if church exists
      if (profile) {
        const [parishFiles, parishAnnouncements] = await Promise.all([
          ParishDataService.getParishFiles(parishId),
          ParishDataService.getParishAnnouncements(parishId)
        ]);
        
        setFiles(parishFiles);
        setAnnouncements(parishAnnouncements);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load parish data';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [parishId, toast]);

  // Save church profile
  const saveChurchProfile = useCallback(async (updatedChurchInfo: ChurchInfo) => {
    if (!parishId || !userProfile?.uid) return;
    
    try {
      setError(null);
      
      if (hasExistingChurch) {
        await ParishDataService.updateChurchProfile(parishId, updatedChurchInfo);
      } else {
        await ParishDataService.saveChurchProfile(parishId, updatedChurchInfo, userProfile.uid);
      }
      
      setChurchInfo(updatedChurchInfo);
      setLastSaved(new Date());
      
      toast({
        title: "Success",
        description: "Church profile saved successfully",
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save church profile';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw err; // Re-throw to allow component to handle
    }
  }, [parishId, userProfile?.uid, hasExistingChurch, toast]);

  // Upload file
  const uploadFile = useCallback(async (file: File, category: 'photos' | 'documents' | '360') => {
    if (!parishId || !userProfile?.uid) return;
    
    try {
      setIsUploadingFile(true);
      setError(null);
      
      const uploadedFile = await ParishDataService.uploadFile(file, parishId, category, userProfile.uid);
      setFiles(prev => [uploadedFile, ...prev]);
      
      toast({
        title: "Success",
        description: `${category === '360' ? '360° image' : file.name} uploaded successfully`,
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload file';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    } finally {
      setIsUploadingFile(false);
    }
  }, [parishId, userProfile?.uid, toast]);

  // Delete file
  const deleteFile = useCallback(async (fileId: string, filePath: string) => {
    try {
      setError(null);
      
      await ParishDataService.deleteFile(fileId, filePath);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    }
  }, [toast]);

  // Create announcement
  const createAnnouncement = useCallback(async (announcement: Omit<AnnouncementItem, 'id'>) => {
    if (!parishId || !userProfile?.uid) return;
    
    try {
      setError(null);
      
      const announcementId = await ParishDataService.createAnnouncement(parishId, announcement, userProfile.uid);
      
      const newAnnouncement: AnnouncementItem = {
        ...announcement,
        id: announcementId,
      };
      
      setAnnouncements(prev => [newAnnouncement, ...prev]);
      
      toast({
        title: "Success",
        description: "Announcement created successfully",
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create announcement';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    }
  }, [parishId, userProfile?.uid, toast]);

  // Submit for review
  const submitForReview = useCallback(async (notes?: string) => {
    if (!parishId) return;
    
    try {
      setError(null);
      
      await ParishDataService.submitForReview(parishId, notes);
      
      // Update local church info
      if (churchInfo) {
        setChurchInfo({
          ...churchInfo,
          status: 'pending'
        });
      }
      
      toast({
        title: "Success",
        description: "Church profile submitted for review",
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit for review';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    }
  }, [parishId, churchInfo, toast]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await loadChurchData();
  }, [loadChurchData]);

  // Set up real-time listeners
  useEffect(() => {
    if (!parishId) return;
    
    const unsubscribe = ParishDataService.subscribeToChurchProfile(parishId, (updatedChurch) => {
      setChurchInfo(updatedChurch);
    });
    
    return unsubscribe;
  }, [parishId]);

  // Initial load
  useEffect(() => {
    loadChurchData();
  }, [loadChurchData]);

  return {
    // Data
    churchInfo,
    isLoading,
    hasExistingChurch,
    files,
    isUploadingFile,
    announcements,
    
    // Actions
    saveChurchProfile,
    uploadFile,
    deleteFile,
    createAnnouncement,
    submitForReview,
    refreshData,
    
    // Status
    error,
    lastSaved,
  };
};
