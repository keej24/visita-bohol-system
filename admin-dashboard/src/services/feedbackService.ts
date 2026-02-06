/**
 * =============================================================================
 * FEEDBACK SERVICE - Public User Review Management
 * =============================================================================
 * 
 * PURPOSE:
 * This service manages feedback/reviews submitted by mobile app users.
 * Chancery Office uses this to moderate inappropriate or spam reviews.
 * 
 * WHAT IS FEEDBACK?
 * When mobile app users visit churches, they can:
 * - Rate the church (1-5 stars)
 * - Write comments about their experience
 * - Upload photos from their visit
 * - Submit suggestions or complaints
 * 
 * MODERATION WORKFLOW:
 * 1. Mobile user submits feedback → status: 'pending' or 'published'
 * 2. Chancery Office reviews in admin dashboard
 * 3. Can hide inappropriate reviews → status: 'hidden'
 * 4. Hidden reviews don't show in mobile app
 * 
 * KEY CONCEPTS:
 * - Service Pattern: Encapsulates all Firestore logic for feedback
 * - Real-time Subscriptions: Auto-updates when new feedback arrives
 * - Moderation: Content control without deletion (can unhide later)
 * - Statistics: Dashboard shows average ratings and feedback counts
 * 
 * DATA FLOW:
 * Mobile App → Firebase Firestore → This Service → Admin Dashboard
 * 
 * RELATED FILES:
 * - pages/Feedback.tsx: UI for viewing/moderating feedback
 * - Firestore collection: 'feedback'
 * - Mobile app: lib/services/feedback_service.dart (creates feedback)
 */

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
import type { UserProfile } from '@/contexts/AuthContext';
import { AuditService } from './auditService';

/**
 * FeedbackItem Interface
 * 
 * Represents a single review/feedback from a mobile app user.
 * 
 * Fields explained:
 * - id: Firestore document ID
 * - church_id: Which church this feedback is about
 * - pub_user_id: Mobile app user who submitted (anonymous public users)
 * - userName: Display name of the reviewer
 * - rating: 1-5 stars
 * - subject: Short summary (e.g., "Great experience!")
 * - comment/message: Detailed review text
 * - status: Visibility control (published/hidden/pending)
 * - date_submitted: When feedback was created
 * - photos: Array of photo URLs uploaded with feedback
 * - moderatedAt: When chancery took action (hide/unhide)
 * - moderatedBy: Which chancery user moderated
 */
export interface FeedbackItem {
  id: string;
  church_id: string;
  pub_user_id: string;
  userName?: string;
  rating: number;
  subject: string;
  comment: string;
  message?: string;
  status: 'published' | 'hidden' | 'pending';
  date_submitted: Date;
  createdAt: string;
  photos?: string[]; // Photo URLs from mobile app
  mediaFiles?: MediaFile[];
  moderatedAt?: Date;
  moderatedBy?: string;
}

/**
 * MediaFile Interface
 * 
 * Represents photos/videos attached to feedback.
 */
export interface MediaFile {
  media_id: string;
  feedback_id: string;
  church_id: string;
  file_name: string;
  file_path: string; // Storage URL
  media_category: 'image' | 'video';
}

/**
 * FeedbackService Class
 * 
 * Static methods for all feedback operations.
 * No need to instantiate - just call FeedbackService.methodName()
 * 
 * Why static?
 * - Service doesn't need internal state
 * - All methods work with Firestore directly
 * - Simpler to use: FeedbackService.getFeedbackByChurch(id)
 */
export class FeedbackService {
  // Firestore collection name (where feedback is stored)
  private static readonly COLLECTION_NAME = 'feedback';

  /**
   * Get all feedback for a specific church
   * 
   * USE CASE: Display all reviews on church detail page
   * 
   * @param churchId - Church document ID to filter by
   * @param status - Optional: Filter by published/hidden/pending
   * @returns Promise<FeedbackItem[]> - Array of feedback items
   * 
   * EXAMPLE:
   * const allFeedback = await FeedbackService.getFeedbackByChurch('church123');
   * const onlyPublished = await FeedbackService.getFeedbackByChurch('church123', 'published');
   * 
   * QUERY EXPLANATION:
   * - WHERE church_id == churchId (filter to this church)
   * - WHERE status == status (if provided)
   * - ORDER BY date_submitted DESC (newest first)
   */
  static async getFeedbackByChurch(
    churchId: string,
    status?: 'published' | 'hidden' | 'pending'
  ): Promise<FeedbackItem[]> {
    try {
      // Get reference to 'feedback' collection
      const feedbackRef = collection(db, this.COLLECTION_NAME);

      // Build query with church filter
      let q = query(
        feedbackRef,
        where('church_id', '==', churchId),
        orderBy('date_submitted', 'desc')
      );

      // Add status filter if provided
      if (status) {
        q = query(
          feedbackRef,
          where('church_id', '==', churchId),
          where('status', '==', status),
          orderBy('date_submitted', 'desc')
        );
      }

      // Execute query and get results
      const querySnapshot = await getDocs(q);
      return this.mapFeedbackDocs(querySnapshot);
    } catch (error) {
      console.error('Error fetching feedback by church:', error);
      throw new Error('Failed to fetch feedback');
    }
  }

