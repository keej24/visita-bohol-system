// Firebase service for church management
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  Church,
  ChurchFormData,
  ChurchFilters,
  ChurchReviewAction,
  ChurchStats,
  ChurchStatus
} from '@/types/church';
import type { Diocese } from '@/contexts/AuthContext';

const CHURCHES_COLLECTION = 'churches';

// Convert Firestore document to Church with proper typing
interface FirestoreChurchDoc {
  id: string;
  data: () => Record<string, unknown>;
}

const convertToChurch = (doc: FirestoreChurchDoc): Church => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    fullName: data.fullName,
    location: data.location,
    municipality: data.municipality,
    diocese: data.diocese,
    foundingYear: data.foundingYear,
    founders: data.founders,
    keyFigures: data.keyFigures || [],
    architecturalStyle: data.architecturalStyle,
    historicalBackground: data.historicalBackground,
    description: data.description,
    classification: data.classification,
    assignedPriest: data.assignedPriest,
    massSchedules: data.massSchedules || [],
    coordinates: data.coordinates,
    contactInfo: data.contactInfo,
    images: data.images || [],
    documents: data.documents || [],
    virtualTour360: data.virtualTour360 || [],
    heritageDeclaration: data.heritageDeclaration,
    culturalSignificance: data.culturalSignificance,
    preservationHistory: data.preservationHistory,
    restorationHistory: data.restorationHistory,
    status: data.status,
    reviewNotes: data.reviewNotes,
    reviewedBy: data.reviewedBy,
    reviewedAt: data.reviewedAt?.toDate(),
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    createdBy: data.createdBy,
    submittedAt: data.submittedAt?.toDate(),
    approvedAt: data.approvedAt?.toDate(),
    monthlyVisitors: data.monthlyVisitors,
    visitCount: data.visitCount,
    averageRating: data.averageRating,
    tags: data.tags || [],
    category: data.category,
    parishId: data.parishId,
  };
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
    assignedPriest: formData.assignedPriest,
    massSchedules: formData.massSchedules,
    coordinates: formData.coordinates,
    contactInfo: formData.contactInfo,
    images: formData.images,
    documents: formData.documents,
    virtualTour360: formData.virtualTour360,
    culturalSignificance: formData.culturalSignificance,
    preservationHistory: formData.preservationHistory,
    restorationHistory: formData.restorationHistory,
    tags: formData.tags,
    category: formData.category,
    updatedAt: Timestamp.now(),
  };

  if (!isUpdate) {
    return {
      ...baseData,
      status: 'pending' as ChurchStatus,
      createdAt: Timestamp.now(),
      createdBy: userId,
      submittedAt: Timestamp.now(),
    };
  }

  return baseData;
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

      // Use parish ID as document ID if provided (for parish secretaries)
      if (parishId) {
        const docRef = doc(db, CHURCHES_COLLECTION, parishId);
        await setDoc(docRef, data);
        return parishId;
      } else {
        // Auto-generate ID for chancery office submissions
        const docRef = await addDoc(collection(db, CHURCHES_COLLECTION), data);
        return docRef.id;
      }
    } catch (error) {
      console.error('Error creating church:', error);
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
      const data = convertToFirestoreData(formData, userId, diocese, true);
      await updateDoc(doc(db, CHURCHES_COLLECTION, id), data);
    } catch (error) {
      console.error('Error updating church:', error);
      throw new Error('Failed to update church');
    }
  }

  // Review church submission (Chancery action)
  static async reviewChurch(action: ChurchReviewAction): Promise<void> {
    try {
      const updateData: Partial<Church> & Record<string, unknown> = {
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
        case 'reject': {
          updateData.status = 'rejected';
          break;
        }
        case 'request_revision': {
          updateData.status = 'needs_revision';
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
        rejected: churches.filter(c => c.status === 'rejected').length,
        underReview: churches.filter(c => c.status === 'under_review').length,
        needsRevision: churches.filter(c => c.status === 'needs_revision').length,
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

  // Delete church (soft delete by updating status)
  static async deleteChurch(id: string): Promise<void> {
    try {
      await updateDoc(doc(db, CHURCHES_COLLECTION, id), {
        status: 'rejected',
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error deleting church:', error);
      throw new Error('Failed to delete church');
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
