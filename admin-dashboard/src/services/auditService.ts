/**
 * FILE PURPOSE: Audit Logging Service for Chancellor Term-Based Tracking
 *
 * This service provides centralized audit logging for all actions performed
 * in the admin dashboard. It ensures accountability by tracking:
 * - WHO performed the action (with chancellor term context)
 * - WHAT action was performed
 * - WHEN the action occurred
 * - WHAT changed (for update operations)
 *
 * KEY FEATURES:
 * - Immutable audit logs (no updates or deletes)
 * - Chancellor term context in every log entry
 * - Query capabilities for audit reviews
 * - Term statistics generation
 *
 * USAGE:
 * ```typescript
 * import { AuditService } from '@/services/auditService';
 * 
 * // Log an action
 * await AuditService.logAction(userProfile, 'church.approve', 'church', churchId, {
 *   resourceName: church.name,
 *   changes: [{ field: 'status', oldValue: 'pending', newValue: 'approved' }]
 * });
 * 
 * // Query logs
 * const logs = await AuditService.getLogsByDiocese('tagbilaran', { limit: 50 });
 * ```
 */

import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
  limit as firestoreLimit,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile, Diocese } from '@/contexts/AuthContext';
import type {
  AuditAction,
  AuditLog,
  AuditLogInput,
  AuditActor,
  ResourceType,
  FieldChange,
  AuditLogQueryOptions,
  TermStats,
  AuditLogSummary,
} from '@/types/audit';

// Firestore collection name
const AUDIT_LOGS_COLLECTION = 'audit_logs';

/**
 * Audit Logging Service
 * 
 * Provides methods to log and query audit events for the VISITA system.
 * All methods are static - no instantiation required.
 */
export class AuditService {
  // ============================================================================
  // LOGGING METHODS
  // ============================================================================

  /**
   * Log an action with full actor and context information.
   * This is the primary method for creating audit log entries.
   *
   * @param actor - The user performing the action
   * @param action - The type of action being performed
   * @param resourceType - The category of resource being affected
   * @param resourceId - The ID of the affected resource
   * @param options - Additional context (resource name, changes, metadata)
   * @returns The ID of the created audit log document
   *
   * @example
   * ```typescript
   * await AuditService.logAction(
   *   userProfile,
   *   'church.approve',
   *   'church',
   *   'church-123',
   *   {
   *     resourceName: 'San Isidro Labrador Parish',
   *     changes: [{ field: 'status', oldValue: 'pending', newValue: 'approved' }],
   *     metadata: { reviewNotes: 'All requirements met' }
   *   }
   * );
   * ```
   */
  static async logAction(
    actor: UserProfile,
    action: AuditAction,
    resourceType: ResourceType,
    resourceId: string,
    options?: {
      resourceName?: string;
      changes?: FieldChange[];
      metadata?: Record<string, unknown>;
      parishId?: string;
      sessionId?: string;
    }
  ): Promise<string> {
    try {
      // Build actor information with term context for chancellors
      const auditActor: AuditActor = {
        uid: actor.uid,
        email: actor.email,
        name: actor.name,
        role: actor.role,
        diocese: actor.diocese,
      };

      // Add term start date for chancellor accounts (for historical context)
      // This is accessed from extended profile if available
      const extendedActor = actor as UserProfile & { term?: { startDate: Timestamp } };
      if (actor.role === 'chancery_office' && extendedActor.term?.startDate) {
        auditActor.termStartDate = extendedActor.term.startDate;
      }

      // Build the audit log entry
      const logEntry: Omit<AuditLog, 'id'> = {
        actor: auditActor,
        action,
        resourceType,
        resourceId,
        resourceName: options?.resourceName,
        changes: options?.changes,
        diocese: actor.diocese,
        parishId: options?.parishId,
        metadata: options?.metadata,
        timestamp: serverTimestamp() as Timestamp,
        sessionId: options?.sessionId,
      };

      // Remove undefined values to keep Firestore documents clean
      const cleanedEntry = this.removeUndefinedValues(logEntry);

      // Add to Firestore
      const docRef = await addDoc(collection(db, AUDIT_LOGS_COLLECTION), cleanedEntry);

      console.log(
        `[Audit] ${action} on ${resourceType}/${resourceId} by ${actor.email} (${docRef.id})`
      );

      return docRef.id;
    } catch (error) {
      // Log error but don't throw - audit logging should not break main operations
      console.error('[Audit] Failed to log action:', error, {
        action,
        resourceType,
        resourceId,
        actorEmail: actor.email,
      });
      
      // Return empty string to indicate failure without breaking caller
      return '';
    }
  }

