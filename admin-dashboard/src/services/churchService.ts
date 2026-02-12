/**
 * FILE PURPOSE: Church Service - Business Logic Layer for Church Management
 *
 * This service layer encapsulates all church-related business logic and database
 * operations for the VISITA system. It acts as an intermediary between UI components
 * and Firebase Firestore database.
 *
 * KEY RESPONSIBILITIES:
 * - CRUD operations for church documents (Create, Read, Update, Delete)
 * - Church submission and review workflow management
 * - Data transformation between UI and database formats
 * - Query building with filters (diocese, status, classification, etc.)
 * - Real-time subscriptions for live data updates
 * - Statistics and analytics aggregation
 * - Visitor tracking and engagement metrics
 *
 * INTEGRATION POINTS:
 * - Uses Firebase Firestore for database operations
 * - Consumed by React components and pages
 * - Works with ChurchProfileForm for submissions
 * - Integrates with review workflows (Chancery, Museum)
 * - Provides data to dashboards and reports
 *
 * TECHNICAL CONCEPTS:
 * - Service Layer Pattern: Separates business logic from UI
 * - Data Access Object (DAO): Abstracts database operations
 * - Static Methods: No instance needed, just import and use
 * - TypeScript Generics: Type-safe database operations
 * - Promise-based API: All operations are asynchronous
 * - Firestore Queries: Server-side filtering and sorting
 * - Real-time Listeners: Subscribe to live data changes
 *
 * DATABASE SCHEMA:
 * Collection: 'churches'
 * Document Structure:
 * {
 *   name: string,
 *   diocese: 'tagbilaran' | 'talibon',
 *   status: 'pending' | 'approved' | 'under_review' | 'heritage_review',
 *   classification: string,
 *   coordinates: { lat: number, lng: number },
 *   massSchedules: array,
 *   images: array,
 *   virtualTour: object,
 *   createdBy: string (user ID),
 *   createdAt: timestamp,
 *   updatedAt: timestamp,
 *   ... and more fields
 * }
 *
 * WHY IMPORTANT:
 * - Centralized Logic: All church operations in one place
 * - Consistent API: Uniform interface for all components
 * - Error Handling: Centralized error management
 * - Testability: Easy to mock for unit tests
 * - Maintainability: Changes to database logic in one file
 */

// Firebase Firestore imports for database operations
import {
  collection,     // Get reference to a collection
  doc,           // Get reference to a specific document
  addDoc,        // Add new document with auto-generated ID
  setDoc,        // Set document with specific ID
  updateDoc,     // Update existing document
  deleteDoc,     // Delete document (not used, we use soft delete)
  getDocs,       // Fetch multiple documents
  getDoc,        // Fetch single document
  query,         // Build complex queries
  where,         // Filter query results
  orderBy,       // Sort query results
  limit,         // Limit query results (pagination)
  startAfter,    // Pagination cursor
  onSnapshot,    // Subscribe to real-time updates
  Timestamp,     // Firebase timestamp type
  increment,     // Atomic increment operation
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
// Firebase database instance
import { db } from '@/lib/firebase';
// TypeScript type definitions
import type {
  Church,
  ChurchFormData,
  ChurchFilters,
  ChurchReviewAction,
  ChurchStats,
  ChurchStatus,
  ReligiousClassification
} from '@/types/church';
import type { Diocese, UserProfile } from '@/contexts/AuthContext';
// Audit logging service
import { AuditService, createFieldChange } from '@/services/auditService';
// Field categorization for staged updates
import { categorizeChanges, DIRECT_PUBLISH_FIELDS, REVERIFICATION_REQUIRED_FIELDS } from '@/lib/church-field-categories';

// Firestore collection name (consistent naming prevents typos)
const CHURCHES_COLLECTION = 'churches';

// Pagination defaults
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// Convert Firestore document to Church with proper typing
interface FirestoreChurchDoc {
  id: string;
  data: () => Record<string, unknown>;
}

const convertToChurch = (doc: FirestoreChurchDoc): Church => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = doc.data() as any; // Firestore data needs type assertion
  return {
    id: doc.id,
    name: data.name as string,
    fullName: data.fullName as string,
    location: data.location as string,
    municipality: data.municipality as string,
    diocese: data.diocese as Diocese,
    foundingYear: data.foundingYear as number,
    founders: data.founders as string,
    keyFigures: (data.keyFigures || []) as string[],
    architecturalStyle: data.architecturalStyle,
    historicalBackground: data.historicalBackground as string,
    description: data.description as string,
    classification: data.classification,
    religiousClassification: data.religiousClassification,
    assignedPriest: data.assignedPriest as string,
    priestHistory: (data.priestHistory || []) as import('@/types/church').PriestAssignment[],
    feastDay: data.feastDay as string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    massSchedules: (data.massSchedules || []) as any[],
    // Support both root level (new) and nested (legacy) coordinates
    coordinates: data.latitude && data.longitude
      ? { latitude: data.latitude as number, longitude: data.longitude as number }
      : data.coordinates,
    contactInfo: data.contactInfo,
    images: (data.images || []) as string[],
    // Photos - only include if present in Firestore (not empty)
    // This ensures we fall back to 'images' in convertChurchToInfo when photos doesn't exist
    photos: data.photos as (string | { url: string; name?: string })[] | undefined,
    // Church documents - can be string URLs (legacy) or objects
    documents: (data.documents || []) as (string | { url: string; name?: string })[],
    virtualTour: data.virtualTour, // 360° virtual tour managed by VirtualTourService
    heritageDeclaration: data.heritageDeclaration as string,
    culturalSignificance: data.culturalSignificance as string,
    preservationHistory: data.preservationHistory as string,
    restorationHistory: data.restorationHistory as string,
    architecturalFeatures: data.architecturalFeatures as string,
    heritageInformation: data.heritageInformation as string,
    status: data.status as ChurchStatus,
    reviewNotes: data.reviewNotes as string,
    reviewedBy: data.reviewedBy as string,
    reviewedAt: data.reviewedAt?.toDate(),
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    createdBy: data.createdBy as string,
    submittedAt: data.submittedAt?.toDate(),
    approvedAt: data.approvedAt?.toDate(),
    monthlyVisitors: data.monthlyVisitors as number,
    visitCount: data.visitCount as number,
    averageRating: data.averageRating as number,
    tags: (data.tags || []) as string[],
    category: data.category as string,
    parishId: data.parishId as string,
    // Preserve historicalDetails for religiousClassifications array
    historicalDetails: data.historicalDetails as { religiousClassifications?: string[] } | undefined,
  } as Church;
};

