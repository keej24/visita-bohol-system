import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DashboardHeader } from '@/components/optimized/DashboardHeader';
import { StatsGrid } from '@/components/optimized/StatsGrid';
import { ChanceryReviewList } from '@/components/ChanceryReviewList';
import { ChurchDetailModal } from '@/components/ChurchDetailModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useChurchStats } from '@/hooks/useChurchStats';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import type { Diocese } from '@/contexts/AuthContext';
import type { Church } from '@/lib/churches';
import { ChurchInfo } from '@/components/parish/types';
import { ChurchService } from '@/services/churchService';
import type { ArchitecturalStyle, ChurchClassification } from '@/types/church';

interface OptimizedChanceryDashboardProps {
  diocese: Diocese;
}

export const OptimizedChanceryDashboard = React.memo<OptimizedChanceryDashboardProps>(({ diocese }) => {
  const { userProfile } = useAuth();
  const churchStats = useChurchStats(diocese);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Modal state
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickAction = (path: string) => {
    navigate(path);
  };

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
    } catch (error) {
      console.error('Error saving church:', error);
      toast({
        title: "Error",
        description: "Failed to save church information",
        variant: "destructive"
      });
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
    return {
      name: data.churchName || '',
      fullName: data.parishName || data.churchName || '',
      location: `${data.locationDetails.streetAddress || ''}, ${data.locationDetails.barangay || ''}, ${data.locationDetails.municipality || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, ''),
      municipality: data.locationDetails.municipality || '',
      foundingYear: parseInt(data.historicalDetails.foundingYear) || new Date().getFullYear(),
      founders: data.historicalDetails.founders || '',
      keyFigures: [],
      architecturalStyle: (data.historicalDetails.architecturalStyle || 'other') as ArchitecturalStyle,
      historicalBackground: data.historicalDetails.historicalBackground || '',
      description: data.historicalDetails.historicalBackground || '',
      classification: (data.historicalDetails.heritageClassification === 'National Cultural Treasures' ? 'NCT' :
                    data.historicalDetails.heritageClassification === 'Important Cultural Properties' ? 'ICP' : 'non_heritage') as ChurchClassification,
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
        address: `${data.locationDetails.streetAddress || ''}, ${data.locationDetails.barangay || ''}, ${data.locationDetails.municipality || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '')
      },
      images: (data.photos || []).map(photo => photo.url || '').filter(url => url !== ''),
      documents: (data.documents || []).map(doc => doc.url || '').filter(url => url !== ''),
      virtualTour360: (data.virtual360Images || []).map(img => img.url).filter(url => url !== ''),
      culturalSignificance: data.historicalDetails.majorHistoricalEvents || '',
      preservationHistory: '',
      restorationHistory: '',
      tags: [],
      category: 'parish_church'
    };
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Diocese Header */}
        <ErrorBoundary>
          <DashboardHeader diocese={diocese} userProfile={userProfile} />
        </ErrorBoundary>

        {/* Key Statistics */}
        <ErrorBoundary>
          <StatsGrid diocese={diocese} stats={churchStats} />
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
              
              {/* Quick Actions & Info Panel */}
              <div className="space-y-4">
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={() => handleQuickAction('/churches')}
                      className="w-full text-left px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      View All Churches
                    </button>
                    <button
                      onClick={() => handleQuickAction('/user-management')}
                      className="w-full text-left px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      Manage Parish Accounts
                    </button>
                    <button
                      onClick={() => handleQuickAction('/reports')}
                      className="w-full text-left px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Generate Reports
                    </button>
                    <button 
                      onClick={() => handleQuickAction('/announcements')}
                      className="w-full text-left px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Manage Announcements
                    </button>
                  </div>
                </div>

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