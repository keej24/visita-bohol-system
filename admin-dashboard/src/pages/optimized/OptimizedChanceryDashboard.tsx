import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DashboardHeader } from '@/components/optimized/DashboardHeader';
import { StatsGrid } from '@/components/optimized/StatsGrid';
import { ChanceryReviewList } from '@/components/ChanceryReviewList';
import { ChurchDetailModal } from '@/components/ChurchDetailModal';
import { useAuth } from '@/contexts/AuthContext';
import { useChurchStats } from '@/hooks/useChurchStats';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import type { Diocese } from '@/contexts/AuthContext';
import type { Church } from '@/lib/churches';
import { ChurchInfo } from '@/components/parish/types';
import { ChurchService } from '@/services/churchService';
import type { ArchitecturalStyle, ChurchClassification, ReligiousClassification } from '@/types/church';

interface OptimizedChanceryDashboardProps {
  diocese: Diocese;
}

export const OptimizedChanceryDashboard = React.memo<OptimizedChanceryDashboardProps>(({ diocese }) => {
  const { userProfile } = useAuth();
  const churchStats = useChurchStats(diocese);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Modal state
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleViewChurch = (church: Church) => {
    setSelectedChurch(church);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleEditChurch = (church: Church) => {
    setSelectedChurch(church);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedChurch(null);
  };

  const handleSaveChurch = async (data: ChurchInfo) => {
    if (!selectedChurch || !userProfile) return;

    setIsSubmitting(true);
    try {
      // Convert ChurchInfo to ChurchFormData format and update
      const formData = convertChurchInfoToFormData(data);
      await ChurchService.updateChurch(
        selectedChurch.id,
        formData,
        userProfile.diocese,
        userProfile.uid
      );

      toast({
        title: "Success",
        description: "Church information saved successfully!"
      });

      // Invalidate all church queries to update all dashboards
      await queryClient.invalidateQueries({ queryKey: ['churches'] });
    } catch (error) {
      console.error('Error saving church:', error);
      toast({
        title: "Error",
        description: "Failed to save church information",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitChurch = async (data: ChurchInfo) => {
    if (!selectedChurch || !userProfile) return;

    setIsSubmitting(true);
    try {
      const formData = convertChurchInfoToFormData(data);
      await ChurchService.updateChurch(
        selectedChurch.id,
        formData,
        userProfile.diocese,
        userProfile.uid
      );

      toast({
        title: "Success",
        description: "Church information updated successfully!"
      });

      // Invalidate all church queries to update all dashboards
      await queryClient.invalidateQueries({ queryKey: ['churches'] });

      setIsModalOpen(false);
      setSelectedChurch(null);
    } catch (error) {
      console.error('Error updating church:', error);
      toast({
        title: "Error",
        description: "Failed to update church information",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to convert ChurchInfo to ChurchFormData
  const convertChurchInfoToFormData = (data: ChurchInfo) => {
    // Helper function to map architectural style from display to database format
    const mapArchitecturalStyle = (style: string): ArchitecturalStyle => {
      const styleMap: Record<string, ArchitecturalStyle> = {
        'Baroque': 'baroque',
        'Neo-Gothic': 'gothic',
        'Gothic': 'gothic',
        'Byzantine': 'romanesque',
        'Modern': 'modern',
        'Mixed': 'mixed'
      };
      return styleMap[style] || 'other';
    };

    return {
      name: data.churchName || '',
      fullName: data.parishName || data.churchName || '',
      location: `${data.locationDetails.streetAddress || ''}, ${data.locationDetails.barangay || ''}, ${data.locationDetails.municipality || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, ''),
      municipality: data.locationDetails.municipality || '',
      foundingYear: parseInt(data.historicalDetails.foundingYear) || new Date().getFullYear(),
      founders: data.historicalDetails.founders || '',
      keyFigures: [],
      architecturalStyle: mapArchitecturalStyle(data.historicalDetails.architecturalStyle || 'Other'),
      historicalBackground: data.historicalDetails.historicalBackground || '',
      description: data.historicalDetails.historicalBackground || '',
      classification: (data.historicalDetails.heritageClassification === 'National Cultural Treasures' ? 'NCT' :
                    data.historicalDetails.heritageClassification === 'Important Cultural Properties' ? 'ICP' : 'non_heritage') as ChurchClassification,
      religiousClassification: (
        data.historicalDetails.religiousClassification === 'None' ? 'none' :
        data.historicalDetails.religiousClassification === 'Diocesan Shrine' ? 'diocesan_shrine' :
        data.historicalDetails.religiousClassification === 'Jubilee Church' ? 'jubilee_church' :
        data.historicalDetails.religiousClassification === 'Papal Basilica Affinity' ? 'papal_basilica_affinity' :
        'none'
      ) as ReligiousClassification,
      assignedPriest: data.currentParishPriest || '',
      massSchedules: (data.massSchedules || []).map(schedule => ({
        day: schedule.day || '',
        time: schedule.endTime ? `${schedule.time} - ${schedule.endTime}` : schedule.time,
        type: schedule.isFbLive ? `${schedule.language || 'Filipino'} (FB Live)` : (schedule.language || 'Filipino')
      })),
      coordinates: data.coordinates && (data.coordinates.lat !== 0 || data.coordinates.lng !== 0) ? {
        latitude: data.coordinates.lat,
        longitude: data.coordinates.lng
      } : undefined,
      contactInfo: {
        phone: data.contactInfo?.phone || '',
        email: data.contactInfo?.email || '',
        address: `${data.locationDetails.streetAddress || ''}, ${data.locationDetails.barangay || ''}, ${data.locationDetails.municipality || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, ''),
        website: data.contactInfo?.website || '',
        facebookPage: data.contactInfo?.facebookPage || ''
      },
      images: (data.photos || []).map(photo => photo.url || '').filter(url => url !== ''),
      documents: (data.documents || []).map(doc => doc.url || '').filter(url => url !== ''),
      virtualTour360: (data.virtual360Images || []).map(img => img.url).filter(url => url !== ''),
      culturalSignificance: data.historicalDetails.majorHistoricalEvents || '',
      preservationHistory: '',
      restorationHistory: '',
      architecturalFeatures: data.historicalDetails.architecturalFeatures || '',
      heritageInformation: data.historicalDetails.heritageInformation || '',
      tags: [],
      category: 'parish_church'
    };
  };

  return (
    <Layout>
      {churchStats.isLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <div className="space-y-2">
              <p className="text-lg font-semibold text-foreground">Loading Dashboard...</p>
              <p className="text-sm text-muted-foreground">Please wait while we fetch your data</p>
            </div>
          </div>
        </div>
      ) : (
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Diocese Header */}
        <ErrorBoundary>
          <DashboardHeader diocese={diocese} userProfile={userProfile} />
        </ErrorBoundary>

        {/* Key Statistics */}
        <ErrorBoundary>
          <StatsGrid stats={churchStats} />
        </ErrorBoundary>

        {/* Main Content - Dashboard Overview */}
        <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pending Reviews - Takes up more space on larger screens */}
              <div className="lg:col-span-2">
                <ErrorBoundary>
                  <ChanceryReviewList
                    diocese={diocese}
                    onViewChurch={handleViewChurch}
                    onEditChurch={handleEditChurch}
                  />
                </ErrorBoundary>
              </div>

              {/* Info Panel */}
              <div className="space-y-4">
                {/* Status Summary */}
                {churchStats.pendingCount > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h3 className="font-semibold text-orange-900 mb-2">Action Required</h3>
                    <p className="text-sm text-orange-800">
                      You have {churchStats.pendingCount} submission{churchStats.pendingCount > 1 ? 's' : ''} waiting for your review.
                    </p>
                  </div>
                )}

                {/* Quick Tips */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Tips</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Review submissions promptly to help parishes</li>
                    <li>• Heritage churches need special attention</li>
                    <li>• Use reports to track diocese progress</li>
                  </ul>
                </div>
              </div>
            </div>
        </div>
      </div>
      )}

      {/* Church Detail Modal */}
      <ChurchDetailModal
        church={selectedChurch}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        mode={modalMode}
        onSave={handleSaveChurch}
        onSubmit={handleSubmitChurch}
        isSubmitting={isSubmitting}
      />
    </Layout>
  );
});

OptimizedChanceryDashboard.displayName = 'OptimizedChanceryDashboard';