// Helper function to remove undefined values from an object
// Firestore's updateDoc() rejects undefined values
const removeUndefinedValues = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key as keyof T] = value as T[keyof T];
    }
    return acc;
  }, {} as Partial<T>);
};

// Convert form data to Firestore document
const convertToFirestoreData = (formData: ChurchFormData, userId: string, diocese: Diocese, isUpdate = false) => {
  const baseData = {
    name: formData.name,
    fullName: formData.fullName,
    location: formData.location,
    municipality: formData.municipality,
    diocese: diocese,
    foundingYear: formData.foundingYear,
    founders: formData.founders,
    keyFigures: formData.keyFigures,
    architecturalStyle: formData.architecturalStyle,
    historicalBackground: formData.historicalBackground,
    description: formData.description,
    classification: formData.classification,
    religiousClassification: formData.religiousClassification,
    // Persist religiousClassifications array in historicalDetails
    historicalDetails: formData.historicalDetails,
    assignedPriest: formData.assignedPriest,
    priestHistory: formData.priestHistory || [],
    feastDay: formData.feastDay,
    massSchedules: formData.massSchedules,
    // Save coordinates at root level for mobile app compatibility
    latitude: formData.coordinates?.latitude,
    longitude: formData.coordinates?.longitude,
    contactInfo: formData.contactInfo,
    images: formData.images,
    // Photos - this is the primary field for photos (mobile app reads this)
    photos: formData.photos,
    documents: formData.documents,
    // Note: virtualTour is managed separately by VirtualTourService
    // and stored at the church document root level
    culturalSignificance: formData.culturalSignificance,
    preservationHistory: formData.preservationHistory,
    restorationHistory: formData.restorationHistory,
    architecturalFeatures: formData.architecturalFeatures,
    heritageInformation: formData.heritageInformation,
    tags: formData.tags,
    category: formData.category,
    updatedAt: Timestamp.now(),
  };

  // Remove undefined values to prevent Firestore errors
  const cleanedData = removeUndefinedValues(baseData);

  if (!isUpdate) {
    return {
      ...cleanedData,
      status: 'pending' as ChurchStatus,
      createdAt: Timestamp.now(),
      createdBy: userId,
      submittedAt: Timestamp.now(),
    };
  }

  return cleanedData;
};

