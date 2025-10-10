// Parish-specific API services for VISITA system
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
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from './firebase';

// Types for Parish data
export interface ParishSchedule {
  id?: string;
  parishId: string;
  type: 'mass' | 'event' | 'meeting';
  title: string;
  time: string;
  day: string;
  recurring: boolean;
  description: string;
  status: 'active' | 'inactive';
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export interface ParishAnnouncement {
  id?: string;
  parishId: string;
  title: string;
  content: string;
  type: 'general' | 'event' | 'schedule' | 'mass';
  priority: 'normal' | 'high' | 'urgent';
  status: 'draft' | 'pending_approval' | 'published' | 'archived';
  publishDate: string;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
  approvedBy?: string;
  approvedAt?: Date | Timestamp;
  views?: number;
}

export interface ParishUpload {
  id?: string;
  parishId: string;
  churchId: string;
  fileName: string;
  fileType: 'image' | '360_photo' | 'document';
  storageUrl: string;
  thumbnailUrl?: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt?: Date | Timestamp;
  approvedBy?: string;
  approvedAt?: Date | Timestamp;
  metadata?: {
    size: number;
    mimeType: string;
    width?: number;
    height?: number;
  };
}

export interface FeedbackResponse {
  id?: string;
  feedbackId: string;
  parishId: string;
  response: string;
  respondedBy: string;
  respondedAt?: Date | Timestamp;
}

export interface ChurchProfile {
  id?: string;
  parishId: string;
  name: string;
  location: string;
  foundingYear: string;
  classification: string;
  status: 'draft' | 'pending_chancery' | 'pending_museum' | 'approved' | 'needs_revision';
  architecturalStyle: string;
  priest: string;
  coordinates: { lat: number; lng: number };
  description: string;
  massSchedules: Array<{ day: string; time: string }>;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
  submittedAt?: Date | Timestamp;
  approvedAt?: Date | Timestamp;
  reviewComments?: string;
}

export interface SubmissionHistory {
  id?: string;
  parishId: string;
  type: 'church_profile' | 'announcement' | 'upload';
  targetId: string;
  action: 'submitted' | 'approved' | 'rejected' | 'revision_requested';
  comments?: string;
  performedBy: string;
  performedAt?: Date | Timestamp;
}

// Schedule Management
export const createSchedule = async (scheduleData: Omit<ParishSchedule, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'schedules'), {
      ...scheduleData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'active'
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating schedule:', error);
    throw error;
  }
};

export const updateSchedule = async (scheduleId: string, updates: Partial<ParishSchedule>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'schedules', scheduleId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    throw error;
  }
};

export const deleteSchedule = async (scheduleId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'schedules', scheduleId));
  } catch (error) {
    console.error('Error deleting schedule:', error);
    throw error;
  }
};

export const getParishSchedules = async (parishId: string): Promise<ParishSchedule[]> => {
  try {
    const q = query(
      collection(db, 'schedules'),
      where('parishId', '==', parishId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ParishSchedule));
  } catch (error) {
    console.error('Error getting parish schedules:', error);
    throw error;
  }
};

// Announcement Management
export const createAnnouncement = async (announcementData: Omit<ParishAnnouncement, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'announcements'), {
      ...announcementData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      views: 0,
      // Parish announcements are automatically published (no approval needed)
      status: announcementData.status === 'draft' ? 'draft' : 'published'
    });
    
    // Create submission history entry
    await addDoc(collection(db, 'submission_history'), {
      parishId: announcementData.parishId,
      type: 'announcement',
      targetId: docRef.id,
      action: announcementData.status === 'published' ? 'published' : 'draft_saved',
      performedBy: announcementData.parishId,
      performedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating announcement:', error);
    throw error;
  }
};

export const updateAnnouncement = async (announcementId: string, updates: Partial<ParishAnnouncement>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'announcements', announcementId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    throw error;
  }
};

// Parish announcements are published directly, no approval needed
export const publishAnnouncement = async (announcementId: string, parishId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'announcements', announcementId), {
      status: 'published',
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Create submission history entry
    await addDoc(collection(db, 'submission_history'), {
      parishId,
      type: 'announcement',
      targetId: announcementId,
      action: 'published',
      performedBy: parishId,
      performedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error publishing announcement:', error);
    throw error;
  }
};

export const archiveAnnouncement = async (announcementId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'announcements', announcementId), {
      status: 'archived',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error archiving announcement:', error);
    throw error;
  }
};

export const getParishAnnouncements = async (parishId: string): Promise<ParishAnnouncement[]> => {
  try {
    const q = query(
      collection(db, 'announcements'),
      where('parishId', '==', parishId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ParishAnnouncement));
  } catch (error) {
    console.error('Error getting parish announcements:', error);
    throw error;
  }
};

