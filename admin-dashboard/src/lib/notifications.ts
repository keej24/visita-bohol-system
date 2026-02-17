import { db } from '@/lib/firebase';
import { addDoc, collection, query, where, orderBy, getDocs, updateDoc, doc, serverTimestamp, Timestamp, limit, deleteDoc, writeBatch, arrayUnion } from 'firebase/firestore';
import type { ChurchStatus } from '@/lib/churches';
import type { UserProfile, Diocese } from '@/contexts/AuthContext';

export type NotificationType =
  | 'church_submitted'           // Parish submitted church for review → Chancery
  | 'heritage_review_assigned'   // Chancery forwarded to museum → Museum Researcher
  | 'heritage_validated'         // Museum validated heritage church → Chancery
  | 'revision_requested'         // Chancery/Museum requested revisions → Parish
  | 'church_approved'            // Church is now published → Parish
  | 'church_unpublished'         // Church was unpublished by Chancery → Parish
  | 'pending_update_submitted'   // Parish submitted changes to approved church → Chancery
  | 'workflow_error'             // System error → Chancery
  | 'account_pending_approval'   // New parish staff registered → Current Parish Staff
  | 'chancellor_pending_approval' // New chancellor registered → Current Active Chancellor
  | 'museum_staff_pending_approval' // New museum staff registered → Current Active Museum Researcher
  | 'account_approved'           // Account activated → Parish Secretary
  | 'feedback_received'          // New visitor feedback → Parish Secretary
  | 'system_notification';       // General system notification

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id?: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  recipients: {
    userIds?: string[];
    roles?: string[];
    dioceses?: Diocese[];
    parishId?: string;  // For parish-specific notifications
  };
  relatedData?: {
    churchId?: string;
    churchName?: string;
    fromStatus?: ChurchStatus;
    toStatus?: ChurchStatus;
    actionBy?: {
      uid: string;
      name?: string;
      role: string;
    };
  };
  createdAt: Timestamp;
  isRead?: boolean;
  readBy?: string[];
  expiresAt?: Timestamp;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationTemplate {
  type: NotificationType;
  titleTemplate: string;
  messageTemplate: string;
  priority: NotificationPriority;
  recipientRules: {
    roles?: string[];
    conditions?: (context: Record<string, unknown>) => boolean;
  };
}

/**
 * Notification Templates for Church Approval Workflow
 * 
 * WORKFLOW:
 * 1. Parish submits church → Chancery receives "church_submitted"
 * 2. Chancery reviews:
 *    - If heritage church → Museum receives "heritage_review_assigned"
 *    - If non-heritage → Church approved, Parish receives "church_approved"
 *    - If needs revision → Parish receives "revision_requested"
 * 3. Museum validates heritage → Chancery receives "heritage_validated", Parish receives "church_approved"
 */