export class ChurchService {
  // Create new church submission
  static async createChurch(
    formData: ChurchFormData,
    diocese: Diocese,
    userId: string,
    parishId?: string
  ): Promise<string> {
    try {
      const data = convertToFirestoreData(formData, userId, diocese);

      // Check for duplicate church name within the same municipality and diocese
      if (data.name && data.municipality) {
        const duplicateCheck = query(
          collection(db, CHURCHES_COLLECTION),
          where('diocese', '==', diocese),
          where('name', '==', data.name),
          where('municipality', '==', data.municipality)
        );
        const existingChurches = await getDocs(duplicateCheck);
        
        if (!existingChurches.empty) {
          throw new Error(`A church named "${data.name}" already exists in ${data.municipality}. Please use a different name or verify if this church is already registered.`);
        }
      }

      // Use parishId as document ID if provided, otherwise auto-generate
      // Using parishId ensures consistency with user profiles and feedback/announcements
      if (parishId) {
        console.log('[ChurchService] Creating church with explicit parishId:', parishId);
        // Include parishId as a field in the document for Firestore security rules
        await setDoc(doc(db, CHURCHES_COLLECTION, parishId), {
          ...data,
          parishId: parishId
        });
        return parishId;
      } else {
        console.log('[ChurchService] Creating church with auto-generated ID');
        const docRef = await addDoc(collection(db, CHURCHES_COLLECTION), data);
        return docRef.id;
      }
    } catch (error) {
      console.error('Error creating church:', error);
      // Re-throw the error with its original message if it's a duplicate check error
      if (error instanceof Error && error.message.includes('already exists')) {
        throw error;
      }
      throw new Error('Failed to create church');
    }
  }

  // Update existing church
  static async updateChurch(
    id: string,
    formData: ChurchFormData,
    diocese: Diocese,
    userId: string
  ): Promise<void> {
    try {
      // Get current church data to check for classification changes
      const churchRef = doc(db, CHURCHES_COLLECTION, id);
      const churchSnapshot = await getDoc(churchRef);
      const currentChurch = churchSnapshot.data() as Church;

      const data = convertToFirestoreData(formData, userId, diocese, true);

      // Check for duplicate church name if name or municipality is being changed
      if (data.name && data.municipality) {
        const nameChanged = data.name !== currentChurch.name;
        const municipalityChanged = data.municipality !== currentChurch.municipality;
        
        if (nameChanged || municipalityChanged) {
          const duplicateCheck = query(
            collection(db, CHURCHES_COLLECTION),
            where('diocese', '==', diocese),
            where('name', '==', data.name),
            where('municipality', '==', data.municipality)
          );
          const existingChurches = await getDocs(duplicateCheck);
          
          // Filter out the current church being updated
          const otherChurches = existingChurches.docs.filter(doc => doc.id !== id);
          
          if (otherChurches.length > 0) {
            throw new Error(`A church named "${data.name}" already exists in ${data.municipality}. Please use a different name or verify if this church is already registered.`);
          }
        }
      }

      // IMPORTANT: Handle classification changes and status transitions
      // When heritage classification changes, we need to route the church properly
      const wasHeritage = currentChurch.classification === 'ICP' || currentChurch.classification === 'NCT';
      const isNowHeritage = data.classification === 'ICP' || data.classification === 'NCT';
      const classificationChanged = currentChurch.classification !== data.classification;
      
      console.log(`[ChurchService] Classification change check for church ${id}:`, {
        currentClassification: currentChurch.classification,
        newClassification: data.classification,
        currentStatus: currentChurch.status,
        wasHeritage,
        isNowHeritage,
        classificationChanged
      });
      
      // Determine if status needs to change based on classification change
      let newStatus: string | null = null;
      
      if (classificationChanged && isNowHeritage) {
        // Changed TO heritage (ICP/NCT) - needs to go through Chancery review queue
        // so they can manually forward to Museum Researcher
        if (currentChurch.status !== 'heritage_review' && currentChurch.status !== 'under_review') {
          newStatus = 'pending';
          console.log(`[ChurchService] Church ${id} classification changed TO heritage (${data.classification}). Status will be set to 'pending' for Chancery review.`);
        }
      } else if (classificationChanged && wasHeritage && !isNowHeritage) {
        // Changed FROM heritage to non-heritage
        if (currentChurch.status === 'under_review' || currentChurch.status === 'heritage_review') {
          // Was in museum review - return to chancery
          newStatus = 'pending';
          console.log(`[ChurchService] Church ${id} classification changed FROM heritage to non-heritage. Status will be set to 'pending' for Chancery approval.`);
        }
      }
      
      // Build the final update object, including status if it needs to change
      const updateData: Record<string, unknown> = { ...data };
      if (newStatus) {
        updateData.status = newStatus;
        console.log(`[ChurchService] Adding status '${newStatus}' to update data for church ${id}`);
      }
      
      // Log the final data being sent to Firestore
      console.log(`[ChurchService] Final update data for church ${id}:`, {
        hasStatus: 'status' in updateData,
        status: updateData.status,
        classification: updateData.classification,
        allKeys: Object.keys(updateData)
      });

      await updateDoc(churchRef, updateData);
    } catch (error) {
      console.error('Error updating church:', error);
      throw new Error('Failed to update church');
    }
  }

