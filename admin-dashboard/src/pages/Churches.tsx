/**
 * =============================================================================
 * CHURCHES.TSX - Church Management Page (Chancery Office)
 * =============================================================================
 *
 * PURPOSE:
 * This page allows Chancery Office users to view, manage, and approve all
 * churches in their diocese. It displays a filterable grid of church cards
 * with action buttons for approval, review forwarding, and deletion.
 *
 * USER ROLES:
 * - chancery_office: Full access - view, approve, forward to museum, delete
 * - museum_researcher: Read-only view of heritage churches for validation
 * - parish_secretary: Can see "Add New Church" button (redirects to ParishDashboard)
 *
 * PAGE FEATURES:
 * 1. Search bar for finding churches by name/location/description
 * 2. Status filter (Approved, Pending, Heritage Review, etc.)
 * 3. Classification filter (ICP, NCT, Non-Heritage)
 * 4. Church cards with key info and action buttons
 * 5. Summary statistics at bottom (total, approved, visitors, heritage count)
 * 6. Detail modal for viewing full church information
 *
 * CHURCH WORKFLOW ACTIONS:
 * ┌────────────────────┬─────────────────────────────────────────────────┐
 * │ Action             │ Description                                     │
 * ├────────────────────┼─────────────────────────────────────────────────┤
 * │ View (Eye icon)    │ Opens ChurchDetailModal with full info          │
 * │ Approve (Check)    │ Approves pending church (non-heritage)          │
 * │ Forward (External) │ Forwards ICP/NCT church to Museum Researcher    │
 * │ Delete (Trash)     │ Permanently deletes church (with confirmation)  │
 * └────────────────────┴─────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * 1. useChurches hook fetches churches from Firebase with filters
 * 2. Filters are memoized and update query when changed
 * 3. Data automatically refreshes via React Query when mutations occur
 * 4. convertChurchForModal transforms Church type for modal display
 *
 * HERO IMAGE:
 * The page header features a hero image (Baclayon Church) with a
 * semi-transparent primary color overlay for branding consistency.
 *
 * RELATED FILES:
 * - hooks/useChurches.ts: React Query hooks for church data
 * - components/ChurchDetailModal.tsx: Full church detail view
 * - services/churchService.ts: Firebase CRUD operations
 * - types/church.ts: TypeScript type definitions
 */