const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  // Parish submitted church for review → Chancery Office
  {
    type: 'church_submitted',
    titleTemplate: 'New Church Submission: {churchName}',
    messageTemplate: 'Parish has submitted "{churchName}" for review. Please review the church profile and approve or request revisions.',
    priority: 'high',
    recipientRules: {
      roles: ['chancery_office']
    }
  },

  // Chancery forwarded to Museum for heritage validation → Museum Researcher
  {
    type: 'heritage_review_assigned',
    titleTemplate: 'Heritage Review Required: {churchName}',
    messageTemplate: '"{churchName}" has been forwarded for heritage validation. Please verify the cultural and historical significance before approval.',
    priority: 'high',
    recipientRules: {
      roles: ['museum_researcher']
    }
  },

  // Museum validated heritage church → Chancery Office
  {
    type: 'heritage_validated',
    titleTemplate: 'Heritage Validated: {churchName}',
    messageTemplate: 'Museum Staff has validated "{churchName}" as a heritage site. The church has been approved and published.',
    priority: 'medium',
    recipientRules: {
      roles: ['chancery_office']
    }
  },

  // Revision Requested → Parish
  {
    type: 'revision_requested',
    titleTemplate: 'Revision Requested: {churchName}',
    messageTemplate: 'Your church profile "{churchName}" requires revisions. Please check the feedback and resubmit for approval.',
    priority: 'high',
    recipientRules: {
      roles: ['parish']
    }
  },

  // Church Approved/Published → Parish
  {
    type: 'church_approved',
    titleTemplate: 'Church Published: {churchName}',
    messageTemplate: 'Congratulations! "{churchName}" has been approved and is now live for public viewing in the VISITA app.',
    priority: 'medium',
    recipientRules: {
      roles: ['parish']
    }
  },

  // Church Unpublished → Parish
  {
    type: 'church_unpublished',
    titleTemplate: 'Church Unpublished: {churchName}',
    messageTemplate: '"{churchName}" has been unpublished by the Chancery Office. Reason: {reason}. You can republish it later by submitting for review again.',
    priority: 'high',
    recipientRules: {
      roles: ['parish']
    }
  },

  // Workflow Errors → Chancery Office
  {
    type: 'workflow_error',
    titleTemplate: 'Workflow Issue: {churchName}',
    messageTemplate: 'An issue occurred while processing "{churchName}". Manual intervention may be required.',
    priority: 'urgent',
    recipientRules: {
      roles: ['chancery_office']
    }
  },

  // New Parish Staff Pending Approval → Current Parish Staff
  {
    type: 'account_pending_approval',
    titleTemplate: 'New Registration Request: {userName}',
    messageTemplate: '{userName} has registered as {position} for {parishName}. Please review and approve or reject the registration from your Staff Management tab.',
    priority: 'high',
    recipientRules: {
      roles: ['parish']
    }
  },

  // New Chancellor Pending Approval → Current Active Chancellor
  {
    type: 'chancellor_pending_approval',
    titleTemplate: 'New Chancellor Registration: {userName}',
    messageTemplate: '{userName} has registered as a new Chancellor. Please review and approve or reject the registration from the Chancellors tab.',
    priority: 'high',
    recipientRules: {
      roles: ['chancery_office']
    }
  },

  // New Museum Staff Pending Approval → Current Active Museum Researcher
  {
    type: 'museum_staff_pending_approval',
    titleTemplate: 'New Museum Staff Registration: {userName}',
    messageTemplate: '{userName} has registered as a new Museum Staff. Please review and approve or reject the registration from the Staff Management tab.',
    priority: 'high',
    recipientRules: {
      roles: ['museum_researcher']
    }
  },

  // Account Approved → Parish
  {
    type: 'account_approved',
    titleTemplate: 'Account Activated',
    messageTemplate: 'Your account has been approved! You can now access the Parish Dashboard and manage your church profile.',
    priority: 'high',
    recipientRules: {
      roles: ['parish']
    }
  },

  // New Visitor Feedback → Parish
  {
    type: 'feedback_received',
    titleTemplate: 'New Visitor Feedback: {churchName}',
    messageTemplate: 'A visitor has left a {rating}-star review for {churchName}. Check the feedback section to view details.',
    priority: 'medium',
    recipientRules: {
      roles: ['parish']
    }
  },

  // Parish submitted changes to approved church → Chancery
  {
    type: 'pending_update_submitted',
    titleTemplate: 'Church Update Pending: {churchName}',
    messageTemplate: 'Parish has submitted changes to "{churchName}" that require your review. Go to the Updates tab to review and approve the changes.',
    priority: 'high',
    recipientRules: {
      roles: ['chancery_office']
    }
  }
];

/**
 * Notification Service Class
 */
export class NotificationService {
  private templates: Map<NotificationType, NotificationTemplate>;

  constructor() {
    this.templates = new Map();
    NOTIFICATION_TEMPLATES.forEach(template => {
      this.templates.set(template.type, template);
    });
  }