  /**
   * Update church with staged changes for approved churches.
   * 
   * When updating an APPROVED church:
   * - DIRECT_PUBLISH_FIELDS (mass schedules, contact info, 360° photos) → Applied immediately
   * - REVERIFICATION_REQUIRED_FIELDS (historical, heritage info) → Stored in pendingChanges for review
   * 
   * For non-approved churches, all changes are applied directly (standard workflow).
   * 
   * @param id - Church document ID
   * @param formData - Updated form data
   * @param diocese - Diocese for security validation
   * @param userId - User making the update
   * @returns Object indicating what was staged vs. published
   */
  static async updateChurchWithStaging(
    id: string,
    formData: ChurchFormData,
    diocese: Diocese,
    userId: string
  ): Promise<{
    directlyPublished: string[];
    stagedForReview: string[];
    hasPendingChanges: boolean;
  }> {
    try {
      const churchRef = doc(db, CHURCHES_COLLECTION, id);
      const churchSnapshot = await getDoc(churchRef);
      
      if (!churchSnapshot.exists()) {
        throw new Error('Church not found');
      }
      
      const currentChurch = churchSnapshot.data() as Church;
      
      // For non-approved churches, use the standard update flow
      if (currentChurch.status !== 'approved') {
        console.log(`[ChurchService] Church ${id} is not approved (status: ${currentChurch.status}). Using standard update flow.`);
        await ChurchService.updateChurch(id, formData, diocese, userId);
        return {
          directlyPublished: Object.keys(formData),
          stagedForReview: [],
          hasPendingChanges: false,
        };
      }
      
      // Church is approved - use staged update flow
      console.log(`[ChurchService] Church ${id} is approved. Using staged update flow.`);
      
      // Convert current church data to form data format for comparison
      // IMPORTANT: All fields returned by convertToFormData() must be included here,
      // otherwise categorizeChanges() will always detect them as "changed"
      const currentFormData: Partial<ChurchFormData> = {
        name: currentChurch.name,
        fullName: currentChurch.fullName,
        location: currentChurch.location,
        municipality: currentChurch.municipality,
        foundingYear: currentChurch.foundingYear,
        founders: currentChurch.founders,
        keyFigures: currentChurch.keyFigures,
        architecturalStyle: currentChurch.architecturalStyle,
        historicalBackground: currentChurch.historicalBackground,
        description: currentChurch.description,
        classification: currentChurch.classification,
        religiousClassification: currentChurch.religiousClassification,
        historicalDetails: (currentChurch as unknown as Record<string, unknown>).historicalDetails as ChurchFormData['historicalDetails'],
        assignedPriest: currentChurch.assignedPriest,
        priestHistory: currentChurch.priestHistory,
        feastDay: currentChurch.feastDay,
        massSchedules: currentChurch.massSchedules,
        coordinates: currentChurch.coordinates,
        contactInfo: currentChurch.contactInfo,
        images: currentChurch.images,
        photos: currentChurch.photos,
        documents: currentChurch.documents as (string | { url: string; name?: string })[],
        // Map Firestore's virtualTour field to the form's virtualTour360 field name
        // The Church type has virtualTour as a VirtualTour object, but some documents
        // may store it as a string array. Read from raw data to handle both cases.
        virtualTour360: ((currentChurch as unknown as Record<string, unknown>).virtualTour360 as string[]) 
          || ((currentChurch as unknown as Record<string, unknown>).virtualTour as string[]) 
          || [],
        culturalSignificance: currentChurch.culturalSignificance,
        preservationHistory: currentChurch.preservationHistory,
        restorationHistory: currentChurch.restorationHistory,
        architecturalFeatures: currentChurch.architecturalFeatures,
        heritageInformation: currentChurch.heritageInformation,
        tags: currentChurch.tags,
        category: currentChurch.category,
      };
      
      // Categorize the changes
      const {
        hasSensitiveChanges,
        sensitiveChanges,
        sensitiveFields,
        directPublishChanges,
        directPublishFields,
      } = categorizeChanges(currentFormData, formData);
      
      console.log(`[ChurchService] Change categorization for church ${id}:`, {
        sensitiveFields,
        directPublishFields,
        hasSensitiveChanges,
      });
      
      // Prepare the update object
      const updateData: Record<string, unknown> = {
        updatedAt: Timestamp.now(),
      };
      
      // Apply direct publish changes immediately
      if (directPublishFields.length > 0) {
        for (const field of directPublishFields) {
          const value = (directPublishChanges as Record<string, unknown>)[field];
          if (value !== undefined) {
            // Map form field names to Firestore field names if needed
            if (field === 'coordinates' && value) {
              const coords = value as { latitude: number; longitude: number };
              updateData['latitude'] = coords.latitude;
              updateData['longitude'] = coords.longitude;
            } else if (field === 'virtualTour360') {
              // Form uses virtualTour360 but Firestore document/rules use virtualTour
              updateData['virtualTour'] = value;
            } else {
              updateData[field] = value;
            }
          }
        }
        console.log(`[ChurchService] Applying direct publish changes:`, directPublishFields);
      }
      
      // Handle sensitive changes - store in pendingChanges
      if (hasSensitiveChanges) {
        // Merge with existing pending changes if any
        const existingPending = currentChurch.pendingChanges?.data || {};
        const existingFields = currentChurch.pendingChanges?.changedFields || [];
        
        const mergedData = { ...existingPending, ...sensitiveChanges };
        const mergedFields = [...new Set([...existingFields, ...sensitiveFields])];
        
        updateData['pendingChanges'] = {
          data: mergedData,
          submittedAt: Timestamp.now(),
          submittedBy: userId,
          changedFields: mergedFields,
        };
        updateData['hasPendingChanges'] = true;
        
        console.log(`[ChurchService] Storing pending changes for review:`, mergedFields);
      }
      
      // Perform the update
      await updateDoc(churchRef, updateData);
      
      return {
        directlyPublished: directPublishFields,
        stagedForReview: sensitiveFields,
        hasPendingChanges: hasSensitiveChanges,
      };
      
    } catch (error) {
      console.error('Error updating church with staging:', error);
      if (error instanceof Error && error.message.includes('already exists')) {
        throw error;
      }
      throw new Error('Failed to update church');
    }
  }

