import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DashboardHeader } from '@/components/optimized/DashboardHeader';
import { StatsGrid } from '@/components/optimized/StatsGrid';
import { ChanceryReviewList } from '@/components/ChanceryReviewList';
import { PendingUpdatesReviewList } from '@/components/PendingUpdatesReviewList';
import { ChurchDetailModal } from '@/components/ChurchDetailModal';
import { PendingChancellors } from '@/components/PendingChancellors';
import { AuditLogViewer } from '@/components/AuditLogViewer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useChurchStats } from '@/hooks/useChurchStats';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ClipboardList, History, UserPlus, FileEdit } from 'lucide-react';
import type { Diocese } from '@/contexts/AuthContext';
import type { Church } from '@/lib/churches';
import { ChurchInfo } from '@/components/parish/types';
import { ChurchService } from '@/services/churchService';
import { ChancellorService } from '@/services/chancellorService';
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
  const [isSaving, setIsSaving] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [activityLogOpen, setActivityLogOpen] = useState(false);

  // Pending chancellor registration count
  const [pendingChancellorCount, setPendingChancellorCount] = useState(0);

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const pending = await ChancellorService.getPendingChancellors(diocese);
        setPendingChancellorCount(pending.length);
      } catch (error) {
        console.error('[ChanceryDashboard] Error fetching pending chancellor count:', error);
      }
    };
    fetchPendingCount();
    // Refresh every 60 seconds
    const interval = setInterval(fetchPendingCount, 60000);
    return () => clearInterval(interval);
  }, [diocese]);

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

    setIsSaving(true);
    try {
      // Convert ChurchInfo to ChurchFormData format and update
      // Save as draft - data is saved but no status change, modal stays open
      const formData = convertChurchInfoToFormData(data);
      await ChurchService.updateChurch(
        selectedChurch.id,
        formData,
        userProfile.diocese,
        userProfile.uid
      );

      toast({
        title: "Draft Saved",
        description: "Changes saved as draft. Continue editing or click 'Save' to finalize."
      });

      // Invalidate all church queries to update all dashboards
      await queryClient.invalidateQueries({ queryKey: ['churches'] });
      // Note: Modal stays open so user can continue editing
    } catch (error) {
      console.error('Error saving church:', error);
      toast({
        title: "Error",
        description: "Failed to save church information",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
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
      const trimmedStyle = (style || '').trim();
      const styleMap: Record<string, ArchitecturalStyle> = {
        'Baroque': 'baroque',
        'Neo-Gothic': 'gothic',
        'Gothic': 'gothic',
        'Byzantine': 'byzantine',
        'Romanesque': 'romanesque',
        'Neo-Classical': 'neoclassical',
        'Modern': 'modern',
        'Mixed': 'mixed',
        'Mixed Styles': 'mixed',
        'Other': 'other'
      };
      return styleMap[trimmedStyle] || 'other';
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
      // Include historicalDetails with religiousClassifications array
      historicalDetails: {
        religiousClassifications: (data.historicalDetails.religiousClassifications || []).map(classification => {
          // Convert display names to database format
          switch (classification) {
            case 'Diocesan Shrine': return 'diocesan_shrine';
            case 'Jubilee Church': return 'jubilee_church';
            case 'Papal Basilica Affinity': return 'papal_basilica_affinity';
            case 'Holy Door': return 'holy_door';
            default: return classification;
          }
        })
      },
      assignedPriest: data.currentParishPriest || '',
      priest_assignment: data.priest_assignment || [],
      feastDay: data.feastDay || '',
      massSchedules: (data.massSchedules || []).map(schedule => ({
        day: schedule.day || '',
        time: schedule.endTime ? `${schedule.time} - ${schedule.endTime}` : schedule.time,
        language: schedule.language || 'Cebuano',
        isFbLive: schedule.isFbLive || false
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
      // Photos field - needed for proper display in Parish Dashboard
      photos: (data.photos || []).map(photo => ({
        url: photo.url || '',
        name: photo.name || ''
      })).filter(photo => photo.url !== ''),
      // Preserve document visibility metadata
      documents: (data.documents || []).map(doc => ({
        url: doc.url || '',
        name: doc.name || '',
        visibility: doc.visibility || 'public'
      })).filter(doc => doc.url !== ''),
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
            <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-primary mx-auto" />
            <div className="space-y-2">
              <p className="text-base sm:text-lg font-semibold text-foreground">Loading Dashboard...</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Please wait while we fetch your data</p>
            </div>
          </div>
        </div>
      ) : (
      <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
        {/* Diocese Header */}
        <ErrorBoundary>
          <DashboardHeader diocese={diocese} userProfile={userProfile} />
        </ErrorBoundary>

        {/* Key Statistics */}
        <ErrorBoundary>
          <StatsGrid stats={churchStats} />
        </ErrorBoundary>

        {/* Tabbed Content Area */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="updates" className="flex items-center gap-2">
              <FileEdit className="h-4 w-4" />
              <span className="hidden sm:inline">Updates</span>
              {churchStats.pendingUpdatesCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                  {churchStats.pendingUpdatesCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="chancellors" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Chancellors</span>
              {pendingChancellorCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5 text-xs">
                  {pendingChancellorCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Original Dashboard Content */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Pending Reviews - Takes up more space on larger screens */}
              <div className="lg:col-span-2 order-2 lg:order-1">
                <ErrorBoundary>
                  <ChanceryReviewList
                    diocese={diocese}
                    onViewChurch={handleViewChurch}
                    onEditChurch={handleEditChurch}
                  />
                </ErrorBoundary>
              </div>

              {/* Info Panel */}
              <div className="space-y-3 sm:space-y-4 order-1 lg:order-2">
                {/* Status Summary */}
                {(churchStats.pendingCount > 0 || churchStats.pendingUpdatesCount > 0 || pendingChancellorCount > 0) && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 sm:p-4">
                    <h3 className="font-semibold text-orange-900 mb-1 sm:mb-2 text-sm sm:text-base">Action Required</h3>
                    {churchStats.pendingCount > 0 && (
                      <p className="text-xs sm:text-sm text-orange-800">
                        You have {churchStats.pendingCount} submission{churchStats.pendingCount > 1 ? 's' : ''} waiting for review.
                      </p>
                    )}
                    {churchStats.pendingUpdatesCount > 0 && (
                      <p className="text-xs sm:text-sm text-orange-800 mt-1">
                        <button
                          onClick={() => setActiveTab('updates')}
                          className="underline font-medium hover:text-orange-900"
                        >
                          {churchStats.pendingUpdatesCount} approved church{churchStats.pendingUpdatesCount > 1 ? 'es have' : ' has'} pending profile updates
                        </button>
                        {' '}to review.
                      </p>
                    )}
                    {pendingChancellorCount > 0 && (
                      <p className="text-xs sm:text-sm text-orange-800 mt-1">
                        <button
                          onClick={() => setActiveTab('chancellors')}
                          className="underline font-medium hover:text-orange-900"
                        >
                          {pendingChancellorCount} pending chancellor registration{pendingChancellorCount > 1 ? 's' : ''}
                        </button>
                        {' '}awaiting approval.
                      </p>
                    )}
                  </div>
                )}

                {/* Quick Tips */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                  <h3 className="font-semibold text-blue-900 mb-1 sm:mb-2 text-sm sm:text-base">Tips</h3>
                  <ul className="text-xs sm:text-sm text-blue-800 space-y-1">
                    <li>• Review submissions promptly</li>
                    <li>• Heritage churches must be forwarded to the Museum Staff</li>
                    <li className="hidden sm:list-item">• Use reports to track diocese progress</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Recent Activity Widget */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600" />
                    Recent Activity
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActivityLogOpen(true)}
                  >
                    View All
                  </Button>
                </div>
                <CardDescription>Latest actions in {diocese === 'tagbilaran' ? 'Tagbilaran' : 'Talibon'} Diocese</CardDescription>
              </CardHeader>
              <CardContent>
                <ErrorBoundary>
                  <AuditLogViewer diocese={diocese} limit={5} compact />
                </ErrorBoundary>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Updates Tab */}
          <TabsContent value="updates" className="space-y-4">
            <ErrorBoundary>
              <PendingUpdatesReviewList
                diocese={diocese}
                onViewChurch={handleViewChurch}
                onEditChurch={handleEditChurch}
              />
            </ErrorBoundary>
          </TabsContent>

          {/* Chancellors Tab - Pending Registrations */}
          <TabsContent value="chancellors">
            <ErrorBoundary>
              {userProfile && (
                <PendingChancellors
                  diocese={diocese}
                  currentChancellor={userProfile}
                  onChancellorApproved={() => {
                    toast({
                      title: "Chancellor Approved",
                      description: "The new chancellor account has been activated successfully.",
                    });
                  }}
                />
              )}
            </ErrorBoundary>
          </TabsContent>
        </Tabs>

        {/* Full Activity Log Dialog */}
        <Dialog open={activityLogOpen} onOpenChange={setActivityLogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Activity Log — {diocese === 'tagbilaran' ? 'Tagbilaran' : 'Talibon'} Diocese
              </DialogTitle>
            </DialogHeader>
            <AuditLogViewer diocese={diocese} limit={100} compact />
          </DialogContent>
        </Dialog>
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
        isSaving={isSaving}
        isMuseumResearcher={false}
      />
    </Layout>
  );
});

OptimizedChanceryDashboard.displayName = 'OptimizedChanceryDashboard';