  /**
   * Log a login event
   */
  static async logLogin(actor: UserProfile): Promise<string> {
    return this.logAction(actor, 'auth.login', 'system', actor.uid, {
      resourceName: actor.name,
      metadata: {
        loginTime: new Date().toISOString(),
      },
    });
  }

  /**
   * Log a logout event
   */
  static async logLogout(actor: UserProfile): Promise<string> {
    return this.logAction(actor, 'auth.logout', 'system', actor.uid, {
      resourceName: actor.name,
    });
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Get audit logs for a specific diocese.
   * Used by Chancery dashboard to view activity in their diocese.
   *
   * @param diocese - The diocese to query
   * @param options - Query options (limit, filters, date range)
   * @returns Array of audit log entries
   */
  static async getLogsByDiocese(
    diocese: Diocese,
    options?: AuditLogQueryOptions
  ): Promise<AuditLog[]> {
    const constraints: QueryConstraint[] = [
      where('diocese', '==', diocese),
      orderBy('timestamp', 'desc'),
    ];

    if (options?.actorUid) {
      constraints.push(where('actor.uid', '==', options.actorUid));
    }

    if (options?.resourceType) {
      constraints.push(where('resourceType', '==', options.resourceType));
    }

    if (options?.action) {
      constraints.push(where('action', '==', options.action));
    }

    if (options?.limit) {
      constraints.push(firestoreLimit(options.limit));
    }

    const q = query(collection(db, AUDIT_LOGS_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as AuditLog[];
  }

  /**
   * Get audit logs for a specific resource (e.g., church history).
   * Shows all actions ever performed on a particular resource.
   *
   * @param resourceType - The type of resource
   * @param resourceId - The ID of the resource
   * @returns Array of audit log entries ordered by timestamp desc
   */
  static async getResourceHistory(
    resourceType: ResourceType,
    resourceId: string
  ): Promise<AuditLog[]> {
    const q = query(
      collection(db, AUDIT_LOGS_COLLECTION),
      where('resourceType', '==', resourceType),
      where('resourceId', '==', resourceId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as AuditLog[];
  }

  /**
   * Get all actions performed by a specific user.
   * Used for viewing a chancellor's activity during their term.
   *
   * @param actorUid - The UID of the user
   * @param options - Query options
   * @returns Array of audit log entries
   */
  static async getActorHistory(
    actorUid: string,
    options?: { limit?: number; resourceType?: ResourceType }
  ): Promise<AuditLog[]> {
    const constraints: QueryConstraint[] = [
      where('actor.uid', '==', actorUid),
      orderBy('timestamp', 'desc'),
    ];

    if (options?.resourceType) {
      constraints.push(where('resourceType', '==', options.resourceType));
    }

    if (options?.limit) {
      constraints.push(firestoreLimit(options.limit));
    }

    const q = query(collection(db, AUDIT_LOGS_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as AuditLog[];
  }

  /**
   * Get recent actions across the system (for dashboard overview).
   *
   * @param diocese - Optional diocese filter
   * @param limit - Number of records to return (default 20)
   * @returns Array of recent audit log entries
   */
  static async getRecentActions(
    diocese?: Diocese,
    limit: number = 20
  ): Promise<AuditLog[]> {
    const constraints: QueryConstraint[] = [
      orderBy('timestamp', 'desc'),
      firestoreLimit(limit),
    ];

    if (diocese) {
      constraints.unshift(where('diocese', '==', diocese));
    }

    const q = query(collection(db, AUDIT_LOGS_COLLECTION), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as AuditLog[];
  }

  // ============================================================================
  // STATISTICS METHODS
  // ============================================================================

  /**
   * Generate term statistics for a chancellor.
   * Called when archiving a chancellor's account to summarize their term.
   *
   * @param chancellorUid - The UID of the chancellor
   * @returns Statistics summary for the term
   */
  static async getTermStats(chancellorUid: string): Promise<TermStats> {
    const logs = await this.getActorHistory(chancellorUid);

    const stats: TermStats = {
      totalActions: logs.length,
      churchesApproved: logs.filter((l) => l.action === 'church.approve').length,
      churchesRejected: logs.filter((l) => l.action === 'church.reject').length,
      usersCreated: logs.filter((l) => l.action === 'user.create').length,
      usersDeactivated: logs.filter((l) => l.action === 'user.deactivate').length,
      announcementsCreated: logs.filter((l) => l.action === 'announcement.create').length,
      feedbackModerated: logs.filter(
        (l) =>
          l.action === 'feedback.respond' ||
          l.action === 'feedback.approve' ||
          l.action === 'feedback.hide' ||
          l.action === 'feedback.delete'
      ).length,
      lastActionDate: logs.length > 0 ? logs[0].timestamp : null,
    };

    return stats;
  }

  /**
   * Generate a summary of audit logs for a diocese.
   * Useful for reports and analytics.
   *
   * @param diocese - The diocese to summarize
   * @param options - Date range options
   * @returns Summary statistics
   */
  static async getDioceseSummary(
    diocese: Diocese,
    options?: { startDate?: Date; endDate?: Date }
  ): Promise<AuditLogSummary> {
    const logs = await this.getLogsByDiocese(diocese, {
      limit: 1000, // Get up to 1000 for summary
    });

    // Filter by date range if provided
    let filteredLogs = logs;
    if (options?.startDate || options?.endDate) {
      filteredLogs = logs.filter((log) => {
        const logDate = log.timestamp.toDate();
        if (options.startDate && logDate < options.startDate) return false;
        if (options.endDate && logDate > options.endDate) return false;
        return true;
      });
    }

    // Calculate summary
    const byAction: Record<string, number> = {};
    const byResourceType: Record<string, number> = {};
    const byActor: Record<string, number> = {};

    for (const log of filteredLogs) {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      byResourceType[log.resourceType] = (byResourceType[log.resourceType] || 0) + 1;
      byActor[log.actor.uid] = (byActor[log.actor.uid] || 0) + 1;
    }

    return {
      totalLogs: filteredLogs.length,
      byAction: byAction as Record<AuditAction, number>,
      byResourceType: byResourceType as Record<ResourceType, number>,
      byActor,
      dateRange: {
        earliest: filteredLogs.length > 0 
          ? filteredLogs[filteredLogs.length - 1].timestamp 
          : null,
        latest: filteredLogs.length > 0 
          ? filteredLogs[0].timestamp 
          : null,
      },
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Remove undefined values from an object (for clean Firestore documents)
   */
  private static removeUndefinedValues<T extends Record<string, unknown>>(
    obj: T
  ): Partial<T> {
    const result: Partial<T> = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        result[key] = obj[key];
      }
    }
    return result;
  }

  /**
   * Generate a session ID for grouping related actions.
   * Call this at the start of a multi-step operation.
   */
  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Format an audit log for display (human-readable)
   */
  static formatLogForDisplay(log: AuditLog): {
    title: string;
    description: string;
    timestamp: string;
  } {
    const actionLabels: Record<string, string> = {
      'auth.login': 'logged in',
      'auth.logout': 'logged out',
      'church.approve': 'approved church',
      'church.reject': 'rejected church',
      'church.create': 'created church',
      'church.update': 'updated church',
      'user.create': 'created user account',
      'user.deactivate': 'deactivated user account',
      'announcement.create': 'created announcement',
      'chancellor.approve': 'approved chancellor registration',
      'chancellor.archive': 'archived chancellor account',
    };

    const actionLabel = actionLabels[log.action] || log.action.replace('.', ' ');
    const title = `${log.actor.name} ${actionLabel}`;
    const description = log.resourceName
      ? `${log.resourceName}`
      : `ID: ${log.resourceId}`;
    const timestamp = log.timestamp.toDate().toLocaleString();

    return { title, description, timestamp };
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS FOR COMMON OPERATIONS
// ============================================================================

/**
 * Create a field change record for audit logging
 */
export function createFieldChange(
  field: string,
  oldValue: unknown,
  newValue: unknown
): FieldChange {
  return { field, oldValue, newValue };
}

/**
 * Create multiple field changes by comparing two objects
 */
export function diffObjects(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  fieldsToTrack?: string[]
): FieldChange[] {
  const changes: FieldChange[] = [];
  const fields = fieldsToTrack || Object.keys({ ...oldObj, ...newObj });

  for (const field of fields) {
    const oldValue = oldObj[field];
    const newValue = newObj[field];

    // Simple comparison (works for primitives, may need enhancement for objects)
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({ field, oldValue, newValue });
    }
  }

  return changes;
}
