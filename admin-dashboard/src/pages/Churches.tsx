import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Plus,
  MapPin,
  Calendar,
  Users,
  ExternalLink,
  Edit,
  Trash2,
  Check,
  X,
  AlertCircle,
  Eye
} from "lucide-react";
import { useState, useMemo } from "react";
import heroImage from "@/assets/baclayon-church-hero.jpg";
import { useAuth } from "@/contexts/AuthContext";
import { useChurches, useChurchReview, useDeleteChurch } from "@/hooks/useChurches";
import { useToast } from "@/components/ui/use-toast";
import type { ChurchStatus, ChurchClassification, Church } from "@/types/church";
import { ChurchDetailModal } from "@/components/ChurchDetailModal";
import { Timestamp } from "firebase/firestore";

const Churches = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ChurchStatus | 'all'>('approved'); // Default to approved for chancery office
  const [classificationFilter, setClassificationFilter] = useState<ChurchClassification | 'all'>('all');

  // Modal state
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { userProfile } = useAuth();
  const { toast } = useToast();
  const reviewMutation = useChurchReview();
  const deleteMutation = useDeleteChurch();

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

  const handleViewChurch = (church: Church) => {
    setSelectedChurch(church);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedChurch(null);
  };

  const handleReviewChurch = async (churchId: string, action: 'approve' | 'reject' | 'request_revision' | 'forward_to_museum', notes?: string) => {
    if (!userProfile?.uid) return;

    reviewMutation.mutate({
      churchId,
      action,
      notes,
      reviewerId: userProfile.uid,
    });
  };

  const handleDeleteChurch = async (churchId: string) => {
    if (confirm('Are you sure you want to delete this church? This action cannot be undone.')) {
      deleteMutation.mutate(churchId);
    }
  };

  const getStatusBadge = (status: ChurchStatus) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending Review', color: 'bg-yellow-500' },
      approved: { variant: 'default' as const, label: 'Approved', color: 'bg-green-500' },
      rejected: { variant: 'destructive' as const, label: 'Rejected', color: 'bg-red-500' },
      under_review: { variant: 'secondary' as const, label: 'Under Review', color: 'bg-blue-500' },
      needs_revision: { variant: 'secondary' as const, label: 'Needs Revision', color: 'bg-orange-500' },
      heritage_review: { variant: 'secondary' as const, label: 'Heritage Review', color: 'bg-purple-500' },
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
      address: church.location,
      latitude: church.coordinates?.latitude,
      longitude: church.coordinates?.longitude,
      architecturalStyle: church.architecturalStyle,
      historicalBackground: church.historicalBackground,
      massSchedules: church.massSchedules, // Keep as array for modal display
      assignedPriest: church.assignedPriest,
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
    };
    
    return result;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Section with Hero Image */}
        <div className="heritage-card-accent overflow-hidden">
          <div 
            className="h-48 bg-cover bg-center relative"
            // Dynamic background image requires inline style - this is the React-recommended approach
            style={{ backgroundImage: `url(${heroImage})` }}
          >
            <div className="absolute inset-0 bg-primary/80 flex items-center">
              <div className="container mx-auto px-6">
                <h1 className="text-3xl font-bold text-primary-foreground mb-2">
                  Manage Churches
                </h1>
                <p className="text-primary-foreground/90">
                  Manage published churches and heritage sites in your diocese
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="heritage-card p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search churches by name, location, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              {canCreateChurch && (
                <Button variant="heritage" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add New Church
                </Button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ChurchStatus | 'all')}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Published Churches</SelectItem>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="heritage_review">Heritage Review</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                </SelectContent>
              </Select>

              <Select value={classificationFilter} onValueChange={(value) => setClassificationFilter(value as ChurchClassification | 'all')}>
                <SelectTrigger className="w-full sm:w-48">
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {churches.map((church) => (
              <Card key={church.id} className="heritage-card hover:shadow-[var(--shadow-medium)] transition-all duration-200 overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-bold text-primary mb-1 truncate">
                        {church.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground truncate">
                        {church.fullName}
                      </p>
                    </div>
                    {getStatusBadge(church.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{church.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Established {church.foundingYear}</span>
                    </div>
                    {church.monthlyVisitors && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{church.monthlyVisitors.toLocaleString()} monthly visitors</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-foreground line-clamp-3">{church.description}</p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {church.classification.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {church.category && (
                        <Badge variant="outline" className="text-xs">
                          {church.category}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      Updated {church.updatedAt.toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="View Details"
                        onClick={() => handleViewChurch(church)}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-600 hover:text-orange-700"
                            onClick={() => handleReviewChurch(church.id, 'request_revision', 'Please review and update the information')}
                            disabled={reviewMutation.isPending}
                            title="Request Revision"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleReviewChurch(church.id, 'reject', 'Church submission rejected')}
                            disabled={reviewMutation.isPending}
                            title="Reject Church"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}

                      {(canManageChurch || church.createdBy === userProfile?.uid) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteChurch(church.id)}
                          disabled={deleteMutation.isPending}
                          title="Delete Church"
                        >
                          <Trash2 className="w-4 h-4" />
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
                  {churches
                    .filter(c => c.monthlyVisitors)
                    .reduce((sum, c) => sum + (c.monthlyVisitors || 0), 0)
                    .toLocaleString()}
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
      />
    </Layout>
  );
};

export default Churches;