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
  MessageSquare
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
        supportingDocuments: [],
        architecturalFeatures: churchData.architecturalFeatures || '',
        heritageInformation: churchData.heritageInformation || ''
      },
      currentParishPriest: churchData.assignedPriest || '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      massSchedules: (churchData.massSchedules || []).map((schedule: any) => ({
        day: schedule.day || '',
        time: schedule.time?.split(' - ')[0] || '',
        endTime: schedule.time?.split(' - ')[1] || '',
        language: schedule.type?.replace(' (FB Live)', '') || 'Filipino',
        isFbLive: schedule.type?.includes('(FB Live)') || false
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
        <DialogContent className="max-w-7xl w-[95vw] h-[95vh] flex flex-col p-0 overflow-hidden">
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
                className="ml-4"
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[90vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {church.name}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <MapPin className="w-4 h-4" />
                {(churchData.location as string) || church.municipality}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(church.status)}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(true)}
              >
                <Edit3 className="w-4 h-4 mr-1" /> Edit
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6 pb-6">
          <ScrollArea className="h-full pr-4">
            {/* Review Note from Museum Researcher */}
            {churchData.lastReviewNote && church.status === 'pending' && (
              <Alert className="mb-4 border-amber-200 bg-amber-50">
                <MessageSquare className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Note from Heritage Reviewer:</strong> {churchData.lastReviewNote as string}
                </AlertDescription>
              </Alert>
            )}
            <div className="mt-4">
              <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="historical">Historical</TabsTrigger>
              <TabsTrigger value="pastoral">Pastoral</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Church Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Church Name</label>
                      <p className="text-sm">{church.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Full Parish Name</label>
                      <p className="text-sm">{(churchData.fullName as string) || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Municipality</label>
                      <p className="text-sm">{church.municipality}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Diocese</label>
                      <p className="text-sm capitalize">{church.diocese}</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <p className="text-sm">{(churchData.location as string) || 'Not specified'}</p>
                  </div>

                  {churchData.coordinates && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Coordinates</label>
                      <p className="text-sm">
                        {(churchData.coordinates as { latitude: number; longitude: number }).latitude}, {(churchData.coordinates as { latitude: number; longitude: number }).longitude}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {churchData.contactInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(churchData.contactInfo as { phone?: string; email?: string }).phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{(churchData.contactInfo as { phone: string }).phone}</span>
                      </div>
                    )}
                    {(churchData.contactInfo as { phone?: string; email?: string }).email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{(churchData.contactInfo as { email: string }).email}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="historical" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Historical Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Founding Year</label>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{(churchData.foundingYear as number) || 'Not specified'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Architectural Style</label>
                      <p className="text-sm capitalize">{church.architecturalStyle || 'Not specified'}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Classification</label>
                    <div className="text-sm mt-1">
                      <Badge variant="outline">
                        {church.classification === 'NCT' ? 'National Cultural Treasure' :
                         church.classification === 'ICP' ? 'Important Cultural Property' :
                         church.classification || 'Not classified'}
                      </Badge>
                    </div>
                  </div>

                  {churchData.founders && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Founders</label>
                      <p className="text-sm">{churchData.founders as string}</p>
                    </div>
                  )}

                  {churchData.historicalBackground && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Historical Background</label>
                      <p className="text-sm whitespace-pre-wrap">{churchData.historicalBackground as string}</p>
                    </div>
                  )}

                  {churchData.culturalSignificance && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Cultural Significance</label>
                      <p className="text-sm whitespace-pre-wrap">{churchData.culturalSignificance as string}</p>
                    </div>
                  )}

                  {churchData.architecturalFeatures && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Architectural Features</label>
                      <p className="text-sm whitespace-pre-wrap">{churchData.architecturalFeatures as string}</p>
                    </div>
                  )}

                  {churchData.heritageInformation && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Heritage Information</label>
                      <p className="text-sm whitespace-pre-wrap">{churchData.heritageInformation as string}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pastoral" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pastoral Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {churchData.assignedPriest && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Assigned Priest</label>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{churchData.assignedPriest as string}</span>
                      </div>
                    </div>
                  )}

                  {churchData.massSchedules && (churchData.massSchedules as Array<unknown>).length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Mass Schedules</label>
                      <div className="space-y-2 mt-2">
                        {(churchData.massSchedules as Array<{ day: string; time: string; type?: string }>).map((schedule, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{schedule.day}:</span>
                            <span>{schedule.time}</span>
                            {schedule.type && (
                              <Badge variant="outline" className="text-xs">
                                {schedule.type}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="media" className="space-y-4 mt-4">
              {churchData.images && (churchData.images as Array<string>).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ImageIcon className="w-5 h-5" />
                      Images ({(churchData.images as Array<string>).length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      {(churchData.images as Array<string>).slice(0, 6).map((image, index) => (
                        <div key={index} className="aspect-square bg-muted rounded border">
                          <img
                            src={image}
                            alt={`Church image ${index + 1}`}
                            className="w-full h-full object-cover rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    {(churchData.images as Array<string>).length > 6 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        +{(churchData.images as Array<string>).length - 6} more images
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {churchData.virtualTour360 && (churchData.virtualTour360 as Array<unknown>).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">360° Virtual Tours ({(churchData.virtualTour360 as Array<unknown>).length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(churchData.virtualTour360 as Array<unknown>).map((tour, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">360° Tour {index + 1}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {churchData.documents && (churchData.documents as Array<unknown>).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Documents ({(churchData.documents as Array<unknown>).length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(churchData.documents as Array<unknown>).map((doc, index) => {
                        // Handle both string URLs and object documents
                        const docUrl = typeof doc === 'string' ? doc : (doc as { url?: string })?.url;
                        const docName = typeof doc === 'string' 
                          ? `Document ${index + 1}` 
                          : (doc as { name?: string })?.name || `Document ${index + 1}`;
                        
                        return (
                          <div 
                            key={index} 
                            className="flex items-center justify-between gap-2 p-3 border rounded hover:bg-gray-50 transition-colors cursor-pointer group"
                            onClick={() => docUrl && window.open(docUrl, '_blank', 'noopener,noreferrer')}
                            title="Click to open document"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate group-hover:text-blue-600 transition-colors">
                                {docName}
                              </span>
                            </div>
                            {docUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(docUrl, '_blank', 'noopener,noreferrer');
                                }}
                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 flex-shrink-0"
                                title="Open document in new tab"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}