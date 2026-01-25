import { db } from '@/lib/firebase';
import { addDoc, collection, query, where, orderBy, getDocs, updateDoc, doc, serverTimestamp, Timestamp, limit } from 'firebase/firestore';
import type { ChurchStatus } from '@/lib/churches';
import type { UserProfile, Diocese } from '@/contexts/AuthContext';

export type NotificationType =
  | 'church_submitted'           // Parish submitted church for review → Chancery
  | 'heritage_review_assigned'   // Chancery forwarded to museum → Museum Researcher
  | 'heritage_validated'         // Museum validated heritage church → Chancery
  | 'revision_requested'         // Chancery/Museum requested revisions → Parish
  | 'church_approved'            // Church is now published → Parish
  | 'church_unpublished'         // Church was unpublished by Chancery → Parish
  | 'workflow_error'             // System error → Chancery
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
    messageTemplate: 'Museum Researcher has validated "{churchName}" as a heritage site. The church has been approved and published.',
    priority: 'medium',
    recipientRules: {
      roles: ['chancery_office']
    }
  },

  // Revision Requested → Parish Secretary
  {
    type: 'revision_requested',
    titleTemplate: 'Revision Requested: {churchName}',
    messageTemplate: 'Your church profile "{churchName}" requires revisions. Please check the feedback and resubmit for approval.',
    priority: 'high',
    recipientRules: {
      roles: ['parish_secretary']
    }
  },

  // Church Approved/Published → Parish Secretary
  {
    type: 'church_approved',
    titleTemplate: 'Church Published: {churchName}',
    messageTemplate: 'Congratulations! "{churchName}" has been approved and is now live for public viewing in the VISITA app.',
    priority: 'medium',
    recipientRules: {
      roles: ['parish_secretary']
    }
  },

  // Church Unpublished → Parish Secretary
  {
    type: 'church_unpublished',
    titleTemplate: 'Church Unpublished: {churchName}',
    messageTemplate: '"{churchName}" has been unpublished by the Chancery Office. Reason: {reason}. You can republish it later by submitting for review again.',
    priority: 'high',
    recipientRules: {
      roles: ['parish_secretary']
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
      // Trigger on: draft→pending, draft→under_review, pending→under_review, or when explicitly set to under_review
      const isSubmissionForReview = 
        (fromStatus === 'pending' && toStatus === 'under_review') ||
        (fromStatus === 'draft' && (toStatus === 'pending' || toStatus === 'under_review')) ||
        (toStatus === 'under_review' && fromStatus !== 'heritage_review' && fromStatus !== 'approved');
      
      console.log(`[Notifications] isSubmissionForReview: ${isSubmissionForReview}`);
      
      if (isSubmissionForReview) {
        notifications.push({ type: 'church_submitted', roles: ['chancery_office'] });
      } else if (toStatus === 'heritage_review') {
        // Chancery forwarded to museum → Notify Museum Researcher
        notifications.push({ type: 'heritage_review_assigned', roles: ['museum_researcher'] });
      } else if (fromStatus === 'heritage_review' && toStatus === 'approved') {
        // Museum validated heritage church → Notify Chancery and Parish
        notifications.push({ type: 'heritage_validated', roles: ['chancery_office'] });
        notifications.push({ type: 'church_approved', roles: ['parish_secretary'] });
      } else if (toStatus === 'approved' && (fromStatus === 'under_review' || fromStatus === 'pending')) {
        // Chancery approved church (from pending or under_review) → Notify Parish
        notifications.push({ type: 'church_approved', roles: ['parish_secretary'] });
      } else if (toStatus === 'pending' && fromStatus !== 'draft') {
        // Revision requested (sent back to pending from approved/under_review) → Notify Parish
        // Note: We exclude draft→pending since that's a submission, not a revision request
        notifications.push({ type: 'revision_requested', roles: ['parish_secretary'] });
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

        const notification: Omit<Notification, 'id'> = {
          type: notif.type,
          priority: template.priority,
          title: this.processTemplate(template.titleTemplate, notificationData),
          message: this.processTemplate(template.messageTemplate, notificationData),
          recipients: {
            roles: notif.roles,
            dioceses: [diocese]
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

        // Merge and deduplicate notifications
        const notificationsMap = new Map<string, Notification>();
        userIdSnap.docs.forEach(doc => {
          const docData = doc.data();
          if (typeof docData === 'object' && docData !== null) {
            const data = { id: doc.id, ...docData } as Notification;
            if (!unreadOnly || !(data.readBy?.includes(userProfile.uid))) {
              notificationsMap.set(doc.id, data);
            }
          }
        });
        roleSnap.docs.forEach(doc => {
          const docData = doc.data();
          if (typeof docData === 'object' && docData !== null) {
            const data = { id: doc.id, ...docData } as Notification;
            
            // Filter by diocese client-side (since Firestore doesn't support multiple array-contains)
            const dioceses = data.recipients?.dioceses;
            const isDioceseMatch = !dioceses || dioceses.length === 0 || 
                                   (userProfile.diocese && dioceses.includes(userProfile.diocese));
            
            if (isDioceseMatch && (!unreadOnly || !(data.readBy?.includes(userProfile.uid)))) {
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
        readBy: [userId] // In a real implementation, this would append to array
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
      workflow_error: '/chancery',           // Chancery handles errors
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

    // 1. Create notification for Parish Secretary
    const parishNotification: Omit<Notification, 'id'> = {
      type: 'church_unpublished',
      priority: template.priority,
      title,
      message,
      recipients: {
        roles: ['parish_secretary'],
        dioceses: [actionBy.diocese]
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