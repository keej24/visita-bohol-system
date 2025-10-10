// Firebase service for announcement management
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Announcement, AnnouncementFormData, AnnouncementFilters } from '@/types/announcement';
import type { Diocese } from '@/contexts/AuthContext';

const ANNOUNCEMENTS_COLLECTION = 'announcements';

// Convert Firestore document to Announcement
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const convertToAnnouncement = (doc: any): Announcement => {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title,
    description: data.description,
    scope: data.scope as 'diocese' | 'parish',
    diocese: data.diocese as 'tagbilaran' | 'talibon',
    parishId: data.parishId,
    eventDate: data.eventDate?.toDate(),
    eventTime: data.eventTime,
    endTime: data.endTime,
    venue: data.venue,
    category: data.category,
    endDate: data.endDate?.toDate(),
    contactInfo: data.contactInfo,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    createdBy: data.createdBy,
    isArchived: data.isArchived || false,
    archivedAt: data.archivedAt?.toDate(),
  };
};

// Convert form data to Firestore document
const convertToFirestoreData = (formData: AnnouncementFormData, userId: string, diocese: Diocese, isUpdate = false) => {
  const baseData = {
    title: formData.title,
    description: formData.description,
    scope: formData.scope,
    diocese: diocese,
    parishId: formData.parishId || null,
    // Event fields are optional - only include if provided
    eventDate: formData.eventDate && formData.eventDate.trim() ? Timestamp.fromDate(new Date(formData.eventDate)) : null,
    eventTime: formData.eventTime && formData.eventTime.trim() ? formData.eventTime : null,
    endTime: formData.endTime && formData.endTime.trim() ? formData.endTime : null,
    venue: formData.venue && formData.venue.trim() ? formData.venue : null,
    endDate: formData.endDate && formData.endDate.trim() ? Timestamp.fromDate(new Date(formData.endDate)) : null,
    category: formData.category,
    contactInfo: formData.contactInfo && formData.contactInfo.trim() ? formData.contactInfo : null,
    updatedAt: Timestamp.now(),
    isArchived: false,
  };

  if (!isUpdate) {
    return {
      ...baseData,
      createdAt: Timestamp.now(),
      createdBy: userId,
    };
  }

  return baseData;
};