  /**
   * Get feedback with real-time updates (subscription)
   * 
   * USE CASE: Dashboard shows live updates when new feedback arrives
   * 
   * @param churchId - Church to monitor
   * @param callback - Function called with updated feedback array
   * @param status - Optional filter
   * @returns Unsubscribe function (call to stop listening)
   * 
   * EXAMPLE:
   * const unsubscribe = FeedbackService.subscribeToFeedbackByChurch(
   *   'church123',
   *   (updatedFeedback) => {
   *     console.log('New feedback:', updatedFeedback);
   *     setFeedback(updatedFeedback);
   *   }
   * );
   * 
   * // Later, stop listening:
   * unsubscribe();
   * 
   * HOW IT WORKS:
   * 1. Sets up Firestore listener
   * 2. Whenever feedback changes in database → callback fires
   * 3. Auto-updates UI without refresh
   * 4. Must call unsubscribe() when component unmounts (prevent memory leak)
   */
  static subscribeToFeedbackByChurch(
    churchId: string,
    callback: (feedback: FeedbackItem[]) => void,
    status?: 'published' | 'hidden' | 'pending'
  ): () => void {
    const feedbackRef = collection(db, this.COLLECTION_NAME);

    // Build query (same as getFeedbackByChurch)
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

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Success: Convert docs to FeedbackItem array and call callback
        const feedbackItems = this.mapFeedbackDocs(snapshot);
        callback(feedbackItems);
      },
      (error) => {
        // Error: Log and return empty array
        console.error('Error in feedback subscription:', error);
        callback([]);
      }
    );

    // Return unsubscribe function for cleanup
    return unsubscribe;
  }

  /**
   * Moderate feedback (hide/unhide)
   * 
   * USE CASE: Chancery hides inappropriate or spam reviews
   * 
   * @param feedbackId - Feedback document ID to moderate
   * @param status - New status: 'published' (show) or 'hidden' (hide)
   * @param moderatorId - User ID of chancery performing moderation
   * @param userProfile - Optional: UserProfile for audit logging
   * @param feedbackSubject - Optional: Feedback subject for audit context
   * 
   * EXAMPLE:
   * // Hide spam feedback
   * await FeedbackService.moderateFeedback('feedback123', 'hidden', currentUser.uid, userProfile);
   * 
   * // Unhide (restore previously hidden feedback)
   * await FeedbackService.moderateFeedback('feedback123', 'published', currentUser.uid, userProfile);
   * 
   * AUDIT TRAIL:
   * - Records WHO moderated (moderatedBy)
   * - Records WHEN moderated (moderatedAt)
   * - Allows tracing moderation decisions
   */
  static async moderateFeedback(
    feedbackId: string,
    status: 'published' | 'hidden',
    moderatorId: string,
    userProfile?: UserProfile,
    feedbackSubject?: string
  ): Promise<void> {
    try {
      // Get document reference
      const feedbackRef = doc(db, this.COLLECTION_NAME, feedbackId);

      // Get previous status for audit trail
      let previousStatus = 'unknown';
      if (userProfile) {
        const feedbackDoc = await getDoc(feedbackRef);
        if (feedbackDoc.exists()) {
          previousStatus = feedbackDoc.data().status || 'unknown';
        }
      }

      // Update fields
      await updateDoc(feedbackRef, {
        status,
        moderatedAt: Timestamp.now(),  // Current timestamp
        moderatedBy: moderatorId,       // Who performed moderation
      });

      console.log(`✅ Feedback ${feedbackId} moderated to: ${status}`);

      // Log audit event if userProfile provided
      if (userProfile) {
        const action = status === 'hidden' ? 'feedback.hide' : 'feedback.unhide';
        AuditService.logAction(
          userProfile,
          action,
          'feedback',
          feedbackId,
          {
            resourceName: feedbackSubject || 'User feedback',
            changes: [{ field: 'status', oldValue: previousStatus, newValue: status }],
          }
        ).catch((err) => console.error('[FeedbackService] Audit log failed:', err));
      }
    } catch (error) {
      console.error('Error moderating feedback:', error);
      throw new Error('Failed to moderate feedback');
    }
  }

  /**
   * Approve pending feedback (pre-moderation)
   * 
   * USE CASE: Chancery/Parish approves a pending review to publish it
   * 
   * @param feedbackId - Feedback document ID to approve
   * @param moderatorId - User ID of moderator
   * @param userProfile - Optional: UserProfile for audit logging
   * @param feedbackSubject - Optional: Feedback subject for audit context
   */
  static async approveFeedback(
    feedbackId: string,
    moderatorId: string,
    userProfile?: UserProfile,
    feedbackSubject?: string
  ): Promise<void> {
    try {
      const feedbackRef = doc(db, this.COLLECTION_NAME, feedbackId);

      // Get previous status for audit trail
      let previousStatus = 'pending';
      if (userProfile) {
        const feedbackDoc = await getDoc(feedbackRef);
        if (feedbackDoc.exists()) {
          previousStatus = feedbackDoc.data().status || 'pending';
        }
      }

      await updateDoc(feedbackRef, {
        status: 'published',
        moderatedAt: Timestamp.now(),
        moderatedBy: moderatorId,
        approvedAt: Timestamp.now(),
        approvedBy: moderatorId,
      });

      console.log(`✅ Feedback ${feedbackId} approved and published`);

      // Log audit event
      if (userProfile) {
        AuditService.logAction(
          userProfile,
          'feedback.approve',
          'feedback',
          feedbackId,
          {
            resourceName: feedbackSubject || 'User feedback',
            changes: [{ field: 'status', oldValue: previousStatus, newValue: 'published' }],
          }
        ).catch((err) => console.error('[FeedbackService] Audit log failed:', err));
      }
    } catch (error) {
      console.error('Error approving feedback:', error);
      throw new Error('Failed to approve feedback');
    }
  }

  /**
   * Reject pending feedback (pre-moderation)
   * 
   * USE CASE: Chancery/Parish rejects inappropriate or spam content
   * 
   * @param feedbackId - Feedback document ID to reject
   * @param moderatorId - User ID of moderator
   * @param reason - Optional: Reason for rejection
   * @param userProfile - Optional: UserProfile for audit logging
   * @param feedbackSubject - Optional: Feedback subject for audit context
   */
  static async rejectFeedback(
    feedbackId: string,
    moderatorId: string,
    reason?: string,
    userProfile?: UserProfile,
    feedbackSubject?: string
  ): Promise<void> {
    try {
      const feedbackRef = doc(db, this.COLLECTION_NAME, feedbackId);

      // Get previous status for audit trail
      let previousStatus = 'pending';
      if (userProfile) {
        const feedbackDoc = await getDoc(feedbackRef);
        if (feedbackDoc.exists()) {
          previousStatus = feedbackDoc.data().status || 'pending';
        }
      }

      await updateDoc(feedbackRef, {
        status: 'hidden',
        moderatedAt: Timestamp.now(),
        moderatedBy: moderatorId,
        rejectedAt: Timestamp.now(),
        rejectedBy: moderatorId,
        rejectionReason: reason || 'Content did not meet guidelines',
      });

      console.log(`❌ Feedback ${feedbackId} rejected`);

      // Log audit event
      if (userProfile) {
        AuditService.logAction(
          userProfile,
          'feedback.reject',
          'feedback',
          feedbackId,
          {
            resourceName: feedbackSubject || 'User feedback',
            changes: [
              { field: 'status', oldValue: previousStatus, newValue: 'hidden' },
              { field: 'rejectionReason', oldValue: null, newValue: reason || 'Content did not meet guidelines' },
            ],
          }
        ).catch((err) => console.error('[FeedbackService] Audit log failed:', err));
      }
    } catch (error) {
      console.error('Error rejecting feedback:', error);
      throw new Error('Failed to reject feedback');
    }
  }

  /**
   * Get all pending feedback for a diocese (for pre-moderation)
   * 
   * USE CASE: Chancery Office sees queue of reviews awaiting approval
   * 
   * @param diocese - Diocese to filter by
   * @param churchIds - Array of church IDs belonging to the diocese
   * @returns Promise<FeedbackItem[]> - Array of pending feedback items
   */
  static async getPendingFeedbackByDiocese(
    churchIds: string[]
  ): Promise<FeedbackItem[]> {
    try {
      if (churchIds.length === 0) {
        return [];
      }

      const feedbackRef = collection(db, this.COLLECTION_NAME);
      
      // Firestore 'in' queries support up to 30 values, so we may need to batch
      const batches: FeedbackItem[][] = [];
      const batchSize = 30;
      
      for (let i = 0; i < churchIds.length; i += batchSize) {
        const batchIds = churchIds.slice(i, i + batchSize);
        const q = query(
          feedbackRef,
          where('church_id', 'in', batchIds),
          where('status', '==', 'pending'),
          orderBy('date_submitted', 'desc')
        );
        
        const snapshot = await getDocs(q);
        batches.push(this.mapFeedbackDocs(snapshot));
      }
      
      // Combine all batches and sort by date
      return batches.flat().sort((a, b) => 
        new Date(b.date_submitted).getTime() - new Date(a.date_submitted).getTime()
      );
    } catch (error) {
      console.error('Error fetching pending feedback:', error);
      return [];
    }
  }

  /**
   * Get pending feedback count for a diocese
   * 
   * USE CASE: Show badge count on dashboard
   */
  static async getPendingFeedbackCount(churchIds: string[]): Promise<number> {
    const pending = await this.getPendingFeedbackByDiocese(churchIds);
    return pending.length;
  }

  /**
   * Get feedback statistics for a church
   * 
   * USE CASE: Dashboard shows "4.5 stars (23 reviews)"
   * 
   * @param churchId - Church to calculate stats for
   * @returns Object with counts and average rating
   * 
   * EXAMPLE:
   * const stats = await FeedbackService.getFeedbackStats('church123');
   * console.log(`Average: ${stats.averageRating} stars`);
   * console.log(`${stats.published} published, ${stats.hidden} hidden`);
   * 
   * CALCULATIONS:
   * - total: All feedback (published + hidden + pending)
   * - averageRating: Sum of all ratings ÷ total count, rounded to 1 decimal
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

      // Count by status
      const published = feedback.filter(f => f.status === 'published').length;
      const hidden = feedback.filter(f => f.status === 'hidden').length;
      const pending = feedback.filter(f => f.status === 'pending').length;

      // Calculate average rating
      const averageRating = feedback.length > 0
        ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
        : 0;

      return {
        total: feedback.length,
        published,
        hidden,
        pending,
        averageRating: Math.round(averageRating * 10) / 10,  // Round to 1 decimal
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
   * 
   * USE CASE: View full details of one review
   * 
   * @param feedbackId - Feedback document ID
   * @returns FeedbackItem or null if not found
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
   * 
   * WHY NEEDED:
   * Firestore returns raw data with inconsistent field names.
   * This maps different field variations to our standard FeedbackItem interface.
   */
  private static mapFeedbackDocs(snapshot: QuerySnapshot<DocumentData>): FeedbackItem[] {
    return snapshot.docs.map(doc => this.mapFeedbackDoc(doc.id, doc.data()));
  }

  /**
   * Helper method to map a single Firestore doc to FeedbackItem
   * 
   * HANDLES:
   * - Field name variations (church_id vs churchId)
   * - Date conversions (Timestamp → Date)
   * - Default values for missing fields
   * - Array normalization
   */
  private static mapFeedbackDoc(id: string, data: DocumentData): FeedbackItem {
    // Convert Firestore Timestamp to JavaScript Date
    const dateSubmitted = data.date_submitted?.toDate?.() || data.createdAt?.toDate?.() || new Date();

    return {
      id,
      // Handle field name variations (snake_case vs camelCase)
      church_id: data.church_id || data.churchId || '',
      pub_user_id: data.pub_user_id || data.userId || '',
      userName: 'Anonymous', // Always anonymous for privacy protection
      rating: data.rating || 5,
      subject: data.subject || 'Review',
      comment: data.comment || data.message || '',
      message: data.message || data.comment || '',
      status: data.status || 'published',
      date_submitted: dateSubmitted,
      createdAt: dateSubmitted.toISOString(),
      photos: Array.isArray(data.photos) ? data.photos : [],
      mediaFiles: data.mediaFiles || data.images || [],
      moderatedAt: data.moderatedAt?.toDate?.(),
      moderatedBy: data.moderatedBy,
    };
  }
}

/**
 * =============================================================================
 * LEARNING NOTES
 * =============================================================================
 * 
 * SERVICE PATTERN BENEFITS:
 * 1. Separation of Concerns: Database logic separate from UI
 * 2. Reusability: Use in multiple components
 * 3. Testability: Easy to mock for testing
 * 4. Maintainability: All feedback logic in one file
 * 
 * FIRESTORE QUERY PATTERNS:
 * 1. collection(db, 'collection_name') → Get collection reference
 * 2. where('field', '==', value) → Filter documents
 * 3. orderBy('field', 'desc') → Sort results
 * 4. getDocs(query) → Execute once and return results
 * 5. onSnapshot(query, callback) → Real-time listener
 * 
 * WHEN TO USE EACH METHOD:
 * - getFeedbackByChurch(): Load once (e.g., on page load)
 * - subscribeToFeedbackByChurch(): Need live updates
 * - moderateFeedback(): Change status
 * - getFeedbackStats(): Show summary numbers
 * - getFeedbackById(): Load one specific feedback
 */