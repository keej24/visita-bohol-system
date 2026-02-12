/**
 * =============================================================================
 * PARISH DASHBOARD.TSX - Parish Secretary Main Dashboard
 * =============================================================================
 *
 * PURPOSE:
 * This is the main dashboard for Parish Secretary users. It serves as the
 * hub for managing a single church - viewing/editing profile, posting
 * announcements, responding to feedback, and viewing reports.
 *
 * DASHBOARD STATES:
 * ┌────────────────────┬─────────────────────────────────────────────────┐
 * │ State              │ What is Shown                                   │
 * ├────────────────────┼─────────────────────────────────────────────────┤
 * │ No Church          │ Welcome screen with "Add Profile" button        │
 * │ Draft              │ Profile form for editing before submission      │
 * │ Pending            │ Overview with "Under Review" status banner      │
 * │ Heritage Review    │ Overview with "Heritage Review" status banner   │
 * │ Approved           │ Full overview + all features unlocked           │
 * └────────────────────┴─────────────────────────────────────────────────┘
 *
 * VIEW TYPES (currentView state):
 * - 'overview': Shows parish profile summary with Edit Profile button
 * - 'profile': Shows ChurchProfileForm for editing church details
 * - 'reports': Shows ParishReports component (only if approved)
 * - 'account': Shows ParishAccount for password/settings management
 * - 'announcements': Shows ParishAnnouncements (only if approved)
 * - 'feedback': Shows ParishFeedback for responding to reviews
 *
 * KEY DATA TRANSFORMATIONS:
 * - convertChurchToInfo(): Firebase Church → ChurchInfo format for form
 * - convertToFormData(): ChurchInfo → Firebase format for saving
 * - These transformations handle field mapping between Firebase schema
 *   and the form component's expected structure
 *
 * REAL-TIME UPDATES:
 * - Uses ChurchService.subscribeToChurches() for live status updates
 * - When Chancery approves church, status updates appear automatically
 * - Toast notifications shown when status changes
 *
 * FEATURE GATING:
 * - Before approval: Only profile editing is available
 * - After approval: Reports, Announcements, Feedback become accessible
 * - activeTab prop from Layout/Sidebar controls which view is shown
 *
 * RELATED FILES:
 * - components/Layout.tsx: Wraps this with Sidebar + Header
 * - components/parish/ChurchProfileForm.tsx: Form for editing church
 * - components/parish/ParishReports.tsx: Reports view
 * - components/parish/ParishAnnouncements.tsx: Announcement management
 * - components/parish/ParishFeedback.tsx: Feedback/review management
 * - services/churchService.ts: Firebase operations for churches
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Building,
  X,
  Plus,
  Info,
  Calendar,
  User,
  Users,
  Landmark,
  Camera,
  Image as ImageIcon,
  FileText,
  Eye,
  ExternalLink,
  Facebook,
  History,
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { ChurchInfo } from '@/components/parish/types';
import { ChurchProfileForm } from '@/components/parish/ChurchProfileForm';
import { ParishReports } from '@/components/parish/ParishReports';
import { ParishAccount } from '@/components/parish/ParishAccount';
import { ParishAnnouncements } from '@/components/parish/ParishAnnouncements';
import { ParishFeedback } from '@/components/parish/ParishFeedback';
import { PendingParishStaff } from '@/components/PendingParishStaff';
import { ChurchService } from '@/services/churchService';
import { notifyChurchStatusChange, notifyPendingChangesSubmitted } from '@/lib/notifications';
import { getFieldLabel } from '@/lib/church-field-categories';
import type { ArchitecturalStyle, ChurchClassification, Church, ChurchDocument } from '@/types/church';
import { db } from '@/lib/firebase';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

// View type for managing which content is displayed
type ViewType = 'overview' | 'profile' | 'reports' | 'account' | 'announcements' | 'feedback' | 'staff';

// Simplified Parish Dashboard - Shows form on first access, then Parish Profile after approval
const ParishDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();
  const [currentView, setCurrentView] = useState<ViewType>('overview');
  const [churchId, setChurchId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [existingChurch, setExistingChurch] = useState<Church | null>(null);
  
  // Track if initial church load has completed to prevent view reset on profile refresh
  const initialLoadCompleteRef = useRef(false);
  
  // Load dismissed state from localStorage - use uid for consistent key
  // Initialize from localStorage immediately if uid is available
  const [dismissedApprovedBanner, setDismissedApprovedBanner] = useState(() => {
    if (typeof window !== 'undefined' && userProfile?.uid) {
      const key = `dismissed_approval_banner_${userProfile.uid}`;
      return localStorage.getItem(key) === 'true';
    }
    return false;
  });
  
  // Sync dismissed state from localStorage once userProfile.uid is available
  // This handles the case where userProfile loads asynchronously
  useEffect(() => {
    if (userProfile?.uid) {
      const key = `dismissed_approval_banner_${userProfile.uid}`;
      const dismissed = localStorage.getItem(key) === 'true';
      if (dismissed) {
        setDismissedApprovedBanner(true);
      }
    }
  }, [userProfile?.uid]);

  // Helper function to extract parish name without municipality (handles legacy data)
  const getParishNameWithoutMunicipality = (name: string | undefined): string => {
    if (!name) return '';
    // If name contains a comma, it likely includes municipality - strip it
    if (name.includes(',')) {
      return name.split(',')[0].trim();
    }
    return name;
  };

  // Core church data - use parishInfo.name (without municipality) for initial parish name
  const [churchInfo, setChurchInfo] = useState<ChurchInfo>(() => ({
    churchName: getParishNameWithoutMunicipality(userProfile?.parishInfo?.name),
    parishName: getParishNameWithoutMunicipality(userProfile?.parishInfo?.name),
    locationDetails: {
      streetAddress: '',
      barangay: '',
      municipality: userProfile?.parishInfo?.municipality || '',
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
      religiousClassifications: [],
      supportingDocuments: []
    },
    currentParishPriest: '',
    feastDay: '',
    massSchedules: [],
    contactInfo: {
      phone: userProfile?.phoneNumber || '+63 ', // Pre-fill with user's phone if available
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

  // Helper to extract filename from Firebase Storage URL
  // Strips timestamp and document type prefixes added during upload
  const extractFilenameFromUrl = (url: string): string => {
    try {
      // Firebase Storage URLs have paths like:
      // .../o/churches%2FchurchId%2Fdocuments%2Fdocument-timestamp-filename.pdf?alt=media...
      // We need to decode the path and extract just the filename
      
      // First, get the path part (before query string)
      let path = url.split('?')[0];
      
      // Decode URL encoding (%2F -> /)
      path = decodeURIComponent(path);
      
      // Get the last segment (the actual filename)
      const segments = path.split('/');
      let filename = segments[segments.length - 1] || 'Document';
      
      // Strip timestamp and document type prefixes
      // Pattern: {type}-{timestamp}-{originalname} or {type}_{timestamp}_{index}_{originalname}
      // Examples: "document-1704067200000-myfile.pdf" -> "myfile.pdf"
      //           "heritage-doc_1704067200000_0_myfile.pdf" -> "myfile.pdf"
      const prefixPattern = /^(?:document|heritage-doc|historical_document)[_-]\d+[_-](?:\d+[_-])?/i;
      filename = filename.replace(prefixPattern, '');
      
      return filename || 'Document';
    } catch {
      return 'Document';
    }
  };

  // Convert Church from Firebase to ChurchInfo format
  const convertChurchToInfo = useCallback((church: Church): ChurchInfo => {
    // Helper to convert religious classification from Firestore to form format
    const convertReligiousClassification = (classification?: string) => {
      switch (classification) {
        case 'diocesan_shrine': return 'Diocesan Shrine';
        case 'jubilee_church': return 'Jubilee Church';
        case 'papal_basilica_affinity': return 'Papal Basilica Affinity';
        case 'holy_door': return 'Holy Door';
        case 'none':
        default: return 'None';
      }
    };

    // Helper to convert religiousClassifications array from Firestore to form format
    const convertReligiousClassifications = (classifications?: string[]): import('@/components/parish/types').ReligiousClassificationType[] => {
      if (!classifications || !Array.isArray(classifications)) return [];
      return classifications.map(c => {
        switch (c) {
          case 'diocesan_shrine': return 'Diocesan Shrine';
          case 'jubilee_church': return 'Jubilee Church';
          case 'papal_basilica_affinity': return 'Papal Basilica Affinity';
          case 'holy_door': return 'Holy Door';
          default: return c as import('@/components/parish/types').ReligiousClassificationType;
        }
      }).filter((c): c is import('@/components/parish/types').ReligiousClassificationType => 
        ['Diocesan Shrine', 'Jubilee Church', 'Papal Basilica Affinity', 'Holy Door'].includes(c)
      );
    };

    // Helper to convert architectural style from Firestore to form format
    const convertArchitecturalStyle = (style?: string) => {
      switch (style?.toLowerCase()) {
        case 'baroque': return 'Baroque';
        case 'gothic': 
        case 'neo-gothic': return 'Neo-Gothic';
        case 'romanesque': return 'Romanesque';
        case 'byzantine': return 'Byzantine';
        case 'neoclassical': 
        case 'neo-classical': return 'Neo-Classical';
        case 'modern': return 'Modern';
        case 'mixed': 
        case 'mixed styles': return 'Mixed Styles';
        case 'other':
        default: return 'Other';
      }
    };

    // Get religiousClassifications from historicalDetails object in Firestore
    const firestoreHistoricalDetails = (church as unknown as { historicalDetails?: { religiousClassifications?: string[] } }).historicalDetails;
    const rawClassifications = firestoreHistoricalDetails?.religiousClassifications || [];

    return {
      id: church.id,
      churchName: church.fullName || church.name || '',
      parishName: church.fullName || church.name || '',
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
        architecturalStyle: convertArchitecturalStyle(church.architecturalStyle),
        historicalBackground: church.historicalBackground || church.description || '',
        majorHistoricalEvents: church.culturalSignificance || '',
        heritageClassification: church.classification === 'NCT' ? 'National Cultural Treasures' :
                               church.classification === 'ICP' ? 'Important Cultural Properties' : 'None',
        religiousClassification: convertReligiousClassification(church.religiousClassification),
        religiousClassifications: convertReligiousClassifications(rawClassifications),
        supportingDocuments: [],
        architecturalFeatures: church.architecturalFeatures || '',
        heritageInformation: church.heritageInformation || ''
      },
      currentParishPriest: church.assignedPriest || '',
      priestHistory: (church as unknown as { priestHistory?: import('@/types/church').PriestAssignment[] }).priestHistory || [],
      feastDay: church.feastDay || '',
      massSchedules: (church.massSchedules || []).map(schedule => ({
        day: schedule.day || '',
        time: schedule.time?.split(' - ')[0] || '',
        endTime: schedule.time?.split(' - ')[1] || '',
        language: schedule.language || 'Cebuano',
        isFbLive: schedule.isFbLive || false
      })),
      contactInfo: {
        phone: church.contactInfo?.phone || '',
        email: church.contactInfo?.email || '',
        website: '',
        facebookPage: '',
        phones: church.contactInfo?.phones || [church.contactInfo?.phone || '+63 '],
        emails: church.contactInfo?.emails || [church.contactInfo?.email || '']
      },
      // Convert photos from Firestore format to form format
      // Try church.photos first (new format), then fall back to church.images (legacy)
      photos: (() => {
        // Check photos first, but only use it if it has items (not empty array)
        const churchPhotos = (church as any).photos;
        const photosData = (churchPhotos && churchPhotos.length > 0) ? churchPhotos : (church.images || []);
        return photosData.map((photo: string | { url?: string; name?: string }, index: number) => {
          if (typeof photo === 'string') {
            // Legacy string format
            return {
              id: `photo-${index}`,
              name: `Photo ${index + 1}`,
              type: 'photo' as const,
              url: photo,
              uploadDate: new Date().toISOString(),
              status: 'approved' as const
            };
          }
          // Object format
          return {
            id: `photo-${index}`,
            name: photo.name || `Photo ${index + 1}`,
            type: 'photo' as const,
            url: photo.url || '',
            uploadDate: new Date().toISOString(),
            status: 'approved' as const
          };
        });
      })(),
      // Convert documents from Firestore format to form format
      documents: (church.documents || []).map((doc: string | ChurchDocument, index: number) => {
        if (typeof doc === 'string') {
          // Legacy string format - extract filename from URL
          return {
            id: `doc-${index}`,
            name: extractFilenameFromUrl(doc),
            type: 'document' as const,
            url: doc,
            uploadDate: new Date().toISOString(),
            status: 'approved' as const
          };
        }
        // ChurchDocument object format - use name if it looks like a real filename, otherwise extract from URL
        // Generic names like "Document 1", "Document 2" should be replaced with extracted filename
        const isGenericName = !doc.name || /^Document\s*\d*$/i.test(doc.name);
        return {
          id: `doc-${index}`,
          name: isGenericName ? extractFilenameFromUrl(doc.url) : doc.name,
          type: 'document' as const,
          url: doc.url,
          uploadDate: new Date().toISOString(),
          status: 'approved' as const
        };
      }),
      virtual360Images: (church.virtualTour?.scenes || [])
        .map((scene, index) => {
          // Validate URL and aspect ratio (basic check)
          const isValidUrl = typeof scene.imageUrl === 'string' && scene.imageUrl.trim() && scene.imageUrl.startsWith('http');
          // Optionally, add more checks for file extension or known panorama formats
          return {
            id: scene.id || `360-${index}`,
            url: scene.imageUrl,
            name: scene.title || `360 Image ${index + 1}`,
            uploadDate: new Date().toISOString(),
            status: (isValidUrl ? 'approved' : 'pending') as 'approved' | 'pending',
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
      status: church.status || 'pending',
      capacity: 0,
      architecturalStyle: church.architecturalStyle || '',
      patronSaint: '',
      diocese: church.diocese || userProfile?.diocese || 'tagbilaran'
    };
  }, [userProfile?.diocese]);

  // Load existing church data from Firebase
  useEffect(() => {
    if (userProfile && (userProfile.parishId || userProfile.parish)) {
      // Skip if initial load is already complete (e.g., after profile refresh)
      if (initialLoadCompleteRef.current) {
        return;
      }
      
      setIsLoading(true);

      // Use new parishId if available, fallback to legacy parish field
      const churchIdentifier = userProfile.parishId || userProfile.parish;

      // Try to load existing church data using parish ID as document ID
      ChurchService.getChurch(churchIdentifier!)
        .then((church) => {
          if (church) {
            // Church exists in Firebase - load the data
            console.log('🏛️ [PARISH DASHBOARD] Church loaded:', {
              documentId: church.id,
              name: church.name,
              userParishId: userProfile.parishId,
              userParish: userProfile.parish,
              searchedWith: userProfile.parishId || userProfile.parish
            });
            setExistingChurch(church);
            setChurchId(church.id);
            setChurchInfo(convertChurchToInfo(church));

            // Only set view to overview on initial load
            if (!initialLoadCompleteRef.current) {
              setCurrentView('overview');
              initialLoadCompleteRef.current = true;
            }
          } else {
            // No existing church - initialize with default data but don't show form yet
            console.log('⚠️ [PARISH DASHBOARD] No church found for:', {
              searchedWith: userProfile.parishId || userProfile.parish,
              userParishId: userProfile.parishId,
              userParish: userProfile.parish
            });
            // Use parishInfo.name (without municipality) for the parish name field
            const parishName = getParishNameWithoutMunicipality(userProfile.parishInfo?.name);
            const municipality = userProfile.parishInfo?.municipality || '';
            setChurchInfo(prev => ({
              ...prev,
              churchName: parishName,
              parishName: parishName,
              name: parishName,
              locationDetails: {
                ...prev.locationDetails,
                municipality: municipality
              },
              diocese: userProfile.diocese
            }));
            // Only set view to overview on initial load
            if (!initialLoadCompleteRef.current) {
              setCurrentView('overview');
              initialLoadCompleteRef.current = true;
            }
          }
        })
        .catch((error) => {
          console.error('Error loading church data:', error);
          toast({
            title: "Error Loading Church",
            description: "Failed to load church data. Using default settings.",
            variant: "destructive"
          });
          // Fallback to default initialization - use parishInfo.name (without municipality)
          const parishName = getParishNameWithoutMunicipality(userProfile.parishInfo?.name);
          const municipality = userProfile.parishInfo?.municipality || '';
          setChurchInfo(prev => ({
            ...prev,
            churchName: parishName,
            parishName: parishName,
            name: parishName,
            locationDetails: {
              ...prev.locationDetails,
              municipality: municipality
            },
            diocese: userProfile.diocese
          }));
          // Only set view to overview on initial load
          if (!initialLoadCompleteRef.current) {
            setCurrentView('overview');
            initialLoadCompleteRef.current = true;
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [userProfile, convertChurchToInfo, toast]);

  // Set up real-time listener for church updates
  useEffect(() => {
    if (!userProfile?.parishId && !userProfile?.parish) return;

    // Use new parishId if available, fallback to legacy parish field
    const churchIdentifier = userProfile.parishId || userProfile.parish;
    let previousStatus: string | null = null;

    const unsubscribe = ChurchService.subscribeToChurches(
      (churches) => {
        // Find our parish's church in the results
        const parishChurch = churches.find(church => church.id === churchIdentifier);
        if (parishChurch) {
          // Check if status changed to show notification
          if (previousStatus && previousStatus !== parishChurch.status) {
            const statusMessages = {
              'approved': 'Your church profile has been approved!',
              'heritage_review': 'Your church has been forwarded for heritage review.',
              'pending': 'Your church profile is now under review.',
              'draft': 'Your church profile is in draft status.'
            };

            const message = statusMessages[parishChurch.status as keyof typeof statusMessages] ||
                           `Church status updated to: ${parishChurch.status}`;

            toast({
              title: "Church Profile Updated",
              description: message,
              variant: parishChurch.status === 'approved' ? 'default' : 'default'
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

  // Mark dashboard as visited - use uid for consistent localStorage key
  const markDashboardVisited = () => {
    const visitKey = `parish_dashboard_visited_${userProfile?.uid || 'user'}`;
    localStorage.setItem(visitKey, 'true');
  };

  // Handle activeTab changes from sidebar
  useEffect(() => {
    if (activeTab === 'reports') {
      if (churchInfo.status === 'approved') {
        setCurrentView('reports');
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
        setCurrentView('announcements');
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
        setCurrentView('feedback');
      } else {
        toast({
          title: "Profile Not Approved",
          description: "Feedback management is only available after your church profile is approved.",
          variant: "destructive"
        });
        setActiveTab('overview');
      }
    } else if (activeTab === 'account') {
      setCurrentView('account');
    } else if (activeTab === 'staff') {
      setCurrentView('staff');
    } else if (activeTab === 'overview') {
      setCurrentView('overview');
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
      // Return null instead of undefined - Firestore accepts null but not undefined
      if (!coords || (coords.lat === 0 && coords.lng === 0)) return null;
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
        language: schedule.language || 'Cebuano',
        isFbLive: schedule.isFbLive || false
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

    // Helper function to map religious classification
    const mapReligiousClassification = (classification: string) => {
      switch (classification) {
        case 'Diocesan Shrine': return 'diocesan_shrine';
        case 'Jubilee Church': return 'jubilee_church';
        case 'Papal Basilica Affinity': return 'papal_basilica_affinity';
        case 'None':
        default: return 'none';
      }
    };

    // Helper function to map architectural style
    const mapArchitecturalStyle = (style: string) => {
      const trimmedStyle = (style || '').trim();
      const styleMap: Record<string, string> = {
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

    // Helper function to map religious classifications array to Firestore format
    const mapReligiousClassifications = (classifications: string[]) => {
      if (!classifications || classifications.length === 0) return [];
      return classifications.map(c => {
        switch (c) {
          case 'Diocesan Shrine': return 'diocesan_shrine';
          case 'Jubilee Church': return 'jubilee_church';
          case 'Papal Basilica Affinity': return 'papal_basilica_affinity';
          case 'Holy Door': return 'holy_door';
          default: return c.toLowerCase().replace(/\s+/g, '_');
        }
      });
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
      religiousClassification: mapReligiousClassification(data.historicalDetails.religiousClassification || 'None') as import('@/types/church').ReligiousClassification,
      // Save religiousClassifications array in historicalDetails for persistence
      historicalDetails: {
        religiousClassifications: mapReligiousClassifications(data.historicalDetails.religiousClassifications || [])
      },
      assignedPriest: data.currentParishPriest || '',
      priestHistory: data.priestHistory || [],
      feastDay: data.feastDay || '',
      massSchedules: convertMassSchedules(data.massSchedules || []),
      coordinates: convertCoordinates(data.coordinates),
      contactInfo: {
        phone: data.contactInfo?.phone || '',
        email: data.contactInfo?.email || '',
        phones: data.contactInfo?.phones || [],
        emails: data.contactInfo?.emails || [],
        address: `${data.locationDetails.streetAddress || ''}, ${data.locationDetails.barangay || ''}, ${data.locationDetails.municipality || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '')
      },
      // Legacy images field - just URLs for backward compatibility
      images: (data.photos || []).map(photo =>
        typeof photo === 'string' ? photo : (photo?.url || '')
      ).filter(Boolean),
      // Photos preserved from form data  
      photos: (data.photos || []).map(photo => {
        if (typeof photo === 'string') {
          // Legacy string format
          return { url: photo, name: '' };
        }
        return {
          url: photo?.url || '',
          name: photo?.name || ''
        };
      }).filter(photo => photo.url !== ''),
      // Documents preserved from form data
      documents: (data.documents || []).map(doc => {
        if (typeof doc === 'string') {
          // Legacy string format - extract filename from URL
          const extractedName = extractFilenameFromUrl(doc);
          return { url: doc, name: extractedName };
        }
        // Use stored name if it's a real filename, otherwise extract from URL
        // Generic names like "Document 1", "Document 2" should be replaced with extracted filename
        const isGenericName = !doc?.name || /^Document\s*\d*$/i.test(doc.name);
        const docName = isGenericName ? extractFilenameFromUrl(doc?.url || '') : doc.name;
        return {
          url: doc?.url || '',
          name: docName
        };
      }).filter(doc => doc.url !== ''),
      virtualTour360: (data.virtual360Images || []).map(img =>
        typeof img === 'string' ? img : (img?.url || '')
      ).filter(Boolean),
      culturalSignificance: data.historicalDetails.majorHistoricalEvents || '',
      preservationHistory: '',
      restorationHistory: '',
      architecturalFeatures: data.historicalDetails.architecturalFeatures || '',
      heritageInformation: data.historicalDetails.heritageInformation || '',
      tags: [],
      category: 'parish_church'
    };
  };

  // Form submission handlers - returns churchId for auto-save feature
  const handleProfileFormSave = async (data: ChurchInfo): Promise<string | void> => {
    if (!userProfile) {
      toast({
        title: "Error",
        description: "User profile not available.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const formData = convertToFormData(data);
      
      // Save contact phone number to user profile
      if (data.contactInfo?.phone && userProfile?.uid) {
        try {
          const userDocRef = doc(db, 'users', userProfile.uid);
          await updateDoc(userDocRef, {
            phoneNumber: data.contactInfo.phone
          });
          console.log('✅ Phone number synced to user profile');
        } catch (error) {
          console.error('Error syncing phone to user profile:', error);
          // Don't fail the whole operation if this fails
        }
      }
      
      // Use parishId for Firestore rules (required for parish secretary permissions)
      const parishIdentifier = userProfile.parishId || userProfile.parish;
      
      console.log('🔍 [SAVE DRAFT] Debug info:', {
        parishIdentifier,
        userProfileParishId: userProfile.parishId,
        userProfileParish: userProfile.parish,
        diocese: userProfile.diocese,
        existingChurch: existingChurch ? existingChurch.id : 'none',
        uid: userProfile.uid
      });
      
      if (existingChurch) {
        // Update existing church - preserve status if already approved
        const docRef = doc(db, 'churches', existingChurch.id);
        
        console.log('🔍 [SAVE DRAFT] formData being saved:', formData);
        console.log('� [SAVE DRAFT] photos field:', formData.photos);
        console.log('📸 [SAVE DRAFT] data.photos (input):', data.photos);
        console.log('🔍 [SAVE DRAFT] existingChurch.status:', existingChurch.status);
        
        // Preserve 'approved', 'pending', and 'heritage_review' statuses - don't revert to draft
        // Only use 'draft' if the church was already a draft
        const preservedStatus = ['approved', 'pending', 'heritage_review'].includes(existingChurch.status) 
          ? existingChurch.status 
          : 'draft';
        
        // For APPROVED churches, use staged update flow
        // Sensitive fields go to pendingChanges, operational fields publish immediately
        if (existingChurch.status === 'approved') {
          const stagingResult = await ChurchService.updateChurchWithStaging(
            existingChurch.id,
            formData,
            userProfile.diocese,
            userProfile.uid
          );
          
          setChurchInfo({ ...data, status: 'approved', id: existingChurch.id });
          
          // Notify Chancery about pending changes
          if (stagingResult.hasPendingChanges) {
            try {
              await notifyPendingChangesSubmitted(
                existingChurch.id,
                data.churchName || data.name || 'Church',
                stagingResult.stagedForReview,
                userProfile
              );
              console.log('[Parish] Notification sent to Chancery for pending profile updates');
            } catch (notifError) {
              console.error('[Parish] Failed to send pending update notification:', notifError);
            }
          }
          
          // Show feedback about what was staged vs. published
          if (stagingResult.hasPendingChanges && stagingResult.directlyPublished.length > 0) {
            // Mixed: some fields published, some staged
            const stagedLabels = stagingResult.stagedForReview.map(f => getFieldLabel(f)).join(', ');
            const publishedLabels = stagingResult.directlyPublished.map(f => getFieldLabel(f)).join(', ');
            toast({ 
              title: "Changes Saved", 
              description: `Updated: ${publishedLabels}. Pending review: ${stagedLabels}.`
            });
          } else if (stagingResult.hasPendingChanges) {
            // All changes need review
            const stagedLabels = stagingResult.stagedForReview.map(f => getFieldLabel(f)).join(', ');
            toast({ 
              title: "Changes Submitted for Review", 
              description: `The following changes require Chancery approval: ${stagedLabels}`
            });
          } else {
            // All changes published immediately
            toast({ 
              title: "Saved", 
              description: "Changes saved and published immediately!"
            });
          }
          
          return existingChurch.id;
        }
        
        // For non-approved churches, use direct update
        await updateDoc(docRef, {
          ...formData,
          status: preservedStatus,
          parishId: parishIdentifier,
          updatedAt: serverTimestamp()
        });
        
        setChurchInfo({ ...data, status: preservedStatus, id: existingChurch.id });
        
        // Show appropriate message based on status
        const statusMessages: Record<string, string> = {
          'approved': "Changes saved successfully!",
          'pending': "Changes saved! Your profile remains in the review queue.",
          'heritage_review': "Changes saved! Your profile remains in heritage review.",
          'draft': "Church profile saved as draft!"
        };
        toast({ 
          title: "Saved", 
          description: statusMessages[preservedStatus] || "Changes saved successfully!"
        });
        
        // Return the existing church ID
        return existingChurch.id;
      } else {
        // Create new church as draft (without submitting for review)
        const docRef = doc(db, 'churches', parishIdentifier);
        await setDoc(docRef, {
          ...formData,
          status: 'draft',
          diocese: userProfile.diocese,
          parishId: parishIdentifier,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: userProfile.uid
        });
        
        setChurchId(parishIdentifier);
        setChurchInfo({ ...data, status: 'draft', id: parishIdentifier });
        setExistingChurch({ 
          ...formData, 
          id: parishIdentifier, 
          status: 'draft',
          diocese: userProfile.diocese,
          parishId: parishIdentifier,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: userProfile.uid
        } as unknown as Church);
        
        toast({ 
          title: "Success", 
          description: "Church profile saved as draft!" 
        });
        
        // Return the new church ID
        return parishIdentifier;
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error",
        description: "Failed to save draft. Please try again.",
        variant: "destructive"
      });
      return; // Return undefined on error
    } finally {
      setIsSaving(false);
    }
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

      // Save contact phone number to user profile
      if (data.contactInfo?.phone && userProfile?.uid) {
        try {
          const userDocRef = doc(db, 'users', userProfile.uid);
          await updateDoc(userDocRef, {
            phoneNumber: data.contactInfo.phone
          });
          console.log('✅ Phone number synced to user profile');
        } catch (error) {
          console.error('Error syncing phone to user profile:', error);
          // Don't fail the whole operation if this fails
        }
      }

      if (isInitialSubmission) {
        // Create new church in Firebase using parish ID as document ID
        const parishIdentifier = userProfile.parishId || userProfile.parish;
        
        const newChurchId = await ChurchService.createChurch(
          formData,
          userProfile.diocese,
          userProfile.uid,
          parishIdentifier // Use unique parish ID as document ID
        );

        setChurchId(newChurchId);
        setChurchInfo({ ...data, status: 'pending', id: newChurchId });
        setCurrentView('overview');

        // Send notification to Chancery Office about new church submission
        try {
          await notifyChurchStatusChange(
            newChurchId,
            data.churchName || data.name || 'Church',
            'draft',
            'pending', // This triggers church_submitted notification to Chancery
            userProfile
          );
          console.log('[Parish] Notification sent to Chancery for new church submission');
        } catch (notifError) {
          console.error('[Parish] Failed to send notification:', notifError);
        }

        toast({
          title: "Success",
          description: "Church profile submitted for review!"
        });

        // Invalidate all church queries to update all dashboards
        await queryClient.invalidateQueries({ queryKey: ['churches'] });
      } else {
        // Update existing church in Firebase
        // If church is draft, change to pending on submit
        const newStatus = existingChurch.status === 'draft' ? 'pending' : existingChurch.status;
        const parishIdForUpdate = userProfile.parishId || userProfile.parish;
        
        // Manually update status if transitioning from draft to pending
        if (existingChurch.status === 'draft') {
          const docRef = doc(db, 'churches', existingChurch.id);
          await updateDoc(docRef, {
            ...formData,
            status: 'pending',
            parishId: parishIdForUpdate,
            submittedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          // Send notification to Chancery Office about church submission
          try {
            await notifyChurchStatusChange(
              existingChurch.id,
              data.churchName || data.name || 'Church',
              'draft',
              'pending', // This triggers church_submitted notification to Chancery
              userProfile
            );
            console.log('[Parish] Notification sent to Chancery for church submission');
          } catch (notifError) {
            console.error('[Parish] Failed to send notification:', notifError);
          }
        } else {
          // Use updateChurchWithStaging for all non-draft churches.
          // For approved churches, this splits fields into direct-publish vs staged-for-review
          // to comply with Firestore security rules that restrict which fields parish secretaries can modify.
          // For non-approved churches, it falls back to a standard update.
          const stagingResult = await ChurchService.updateChurchWithStaging(
            existingChurch.id,
            formData,
            userProfile.diocese,
            userProfile.uid
          );

          if (stagingResult.hasPendingChanges) {
            // Notify Chancery about pending changes
            try {
              await notifyPendingChangesSubmitted(
                existingChurch.id,
                data.churchName || data.name || 'Church',
                stagingResult.stagedForReview,
                userProfile
              );
              console.log('[Parish] Notification sent to Chancery for pending profile updates (submit)');
            } catch (notifError) {
              console.error('[Parish] Failed to send pending update notification:', notifError);
            }

            // Some changes were staged for Chancery review
            const stagedLabels = stagingResult.stagedForReview.map(f => getFieldLabel(f)).join(', ');
            if (stagingResult.directlyPublished.length > 0) {
              const publishedLabels = stagingResult.directlyPublished.map(f => getFieldLabel(f)).join(', ');
              toast({
                title: "Changes Partially Saved",
                description: `Updated: ${publishedLabels}. Pending Chancery review: ${stagedLabels}.`
              });
            } else {
              toast({
                title: "Changes Submitted for Review",
                description: `The following changes require Chancery approval: ${stagedLabels}`
              });
            }
          }
        }

        // Update churchInfo with new status
        setChurchInfo({ ...data, status: newStatus, id: existingChurch.id });
        setCurrentView('overview');

        // Show generic success toast only if no staging toast was already shown
        if (newStatus !== 'approved' || !existingChurch || existingChurch.status !== 'approved') {
          const statusText = newStatus === 'approved' ? 'updated' : 'submitted for review';
          toast({
            title: "Success",
            description: `Church profile ${statusText} successfully!`
          });
        }

        // Invalidate all church queries to update all dashboards
        await queryClient.invalidateQueries({ queryKey: ['churches'] });
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
      case 'heritage_review':
        return (
          <Badge className="bg-purple-50 text-purple-700 border-purple-200">
            <Clock className="w-3 h-3 mr-1" />
            Heritage Review
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

      if (schedule.language && schedule.language !== 'Cebuano') {
        additionalInfo.push(schedule.language);
      }

      if (schedule.isFbLive) {
        if (schedule.language && schedule.language !== 'Cebuano') {
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
              Saturday
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
              Sunday
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
  const renderParishProfile = () => {
    // Get primary image for hero section
    const primaryImage = existingChurch?.images?.[0] || null;
    const hasImages = (existingChurch?.images?.length || 0) > 0;
    const hasDocuments = (existingChurch?.documents?.length || 0) > 0;

    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Hero Header with Image Background */}
        <div className="relative rounded-2xl overflow-hidden shadow-xl">
          {/* Background Image or Gradient */}
          <div className="absolute inset-0 h-56 overflow-hidden">
            {primaryImage ? (
              <>
                <img 
                  src={primaryImage} 
                  alt={churchInfo.churchName || 'Church'}
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
          <div className="relative z-10 px-6 pt-6 pb-20">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {getStatusBadge()}
                  {existingChurch?.hasPendingChanges && (
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                      <Clock className="w-3 h-3 mr-1" />
                      Updates Pending Review
                    </Badge>
                  )}
                  {churchInfo.historicalDetails?.heritageClassification && 
                   churchInfo.historicalDetails.heritageClassification !== 'None' && (
                    <Badge className="bg-amber-500/90 text-white border-0 shadow-sm">
                      <Landmark className="w-3 h-3 mr-1" />
                      {churchInfo.historicalDetails.heritageClassification}
                    </Badge>
                  )}
                </div>
                <div className={`flex items-center gap-3 ${primaryImage ? 'text-white drop-shadow-lg' : 'text-white'}`}>
                  <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                    <ChurchIcon className="w-7 h-7" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold mb-1">
                      {getGreeting()}! 👋
                    </h1>
                    <h2 className="text-lg sm:text-xl font-semibold">
                      {churchInfo.churchName || churchInfo.name || "Your Parish"}
                    </h2>
                  </div>
                </div>
                <div className={`flex items-center gap-2 mt-3 ${primaryImage ? 'text-white/90' : 'text-white/90'}`}>
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium">
                    {churchInfo.locationDetails?.municipality}, {churchInfo.locationDetails?.province || 'Bohol'}
                  </span>
                </div>
              </div>
              <Button 
                onClick={() => setCurrentView('profile')}
                className="bg-white/90 hover:bg-white text-gray-800 shadow-lg backdrop-blur-sm"
              >
                <Edit className="w-4 h-4 mr-1.5" /> Edit Profile
              </Button>
            </div>
          </div>

          {/* Quick Stats Cards - Floating */}
          <div className="relative z-20 px-6 -mt-10 pb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl p-3 shadow-lg border border-gray-100">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Founded</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{churchInfo.historicalDetails?.foundingYear || '—'}</p>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-lg border border-gray-100">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <User className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Parish Priest</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">{churchInfo.currentParishPriest || '—'}</p>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-lg border border-gray-100">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <Landmark className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Style</span>
                </div>
                <p className="text-sm font-semibold text-gray-900 truncate">{churchInfo.historicalDetails?.architecturalStyle || '—'}</p>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-lg border border-gray-100">
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <Camera className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Media</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{(churchInfo.photos?.length || 0) + (churchInfo.documents?.length || 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Content */}
        <div className="bg-gradient-to-b from-slate-50 to-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <ScrollArea className="h-auto">
            <Tabs defaultValue="overview" className="w-full">
              <div className="px-6 pt-4">
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
                    <Clock className="w-4 h-4" />
                    <span className="hidden sm:inline">Pastoral</span>
                  </TabsTrigger>
                  <TabsTrigger value="media" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    <span className="hidden sm:inline">Media</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-0 p-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Church Details Card */}
                  <Card className="shadow-sm border-0 bg-white/80 backdrop-blur">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800">
                        <ChurchIcon className="w-4 h-4 text-emerald-600" />
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
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Parish Name</p>
                            <p className="text-sm font-semibold text-gray-900">{churchInfo.parishName || churchInfo.churchName || 'Not specified'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Location</p>
                            <p className="text-sm font-medium text-gray-900">{churchInfo.locationDetails?.municipality}, Bohol</p>
                            {churchInfo.locationDetails?.streetAddress && (
                              <p className="text-xs text-gray-500 mt-0.5">{churchInfo.locationDetails.streetAddress}</p>
                            )}
                          </div>
                        </div>
                        {churchInfo.coordinates && churchInfo.coordinates.lat !== 0 && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <Globe className="w-4 h-4 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Coordinates</p>
                              <p className="text-sm font-mono text-gray-700">
                                {churchInfo.coordinates.lat.toFixed(6)}, {churchInfo.coordinates.lng.toFixed(6)}
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
                      {(churchInfo.contactInfo?.phones?.length || churchInfo.contactInfo?.phone || churchInfo.contactInfo?.emails?.length || churchInfo.contactInfo?.email || churchInfo.contactInfo?.website || churchInfo.contactInfo?.facebookPage) ? (
                        <div className="space-y-3">
                          {/* Multiple Phones */}
                          {(churchInfo.contactInfo?.phones?.length ? churchInfo.contactInfo.phones : churchInfo.contactInfo?.phone ? [churchInfo.contactInfo.phone] : [])
                            .filter((p: string) => p && p.trim() && p !== '+63' && p !== '+63 ')
                            .map((phone: string, index: number) => (
                            <div key={`phone-${index}`} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                <Phone className="w-5 h-5 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-medium text-gray-500">Phone {(churchInfo.contactInfo?.phones?.length || 0) > 1 ? `#${index + 1}` : ''}</p>
                                <p className="text-sm font-semibold text-gray-900">{phone}</p>
                              </div>
                            </div>
                          ))}
                          {/* Multiple Emails */}
                          {(churchInfo.contactInfo?.emails?.length ? churchInfo.contactInfo.emails : churchInfo.contactInfo?.email ? [churchInfo.contactInfo.email] : [])
                            .filter((e: string) => e && e.trim())
                            .map((email: string, index: number) => (
                            <div key={`email-${index}`} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <Mail className="w-5 h-5 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-medium text-gray-500">Email {(churchInfo.contactInfo?.emails?.length || 0) > 1 ? `#${index + 1}` : ''}</p>
                                <p className="text-sm font-semibold text-gray-900">{email}</p>
                              </div>
                            </div>
                          ))}
                          {churchInfo.contactInfo?.website && (
                            <div 
                              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" 
                              onClick={() => window.open(churchInfo.contactInfo?.website, '_blank')}
                            >
                              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                <Globe className="w-5 h-5 text-purple-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-medium text-gray-500">Website</p>
                                <p className="text-sm font-semibold text-blue-600 hover:underline">{churchInfo.contactInfo.website}</p>
                              </div>
                              <ExternalLink className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          {churchInfo.contactInfo?.facebookPage && (
                            <div 
                              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" 
                              onClick={() => window.open(churchInfo.contactInfo?.facebookPage, '_blank')}
                            >
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
                        </div>
                      ) : (
                        <div className="text-center py-6 text-gray-500">
                          <Phone className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No contact information available</p>
                          <Button variant="outline" size="sm" className="mt-3" onClick={() => setCurrentView('profile')}>
                            <Plus className="w-4 h-4 mr-1" /> Add Contact Info
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Historical Tab */}
              <TabsContent value="historical" className="mt-0 p-6 space-y-6">
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
                        <p className="text-xl font-bold text-amber-900">{churchInfo.historicalDetails?.foundingYear || '—'}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100">
                        <Landmark className="w-5 h-5 text-purple-600 mb-2" />
                        <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Style</p>
                        <p className="text-sm font-bold text-purple-900">{churchInfo.historicalDetails?.architecturalStyle || '—'}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                        <Badge variant="outline" className={`${
                          churchInfo.historicalDetails?.heritageClassification === 'National Cultural Treasures' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          churchInfo.historicalDetails?.heritageClassification === 'Important Cultural Properties' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                          'bg-gray-100 text-gray-600 border-gray-300'
                        }`}>
                          {churchInfo.historicalDetails?.heritageClassification === 'National Cultural Treasures' ? 'National Cultural Treasure' :
                           churchInfo.historicalDetails?.heritageClassification === 'Important Cultural Properties' ? 'Important Cultural Property' :
                           'Not classified'}
                        </Badge>
                      </div>
                    </div>

                    {/* Text Sections */}
                    {churchInfo.historicalDetails?.founders && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" /> Founders
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed pl-6">{churchInfo.historicalDetails.founders}</p>
                      </div>
                    )}

                    {churchInfo.historicalDetails?.historicalBackground && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-gray-500" /> Historical Background
                        </h4>
                        <div className="text-sm text-gray-600 leading-relaxed pl-6 max-h-48 overflow-y-auto">
                          {churchInfo.historicalDetails.historicalBackground}
                        </div>
                      </div>
                    )}

                    {churchInfo.historicalDetails?.architecturalFeatures && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-500" /> Architectural Features
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed pl-6">{churchInfo.historicalDetails.architecturalFeatures}</p>
                      </div>
                    )}

                    {churchInfo.historicalDetails?.majorHistoricalEvents && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Landmark className="w-4 h-4 text-gray-500" /> Cultural Significance
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed pl-6">{churchInfo.historicalDetails.majorHistoricalEvents}</p>
                      </div>
                    )}

                    {churchInfo.historicalDetails?.heritageInformation && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Info className="w-4 h-4 text-gray-500" /> Heritage Information
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed pl-6">{churchInfo.historicalDetails.heritageInformation}</p>
                      </div>
                    )}

                    {!churchInfo.historicalDetails?.founders && 
                     !churchInfo.historicalDetails?.historicalBackground && 
                     !churchInfo.historicalDetails?.architecturalFeatures && 
                     !churchInfo.historicalDetails?.majorHistoricalEvents &&
                     !churchInfo.historicalDetails?.heritageInformation && (
                      <div className="text-center py-8 text-gray-500">
                        <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No historical information available yet</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => setCurrentView('profile')}>
                          <Edit className="w-4 h-4 mr-1" /> Add Historical Details
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Pastoral Tab */}
              <TabsContent value="pastoral" className="mt-0 p-6 space-y-6">
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
                          <p className="text-lg font-bold text-gray-900">{churchInfo.currentParishPriest || 'Not assigned'}</p>
                        </div>
                      </div>
                      
                      {churchInfo.feastDay && (
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                          <div className="w-14 h-14 rounded-full bg-amber-200 flex items-center justify-center">
                            <Calendar className="w-7 h-7 text-amber-700" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Feast Day</p>
                            <p className="text-lg font-bold text-gray-900">{churchInfo.feastDay}</p>
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
                      {churchInfo.massSchedules && churchInfo.massSchedules.length > 0 ? (
                        <div className="space-y-4">
                          {(() => {
                            const schedules = churchInfo.massSchedules;
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

                            const renderSchedule = (schedule: typeof schedules[0], index: number) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="font-medium">{formatTime(schedule.time)}</span>
                                {schedule.endTime && <span className="text-gray-400">– {formatTime(schedule.endTime)}</span>}
                                {schedule.language && schedule.language !== 'Cebuano' && (
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
                              [...arr].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

                            return (
                              <div className="space-y-3 max-h-64 overflow-y-auto">
                                {schedulesByDay['Sunday'].length > 0 && (
                                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                                    <div className="font-semibold text-amber-800 mb-2 text-sm"> Sunday</div>
                                    <div className="space-y-1.5 pl-2">
                                      {sortByTime(schedulesByDay['Sunday']).map(renderSchedule)}
                                    </div>
                                  </div>
                                )}
                                {dailySchedules.length > 0 && (
                                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                                    <div className="font-semibold text-blue-800 mb-2 text-sm"> Daily (Mon–Fri)</div>
                                    <div className="space-y-1.5 pl-2">
                                      {sortByTime(dailySchedules).map(renderSchedule)}
                                    </div>
                                  </div>
                                )}
                                {schedulesByDay['Saturday'].length > 0 && (
                                  <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                                    <div className="font-semibold text-purple-800 mb-2 text-sm"> Saturday</div>
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
                          <Button variant="outline" size="sm" className="mt-3" onClick={() => setCurrentView('profile')}>
                            <Plus className="w-4 h-4 mr-1" /> Add Mass Schedule
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Media Tab */}
              <TabsContent value="media" className="mt-0 p-6 space-y-6">
                {/* Images Gallery */}
                <Card className="shadow-sm border-0 bg-white/80 backdrop-blur">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800">
                      <ImageIcon className="w-4 h-4 text-purple-600" />
                      Photo Gallery
                      {churchInfo.photos && churchInfo.photos.length > 0 && (
                        <Badge variant="secondary" className="ml-2">{churchInfo.photos.length}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hasImages ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {existingChurch?.images?.map((image, index) => (
                          <div 
                            key={index} 
                            className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-emerald-400 transition-all"
                            onClick={() => window.open(image, '_blank')}
                          >
                            <img
                              src={image}
                              alt={`${churchInfo.churchName} - Photo ${index + 1}`}
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
                        <p className="text-sm">No photos uploaded yet</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => setCurrentView('profile')}>
                          <Camera className="w-4 h-4 mr-1" /> Add Photos
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 360° Virtual Tours */}
                {existingChurch?.virtualTour?.scenes && existingChurch.virtualTour.scenes.length > 0 && (
                  <Card className="shadow-sm border-0 bg-white/80 backdrop-blur">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2 text-gray-800">
                        <Eye className="w-4 h-4 text-blue-600" />
                        360° Virtual Tours
                        <Badge variant="secondary" className="ml-2">{existingChurch.virtualTour.scenes.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {existingChurch.virtualTour.scenes.map((scene, index) => (
                          <div key={index} className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 hover:shadow-md transition-shadow cursor-pointer">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
                                <Eye className="w-5 h-5 text-blue-700" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{scene.title || `Tour ${index + 1}`}</p>
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
                      {hasDocuments && (
                        <Badge variant="secondary" className="ml-2">{existingChurch?.documents?.length}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hasDocuments ? (
                      <div className="space-y-2">
                        {existingChurch?.documents?.map((doc, index) => {
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
                              <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-amber-600 transition-colors" />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No documents uploaded yet</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => setCurrentView('profile')}>
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
      </div>
    );
  };

  // Show loading state while fetching church data
  if (isLoading) {
    return (
      <Layout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        churchApproved={false}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <div className="space-y-2">
              <p className="text-lg font-semibold text-foreground">Loading Dashboard...</p>
              <p className="text-sm text-muted-foreground">Syncing your church information</p>
            </div>
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
          {existingChurch.status === 'approved' && !dismissedApprovedBanner && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <span className="font-medium text-green-900">Church Profile Approved!</span>
                  <p className="text-sm text-green-700">Your church information is now published and visible to visitors.</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (userProfile?.uid) {
                    const key = `dismissed_approval_banner_${userProfile.uid}`;
                    localStorage.setItem(key, 'true');
                    setDismissedApprovedBanner(true);
                  }
                }}
                className="text-green-600 hover:text-green-700 hover:bg-green-100 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          {existingChurch.status === 'heritage_review' && (
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 flex items-center gap-2">
              <Building className="w-5 h-5 text-violet-600" />
              <div>
                <span className="font-medium text-violet-900">Heritage Review in Progress</span>
                <p className="text-sm text-violet-700">Your church has been forwarded to the Heritage Reviewer for heritage validation.</p>
              </div>
            </div>
          )}
          {existingChurch.status === 'pending' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <div>
                <span className="font-medium text-emerald-900">Review in Progress</span>
                <p className="text-sm text-emerald-700">Your church profile is being reviewed by the chancery office.</p>
              </div>
            </div>
          )}
          {existingChurch.status === 'draft' && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-2">
              <Edit className="w-5 h-5 text-slate-600" />
              <div>
                <span className="font-medium text-slate-900">Draft Saved</span>
                <p className="text-sm text-slate-700">Your church profile is saved as a draft. Click "Edit Profile" to continue editing and submit for review.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {currentView === 'account' ? (
        <ParishAccount
          onClose={() => {
            setCurrentView('overview');
            setActiveTab('overview');
          }}
        />
      ) : currentView === 'staff' ? (
        userProfile && (
          <PendingParishStaff
            parishId={userProfile.parishId || userProfile.parish || ''}
            currentUser={userProfile}
            onStaffApproved={() => {
              toast({
                title: "Staff Approved",
                description: "The new parish staff member has been activated successfully.",
              });
            }}
          />
        )
      ) : currentView === 'reports' ? (
        <ParishReports
          churchInfo={churchInfo}
          onClose={() => {
            setCurrentView('overview');
            setActiveTab('overview');
          }}
          userId={userProfile?.uid || ''}
          userRole={(userProfile?.role as 'chancery_office' | 'parish' | 'museum_researcher') || 'parish'}
        />) : currentView === 'announcements' ? (
        <ParishAnnouncements
          churchId={churchId || existingChurch?.id || userProfile?.parishId || userProfile?.parish || ''}
          onClose={() => {
            setCurrentView('overview');
            setActiveTab('overview');
          }}
        />
      ) : currentView === 'feedback' ? (
        <ParishFeedback
          churchName={churchInfo.churchName || churchInfo.name || 'Your Parish'}
          churchId={churchId || existingChurch?.id || userProfile?.parishId || userProfile?.parish || ''}
        />
      ) : currentView === 'profile' ? (
        <ChurchProfileForm
          initialData={churchInfo}
          onSave={handleProfileFormSave}
          onSubmit={handleProfileFormSubmit}
          onCancel={() => {
            const visitKey = `parish_dashboard_visited_${userProfile?.uid || 'user'}`;
            const hasVisitedBefore = localStorage.getItem(visitKey);

            if (hasVisitedBefore || churchInfo.status === 'approved') {
              setCurrentView('overview');
            } else {
              markDashboardVisited();
              setCurrentView('overview');
            }
          }}
          currentStatus={churchInfo.status}
          isSubmitting={isSubmitting}
          isSaving={isSaving}
          churchId={churchId || existingChurch?.id || userProfile?.parishId || userProfile?.parish || undefined}
        />
      ) : !existingChurch ? (
        // Welcome screen for new parishes without church profile
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg border-2 border-emerald-200">
            <CardHeader className="text-center pb-4 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-full flex items-center justify-center shadow-lg">
                  <ChurchIcon className="w-10 h-10 text-white" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-emerald-900 mb-2">
                Welcome to {userProfile?.parishInfo?.name || userProfile?.name || 'Your Parish'} Dashboard! 👋
              </CardTitle>
              <CardDescription className="text-lg text-slate-700">
                Let's get started by creating your church profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
                <h3 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  What you can do with your church profile:
                </h3>
                <ul className="space-y-2 text-emerald-800">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-1">✓</span>
                    <span>Share your parish's rich history and heritage with visitors</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-1">✓</span>
                    <span>Upload photos including 360° virtual tours of your church</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-1">✓</span>
                    <span>Manage mass schedules and contact information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-1">✓</span>
                    <span>Post announcements and events for your parishioners</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-1">✓</span>
                    <span>Track visitor engagement and generate reports</span>
                  </li>
                </ul>
              </div>

              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                <p className="text-teal-900 text-sm flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Note:</strong> Your church profile will be submitted to the Chancery Office for review before it becomes visible to the public.
                  </span>
                </p>
              </div>

              <div className="flex justify-center pt-4">
                <Button
                  onClick={() => setCurrentView('profile')}
                  size="lg"
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        renderParishProfile()
      )}
    </Layout>
  );
};

export default ParishDashboard;