import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Plus,
  MapPin,
  Calendar,
  Users,
  ExternalLink,
  Edit,
  EyeOff,
  Check,
  X,
  AlertCircle,
  Eye
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import heroImage from "@/assets/baclayon-church-hero.jpg";
import { useAuth } from "@/contexts/AuthContext";
import { useChurches, useChurchReview, useUnpublishChurch } from "@/hooks/useChurches";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { ChurchStatus, ChurchClassification, Church, ArchitecturalStyle, ReligiousClassification } from "@/types/church";
import { ChurchDetailModal } from "@/components/ChurchDetailModal";
import { ChurchInfo } from "@/components/parish/types";
import { ChurchService } from "@/services/churchService";
import { notifyChurchUnpublished } from "@/lib/notifications";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const Churches = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ChurchStatus | 'all'>('approved'); // Default to approved for chancery office
  const [classificationFilter, setClassificationFilter] = useState<ChurchClassification | 'all'>('all');

  // Modal state
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Unpublish confirmation dialog state
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);
  const [churchToUnpublish, setChurchToUnpublish] = useState<{ id: string; name: string } | null>(null);
  const [unpublishReason, setUnpublishReason] = useState("");
  const [notifyParish, setNotifyParish] = useState(true);
  const [totalMonthlyVisitors, setTotalMonthlyVisitors] = useState(0);

  const { userProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const reviewMutation = useChurchReview();
  const unpublishMutation = useUnpublishChurch();

  // Build filters
  const filters = useMemo(() => {
    return {
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      classification: classificationFilter !== 'all' ? classificationFilter : undefined,
      diocese: userProfile?.diocese,
    };
  }, [searchTerm, statusFilter, classificationFilter, userProfile?.diocese]);

  const { data: churches = [], isLoading, error } = useChurches(filters);

  // Fetch visitor count from church_visited collection
  useEffect(() => {
    const fetchVisitorCount = async () => {
      if (!churches.length) {
        setTotalMonthlyVisitors(0);
        return;
      }

      try {
        // Get visits from the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const churchIds = churches.map(c => c.id);
        const visitorRef = collection(db, 'church_visited');
        
        // Simple query - filter in memory to avoid needing composite index
        const visitorQuery = query(
          visitorRef,
          where('visit_status', '==', 'validated')
        );

        const snapshot = await getDocs(visitorQuery);
        let count = 0;
        snapshot.forEach(doc => {
          const data = doc.data();
          // Filter by church and date in memory
          const visitDate = data.visit_date?.toDate?.();
          if (churchIds.includes(data.church_id) && visitDate && visitDate >= thirtyDaysAgo) {
            count++;
          }
        });

        console.log('📊 Visitor count:', count, 'from', snapshot.size, 'validated visits');
        setTotalMonthlyVisitors(count);
      } catch (err) {
        console.error('Error fetching visitor count:', err);
        setTotalMonthlyVisitors(0);
      }
    };

    fetchVisitorCount();
  }, [churches]);

  const handleViewChurch = (church: Church) => {
    setSelectedChurch(church);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedChurch(null);
  };

  // Helper function to convert ChurchInfo to ChurchFormData for saving
  const convertChurchInfoToFormData = (data: ChurchInfo) => {
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
      // Save religiousClassifications array in historicalDetails for persistence
      historicalDetails: {
        religiousClassifications: (data.historicalDetails.religiousClassifications || []).map((c: string) => {
          switch (c) {
            case 'Diocesan Shrine': return 'diocesan_shrine';
            case 'Jubilee Church': return 'jubilee_church';
            case 'Papal Basilica Affinity': return 'papal_basilica_affinity';
            case 'Holy Door': return 'holy_door';
            default: return c.toLowerCase().replace(/\s+/g, '_');
          }
        })
      },
      assignedPriest: data.currentParishPriest || '',
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
      // Preserve document visibility metadata for internal-only vs public documents
      documents: (data.documents || []).map(doc => ({
        url: doc.url || '',
        name: doc.name || '',
        visibility: doc.visibility || 'public'
      })).filter(doc => doc.url !== ''),
      culturalSignificance: data.historicalDetails.majorHistoricalEvents || '',
      architecturalFeatures: data.historicalDetails.architecturalFeatures || '',
      heritageInformation: data.historicalDetails.heritageInformation || '',
      tags: [],
    };
  };

  // Handle saving church data as draft (keeps modal open)
  const handleSaveChurch = async (data: ChurchInfo) => {
    if (!selectedChurch || !userProfile) return;

    setIsSaving(true);
    try {
      const formData = convertChurchInfoToFormData(data);
      await ChurchService.updateChurch(
        selectedChurch.id,
        formData,
        userProfile.diocese,
        userProfile.uid
      );

      toast({
        title: "Draft Saved",
        description: "Changes saved. Continue editing or click 'Save' to finalize."
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

  // Handle submitting church data (saves and closes modal)
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

  const handleReviewChurch = async (churchId: string, action: 'approve' | 'forward_to_museum', notes?: string) => {
    if (!userProfile?.uid) return;

    reviewMutation.mutate({
      churchId,
      action,
      notes,
      reviewerId: userProfile.uid,
    });
  };

  // Opens the unpublish confirmation dialog
  const handleUnpublishClick = (churchId: string, churchName: string) => {
    setChurchToUnpublish({ id: churchId, name: churchName });
    setUnpublishReason(""); // Reset reason field
    setNotifyParish(true); // Default to notify
    setUnpublishDialogOpen(true);
  };

  // Executes the unpublish action after user confirms
  const handleConfirmUnpublish = async () => {
    if (!churchToUnpublish || !userProfile) return;
    
    const reason = unpublishReason.trim() || "No reason provided";
    
    try {
      // Unpublish the church with reason and audit trail
      await unpublishMutation.mutateAsync({
        churchId: churchToUnpublish.id,
        reason,
        unpublishedBy: userProfile.uid,
      });

      // Optionally send notification to parish secretary
      if (notifyParish) {
        await notifyChurchUnpublished(
          churchToUnpublish.id,
          churchToUnpublish.name,
          reason,
          userProfile
        );
      }
    } catch (error) {
      console.error('Error unpublishing church:', error);
    }

    setUnpublishDialogOpen(false);
    setChurchToUnpublish(null);
    setUnpublishReason("");
  };

  const getStatusBadge = (status: ChurchStatus) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending Review', color: 'bg-yellow-500' },
      approved: { variant: 'default' as const, label: 'Approved', color: 'bg-green-500' },
      under_review: { variant: 'secondary' as const, label: 'Under Review', color: 'bg-blue-500' },
      heritage_review: { variant: 'secondary' as const, label: 'Heritage Review', color: 'bg-purple-500' },
      draft: { variant: 'outline' as const, label: 'Draft', color: 'bg-gray-500' },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    // Fallback for unknown status values
    if (!config) {
      return (
        <Badge variant="outline" className="bg-gray-500 text-white">
          {status || 'Unknown'}
        </Badge>
      );
    }

    return (
      <Badge variant={config.variant} className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    );
  };

  const canManageChurch = userProfile?.role === 'chancery_office' || userProfile?.role === 'museum_researcher';
  const canCreateChurch = userProfile?.role === 'parish_secretary';

  // Convert Church type from @/types/church to @/lib/churches format for the modal
  // Returns extended Church object with additional fields for UI display
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convertChurchForModal = (church: Church | null): any => {
    if (!church) return null;

    // Map the classification to the expected format
    let classification: 'ICP' | 'NCT' | 'non-heritage' | 'unknown' = 'unknown';
    if (church.classification === 'ICP' || church.classification === 'NCT') {
      classification = church.classification;
    } else if (church.classification === 'non_heritage') {
      classification = 'non-heritage';
    }

    // Type assertion needed because modal requires extra fields not in base Church type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = {
      id: church.id,
      name: church.name,
      municipality: church.municipality,
      parishId: church.parishId,
      diocese: church.diocese,
      status: church.status as import('@/lib/churches').ChurchStatus,
      classification,
      foundedYear: church.foundingYear,
      foundingYear: church.foundingYear,
      address: church.location,
      latitude: church.coordinates?.latitude,
      longitude: church.coordinates?.longitude,
      architecturalStyle: church.architecturalStyle,
      historicalBackground: church.historicalBackground,
      massSchedules: church.massSchedules, // Keep as array for modal display
      assignedPriest: church.assignedPriest,
      feastDay: church.feastDay,
      culturalSignificance: church.culturalSignificance,
      createdAt: church.createdAt ? Timestamp.fromDate(new Date(church.createdAt)) : undefined,
      updatedAt: church.updatedAt ? Timestamp.fromDate(new Date(church.updatedAt)) : undefined,
      submittedBy: church.createdBy,
      lastReviewedBy: church.reviewedBy,
      lastReviewNote: church.reviewNotes,
      // Additional fields for modal display (not in base Church type, but needed for UI)
      fullName: church.fullName,
      location: church.location,
      coordinates: church.coordinates,
      contactInfo: church.contactInfo,
      images: church.images,
      documents: church.documents,
      virtualTour360: church.virtualTour ? [] : [],
      founders: church.founders,
      description: church.description,
      // Heritage & Architectural fields
      architecturalFeatures: church.architecturalFeatures,
      heritageInformation: church.heritageInformation,
      religiousClassification: church.religiousClassification,
      // Preserve historicalDetails for religiousClassifications array
      historicalDetails: (church as unknown as { historicalDetails?: { religiousClassifications?: string[] } }).historicalDetails,
    };
    
    return result;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Section with Hero Image */}
        <div className="heritage-card-accent overflow-hidden">
          <div 
            className="h-32 sm:h-40 md:h-48 bg-cover bg-center relative"
            // Dynamic background image requires inline style - this is the React-recommended approach
            style={{ backgroundImage: `url(${heroImage})` }}
          >
            <div className="absolute inset-0 bg-primary/80 flex items-center">
              <div className="container mx-auto px-4 sm:px-6">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-foreground mb-1 sm:mb-2">
                  Manage Churches
                </h1>
                <p className="text-sm sm:text-base text-primary-foreground/90">
                  Manage published churches and heritage sites in your diocese
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="heritage-card p-3 sm:p-4 md:p-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search churches..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 text-sm sm:text-base"
                  />
                </div>
              </div>
              {canCreateChurch && (
                <Button variant="heritage" className="gap-2 w-full sm:w-auto">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add New Church</span>
                  <span className="sm:hidden">Add Church</span>
                </Button>
              )}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ChurchStatus | 'all')}>
                <SelectTrigger className="w-full text-sm sm:text-base">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Published Churches</SelectItem>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="heritage_review">Heritage Review</SelectItem>
                </SelectContent>
              </Select>

              <Select value={classificationFilter} onValueChange={(value) => setClassificationFilter(value as ChurchClassification | 'all')}>
                <SelectTrigger className="w-full text-sm sm:text-base">
                  <SelectValue placeholder="Filter by classification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classifications</SelectItem>
                  <SelectItem value="ICP">ICP (Important Cultural Property)</SelectItem>
                  <SelectItem value="NCT">NCT (National Cultural Treasure)</SelectItem>
                  <SelectItem value="non_heritage">Non-Heritage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Loading/Error States */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading churches...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Churches</h3>
            <p className="text-destructive/80 mb-4">{error.message}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        )}

        {/* Churches Grid */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {churches.map((church) => (
              <Card key={church.id} className="heritage-card hover:shadow-[var(--shadow-medium)] transition-all duration-200 overflow-hidden">
                <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg font-bold text-primary mb-1 truncate">
                        {church.name}
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {church.fullName}
                      </p>
                    </div>
                    {getStatusBadge(church.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{church.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span>Est. {church.foundingYear}</span>
                    </div>
                    {church.monthlyVisitors && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>{church.monthlyVisitors.toLocaleString()} visitors</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs sm:text-sm text-foreground line-clamp-2 sm:line-clamp-3">{church.description}</p>
                    <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px] sm:text-xs">
                        {church.classification.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {church.category && (
                        <Badge variant="outline" className="text-[10px] sm:text-xs hidden sm:inline-flex">
                          {church.category}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border">
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      Updated {church.updatedAt.toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="View Details"
                        onClick={() => handleViewChurch(church)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {canManageChurch && church.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleReviewChurch(church.id, 'approve')}
                            disabled={reviewMutation.isPending}
                            title="Approve Church"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          {(church.classification === 'ICP' || church.classification === 'NCT') && userProfile?.role === 'chancery_office' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700"
                              onClick={() => handleReviewChurch(church.id, 'forward_to_museum', 'Forwarded for heritage review')}
                              disabled={reviewMutation.isPending}
                              title="Forward to Museum Researcher"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}

                      {(canManageChurch || church.createdBy === userProfile?.uid) && church.status === 'approved' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          onClick={() => handleUnpublishClick(church.id, church.name)}
                          disabled={unpublishMutation.isPending}
                          title="Unpublish Church"
                        >
                          <EyeOff className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {church.reviewNotes && (
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Review Notes:</p>
                      <p className="text-sm">{church.reviewNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {churches.length === 0 && !isLoading && (
              <div className="col-span-full text-center py-12">
                <div className="text-muted-foreground mb-4">
                  <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No churches found</p>
                  <p className="text-sm">Try adjusting your search or filter criteria</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats Summary */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="stats-card text-center">
              <CardContent className="pt-6">
                <div className="stats-value">{churches.length}</div>
                <div className="stats-label">Total Churches</div>
              </CardContent>
            </Card>
            <Card className="stats-card text-center">
              <CardContent className="pt-6">
                <div className="stats-value">{churches.filter(c => c.status === "approved").length}</div>
                <div className="stats-label">Approved Churches</div>
              </CardContent>
            </Card>
            <Card className="stats-card text-center">
              <CardContent className="pt-6">
                <div className="stats-value">
                  {totalMonthlyVisitors.toLocaleString()}
                </div>
                <div className="stats-label">Total Monthly Visitors</div>
              </CardContent>
            </Card>
            <Card className="stats-card text-center">
              <CardContent className="pt-6">
                <div className="stats-value">
                  {churches.filter(c => c.classification === 'ICP' || c.classification === 'NCT').length}
                </div>
                <div className="stats-label">Heritage Churches</div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Church Detail Modal */}
      <ChurchDetailModal
        church={convertChurchForModal(selectedChurch)}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        mode="view"
        onSave={handleSaveChurch}
        onSubmit={handleSubmitChurch}
        isSubmitting={isSubmitting}
        isSaving={isSaving}
        isMuseumResearcher={userProfile?.role === 'museum_researcher'}
      />

      {/* Unpublish Confirmation Dialog */}
      <AlertDialog open={unpublishDialogOpen} onOpenChange={setUnpublishDialogOpen}>
        <AlertDialogContent className="bg-white border shadow-lg max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-orange-500" />
              Unpublish Church?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              {churchToUnpublish && (
                <>
                  You are about to unpublish <strong className="text-foreground">{churchToUnpublish.name}</strong>.
                  <br /><br />
                  This church will be hidden from the mobile app and public users will no longer be able to see it.
                  You can republish it later by submitting it for review again.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* Reason for unpublishing */}
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="unpublish-reason" className="text-sm font-medium">
                Reason for Unpublishing <span className="text-muted-foreground">(for audit trail)</span>
              </Label>
              <Textarea
                id="unpublish-reason"
                placeholder="e.g., Temporary closure for renovation, Structural damage assessment, Parish merger, etc."
                value={unpublishReason}
                onChange={(e) => setUnpublishReason(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>
            
            {/* Notify parish checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify-parish"
                checked={notifyParish}
                onCheckedChange={(checked) => setNotifyParish(checked === true)}
              />
              <Label 
                htmlFor="notify-parish" 
                className="text-sm font-normal cursor-pointer"
              >
                Notify Parish Secretary about this action
              </Label>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setUnpublishReason("");
              setNotifyParish(true);
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUnpublish}
              disabled={unpublishMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {unpublishMutation.isPending ? "Unpublishing..." : "Unpublish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Churches;