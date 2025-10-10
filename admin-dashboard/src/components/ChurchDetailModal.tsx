import { useState } from 'react';
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
  Eye
} from 'lucide-react';
import type { Church } from '@/lib/churches';
import { ChurchProfileForm } from '@/components/parish/ChurchProfileForm';
import { ChurchInfo } from '@/components/parish/types';

interface Props {
  church: Church | null;
  isOpen: boolean;
  onClose: () => void;
  mode: 'view' | 'edit';
  onSave?: (data: ChurchInfo) => void;
  onSubmit?: (data: ChurchInfo) => void;
  isSubmitting?: boolean;
}

export function ChurchDetailModal({
  church,
  isOpen,
  onClose,
  mode,
  onSave,
  onSubmit,
  isSubmitting = false
}: Props) {
  const [editMode, setEditMode] = useState(mode === 'edit');

  if (!church) return null;

  // Convert Church to ChurchInfo format for editing
  const convertToChurchInfo = (church: Church): ChurchInfo => {
    return {
      churchName: church.name || '',
      parishName: church.fullName || '',
      locationDetails: {
        streetAddress: church.contactInfo?.address?.split(',')[0] || '',
        barangay: church.contactInfo?.address?.split(',')[1]?.trim() || '',
        municipality: church.municipality || '',
        province: 'Bohol'
      },
      coordinates: church.coordinates ? {
        lat: church.coordinates.latitude || 0,
        lng: church.coordinates.longitude || 0
      } : { lat: 0, lng: 0 },
      historicalDetails: {
        foundingYear: church.foundingYear?.toString() || '',
        founders: church.founders || '',
        architecturalStyle: church.architecturalStyle || '',
        historicalBackground: church.historicalBackground || church.description || '',
        majorHistoricalEvents: church.culturalSignificance || '',
        heritageClassification: church.classification === 'NCT' ? 'National Cultural Treasures' :
                               church.classification === 'ICP' ? 'Important Cultural Properties' : 'None',
        religiousClassification: 'None',
        supportingDocuments: []
      },
      currentParishPriest: church.assignedPriest || '',
      massSchedules: (church.massSchedules || []).map(schedule => ({
        day: schedule.day || '',
        time: schedule.time?.split(' - ')[0] || '',
        endTime: schedule.time?.split(' - ')[1] || '',
        language: schedule.type?.replace(' (FB Live)', '') || 'Filipino',
        isFbLive: schedule.type?.includes('(FB Live)') || false
      })),
      contactInfo: {
        phone: church.contactInfo?.phone || '',
        email: church.contactInfo?.email || '',
        website: '',
        facebookPage: ''
      },
      photos: church.images || [],
      documents: church.documents || [],
      virtual360Images: church.virtualTour360 || [],

      // Legacy fields
      name: church.name || '',
      location: church.location || '',
      priest: church.assignedPriest || '',
      founded: church.foundingYear?.toString() || '',
      classification: church.classification || '',
      description: church.description || '',
      status: church.status || 'draft',
      capacity: 0,
      architecturalStyle: church.architecturalStyle || '',
      patronSaint: '',
      diocese: church.diocese || 'tagbilaran'
    };
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Pending Review' },
      approved: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800 border-red-300', label: 'Rejected' },
      heritage_review: { color: 'bg-purple-100 text-purple-800 border-purple-300', label: 'Heritage Review' },
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

  if (editMode) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl w-[95vw] h-[95vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-semibold">Edit Church Entry</DialogTitle>
                <DialogDescription>
                  Review and edit church information for accuracy
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
                {church.location}
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
                      <p className="text-sm">{church.fullName || 'Not specified'}</p>
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
                    <p className="text-sm">{church.location}</p>
                  </div>

                  {church.coordinates && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Coordinates</label>
                      <p className="text-sm">
                        {church.coordinates.latitude}, {church.coordinates.longitude}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {church.contactInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {church.contactInfo.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{church.contactInfo.phone}</span>
                      </div>
                    )}
                    {church.contactInfo.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{church.contactInfo.email}</span>
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
                        <span className="text-sm">{church.foundingYear || 'Not specified'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Architectural Style</label>
                      <p className="text-sm capitalize">{church.architecturalStyle || 'Not specified'}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Classification</label>
                    <p className="text-sm">
                      <Badge variant="outline" className="mt-1">
                        {church.classification === 'NCT' ? 'National Cultural Treasure' :
                         church.classification === 'ICP' ? 'Important Cultural Property' :
                         church.classification || 'Not classified'}
                      </Badge>
                    </p>
                  </div>

                  {church.founders && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Founders</label>
                      <p className="text-sm">{church.founders}</p>
                    </div>
                  )}

                  {church.historicalBackground && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Historical Background</label>
                      <p className="text-sm whitespace-pre-wrap">{church.historicalBackground}</p>
                    </div>
                  )}

                  {church.culturalSignificance && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Cultural Significance</label>
                      <p className="text-sm whitespace-pre-wrap">{church.culturalSignificance}</p>
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
                  {church.assignedPriest && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Assigned Priest</label>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{church.assignedPriest}</span>
                      </div>
                    </div>
                  )}

                  {church.massSchedules && church.massSchedules.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Mass Schedules</label>
                      <div className="space-y-2 mt-2">
                        {church.massSchedules.map((schedule, index) => (
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
              {church.images && church.images.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ImageIcon className="w-5 h-5" />
                      Images ({church.images.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      {church.images.slice(0, 6).map((image, index) => (
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
                    {church.images.length > 6 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        +{church.images.length - 6} more images
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {church.virtualTour360 && church.virtualTour360.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">360° Virtual Tours ({church.virtualTour360.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {church.virtualTour360.map((tour, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">360° Tour {index + 1}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {church.documents && church.documents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Documents ({church.documents.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {church.documents.map((doc, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">Document {index + 1}</span>
                        </div>
                      ))}
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