  // Update church heritage fields (Museum Researcher action)
  // Only updates fields allowed by Firestore security rules for museum researchers:
  // Heritage fields: culturalSignificance, heritageNotes, heritageValidation, heritageDeclaration,
  //                  lastHeritageUpdate, heritageResearcher, status, updatedAt, lastReviewedBy, lastReviewNote, lastStatusChange
  // Historical tab fields: historicalBackground, description, architecturalStyle, architecturalFeatures,
  //                        heritageInformation, classification, foundingYear, founders, documents
  static async updateChurchHeritage(
    id: string,
    heritageData: {
      culturalSignificance?: string;
      heritageNotes?: string;
      heritageValidation?: {
        validated: boolean;
        notes?: string;
        validatedAt?: Timestamp;
      };
      heritageDeclaration?: {
        type: 'ICP' | 'NCT';
        referenceNo?: string;
        issuedBy?: string;
        dateIssued?: string;
        notes?: string;
      };
      status?: ChurchStatus;
      lastReviewNote?: string;
      // Historical tab fields
      historicalBackground?: string;
      description?: string;
      architecturalStyle?: string;
      architecturalFeatures?: string;
      heritageInformation?: string;
      classification?: 'ICP' | 'NCT' | 'non_heritage';
      foundingYear?: number;
      founders?: string;
      documents?: (string | { url: string; name?: string })[];
      religiousClassification?: ReligiousClassification;
      historicalDetails?: {
        religiousClassifications?: string[];
      };
    },
    userId: string,
    researcher?: UserProfile
  ): Promise<void> {
    try {
      const churchRef = doc(db, CHURCHES_COLLECTION, id);
      
      // Fetch current church data for audit logging
      const churchDoc = await getDoc(churchRef);
      const church = churchDoc.exists() ? churchDoc.data() : null;
      const oldClassification = church?.classification || 'unknown';
      
      // Build update data with only allowed fields
      const updateData: Record<string, unknown> = {
        updatedAt: Timestamp.now(),
        lastHeritageUpdate: Timestamp.now(),
        heritageResearcher: userId,
        lastReviewedBy: userId,
        lastStatusChange: Timestamp.now(),
      };

      // Add optional heritage fields if provided
      if (heritageData.culturalSignificance !== undefined) {
        updateData.culturalSignificance = heritageData.culturalSignificance;
      }
      if (heritageData.heritageNotes !== undefined) {
        updateData.heritageNotes = heritageData.heritageNotes;
      }
      if (heritageData.heritageValidation !== undefined) {
        updateData.heritageValidation = heritageData.heritageValidation;
      }
      if (heritageData.heritageDeclaration !== undefined) {
        updateData.heritageDeclaration = heritageData.heritageDeclaration;
      }
      if (heritageData.status !== undefined) {
        updateData.status = heritageData.status;
      }
      if (heritageData.lastReviewNote !== undefined) {
        updateData.lastReviewNote = heritageData.lastReviewNote;
      }
      // Historical tab fields
      if (heritageData.historicalBackground !== undefined) {
        updateData.historicalBackground = heritageData.historicalBackground;
      }
      if (heritageData.description !== undefined) {
        updateData.description = heritageData.description;
      }
      if (heritageData.architecturalStyle !== undefined) {
        updateData.architecturalStyle = heritageData.architecturalStyle;
      }
      if (heritageData.architecturalFeatures !== undefined) {
        updateData.architecturalFeatures = heritageData.architecturalFeatures;
      }
      if (heritageData.heritageInformation !== undefined) {
        updateData.heritageInformation = heritageData.heritageInformation;
      }
      if (heritageData.classification !== undefined) {
        updateData.classification = heritageData.classification;
        
        // If classification is changed to non_heritage, automatically send back to Chancery for approval
        // since heritage validation is no longer needed
        if (heritageData.classification === 'non_heritage') {
          updateData.status = 'pending';
          updateData.lastReviewNote = 'Heritage classification changed to non-heritage by Museum Researcher. Returned to Chancery for final approval.';
          console.log(`[ChurchService] Church ${id} classification changed to non-heritage. Status changed to 'pending' for Chancery approval.`);
        }
      }
      if (heritageData.foundingYear !== undefined) {
        updateData.foundingYear = heritageData.foundingYear;
      }
      if (heritageData.founders !== undefined) {
        updateData.founders = heritageData.founders;
      }
      if (heritageData.documents !== undefined) {
        updateData.documents = heritageData.documents;
      }
      if (heritageData.religiousClassification !== undefined) {
        updateData.religiousClassification = heritageData.religiousClassification;
      }
      if (heritageData.historicalDetails !== undefined) {
        updateData.historicalDetails = heritageData.historicalDetails;
      }

      console.log('[ChurchService] Updating church heritage fields:', id, updateData);
      await updateDoc(churchRef, updateData);

      // Log the action for audit trail
      if (researcher) {
        const isClassificationChange = heritageData.classification && heritageData.classification !== oldClassification;
        const auditAction = isClassificationChange && heritageData.classification === 'non_heritage' 
          ? 'heritage.reclassify' 
          : heritageData.status === 'approved' 
            ? 'heritage.approve' 
            : 'heritage.update';
        
        const changes = [];
        if (isClassificationChange) {
          changes.push(createFieldChange('classification', oldClassification, heritageData.classification));
        }
        if (heritageData.status) {
          changes.push(createFieldChange('status', church?.status || 'unknown', heritageData.status));
        }
        if (heritageData.heritageValidation?.validated !== undefined) {
          changes.push(createFieldChange('heritageValidation', 'unvalidated', 'validated'));
        }

        await AuditService.logAction(
          researcher,
          auditAction as 'heritage.update' | 'heritage.approve' | 'heritage.reclassify',
          'church',
          id,
          {
            resourceName: church?.name || 'Unknown Church',
            changes: changes.length > 0 ? changes : [createFieldChange('heritageInfo', 'old', 'updated')],
            metadata: {
              diocese: church?.diocese,
              classification: heritageData.classification || church?.classification,
              lastReviewNote: heritageData.lastReviewNote,
            },
          }
        );
      }
    } catch (error) {
      console.error('Error updating church heritage:', error);
      throw new Error('Failed to update church heritage information');
    }
  }

