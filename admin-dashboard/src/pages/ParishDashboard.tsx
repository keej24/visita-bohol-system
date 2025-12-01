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
  Info
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
import { db } from '@/lib/firebase';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';

// View type for managing which content is displayed
type ViewType = 'overview' | 'profile' | 'reports' | 'account' | 'announcements' | 'feedback';

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
  
  // Load dismissed state from localStorage - use uid for consistent key
  const [dismissedApprovedBanner, setDismissedApprovedBanner] = useState(() => {
    const key = `dismissed_approval_banner_${userProfile?.uid || 'user'}`;
    return localStorage.getItem(key) === 'true';
  });

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
    // Helper to convert religious classification from Firestore to form format
    const convertReligiousClassification = (classification?: string) => {
      switch (classification) {
        case 'diocesan_shrine': return 'Diocesan Shrine';
        case 'jubilee_church': return 'Jubilee Church';
        case 'papal_basilica_affinity': return 'Papal Basilica Affinity';
        case 'none':
        default: return 'None';
      }
    };

    // Helper to convert architectural style from Firestore to form format
    const convertArchitecturalStyle = (style?: string) => {
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
        supportingDocuments: [],
        architecturalFeatures: church.architecturalFeatures || '',
        heritageInformation: church.heritageInformation || ''
      },
      currentParishPriest: church.assignedPriest || '',
      massSchedules: (church.massSchedules || []).map(schedule => ({
        day: schedule.day || '',
        time: schedule.time?.split(' - ')[0] || '',
        endTime: schedule.time?.split(' - ')[1] || '',
        language: schedule.language || 'Filipino',
        isFbLive: schedule.isFbLive || false
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

            // Show form only if status is pending
            if (church.status === 'pending') {
              setCurrentView('profile');
            } else {
              setCurrentView('overview');
            }
          } else {
            // No existing church - initialize with default data but don't show form yet
            console.log('⚠️ [PARISH DASHBOARD] No church found for:', {
              searchedWith: userProfile.parishId || userProfile.parish,
              userParishId: userProfile.parishId,
              userParish: userProfile.parish
            });
            const displayName = userProfile.parishInfo?.fullName || userProfile.parish || '';
            setChurchInfo(prev => ({
              ...prev,
              churchName: displayName,
              name: displayName,
              diocese: userProfile.diocese
            }));
            setCurrentView('overview'); // Changed to overview - user must click "Add Profile" button
          }
        })
        .catch((error) => {
          console.error('Error loading church data:', error);
          toast({
            title: "Error Loading Church",
            description: "Failed to load church data. Using default settings.",
            variant: "destructive"
          });
          // Fallback to default initialization
          const displayName = userProfile.parishInfo?.fullName || userProfile.parish || '';
          setChurchInfo(prev => ({
            ...prev,
            churchName: displayName,
            name: displayName,
            diocese: userProfile.diocese
          }));
          setCurrentView('overview'); // Changed to overview - user must click "Add Profile" button
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

  // Show profile form immediately on first visit
  useEffect(() => {
    let isMounted = true;
    
    const visitKey = `parish_dashboard_visited_${userProfile?.uid || 'user'}`;
    const isFirstVisit = !localStorage.getItem(visitKey);
    
    // Show form immediately on first visit OR if profile status is pending/incomplete
    // Only update state if component is still mounted
    if (isMounted && (isFirstVisit || churchInfo.status === 'pending' || !churchInfo.churchName)) {
      setCurrentView('profile');
    }
    
    return () => {
      isMounted = false;
    };
  }, [churchInfo.status, churchInfo.churchName, userProfile?.uid]);

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
        language: schedule.language || 'Filipino',
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
      const styleMap: Record<string, string> = {
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
      religiousClassification: mapReligiousClassification(data.historicalDetails.religiousClassification || 'None') as import('@/types/church').ReligiousClassification,
      assignedPriest: data.currentParishPriest || '',
      feastDay: data.feastDay || '',
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
      architecturalFeatures: data.historicalDetails.architecturalFeatures || '',
      heritageInformation: data.historicalDetails.heritageInformation || '',
      tags: [],
      category: 'parish_church'
    };
  };

  // Form submission handlers
  const handleProfileFormSave = async (data: ChurchInfo) => {
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
        // Update existing church as draft - manually set status to draft
        const docRef = doc(db, 'churches', existingChurch.id);
        await updateDoc(docRef, {
          ...formData,
          status: 'draft',
          parishId: parishIdentifier,
          updatedAt: serverTimestamp()
        });
        
        setChurchInfo({ ...data, status: 'draft', id: existingChurch.id });
        toast({ 
          title: "Success", 
          description: "Church profile saved as draft!" 
        });
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
          description: "Church profile created as draft!" 
        });
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error",
        description: "Failed to save draft. Please try again.",
        variant: "destructive"
      });
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
        } else {
          await ChurchService.updateChurch(
            existingChurch.id,
            formData,
            userProfile.diocese,
            userProfile.uid
          );
        }

        // Update churchInfo with new status
        setChurchInfo({ ...data, status: newStatus, id: existingChurch.id });
        setCurrentView('overview');

        const statusText = newStatus === 'approved' ? 'updated' : 'submitted for review';

        toast({
          title: "Success",
          description: `Church profile ${statusText} successfully!`
        });

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
      <div className="bg-gradient-to-r from-indigo-50 to-sky-50 rounded-lg shadow-sm border border-indigo-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <ChurchIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-indigo-900 mb-1">
                {getGreeting()}! 👋
              </h1>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">
                {churchInfo.churchName || churchInfo.name || "Your Parish"}
              </h2>
              <div className="flex items-center gap-3">
                {getStatusBadge()}
                {churchInfo.locationDetails?.municipality && (
                  <Badge variant="outline" className="text-indigo-800 border-indigo-300">
                    <MapPin className="w-3 h-3 mr-1" />
                    {churchInfo.locationDetails.municipality}, {churchInfo.locationDetails.province}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <Button 
            onClick={() => setCurrentView('profile')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Parish Profile Summary */}
      <Card className="border-indigo-200">
        <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-transparent">
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <ChurchIcon className="w-5 h-5 text-indigo-600" />
            Parish Profile
          </CardTitle>
          <CardDescription className="text-slate-600">
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
                  <span className="text-sm font-medium text-gray-500">Barangay:</span>
                  <p className="text-gray-900">{churchInfo.locationDetails?.barangay || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Municipality:</span>
                  <p className="text-gray-900">{churchInfo.locationDetails?.municipality || 'Not specified'}</p>
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
                  const key = `dismissed_approval_banner_${userProfile?.uid || 'user'}`;
                  localStorage.setItem(key, 'true');
                  setDismissedApprovedBanner(true);
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
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <div>
                <span className="font-medium text-blue-900">Review in Progress</span>
                <p className="text-sm text-blue-700">Your church profile is being reviewed by the chancery office.</p>
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
      ) : currentView === 'reports' ? (
        <ParishReports
          churchInfo={churchInfo}
          onClose={() => {
            setCurrentView('overview');
            setActiveTab('overview');
          }}
        />
      ) : currentView === 'announcements' ? (
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
          isSubmitting={isSubmitting || isSaving}
          churchId={churchId || undefined}
        />
      ) : !existingChurch ? (
        // Welcome screen for new parishes without church profile
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg border-2 border-indigo-200">
            <CardHeader className="text-center pb-4 bg-gradient-to-r from-indigo-50 to-sky-50">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <ChurchIcon className="w-10 h-10 text-white" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-indigo-900 mb-2">
                Welcome to {userProfile?.parishInfo?.name || userProfile?.name || 'Your Parish'} Dashboard! 👋
              </CardTitle>
              <CardDescription className="text-lg text-slate-700">
                Let's get started by creating your church profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  What you can do with your church profile:
                </h3>
                <ul className="space-y-2 text-indigo-800">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-1">✓</span>
                    <span>Share your parish's rich history and heritage with visitors</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-1">✓</span>
                    <span>Upload photos including 360° virtual tours of your church</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-1">✓</span>
                    <span>Manage mass schedules and contact information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-1">✓</span>
                    <span>Post announcements and events for your parishioners</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-600 mt-1">✓</span>
                    <span>Track visitor engagement and generate reports</span>
                  </li>
                </ul>
              </div>

              <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                <p className="text-sky-900 text-sm flex items-start gap-2">
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
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
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