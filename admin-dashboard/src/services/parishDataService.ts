// Parish-specific data service for real Firebase integration
import {
  collection,
  doc,
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
  addDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import type { ChurchInfo, MassSchedule, AnnouncementItem, FileUpload } from '@/components/parish/types';

export class ParishDataService {
  // Save church profile data
  static async saveChurchProfile(
    parishId: string, 
    churchInfo: ChurchInfo, 
    userId: string
  ): Promise<void> {
    try {
      const churchDoc = {
        ...churchInfo,
        parishId,
        status: 'pending',
        createdBy: userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'churches', parishId), churchDoc);
    } catch (error) {
      console.error('Error saving church profile:', error);
      throw new Error('Failed to save church profile');
    }
  }

  // Update church profile
  static async updateChurchProfile(
    parishId: string, 
    updates: Partial<ChurchInfo>
  ): Promise<void> {
    try {
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now(),
      };

      await updateDoc(doc(db, 'churches', parishId), updateData);
    } catch (error) {
      console.error('Error updating church profile:', error);
      throw new Error('Failed to update church profile');
    }
  }

  // Get church profile by parish ID
  static async getChurchProfile(parishId: string): Promise<ChurchInfo | null> {
    try {
      const docSnapshot = await getDoc(doc(db, 'churches', parishId));
      
      if (!docSnapshot.exists()) {
        return null;
      }

      return { ...docSnapshot.data(), id: docSnapshot.id } as ChurchInfo;
    } catch (error) {
      console.error('Error fetching church profile:', error);
      throw new Error('Failed to fetch church profile');
    }
  }

  // Upload file to Firebase Storage
  static async uploadFile(
    file: File, 
    parishId: string, 
    category: 'photos' | 'documents' | '360',
    userId: string
  ): Promise<FileUpload> {
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `parishes/${parishId}/${category}/${fileName}`;
      const fileRef = ref(storage, filePath);

      // Upload file
      const snapshot = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Create file metadata
      const fileUpload: FileUpload = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: category === '360' ? '360' : category === 'documents' ? 'document' : 'photo',
        url: downloadURL,
        uploadDate: new Date().toISOString(),
        status: 'pending',
        fileSize: file.size,
        description: '',
        category: 'interior' // Default category
      };

      // Save metadata to Firestore
      await addDoc(collection(db, 'uploads'), {
        ...fileUpload,
        parishId,
        uploadedBy: userId,
        createdAt: Timestamp.now(),
      });

      return fileUpload;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  }

  // Get files for parish
  static async getParishFiles(parishId: string): Promise<FileUpload[]> {
    try {
      const q = query(
        collection(db, 'uploads'),
        where('parishId', '==', parishId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ 
        ...doc.data(), 
        id: doc.id 
      } as FileUpload));
    } catch (error) {
      console.error('Error fetching parish files:', error);
      throw new Error('Failed to fetch files');
    }
  }

  // Delete file
  static async deleteFile(fileId: string, filePath: string): Promise<void> {
    try {
      // Delete from Storage
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);

      // Delete metadata from Firestore
      await deleteDoc(doc(db, 'uploads', fileId));
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  // Mass Schedule Management
  static async saveMassSchedules(
    parishId: string, 
    schedules: MassSchedule[]
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'churches', parishId), {
        massSchedules: schedules,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error saving mass schedules:', error);
      throw new Error('Failed to save mass schedules');
    }
  }

  // Announcement Management
  static async createAnnouncement(
    parishId: string, 
    announcement: Omit<AnnouncementItem, 'id'>, 
    userId: string
  ): Promise<string> {
    try {
      const announcementDoc = {
        ...announcement,
        parishId,
        scope: 'parish',
        diocese: 'tagbilaran', // Default - should be determined by parish
        createdBy: userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'announcements'), announcementDoc);
      return docRef.id;
    } catch (error) {
      console.error('Error creating announcement:', error);
      throw new Error('Failed to create announcement');
    }
  }

  // Get parish announcements
  static async getParishAnnouncements(parishId: string): Promise<AnnouncementItem[]> {
    try {
      const q = query(
        collection(db, 'announcements'),
        where('parishId', '==', parishId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      } as AnnouncementItem));
    } catch (error) {
      console.error('Error fetching announcements:', error);
      throw new Error('Failed to fetch announcements');
    }
  }

  // Submit church for review
  static async submitForReview(parishId: string, submissionNotes?: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'churches', parishId), {
        status: 'pending',
        submittedAt: Timestamp.now(),
        submissionNotes: submissionNotes || '',
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error submitting for review:', error);
      throw new Error('Failed to submit for review');
    }
  }

  // Real-time listener for church profile changes
  static subscribeToChurchProfile(
    parishId: string,
    callback: (church: ChurchInfo | null) => void
  ): () => void {
    try {
      return onSnapshot(doc(db, 'churches', parishId), (doc) => {
        if (doc.exists()) {
          callback({ ...doc.data(), id: doc.id } as ChurchInfo);
        } else {
          callback(null);
        }
      });
    } catch (error) {
      console.error('Error setting up church profile listener:', error);
      throw new Error('Failed to set up real-time listener');
    }
  }
}
