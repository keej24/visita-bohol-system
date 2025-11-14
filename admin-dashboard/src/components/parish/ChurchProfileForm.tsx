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
  Globe,
  ExternalLink,
  User,
  Building,
  History,
  Landmark,
  Image,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { ChurchInfo, MassSchedule } from './types';
import { VirtualTourManager } from '../360/VirtualTourManager';
import PhotoUploader from './PhotoUploader';
import DocumentUploader from './DocumentUploader';
import { assessHeritageSignificance, type HeritageAssessment } from '@/lib/heritage-detection';
import { upload360Image, uploadChurchImage, uploadDocument, deleteFile } from '@/lib/storage';

interface ChurchProfileFormProps {
  initialData?: Partial<ChurchInfo>;
  onSave: (data: ChurchInfo) => void;
  onSubmit: (data: ChurchInfo) => void;
  onCancel?: () => void;
  currentStatus?: string;
  isSubmitting?: boolean;
  showCancelButton?: boolean;
  isModal?: boolean;
  isChanceryEdit?: boolean; // New prop to determine if chancery/museum is editing
  churchId?: string; // Church ID for hotspot editing
}

export const ChurchProfileForm: React.FC<ChurchProfileFormProps> = ({
  initialData,
  onSave,
  onSubmit,
  onCancel,
  currentStatus,
  isSubmitting = false,
  showCancelButton = false,
  isModal = false,
  isChanceryEdit = false,
  churchId
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('basic');
  const [heritageAssessment, setHeritageAssessment] = useState<HeritageAssessment | null>(null);
  const [uploading, setUploading] = useState(false);
  // NOTE: Virtual tour now managed by VirtualTourManager component

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
      supportingDocuments: initialData?.historicalDetails?.supportingDocuments || [],
      architecturalFeatures: initialData?.historicalDetails?.architecturalFeatures || '',
      heritageInformation: initialData?.historicalDetails?.heritageInformation || ''
    },
    
    // Current Parish Operations
    currentParishPriest: initialData?.currentParishPriest || '',
    massSchedules: initialData?.massSchedules || [],
    contactInfo: {
      phone: initialData?.contactInfo?.phone || '',
      email: initialData?.contactInfo?.email || '',
      website: initialData?.contactInfo?.website || '',
      facebookPage: initialData?.contactInfo?.facebookPage || ''
    },
    
    // Media Collections
    photos: initialData?.photos || [],
    documents: initialData?.documents || [],
    virtual360Images: initialData?.virtual360Images || [],

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
      { field: formData.locationDetails.streetAddress, label: 'Street Address' },
      { field: formData.locationDetails.barangay, label: 'Barangay' },
      { field: formData.locationDetails.municipality, label: 'Municipality' }
    ],
    historical: [
      { field: formData.historicalDetails.foundingYear, label: 'Founding Year' },
      { field: formData.historicalDetails.historicalBackground, label: 'Historical Background' }
    ],
    parish: [
      { field: formData.currentParishPriest, label: 'Current Parish Priest' }
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

  // Form field updaters
  const updateBasicField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateLocationField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      locationDetails: { ...prev.locationDetails, [field]: value }
    }));
  };

  const updateHistoricalField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      historicalDetails: { ...prev.historicalDetails, [field]: value }
    }));
  };

  const updateContactField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contactInfo: { ...prev.contactInfo, [field]: value }
    }));
  };

  const updateCoordinates = (lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      coordinates: { lat, lng }
    }));
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
      language: scheduleForm.isEnglish ? 'English' : 'Filipino',
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
    const groupedSchedules = {
      weekdays: formData.massSchedules.filter(s => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(s.day)),
      saturday: formData.massSchedules.filter(s => s.day === 'Saturday'),
      sunday: formData.massSchedules.filter(s => s.day === 'Sunday')
    };

    // Get unique weekday schedules (assuming they're the same for all weekdays)
    const uniqueWeekdaySchedules = groupedSchedules.weekdays.reduce((unique, schedule) => {
      const key = `${schedule.time}-${schedule.endTime}-${schedule.language}-${schedule.isFbLive}`;
      if (!unique.find(s => `${s.time}-${s.endTime}-${s.language}-${s.isFbLive}` === key)) {
        unique.push(schedule);
      }
      return unique;
    }, [] as typeof formData.massSchedules);

    // Sort schedules by time
    const sortByTime = (schedules: typeof formData.massSchedules) => {
      return schedules.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    };

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
        {groupedSchedules.sunday.length > 0 && (
          <div>
            <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              ☀️ Sunday Masses
            </h5>
            <div className="space-y-2 pl-4">
              {sortByTime(groupedSchedules.sunday).map((schedule, index) =>
                renderScheduleItem(schedule, index)
              )}
            </div>
          </div>
        )}

        {/* Daily Masses (Monday–Friday) */}
        {uniqueWeekdaySchedules.length > 0 && (
          <div>
            <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              📅 Daily Masses (Monday–Friday)
            </h5>
            <div className="space-y-2 pl-4">
              {sortByTime(uniqueWeekdaySchedules).map((schedule, index) =>
                renderScheduleItem(schedule, index)
              )}
            </div>
          </div>
        )}

        {/* Saturday Masses */}
        {groupedSchedules.saturday.length > 0 && (
          <div>
            <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              🌙 Saturday Masses
            </h5>
            <div className="space-y-2 pl-4">
              {sortByTime(groupedSchedules.saturday).map((schedule, index) =>
                renderScheduleItem(schedule, index)
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
      const updatedData = {
        ...formData,
        name: formData.churchName,
        location: `${formData.locationDetails.streetAddress}, ${formData.locationDetails.barangay}, ${formData.locationDetails.municipality}`,
        priest: formData.currentParishPriest,
        founded: formData.historicalDetails.foundingYear,
        classification: formData.historicalDetails.heritageClassification,
        description: formData.historicalDetails.historicalBackground
      };

      onSave(updatedData);
      toast({ title: "Saved", description: "Church profile saved as draft!" });
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
      if (digitCount < 7 || digitCount > 15) {
        validationErrors.push("Phone number must contain 7-15 digits");
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

      // Upload regular photos to Firebase Storage
      // NOTE: Virtual tour is now managed separately by VirtualTourManager component
      const uploadedPhotoURLs: string[] = [];
      for (const photo of formData.photos) {
        // FileUpload only has url property, so just use existing URLs
        if (photo.url) {
          uploadedPhotoURLs.push(photo.url);
        }
      }

      // Upload documents to Firebase Storage
      const uploadedDocURLs: string[] = [];
      for (const doc of formData.documents) {
        // FileUpload only has url property, so just use existing URLs
        if (doc.url) {
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

      const message = isApprovedProfile
        ? "Church profile updated successfully!"
        : "Church profile submitted for review!";

      toast({ title: "Success", description: message });
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

            {/* Progress Overview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-lg font-bold text-blue-600">{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} className="h-3" />
              <p className="text-sm text-gray-600">
                {completionPercentage >= 80
                  ? "Great! Your profile is ready for submission."
                  : `Complete ${80 - completionPercentage}% more to submit for review.`}
              </p>
            </div>
          </div>
        )}

        {/* Modal Header - Only show in modal mode */}
        {isModal && (
          <div className="bg-white border-b p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Church className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Church Profile</h2>
                  <p className="text-sm text-gray-600">Complete church information</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-gray-700">Progress: </span>
                <span className="text-sm font-bold text-blue-600">{completionPercentage}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Heritage Assessment Card */}
        {heritageAssessment && currentStatus !== 'approved' && (
          <Card className={`shadow-lg border-l-4 mb-6 ${
            heritageAssessment.confidence === 'high' ? 'border-l-orange-500 bg-orange-50/30' :
            heritageAssessment.confidence === 'medium' ? 'border-l-yellow-500 bg-yellow-50/30' :
            'border-l-green-500 bg-green-50/30'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Landmark className={`w-6 h-6 mt-0.5 ${
                  heritageAssessment.confidence === 'high' ? 'text-orange-600' :
                  heritageAssessment.confidence === 'medium' ? 'text-yellow-600' :
                  'text-green-600'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-semibold text-gray-900">Heritage Significance Assessment</h3>
                    <Badge variant={
                      heritageAssessment.confidence === 'high' ? 'destructive' :
                      heritageAssessment.confidence === 'medium' ? 'secondary' :
                      'default'
                    } className="text-xs">
                      {heritageAssessment.confidence.toUpperCase()} CONFIDENCE
                    </Badge>
                  </div>

                  {heritageAssessment.shouldRequireReview && (
                    <div className="bg-orange-100 border border-orange-300 rounded-lg p-3">
                      <p className="text-sm text-orange-800">
                        Church is classified as Important Cultural Property (ICP). Must be forwarded to Heritage Reviewer for heritage validation.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Form */}
        <Card className={isModal ? "shadow-sm border" : "shadow-xl"}>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              {/* Enhanced Tab Navigation */}
              <div className="bg-gray-50 px-6 py-4 border-b">
                <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm">
                  <TabsTrigger value="basic" className="flex items-center gap-2 py-3 hover:bg-gray-200 data-[state=active]:bg-blue-100">
                    <Building className="w-4 h-4" />
                    <span className="hidden sm:inline">Basic Info</span>
                  </TabsTrigger>
                  
                  <TabsTrigger value="historical" className="flex items-center gap-2 py-3 hover:bg-gray-200 data-[state=active]:bg-blue-100">
                    <History className="w-4 h-4" />
                    <span className="hidden sm:inline">Historical</span>
                  </TabsTrigger>
                  
                  <TabsTrigger value="parish" className="flex items-center gap-2 py-3 hover:bg-gray-200 data-[state=active]:bg-blue-100">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Parish Info</span>
                  </TabsTrigger>
                  
                  <TabsTrigger value="media" className="flex items-center gap-2 py-3 hover:bg-gray-200 data-[state=active]:bg-blue-100">
                    <Image className="w-4 h-4" />
                    <span className="hidden sm:inline">Media</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Basic Information Tab */}
              <TabsContent value="basic" className="p-6 space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Building className="w-6 h-6 text-blue-600" />
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
                      placeholder="e.g., Sacred Heart Parish"
                      className="h-11"
                    />
                  </div>

                  <Separator />

                  {/* Location Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-blue-600" />
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
                          placeholder="Complete street address"
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="barangay" className="text-sm font-medium text-gray-700">
                          Barangay <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="barangay"
                          value={formData.locationDetails.barangay}
                          onChange={(e) => updateLocationField('barangay', e.target.value)}
                          placeholder="Barangay name"
                          className="h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="municipality" className="text-sm font-medium text-gray-700">
                          Municipality <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="municipality"
                          value={formData.locationDetails.municipality}
                          onChange={(e) => updateLocationField('municipality', e.target.value)}
                          placeholder="Municipality name"
                          className="h-11"
                        />
                      </div>
                    </div>

                    {/* Coordinates */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">
                        GPS Coordinates <span className="text-red-500">*</span>
                      </h4>
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
                            placeholder="e.g., 9.6475"
                            className="h-11"
                            required
                          />
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
                            placeholder="e.g., 123.8887"
                            className="h-11"
                            required
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        <strong>Required:</strong> GPS coordinates are needed to pin your church on the map. 
                        <a 
                          href="https://www.google.com/maps" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-1"
                        >
                          Get coordinates from Google Maps
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Historical Information Tab */}
              <TabsContent value="historical" className="p-6 space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <History className="w-6 h-6 text-blue-600" />
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
                        placeholder="e.g., 1885"
                        className="h-11"
                      />
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
                        Architectural Style
                      </Label>
                      <Select
                        value={formData.historicalDetails.architecturalStyle}
                        onValueChange={(value) => updateHistoricalField('architecturalStyle', value)}
                      >
                        <SelectTrigger className="h-11">
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

                    <div className="space-y-2">
                      <Label htmlFor="religiousClassification" className="text-sm font-medium text-gray-700">
                        Religious Classification
                      </Label>
                      <Select
                        value={formData.historicalDetails.religiousClassification}
                        onValueChange={(value) => updateHistoricalField('religiousClassification', value)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select religious classification" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Diocesan Shrine">Diocesan Shrine</SelectItem>
                          <SelectItem value="Jubilee Church">Jubilee Church</SelectItem>
                          <SelectItem value="Papal Basilica Affinity">Papal Basilica Affinity</SelectItem>
                        </SelectContent>
                      </Select>
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
                        placeholder="Describe the history, significance, and story of your church..."
                        rows={6}
                        className="resize-none"
                      />
                      <p className="text-xs text-gray-600">
                        Share the founding story, historical significance, and cultural importance of your church
                      </p>
                    </div>

                  </div>

                  <Separator />

                  {/* Architectural & Heritage Information Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Landmark className="w-5 h-5 text-blue-600" />
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
                        placeholder="Describe the architectural features, design elements, materials used, notable structures (e.g., bell tower, facade, interior design)..."
                        rows={5}
                        className="resize-none"
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
                        placeholder="Share information about the church's cultural and historical significance, preservation efforts, restoration projects, heritage status..."
                        rows={5}
                        className="resize-none"
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
                    <User className="w-6 h-6 text-blue-600" />
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
                      placeholder="Rev. Fr. [Full Name]"
                      className="h-11"
                    />
                  </div>

                  <Separator />

                  {/* Contact Information */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
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
                            onChange={(e) => updateContactField('phone', e.target.value)}
                            placeholder="+63 xxx xxx xxxx"
                            className="h-11 pl-10"
                          />
                        </div>
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
                            placeholder="parish@church.com"
                            className="h-11 pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Mass Schedules */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Mass Schedules</h3>
                    </div>

                    {/* Existing Mass Schedules */}
                    {formData.massSchedules.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-700">Current Schedules</h4>
                        {renderGroupedMassSchedules()}
                      </div>
                    )}

                    {/* Pending Schedules Preview */}
                    {pendingSchedules.length > 0 && (
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
                                      ☀️ Sunday ({grouped.sunday.length})
                                    </h5>
                                    <div className="space-y-1 pl-4">
                                      {sortByTime(grouped.sunday).map((schedule, index) => (
                                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-yellow-300">
                                          <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-gray-800">
                                              {formatTime(schedule.time)} – {formatTime(schedule.endTime)}
                                            </span>
                                            {schedule.language && schedule.language !== 'Filipino' && (
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
                                              {schedule.language && schedule.language !== 'Filipino' && (
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
                                      🌙 Saturday ({grouped.saturday.length})
                                    </h5>
                                    <div className="space-y-1 pl-4">
                                      {sortByTime(grouped.saturday).map((schedule, index) => (
                                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-yellow-300">
                                          <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-gray-800">
                                              {formatTime(schedule.time)} – {formatTime(schedule.endTime)}
                                            </span>
                                            {schedule.language && schedule.language !== 'Filipino' && (
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

                    {/* Add Mass Schedule */}
                    <div className="bg-blue-50 rounded-lg p-6">
                      <h4 className="font-medium text-gray-900 mb-6">Add Mass Schedule</h4>

                      {/* Day Selection */}
                      <div className="mb-6">
                        <Label className="text-sm font-medium text-gray-700 mb-3 block">
                          Select Days (check all that apply)
                        </Label>
                        <div className="flex flex-wrap gap-3">
                          {[
                            { day: 'Sunday', emoji: '☀️' },
                            { day: 'Monday', emoji: '📅' },
                            { day: 'Tuesday', emoji: '📅' },
                            { day: 'Wednesday', emoji: '📅' },
                            { day: 'Thursday', emoji: '📅' },
                            { day: 'Friday', emoji: '📅' },
                            { day: 'Saturday', emoji: '🌙' }
                          ].map(({ day, emoji }) => (
                            <label
                              key={day}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                                (scheduleForm.selectedDays || []).includes(day)
                                  ? 'border-blue-600 bg-blue-100 text-blue-900'
                                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
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
                            onChange={(e) => setScheduleForm(prev => ({ ...prev, time: e.target.value }))}
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
                          <p className="text-xs text-gray-500 mt-1">Default: Filipino</p>
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
                  </div>
                </div>
              </TabsContent>

              {/* Media Tab */}
              <TabsContent value="media" className="p-6 space-y-8">
                <div className="space-y-8">
                  {/* 360° Virtual Tour Section */}
                  <div className="space-y-4">
                    {churchId ? (
                      <VirtualTourManager
                        churchId={churchId}
                        churchName={formData.churchName}
                      />
                    ) : (
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <RotateCcw className="w-6 h-6 text-blue-600" />
                          <div>
                            <h2 className="text-xl font-semibold text-gray-900">360° Virtual Tour</h2>
                            <p className="text-gray-600">Upload panoramic images and add navigation hotspots</p>
                          </div>
                        </div>
                        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            Please save the church profile first to enable virtual tour management.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Regular Photos Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Image className="w-6 h-6 text-blue-600" />
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

                  {/* Historical Documents Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Building className="w-6 h-6 text-blue-600" />
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

          {/* Footer Actions */}
          <div className="bg-gray-50 px-6 py-4 border-t flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4" />
              <span>Auto-saved as draft</span>
            </div>
            
            <div className="flex gap-3">
              {showCancelButton && (
                <Button variant="outline" onClick={onCancel} className="flex items-center gap-2">
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              )}

              <Button variant="outline" onClick={handleSave} className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Draft
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || uploading || (completionPercentage < 80 && currentStatus !== 'approved')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {(isSubmitting || uploading) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {uploading ? 'Uploading files...' : isSubmitting ? 'Saving...' : isChanceryEdit ? 'Save' : (currentStatus === 'approved' ? 'Update Profile' : 'Submit for Review')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};