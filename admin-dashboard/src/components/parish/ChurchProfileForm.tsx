import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Church,
  MapPin,
  CheckCircle,
  AlertCircle,
  X,
  Plus,
  Save,
  Send,
  Calendar,
  Phone,
  Mail,
  ExternalLink,
  User,
  Building,
  Building2,
  History,
  Landmark,
  Image,
  RotateCcw,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { ChurchInfo, MassSchedule } from './types';
import { VirtualTourManager } from '../360/VirtualTourManager';
import PhotoUploader from './PhotoUploader';
import DocumentUploader from './DocumentUploader';
import { CoordinateMapPicker } from './CoordinateMapPicker';
import { assessHeritageSignificance, type HeritageAssessment } from '@/lib/heritage-detection';
import { uploadChurchImage, uploadDocument, deleteFile, compressImage } from '@/lib/storage';

interface ChurchProfileFormProps {
  initialData?: Partial<ChurchInfo>;
  onSave: (data: ChurchInfo) => Promise<string | void> | void; // Can return churchId after save
  onSubmit: (data: ChurchInfo) => void;
  onCancel?: () => void;
  currentStatus?: string;
  isSubmitting?: boolean;
  isSaving?: boolean;
  showCancelButton?: boolean;
  isModal?: boolean;
  isChanceryEdit?: boolean; // New prop to determine if chancery/museum is editing
  isMuseumResearcher?: boolean; // Museum researcher can only edit historical tab and documents
  churchId?: string; // Church ID for hotspot editing
}

