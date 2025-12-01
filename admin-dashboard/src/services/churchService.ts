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
  ChurchStatus
} from '@/types/church';
import type { Diocese } from '@/contexts/AuthContext';

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    massSchedules: (data.massSchedules || []) as any[],
    // Support both root level (new) and nested (legacy) coordinates
    coordinates: data.latitude && data.longitude
      ? { latitude: data.latitude as number, longitude: data.longitude as number }
      : data.coordinates,
    contactInfo: data.contactInfo,
    images: (data.images || []) as string[],
    documents: (data.documents || []) as string[],
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
  };
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
    assignedPriest: formData.assignedPriest,
    massSchedules: formData.massSchedules,
    // Save coordinates at root level for mobile app compatibility
    latitude: formData.coordinates?.latitude,
    longitude: formData.coordinates?.longitude,
    contactInfo: formData.contactInfo,
    images: formData.images,
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
        await setDoc(doc(db, CHURCHES_COLLECTION, parishId), data);
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
      // If church classification changes from heritage (ICP/NCT) to non-heritage
      // and status is 'under_review', move it back to 'pending' for chancery review
      const wasHeritage = currentChurch.classification === 'ICP' || currentChurch.classification === 'NCT';
      const isNowHeritage = data.classification === 'ICP' || data.classification === 'NCT';
      
      if (wasHeritage && !isNowHeritage && currentChurch.status === 'under_review') {
        // Changed from heritage to non-heritage while in museum review
        // Return to chancery for approval
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data as any).status = 'pending';
        console.log(`[ChurchService] Church ${id} classification changed from heritage to non-heritage. Status changed from 'under_review' to 'pending'`);
      } else if (!wasHeritage && isNowHeritage && currentChurch.status === 'approved') {
        // Changed from non-heritage to heritage while already approved
        // Send to museum for heritage validation
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data as any).status = 'under_review';
        console.log(`[ChurchService] Church ${id} classification changed from non-heritage to heritage. Status changed from 'approved' to 'under_review'`);
      }

      await updateDoc(churchRef, data);
    } catch (error) {
      console.error('Error updating church:', error);
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
      documents?: string[];
    },
    userId: string
  ): Promise<void> {
    try {
      const churchRef = doc(db, CHURCHES_COLLECTION, id);
      
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

      console.log('[ChurchService] Updating church heritage fields:', id, updateData);
      await updateDoc(churchRef, updateData);
    } catch (error) {
      console.error('Error updating church heritage:', error);
      throw new Error('Failed to update church heritage information');
    }
  }

  // Review church submission (Chancery action)
  static async reviewChurch(action: ChurchReviewAction): Promise<void> {
    try {
      // Use Record for Firestore update - timestamps are Timestamp type in Firestore
      const updateData: Record<string, unknown> = {
        updatedAt: Timestamp.now(),
        reviewedBy: action.reviewerId,
        reviewedAt: Timestamp.now(),
        reviewNotes: action.notes,
      };

      switch (action.action) {
        case 'approve': {
          updateData.status = 'approved';
          updateData.approvedAt = Timestamp.now();
          break;
        }
        case 'forward_to_museum': {
          updateData.status = 'under_review';
          break;
        }
      }

      await updateDoc(doc(db, CHURCHES_COLLECTION, action.churchId), updateData);
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