  // Review church submission (Chancery action)
  // Updated to accept reviewer profile for audit logging
  static async reviewChurch(
    action: ChurchReviewAction,
    reviewer?: UserProfile
  ): Promise<void> {
    try {
      // Fetch current church data for audit logging
      const churchRef = doc(db, CHURCHES_COLLECTION, action.churchId);
      const churchDoc = await getDoc(churchRef);
      const church = churchDoc.exists() ? churchDoc.data() : null;
      const oldStatus = church?.status || 'unknown';

      // Use Record for Firestore update - timestamps are Timestamp type in Firestore
      const updateData: Record<string, unknown> = {
        updatedAt: Timestamp.now(),
        reviewedBy: action.reviewerId,
        reviewedAt: Timestamp.now(),
        reviewNotes: action.notes,
      };

      let newStatus: ChurchStatus;
      let auditAction: 'church.approve' | 'church.forward_heritage';

      switch (action.action) {
        case 'approve': {
          newStatus = 'approved';
          auditAction = 'church.approve';
          updateData.status = 'approved';
          updateData.approvedAt = Timestamp.now();
          break;
        }
        case 'forward_to_museum': {
          newStatus = 'heritage_review';
          auditAction = 'church.forward_heritage';
          updateData.status = 'heritage_review';
          break;
        }
        default:
          newStatus = oldStatus as ChurchStatus;
          auditAction = 'church.approve';
      }

      await updateDoc(churchRef, updateData);

      // Log the action for audit trail
      if (reviewer) {
        await AuditService.logAction(
          reviewer,
          auditAction,
          'church',
          action.churchId,
          {
            resourceName: church?.name || 'Unknown Church',
            changes: [createFieldChange('status', oldStatus, newStatus)],
            metadata: {
              notes: action.notes,
              diocese: church?.diocese,
            },
          }
        );
      }
    } catch (error) {
      console.error('Error reviewing church:', error);
      throw new Error('Failed to review church');
    }
  }

