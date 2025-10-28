import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Church as ChurchIcon,
  Edit,
  MapPin,
  CheckCircle,
  Clock,
  AlertCircle,
  Phone,
  Mail,
  Globe,
  Loader2,
  Building
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { ChurchInfo } from '@/components/parish/types';
import { ChurchProfileForm } from '@/components/parish/ChurchProfileForm';
import { ParishReports } from '@/components/parish/ParishReports';
import { ParishAccount } from '@/components/parish/ParishAccount';
import { ParishAnnouncements } from '@/components/parish/ParishAnnouncements';
import { ParishFeedback } from '@/components/parish/ParishFeedback';
import { ChurchService } from '@/services/churchService';
import type { ArchitecturalStyle, ChurchClassification, Church } from '@/types/church';

// Simplified Parish Dashboard - Shows form on first access, then Parish Profile after approval
const ParishDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [churchId, setChurchId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [existingChurch, setExistingChurch] = useState<Church | null>(null);

  // Core church data
  const [churchInfo, setChurchInfo] = useState<ChurchInfo>(() => ({
    churchName: userProfile?.parish || '',
    parishName: '',
    locationDetails: {
      streetAddress: '',
      barangay: '',
      municipality: '',
      province: 'Bohol'
    },
    coordinates: { lat: 0, lng: 0 },
    historicalDetails: {
      foundingYear: '',
      founders: '',
      architecturalStyle: '',
      historicalBackground: '',
      majorHistoricalEvents: '',
      heritageClassification: 'None',
      religiousClassification: 'None',
      supportingDocuments: []
    },
    currentParishPriest: '',
    massSchedules: [],
    contactInfo: {
      phone: '',
      email: '',
      website: '',
      facebookPage: ''
    },
    photos: [],
    documents: [],
    virtual360Images: [],
    
    // Legacy fields for compatibility
    name: userProfile?.parish || '',
    location: '',
    priest: '',
    founded: '',
    classification: 'Parish Church',
    description: '',
    status: 'draft',
    capacity: 0,
    architecturalStyle: '',
    patronSaint: '',
    diocese: userProfile?.diocese || 'tagbilaran'
  }));

  // Convert Church from Firebase to ChurchInfo format
  const convertChurchToInfo = useCallback((church: Church): ChurchInfo => {
    return {
      churchName: church.name || '',
      parishName: church.fullName || '',
      locationDetails: {
        streetAddress: church.contactInfo?.address?.split(',')[0]?.trim() || '',
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
      photos: (church.images || []).map((url, index) => ({
        id: `photo-${index}`,
        name: `Photo ${index + 1}`,
        type: 'photo' as const,
        url: url,
        uploadDate: new Date().toISOString(),
        status: 'approved' as const
      })),
      documents: (church.documents || []).map((url, index) => ({
        id: `doc-${index}`,
        name: `Document ${index + 1}`,
        type: 'document' as const,
        url: url,
        uploadDate: new Date().toISOString(),
        status: 'approved' as const
      })),
      virtual360Images: (church.virtualTour360 || [])
        .map((url, index) => {
          // Validate URL and aspect ratio (basic check)
          const isValidUrl = typeof url === 'string' && url.trim() && url.startsWith('http');
          // Optionally, add more checks for file extension or known panorama formats
          return {
            id: `360-${index}`,
            url: url,
            name: `360 Image ${index + 1}`,
            uploadDate: new Date().toISOString(),
            status: isValidUrl ? 'approved' : 'rejected',
            isValid: isValidUrl,
            category: 'interior' as const
          };
        })
        .filter(img => img.isValid),

      // Legacy fields
      name: church.name || '',
      location: church.location || '',
      priest: church.assignedPriest || '',
      founded: church.foundingYear?.toString() || '',
      classification: church.classification || '',
      description: church.description || '',
      status: church.status === 'under_review' ? 'pending' :
              church.status === 'needs_revision' ? 'pending' :
              church.status || 'pending',
      capacity: 0,
      architecturalStyle: church.architecturalStyle || '',
      patronSaint: '',
      diocese: church.diocese || userProfile?.diocese || 'tagbilaran'
    };
  }, [userProfile?.diocese]);

  // Load existing church data from Firebase
  useEffect(() => {
    if (userProfile && userProfile.parish) {
      setIsLoading(true);

      // Try to load existing church data using parish name as document ID
      ChurchService.getChurch(userProfile.parish)
        .then((church) => {
          if (church) {
            // Church exists in Firebase - load the data
            setExistingChurch(church);
            setChurchId(church.id);
            setChurchInfo(convertChurchToInfo(church));

            // Show form only if status is pending or needs revision
            if (church.status === 'pending' || church.status === 'needs_revision') {
              setShowProfileForm(true);
            } else {
              setShowProfileForm(false);
            }
          } else {
            // No existing church - initialize with default data
            setChurchInfo(prev => ({
              ...prev,
              churchName: userProfile.parish,
              name: userProfile.parish,
              diocese: userProfile.diocese
            }));
            setShowProfileForm(true);
          }
        })
        .catch((error) => {
          console.error('Error loading church data:', error);
          // Fallback to default initialization
          setChurchInfo(prev => ({
            ...prev,
            churchName: userProfile.parish,
            name: userProfile.parish,
            diocese: userProfile.diocese
          }));
          setShowProfileForm(true);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [userProfile, convertChurchToInfo]);

  // Set up real-time listener for church updates
  useEffect(() => {
    if (!userProfile?.parish) return;

    let previousStatus: string | null = null;

    const unsubscribe = ChurchService.subscribeToChurches(
      (churches) => {
        // Find our parish's church in the results
        const parishChurch = churches.find(church => church.id === userProfile.parish);
        if (parishChurch) {
          // Check if status changed to show notification
          if (previousStatus && previousStatus !== parishChurch.status) {
            const statusMessages = {
              'approved': 'Your church profile has been approved!',
              'needs_revision': 'Chancery office has requested revisions to your church profile.',
              'heritage_review': 'Your church has been forwarded for heritage review.',
              'pending': 'Your church profile is now under review.',
              'rejected': 'Your church profile submission needs attention.'
            };

            const message = statusMessages[parishChurch.status as keyof typeof statusMessages] ||
                           `Church status updated to: ${parishChurch.status}`;

            toast({
              title: "Church Profile Updated",
              description: message,
              variant: parishChurch.status === 'approved' ? 'default' :
                      parishChurch.status === 'needs_revision' ? 'destructive' : 'default'
            });
          }

          previousStatus = parishChurch.status;
          setExistingChurch(parishChurch);
          setChurchInfo(convertChurchToInfo(parishChurch));
        }
      },
      {
        diocese: userProfile.diocese,
        // No status filter to get church regardless of status
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userProfile, toast, convertChurchToInfo]);

  // Mark dashboard as visited
  const markDashboardVisited = () => {
    const visitKey = `parish_dashboard_visited_${userProfile?.email || 'user'}`;
    localStorage.setItem(visitKey, 'true');
  };

  // Show profile form immediately on first visit
  useEffect(() => {
    const visitKey = `parish_dashboard_visited_${userProfile?.email || 'user'}`;
    const isFirstVisit = !localStorage.getItem(visitKey);
    
    // Show form immediately on first visit OR if profile status is pending/incomplete
    if (isFirstVisit || churchInfo.status === 'pending' || !churchInfo.churchName) {
      setShowProfileForm(true);
    }
  }, [churchInfo.status, churchInfo.churchName, userProfile?.email]);

  // Handle activeTab changes from sidebar
  useEffect(() => {
    if (activeTab === 'reports') {
      if (churchInfo.status === 'approved') {
        setShowReports(true);
        setShowProfileForm(false);
        setShowAccount(false);
        setShowAnnouncements(false);
        setShowFeedback(false);
      } else {
        toast({
          title: "Profile Not Approved",
          description: "Reports are only available after your church profile is approved.",
          variant: "destructive"
        });
        setActiveTab('overview');
      }
    } else if (activeTab === 'announcements') {
      if (churchInfo.status === 'approved') {
        setShowAnnouncements(true);
        setShowProfileForm(false);
        setShowAccount(false);
        setShowReports(false);
        setShowFeedback(false);
      } else {
        toast({
          title: "Profile Not Approved",
          description: "Announcements management is only available after your church profile is approved.",
          variant: "destructive"
        });
        setActiveTab('overview');
      }
    } else if (activeTab === 'feedback') {
      if (churchInfo.status === 'approved') {
        setShowFeedback(true);
        setShowProfileForm(false);
        setShowAccount(false);
        setShowReports(false);
        setShowAnnouncements(false);
      } else {
        toast({
          title: "Profile Not Approved",
          description: "Feedback management is only available after your church profile is approved.",
          variant: "destructive"
        });
        setActiveTab('overview');
      }
    } else if (activeTab === 'account') {
      setShowAccount(true);
      setShowReports(false);
      setShowProfileForm(false);
      setShowAnnouncements(false);
      setShowFeedback(false);
    } else if (activeTab === 'overview') {
      setShowReports(false);
      setShowAccount(false);
      setShowProfileForm(false);
      setShowAnnouncements(false);
      setShowFeedback(false);
    } else {
      setShowReports(false);
      setShowAccount(false);
      setShowAnnouncements(false);
      setShowFeedback(false);
    }
  }, [activeTab, churchInfo.status, toast, setActiveTab]);

  // Convert ChurchInfo to ChurchFormData format
  const convertToFormData = (data: ChurchInfo) => {
    // Helper function to safely convert founding year to number
    const parseFoundingYear = (year: string): number => {
      if (!year) return new Date().getFullYear();
      const parsed = parseInt(year, 10);
      return isNaN(parsed) ? new Date().getFullYear() : parsed;
    };

    // Helper function to convert coordinates format
    const convertCoordinates = (coords: typeof data.coordinates) => {
      if (!coords || (coords.lat === 0 && coords.lng === 0)) return undefined;
      return {
        latitude: coords.lat,
        longitude: coords.lng
      };
    };

    // Helper function to convert mass schedules
    const convertMassSchedules = (schedules: typeof data.massSchedules) => {
      if (!schedules) return [];
      return schedules.map(schedule => ({
        day: schedule.day,
        time: schedule.endTime ? `${schedule.time} - ${schedule.endTime}` : schedule.time,
        type: schedule.isFbLive ? `${schedule.language || 'Filipino'} (FB Live)` : (schedule.language || 'Filipino')
      }));
    };

    // Helper function to map heritage classification
    const mapHeritageClassification = (classification: string) => {
      switch (classification) {
        case 'National Cultural Treasures': return 'NCT';
        case 'Important Cultural Properties': return 'ICP';
        default: return 'non_heritage';
      }
    };

    // Helper function to map architectural style
    const mapArchitecturalStyle = (style: string) => {
      const styleMap: Record<string, string> = {
        'Spanish Colonial': 'baroque',
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
      foundingYear: parseFoundingYear(data.historicalDetails.foundingYear),
      founders: data.historicalDetails.founders || '',
      keyFigures: [],
      architecturalStyle: mapArchitecturalStyle(data.historicalDetails.architecturalStyle || 'other') as ArchitecturalStyle,
      historicalBackground: data.historicalDetails.historicalBackground || '',
      description: data.historicalDetails.historicalBackground || '',
      classification: mapHeritageClassification(data.historicalDetails.heritageClassification) as ChurchClassification,
      assignedPriest: data.currentParishPriest || '',
      massSchedules: convertMassSchedules(data.massSchedules || []),
      coordinates: convertCoordinates(data.coordinates),
      contactInfo: {
        phone: data.contactInfo?.phone || '',
        email: data.contactInfo?.email || '',
        address: `${data.locationDetails.streetAddress || ''}, ${data.locationDetails.barangay || ''}, ${data.locationDetails.municipality || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '')
      },
      images: (data.photos || []).map(photo =>
        typeof photo === 'string' ? photo : (photo?.url || '')
      ).filter(Boolean),
      documents: (data.documents || []).map(doc =>
        typeof doc === 'string' ? doc : (doc?.url || '')
      ).filter(Boolean),
      virtualTour360: (data.virtual360Images || []).map(img =>
        typeof img === 'string' ? img : (img?.url || '')
      ).filter(Boolean),
      culturalSignificance: data.historicalDetails.majorHistoricalEvents || '',
      preservationHistory: '',
      restorationHistory: '',
      tags: [],
      category: 'parish_church'
    };
  };

  // Form submission handlers
  const handleProfileFormSave = (data: ChurchInfo) => {
    setChurchInfo({ ...data, status: churchInfo.status || 'draft' });
    toast({ title: "Success", description: "Church profile saved as draft!" });
  };

  const handleProfileFormSubmit = async (data: ChurchInfo) => {
    if (!userProfile) {
      toast({
        title: "Error",
        description: "User profile not available.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    markDashboardVisited();

    try {
      const formData = convertToFormData(data);
      const isInitialSubmission = !existingChurch;

      if (isInitialSubmission) {
        // Create new church in Firebase using parish ID as document ID
        const newChurchId = await ChurchService.createChurch(
          formData,
          userProfile.diocese,
          userProfile.uid,
          userProfile.parish // Use parish name as document ID
        );

        setChurchId(newChurchId);
        setChurchInfo({ ...data, status: 'pending' });
        setShowProfileForm(false);

        toast({
          title: "Success",
          description: "Church profile submitted for review!"
        });
      } else {
        // Update existing church in Firebase
        await ChurchService.updateChurch(
          existingChurch.id,
          formData,
          userProfile.diocese,
          userProfile.uid
        );

        // Status will be updated through real-time listener
        setShowProfileForm(false);

        const currentStatus = existingChurch.status;
        const statusText = currentStatus === 'approved' ? 'updated' : 'resubmitted for review';

        toast({
          title: "Success",
          description: `Church profile ${statusText} successfully!`
        });
      }
    } catch (error) {
      console.error('Church submission error:', error);
      toast({
        title: "Error",
        description: "Failed to submit church profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    switch (churchInfo.status) {
      case 'approved':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved & Live
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="w-3 h-3 mr-1" />
            Under Review
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Needs Revision
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-50 text-slate-700 border-slate-200">
            <Edit className="w-3 h-3 mr-1" />
            Draft
          </Badge>
        );
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Helper function to convert time to sortable format
  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;

    // Handle both 24-hour format (08:30) and 12-hour format (8:30 AM)
    if (timeStr.includes(' ')) {
      // 12-hour format with AM/PM
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let totalMinutes = hours * 60 + minutes;

      if (period === 'PM' && hours !== 12) {
        totalMinutes += 12 * 60;
      } else if (period === 'AM' && hours === 12) {
        totalMinutes -= 12 * 60;
      }

      return totalMinutes;
    } else {
      // 24-hour format
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + (minutes || 0);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';

    try {
      // Convert 24-hour format to 12-hour format with AM/PM
      const [hours, minutes] = time.split(':').map(Number);

      // Validate hours and minutes
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return time; // Return original if invalid
      }

      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const displayMinutes = minutes.toString().padStart(2, '0');

      if (hours === 12 && minutes === 0) {
        return '12:00 NN';
      }

      return `${displayHours}:${displayMinutes} ${period}`;
    } catch (error) {
      console.warn('Invalid time format:', time);
      return time; // Return original if parsing fails
    }
  };

  const renderGroupedMassSchedulesDisplay = () => {
    if (!churchInfo.massSchedules || churchInfo.massSchedules.length === 0) {
      return (
        <div className="text-gray-500 text-center py-4">
          No mass schedules available.
        </div>
      );
    }

    const groupedSchedules = {
      weekdays: churchInfo.massSchedules.filter(s => s && ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(s.day)),
      saturday: churchInfo.massSchedules.filter(s => s && s.day === 'Saturday'),
      sunday: churchInfo.massSchedules.filter(s => s && s.day === 'Sunday')
    };

    // Get unique weekday schedules (assuming they're the same for all weekdays)
    const uniqueWeekdaySchedules = groupedSchedules.weekdays.reduce((unique, schedule) => {
      const key = `${schedule.time}-${schedule.endTime}-${schedule.language}-${schedule.isFbLive}`;
      if (!unique.find(s => `${s.time}-${s.endTime}-${s.language}-${s.isFbLive}` === key)) {
        unique.push(schedule);
      }
      return unique;
    }, [] as typeof churchInfo.massSchedules);

    // Sort schedules by time
    const sortByTime = (schedules: typeof churchInfo.massSchedules) => {
      return schedules.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    };

    const renderScheduleItem = (schedule: typeof churchInfo.massSchedules[0], index: number) => {
      // Build the additional info (language and FB Live)
      const additionalInfo = [];

      if (schedule.language && schedule.language !== 'Filipino') {
        additionalInfo.push(schedule.language);
      }

      if (schedule.isFbLive) {
        if (schedule.language && schedule.language !== 'Filipino') {
          additionalInfo.push('also via FB Live');
        } else {
          additionalInfo.push('FB Live');
        }
      }

      const infoText = additionalInfo.length > 0 ? ` (${additionalInfo.join(', ')})` : '';

      return (
        <div key={index} className="text-gray-700 leading-relaxed">
          <span className="text-gray-600">- </span>
          <span className="font-medium">
            {formatTime(schedule.time)} – {formatTime(schedule.endTime)}
          </span>
          {infoText && (
            <span className="text-gray-600">{infoText}</span>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-5 bg-gray-50 p-5 rounded-lg">
        {/* Daily Masses (Monday–Friday) */}
        {uniqueWeekdaySchedules.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 text-base">
              Daily Masses (Monday–Friday)
            </h4>
            <div className="space-y-1 ml-0">
              {sortByTime(uniqueWeekdaySchedules).map((schedule, index) =>
                renderScheduleItem(schedule, index)
              )}
            </div>
          </div>
        )}

        {/* Saturday */}
        {groupedSchedules.saturday.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 text-base">
              📅 Saturday
            </h4>
            <div className="space-y-1 ml-0">
              {sortByTime(groupedSchedules.saturday).map((schedule, index) =>
                renderScheduleItem(schedule, index)
              )}
            </div>
          </div>
        )}

        {/* Sunday */}
        {groupedSchedules.sunday.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              🌞 Sunday
            </h4>
            <div className="space-y-1 pl-4 border-l-2 border-gray-200">
              {sortByTime(groupedSchedules.sunday).map((schedule, index) =>
                renderScheduleItem(schedule, index)
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Simple Parish Profile View for approved profiles
  const renderParishProfile = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
              <ChurchIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {getGreeting()}! 👋
              </h1>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                {churchInfo.churchName || churchInfo.name || "Your Parish"}
              </h2>
              <div className="flex items-center gap-3">
                {getStatusBadge()}
                {churchInfo.locationDetails?.municipality && (
                  <Badge variant="outline" className="text-gray-600">
                    <MapPin className="w-3 h-3 mr-1" />
                    {churchInfo.locationDetails.municipality}, {churchInfo.locationDetails.province}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <Button 
            onClick={() => setShowProfileForm(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Parish Profile Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChurchIcon className="w-5 h-5 text-purple-600" />
            Parish Profile
          </CardTitle>
          <CardDescription>
            Your church information as displayed to visitors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Basic Information</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-500">Church Name:</span>
                  <p className="text-gray-900">{churchInfo.churchName || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Parish Name:</span>
                  <p className="text-gray-900">{churchInfo.parishName || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Parish Priest:</span>
                  <p className="text-gray-900">{churchInfo.currentParishPriest || 'Not specified'}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Location</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-500">Address:</span>
                  <p className="text-gray-900">{churchInfo.locationDetails?.streetAddress || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Municipality:</span>
                  <p className="text-gray-900">{churchInfo.locationDetails?.municipality || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Province:</span>
                  <p className="text-gray-900">{churchInfo.locationDetails?.province || 'Bohol'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          {(churchInfo.contactInfo?.phone || churchInfo.contactInfo?.email || churchInfo.contactInfo?.website) && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {churchInfo.contactInfo?.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{churchInfo.contactInfo.phone}</span>
                  </div>
                )}
                {churchInfo.contactInfo?.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>{churchInfo.contactInfo.email}</span>
                  </div>
                )}
                {churchInfo.contactInfo?.website && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Globe className="w-4 h-4" />
                    <span>{churchInfo.contactInfo.website}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Historical Information */}
          {(churchInfo.historicalDetails?.foundingYear || 
            churchInfo.historicalDetails?.architecturalStyle || 
            churchInfo.historicalDetails?.heritageClassification !== 'None' || 
            churchInfo.historicalDetails?.religiousClassification !== 'None' ||
            churchInfo.historicalDetails?.historicalBackground) && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Historical Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  {churchInfo.historicalDetails?.foundingYear && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Founding Year:</span>
                      <p className="text-gray-900">{churchInfo.historicalDetails.foundingYear}</p>
                    </div>
                  )}
                  {churchInfo.historicalDetails?.architecturalStyle && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Architectural Style:</span>
                      <p className="text-gray-900">{churchInfo.historicalDetails.architecturalStyle}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {churchInfo.historicalDetails?.heritageClassification !== 'None' && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Heritage Classification:</span>
                      <p className="text-gray-900">{churchInfo.historicalDetails.heritageClassification}</p>
                    </div>
                  )}
                  {churchInfo.historicalDetails?.religiousClassification !== 'None' && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Religious Classification:</span>
                      <p className="text-gray-900">{churchInfo.historicalDetails.religiousClassification}</p>
                    </div>
                  )}
                </div>
              </div>
              {churchInfo.historicalDetails?.historicalBackground && (
                <div className="mt-4">
                  <span className="text-sm font-medium text-gray-500">Historical Background:</span>
                  <p className="text-gray-900 mt-1 leading-relaxed">{churchInfo.historicalDetails.historicalBackground}</p>
                </div>
              )}
            </div>
          )}

          {/* 360° Virtual Tour */}
          {existingChurch?.virtualTour && existingChurch.virtualTour.scenes && existingChurch.virtualTour.scenes.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span>🌐 360° Virtual Tour</span>
                <Badge variant="secondary" className="text-xs">
                  {existingChurch.virtualTour.scenes.length} scene{existingChurch.virtualTour.scenes.length === 1 ? '' : 's'}
                </Badge>
              </h3>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Virtual tour is configured with {existingChurch.virtualTour.scenes.length} scenes.
                  Click "Edit Profile" to manage the virtual tour.
                </p>
              </div>
            </div>
          )}

          {/* Mass Schedules */}
          {churchInfo.massSchedules && churchInfo.massSchedules.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Mass Schedules</h3>
              {renderGroupedMassSchedulesDisplay()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Show loading state while fetching church data
  if (isLoading) {
    return (
      <Layout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        churchApproved={false}
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Church Data</h3>
            <p className="text-gray-600">Syncing your church information...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      churchApproved={churchInfo.status === 'approved'}
    >
      {/* Real-time Status Updates */}
      {existingChurch && (
        <div className="mb-4">
          {existingChurch.status === 'approved' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <span className="font-medium text-green-900">Church Profile Approved!</span>
                <p className="text-sm text-green-700">Your church information is now published and visible to visitors.</p>
              </div>
            </div>
          )}
          {(existingChurch.status === 'under_review' || existingChurch.status === 'pending') && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <div>
                <span className="font-medium text-orange-900">Revision Requested</span>
                <p className="text-sm text-orange-700">The chancery office has requested changes to your submission. Please review and resubmit.</p>
                <button
                  onClick={() => setShowProfileForm(true)}
                  className="text-sm text-orange-800 underline hover:text-orange-900 mt-1"
                >
                  Update Church Profile →
                </button>
              </div>
            </div>
          )}
          {existingChurch.status === 'under_review' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center gap-2">
              <Building className="w-5 h-5 text-purple-600" />
              <div>
                <span className="font-medium text-purple-900">Heritage Review in Progress</span>
                <p className="text-sm text-purple-700">Your church has been forwarded to the Museum Researcher for heritage validation.</p>
              </div>
            </div>
          )}
          {existingChurch.status === 'pending' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <span className="font-medium text-blue-900">Review in Progress</span>
                <p className="text-sm text-blue-700">Your church profile is being reviewed by the chancery office.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {showAccount ? (
        <ParishAccount
          onClose={() => {
            setShowAccount(false);
            setActiveTab('overview');
          }}
        />
      ) : showReports ? (
        <ParishReports
          churchInfo={churchInfo}
          onClose={() => {
            setShowReports(false);
            setActiveTab('overview');
          }}
        />
      ) : showAnnouncements ? (
        <ParishAnnouncements
          churchId={userProfile?.parish || ''}
          onClose={() => {
            setShowAnnouncements(false);
            setActiveTab('overview');
          }}
        />
      ) : showFeedback ? (
        <ParishFeedback
          churchName={churchInfo.churchName || churchInfo.name || 'Your Parish'}
          churchId={userProfile?.parish || ''}
          onClose={() => {
            setShowFeedback(false);
            setActiveTab('overview');
          }}
        />
      ) : showProfileForm ? (
        <ChurchProfileForm
          initialData={churchInfo}
          onSave={handleProfileFormSave}
          onSubmit={handleProfileFormSubmit}
          onCancel={() => {
            const visitKey = `parish_dashboard_visited_${userProfile?.email || 'user'}`;
            const hasVisitedBefore = localStorage.getItem(visitKey);

            if (hasVisitedBefore || churchInfo.status === 'approved') {
              setShowProfileForm(false);
            } else {
              markDashboardVisited();
              setShowProfileForm(false);
            }
          }}
          currentStatus={churchInfo.status}
          isSubmitting={isSubmitting}
          churchId={churchId || undefined}
        />
      ) : (
        renderParishProfile()
      )}
    </Layout>
  );
};

export default ParishDashboard;