  /**
   * Create and send notifications based on church workflow status changes
   * 
   * ChurchStatus values: 'pending' | 'approved' | 'under_review' | 'heritage_review'
   * 
   * Workflow notifications:
   * - Parish submits (draft/pending → pending/under_review) → Chancery gets "church_submitted"
   * - Chancery forwards to museum (under_review → heritage_review) → Museum gets "heritage_review_assigned"
   * - Museum validates (heritage_review → approved) → Chancery gets "heritage_validated", Parish gets "church_approved"
   * - Chancery approves non-heritage (under_review → approved) → Parish gets "church_approved"
   * - Revision requested (→ pending) → Parish gets "revision_requested"
   */
  async notifyStatusChange(
    churchId: string,
    churchName: string,
    fromStatus: ChurchStatus,
    toStatus: ChurchStatus,
    actionBy: UserProfile,
    diocese: Diocese,
    note?: string
  ): Promise<void> {
    try {
      console.log(`[Notifications] Status change: ${fromStatus} → ${toStatus} for church "${churchName}" (${churchId})`);
      const notifications: Array<{type: NotificationType; roles: string[]}> = [];

      // Determine which notifications to send based on workflow transition
      // Parish submitted for review → Notify Chancery
      // Trigger on:
      // - draft→pending (first submission)
      // - draft→under_review (direct to under_review)
      // - pending→under_review (moved to active review)
      // - any status→pending when action is by parish (re-submission after revision)
      const isParishSubmission = actionBy.role === 'parish';
      const isSubmissionForReview = 
        (fromStatus === 'pending' && toStatus === 'under_review') ||
        (fromStatus === 'draft' && (toStatus === 'pending' || toStatus === 'under_review')) ||
        (toStatus === 'under_review' && fromStatus !== 'heritage_review' && fromStatus !== 'approved') ||
        // Parish re-submitting after revision (handles pending→pending re-submission)
        (isParishSubmission && toStatus === 'pending' && fromStatus !== 'draft');
      
      console.log(`[Notifications] isSubmissionForReview: ${isSubmissionForReview}, isParishSubmission: ${isParishSubmission}`);
      
      if (isSubmissionForReview) {
        notifications.push({ type: 'church_submitted', roles: ['chancery_office'] });
      } else if (toStatus === 'heritage_review') {
        // Chancery forwarded to museum → Notify Museum Researcher
        notifications.push({ type: 'heritage_review_assigned', roles: ['museum_researcher'] });
      } else if (fromStatus === 'heritage_review' && toStatus === 'approved') {
        // Museum validated heritage church → Notify Chancery and Parish
        notifications.push({ type: 'heritage_validated', roles: ['chancery_office'] });
        notifications.push({ type: 'church_approved', roles: ['parish'] });
      } else if (toStatus === 'approved' && (fromStatus === 'under_review' || fromStatus === 'pending')) {
        // Chancery approved church (from pending or under_review) → Notify Parish
        notifications.push({ type: 'church_approved', roles: ['parish'] });
      } else if (toStatus === 'pending' && fromStatus !== 'draft' && !isParishSubmission) {
        // Revision requested (sent back to pending from approved/under_review) by Chancery/Museum → Notify Parish
        // Note: We exclude draft→pending since that's a submission, not a revision request
        // Also exclude parish actions since that would be a re-submission (handled above)
        notifications.push({ type: 'revision_requested', roles: ['parish'] });
      }

      // Create each notification
      for (const notif of notifications) {
        const template = this.templates.get(notif.type);
        if (!template) {
          console.warn(`No template found for notification type: ${notif.type}`);
          continue;
        }

        const notificationData = {
          churchId,
          churchName,
          fromStatus,
          toStatus,
          actionBy: {
            uid: actionBy.uid,
            name: actionBy.name,
            role: actionBy.role
          },
          note,
          diocese
        };

        // For parish notifications, include the churchId as parishId
        // so the notification only appears for the specific parish
        const isParishNotification = notif.roles.includes('parish');
        
        const notification: Omit<Notification, 'id'> = {
          type: notif.type,
          priority: template.priority,
          title: this.processTemplate(template.titleTemplate, notificationData),
          message: this.processTemplate(template.messageTemplate, notificationData),
          recipients: {
            roles: notif.roles,
            dioceses: [diocese],
            // Only parish secretaries should see notifications for their specific parish
            ...(isParishNotification && { parishId: churchId })
          },
          relatedData: {
            churchId,
            churchName,
            fromStatus,
            toStatus,
            actionBy: {
              uid: actionBy.uid,
              name: actionBy.name,
              role: actionBy.role
            }
          },
          createdAt: serverTimestamp() as Timestamp,
          actionUrl: this.getActionUrl(notif.type, churchId),
          metadata: {
            diocese,
            note
          }
        };

        // Save to Firestore
        await addDoc(collection(db, 'notifications'), notification);
        console.log(`[Notifications] Created ${notif.type} notification for ${notif.roles.join(', ')}`);
      }

    } catch (error) {
      console.error('Error creating status change notification:', error);
      // Don't throw - notifications should not block workflow
    }
  }

  /**
   * Create a custom notification
   */
  async createNotification(
    type: NotificationType,
    title: string,
    message: string,
    recipients: { userIds?: string[]; roles?: string[]; dioceses?: Diocese[] },
    priority: NotificationPriority = 'medium',
    relatedData?: Record<string, unknown>,
    actionUrl?: string
  ): Promise<void> {
    try {
      const notification: Omit<Notification, 'id'> = {
        type,
        priority,
        title,
        message,
        recipients,
        relatedData: relatedData || {},
        createdAt: serverTimestamp() as Timestamp,
        actionUrl,
        metadata: {}
      };

      await addDoc(collection(db, 'notifications'), notification);
    } catch (error) {
      console.error('Error creating custom notification:', error);
    }
  }