// File Upload Management
export const uploadFile = async (
  file: File, 
  parishId: string, 
  churchId: string, 
  fileType: 'image' | '360_photo' | 'document',
  description: string
): Promise<string> => {
  try {
    // Create storage reference
    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const storagePath = `churches/${churchId}/uploads/${fileType}/${fileName}`;
    const storageRef = ref(storage, storagePath);
    
    // Upload file
    const uploadResult = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(uploadResult.ref);
    
    // Create upload record
    const uploadData: Omit<ParishUpload, 'id'> = {
      parishId,
      churchId,
      fileName: file.name,
      fileType,
      storageUrl: downloadURL,
      description,
      status: 'pending',
      uploadedAt: serverTimestamp(),
      metadata: {
        size: file.size,
        mimeType: file.type
      }
    };
    
    const docRef = await addDoc(collection(db, 'uploads'), uploadData);
    
    // Create submission history entry
    await addDoc(collection(db, 'submission_history'), {
      parishId,
      type: 'upload',
      targetId: docRef.id,
      action: 'submitted',
      performedBy: parishId,
      performedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

export const deleteUpload = async (uploadId: string): Promise<void> => {
  try {
    // Get upload document
    const uploadDoc = await getDoc(doc(db, 'uploads', uploadId));
    if (!uploadDoc.exists()) {
      throw new Error('Upload not found');
    }
    
    const uploadData = uploadDoc.data() as ParishUpload;
    
    // Delete file from storage
    const storageRef = ref(storage, uploadData.storageUrl);
    await deleteObject(storageRef);
    
    // Delete thumbnail if exists
    if (uploadData.thumbnailUrl) {
      const thumbnailRef = ref(storage, uploadData.thumbnailUrl);
      await deleteObject(thumbnailRef);
    }
    
    // Delete upload document
    await deleteDoc(doc(db, 'uploads', uploadId));
  } catch (error) {
    console.error('Error deleting upload:', error);
    throw error;
  }
};

export const getParishUploads = async (parishId: string): Promise<ParishUpload[]> => {
  try {
    const q = query(
      collection(db, 'uploads'),
      where('parishId', '==', parishId),
      orderBy('uploadedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ParishUpload));
  } catch (error) {
    console.error('Error getting parish uploads:', error);
    throw error;
  }
};

// Feedback Management
export const getChurchFeedback = async (churchId: string): Promise<any[]> => {
  try {
    const q = query(
      collection(db, 'feedback'),
      where('churchId', '==', churchId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting church feedback:', error);
    throw error;
  }
};

export const respondToFeedback = async (
  feedbackId: string,
  parishId: string,
  response: string,
  respondedBy: string
): Promise<void> => {
  try {
    // Create response record
    await addDoc(collection(db, 'feedback_responses'), {
      feedbackId,
      parishId,
      response,
      respondedBy,
      respondedAt: serverTimestamp()
    });
    
    // Update feedback status
    await updateDoc(doc(db, 'feedback', feedbackId), {
      status: 'responded',
      lastResponseAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error responding to feedback:', error);
    throw error;
  }
};

export const moderateFeedback = async (
  feedbackId: string,
  action: 'approve' | 'reject' | 'flag',
  moderatorId: string
): Promise<void> => {
  try {
    const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged';
    
    await updateDoc(doc(db, 'feedback', feedbackId), {
      status,
      moderatedBy: moderatorId,
      moderatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error moderating feedback:', error);
    throw error;
  }
};

// Submission History
export const getSubmissionHistory = async (parishId: string): Promise<SubmissionHistory[]> => {
  try {
    const q = query(
      collection(db, 'submission_history'),
      where('parishId', '==', parishId),
      orderBy('performedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SubmissionHistory));
  } catch (error) {
    console.error('Error getting submission history:', error);
    throw error;
  }
};

// Real-time subscriptions
export const subscribeToParishData = (
  parishId: string,
  onUpdate: (data: { schedules: ParishSchedule[]; announcements: ParishAnnouncement[]; uploads: ParishUpload[]; feedback: FeedbackResponse[] }) => void
) => {
  const unsubscribeFunctions: (() => void)[] = [];
  
  // Subscribe to schedules
  const schedulesQuery = query(
    collection(db, 'schedules'),
    where('parishId', '==', parishId),
    where('status', '==', 'active')
  );
  
  const unsubscribeSchedules = onSnapshot(schedulesQuery, (snapshot) => {
    const schedules = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    onUpdate({ type: 'schedules', data: schedules });
  });
  
  unsubscribeFunctions.push(unsubscribeSchedules);
  
  // Subscribe to announcements
  const announcementsQuery = query(
    collection(db, 'announcements'),
    where('parishId', '==', parishId)
  );
  
  const unsubscribeAnnouncements = onSnapshot(announcementsQuery, (snapshot) => {
    const announcements = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    onUpdate({ type: 'announcements', data: announcements });
  });
  
  unsubscribeFunctions.push(unsubscribeAnnouncements);
  
  // Subscribe to uploads
  const uploadsQuery = query(
    collection(db, 'uploads'),
    where('parishId', '==', parishId)
  );
  
  const unsubscribeUploads = onSnapshot(uploadsQuery, (snapshot) => {
    const uploads = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    onUpdate({ type: 'uploads', data: uploads });
  });
  
  unsubscribeFunctions.push(unsubscribeUploads);
  
  // Return cleanup function
  return () => {
    unsubscribeFunctions.forEach(unsub => unsub());
  };
};

// Church Profile Management
export const getChurchProfile = async (parishId: string): Promise<ChurchProfile | null> => {
  try {
    const q = query(
      collection(db, 'churches'),
      where('parishId', '==', parishId)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as ChurchProfile;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting church profile:', error);
    throw error;
  }
};

export const createChurchProfile = async (profileData: Omit<ChurchProfile, 'id'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'churches'), {
      ...profileData,
      status: 'draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating church profile:', error);
    throw error;
  }
};

export const updateChurchProfile = async (churchId: string, updates: Partial<ChurchProfile>): Promise<void> => {
  try {
    await updateDoc(doc(db, 'churches', churchId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating church profile:', error);
    throw error;
  }
};

// Church profile submission workflow
export const submitChurchProfileForReview = async (
  churchId: string,
  parishId: string,
  isHeritageChurch: boolean = false
): Promise<void> => {
  try {
    // All church profiles go to chancery first
    const newStatus = 'pending_chancery';
    
    await updateDoc(doc(db, 'churches', churchId), {
      status: newStatus,
      submittedAt: serverTimestamp(),
      submittedBy: parishId,
      isHeritageChurch // Flag for later routing to museum researcher
    });
    
    // Create submission history entry
    await addDoc(collection(db, 'submission_history'), {
      parishId,
      type: 'church_profile',
      targetId: churchId,
      action: 'submitted',
      performedBy: parishId,
      performedAt: serverTimestamp(),
      comments: 'Submitted to chancery office for review'
    });
  } catch (error) {
    console.error('Error submitting church profile for review:', error);
    throw error;
  }
};

// Chancery office workflow functions
export const chanceryApproveChurch = async (
  churchId: string,
  chanceryUserId: string,
  isHeritageChurch: boolean = false
): Promise<void> => {
  try {
    const newStatus = isHeritageChurch ? 'pending_museum' : 'approved';
    
    await updateDoc(doc(db, 'churches', churchId), {
      status: newStatus,
      chanceryApprovedAt: serverTimestamp(),
      chanceryApprovedBy: chanceryUserId
    });
    
    // Create submission history entry
    await addDoc(collection(db, 'submission_history'), {
      parishId: '', // Will be filled by the calling function
      type: 'church_profile',
      targetId: churchId,
      action: isHeritageChurch ? 'forwarded_to_museum' : 'approved',
      performedBy: chanceryUserId,
      performedAt: serverTimestamp(),
      comments: isHeritageChurch ? 'Approved by chancery, forwarded to museum researcher' : 'Approved by chancery office'
    });
  } catch (error) {
    console.error('Error in chancery approval:', error);
    throw error;
  }
};

export const chanceryRequestRevision = async (
  churchId: string,
  chanceryUserId: string,
  comments: string
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'churches', churchId), {
      status: 'needs_revision',
      revisionRequestedAt: serverTimestamp(),
      revisionRequestedBy: chanceryUserId,
      revisionComments: comments
    });
    
    // Create submission history entry
    await addDoc(collection(db, 'submission_history'), {
      parishId: '', // Will be filled by the calling function
      type: 'church_profile',
      targetId: churchId,
      action: 'revision_requested',
      performedBy: chanceryUserId,
      performedAt: serverTimestamp(),
      comments: comments
    });
  } catch (error) {
    console.error('Error requesting revision:', error);
    throw error;
  }
};

// Museum researcher workflow functions
export const museumApproveChurch = async (
  churchId: string,
  museumUserId: string
): Promise<void> => {
  try {
    await updateDoc(doc(db, 'churches', churchId), {
      status: 'approved',
      museumApprovedAt: serverTimestamp(),
      museumApprovedBy: museumUserId
    });
    
    // Create submission history entry
    await addDoc(collection(db, 'submission_history'), {
      parishId: '', // Will be filled by the calling function
      type: 'church_profile',
      targetId: churchId,
      action: 'approved',
      performedBy: museumUserId,
      performedAt: serverTimestamp(),
      comments: 'Heritage information verified and approved by museum researcher'
    });
  } catch (error) {
    console.error('Error in museum approval:', error);
    throw error;
  }
};

export const museumEditChurchHistory = async (
  churchId: string,
  museumUserId: string,
  historicalBackground: string,
  heritageDocuments?: string[]
): Promise<void> => {
  try {
    const updateData: Partial<ChurchSubmission> = {
      historicalBackground,
      lastEditedBy: museumUserId,
      lastEditedAt: serverTimestamp()
    };
    
    if (heritageDocuments) {
      updateData.heritageDocuments = heritageDocuments;
    }
    
    await updateDoc(doc(db, 'churches', churchId), updateData);
    
    // Create submission history entry
    await addDoc(collection(db, 'submission_history'), {
      parishId: '', // Will be filled by the calling function
      type: 'church_profile',
      targetId: churchId,
      action: 'edited_by_museum',
      performedBy: museumUserId,
      performedAt: serverTimestamp(),
      comments: 'Historical background and heritage documents updated by museum researcher'
    });
  } catch (error) {
    console.error('Error editing church history:', error);
    throw error;
  }
};