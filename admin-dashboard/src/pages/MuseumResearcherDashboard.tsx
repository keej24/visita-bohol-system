// Museum Researcher Dashboard for heritage validation and cultural content
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  BookOpen,
  Award,
  Clock,
  CheckCircle,
  Eye,
  Edit,
  AlertTriangle,
  Loader2,
  ArrowRight
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getChurchesByDiocese, updateChurchStatusWithValidation, type Church, type ChurchStatus } from '@/lib/churches';
import { ChurchDetailModal } from '@/components/ChurchDetailModal';
import { ChurchService } from '@/services/churchService';
import { ChurchInfo } from '@/components/parish/types';
import { notifyChurchStatusChange } from '@/lib/notifications';
import type { ArchitecturalStyle, ChurchClassification } from '@/types/church';



const MuseumResearcherDashboard = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Church modal state
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);


  // Fetch heritage review churches from both dioceses
  const { data: tagbilaranChurches, isLoading: tagbilaranLoading } = useQuery<Church[]>({
    queryKey: ['churches', 'tagbilaran', 'heritage_review'],
    queryFn: () => getChurchesByDiocese('tagbilaran', ['heritage_review']),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const { data: talibonChurches, isLoading: talibonLoading } = useQuery<Church[]>({
    queryKey: ['churches', 'talibon', 'heritage_review'],
    queryFn: () => getChurchesByDiocese('talibon', ['heritage_review']),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch approved heritage churches for the count
  const { data: tagbilaranApproved, isLoading: tagbilaranApprovedLoading } = useQuery<Church[]>({
    queryKey: ['churches', 'tagbilaran', 'approved'],
    queryFn: () => getChurchesByDiocese('tagbilaran', ['approved']),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const { data: talibonApproved, isLoading: talibonApprovedLoading } = useQuery<Church[]>({
    queryKey: ['churches', 'talibon', 'approved'],
    queryFn: () => getChurchesByDiocese('talibon', ['approved']),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });


  // Combine churches from both dioceses
  const heritageReviewChurches = [
    ...(tagbilaranChurches || []),
    ...(talibonChurches || [])
  ];

  // Filter approved churches for heritage classifications (ICP/NCT only)
  const approvedHeritageChurches = [
    ...(tagbilaranApproved || []).filter(church => church.classification === 'ICP' || church.classification === 'NCT'),
    ...(talibonApproved || []).filter(church => church.classification === 'ICP' || church.classification === 'NCT')
  ];

  const isLoading = tagbilaranLoading || talibonLoading;
  const isApprovedLoading = tagbilaranApprovedLoading || talibonApprovedLoading;

  // Church handlers
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
        selectedChurch.diocese, // Use the church's diocese instead of user's
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
        selectedChurch.diocese, // Use the church's diocese instead of user's
        userProfile.uid
      );

      toast({
        title: "Success",
        description: "Church information updated successfully!"
      });

      setIsModalOpen(false);
      setSelectedChurch(null);
      // Refresh data to show updates
      window.location.reload();
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

  // Helper function to safely convert string to ArchitecturalStyle
  const toArchitecturalStyle = (style: string): ArchitecturalStyle => {
    const validStyles: ArchitecturalStyle[] = ['baroque', 'gothic', 'romanesque', 'neoclassical', 'modern', 'mixed', 'other'];
    const normalizedStyle = style.toLowerCase().trim();
    
    // Direct match
    if (validStyles.includes(normalizedStyle as ArchitecturalStyle)) {
      return normalizedStyle as ArchitecturalStyle;
    }
    
    // Fuzzy matching for common variations
    if (normalizedStyle.includes('baroque') || normalizedStyle.includes('spanish')) return 'baroque';
    if (normalizedStyle.includes('gothic') || normalizedStyle.includes('neo-gothic')) return 'gothic';
    if (normalizedStyle.includes('romanesque')) return 'romanesque';
    if (normalizedStyle.includes('neoclassical') || normalizedStyle.includes('classical')) return 'neoclassical';
    if (normalizedStyle.includes('modern') || normalizedStyle.includes('contemporary')) return 'modern';
    if (normalizedStyle.includes('mixed') || normalizedStyle.includes('combination')) return 'mixed';
    
    // Default fallback
    return 'other';
  };

  // Helper function to safely convert string to ChurchClassification
  const toChurchClassification = (classification: string): ChurchClassification => {
    if (classification === 'National Cultural Treasures') return 'NCT';
    if (classification === 'Important Cultural Properties') return 'ICP';
    return 'non_heritage';
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
      architecturalStyle: toArchitecturalStyle(data.historicalDetails.architecturalStyle || 'other'),
      historicalBackground: data.historicalDetails.historicalBackground || '',
      description: data.historicalDetails.historicalBackground || '',
      classification: toChurchClassification(data.historicalDetails.heritageClassification),
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

  const handleValidateChurch = async (church: Church) => {
    if (!userProfile) return;

    setIsSubmitting(true);
    try {
      const result = await updateChurchStatusWithValidation(
        church.id,
        'approved',
        userProfile,
        'Heritage validation completed by Museum Researcher'
      );

      if (result.success) {
        toast({
          title: "Success",
          description: `${church.name} has been validated and approved.`,
        });

        // Send notification to parish about approval
        await notifyChurchStatusChange(
          church.id,
          church.name,
          church.status,
          'approved',
          userProfile,
          'Heritage validation completed. Your church is now published and visible to the public.'
        );

        // Invalidate and refetch all church queries to update both sections
        await queryClient.invalidateQueries({ queryKey: ['churches'] });

      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to validate church",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error validating church:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeColor = (status: ChurchStatus) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      heritage_review: 'bg-orange-100 text-orange-800 border-orange-300',
      approved: 'bg-green-100 text-green-800 border-green-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getClassificationBadge = (classification: string) => {
    const colors = {
      'ICP': 'bg-accent text-accent-foreground',
      'NCT': 'bg-primary text-primary-foreground'
    };
    return colors[classification as keyof typeof colors] || 'bg-secondary text-secondary-foreground';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Museum Researcher Header */}
        <div className="heritage-card-accent p-6 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary mb-1">
                Museum Researcher - Heritage Validation Dashboard
              </h1>
              <p className="text-muted-foreground">
                Securely review and verify heritage church entries (ICP/NCT), validate historical content, and enhance cultural documentation across both dioceses
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {userProfile?.name}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Simple Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <p className="text-xl font-bold text-orange-600">
                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : heritageReviewChurches.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Approved Heritage</p>
                  <p className="text-xl font-bold text-green-600">
                    {isApprovedLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : approvedHeritageChurches.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Award className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Both Dioceses</p>
                  <p className="text-xl font-bold text-blue-600">Cross-Access</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Heritage Validation */}

        {/* Heritage Review Queue */}
        <Card className="heritage-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">
              Heritage Review Queue {isLoading && <Loader2 className="inline h-4 w-4 ml-2 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading heritage reviews...</p>
                </div>
              </div>
            ) : heritageReviewChurches.length === 0 ? (
              <div className="text-sm text-muted-foreground">No heritage churches awaiting validation.</div>
            ) : (
              <TooltipProvider>
                {heritageReviewChurches.map((church) => (
                  <div key={church.id} className="p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-sm truncate">{church.name}</div>
                          {church.classification && (
                            <Badge className={getClassificationBadge(church.classification)}>
                              {church.classification}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="capitalize">{church.diocese}</span> • {church.municipality ?? "Unknown"}
                          {church.foundedYear && ` • Founded ${church.foundedYear}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${getStatusBadgeColor(church.status)}`}
                        >
                          {church.status.replace("_", " ")}
                        </Badge>

                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="w-3 h-3 mr-1" />
                              1 action
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <div className="font-medium">Available Actions:</div>
                              <div>• Validate and approve heritage church</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      {/* View Church Details Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewChurch(church)}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>

                      {/* Edit Church Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditChurch(church)}
                        className="text-green-600 border-green-300 hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4 mr-1" /> Edit
                      </Button>

                      {/* Approve & Publish Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleValidateChurch(church)}
                        disabled={isSubmitting}
                        className="text-green-600 border-green-300 hover:bg-green-50"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-1" />
                        )}
                        Approve & Publish
                      </Button>
                    </div>
                  </div>
                ))}
              </TooltipProvider>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Church Detail Modal */}
      <ChurchDetailModal
        church={selectedChurch}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        mode={modalMode}
        onSave={handleSaveChurch} // Museum researcher can save edits
        onSubmit={handleSubmitChurch} // Museum researcher can submit edits
        isSubmitting={isSubmitting}
      />
    </Layout>
  );
};

export default MuseumResearcherDashboard;