  /**
   * Get notifications for a specific user
   */
    async getUserNotifications(
      userProfile: UserProfile | null,
      limitCount: number = 20,
      unreadOnly: boolean = false
    ): Promise<Notification[]> {
      try {
        if (!userProfile || !userProfile.uid) {
          console.warn('Cannot fetch notifications: user profile is null or missing UID');
          return [];
        }

        // Query notifications where user is direct recipient
        const userIdQuery = query(
          collection(db, 'notifications'),
          where('recipients.userIds', 'array-contains', userProfile.uid),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );

        // Query notifications where user matches role
        // Note: We filter by diocese client-side because Firestore doesn't support
        // multiple array-contains in a single query
        const roleQuery = query(
          collection(db, 'notifications'),
          where('recipients.roles', 'array-contains', userProfile.role),
          orderBy('createdAt', 'desc'),
          limit(limitCount * 2) // Fetch more to account for diocese filtering
        );

        // Run both queries in parallel
        const [userIdSnap, roleSnap] = await Promise.all([
          getDocs(userIdQuery),
          getDocs(roleQuery)
        ]);

        console.log(`[Notifications] Query results - UserID: ${userIdSnap.size}, Role (${userProfile.role}): ${roleSnap.size}`);
        console.log(`[Notifications] User diocese: ${userProfile.diocese}`);

        // Merge and deduplicate notifications
        const notificationsMap = new Map<string, Notification>();
        userIdSnap.docs.forEach(doc => {
          const docData = doc.data();
          console.log(`[Notifications] UserID doc:`, doc.id, docData);
          if (typeof docData === 'object' && docData !== null) {
            const data = { id: doc.id, ...docData } as Notification;
            if (!unreadOnly || !(data.readBy?.includes(userProfile.uid))) {
              notificationsMap.set(doc.id, data);
            }
          }
        });
        roleSnap.docs.forEach(doc => {
          const docData = doc.data();
          console.log(`[Notifications] Role doc:`, doc.id, 'dioceses:', docData.recipients?.dioceses);
          if (typeof docData === 'object' && docData !== null) {
            const data = { id: doc.id, ...docData } as Notification;
            
            // Filter by diocese client-side (since Firestore doesn't support multiple array-contains)
            const dioceses = data.recipients?.dioceses;
            const isDioceseMatch = !dioceses || dioceses.length === 0 || 
                                   (userProfile.diocese && dioceses.includes(userProfile.diocese));
            
            console.log(`[Notifications] Diocese match check: dioceses=${JSON.stringify(dioceses)}, userDiocese=${userProfile.diocese}, match=${isDioceseMatch}`);
            
            // For parish users, filter notifications to only show their parish's notifications
            const userParishId = userProfile.parishId || userProfile.parish;
            const isParishUser = userProfile.role === 'parish';
            
            // Parish-specific notification types that should only show to the specific parish
            const parishSpecificTypes: NotificationType[] = [
              'church_approved',
              'church_unpublished', 
              'revision_requested',
              'heritage_review_assigned',
              'heritage_validated',
              'account_pending_approval',
              'feedback_received'
            ];
            
            // Determine if this notification should be filtered by parish
            const isParishSpecificNotification = parishSpecificTypes.includes(data.type);
            
            // Get the parish/church ID from either recipients.parishId or relatedData.churchId
            const notificationParishId = data.recipients?.parishId || data.relatedData?.churchId;
            
            // Parish filtering logic for parish users:
            // - For parish-specific notification types, MUST match user's parish (via recipients.parishId or relatedData.churchId)
            // - For general notifications (system_notification, etc.), show to all
            // - Non-parish roles see all notifications for their role/diocese
            let isParishMatch = true;
            if (isParishUser && isParishSpecificNotification) {
              // Parish secretary viewing a parish-specific notification - must match their parish
              isParishMatch = notificationParishId === userParishId;
            }
            
            if (isDioceseMatch && isParishMatch && (!unreadOnly || !(data.readBy?.includes(userProfile.uid)))) {
              notificationsMap.set(doc.id, data);
            }
          }
        });

        // Sort by createdAt descending
        const notifications = Array.from(notificationsMap.values()).sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        });