export class AnnouncementService {
  // Create new announcement
  static async createAnnouncement(
    formData: AnnouncementFormData,
    diocese: Diocese,
    userId: string
  ): Promise<string> {
    try {
      console.log('🔍 Creating announcement with data:', { formData, diocese, userId });
      console.log('🔍 Current auth user:', auth.currentUser?.uid, auth.currentUser?.email);

      // Check if user document exists in Firestore (required for security rules)
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.error('❌ User document does not exist in Firestore:', userId);
        throw new Error('User profile not found. Please contact your administrator to set up your account.');
      }

      const userData = userDoc.data();
      console.log('✅ User document found:', { role: userData.role, diocese: userData.diocese });

      // Verify user has correct diocese
      if (userData.diocese !== diocese) {
        console.error('❌ User diocese mismatch:', { userDiocese: userData.diocese, targetDiocese: diocese });
        throw new Error(`You can only create announcements for your own diocese (${userData.diocese}).`);
      }

      // Verify user has permission
      if (userData.role !== 'chancery_office' && userData.role !== 'parish_secretary') {
        console.error('❌ User does not have permission to create announcements:', userData.role);
        throw new Error('You do not have permission to create announcements.');
      }

      // Validate required fields (only title, description, and category are required)
      if (!formData.title?.trim()) {
        throw new Error('Title is required');
      }
      if (!formData.description?.trim()) {
        throw new Error('Description is required');
      }
      if (!formData.category?.trim()) {
        throw new Error('Category is required');
      }
      
      const data = convertToFirestoreData(formData, userId, diocese);
      console.log('🔍 Converted Firestore data:', data);
      
      const docRef = await addDoc(collection(db, ANNOUNCEMENTS_COLLECTION), data);
      console.log('✅ Announcement created successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating announcement:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        formData,
        diocese,
        userId
      });
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          throw new Error('Permission denied. Please check your user role and diocese access.');
        }
        if (error.message.includes('network')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        }
        if (error.message.includes('quota')) {
          throw new Error('Database quota exceeded. Please contact your administrator.');
        }
        // Re-throw validation errors as-is
        if (error.message.includes('required') || error.message.includes('invalid')) {
          throw error;
        }
      }
      
      throw new Error(`Failed to create announcement: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Update existing announcement
  static async updateAnnouncement(
    id: string, 
    formData: AnnouncementFormData, 
    diocese: Diocese,
    userId: string
  ): Promise<void> {
    try {
      const data = convertToFirestoreData(formData, userId, diocese, true);
      await updateDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id), data);
    } catch (error) {
      console.error('Error updating announcement:', error);
      throw new Error('Failed to update announcement');
    }
  }

  // Archive announcement
  static async archiveAnnouncement(id: string): Promise<void> {
    try {
      await updateDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id), {
        isArchived: true,
        archivedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error archiving announcement:', error);
      throw new Error('Failed to archive announcement');
    }
  }

  // Delete announcement
  static async deleteAnnouncement(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id));
    } catch (error) {
      console.error('Error deleting announcement:', error);
      throw new Error('Failed to delete announcement');
    }
  }

  // Get announcements for diocese
  static async getAnnouncements(
    diocese: Diocese, 
    filters?: AnnouncementFilters
  ): Promise<Announcement[]> {
    try {
      let q = query(
        collection(db, ANNOUNCEMENTS_COLLECTION),
        where('diocese', '==', diocese),
        orderBy('eventDate', 'desc')
      );

      // Apply filters
      if (filters?.scope && filters.scope !== 'all') {
        q = query(q, where('scope', '==', filters.scope));
      }

      if (filters?.category) {
        q = query(q, where('category', '==', filters.category));
      }

      if (filters?.isArchived !== undefined) {
        q = query(q, where('isArchived', '==', filters.isArchived));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(convertToAnnouncement);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      throw new Error('Failed to fetch announcements');
    }
  }

  // Subscribe to announcements (real-time)
  static subscribeToAnnouncements(
    diocese: Diocese,
    callback: (announcements: Announcement[]) => void,
    filters?: AnnouncementFilters
  ): () => void {
    try {
      let q = query(
        collection(db, ANNOUNCEMENTS_COLLECTION),
        where('diocese', '==', diocese),
        orderBy('eventDate', 'desc')
      );

      // Apply filters
      if (filters?.scope && filters.scope !== 'all') {
        q = query(q, where('scope', '==', filters.scope));
      }

      if (filters?.isArchived !== undefined) {
        q = query(q, where('isArchived', '==', filters.isArchived));
      }

      return onSnapshot(q, (snapshot) => {
        const announcements = snapshot.docs.map(convertToAnnouncement);
        callback(announcements);
      });
    } catch (error) {
      console.error('Error subscribing to announcements:', error);
      throw new Error('Failed to subscribe to announcements');
    }
  }

  // Automatically archive past events based on endDate
  static async autoArchivePastEvents(diocese: Diocese): Promise<number> {
    try {
      const announcements = await this.getAnnouncements(diocese, { isArchived: false });
      const now = new Date();
      let archivedCount = 0;

      for (const announcement of announcements) {
        // Auto-archive announcements that have passed their end date (only for events with endDate)
        if (announcement.endDate && announcement.endDate < now && !announcement.isArchived) {
          await this.archiveAnnouncement(announcement.id);
          archivedCount++;
        }
      }

      return archivedCount;
    } catch (error) {
      console.error('Error auto-archiving past events:', error);
      throw new Error('Failed to auto-archive past events');
    }
  }

  // Get announcement statistics
  static async getAnnouncementStats(diocese: Diocese): Promise<{
    total: number;
    active: number;
    archived: number;
    upcoming: number;
    past: number;
  }> {
    try {
      const announcements = await this.getAnnouncements(diocese);
      const now = new Date();

      const stats = {
        total: announcements.length,
        active: announcements.filter(a => !a.isArchived).length,
        archived: announcements.filter(a => a.isArchived).length,
        upcoming: announcements.filter(a => a.eventDate && a.eventDate > now && !a.isArchived).length,
        past: announcements.filter(a => a.eventDate && a.eventDate < now && !a.isArchived).length,
      };

      return stats;
    } catch (error) {
      console.error('Error fetching announcement stats:', error);
      throw new Error('Failed to fetch announcement statistics');
    }
  }
}
