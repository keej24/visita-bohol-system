import {
  collection,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  updateDoc,
  onSnapshot,
  Timestamp,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface FeedbackItem {
  id: string;
  church_id: string;
  pub_user_id: string;
  userName?: string;
  rating: number;
  subject: string;
  comment: string;
  status: 'published' | 'hidden' | 'pending';
  date_submitted: Date;
  mediaFiles?: MediaFile[];
  moderatedAt?: Date;
  moderatedBy?: string;
}

export interface MediaFile {
  media_id: string;
  feedback_id: string;
  church_id: string;
  file_name: string;
  file_path: string; // Storage URL
  media_category: 'image' | 'video';
}

export class FeedbackService {
  private static readonly COLLECTION_NAME = 'feedback';

  /**
   * Get all feedback for a specific church
   */
  static async getFeedbackByChurch(
    churchId: string,
    status?: 'published' | 'hidden' | 'pending'
  ): Promise<FeedbackItem[]> {
    try {
      const feedbackRef = collection(db, this.COLLECTION_NAME);

      let q = query(
        feedbackRef,
        where('church_id', '==', churchId),
        orderBy('date_submitted', 'desc')
      );

      if (status) {
        q = query(
          feedbackRef,
          where('church_id', '==', churchId),
          where('status', '==', status),
          orderBy('date_submitted', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      return this.mapFeedbackDocs(querySnapshot);
    } catch (error) {
      console.error('Error fetching feedback by church:', error);
      throw new Error('Failed to fetch feedback');
    }
  }

  /**
   * Get feedback with real-time updates
   */
  static subscribeToFeedbackByChurch(
    churchId: string,
    callback: (feedback: FeedbackItem[]) => void,
    status?: 'published' | 'hidden' | 'pending'
  ): () => void {
    const feedbackRef = collection(db, this.COLLECTION_NAME);

    let q = query(
      feedbackRef,
      where('church_id', '==', churchId),
      orderBy('date_submitted', 'desc')
    );

    if (status) {
      q = query(
        feedbackRef,
        where('church_id', '==', churchId),
        where('status', '==', status),
        orderBy('date_submitted', 'desc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const feedbackItems = this.mapFeedbackDocs(snapshot);
        callback(feedbackItems);
      },
      (error) => {
        console.error('Error in feedback subscription:', error);
        callback([]);
      }
    );

    return unsubscribe;
  }

  /**
   * Moderate feedback (hide/unhide)
   */
  static async moderateFeedback(
    feedbackId: string,
    status: 'published' | 'hidden',
    moderatorId: string
  ): Promise<void> {
    try {
      const feedbackRef = doc(db, this.COLLECTION_NAME, feedbackId);

      await updateDoc(feedbackRef, {
        status,
        moderatedAt: Timestamp.now(),
        moderatedBy: moderatorId,
      });

      console.log(`✅ Feedback ${feedbackId} moderated to: ${status}`);
    } catch (error) {
      console.error('Error moderating feedback:', error);
      throw new Error('Failed to moderate feedback');
    }
  }

  /**
   * Get feedback statistics for a church
   */
  static async getFeedbackStats(churchId: string): Promise<{
    total: number;
    published: number;
    hidden: number;
    pending: number;
    averageRating: number;
  }> {
    try {
      const feedbackRef = collection(db, this.COLLECTION_NAME);
      const q = query(feedbackRef, where('church_id', '==', churchId));

      const querySnapshot = await getDocs(q);
      const feedback = this.mapFeedbackDocs(querySnapshot);

      const published = feedback.filter(f => f.status === 'published').length;
      const hidden = feedback.filter(f => f.status === 'hidden').length;
      const pending = feedback.filter(f => f.status === 'pending').length;

      const averageRating = feedback.length > 0
        ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
        : 0;

      return {
        total: feedback.length,
        published,
        hidden,
        pending,
        averageRating: Math.round(averageRating * 10) / 10,
      };
    } catch (error) {
      console.error('Error getting feedback stats:', error);
      return {
        total: 0,
        published: 0,
        hidden: 0,
        pending: 0,
        averageRating: 0,
      };
    }
  }

  /**
   * Get a single feedback item by ID
   */
  static async getFeedbackById(feedbackId: string): Promise<FeedbackItem | null> {
    try {
      const feedbackRef = doc(db, this.COLLECTION_NAME, feedbackId);
      const feedbackDoc = await getDoc(feedbackRef);

      if (!feedbackDoc.exists()) {
        return null;
      }

      return this.mapFeedbackDoc(feedbackDoc.id, feedbackDoc.data());
    } catch (error) {
      console.error('Error fetching feedback by ID:', error);
      return null;
    }
  }

  /**
   * Helper method to map Firestore docs to FeedbackItem objects
   */
  private static mapFeedbackDocs(snapshot: QuerySnapshot<DocumentData>): FeedbackItem[] {
    return snapshot.docs.map(doc => this.mapFeedbackDoc(doc.id, doc.data()));
  }

  /**
   * Helper method to map a single Firestore doc to FeedbackItem
   */
  private static mapFeedbackDoc(id: string, data: DocumentData): FeedbackItem {
    return {
      id,
      church_id: data.church_id || data.churchId || '',
      pub_user_id: data.pub_user_id || data.userId || '',
      userName: data.userName || data.user_name || 'Anonymous',
      rating: data.rating || 5,
      subject: data.subject || '',
      comment: data.comment || data.message || '',
      status: data.status || 'published',
      date_submitted: data.date_submitted?.toDate?.() || data.createdAt?.toDate?.() || new Date(),
      mediaFiles: data.mediaFiles || data.images || [],
      moderatedAt: data.moderatedAt?.toDate?.(),
      moderatedBy: data.moderatedBy,
    };
  }
}