export const ChurchProfileForm: React.FC<ChurchProfileFormProps> = ({
  initialData,
  onSave,
  onSubmit,
  onCancel,
  currentStatus,
  isSubmitting = false,
  isSaving = false,
  showCancelButton = false,
  isModal = false,
  isChanceryEdit = false,
  isMuseumResearcher = false,
  churchId
}) => {
  const { toast } = useToast();
  // Museum researchers should start on the historical tab since they can only edit that
  const [activeTab, setActiveTab] = useState(isMuseumResearcher ? 'historical' : 'basic');
  const [heritageAssessment, setHeritageAssessment] = useState<HeritageAssessment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  // Track effective churchId - can be updated after auto-save
  const [effectiveChurchId, setEffectiveChurchId] = useState<string | undefined>(churchId);
  
  // Inline validation state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  // NOTE: Virtual tour now managed by VirtualTourManager component

  // Update effectiveChurchId when prop changes
  React.useEffect(() => {
    if (churchId) {
      setEffectiveChurchId(churchId);
    }
  }, [churchId]);

  // Form state with cleaner structure
  const [formData, setFormData] = useState<ChurchInfo>({
    // Basic Church Information
    // Use parishName as primary field, fallback to churchName for backward compatibility
    parishName: initialData?.parishName || initialData?.churchName || '',
    churchName: initialData?.parishName || initialData?.churchName || '',
    
    // Location Details
    locationDetails: {
      streetAddress: initialData?.locationDetails?.streetAddress || '',
      barangay: initialData?.locationDetails?.barangay || '',
      municipality: initialData?.locationDetails?.municipality || '',
      province: initialData?.locationDetails?.province || 'Bohol'
    },
    coordinates: {
      lat: initialData?.coordinates?.lat || 0,
      lng: initialData?.coordinates?.lng || 0
    },
    
    // Historical & Cultural Information
    historicalDetails: {
      foundingYear: initialData?.historicalDetails?.foundingYear || '',
      founders: initialData?.historicalDetails?.founders || '',
      architecturalStyle: initialData?.historicalDetails?.architecturalStyle || '',
      historicalBackground: initialData?.historicalDetails?.historicalBackground || '',
      majorHistoricalEvents: initialData?.historicalDetails?.majorHistoricalEvents || '',
      heritageClassification: initialData?.historicalDetails?.heritageClassification || 'None',
      religiousClassification: initialData?.historicalDetails?.religiousClassification || 'None',
      religiousClassifications: initialData?.historicalDetails?.religiousClassifications || 
        (initialData?.historicalDetails?.religiousClassification && initialData?.historicalDetails?.religiousClassification !== 'None' 
          ? [initialData?.historicalDetails?.religiousClassification as 'Diocesan Shrine' | 'Jubilee Church' | 'Papal Basilica Affinity' | 'Holy Door'] 
          : []),
      supportingDocuments: initialData?.historicalDetails?.supportingDocuments || [],
      architecturalFeatures: initialData?.historicalDetails?.architecturalFeatures || '',
      heritageInformation: initialData?.historicalDetails?.heritageInformation || ''
    },
    
    // Current Parish Operations
    currentParishPriest: initialData?.currentParishPriest || '',
    feastDay: initialData?.feastDay || '',
    massSchedules: initialData?.massSchedules || [],
    contactInfo: {
      phone: initialData?.contactInfo?.phone || '+63 ',
      email: initialData?.contactInfo?.email || '',
      website: initialData?.contactInfo?.website || '',
      facebookPage: initialData?.contactInfo?.facebookPage || ''
    },
    
    // Media Collections
    photos: initialData?.photos || [],
    documents: initialData?.documents || [],
    virtual360Images: initialData?.virtual360Images || [],

    // Consent & Ethics
    parishConsentConfirmed: initialData?.parishConsentConfirmed || false,
    devotionalContentAcknowledged: initialData?.devotionalContentAcknowledged || false,

    // Legacy compatibility fields
    name: initialData?.name || '',
    location: initialData?.location || '',
    priest: initialData?.priest || '',
    founded: initialData?.founded || '',
    classification: initialData?.classification || '',
    description: initialData?.description || '',
    status: initialData?.status || 'draft'
  });

  const [pendingSchedules, setPendingSchedules] = useState<MassSchedule[]>([]);
  const [scheduleForm, setScheduleForm] = useState({
    time: '',
    endTime: '',
    isEnglish: false,
    isFbLive: false,
    selectedDays: [] as string[]
  });

  // Form validation and completion tracking
  const getRequiredFields = () => ({
    basic: [
      { field: formData.parishName, label: 'Parish Name' },
      { field: formData.churchName, label: 'Church Name' },
      { field: formData.locationDetails.streetAddress, label: 'Street Address' },
      { field: formData.locationDetails.barangay, label: 'Barangay' },
      { field: formData.locationDetails.municipality, label: 'Municipality' },
      { field: formData.coordinates.lat, label: 'Latitude' },
      { field: formData.coordinates.lng, label: 'Longitude' }
    ],
    historical: [
      { field: formData.historicalDetails.foundingYear, label: 'Founding Year' },
      { field: formData.historicalDetails.architecturalStyle, label: 'Architectural Style' },
      { field: formData.historicalDetails.historicalBackground, label: 'Historical Background' }
    ],
    parish: [
      { field: formData.currentParishPriest, label: 'Current Parish Priest' },
      { field: formData.massSchedules.length > 0 ? 'has-schedules' : '', label: 'Mass Schedule' }
    ],
    media: [] // Optional section
  });

  const calculateTabCompletion = (tabName: keyof ReturnType<typeof getRequiredFields>) => {
    const fields = getRequiredFields()[tabName];
    if (fields.length === 0) return 100; // Optional sections
    
    const completed = fields.filter(({ field }) => field && field.toString().trim() !== '').length;
    return Math.round((completed / fields.length) * 100);
  };

  const calculateOverallCompletion = () => {
    const requiredTabs = ['basic', 'historical', 'parish'] as const;
    const totalCompletion = requiredTabs.reduce((sum, tab) => sum + calculateTabCompletion(tab), 0);
    return Math.round(totalCompletion / requiredTabs.length);
  };

  const completionPercentage = calculateOverallCompletion();

  // Heritage Assessment - Run when form data changes
  useEffect(() => {
    // Skip assessment if church is already approved
    if (currentStatus === 'approved') {
      setHeritageAssessment(null);
      return;
    }

    // Only run assessment if we have enough data
    if (formData.churchName && (formData.historicalDetails.foundingYear || formData.historicalDetails.architecturalStyle)) {
      try {
        const assessment = assessHeritageSignificance(formData);
        setHeritageAssessment(assessment);
      } catch (error) {
        console.error('Heritage assessment error:', error);
        setHeritageAssessment(null);
      }
    } else {
      setHeritageAssessment(null);
    }
  }, [formData, currentStatus]);

  // Handle tab change - auto-save when switching to Media tab if no churchId exists
  const handleTabChange = async (newTab: string) => {
    // If switching to media tab and no churchId exists, auto-save first
    if (newTab === 'media' && !effectiveChurchId && !isChanceryEdit && !isMuseumResearcher) {
      // Validate minimum required fields before auto-save
      if (!formData.parishName?.trim()) {
        toast({
          title: "Parish Name Required",
          description: "Please enter a parish name before accessing the Media tab.",
          variant: "destructive"
        });
        return;
      }

      setAutoSaving(true);
      try {
        // Prepare data for save
        const updatedData = {
          ...formData,
          name: formData.churchName || formData.parishName,
          location: `${formData.locationDetails.streetAddress}, ${formData.locationDetails.barangay}, ${formData.locationDetails.municipality}`,
          priest: formData.currentParishPriest,
          founded: formData.historicalDetails.foundingYear,
          classification: formData.historicalDetails.heritageClassification,
          description: formData.historicalDetails.historicalBackground
        };

        // Call onSave and get the returned churchId
        const result = await onSave(updatedData);
        
        if (result && typeof result === 'string') {
          setEffectiveChurchId(result);
          toast({
            title: "Profile Auto-Saved",
            description: "Your church profile has been saved as a draft. You can now manage virtual tours.",
          });
        }
        
        // Switch to the media tab
        setActiveTab(newTab);
      } catch (error) {
        console.error('Auto-save error:', error);
        toast({
          title: "Auto-Save Failed",
          description: "Could not save the profile. Please try saving manually first.",
          variant: "destructive"
        });
      } finally {
        setAutoSaving(false);
      }
    } else {
      // Normal tab switch
      setActiveTab(newTab);
    }
  };

  // Inline field validation functions
  const validateField = (fieldName: string, value: string | number | null | undefined): string => {
    const currentYear = new Date().getFullYear();
    
    switch (fieldName) {
      case 'parishName':
      case 'churchName':
        return !value || !String(value).trim() ? 'Parish Name is required' : '';
      case 'streetAddress':
        return !value || !String(value).trim() ? 'Street Address is required' : '';
      case 'barangay':
        return !value || !String(value).trim() ? 'Barangay is required' : '';
      case 'municipality':
        return !value || !String(value).trim() ? 'Municipality is required' : '';
      case 'latitude': {
        if (!value && value !== 0) return 'Latitude is required';
        const lat = Number(value);
        if (isNaN(lat)) return 'Invalid latitude value';
        if (lat < -90 || lat > 90) return 'Latitude must be between -90 and 90';
        if (lat < 9.4 || lat > 10.2) return 'Latitude appears to be outside Bohol region';
        return '';
      }
      case 'longitude': {
        if (!value && value !== 0) return 'Longitude is required';
        const lng = Number(value);
        if (isNaN(lng)) return 'Invalid longitude value';
        if (lng < -180 || lng > 180) return 'Longitude must be between -180 and 180';
        if (lng < 123.7 || lng > 124.7) return 'Longitude appears to be outside Bohol region';
        return '';
      }
      case 'foundingYear': {
        if (!value || !String(value).trim()) return 'Founding Year is required';
        const year = parseInt(String(value), 10);
        if (isNaN(year)) return 'Please enter a valid year';
        if (year < 1500 || year > currentYear) return `Year must be between 1500 and ${currentYear}`;
        return '';
      }
      case 'architecturalStyle':
        return !value || !String(value).trim() ? 'Architectural Style is required' : '';
      case 'historicalBackground': {
        if (!value || !String(value).trim()) return 'Historical Background is required';
        if (String(value).trim().length < 50) return 'Minimum 50 characters required';
        return '';
      }
      case 'currentParishPriest':
        return !value || !String(value).trim() ? 'Current Parish Priest is required' : '';
      case 'phone': {
        if (!value || !String(value).trim()) return '';
        const phoneRegex = /^[\d\s\-()+ ]+$/;
        if (!phoneRegex.test(String(value))) return 'Phone number contains invalid characters';
        const digitCount = String(value).replace(/\D/g, '').length;
        // With +63 prefix (2 digits) + 10 digits (9XX-XXX-XXXX) = 12 total
        if (digitCount !== 12) return 'Please enter 10 digits after +63 (e.g., +63 9XX-XXX-XXXX)';
        return '';
      }
      case 'email': {
        if (!value || !String(value).trim()) return '';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) return 'Please enter a valid email address';
        return '';
      }
      case 'website': {
        if (!value || !String(value).trim()) return '';
        const urlRegex = /^(https?:\/\/)?([\\da-z.-]+)\.([a-z.]{2,6})([/\\w .-]*)*\/?$/;
        if (!urlRegex.test(String(value))) return 'Please enter a valid website URL';
        return '';
      }
      default:
        return '';
    }
  };

  const markFieldTouched = (fieldName: string) => {
    setTouchedFields(prev => new Set(prev).add(fieldName));
  };

  const updateFieldError = (fieldName: string, value: string | number | null | undefined) => {
    const error = validateField(fieldName, value);
    setFieldErrors(prev => ({ ...prev, [fieldName]: error }));
    return error;
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return touchedFields.has(fieldName) ? fieldErrors[fieldName] : undefined;
  };

  // Form field updaters
  const updateBasicField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (touchedFields.has(field)) {
      updateFieldError(field, value);
    }
  };

  const updateLocationField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      locationDetails: { ...prev.locationDetails, [field]: value }
    }));
    if (touchedFields.has(field)) {
      updateFieldError(field, value);
    }
  };

  const updateHistoricalField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      historicalDetails: { ...prev.historicalDetails, [field]: value }
    }));
    if (touchedFields.has(field)) {
      updateFieldError(field, value);
    }
  };

  const toggleReligiousClassification = (classification: 'Diocesan Shrine' | 'Jubilee Church' | 'Papal Basilica Affinity' | 'Holy Door') => {
    setFormData(prev => {
      const current = prev.historicalDetails.religiousClassifications || [];
      const isSelected = current.includes(classification);
      const updated = isSelected
        ? current.filter(c => c !== classification)
        : [...current, classification];
      return {
        ...prev,
        historicalDetails: { 
          ...prev.historicalDetails, 
          religiousClassifications: updated,
          // Keep legacy field in sync for backward compatibility
          religiousClassification: updated.length > 0 ? updated[0] : 'None'
        }
      };
    });
  };

  const updateContactField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contactInfo: { ...prev.contactInfo, [field]: value }
    }));
    if (touchedFields.has(field)) {
      updateFieldError(field, value);
    }
  };

  const updateCoordinates = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      coordinates: { lat, lng }
    }));
    if (touchedFields.has('latitude')) {
      updateFieldError('latitude', lat);
    }
    if (touchedFields.has('longitude')) {
      updateFieldError('longitude', lng);
    }
  };

  // Mass schedule management
  const toggleDaySelection = (day: string) => {
    setScheduleForm(prev => ({
      ...prev,
      selectedDays: prev.selectedDays.includes(day)
        ? prev.selectedDays.filter(d => d !== day)
        : [...prev.selectedDays, day]
    }));
  };

  // Helper function to add 1 hour to a time string (HH:MM format)
  const addOneHour = (timeString: string): string => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':').map(Number);
    const newHours = (hours + 1) % 24; // Wrap around at midnight
    return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Handle start time change - auto-calculate end time
  const handleStartTimeChange = (newStartTime: string) => {
    setScheduleForm(prev => ({
      ...prev,
      time: newStartTime,
      // Auto-fill end time only if it's empty or was previously auto-calculated
      endTime: !prev.endTime || prev.endTime === addOneHour(prev.time) 
        ? addOneHour(newStartTime) 
        : prev.endTime
    }));
  };

  // Add schedule to pending list (batch mode)
  const addToPendingSchedules = () => {
    if (!scheduleForm.time || !scheduleForm.endTime) {
      toast({
        title: "Incomplete Information",
        description: "Please set both start time and end time for the mass schedule.",
        variant: "destructive"
      });
      return;
    }

    if (!scheduleForm.selectedDays || scheduleForm.selectedDays.length === 0) {
      toast({
        title: "No Days Selected",
        description: "Please select at least one day for this mass schedule.",
        variant: "destructive"
      });
      return;
    }

    const newSchedules = scheduleForm.selectedDays.map(day => ({
      day,
      time: scheduleForm.time,
      endTime: scheduleForm.endTime,
      language: scheduleForm.isEnglish ? 'English' : 'Cebuano',
      isFbLive: scheduleForm.isFbLive
    }));

    // Check for duplicates in existing schedules
    const allExistingSchedules = [...formData.massSchedules, ...pendingSchedules];
    const duplicates: string[] = [];
    
    newSchedules.forEach(newSchedule => {
      const isDuplicate = allExistingSchedules.some(existing => 
        existing.day === newSchedule.day &&
        existing.time === newSchedule.time &&
        existing.endTime === newSchedule.endTime
      );
      
      if (isDuplicate) {
        duplicates.push(newSchedule.day);
      }
    });

    if (duplicates.length > 0) {
      toast({
        title: "Duplicate Schedule Detected",
        description: `A mass schedule with the same time already exists for: ${duplicates.join(', ')}. Please use a different time or remove the existing schedule first.`,
        variant: "destructive"
      });
      return;
    }

    // Add and sort by time
    setPendingSchedules(prev => sortSchedulesByDayAndTime([...prev, ...newSchedules]));

    // Reset time fields and selected days, keep English and FB Live checkboxes
    setScheduleForm(prev => ({ ...prev, time: '', endTime: '', selectedDays: [] }));

    toast({
      title: "Added to List",
      description: `Mass schedule added to pending list for ${scheduleForm.selectedDays.length} day(s). Add more or click "Save All Schedules".`,
    });
  };

  // Save all pending schedules
  const saveAllPendingSchedules = () => {
    if (pendingSchedules.length === 0) {
      toast({
        title: "No Schedules",
        description: "Add at least one schedule before saving.",
        variant: "destructive"
      });
      return;
    }

    // Combine and sort all schedules by day and time
    const combinedSchedules = sortSchedulesByDayAndTime([...formData.massSchedules, ...pendingSchedules]);

    setFormData(prev => ({
      ...prev,
      massSchedules: combinedSchedules
    }));

    setPendingSchedules([]);
    setScheduleForm({ time: '', endTime: '', isEnglish: false, isFbLive: false, selectedDays: [] });

    toast({
      title: "Success",
      description: `${pendingSchedules.length} mass schedule(s) saved and sorted by time!`,
    });
  };

  // Remove from pending list
  const removePendingSchedule = (index: number) => {
    setPendingSchedules(prev => prev.filter((_, i) => i !== index));
    toast({ title: "Removed", description: "Schedule removed from pending list." });
  };

  // Legacy function for backward compatibility (can be removed later)
  const addMassScheduleForSelectedDays = () => {
    addToPendingSchedules();
  };

  const removeMassSchedule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      massSchedules: prev.massSchedules.filter((_, i) => i !== index)
    }));
    toast({ title: "Success", description: "Mass schedule removed." });
  };

  // Remove all matching mass schedules (for Daily masses that span multiple days)
  const removeMatchingSchedules = (schedule: MassSchedule) => {
    const countBefore = formData.massSchedules.length;

    setFormData(prev => ({
      ...prev,
      massSchedules: prev.massSchedules.filter(s =>
        !(s.time === schedule.time &&
          s.endTime === schedule.endTime &&
          s.language === schedule.language &&
          s.isFbLive === schedule.isFbLive)
      )
    }));

    const countAfter = formData.massSchedules.filter(s =>
      !(s.time === schedule.time &&
        s.endTime === schedule.endTime &&
        s.language === schedule.language &&
        s.isFbLive === schedule.isFbLive)
    ).length;

    const removedCount = countBefore - countAfter;

    toast({
      title: "Success",
      description: `${removedCount} mass schedule(s) removed.`
    });
  };

  // Helper function to convert time to sortable format (handles both 24-hour and 12-hour formats)
  const timeToMinutes = (timeStr: string): number => {
    // Handle 24-hour format (HH:MM)
    if (!timeStr.includes(' ')) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    }

    // Handle 12-hour format (HH:MM AM/PM)
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes;

    if (period === 'PM' && hours !== 12) {
      totalMinutes += 12 * 60;
    } else if (period === 'AM' && hours === 12) {
      totalMinutes -= 12 * 60;
    }

    return totalMinutes;
  };

  // Sort schedules by time
  const sortByTime = (schedules: typeof formData.massSchedules) => {
    return schedules.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  };

  // Helper function to sort schedules by day and time
  const sortSchedulesByDayAndTime = (schedules: MassSchedule[]): MassSchedule[] => {
    const dayOrder: { [key: string]: number } = {
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
      'Daily': 7,
      'Weekdays': 8,
      'Weekends': 9
    };

    return [...schedules].sort((a, b) => {
      // First sort by day
      const dayA = dayOrder[a.day] ?? 999;
      const dayB = dayOrder[b.day] ?? 999;
      if (dayA !== dayB) return dayA - dayB;

      // Then sort by time
      return timeToMinutes(a.time) - timeToMinutes(b.time);
    });
  };

  // Format time from 24-hour to 12-hour format with AM/PM
  const formatTime = (time: string) => {
    // Convert 24-hour format to 12-hour format with AM/PM
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const displayMinutes = minutes.toString().padStart(2, '0');

    if (hours === 12 && minutes === 0) {
      return '12:00 NN';
    }

    return `${displayHours}:${displayMinutes} ${period}`;
  };

  const renderGroupedMassSchedules = () => {
    const allWeekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    // Group all schedules by day
    const schedulesByDay: Record<string, typeof formData.massSchedules> = {
      Sunday: formData.massSchedules.filter(s => s.day === 'Sunday'),
      Monday: formData.massSchedules.filter(s => s.day === 'Monday'),
      Tuesday: formData.massSchedules.filter(s => s.day === 'Tuesday'),
      Wednesday: formData.massSchedules.filter(s => s.day === 'Wednesday'),
      Thursday: formData.massSchedules.filter(s => s.day === 'Thursday'),
      Friday: formData.massSchedules.filter(s => s.day === 'Friday'),
      Saturday: formData.massSchedules.filter(s => s.day === 'Saturday'),
    };

    // Create a key for each schedule based on time/language/fbLive (not day)
    const getScheduleKey = (s: typeof formData.massSchedules[0]) => 
      `${s.time}-${s.endTime}-${s.language}-${s.isFbLive}`;

    // Find schedules that appear on ALL 5 weekdays (true "daily" schedules)
    // A schedule is "daily" if the same time/endTime/language/isFbLive exists on Mon, Tue, Wed, Thu, AND Fri
    const weekdayScheduleKeys = allWeekdays.map(day => 
      new Set(schedulesByDay[day].map(getScheduleKey))
    );
    
    // Find keys that exist in ALL 5 weekday sets
    const dailyScheduleKeys = new Set<string>();
    if (weekdayScheduleKeys[0]) {
      weekdayScheduleKeys[0].forEach(key => {
        if (weekdayScheduleKeys.every(dayKeys => dayKeys.has(key))) {
          dailyScheduleKeys.add(key);
        }
      });
    }

    // Daily schedules (appear on all 5 weekdays) - just take from Monday as representative
    const dailySchedules = schedulesByDay['Monday'].filter(s => dailyScheduleKeys.has(getScheduleKey(s)));

    // Specific day schedules (weekdays that are NOT daily)
    const specificDaySchedules: Record<string, typeof formData.massSchedules> = {};
    allWeekdays.forEach(day => {
      specificDaySchedules[day] = schedulesByDay[day].filter(s => !dailyScheduleKeys.has(getScheduleKey(s)));
    });

    // Sort schedules by time
    const sortByTime = (schedules: typeof formData.massSchedules) => {
      return [...schedules].sort((a, b) => {
        const getTimeValue = (t: string) => {
          if (!t) return 0;
          // Handle 12-hour format (e.g., "6:00 AM", "12:30 PM")
          const match12 = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (match12) {
            let hours = parseInt(match12[1]);
            const minutes = parseInt(match12[2]);
            const period = match12[3].toUpperCase();
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            return hours * 60 + minutes;
          }
          // Handle 24-hour format (e.g., "06:00", "18:30")
          const match24 = t.match(/(\d{1,2}):(\d{2})/);
          if (match24) {
            return parseInt(match24[1]) * 60 + parseInt(match24[2]);
          }
          return 0;
        };
        return getTimeValue(a.time) - getTimeValue(b.time);
      });
    };

    const formatTime = (time: string) => {
      if (!time) return '';
      
      // If already in 12-hour format (contains AM/PM), return as-is
      if (time.toUpperCase().includes('AM') || time.toUpperCase().includes('PM')) {
        // Handle noon special case
        if (time.match(/12:00\s*PM/i)) {
          return '12:00 NN';
        }
        return time;
      }
      
      // Parse 24-hour format
      const match = time.match(/(\d{1,2}):(\d{2})/);
      if (!match) return time;
      
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const displayMinutes = minutes.toString().padStart(2, '0');

      if (hours === 12 && minutes === 0) {
        return '12:00 NN';
      }

      return `${displayHours}:${displayMinutes} ${period}`;
    };

    const renderScheduleItem = (schedule: typeof formData.massSchedules[0], index: number, showRemove = true) => (
      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center gap-3">
          <span className="font-medium text-gray-800">
            {formatTime(schedule.time)} – {formatTime(schedule.endTime)}
          </span>
          {schedule.language && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
              🌐 {schedule.language}
            </Badge>
          )}
          {schedule.isFbLive && (
            <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">📺 FB Live</Badge>
          )}
        </div>
        {showRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeMatchingSchedules(schedule)}
            className="text-red-600 hover:text-red-700"
            title="Remove this schedule (and all matching schedules for Daily masses)"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    );

    return (
      <div className="space-y-6">
        {/* Sunday Masses */}
        {schedulesByDay['Sunday'].length > 0 && (
          <div>
            <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              Sunday Masses
            </h5>
            <div className="space-y-2 pl-4">
              {sortByTime(schedulesByDay['Sunday']).map((schedule, index) =>
                renderScheduleItem(schedule, index, !isChanceryEdit)
              )}
            </div>
          </div>
        )}

        {/* Daily Masses (Monday–Friday) - Only shows schedules that appear on ALL 5 weekdays */}
        {dailySchedules.length > 0 && (
          <div>
            <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              📅 Daily Masses (Monday–Friday)
            </h5>
            <div className="space-y-2 pl-4">
              {sortByTime(dailySchedules).map((schedule, index) =>
                renderScheduleItem(schedule, index, !isChanceryEdit)
              )}
            </div>
          </div>
        )}

        {/* Specific Weekday Masses - Shows schedules that don't appear on all 5 weekdays */}
        {allWeekdays.map(day => (
          specificDaySchedules[day].length > 0 && (
            <div key={day}>
              <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                {day} Masses
              </h5>
              <div className="space-y-2 pl-4">
                {sortByTime(specificDaySchedules[day]).map((schedule, index) =>
                  renderScheduleItem(schedule, index, !isChanceryEdit)
                )}
              </div>
            </div>
          )
        ))}

        {/* Saturday Masses */}
        {schedulesByDay['Saturday'].length > 0 && (
          <div>
            <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              Saturday Masses
            </h5>
            <div className="space-y-2 pl-4">
              {sortByTime(schedulesByDay['Saturday']).map((schedule, index) =>
                renderScheduleItem(schedule, index, !isChanceryEdit)
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Form submission handlers
  const handleSave = async () => {
    try {
      // Use provided churchId or effectiveChurchId (from auto-save)
      const uploadChurchId = churchId || effectiveChurchId;
      
      // Upload photos to Firebase Storage if we have a churchId
      let uploadedPhotos = formData.photos;
      let uploadedDocuments = formData.documents;
      
      if (uploadChurchId) {
        // Upload photos that have files (new uploads with blob URLs)
        const hasNewPhotos = formData.photos.some(p => p.file);
        const hasNewDocs = formData.documents.some(d => d.file);
        
        if (hasNewPhotos || hasNewDocs) {
          console.log('📸 [handleSave] Uploading new files before saving draft...');
          
          // Upload photos
          const photoResults = await Promise.all(
            formData.photos.map(async (photo) => {
              if (photo.file) {
                try {
                  const compressedFile = await compressImage(photo.file);
                  const url = await uploadChurchImage(uploadChurchId, compressedFile);
                  return { ...photo, url, file: undefined };
                } catch (error) {
                  console.error('Error uploading photo:', error);
                  return photo; // Keep original if upload fails
                }
              }
              return photo;
            })
          );
          uploadedPhotos = photoResults;
          
          // Upload documents
          const docResults = await Promise.all(
            formData.documents.map(async (doc) => {
              if (doc.file) {
                try {
                  const url = await uploadDocument(uploadChurchId, doc.file, doc.type || 'document');
                  return { ...doc, url, file: undefined };
                } catch (error) {
                  console.error('Error uploading document:', error);
                  return doc; // Keep original if upload fails
                }
              }
              return doc;
            })
          );
          uploadedDocuments = docResults;
          
          console.log('📸 [handleSave] Files uploaded successfully');
        }
      }
      
      const updatedData = {
        ...formData,
        photos: uploadedPhotos,
        documents: uploadedDocuments,
        name: formData.churchName,
        location: `${formData.locationDetails.streetAddress}, ${formData.locationDetails.barangay}, ${formData.locationDetails.municipality}`,
        priest: formData.currentParishPriest,
        founded: formData.historicalDetails.foundingYear,
        classification: formData.historicalDetails.heritageClassification,
        description: formData.historicalDetails.historicalBackground
      };

      // Call onSave - the parent component handles the toast notification
      const result = await onSave(updatedData);
      
      // If we got a churchId back and didn't have one before, update effectiveChurchId
      if (result && typeof result === 'string' && !effectiveChurchId) {
        setEffectiveChurchId(result);
      }
      
      // Update form data with uploaded URLs so they persist
      if (uploadChurchId) {
        setFormData(prev => ({
          ...prev,
          photos: uploadedPhotos,
          documents: uploadedDocuments
        }));
      }
    } catch (error) {
      console.error('Error during save:', error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async () => {
    const isApprovedProfile = currentStatus === 'approved';

    // Comprehensive form validation
    const validationErrors: string[] = [];

    // Basic Information validation
    if (!formData.parishName || !formData.parishName.trim()) {
      validationErrors.push("Parish Name is required");
    }

    if (!formData.churchName || !formData.churchName.trim()) {
      validationErrors.push("Church Name is required");
    }

    // Location validation
    if (!formData.locationDetails.streetAddress || !formData.locationDetails.streetAddress.trim()) {
      validationErrors.push("Street Address is required");
    }

    if (!formData.locationDetails.barangay || !formData.locationDetails.barangay.trim()) {
      validationErrors.push("Barangay is required");
    }

    if (!formData.locationDetails.municipality || !formData.locationDetails.municipality.trim()) {
      validationErrors.push("Municipality is required");
    }

    // GPS Coordinates validation
    if (!formData.coordinates.lat || !formData.coordinates.lng) {
      validationErrors.push("GPS Coordinates (latitude and longitude) are required");
    } else {
      // Validate coordinate ranges
      if (formData.coordinates.lat < -90 || formData.coordinates.lat > 90) {
        validationErrors.push("Latitude must be between -90 and 90 degrees");
      }

      if (formData.coordinates.lng < -180 || formData.coordinates.lng > 180) {
        validationErrors.push("Longitude must be between -180 and 180 degrees");
      }

      // Validate Bohol region (approximate bounds)
      if (formData.coordinates.lat < 9.4 || formData.coordinates.lat > 10.2 ||
          formData.coordinates.lng < 123.7 || formData.coordinates.lng > 124.7) {
        validationErrors.push("Coordinates appear to be outside Bohol region. Please verify.");
      }
    }

    // Historical Information validation
    if (!formData.historicalDetails.foundingYear) {
      validationErrors.push("Founding Year is required");
    } else {
      const currentYear = new Date().getFullYear();
      const foundingYear = parseInt(formData.historicalDetails.foundingYear, 10);
      if (isNaN(foundingYear) || foundingYear < 1500 || foundingYear > currentYear) {
        validationErrors.push(`Founding Year must be a valid year between 1500 and ${currentYear}`);
      }
    }

    if (!formData.historicalDetails.architecturalStyle || !formData.historicalDetails.architecturalStyle.trim()) {
      validationErrors.push("Architectural Style is required");
    }

    if (!formData.historicalDetails.historicalBackground || formData.historicalDetails.historicalBackground.trim().length < 50) {
      validationErrors.push("Historical Background is required (minimum 50 characters)");
    }

    // Parish Information validation
    if (!formData.currentParishPriest || !formData.currentParishPriest.trim()) {
      validationErrors.push("Current Parish Priest is required");
    }

    // Contact Information validation
    if (formData.contactInfo.phone && formData.contactInfo.phone.trim()) {
      const phoneRegex = /^[\d\s\-()+]+$/;
      if (!phoneRegex.test(formData.contactInfo.phone)) {
        validationErrors.push("Phone number contains invalid characters");
      }
      const digitCount = formData.contactInfo.phone.replace(/\D/g, '').length;
      // With +63 prefix (2 digits) + 10 digits (9XX-XXX-XXXX) = 12 total
      if (digitCount !== 12) {
        validationErrors.push("Please enter 10 digits after +63 (e.g., +63 9XX-XXX-XXXX)");
      }
    }

    if (formData.contactInfo.email && formData.contactInfo.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.contactInfo.email)) {
        validationErrors.push("Invalid email format");
      }
    }

    if (formData.contactInfo.website && formData.contactInfo.website.trim()) {
      const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
      if (!urlRegex.test(formData.contactInfo.website)) {
        validationErrors.push("Invalid website URL format");
      }
    }

    // Mass Schedule validation
    if (!formData.massSchedules || formData.massSchedules.length === 0) {
      validationErrors.push("At least one mass schedule is required");
    }

    // Display validation errors
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Errors",
        description: (
          <div className="space-y-1">
            <p className="font-semibold">Please fix the following errors:</p>
            <ul className="list-disc list-inside text-sm">
              {validationErrors.slice(0, 5).map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
            {validationErrors.length > 5 && (
              <p className="text-sm italic">...and {validationErrors.length - 5} more errors</p>
            )}
          </div>
        ),
        variant: "destructive",
        duration: 8000
      });
      return;
    }

    if (!isApprovedProfile && completionPercentage < 80) {
      toast({
        title: "Profile Incomplete",
        description: `Please complete at least 80% of the required fields. Currently ${completionPercentage}% complete.`,
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);

      // Use provided churchId or effectiveChurchId (from auto-save)
      // The churchId should always be provided from ParishDashboard with the correct format
      // (e.g., tagbilaran_tagbilaran_city_saint_joseph_the_worker_cathedral_shrine)
      const uploadChurchId = churchId || effectiveChurchId;
      
      if (!uploadChurchId) {
        toast({
          title: "Upload Error",
          description: "Church ID not available. Please save the profile first before uploading photos.",
          variant: "destructive"
        });
        setUploading(false);
        return;
      }
      
      console.log('📸 [ChurchProfileForm] Starting photo upload:', {
        churchId,
        effectiveChurchId,
        uploadChurchId,
        photosCount: formData.photos.length,
        photosWithFiles: formData.photos.filter(p => p.file).length,
        photosWithUrls: formData.photos.filter(p => p.url && !p.url.startsWith('blob:')).length
      });

      // Upload regular photos to Firebase Storage with compression
      // NOTE: Virtual tour is now managed separately by VirtualTourManager component
      const uploadedPhotoURLs: string[] = [];
      for (const photo of formData.photos) {
        if (photo.file) {
          // New file to upload - compress and upload
          try {
            const compressedFile = await compressImage(photo.file);
            const url = await uploadChurchImage(uploadChurchId, compressedFile);
            uploadedPhotoURLs.push(url);
          } catch (error) {
            console.error('Error uploading photo:', error);
            toast({
              title: "Upload Error",
              description: `Failed to upload ${photo.name}. Continuing with other files.`,
              variant: "destructive"
            });
          }
        } else if (photo.url && !photo.url.startsWith('blob:')) {
          // Existing URL from Firebase Storage
          uploadedPhotoURLs.push(photo.url);
        }
      }

      console.log('📸 [ChurchProfileForm] Photo upload complete:', {
        uploadedPhotoURLs,
        count: uploadedPhotoURLs.length
      });

      // Upload documents to Firebase Storage
      const uploadedDocURLs: string[] = [];
      for (const doc of formData.documents) {
        if (doc.file) {
          // New file to upload
          try {
            const url = await uploadDocument(uploadChurchId, doc.file, doc.type || 'document');
            uploadedDocURLs.push(url);
          } catch (error) {
            console.error('Error uploading document:', error);
            toast({
              title: "Upload Error",
              description: `Failed to upload ${doc.name}. Continuing with other files.`,
              variant: "destructive"
            });
          }
        } else if (doc.url && !doc.url.startsWith('blob:')) {
          // Existing URL from Firebase Storage
          uploadedDocURLs.push(doc.url);
        }
      }

      const updatedData = {
        ...formData,
        name: formData.churchName,
        location: `${formData.locationDetails.streetAddress}, ${formData.locationDetails.barangay}, ${formData.locationDetails.municipality}`,
        priest: formData.currentParishPriest,
        founded: formData.historicalDetails.foundingYear,
        classification: formData.historicalDetails.heritageClassification,
        description: formData.historicalDetails.historicalBackground,
        status: isApprovedProfile ? 'approved' as const : 'pending' as const,
        // NOTE: virtualTour is managed separately by VirtualTourManager component
        photos: uploadedPhotoURLs.map((url, index) => ({
          id: `photo-${Date.now()}-${index}`,
          url,
          name: formData.photos[index]?.name || `photo-${index}`,
          uploadDate: new Date().toISOString(),
          status: 'approved' as const,
          type: 'photo' as const
        })),
        documents: uploadedDocURLs.map((url, index) => ({
          id: `doc-${Date.now()}-${index}`,
          url,
          name: formData.documents[index]?.name || `document-${index}`,
          uploadDate: new Date().toISOString(),
          status: 'approved' as const,
          type: 'document' as const
        }))
      };

      onSubmit(updatedData);

      // Parent component handles the success toast notification
    } catch (error) {
      console.error('Error submitting profile:', error);
      toast({
        title: "Error",
        description: "Failed to submit profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };



  const containerClass = isModal
    ? "bg-white"
    : "min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6";

  const wrapperClass = isModal
    ? "w-full"
    : "max-w-6xl mx-auto";

  return (
    <div className={containerClass}>
      <div className={wrapperClass}>
        {/* Header Section - Only show in non-modal mode */}
        {!isModal && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Church className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Church Profile Form</h1>
                  <p className="text-gray-600">Complete your church information to share with visitors</p>
                </div>
              </div>

              {onCancel && (
                <Button variant="outline" onClick={onCancel} className="flex items-center gap-2">
                  <X className="w-4 h-4" />
                  Close
                </Button>
              )}
            </div>

            {/* Progress Overview - Hide for approved churches and chancery/museum edits */}
            {currentStatus !== 'approved' && !isChanceryEdit && !isMuseumResearcher && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                  <span className="text-lg font-bold text-emerald-600">{completionPercentage}%</span>
                </div>
                <Progress value={completionPercentage} className="h-3" />
                <p className="text-sm text-gray-600">
                  {completionPercentage >= 80
                    ? "Great! Your profile is ready for submission."
                    : `Complete ${80 - completionPercentage}% more to submit for review.`}
                </p>
              </div>
            )}
            
            {/* Heritage Review Indicator - Shows when ICP/NCT is selected and church is NOT yet approved */}
            {!isChanceryEdit && !isMuseumResearcher && currentStatus !== 'approved' && (formData.historicalDetails.heritageClassification === 'National Cultural Treasures' || 
              formData.historicalDetails.heritageClassification === 'Important Cultural Properties') && (
              <Alert className="bg-amber-50 border-amber-400 border-2 mt-3">
                <Building2 className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong className="text-amber-900">🏛️ Heritage Site Review Required:</strong> This church is classified as <span className="font-semibold">{formData.historicalDetails.heritageClassification}</span>. 
                  After Chancery evaluation, your submission will be forwarded to the Museum Researcher dashboard for heritage validation before final approval.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Modal Header - Only show in modal mode */}
        {isModal && (
          <div className="bg-white border-b p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center">
                  <Church className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Church Profile</h2>
                  <p className="text-sm text-gray-600">Complete church information</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-gray-700">Progress: </span>
                <span className="text-sm font-bold text-emerald-600">{completionPercentage}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Form */}
        <Card className={isModal ? "shadow-sm border" : "shadow-xl"}>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              {/* Enhanced Tab Navigation */}
              <div className="bg-gray-50 px-6 py-4 border-b">
                <TabsList className="grid w-full grid-cols-4 h-12 bg-white shadow-sm rounded-lg p-1">
                  <TabsTrigger 
                    value="basic" 
                    className={`flex items-center justify-center gap-2 rounded-md hover:bg-gray-100 data-[state=active]:bg-emerald-100 data-[state=active]:shadow-sm ${isMuseumResearcher ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isMuseumResearcher}
                    title={isMuseumResearcher ? 'View only - managed by Parish Secretary' : undefined}
                  >
                    <Building className="w-4 h-4" />
                    <span className="hidden sm:inline">Basic Info</span>
                    {isMuseumResearcher && <span className="text-xs text-gray-400 hidden md:inline">(View)</span>}
                  </TabsTrigger>
                  
                  <TabsTrigger value="historical" className="flex items-center justify-center gap-2 rounded-md hover:bg-gray-100 data-[state=active]:bg-emerald-100 data-[state=active]:shadow-sm">
                    <History className="w-4 h-4" />
                    <span className="hidden sm:inline">Historical</span>
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="parish" 
                    className={`flex items-center justify-center gap-2 rounded-md hover:bg-gray-100 data-[state=active]:bg-emerald-100 data-[state=active]:shadow-sm ${isMuseumResearcher ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isMuseumResearcher}
                    title={isMuseumResearcher ? 'View only - managed by Parish Secretary' : undefined}
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Parish Info</span>
                    {isMuseumResearcher && <span className="text-xs text-gray-400 hidden md:inline">(View)</span>}
                  </TabsTrigger>
                  
                  <TabsTrigger 
                    value="media" 
                    className="flex items-center justify-center gap-2 rounded-md hover:bg-gray-100 data-[state=active]:bg-emerald-100 data-[state=active]:shadow-sm"
                  >
                    <Image className="w-4 h-4" />
                    <span className="hidden sm:inline">Media</span>
                    {isMuseumResearcher && <span className="text-xs text-emerald-500 hidden md:inline">(Docs)</span>}
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Basic Information Tab */}
              <TabsContent value="basic" className="p-6 space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Building className="w-6 h-6 text-emerald-600" />
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Basic Church Information</h2>
                      <p className="text-gray-600">Essential details about your church</p>
                    </div>
                  </div>

                  {/* Parish Name */}
                  <div className="space-y-2">
                    <Label htmlFor="parishName" className="text-sm font-medium text-gray-700">
                      Parish Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="parishName"
                      value={formData.parishName}
                      onChange={(e) => {
                        updateBasicField('parishName', e.target.value);
                        // Also update churchName to keep compatibility
                        updateBasicField('churchName', e.target.value);
                      }}
                      onBlur={() => {
                        markFieldTouched('parishName');
                        updateFieldError('parishName', formData.parishName);
                      }}
                      placeholder="e.g., Sacred Heart Parish"
                      className={`h-11 ${getFieldError('parishName') ? 'border-red-500 focus:ring-red-500' : ''}`}
                    />
                    {getFieldError('parishName') && (
                      <p className="text-sm text-red-500">{getFieldError('parishName')}</p>
                    )}
                  </div>

                  <Separator />

                  {/* Location Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Location Details</h3>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="streetAddress" className="text-sm font-medium text-gray-700">
                          Street Address <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="streetAddress"
                          value={formData.locationDetails.streetAddress}
                          onChange={(e) => updateLocationField('streetAddress', e.target.value)}
                          onBlur={() => {
                            markFieldTouched('streetAddress');
                            updateFieldError('streetAddress', formData.locationDetails.streetAddress);
                          }}
                          placeholder="Complete street address"
                          className={`h-11 ${getFieldError('streetAddress') ? 'border-red-500 focus:ring-red-500' : ''}`}
                        />
                        {getFieldError('streetAddress') && (
                          <p className="text-sm text-red-500">{getFieldError('streetAddress')}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="barangay" className="text-sm font-medium text-gray-700">
                          Barangay <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="barangay"
                          value={formData.locationDetails.barangay}
                          onChange={(e) => updateLocationField('barangay', e.target.value)}
                          onBlur={() => {
                            markFieldTouched('barangay');
                            updateFieldError('barangay', formData.locationDetails.barangay);
                          }}
                          placeholder="Barangay name"
                          className={`h-11 ${getFieldError('barangay') ? 'border-red-500 focus:ring-red-500' : ''}`}
                        />
                        {getFieldError('barangay') && (
                          <p className="text-sm text-red-500">{getFieldError('barangay')}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="municipality" className="text-sm font-medium text-gray-700">
                          Municipality <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="municipality"
                          value={formData.locationDetails.municipality}
                          onChange={(e) => updateLocationField('municipality', e.target.value)}
                          onBlur={() => {
                            markFieldTouched('municipality');
                            updateFieldError('municipality', formData.locationDetails.municipality);
                          }}
                          placeholder="Municipality name"
                          className={`h-11 ${getFieldError('municipality') ? 'border-red-500 focus:ring-red-500' : ''}`}
                        />
                        {getFieldError('municipality') && (
                          <p className="text-sm text-red-500">{getFieldError('municipality')}</p>
                        )}
                      </div>
                    </div>

                    {/* GPS Coordinates with Interactive Map Picker */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">
                          GPS Coordinates <span className="text-red-500">*</span>
                        </h4>
                      </div>
                      
                      {/* Interactive Map Picker */}
                      <CoordinateMapPicker
                        latitude={formData.coordinates.lat}
                        longitude={formData.coordinates.lng}
                        onCoordinatesChange={(lat, lng) => {
                          updateCoordinates(lat, lng);
                          // Mark fields as touched when selected via map
                          markFieldTouched('latitude');
                          markFieldTouched('longitude');
                          updateFieldError('latitude', lat);
                          updateFieldError('longitude', lng);
                        }}
                        parishName={formData.parishName}
                        municipality={formData.locationDetails.municipality}
                      />

                      {/* Manual Input (Collapsible) */}
                      <details className="bg-gray-50 rounded-lg border border-gray-200">
                        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
                          ⌨️ Enter coordinates manually
                        </summary>
                        <div className="px-4 pb-4 pt-2">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="latitude" className="text-sm font-medium text-gray-700">
                                Latitude <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="latitude"
                                type="number"
                                step="any"
                                value={formData.coordinates.lat || ''}
                                onChange={(e) => updateCoordinates(parseFloat(e.target.value) || 0, formData.coordinates.lng)}
                                onBlur={() => {
                                  markFieldTouched('latitude');
                                  updateFieldError('latitude', formData.coordinates.lat);
                                }}
                                placeholder="e.g., 9.6475"
                                className={`h-11 ${getFieldError('latitude') ? 'border-red-500 focus:ring-red-500' : ''}`}
                                required
                              />
                              {getFieldError('latitude') && (
                                <p className="text-sm text-red-500">{getFieldError('latitude')}</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="longitude" className="text-sm font-medium text-gray-700">
                                Longitude <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="longitude"
                                type="number"
                                step="any"
                                value={formData.coordinates.lng || ''}
                                onChange={(e) => updateCoordinates(formData.coordinates.lat, parseFloat(e.target.value) || 0)}
                                onBlur={() => {
                                  markFieldTouched('longitude');
                                  updateFieldError('longitude', formData.coordinates.lng);
                                }}
                                placeholder="e.g., 123.8887"
                                className={`h-11 ${getFieldError('longitude') ? 'border-red-500 focus:ring-red-500' : ''}`}
                                required
                              />
                              {getFieldError('longitude') && (
                                <p className="text-sm text-red-500">{getFieldError('longitude')}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Historical Information Tab */}
              <TabsContent value="historical" className="p-6 space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <History className="w-6 h-6 text-emerald-600" />
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Historical & Cultural Information</h2>
                      <p className="text-gray-600">Share your church's heritage and history</p>
                    </div>
                  </div>

                  {/* Founding Information */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="foundingYear" className="text-sm font-medium text-gray-700">
                        Founding Year <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="foundingYear"
                        value={formData.historicalDetails.foundingYear}
                        onChange={(e) => updateHistoricalField('foundingYear', e.target.value)}
                        onBlur={() => {
                          markFieldTouched('foundingYear');
                          updateFieldError('foundingYear', formData.historicalDetails.foundingYear);
                        }}
                        placeholder="e.g., 1885"
                        className={`h-11 ${getFieldError('foundingYear') ? 'border-red-500 focus:ring-red-500' : ''}`}
                      />
                      {getFieldError('foundingYear') && (
                        <p className="text-sm text-red-500">{getFieldError('foundingYear')}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="founders" className="text-sm font-medium text-gray-700">
                        Founders
                      </Label>
                      <Input
                        id="founders"
                        value={formData.historicalDetails.founders}
                        onChange={(e) => updateHistoricalField('founders', e.target.value)}
                        placeholder="Names of founders or founding organization"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="architecturalStyle" className="text-sm font-medium text-gray-700">
                        Architectural Style <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.historicalDetails.architecturalStyle}
                        onValueChange={(value) => {
                          updateHistoricalField('architecturalStyle', value);
                          markFieldTouched('architecturalStyle');
                          updateFieldError('architecturalStyle', value);
                        }}
                      >
                        <SelectTrigger className={`h-11 ${getFieldError('architecturalStyle') ? 'border-red-500 focus:ring-red-500' : ''}`}>
                          <SelectValue placeholder="Select architectural style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Spanish Colonial">Spanish Colonial</SelectItem>
                          <SelectItem value="Neo-Gothic">Neo-Gothic</SelectItem>
                          <SelectItem value="Baroque">Baroque</SelectItem>
                          <SelectItem value="Byzantine">Byzantine</SelectItem>
                          <SelectItem value="Modern">Modern</SelectItem>
                          <SelectItem value="Mixed">Mixed Styles</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {getFieldError('architecturalStyle') && (
                        <p className="text-sm text-red-500">{getFieldError('architecturalStyle')}</p>
                      )}
                    </div>

                  {/* Heritage & Religious Classifications */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="heritageClassification" className="text-sm font-medium text-gray-700">
                        Heritage Classification
                      </Label>
                      <Select
                        value={formData.historicalDetails.heritageClassification}
                        onValueChange={(value) => updateHistoricalField('heritageClassification', value)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select heritage classification" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="National Cultural Treasures">National Cultural Treasures</SelectItem>
                          <SelectItem value="Important Cultural Properties">Important Cultural Properties</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">
                        Religious Classification
                      </Label>
                      <p className="text-xs text-gray-500 -mt-1">Select all that apply</p>
                      <div className="space-y-3 pl-1">
                        {(['Diocesan Shrine', 'Jubilee Church', 'Papal Basilica Affinity', 'Holy Door'] as const).map((classification) => (
                          <div key={classification} className="flex items-center space-x-3">
                            <Checkbox
                              id={`religious-${classification}`}
                              checked={(formData.historicalDetails.religiousClassifications || []).includes(classification)}
                              onCheckedChange={() => toggleReligiousClassification(classification)}
                            />
                            <Label
                              htmlFor={`religious-${classification}`}
                              className="text-sm font-normal text-gray-700 cursor-pointer"
                            >
                              {classification}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {(formData.historicalDetails.religiousClassifications || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {formData.historicalDetails.religiousClassifications.map((c) => (
                            <Badge key={c} variant="secondary" className="text-xs">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  </div>

                  <Separator />

                  {/* Historical Background */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="historicalBackground" className="text-sm font-medium text-gray-700">
                        Historical Background <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id="historicalBackground"
                        value={formData.historicalDetails.historicalBackground}
                        onChange={(e) => updateHistoricalField('historicalBackground', e.target.value)}
                        onBlur={() => {
                          markFieldTouched('historicalBackground');
                          updateFieldError('historicalBackground', formData.historicalDetails.historicalBackground);
                        }}
                        placeholder="Describe the history, significance, and story of your church...&#10;&#10;Include details such as:&#10;• Year of establishment and founding story&#10;• Key historical events and milestones&#10;• Notable figures in the church's history&#10;• Cultural and community significance"
                        rows={12}
                        className={`resize-y min-h-[200px] leading-relaxed ${getFieldError('historicalBackground') ? 'border-red-500 focus:ring-red-500' : ''}`}
                      />
                      {getFieldError('historicalBackground') ? (
                        <p className="text-sm text-red-500">{getFieldError('historicalBackground')}</p>
                      ) : (
                        <p className="text-xs text-gray-600">
                          Share the founding story, historical significance, and cultural importance of your church (minimum 50 characters)
                        </p>
                      )}
                    </div>

                  </div>

                  <Separator />

                  {/* Architectural & Heritage Information Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Landmark className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Architectural & Heritage Information</h3>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="architecturalFeatures" className="text-sm font-medium text-gray-700">
                        Architectural Features
                      </Label>
                      <Textarea
                        id="architecturalFeatures"
                        value={formData.historicalDetails.architecturalFeatures}
                        onChange={(e) => updateHistoricalField('architecturalFeatures', e.target.value)}
                        placeholder="Describe the architectural features, design elements, materials used, notable structures...&#10;&#10;Include details such as:&#10;• Architectural style (Baroque, Earthquake Baroque, Gothic, Modern, etc.)&#10;• Construction materials (coral stone, adobe, reinforced concrete)&#10;• Notable features (bell tower, facade, retablo, ceiling artwork)&#10;• Interior design elements"
                        rows={10}
                        className="resize-y min-h-[180px] leading-relaxed"
                      />
                      <p className="text-xs text-gray-600">
                        Include details about the building's architecture, unique design elements, and construction materials
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="heritageInformation" className="text-sm font-medium text-gray-700">
                        Heritage Information
                      </Label>
                      <Textarea
                        id="heritageInformation"
                        value={formData.historicalDetails.heritageInformation}
                        onChange={(e) => updateHistoricalField('heritageInformation', e.target.value)}
                        placeholder="Share information about the church's cultural and historical significance...&#10;&#10;Include details such as:&#10;• Religious classification and denomination&#10;• Heritage status (ICP, NCT, or none)&#10;• Preservation and restoration history&#10;• Cultural programs and traditions&#10;• Community significance"
                        rows={10}
                        className="resize-y min-h-[180px] leading-relaxed"
                      />
                      <p className="text-xs text-gray-600">
                        Document the church's cultural importance, heritage designation, and conservation history
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Parish Information Tab */}
              <TabsContent value="parish" className="p-6 space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <User className="w-6 h-6 text-emerald-600" />
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Current Parish Information</h2>
                      <p className="text-gray-600">Current operations and contact details</p>
                    </div>
                  </div>

                  {/* Parish Priest */}
                  <div className="space-y-2">
                    <Label htmlFor="currentParishPriest" className="text-sm font-medium text-gray-700">
                      Current Parish Priest <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="currentParishPriest"
                      value={formData.currentParishPriest}
                      onChange={(e) => updateBasicField('currentParishPriest', e.target.value)}
                      onBlur={() => {
                        markFieldTouched('currentParishPriest');
                        updateFieldError('currentParishPriest', formData.currentParishPriest);
                      }}
                      placeholder="Rev. Fr. [Full Name]"
                      className={`h-11 ${getFieldError('currentParishPriest') ? 'border-red-500 focus:ring-red-500' : ''}`}
                    />
                    {getFieldError('currentParishPriest') && (
                      <p className="text-sm text-red-500">{getFieldError('currentParishPriest')}</p>
                    )}
                  </div>

                  {/* Feast Day */}
                  <div className="space-y-2">
                    <Label htmlFor="feastDay" className="text-sm font-medium text-gray-700">
                      Feast Day
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="feastDay"
                        value={formData.feastDay || ''}
                        onChange={(e) => updateBasicField('feastDay', e.target.value)}
                        placeholder="e.g., December 8, August 15"
                        className="h-11 pl-10"
                      />
                    </div>
                    <p className="text-xs text-gray-500">The feast day of your parish patron saint</p>
                  </div>

                  <Separator />

                  {/* Contact Information */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                      {isChanceryEdit && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                          Parish manages contact info
                        </span>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                          Phone Number
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            id="phone"
                            value={formData.contactInfo.phone}
                            onChange={(e) => {
                              // Ensure +63 prefix is maintained
                              const value = e.target.value;
                              const newValue = !value.startsWith('+63') 
                                ? '+63 ' + value.replace(/^\+63\s*/, '')
                                : value;
                              updateContactField('phone', newValue);
                            }}
                            onBlur={() => {
                              markFieldTouched('phone');
                              updateFieldError('phone', formData.contactInfo.phone);
                            }}
                            placeholder="9XX XXX XXXX"
                            className={`h-11 pl-10 ${isChanceryEdit ? 'bg-gray-100 cursor-not-allowed' : ''} ${getFieldError('phone') ? 'border-red-500 focus:ring-red-500' : ''}`}
                            disabled={isChanceryEdit}
                          />
                        </div>
                        {getFieldError('phone') && (
                          <p className="text-sm text-red-500">{getFieldError('phone')}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                          Email Address
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            id="email"
                            type="email"
                            value={formData.contactInfo.email}
                            onChange={(e) => updateContactField('email', e.target.value)}
                            onBlur={() => {
                              markFieldTouched('email');
                              updateFieldError('email', formData.contactInfo.email);
                            }}
                            placeholder="parish@church.com"
                            className={`h-11 pl-10 ${isChanceryEdit ? 'bg-gray-100 cursor-not-allowed' : ''} ${getFieldError('email') ? 'border-red-500 focus:ring-red-500' : ''}`}
                            disabled={isChanceryEdit}
                          />
                        </div>
                        {getFieldError('email') && (
                          <p className="text-sm text-red-500">{getFieldError('email')}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Mass Schedules */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Mass Schedules</h3>
                    </div>

                    {/* Existing Mass Schedules */}
                    {formData.massSchedules.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-700">Current Schedules</h4>
                        {renderGroupedMassSchedules()}
                      </div>
                    )}

                    {/* Pending Schedules Preview - Hidden for Chancery */}
                    {!isChanceryEdit && pendingSchedules.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-gray-900">Pending Schedules ({pendingSchedules.length})</h4>
                          <Button
                            onClick={saveAllPendingSchedules}
                            className="bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Save All Schedules
                          </Button>
                        </div>
                        <div className="space-y-4 max-h-80 overflow-y-auto">
                          {/* Group pending schedules */}
                          {(() => {
                            const grouped = {
                              sunday: pendingSchedules.filter(s => s.day === 'Sunday'),
                              saturday: pendingSchedules.filter(s => s.day === 'Saturday'),
                              weekdays: pendingSchedules.filter(s => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(s.day))
                            };

                            // Get unique weekday schedules
                            const uniqueWeekdays = grouped.weekdays.reduce((unique, schedule) => {
                              const key = `${schedule.time}-${schedule.endTime}-${schedule.language}-${schedule.isFbLive}`;
                              if (!unique.find(s => `${s.time}-${s.endTime}-${s.language}-${s.isFbLive}` === key)) {
                                unique.push(schedule);
                              }
                              return unique;
                            }, [] as typeof pendingSchedules);

                            return (
                              <>
                                {/* Sunday */}
                                {grouped.sunday.length > 0 && (
                                  <div>
                                    <h5 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                      Sunday ({grouped.sunday.length})
                                    </h5>
                                    <div className="space-y-1 pl-4">
                                      {sortByTime(grouped.sunday).map((schedule, index) => (
                                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-yellow-300">
                                          <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-gray-800">
                                              {formatTime(schedule.time)} – {formatTime(schedule.endTime)}
                                            </span>
                                            {schedule.language && (
                                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                                                🌐 {schedule.language}
                                              </Badge>
                                            )}
                                            {schedule.isFbLive && (
                                              <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">📺 FB Live</Badge>
                                            )}
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removePendingSchedule(pendingSchedules.indexOf(schedule))}
                                            className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                          >
                                            <X className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Weekdays (Mon-Fri) */}
                                {uniqueWeekdays.length > 0 && (
                                  <div>
                                    <h5 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                      📅 Weekdays ({grouped.weekdays.length} schedules)
                                    </h5>
                                    <div className="space-y-1 pl-4">
                                      {sortByTime(uniqueWeekdays).map((schedule, index) => {
                                        // Find all days that have this exact schedule
                                        const daysWithThisSchedule = grouped.weekdays
                                          .filter(s =>
                                            s.time === schedule.time &&
                                            s.endTime === schedule.endTime &&
                                            s.language === schedule.language &&
                                            s.isFbLive === schedule.isFbLive
                                          )
                                          .map(s => s.day);

                                        const dayAbbreviations = daysWithThisSchedule.map(day =>
                                          day === 'Monday' ? 'Mon' :
                                          day === 'Tuesday' ? 'Tue' :
                                          day === 'Wednesday' ? 'Wed' :
                                          day === 'Thursday' ? 'Thu' :
                                          day === 'Friday' ? 'Fri' : day
                                        ).join(', ');

                                        return (
                                          <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-yellow-300">
                                            <div className="flex items-center gap-3">
                                              <span className="text-sm font-medium text-gray-800">
                                                {formatTime(schedule.time)} – {formatTime(schedule.endTime)}
                                              </span>
                                              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                {dayAbbreviations}
                                              </span>
                                              {schedule.language && (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                                                  🌐 {schedule.language}
                                                </Badge>
                                              )}
                                              {schedule.isFbLive && (
                                                <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">📺 FB Live</Badge>
                                              )}
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                // Remove all matching weekday schedules
                                                const matchingIndices = pendingSchedules
                                                  .map((s, i) => ({ schedule: s, index: i }))
                                                  .filter(({ schedule: s }) =>
                                                    s.time === schedule.time &&
                                                    s.endTime === schedule.endTime &&
                                                    s.language === schedule.language &&
                                                    s.isFbLive === schedule.isFbLive &&
                                                    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(s.day)
                                                  )
                                                  .map(({ index }) => index);

                                                setPendingSchedules(prev => prev.filter((_, i) => !matchingIndices.includes(i)));
                                              }}
                                              className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                            >
                                              <X className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Saturday */}
                                {grouped.saturday.length > 0 && (
                                  <div>
                                    <h5 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                      Saturday ({grouped.saturday.length})
                                    </h5>
                                    <div className="space-y-1 pl-4">
                                      {sortByTime(grouped.saturday).map((schedule, index) => (
                                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-yellow-300">
                                          <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-gray-800">
                                              {formatTime(schedule.time)} – {formatTime(schedule.endTime)}
                                            </span>
                                            {schedule.language && (
                                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                                                🌐 {schedule.language}
                                              </Badge>
                                            )}
                                            {schedule.isFbLive && (
                                              <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">📺 FB Live</Badge>
                                            )}
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removePendingSchedule(pendingSchedules.indexOf(schedule))}
                                            className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                          >
                                            <X className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Add Mass Schedule - Hidden for Chancery */}
                    {!isChanceryEdit && (
                    <div className="bg-emerald-50 rounded-lg p-6">
                      <h4 className="font-medium text-gray-900 mb-6">Add Mass Schedule</h4>

                      {/* Day Selection */}
                      <div className="mb-6">
                        <Label className="text-sm font-medium text-gray-700 mb-3 block">
                          Select Days (check all that apply)
                        </Label>
                        <div className="flex flex-wrap gap-3">
                          {[
                            { day: 'Sunday', emoji: '📅' },
                            { day: 'Monday', emoji: '📅' },
                            { day: 'Tuesday', emoji: '📅' },
                            { day: 'Wednesday', emoji: '📅' },
                            { day: 'Thursday', emoji: '📅' },
                            { day: 'Friday', emoji: '📅' },
                            { day: 'Saturday', emoji: '📅' }
                          ].map(({ day, emoji }) => (
                            <label
                              key={day}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                                (scheduleForm.selectedDays || []).includes(day)
                                  ? 'border-emerald-600 bg-emerald-100 text-emerald-900'
                                  : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400'
                              }`}
                            >
                              <Checkbox
                                checked={(scheduleForm.selectedDays || []).includes(day)}
                                onCheckedChange={(checked) => {
                                  setScheduleForm(prev => ({
                                    ...prev,
                                    selectedDays: checked
                                      ? [...(prev.selectedDays || []), day]
                                      : (prev.selectedDays || []).filter(d => d !== day)
                                  }));
                                }}
                              />
                              <span className="text-lg">{emoji}</span>
                              <span className="font-medium">{day}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Schedule Details */}
                      <div className="grid md:grid-cols-5 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">Start Time</Label>
                          <Input
                            type="time"
                            value={scheduleForm.time}
                            onChange={(e) => handleStartTimeChange(e.target.value)}
                            className="h-10 cursor-pointer"
                            step="300"
                            title="Click to select time"
                            placeholder="--:--"
                          />
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">End Time</Label>
                          <Input
                            type="time"
                            value={scheduleForm.endTime}
                            onChange={(e) => setScheduleForm(prev => ({ ...prev, endTime: e.target.value }))}
                            className="h-10 cursor-pointer"
                            step="300"
                            title="Click to select time"
                            placeholder="--:--"
                          />
                          <p className="text-xs text-gray-500 mt-1">Auto-filled (+1 hour)</p>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">Language & Options</Label>
                          <div className="flex items-center gap-4 h-10">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="schedule-english"
                                checked={scheduleForm.isEnglish}
                                onCheckedChange={(checked) => setScheduleForm(prev => ({ ...prev, isEnglish: !!checked }))}
                              />
                              <Label htmlFor="schedule-english" className="text-sm cursor-pointer">English</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="schedule-fb-live"
                                checked={scheduleForm.isFbLive}
                                onCheckedChange={(checked) => setScheduleForm(prev => ({ ...prev, isFbLive: !!checked }))}
                              />
                              <Label htmlFor="schedule-fb-live" className="text-sm cursor-pointer">FB Live</Label>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Default: Cebuano</p>
                        </div>

                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">&nbsp;</Label>
                          <Button
                            onClick={addToPendingSchedules}
                            className="flex items-center gap-2 h-10 w-full"
                            disabled={!scheduleForm.time || !scheduleForm.endTime || (scheduleForm.selectedDays || []).length === 0}
                          >
                            <Plus className="w-4 h-4" />
                            Add to List
                          </Button>
                        </div>
                      </div>
                    </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Media Tab */}
              <TabsContent value="media" className="p-6 space-y-8">
                {/* Auto-saving indicator */}
                {autoSaving && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg mb-4 flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600"></div>
                    <p className="text-sm text-emerald-800">
                      Auto-saving your church profile to enable media uploads...
                    </p>
                  </div>
                )}

                <div className="space-y-8">
                  {/* 360° Virtual Tour Section - Only for Parish users (not Chancery or Museum Researcher) */}
                  {!isChanceryEdit && !isMuseumResearcher && (
                    <>
                      <div className="space-y-4">
                        {effectiveChurchId ? (
                          <VirtualTourManager
                            churchId={effectiveChurchId}
                            churchName={formData.churchName}
                          />
                        ) : (
                          <div>
                            <div className="flex items-center gap-3 mb-4">
                              <RotateCcw className="w-6 h-6 text-emerald-600" />
                              <div>
                                <h2 className="text-xl font-semibold text-gray-900">360° Virtual Tour</h2>
                                <p className="text-gray-600">Upload panoramic images and add navigation hotspots</p>
                              </div>
                            </div>
                            <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-sm text-yellow-800">
                                Please enter a parish name in the Basic Info tab first, then click here again to auto-save and enable virtual tour management.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <Separator />

                      {/* Regular Photos Section - Only for Parish users */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Image className="w-6 h-6 text-emerald-600" />
                          <div>
                            <h2 className="text-xl font-semibold text-gray-900">Church Photos</h2>
                            <p className="text-gray-600">Share regular photos of your church (Optional)</p>
                          </div>
                        </div>
                        <PhotoUploader
                          photos={formData.photos}
                          onPhotosChange={(photos) => setFormData(prev => ({
                            ...prev,
                            photos: photos.map(photo => ({
                              ...photo,
                              uploadDate: new Date().toISOString(),
                              status: 'pending' as const,
                              type: 'photo' as const
                            }))
                          }))}
                          maxPhotos={10}
                          disabled={false}
                        />
                      </div>

                      <Separator />
                    </>
                  )}

                  {/* Info message for Chancery/Museum about media restrictions */}
                  {(isChanceryEdit || isMuseumResearcher) && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg mb-4">
                      <p className="text-sm text-emerald-800">
                        <strong>Note:</strong> 360° Virtual Tour and Church Photos can only be managed by the parish. 
                        You can add or modify historical documents below.
                      </p>
                    </div>
                  )}

                  {/* Historical Documents Section - Available for all users */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Building className="w-6 h-6 text-emerald-600" />
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">Historical Documents</h2>
                        <p className="text-gray-600">Upload heritage and historical documentation (Optional)</p>
                      </div>
                    </div>
                    <DocumentUploader
                      documents={formData.documents}
                      onDocumentsChange={(documents) => setFormData(prev => ({
                        ...prev,
                        documents: documents.map(doc => ({
                          ...doc,
                          uploadDate: new Date().toISOString(),
                          status: 'pending' as const,
                          type: (doc.type || 'document') as 'photo' | 'document' | '360' | 'heritage-doc'
                        }))
                      }))}
                      maxDocuments={10}
                      disabled={false}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>

          {/* Parish Consent Section - Only show for non-Chancery edits */}
          {!isChanceryEdit && currentStatus !== 'approved' && (
            <div className="bg-blue-50 border-t border-b border-blue-200 px-6 py-4">
              <div className="flex items-start gap-3 mb-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Content Verification</h4>
                  <p className="text-sm text-blue-700">Please confirm the following before submitting for review</p>
                </div>
              </div>
              <div className="space-y-3 pl-8">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="parish-consent"
                    checked={formData.parishConsentConfirmed}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, parishConsentConfirmed: checked === true }))}
                  />
                  <Label htmlFor="parish-consent" className="text-sm text-blue-800 font-normal cursor-pointer leading-relaxed">
                    I confirm that the <strong>Parish Priest has reviewed and approved</strong> all content (text, photos, documents) for public display in the VISITA mobile app.
                  </Label>
                </div>
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="devotional-content"
                    checked={formData.devotionalContentAcknowledged}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, devotionalContentAcknowledged: checked === true }))}
                  />
                  <Label htmlFor="devotional-content" className="text-sm text-blue-800 font-normal cursor-pointer leading-relaxed">
                    I confirm that no <strong>unpublished devotional materials, sacred imagery, or religious symbols</strong> not intended for public display have been included.
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="bg-gray-50 px-6 py-4 border-t flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4" />
              <span>{currentStatus === 'approved' ? 'Auto-saved' : 'Auto-saved as draft'}</span>
            </div>
            
            <div className="flex gap-3">
              {showCancelButton && (
                <Button variant="outline" onClick={onCancel} className="flex items-center gap-2" disabled={isSaving || isSubmitting}>
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              )}

              <Button 
                variant="outline" 
                onClick={handleSave} 
                disabled={isSaving || isSubmitting}
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSaving ? 'Saving...' : (currentStatus === 'approved' ? 'Save Changes' : 'Save Draft')}
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={
                  isSubmitting || 
                  uploading || 
                  isSaving || 
                  (completionPercentage < 80 && currentStatus !== 'approved') ||
                  // Require consent checkboxes for new submissions (not for approved profiles or chancery edits)
                  (!isChanceryEdit && currentStatus !== 'approved' && (!formData.parishConsentConfirmed || !formData.devotionalContentAcknowledged))
                }
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {(isSubmitting || uploading) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {uploading ? 'Uploading files...' : isSubmitting ? 'Submitting...' : isChanceryEdit ? 'Save' : (currentStatus === 'approved' ? 'Update Profile' : 'Submit for Review')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};