        return notifications.slice(0, limitCount);
      } catch (error: unknown) {
        const firebaseError = error as { code?: string };
        if (firebaseError?.code === 'permission-denied') {
          return [];
        }
        console.error('Error fetching user notifications:', error);
        return [];
      }
    }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        readBy: arrayUnion(userId)
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userProfile: UserProfile): Promise<void> {
    try {
      const notifications = await this.getUserNotifications(userProfile, 100, true);
      const unreadNotifications = notifications.filter(n => !n.readBy?.includes(userProfile.uid));
      
      await Promise.all(
        unreadNotifications.map(notification => 
          this.markAsRead(notification.id!, userProfile.uid)
        )
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count for user
   */
  async getUnreadCount(userProfile: UserProfile | null): Promise<number> {
    try {
      if (!userProfile) {
        return 0;
      }
      const notifications = await this.getUserNotifications(userProfile, 100, true);
      return notifications.length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Clear (delete) all notifications visible to the current user.
   * Deletes them from Firestore in batches of 500 (Firestore batch limit).
   */
  async clearAllNotifications(userProfile: UserProfile): Promise<void> {
    try {
      const notifications = await this.getUserNotifications(userProfile, 500, false);
      if (notifications.length === 0) return;

      // Firestore batched writes (max 500 per batch)
      const batchSize = 500;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = notifications.slice(i, i + batchSize);
        for (const notification of chunk) {
          if (notification.id) {
            batch.delete(doc(db, 'notifications', notification.id));
          }
        }
        await batch.commit();
      }
      
      console.log(`[NotificationService] Cleared ${notifications.length} notifications for user ${userProfile.uid}`);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      throw error;
    }
  }

  private processTemplate(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      const value = data[key];
      return typeof value === 'string' ? value : match;
    });
  }

  private determineRecipients(
    template: NotificationTemplate,
    context: Record<string, unknown>
  ): { userIds?: string[]; roles?: string[]; dioceses?: Diocese[] } {
    const recipients: { userIds?: string[]; roles?: string[]; dioceses?: Diocese[] } = {};

    // Basic role-based recipients
    if (template.recipientRules.roles) {
      recipients.roles = template.recipientRules.roles;
      // Type-safe diocese assignment
      if (context.diocese === 'tagbilaran' || context.diocese === 'talibon') {
        recipients.dioceses = [context.diocese as Diocese];
      }
    }

    // Apply conditions if any
    if (template.recipientRules.conditions) {
      // Custom logic could be applied here
    }

    return recipients;
  }

  private getActionUrl(type: NotificationType, churchId?: string): string {
    const baseUrls: Record<NotificationType, string> = {
      church_submitted: '/chancery',        // Chancery review page
      heritage_review_assigned: '/heritage', // Museum researcher page
      heritage_validated: '/chancery',       // Chancery sees validated churches
      revision_requested: '/parish',         // Parish dashboard
      church_approved: '/churches',          // Church list
      church_unpublished: '/parish',         // Parish dashboard for unpublished
      pending_update_submitted: '/chancery/dashboard?tab=updates', // Chancery updates tab
      workflow_error: '/chancery',           // Chancery handles errors
      account_pending_approval: '/parish',   // Parish staff approves from their dashboard
      chancellor_pending_approval: '/chancery', // Current chancellor approves from their dashboard
      museum_staff_pending_approval: '/heritage', // Current museum researcher approves from their dashboard
      account_approved: '/parish',           // Parish dashboard for approved users
      feedback_received: '/parish',          // Parish feedback tab
      system_notification: '/'               // Home
    };

    const baseUrl = baseUrls[type] || '/';
    return churchId ? `${baseUrl}?church=${churchId}` : baseUrl;
  }

  private isNotificationRelevantToUser(
    notification: Notification,
    userProfile: UserProfile
  ): boolean {
    const { recipients } = notification;

    // Check direct user ID match
    if (recipients.userIds?.includes(userProfile.uid)) {
      return true;
    }

    // Check role match
    if (recipients.roles?.includes(userProfile.role)) {
      // Also check diocese match if specified
      if (recipients.dioceses) {
        return recipients.dioceses.includes(userProfile.diocese);
      }
      return true;
    }

    return false;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

/**
 * Utility function to create status change notification
 */
export async function notifyChurchStatusChange(
  churchId: string,
  churchName: string,
  fromStatus: ChurchStatus,
  toStatus: ChurchStatus,
  actionBy: UserProfile,
  note?: string
): Promise<void> {
  await notificationService.notifyStatusChange(
    churchId,
    churchName,
    fromStatus,
    toStatus,
    actionBy,
    actionBy.diocese,
    note
  );
}

/**
 * Utility function to notify Chancery when a parish submits changes to an approved church.
 * This is separate from notifyChurchStatusChange because the church status does NOT change —
 * only the pendingChanges field is updated.
 */
export async function notifyPendingChangesSubmitted(
  churchId: string,
  churchName: string,
  changedFields: string[],
  actionBy: UserProfile
): Promise<void> {
  try {
    const template = notificationService['templates'].get('pending_update_submitted');
    if (!template) {
      console.warn('No template found for pending_update_submitted notification');
      return;
    }

    const title = template.titleTemplate.replace('{churchName}', churchName);
    const message = template.messageTemplate.replace('{churchName}', churchName);

    const notification: Omit<Notification, 'id'> = {
      type: 'pending_update_submitted',
      priority: template.priority,
      title,
      message,
      recipients: {
        roles: ['chancery_office'],
        dioceses: [actionBy.diocese],
      },
      relatedData: {
        churchId,
        churchName,
        actionBy: {
          uid: actionBy.uid,
          name: actionBy.name || actionBy.email,
          role: actionBy.role,
        },
      },
      createdAt: serverTimestamp() as Timestamp,
      actionUrl: '/chancery/dashboard?tab=updates',
      metadata: {
        diocese: actionBy.diocese,
        changedFields,
      },
    };

    await addDoc(collection(db, 'notifications'), notification);
    console.log(`[Notifications] Created pending_update_submitted notification for chancery_office`);
  } catch (error) {
    console.error('Error creating pending update notification:', error);
    // Don't throw — notification failure should not block the save
  }
}

/**
 * Utility function to notify parish secretary when their church is unpublished
 * Also sends a confirmation notification to the Chancery Office
 */
export async function notifyChurchUnpublished(
  churchId: string,
  churchName: string,
  reason: string,
  actionBy: UserProfile
): Promise<void> {
  try {
    const template = notificationService['templates'].get('church_unpublished');
    if (!template) {
      console.warn('No template found for church_unpublished notification');
      return;
    }

    // Replace placeholders in title and message for parish notification
    const title = template.titleTemplate.replace('{churchName}', churchName);
    const message = template.messageTemplate
      .replace('{churchName}', churchName)
      .replace('{reason}', reason);

    // 1. Create notification for Parish
    const parishNotification: Omit<Notification, 'id'> = {
      type: 'church_unpublished',
      priority: template.priority,
      title,
      message,
      recipients: {
        roles: ['parish'],
        dioceses: [actionBy.diocese],
        parishId: churchId  // Only show to the specific parish
      },
      relatedData: {
        churchId,
        churchName,
        fromStatus: 'approved',
        toStatus: 'approved', // We use 'approved' here since 'draft' is not in ChurchStatus type for notifications
        actionBy: {
          uid: actionBy.uid,
          name: actionBy.name || actionBy.email,
          role: actionBy.role
        }
      },
      createdAt: Timestamp.now(),
      isRead: false,
      readBy: [],
      actionUrl: `/parish/dashboard`,
      metadata: {
        unpublishReason: reason
      }
    };

    await addDoc(collection(db, 'notifications'), parishNotification);
    console.log(`[Notifications] Church unpublished notification sent to parish for: ${churchName}`);

    // 2. Create confirmation notification for Chancery Office
    const chanceryNotification: Omit<Notification, 'id'> = {
      type: 'system_notification',
      priority: 'medium',
      title: `Church Unpublished: ${churchName}`,
      message: `You have unpublished "${churchName}". Reason: ${reason}. The parish secretary has been notified.`,
      recipients: {
        roles: ['chancery_office'],
        dioceses: [actionBy.diocese]
      },
      relatedData: {
        churchId,
        churchName,
        fromStatus: 'approved',
        toStatus: 'approved',
        actionBy: {
          uid: actionBy.uid,
          name: actionBy.name || actionBy.email,
          role: actionBy.role
        }
      },
      createdAt: Timestamp.now(),
      isRead: false,
      readBy: [],
      actionUrl: `/churches?church=${churchId}`,
      metadata: {
        unpublishReason: reason,
        actionType: 'church_unpublished_confirmation'
      }
    };

    await addDoc(collection(db, 'notifications'), chanceryNotification);
    console.log(`[Notifications] Church unpublished confirmation sent to chancery for: ${churchName}`);
  } catch (error) {
    console.error('Error sending unpublish notification:', error);
    // Don't throw - notification failure shouldn't break the unpublish operation
  }
}

/**
 * Utility function to notify the current parish staff when a new parish staff registers.
 * The notification is sent to the current active user of that specific parish,
 * since they are the one who must approve their replacement.
 */
export async function notifyAccountPendingApproval(
  staffData: {
    name: string;
    email: string;
    position: string;
    parishName: string;
    parishId: string;
    diocese: Diocese;
    uid: string;
    currentParishStaffUid?: string; // UID of the current active parish staff
  }
): Promise<void> {
  try {
    const positionLabel = staffData.position === 'parish_priest' ? 'Parish Priest' : 'Parish Secretary';
    
    // Build recipients: target the current parish staff directly if available,
    // otherwise fall back to role-based targeting for the specific parish
    const recipients: Notification['recipients'] = staffData.currentParishStaffUid
      ? {
          userIds: [staffData.currentParishStaffUid],
          roles: ['parish'],
          dioceses: [staffData.diocese],
          parishId: staffData.parishId,
        }
      : {
          roles: ['parish'],
          dioceses: [staffData.diocese],
          parishId: staffData.parishId,
        };

    const notification: Omit<Notification, 'id'> = {
      type: 'account_pending_approval',
      priority: 'high',
      title: `New Registration Request: ${staffData.name}`,
      message: `${staffData.name} has registered as ${positionLabel} for ${staffData.parishName}. Please review and approve or reject the registration from your Staff Management tab.`,
      recipients,
      relatedData: {
        actionBy: {
          uid: staffData.uid,
          name: staffData.name,
          role: 'parish'
        }
      },
      createdAt: Timestamp.now(),
      isRead: false,
      readBy: [],
      actionUrl: '/parish?tab=staff',
      metadata: {
        staffEmail: staffData.email,
        staffPosition: staffData.position,
        parishId: staffData.parishId,
        parishName: staffData.parishName
      }
    };

    await addDoc(collection(db, 'notifications'), notification);
    console.log(`[Notifications] Parish staff pending approval notification sent to current parish user for: ${staffData.name}`);
  } catch (error) {
    console.error('Error sending account pending notification:', error);
    // Don't throw - notification failure shouldn't break the registration
  }
}

/**
 * Utility function to notify the current active chancellor when a new chancellor registers.
 * The current chancellor of that diocese is the one who approves their replacement.
 */
export async function notifyChancellorPendingApproval(
  chancellorData: {
    name: string;
    email: string;
    diocese: Diocese;
    uid: string;
    currentChancellorUid?: string; // UID of the current active chancellor
  }
): Promise<void> {
  try {
    const recipients: Notification['recipients'] = chancellorData.currentChancellorUid
      ? {
          userIds: [chancellorData.currentChancellorUid],
          roles: ['chancery_office'],
          dioceses: [chancellorData.diocese],
        }
      : {
          roles: ['chancery_office'],
          dioceses: [chancellorData.diocese],
        };

    const notification: Omit<Notification, 'id'> = {
      type: 'chancellor_pending_approval',
      priority: 'high',
      title: `New Chancellor Registration: ${chancellorData.name}`,
      message: `${chancellorData.name} has registered as a new Chancellor for the Diocese of ${chancellorData.diocese === 'tagbilaran' ? 'Tagbilaran' : 'Talibon'}. Please review and approve or reject the registration from the Chancellors tab.`,
      recipients,
      relatedData: {
        actionBy: {
          uid: chancellorData.uid,
          name: chancellorData.name,
          role: 'chancery_office'
        }
      },
      createdAt: Timestamp.now(),
      isRead: false,
      readBy: [],
      actionUrl: chancellorData.diocese === 'tagbilaran' ? '/diocese/tagbilaran?tab=chancellors' : '/diocese/talibon?tab=chancellors',
      metadata: {
        chancellorEmail: chancellorData.email,
        diocese: chancellorData.diocese
      }
    };

    await addDoc(collection(db, 'notifications'), notification);
    console.log(`[Notifications] Chancellor pending approval notification sent for: ${chancellorData.name}`);
  } catch (error) {
    console.error('Error sending chancellor pending notification:', error);
    // Don't throw - notification failure shouldn't break the registration
  }
}

/**
 * Utility function to notify the current active museum researcher when a new museum staff registers.
 * The current museum researcher is the one who approves their replacement.
 */
export async function notifyMuseumStaffPendingApproval(
  staffData: {
    name: string;
    email: string;
    uid: string;
    currentMuseumStaffUid?: string; // UID of the current active museum researcher
  }
): Promise<void> {
  try {
    const recipients: Notification['recipients'] = staffData.currentMuseumStaffUid
      ? {
          userIds: [staffData.currentMuseumStaffUid],
          roles: ['museum_researcher'],
        }
      : {
          roles: ['museum_researcher'],
        };

    const notification: Omit<Notification, 'id'> = {
      type: 'museum_staff_pending_approval',
      priority: 'high',
      title: `New Museum Staff Registration: ${staffData.name}`,
      message: `${staffData.name} has registered as a new Museum Staff. Please review and approve or reject the registration from your Staff Management tab.`,
      recipients,
      relatedData: {
        actionBy: {
          uid: staffData.uid,
          name: staffData.name,
          role: 'museum_researcher'
        }
      },
      createdAt: Timestamp.now(),
      isRead: false,
      readBy: [],
      actionUrl: '/heritage?tab=staff',
      metadata: {
        staffEmail: staffData.email
      }
    };

    await addDoc(collection(db, 'notifications'), notification);
    console.log(`[Notifications] Museum staff pending approval notification sent for: ${staffData.name}`);
  } catch (error) {
    console.error('Error sending museum staff pending notification:', error);
    // Don't throw - notification failure shouldn't break the registration
  }
}

/**
 * Utility function to notify a user when their account is approved
 */
export async function notifyAccountApproved(
  approvedUser: {
    uid: string;
    name: string;
    email: string;
    parishName: string;
    diocese: Diocese;
  },
  approvedBy: {
    uid: string;
    name: string;
    role: string;
  }
): Promise<void> {
  try {
    const notification: Omit<Notification, 'id'> = {
      type: 'account_approved',
      priority: 'high',
      title: 'Account Activated',
      message: `Your account has been approved! You can now access the Parish Dashboard and manage your church profile for ${approvedUser.parishName}.`,
      recipients: {
        userIds: [approvedUser.uid],
        roles: ['parish'],
        dioceses: [approvedUser.diocese]
      },
      relatedData: {
        actionBy: {
          uid: approvedBy.uid,
          name: approvedBy.name,
          role: approvedBy.role
        }
      },
      createdAt: Timestamp.now(),
      isRead: false,
      readBy: [],
      actionUrl: '/parish',
      metadata: {
        approvedByName: approvedBy.name,
        parishName: approvedUser.parishName
      }
    };

    await addDoc(collection(db, 'notifications'), notification);
    console.log(`[Notifications] Account approved notification sent to: ${approvedUser.email}`);
  } catch (error) {
    console.error('Error sending account approved notification:', error);
    // Don't throw - notification failure shouldn't break the approval
  }
}

/**
 * Utility function to notify parish secretary when visitor feedback is received
 */
export async function notifyFeedbackReceived(
  feedbackData: {
    churchId: string;
    churchName: string;
    parishId: string;
    diocese: Diocese;
    rating: number;
    reviewerName?: string;
  }
): Promise<void> {
  try {
    const ratingText = feedbackData.rating === 1 ? '1 star' : `${feedbackData.rating} stars`;
    
    const notification: Omit<Notification, 'id'> = {
      type: 'feedback_received',
      priority: 'medium',
      title: `New Visitor Feedback: ${feedbackData.churchName}`,
      message: `A visitor has left a ${ratingText} review for ${feedbackData.churchName}. Check the feedback section to view details.`,
      recipients: {
        roles: ['parish'],
        dioceses: [feedbackData.diocese],
        parishId: feedbackData.parishId
      },
      relatedData: {
        churchId: feedbackData.churchId,
        churchName: feedbackData.churchName
      },
      createdAt: Timestamp.now(),
      isRead: false,
      readBy: [],
      actionUrl: '/parish?tab=feedback',
      metadata: {
        rating: feedbackData.rating,
        reviewerName: feedbackData.reviewerName || 'Anonymous Visitor'
      }
    };

    await addDoc(collection(db, 'notifications'), notification);
    console.log(`[Notifications] Feedback received notification sent for church: ${feedbackData.churchName}`);
  } catch (error) {
    console.error('Error sending feedback notification:', error);
    // Don't throw - notification failure shouldn't break the feedback submission
  }
}