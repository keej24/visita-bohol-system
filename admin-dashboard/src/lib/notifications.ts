import { db } from '@/lib/firebase';
import { addDoc, collection, query, where, orderBy, getDocs, updateDoc, doc, serverTimestamp, Timestamp, limit } from 'firebase/firestore';
import type { ChurchStatus } from '@/lib/churches';
import type { UserProfile, Diocese } from '@/contexts/AuthContext';

export type NotificationType =
  | 'status_change'
  | 'heritage_review_assigned'
  | 'revision_requested'
  | 'church_approved'
  | 'workflow_error'
  | 'system_notification';

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
 * Notification Templates for Different Status Changes
 */
const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  // Status Change Notifications
  {
    type: 'status_change',
    titleTemplate: 'Church Status Updated: {churchName}',
    messageTemplate: 'Church "{churchName}" status changed from {fromStatus} to {toStatus} by {actionBy}',
    priority: 'medium',
    recipientRules: {
      roles: ['chancery_office', 'museum_researcher']
    }
  },

  // Heritage Review Assignment
  {
    type: 'heritage_review_assigned',
    titleTemplate: 'Heritage Review Required: {churchName}',
    messageTemplate: 'Church "{churchName}" has been assigned for heritage validation. Please review the cultural and historical significance.',
    priority: 'high',
    recipientRules: {
      roles: ['museum_researcher']
    }
  },

  // Revision Requests
  {
    type: 'revision_requested',
    titleTemplate: 'Revision Requested: {churchName}',
    messageTemplate: 'Your church profile "{churchName}" requires revisions. Please check the feedback and resubmit.',
    priority: 'high',
    recipientRules: {
      roles: ['parish_secretary']
    }
  },

  // Church Approval
  {
    type: 'church_approved',
    titleTemplate: 'Church Approved: {churchName}',
    messageTemplate: 'Congratulations! Church "{churchName}" has been approved and is now live for public viewing.',
    priority: 'medium',
    recipientRules: {
      roles: ['parish_secretary']
    }
  },

  // Workflow Errors
  {
    type: 'workflow_error',
    titleTemplate: 'Workflow Issue: {churchName}',
    messageTemplate: 'An issue occurred while processing church "{churchName}". Manual intervention may be required.',
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
   * Create and send a notification for status change
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
      // Determine notification type based on status change
      let notificationType: NotificationType = 'status_change';

      if (toStatus === 'heritage_review') {
        notificationType = 'heritage_review_assigned';
      } else if (toStatus === 'needs_revision') {
        notificationType = 'revision_requested';
      } else if (toStatus === 'approved') {
        notificationType = 'church_approved';
      }

      const template = this.templates.get(notificationType);
      if (!template) {
        console.warn(`No template found for notification type: ${notificationType}`);
        return;
      }

      // Build notification data
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
        type: notificationType,
        priority: template.priority,
        title: this.processTemplate(template.titleTemplate, notificationData),
        message: this.processTemplate(template.messageTemplate, notificationData),
        recipients: this.determineRecipients(template, notificationData),
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
        actionUrl: this.getActionUrl(notificationType, churchId),
        metadata: {
          diocese,
          note
        }
      };

      // Save to Firestore
      await addDoc(collection(db, 'notifications'), notification);

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
    userProfile: UserProfile,
    limitCount: number = 20,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    try {
      let q = query(
        collection(db, 'notifications'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (unreadOnly) {
        q = query(
          q,
          where('readBy', 'not-in', [userProfile.uid])
        );
      }

      const snapshot = await getDocs(q);
      const notifications: Notification[] = [];

      snapshot.docs.forEach(doc => {
        const data = { id: doc.id, ...doc.data() } as Notification;

        // Check if notification is relevant to user
        if (this.isNotificationRelevantToUser(data, userProfile)) {
          notifications.push(data);
        }
      });

      return notifications;
    } catch (error) {
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
   * Get unread notification count for user
   */
  async getUnreadCount(userProfile: UserProfile): Promise<number> {
    try {
      const notifications = await this.getUserNotifications(userProfile, 100, true);
      return notifications.length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  private processTemplate(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] || match;
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
      recipients.dioceses = [context.diocese]; // Limit to relevant diocese
    }

    // Apply conditions if any
    if (template.recipientRules.conditions) {
      // Custom logic could be applied here
    }

    return recipients;
  }

  private getActionUrl(type: NotificationType, churchId?: string): string {
    const baseUrls = {
      heritage_review_assigned: '/heritage',
      revision_requested: '/parish',
      church_approved: '/churches',
      status_change: '/churches',
      workflow_error: '/churches',
      system_notification: '/'
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