  // Get single church by ID
  static async getChurch(id: string): Promise<Church | null> {
    try {
      const docRef = doc(db, CHURCHES_COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return convertToChurch(docSnap);
      }
      return null;
    } catch (error) {
      console.error('Error fetching church:', error);
      throw new Error('Failed to fetch church');
    }
  }

  // Get churches with filters
  static async getChurches(filters?: ChurchFilters): Promise<Church[]> {
    try {
      let q = query(
        collection(db, CHURCHES_COLLECTION),
        orderBy(filters?.sortBy || 'updatedAt', filters?.sortOrder || 'desc')
      );

      // Apply filters
      if (filters?.diocese && filters.diocese !== 'all') {
        q = query(q, where('diocese', '==', filters.diocese));
      }

      if (filters?.status && filters.status !== 'all') {
        q = query(q, where('status', '==', filters.status));
      }

      if (filters?.classification && filters.classification !== 'all') {
        q = query(q, where('classification', '==', filters.classification));
      }

      if (filters?.municipality) {
        q = query(q, where('municipality', '==', filters.municipality));
      }

      if (filters?.architecturalStyle && filters.architecturalStyle !== 'all') {
        q = query(q, where('architecturalStyle', '==', filters.architecturalStyle));
      }

      const snapshot = await getDocs(q);
      let churches = snapshot.docs.map(convertToChurch);

      // Apply client-side search filter if provided
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        churches = churches.filter(church =>
          church.name.toLowerCase().includes(searchTerm) ||
          church.fullName.toLowerCase().includes(searchTerm) ||
          church.location.toLowerCase().includes(searchTerm) ||
          church.municipality.toLowerCase().includes(searchTerm) ||
          church.description.toLowerCase().includes(searchTerm)
        );
      }

      return churches;
    } catch (error) {
      console.error('Error fetching churches:', error);
      throw new Error('Failed to fetch churches');
    }
  }

  // Get churches with cursor-based pagination (optimized for large datasets)
  static async getChurchesPaginated(
    filters?: ChurchFilters,
    pageSize: number = 20,
    lastDoc?: QueryDocumentSnapshot<DocumentData>
  ): Promise<{ churches: Church[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null; hasMore: boolean }> {
    try {
      let q = query(
        collection(db, CHURCHES_COLLECTION),
        orderBy(filters?.sortBy || 'updatedAt', filters?.sortOrder || 'desc'),
        limit(pageSize + 1) // Fetch one extra to check if there are more
      );

      // Apply diocese filter
      if (filters?.diocese && filters.diocese !== 'all') {
        q = query(q, where('diocese', '==', filters.diocese));
      }

      // Apply status filter
      if (filters?.status && filters.status !== 'all') {
        q = query(q, where('status', '==', filters.status));
      }

      // Apply classification filter
      if (filters?.classification && filters.classification !== 'all') {
        q = query(q, where('classification', '==', filters.classification));
      }

      // Apply municipality filter
      if (filters?.municipality) {
        q = query(q, where('municipality', '==', filters.municipality));
      }

      // Apply cursor for pagination
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;
      
      // Check if there are more results
      const hasMore = docs.length > pageSize;
      const resultDocs = hasMore ? docs.slice(0, pageSize) : docs;
      
      let churches = resultDocs.map(convertToChurch);

      // Apply client-side search filter if provided
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        churches = churches.filter(church =>
          church.name.toLowerCase().includes(searchTerm) ||
          church.fullName.toLowerCase().includes(searchTerm) ||
          church.location.toLowerCase().includes(searchTerm) ||
          church.municipality.toLowerCase().includes(searchTerm) ||
          church.description.toLowerCase().includes(searchTerm)
        );
      }

      return {
        churches,
        lastDoc: resultDocs.length > 0 ? resultDocs[resultDocs.length - 1] : null,
        hasMore
      };
    } catch (error) {
      console.error('Error fetching paginated churches:', error);
      throw new Error('Failed to fetch paginated churches');
    }
  }

  // Get churches for diocese (used in dashboards)
  static async getChurchesForDiocese(diocese: Diocese): Promise<Church[]> {
    return this.getChurches({ diocese });
  }

  // Get pending churches for review
  static async getPendingChurches(diocese?: Diocese): Promise<Church[]> {
    const filters: ChurchFilters = { status: 'pending' };
    if (diocese) filters.diocese = diocese;
    return this.getChurches(filters);
  }

  // Subscribe to churches (real-time)
  static subscribeToChurches(
    callback: (churches: Church[]) => void,
    filters?: ChurchFilters
  ): () => void {
    try {
      let q = query(
        collection(db, CHURCHES_COLLECTION),
        orderBy(filters?.sortBy || 'updatedAt', filters?.sortOrder || 'desc')
      );

      // Apply filters
      if (filters?.diocese && filters.diocese !== 'all') {
        q = query(q, where('diocese', '==', filters.diocese));
      }

      if (filters?.status && filters.status !== 'all') {
        q = query(q, where('status', '==', filters.status));
      }

      return onSnapshot(q, (snapshot) => {
        let churches = snapshot.docs.map(convertToChurch);

        // Apply client-side filters
        if (filters?.search) {
          const searchTerm = filters.search.toLowerCase();
          churches = churches.filter(church =>
            church.name.toLowerCase().includes(searchTerm) ||
            church.fullName.toLowerCase().includes(searchTerm) ||
            church.location.toLowerCase().includes(searchTerm)
          );
        }

        callback(churches);
      });
    } catch (error) {
      console.error('Error subscribing to churches:', error);
      throw new Error('Failed to subscribe to churches');
    }
  }

  // Get church statistics
  static async getChurchStats(diocese?: Diocese): Promise<ChurchStats> {
    try {
      const churches = diocese ?
        await this.getChurchesForDiocese(diocese) :
        await this.getChurches();

      const stats: ChurchStats = {
        total: churches.length,
        pending: churches.filter(c => c.status === 'pending').length,
        approved: churches.filter(c => c.status === 'approved').length,
        underReview: churches.filter(c => c.status === 'under_review').length,
        heritageReview: churches.filter(c => c.status === 'heritage_review').length,
        byClassification: {} as Record<string, number>,
        byMunicipality: {} as Record<string, number>,
        recentSubmissions: churches.filter(c => {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          return c.createdAt > oneWeekAgo;
        }).length,
      };

      // Count by classification
      churches.forEach(church => {
        stats.byClassification[church.classification] =
          (stats.byClassification[church.classification] || 0) + 1;
      });

      // Count by municipality
      churches.forEach(church => {
        stats.byMunicipality[church.municipality] =
          (stats.byMunicipality[church.municipality] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error fetching church stats:', error);
      throw new Error('Failed to fetch church statistics');
    }
  }

  // Unpublish church (soft delete - changes status to draft, hiding from mobile app)
  // The church data is preserved and can be republished by submitting for review again
  // Updated to accept user profile for audit logging
  static async unpublishChurch(
    id: string,
    reason: string,
    unpublishedBy: string,
    userProfile?: UserProfile
  ): Promise<void> {
    try {
      // Fetch church data for audit logging
      const churchRef = doc(db, CHURCHES_COLLECTION, id);
      const churchDoc = await getDoc(churchRef);
      const church = churchDoc.exists() ? churchDoc.data() : null;
      const oldStatus = church?.status || 'approved';

      await updateDoc(churchRef, {
        status: 'draft',
        unpublishReason: reason,
        unpublishedAt: Timestamp.now(),
        unpublishedBy: unpublishedBy,
        updatedAt: Timestamp.now(),
      });

      // Log the unpublish action for audit trail
      if (userProfile) {
        await AuditService.logAction(
          userProfile,
          'church.unpublish',
          'church',
          id,
          {
            resourceName: church?.name || 'Unknown Church',
            changes: [createFieldChange('status', oldStatus, 'draft')],
            metadata: {
              reason,
              diocese: church?.diocese,
            },
          }
        );
      }
    } catch (error) {
      console.error('Error unpublishing church:', error);
      throw new Error('Failed to unpublish church');
    }
  }

  // Legacy method for backward compatibility (deprecated - use unpublishChurch instead)
  static async deleteChurch(id: string): Promise<void> {
    try {
      await updateDoc(doc(db, CHURCHES_COLLECTION, id), {
        status: 'draft',
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error unpublishing church:', error);
      throw new Error('Failed to unpublish church');
    }
  }

  // Update visit count (for analytics)
  static async incrementVisitCount(id: string): Promise<void> {
    try {
      await updateDoc(doc(db, CHURCHES_COLLECTION, id), {
        visitCount: increment(1),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error incrementing visit count:', error);
      // Non-critical operation, don't throw
    }
  }

  // Update monthly visitors (for analytics)
  static async updateMonthlyVisitors(id: string, count: number): Promise<void> {
    try {
      await updateDoc(doc(db, CHURCHES_COLLECTION, id), {
        monthlyVisitors: count,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating monthly visitors:', error);
      throw new Error('Failed to update monthly visitors');
    }
  }

  // Update average rating (for feedback system)
  static async updateAverageRating(id: string, rating: number): Promise<void> {
    try {
      await updateDoc(doc(db, CHURCHES_COLLECTION, id), {
        averageRating: rating,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating average rating:', error);
      throw new Error('Failed to update average rating');
    }
  }
}