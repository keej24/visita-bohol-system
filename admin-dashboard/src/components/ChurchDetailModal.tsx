import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2,
  MapPin,
  Calendar,
  User,
  Phone,
  Mail,
  Globe,
  Clock,
  Edit3,
  X,
  Image as ImageIcon,
  FileText,
  Eye,
  ExternalLink,
  Info,
  MessageSquare,
  Church as ChurchIcon,
  Landmark,
  Facebook,
  History,
  Users,
  BookOpen,
  Camera,
  ChevronRight
} from 'lucide-react';
import type { Church } from '@/lib/churches';
import { ChurchProfileForm } from '@/components/parish/ChurchProfileForm';
import { ChurchInfo } from '@/components/parish/types';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  church: Church | null;
  isOpen: boolean;
  onClose: () => void;
  mode: 'view' | 'edit';
  onSave?: (data: ChurchInfo) => void;
  onSubmit?: (data: ChurchInfo) => void;
  isSubmitting?: boolean;
  isMuseumResearcher?: boolean; // Museum researcher can only edit historical tab and documents
}

export function ChurchDetailModal({
  church,
  isOpen,
  onClose,
  mode,
  onSave,
  onSubmit,
  isSubmitting = false,
  isMuseumResearcher = false
}: Props) {
  const [editMode, setEditMode] = useState(mode === 'edit');

  // Update editMode when mode prop changes
  useEffect(() => {
    setEditMode(mode === 'edit');
  }, [mode]);

  if (!church) return null;

  // Helper function to convert database architectural style to display value
  // Must match the conversion in ParishDashboard
  const getArchitecturalStyleDisplay = (style?: string): string => {
    switch (style?.toLowerCase()) {
      case 'baroque': return 'Baroque';
      case 'gothic': return 'Neo-Gothic';
      case 'romanesque': return 'Byzantine';
      case 'neoclassical': return 'Neo-Classical';
      case 'modern': return 'Modern';
      case 'mixed': return 'Mixed';
      case 'other':
      default: return 'Other';
    }
  };

  // Helper function to convert database religious classification to display value
  // Must match the conversion in ParishDashboard
  const getReligiousClassificationDisplay = (classification?: string): 'None' | 'Diocesan Shrine' | 'Jubilee Church' | 'Papal Basilica Affinity' => {
    switch (classification?.toLowerCase()) {
      case 'diocesan_shrine': return 'Diocesan Shrine';
      case 'jubilee_church': return 'Jubilee Church';
      case 'papal_basilica_affinity': return 'Papal Basilica Affinity';
      case 'none':
      default: return 'None';
    }
  };

  // Convert Church to ChurchInfo format for editing
  const convertToChurchInfo = (church: Church): ChurchInfo => {
    // Use type assertion since Church from Firestore has all these fields
    // but the TypeScript definition may not be complete
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const churchData = church as any;
    
    return {
      churchName: churchData.name || '',
      parishName: churchData.fullName || churchData.name || '',
      locationDetails: {
        streetAddress: churchData.location?.split(',')[0] || '',
        barangay: churchData.location?.split(',')[1]?.trim() || '',
        municipality: churchData.municipality || '',
        province: 'Bohol'
      },
      coordinates: {
        lat: churchData.coordinates?.latitude || churchData.latitude || 0,
        lng: churchData.coordinates?.longitude || churchData.longitude || 0
      },
      historicalDetails: {
        foundingYear: churchData.foundingYear?.toString() || '',
        founders: churchData.founders || '',
        architecturalStyle: getArchitecturalStyleDisplay(churchData.architecturalStyle),
        historicalBackground: churchData.historicalBackground || churchData.description || '',
        majorHistoricalEvents: churchData.culturalSignificance || '',
        heritageClassification: churchData.classification === 'NCT' ? 'National Cultural Treasures' :
                               churchData.classification === 'ICP' ? 'Important Cultural Properties' : 'None',
        religiousClassification: getReligiousClassificationDisplay(churchData.religiousClassification) as 'None' | 'Diocesan Shrine' | 'Jubilee Church' | 'Papal Basilica Affinity',
        religiousClassifications: churchData.historicalDetails?.religiousClassifications || [],
        supportingDocuments: [],
        architecturalFeatures: churchData.architecturalFeatures || '',
        heritageInformation: churchData.heritageInformation || ''
      },
      currentParishPriest: churchData.assignedPriest || '',
      feastDay: churchData.feastDay || '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      massSchedules: (churchData.massSchedules || []).map((schedule: any) => ({
        day: schedule.day || '',
        // Handle both new format (separate time/endTime) and old format (combined "time - endTime")
        time: schedule.endTime ? schedule.time : (schedule.time?.split(' - ')[0] || ''),
        endTime: schedule.endTime || (schedule.time?.split(' - ')[1] || ''),
        // Handle both new format (language field) and old format (type field with language)
        language: schedule.language || (schedule.type?.replace(' (FB Live)', '') || 'Cebuano'),
        // Handle both new format (isFbLive boolean) and old format (type includes FB Live)
        isFbLive: schedule.isFbLive ?? (schedule.type?.includes('(FB Live)') || false)
      })),
      contactInfo: {
        phone: churchData.contactInfo?.phone || '',
        email: churchData.contactInfo?.email || '',
        website: churchData.contactInfo?.website || '',
        facebookPage: churchData.contactInfo?.facebookPage || ''
      },
      // Convert images array (strings) to FileUpload format
      photos: (churchData.images || []).map((url: string, index: number) => ({
        id: `photo-${index}`,
        name: `Photo ${index + 1}`,
        type: 'photo' as const,
        url: url,
        uploadDate: new Date().toISOString(),
        status: 'approved' as const
      })),
      // Convert documents array to FileUpload format
      documents: (churchData.documents || []).map((doc: string | { url?: string; name?: string }, index: number) => {
        const url = typeof doc === 'string' ? doc : doc.url || '';
        const name = typeof doc === 'string' ? `Document ${index + 1}` : doc.name || `Document ${index + 1}`;
        return {
          id: `doc-${index}`,
          name: name,
          type: 'document' as const,
          url: url,
          uploadDate: new Date().toISOString(),
          status: 'approved' as const
        };
      }),
      virtual360Images: churchData.virtualTour360 || [],

      // Legacy fields
      name: churchData.name || '',
      location: churchData.location || '',
      priest: churchData.assignedPriest || '',
      founded: churchData.foundingYear?.toString() || '',
      classification: churchData.classification || '',
      description: churchData.description || '',
      status: churchData.status || 'draft',
      capacity: 0,
      architecturalStyle: churchData.architecturalStyle || '',
      patronSaint: '',
      diocese: churchData.diocese || 'tagbilaran'
    };
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Pending Review' },
      approved: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Approved' },
      heritage_review: { color: 'bg-purple-100 text-purple-800 border-purple-300', label: 'Heritage Review' },
      under_review: { color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Under Review' },
      draft: { color: 'bg-gray-100 text-gray-800 border-gray-300', label: 'Draft' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={`${config.color} font-medium`}>{config.label}</Badge>;
  };

  const handleFormSave = (data: ChurchInfo) => {
    onSave?.(data);
  };

  const handleFormSubmit = (data: ChurchInfo) => {
    onSubmit?.(data);
    setEditMode(false);
  };

  // Cast church to extended type for view mode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const churchData = church as any;

  if (editMode) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl w-[95vw] h-[95vh] flex flex-col p-0 overflow-hidden [&>button.sr-only+button]:hidden">
          {/* Custom Close Button */}
          <div className="absolute right-3 top-3 z-[9999]">
            <button
              onClick={onClose}
              className="rounded-full p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors shadow-sm cursor-pointer"
              aria-label="Close"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold">Edit Church Entry</DialogTitle>
                <DialogDescription>
                  {isMuseumResearcher 
                    ? 'You can edit historical information and add documents only'
                    : 'Review and edit church information for accuracy'
                  }
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(false)}
                className="ml-4 mr-10"
              >
                <Eye className="w-4 h-4 mr-1" /> View Mode
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {isMuseumResearcher && (
              <Alert className="mx-6 mt-4 border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Heritage Reviewer Access:</strong> You can edit the <strong>Historical</strong> tab and add <strong>Documents</strong> in the Media tab. 
                  Basic Info and Pastoral sections are managed by the Parish Secretary.
                </AlertDescription>
              </Alert>
            )}
            <div className="p-0">
              <ChurchProfileForm
                initialData={convertToChurchInfo(church)}
                onSave={handleFormSave}
                onSubmit={handleFormSubmit}
                isSubmitting={isSubmitting}
                showCancelButton={true}
                onCancel={() => setEditMode(false)}
                isModal={true}
                isChanceryEdit={true}
                isMuseumResearcher={isMuseumResearcher}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Get primary image for hero section
  const primaryImage = churchData.images?.[0] || null;
  const hasMultipleImages = (churchData.images?.length || 0) > 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[92vw] h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-gradient-to-b from-slate-50 to-white [&>button]:hidden">
        {/* Hero Header with Image Background */}
        <div className="relative flex-shrink-0">
          {/* Custom Close Button - positioned in top right corner */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-[9999] rounded-full p-1.5 bg-black/50 hover:bg-black/70 text-white transition-colors shadow-xl cursor-pointer ring-2 ring-white/30"
            aria-label="Close"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
          {/* Background Image or Gradient */}
          <div className="absolute inset-0 h-44 overflow-hidden">
            {primaryImage ? (
              <>
                <img 
                  src={primaryImage} 
                  alt={church.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-slate-50" />
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50" />
              </div>
            )}
          </div>

          {/* Header Content */}
          <DialogHeader className="relative z-10 px-6 pt-5 pb-16">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusBadge(church.status)}
                  {church.classification && church.classification !== 'non-heritage' && (
                    <Badge className="bg-amber-500/90 text-white border-0 shadow-sm">
                      <Landmark className="w-3 h-3 mr-1" />
                      {church.classification === 'NCT' ? 'National Cultural Treasure' : 
                       church.classification === 'ICP' ? 'Important Cultural Property' : church.classification}
                    </Badge>
                  )}
                </div>
                <DialogTitle className={`text-2xl font-bold flex items-center gap-3 ${primaryImage ? 'text-white drop-shadow-lg' : 'text-white'}`}>
                  <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                    <ChurchIcon className="w-6 h-6" />
                  </div>
                  {church.name}
                </DialogTitle>
                <DialogDescription className={`flex items-center gap-2 mt-2 ${primaryImage ? 'text-white/90' : 'text-white/90'}`}>
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium">{(churchData.location as string) || church.municipality}, {church.diocese === 'tagbilaran' ? 'Diocese of Tagbilaran' : 'Apostolic Vicariate of Talibon'}</span>
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2 mr-12">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditMode(true)}
                  className="bg-white/90 hover:bg-white text-gray-800 shadow-lg backdrop-blur-sm"
                >
                  <Edit3 className="w-4 h-4 mr-1.5" /> Edit Church
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Quick Stats Cards - Floating */}
          <div className="relative z-20 px-6 -mt-8">
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white rounded-xl p-3 shadow-lg border border-gray-100">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Founded</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{churchData.foundingYear || '—'}</p>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-lg border border-gray-100">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <User className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Parish Priest</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">{churchData.assignedPriest || '—'}</p>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-lg border border-gray-100">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <Landmark className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Style</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">{church.architecturalStyle || '—'}</p>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-lg border border-gray-100">
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <Camera className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Media</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{(churchData.images?.length || 0) + (churchData.documents?.length || 0)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden px-6 pb-6 pt-4">
          <ScrollArea className="h-full pr-4">
            {/* Review Note from Museum Researcher */}
            {churchData.lastReviewNote && church.status === 'pending' && (
              <Alert className="mb-4 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm">
                <MessageSquare className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Note from Heritage Reviewer:</strong> {churchData.lastReviewNote as string}
                </AlertDescription>
              </Alert>
            )}
            
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-gray-100/80 p-1 rounded-xl h-12">
                <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="historical" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                  <History className="w-4 h-4" />
                  <span className="hidden sm:inline">History</span>
                </TabsTrigger>
                <TabsTrigger value="pastoral" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Pastoral</span>
                </TabsTrigger>
                <TabsTrigger value="media" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  <span className="hidden sm:inline">Media</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Church Details Card */}
                  <Card className="shadow-sm border-0 bg-white/80 backdrop-blur">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        Church Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <ChurchIcon className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Church Name</p>
                            <p className="text-sm font-semibold text-gray-900">{church.name}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Full Parish Name</p>
                            <p className="text-sm font-medium text-gray-900">{(churchData.fullName as string) || 'Not specified'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Location</p>
                            <p className="text-sm font-medium text-gray-900">{church.municipality}, Bohol</p>
                            {churchData.location && (
                              <p className="text-xs text-gray-500 mt-0.5">{churchData.location as string}</p>
                            )}
                          </div>
                        </div>
                        {churchData.coordinates && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <Globe className="w-4 h-4 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Coordinates</p>
                              <p className="text-sm font-mono text-gray-700">
                                {(churchData.coordinates as { latitude: number; longitude: number }).latitude?.toFixed(6)}, 
                                {(churchData.coordinates as { latitude: number; longitude: number }).longitude?.toFixed(6)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Contact Information Card */}
                  <Card className="shadow-sm border-0 bg-white/80 backdrop-blur">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800">
                        <Phone className="w-4 h-4 text-blue-600" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {churchData.contactInfo ? (
                        <div className="space-y-3">
                          {(churchData.contactInfo as { phone?: string }).phone && (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                <Phone className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">Phone</p>
                                <p className="text-sm font-semibold text-gray-900">{(churchData.contactInfo as { phone: string }).phone}</p>
                              </div>
                            </div>
                          )}
                          {(churchData.contactInfo as { email?: string }).email && (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <Mail className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">Email</p>
                                <p className="text-sm font-semibold text-gray-900">{(churchData.contactInfo as { email: string }).email}</p>
                              </div>
                            </div>
                          )}
                          {(churchData.contactInfo as { website?: string }).website && (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => window.open((churchData.contactInfo as { website: string }).website, '_blank')}>
                              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                <Globe className="w-5 h-5 text-purple-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-medium text-gray-500">Website</p>
                                <p className="text-sm font-semibold text-blue-600 hover:underline">{(churchData.contactInfo as { website: string }).website}</p>
                              </div>
                              <ExternalLink className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          {(churchData.contactInfo as { facebookPage?: string }).facebookPage && (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => window.open((churchData.contactInfo as { facebookPage: string }).facebookPage, '_blank')}>
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <Facebook className="w-5 h-5 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-medium text-gray-500">Facebook</p>
                                <p className="text-sm font-semibold text-blue-600 hover:underline truncate">Facebook Page</p>
                              </div>
                              <ExternalLink className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          {!((churchData.contactInfo as { phone?: string; email?: string; website?: string; facebookPage?: string }).phone || 
                             (churchData.contactInfo as { phone?: string; email?: string; website?: string; facebookPage?: string }).email ||
                             (churchData.contactInfo as { phone?: string; email?: string; website?: string; facebookPage?: string }).website ||
                             (churchData.contactInfo as { phone?: string; email?: string; website?: string; facebookPage?: string }).facebookPage) && (
                            <div className="text-center py-6 text-gray-500">
                              <Phone className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                              <p className="text-sm">No contact information available</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500">
                          <Phone className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No contact information available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Historical Tab */}
              <TabsContent value="historical" className="mt-6 space-y-6">
                <Card className="shadow-sm border-0 bg-white/80 backdrop-blur">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800">
                      <History className="w-4 h-4 text-amber-600" />
                      Historical Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Quick Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
                        <Calendar className="w-5 h-5 text-amber-600 mb-2" />
                        <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Founded</p>
                        <p className="text-xl font-bold text-amber-900">{churchData.foundingYear || '—'}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100">
                        <Landmark className="w-5 h-5 text-purple-600 mb-2" />
                        <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Style</p>
                        <p className="text-sm font-bold text-purple-900">{church.architecturalStyle || '—'}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                        <Badge variant="outline" className={`${
                          church.classification === 'NCT' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          church.classification === 'ICP' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                          'bg-gray-100 text-gray-600 border-gray-300'
                        }`}>
                          {church.classification === 'NCT' ? 'National Cultural Treasure' :
                           church.classification === 'ICP' ? 'Important Cultural Property' :
                           'Not classified'}
                        </Badge>
                      </div>
                    </div>

                    {/* Text Sections */}
                    {churchData.founders && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-500" /> Founders
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed pl-6">{churchData.founders as string}</p>
                      </div>
                    )}

                    {churchData.historicalBackground && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-gray-500" /> Historical Background
                        </h4>
                        <div className="text-sm text-gray-600 leading-relaxed pl-6 max-h-48 overflow-y-auto">
                          {churchData.historicalBackground as string}
                        </div>
                      </div>
                    )}

                    {churchData.architecturalFeatures && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-500" /> Architectural Features
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed pl-6">{churchData.architecturalFeatures as string}</p>
                      </div>
                    )}

                    {churchData.culturalSignificance && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Landmark className="w-4 h-4 text-gray-500" /> Cultural Significance
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed pl-6">{churchData.culturalSignificance as string}</p>
                      </div>
                    )}

                    {churchData.heritageInformation && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Info className="w-4 h-4 text-gray-500" /> Heritage Information
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed pl-6">{churchData.heritageInformation as string}</p>
                      </div>
                    )}

                    {!churchData.founders && !churchData.historicalBackground && !churchData.architecturalFeatures && !churchData.culturalSignificance && !churchData.heritageInformation && (
                      <div className="text-center py-8 text-gray-500">
                        <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No historical information available yet</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => setEditMode(true)}>
                          <Edit3 className="w-4 h-4 mr-1" /> Add Historical Details
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Pastoral Tab */}
              <TabsContent value="pastoral" className="mt-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Priest & Feast Day Card */}
                  <Card className="shadow-sm border-0 bg-white/80 backdrop-blur">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800">
                        <User className="w-4 h-4 text-blue-600" />
                        Parish Leadership
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                        <div className="w-14 h-14 rounded-full bg-blue-200 flex items-center justify-center">
                          <User className="w-7 h-7 text-blue-700" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Parish Priest</p>
                          <p className="text-lg font-bold text-gray-900">{churchData.assignedPriest || 'Not assigned'}</p>
                        </div>
                      </div>
                      
                      {churchData.feastDay && (
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                          <div className="w-14 h-14 rounded-full bg-amber-200 flex items-center justify-center">
                            <Calendar className="w-7 h-7 text-amber-700" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Feast Day</p>
                            <p className="text-lg font-bold text-gray-900">{churchData.feastDay as string}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Mass Schedules Card */}
                  <Card className="shadow-sm border-0 bg-white/80 backdrop-blur">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        Mass Schedules
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {churchData.massSchedules && (churchData.massSchedules as Array<unknown>).length > 0 ? (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {(() => {
                            const schedules = churchData.massSchedules as Array<{ day: string; time: string; endTime?: string; language?: string; isFbLive?: boolean }>;
                            const allWeekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                            
                            const schedulesByDay: Record<string, typeof schedules> = {
                              Sunday: schedules.filter(s => s.day === 'Sunday'),
                              Monday: schedules.filter(s => s.day === 'Monday'),
                              Tuesday: schedules.filter(s => s.day === 'Tuesday'),
                              Wednesday: schedules.filter(s => s.day === 'Wednesday'),
                              Thursday: schedules.filter(s => s.day === 'Thursday'),
                              Friday: schedules.filter(s => s.day === 'Friday'),
                              Saturday: schedules.filter(s => s.day === 'Saturday'),
                            };

                            const getScheduleKey = (s: typeof schedules[0]) => 
                              `${s.time}-${s.language || ''}-${s.isFbLive || false}`;

                            const weekdayKeys = allWeekdays.map(day => 
                              new Set(schedulesByDay[day].map(getScheduleKey))
                            );
                            const dailyKeys = new Set<string>();
                            if (weekdayKeys[0]) {
                              weekdayKeys[0].forEach(key => {
                                if (weekdayKeys.every(dayKeys => dayKeys.has(key))) {
                                  dailyKeys.add(key);
                                }
                              });
                            }

                            const dailySchedules = schedulesByDay['Monday'].filter(s => dailyKeys.has(getScheduleKey(s)));
                            
                            const formatTo12Hour = (time: string) => {
                              if (!time) return '';
                              if (time.toUpperCase().includes('AM') || time.toUpperCase().includes('PM')) return time;
                              const match = time.match(/(\d{1,2}):(\d{2})/);
                              if (!match) return time;
                              const hours = parseInt(match[1]);
                              const minutes = parseInt(match[2]);
                              const period = hours >= 12 ? 'PM' : 'AM';
                              const displayHours = hours % 12 || 12;
                              return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
                            };

                            const renderSchedule = (schedule: typeof schedules[0], index: number) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="font-medium">{formatTo12Hour(schedule.time)}</span>
                                {schedule.endTime && <span className="text-gray-400">– {formatTo12Hour(schedule.endTime)}</span>}
                                {schedule.language && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    🌐 {schedule.language}
                                  </Badge>
                                )}
                                {schedule.isFbLive && (
                                  <Badge className="text-xs bg-red-100 text-red-700 border-0">📺 FB Live</Badge>
                                )}
                              </div>
                            );

                            const sortByTime = (arr: typeof schedules) => 
                              [...arr].sort((a, b) => {
                                const getTimeValue = (t: string) => {
                                  if (!t) return 0;
                                  const match = t.match(/(\d{1,2}):(\d{2})/);
                                  if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
                                  return 0;
                                };
                                return getTimeValue(a.time) - getTimeValue(b.time);
                              });

                            return (
                              <div className="space-y-4">
                                {schedulesByDay['Sunday'].length > 0 && (
                                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                                    <div className="font-semibold text-amber-800 mb-2 text-sm">☀️ Sunday</div>
                                    <div className="space-y-1.5 pl-2">
                                      {sortByTime(schedulesByDay['Sunday']).map(renderSchedule)}
                                    </div>
                                  </div>
                                )}
                                {dailySchedules.length > 0 && (
                                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                                    <div className="font-semibold text-blue-800 mb-2 text-sm">📅 Daily (Mon–Fri)</div>
                                    <div className="space-y-1.5 pl-2">
                                      {sortByTime(dailySchedules).map(renderSchedule)}
                                    </div>
                                  </div>
                                )}
                                {schedulesByDay['Saturday'].length > 0 && (
                                  <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                                    <div className="font-semibold text-purple-800 mb-2 text-sm">🌙 Saturday</div>
                                    <div className="space-y-1.5 pl-2">
                                      {sortByTime(schedulesByDay['Saturday']).map(renderSchedule)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500">
                          <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No mass schedules available</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Media Tab */}
              <TabsContent value="media" className="mt-6 space-y-6">
                {/* Images Gallery */}
                <Card className="shadow-sm border-0 bg-white/80 backdrop-blur">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800">
                      <ImageIcon className="w-4 h-4 text-purple-600" />
                      Photo Gallery
                      {churchData.images && (
                        <Badge variant="secondary" className="ml-2">{(churchData.images as Array<string>).length}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {churchData.images && (churchData.images as Array<string>).length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {(churchData.images as Array<string>).map((image, index) => (
                          <div 
                            key={index} 
                            className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-emerald-400 transition-all"
                            onClick={() => window.open(image, '_blank')}
                          >
                            <img
                              src={image}
                              alt={`${church.name} - Photo ${index + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No photos available</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => setEditMode(true)}>
                          <Camera className="w-4 h-4 mr-1" /> Add Photos
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 360° Tours */}
                {churchData.virtualTour360 && (churchData.virtualTour360 as Array<unknown>).length > 0 && (
                  <Card className="shadow-sm border-0 bg-white/80 backdrop-blur">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800">
                        <Eye className="w-4 h-4 text-blue-600" />
                        360° Virtual Tours
                        <Badge variant="secondary" className="ml-2">{(churchData.virtualTour360 as Array<unknown>).length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {(churchData.virtualTour360 as Array<unknown>).map((tour, index) => (
                          <div key={index} className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 hover:shadow-md transition-shadow cursor-pointer">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
                                <Eye className="w-5 h-5 text-blue-700" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">Tour {index + 1}</p>
                                <p className="text-xs text-gray-500">360° View</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Documents */}
                <Card className="shadow-sm border-0 bg-white/80 backdrop-blur">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800">
                      <FileText className="w-4 h-4 text-amber-600" />
                      Documents
                      {churchData.documents && (
                        <Badge variant="secondary" className="ml-2">{(churchData.documents as Array<unknown>).length}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {churchData.documents && (churchData.documents as Array<unknown>).length > 0 ? (
                      <div className="space-y-2">
                        {(churchData.documents as Array<unknown>).map((doc, index) => {
                          const docUrl = typeof doc === 'string' ? doc : (doc as { url?: string })?.url;
                          const docName = typeof doc === 'string' 
                            ? `Document ${index + 1}` 
                            : (doc as { name?: string })?.name || `Document ${index + 1}`;
                          
                          return (
                            <div 
                              key={index} 
                              className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-amber-200 transition-all cursor-pointer group"
                              onClick={() => docUrl && window.open(docUrl, '_blank', 'noopener,noreferrer')}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                  <FileText className="w-5 h-5 text-amber-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-amber-700">{docName}</p>
                                  <p className="text-xs text-gray-500">Click to open</p>
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-600 transition-colors" />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No documents available</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => setEditMode(true)}>
                          <FileText className="w-4 h-4 mr-1" /> Add Documents
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}