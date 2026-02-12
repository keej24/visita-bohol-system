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
  Timestamp,
  type QueryConstraint
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Announcement, AnnouncementFormData, AnnouncementFilters } from '@/types/announcement';
import type { Diocese, UserProfile } from '@/contexts/AuthContext';
import { AuditService } from './auditService';
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
  // Determine if the announcement should be archived based on event date
  // If no event date is provided, or if event date is in the future, it should NOT be archived
  let shouldBeArchived = false;
  if (formData.eventDate && formData.eventDate.trim()) {
    const eventDate = new Date(formData.eventDate);
    const now = new Date();
    // Set both dates to start of day for fair comparison
    eventDate.setHours(23, 59, 59, 999); // End of event day
    now.setHours(0, 0, 0, 0); // Start of today
    shouldBeArchived = eventDate < now;
  }

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
    // Automatically unarchive if event date is in the future, archive if in the past
    isArchived: shouldBeArchived,
    // Clear archivedAt if being unarchived
    ...(shouldBeArchived ? {} : { archivedAt: null }),
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
      if (userData.role !== 'chancery_office' && userData.role !== 'parish') {
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

      // Log audit event (async, non-blocking)
      const userProfile: UserProfile = {
        uid: userId,
        email: userData.email || '',
        name: userData.name || 'Unknown',
        role: userData.role,
        diocese: userData.diocese,
        createdAt: userData.createdAt?.toDate() || new Date(),
        lastLoginAt: new Date(),
      };
      AuditService.logAction(
        userProfile,
        'announcement.create',
        'announcement',
        docRef.id,
        {
          resourceName: formData.title,
          metadata: {
            scope: formData.scope,
            category: formData.category,
          },
        }
      ).catch((err) => console.error('[AnnouncementService] Audit log failed:', err));

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
    userId: string,
    userProfile?: UserProfile
  ): Promise<void> {
    try {
      const data = convertToFirestoreData(formData, userId, diocese, true);
      await updateDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id), data);

      // Log audit event if userProfile provided
      if (userProfile) {
        AuditService.logAction(
          userProfile,
          'announcement.update',
          'announcement',
          id,
          {
            resourceName: formData.title,
            metadata: {
              scope: formData.scope,
              category: formData.category,
            },
          }
        ).catch((err) => console.error('[AnnouncementService] Audit log failed:', err));
      }
    } catch (error) {
      console.error('Error updating announcement:', error);
      throw new Error('Failed to update announcement');
    }
  }

  // Archive announcement
  static async archiveAnnouncement(id: string, userProfile?: UserProfile, announcementTitle?: string): Promise<void> {
    try {
      await updateDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id), {
        isArchived: true,
        archivedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      // Log audit event if userProfile provided
      if (userProfile) {
        AuditService.logAction(
          userProfile,
          'announcement.archive',
          'announcement',
          id,
          {
            resourceName: announcementTitle,
            changes: [{ field: 'isArchived', oldValue: false, newValue: true }],
          }
        ).catch((err) => console.error('[AnnouncementService] Audit log failed:', err));
      }
    } catch (error) {
      console.error('Error archiving announcement:', error);
      throw new Error('Failed to archive announcement');
    }
  }

  // Unarchive announcement (restore)
  static async unarchiveAnnouncement(id: string, userProfile?: UserProfile, announcementTitle?: string): Promise<void> {
    try {
      await updateDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id), {
        isArchived: false,
        archivedAt: null,
        updatedAt: Timestamp.now(),
      });

      // Log audit event if userProfile provided
      if (userProfile) {
        AuditService.logAction(
          userProfile,
          'announcement.unarchive',
          'announcement',
          id,
          {
            resourceName: announcementTitle,
            changes: [{ field: 'isArchived', oldValue: true, newValue: false }],
          }
        ).catch((err) => console.error('[AnnouncementService] Audit log failed:', err));
      }
    } catch (error) {
      console.error('Error unarchiving announcement:', error);
      throw new Error('Failed to unarchive announcement');
    }
  }

  // Delete announcement
  static async deleteAnnouncement(id: string, userProfile?: UserProfile, announcementTitle?: string): Promise<void> {
    try {
      await deleteDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id));

      // Log audit event if userProfile provided
      if (userProfile) {
        AuditService.logAction(
          userProfile,
          'announcement.delete',
          'announcement',
          id,
          {
            resourceName: announcementTitle,
          }
        ).catch((err) => console.error('[AnnouncementService] Audit log failed:', err));
      }
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
      console.log('📢 Fetching announcements for diocese:', diocese);
      console.log('🔍 Filters:', filters);

      // Build query constraints array
      const constraints: QueryConstraint[] = [
        where('diocese', '==', diocese)
      ];

      // Apply filters BEFORE orderBy
      if (filters?.scope && filters.scope !== 'all') {
        constraints.push(where('scope', '==', filters.scope));
      }

      if (filters?.category) {
        constraints.push(where('category', '==', filters.category));
      }

      if (filters?.isArchived !== undefined) {
        constraints.push(where('isArchived', '==', filters.isArchived));
      }

      // Filter by creator (important for role-based access)
      if (filters?.createdBy) {
        constraints.push(where('createdBy', '==', filters.createdBy));
      }

      // Add orderBy LAST - use createdAt since eventDate can be null for non-event announcements
      constraints.push(orderBy('createdAt', 'desc'));

      const q = query(collection(db, ANNOUNCEMENTS_COLLECTION), ...constraints);
      const snapshot = await getDocs(q);
      console.log('📊 Found', snapshot.docs.length, 'announcements');

      if (snapshot.docs.length > 0) {
        console.log('📄 First announcement sample:', snapshot.docs[0].data());
      }

      const announcements = snapshot.docs.map(convertToAnnouncement);
      console.log('✅ Converted announcements:', announcements);

      return announcements;
    } catch (error) {
      console.error('❌ Error fetching announcements:', error);
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
      // Build query constraints array
      const constraints: QueryConstraint[] = [
        where('diocese', '==', diocese)
      ];

      // Apply filters BEFORE orderBy
      if (filters?.scope && filters.scope !== 'all') {
        constraints.push(where('scope', '==', filters.scope));
      }

      if (filters?.isArchived !== undefined) {
        constraints.push(where('isArchived', '==', filters.isArchived));
      }

      // Filter by creator (important for role-based access)
      if (filters?.createdBy) {
        constraints.push(where('createdBy', '==', filters.createdBy));
      }

      // Add orderBy LAST - use createdAt since eventDate can be null for non-event announcements
      constraints.push(orderBy('createdAt', 'desc'));

      const q = query(collection(db, ANNOUNCEMENTS_COLLECTION), ...constraints);

      return onSnapshot(q, (snapshot) => {
        const announcements = snapshot.docs.map(convertToAnnouncement);
        callback(announcements);
      });
    } catch (error) {
      console.error('Error subscribing to announcements:', error);
      throw new Error('Failed to subscribe to announcements');
    }
  }

  // Automatically archive past events based on endDate or eventDate + endTime
  static async autoArchivePastEvents(diocese: Diocese): Promise<number> {
    try {
      const announcements = await this.getAnnouncements(diocese, { isArchived: false });
      const now = new Date();
      let archivedCount = 0;

      for (const announcement of announcements) {
        let shouldArchive = false;

        // Check if announcement has passed based on various date/time combinations
        if (announcement.endDate && announcement.endDate < now) {
          // If endDate is explicitly set and has passed
          shouldArchive = true;
        } else if (!announcement.endDate && announcement.eventDate) {
          // If no endDate but eventDate is set, check eventDate + endTime
          const eventDate = new Date(announcement.eventDate);
          
          if (announcement.endTime) {
            // If endTime is set (e.g., "09:30"), parse and combine with eventDate
            const [hours, minutes] = announcement.endTime.split(':').map(Number);
            const eventEndDateTime = new Date(eventDate);
            eventEndDateTime.setHours(hours || 0, minutes || 0, 0, 0);
            
            if (eventEndDateTime < now) {
              shouldArchive = true;
            }
          } else if (announcement.eventTime) {
            // If only eventTime is set (no endTime), use eventTime as the cutoff
            const [hours, minutes] = announcement.eventTime.split(':').map(Number);
            const eventDateTime = new Date(eventDate);
            eventDateTime.setHours(hours || 0, minutes || 0, 0, 0);
            
            if (eventDateTime < now) {
              shouldArchive = true;
            }
          } else {
            // If no time specified, use end of eventDate day
            const eventEndOfDay = new Date(eventDate);
            eventEndOfDay.setHours(23, 59, 59, 999);
            
            if (eventEndOfDay < now) {
              shouldArchive = true;
            }
          }
        }

        if (shouldArchive && !announcement.isArchived) {
          console.log(`📦 Auto-archiving past announcement: "${announcement.title}" (ID: ${announcement.id})`);
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