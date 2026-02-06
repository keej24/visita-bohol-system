/**
 * FILE PURPOSE: Audit Log Type Definitions for Chancellor Term-Based Tracking
 *
 * This file defines all types related to the audit logging system, which tracks
 * all actions performed in the admin dashboard for accountability and transparency.
 *
 * KEY FEATURES:
 * - Chancellor term tracking: Each chancellor has a unique account per term
 * - Immutable audit logs: All actions are recorded and cannot be modified
 * - Resource history: Track all changes to churches, users, announcements, etc.
 * - Term statistics: Summarize actions during a chancellor's term
 *
 * INTEGRATION POINTS:
 * - Used by AuditService for logging actions
 * - Used by ChancellorService for term management
 * - Used by AuditLogViewer for displaying history
 */

import type { Timestamp } from 'firebase/firestore';
import type { Diocese, UserRole } from '@/contexts/AuthContext';

// ============================================================================
// AUDIT ACTION TYPES
// ============================================================================

/**
 * All possible actions that can be audited in the system.
 * Grouped by category for clarity.
 */
export type AuditAction =
  // Authentication actions
  | 'auth.login'
  | 'auth.logout'
  | 'auth.password_change'
  | 'auth.password_reset_request'
  
  // Chancellor account lifecycle
  | 'chancellor.register'          // New chancellor registered (pending approval)
  | 'chancellor.approve'           // Chancellor registration approved
  | 'chancellor.reject'            // Chancellor registration rejected
  | 'chancellor.archive'           // Term ended, account archived
  | 'chancellor.term_end'          // Manual term end by administrator
  | 'chancellor.handover'          // Explicit handover to successor
  | 'chancellor.suspend'           // Account temporarily suspended
  | 'chancellor.reactivate'        // Suspended account reactivated
  
  // Parish staff account lifecycle
  | 'parish_staff.register'        // New parish staff registered (pending approval)
  | 'parish_staff.approve'         // Parish staff registration approved
  | 'parish_staff.reject'          // Parish staff registration rejected
  | 'parish_staff.archive'         // Term ended, account archived
  | 'parish_staff.term_end'        // Manual term end by chancellor
  | 'parish_staff.suspend'         // Account temporarily suspended
  | 'parish_staff.reactivate'      // Suspended account reactivated
  
  // Museum staff account lifecycle
  | 'museum_staff.register'        // New museum researcher registered (pending approval)
  | 'museum_staff.approve'         // Museum researcher registration approved
  | 'museum_staff.reject'          // Museum researcher registration rejected
  | 'museum_staff.archive'         // Term ended, account archived
  | 'museum_staff.term_end'        // Manual term end
  | 'museum_staff.suspend'         // Account temporarily suspended
  | 'museum_staff.reactivate'      // Suspended account reactivated
  
  // User management actions
  | 'user.create'                  // Parish secretary account created
  | 'user.update'                  // User profile updated
  | 'user.deactivate'              // Account deactivated
  | 'user.reactivate'              // Account reactivated
  | 'user.delete'                  // Account marked as deleted
  | 'user.password_reset'          // Password reset email sent
  
  // Church management actions
  | 'church.create'                // New church submitted
  | 'church.update'                // Church information updated
  | 'church.submit'                // Church submitted for review
  | 'church.approve'               // Church approved and published
  | 'church.reject'                // Church submission rejected
  | 'church.request_revision'      // Revision requested from parish
  | 'church.unpublish'             // Published church unpublished
  | 'church.republish'             // Unpublished church republished
  | 'church.forward_heritage'      // Forwarded to Museum for heritage review
  | 'church.heritage_validate'     // Museum validated heritage status
  | 'church.heritage_reject'       // Museum rejected heritage status
  | 'church.delete'                // Church soft deleted
  
  // Announcement management actions
  | 'announcement.create'          // Announcement created
  | 'announcement.update'          // Announcement updated
  | 'announcement.publish'         // Announcement published
  | 'announcement.archive'         // Announcement archived
  | 'announcement.unarchive'       // Announcement restored from archive
  | 'announcement.delete'          // Announcement deleted
  
  // Feedback moderation actions
  | 'feedback.respond'             // Response added to feedback
  | 'feedback.approve'             // Feedback approved for display
  | 'feedback.reject'              // Feedback rejected (pre-moderation)
  | 'feedback.hide'                // Feedback hidden from public
  | 'feedback.unhide'              // Feedback restored from hidden
  | 'feedback.delete'              // Feedback deleted
  
  // Heritage management actions
  | 'heritage.validate'            // Heritage status validated
  | 'heritage.update_classification' // Heritage classification updated
  | 'heritage.add_document'        // Heritage document added
  | 'heritage.update'              // Heritage information updated (draft save)
  | 'heritage.approve'             // Heritage church approved by Museum Researcher
  | 'heritage.reclassify'          // Heritage classification changed (e.g., to non-heritage)
  
  // System actions
  | 'system.config_update'         // System configuration changed
  | 'system.maintenance'           // System maintenance action
  | 'church.import_apply';         // Church import fields applied

/**
 * Categories of resources that can be audited
 */
export type ResourceType =
  | 'user'
  | 'church'
  | 'announcement'
  | 'feedback'
  | 'heritage'
  | 'invite'
  | 'system'
  | 'import_session';

// ============================================================================
// AUDIT LOG INTERFACES
// ============================================================================

/**
 * Information about the user who performed an action
 */
export interface AuditActor {
  uid: string;                     // Firebase Auth UID
  email: string;                   // Email address
  name: string;                    // Display name
  role: UserRole;                  // Role at time of action
  diocese: Diocese;                // Diocese at time of action
  termStartDate?: Timestamp;       // For chancellors: when their term started
}

/**
 * Record of a specific field change
 */
export interface FieldChange {
  field: string;                   // Field name that changed
  oldValue: unknown;               // Previous value
  newValue: unknown;               // New value
}

/**
 * Complete audit log entry
 */
export interface AuditLog {
  id: string;                      // Document ID
  
  // WHO
  actor: AuditActor;               // User who performed the action
  
  // WHAT
  action: AuditAction;             // Type of action performed
  resourceType: ResourceType;      // Category of resource affected
  resourceId: string;              // ID of the affected resource
  resourceName?: string;           // Human-readable name (e.g., church name)
  
  // CHANGES
  changes?: FieldChange[];         // Specific field changes (for updates)
  
  // CONTEXT
  diocese: Diocese;                // Diocese where action occurred
  parishId?: string;               // Parish ID if applicable
  metadata?: Record<string, unknown>; // Additional context data
  
  // WHEN
  timestamp: Timestamp;            // When the action occurred
  sessionId?: string;              // Group related actions in same session
  
  // INTEGRITY
  checksum?: string;               // Hash for tamper detection (optional)
}

/**
 * Input for creating a new audit log entry
 * (without auto-generated fields like id and timestamp)
 */
export interface AuditLogInput {
  actor: AuditActor;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  resourceName?: string;
  changes?: FieldChange[];
  diocese: Diocese;
  parishId?: string;
  metadata?: Record<string, unknown>;
  sessionId?: string;
}

// ============================================================================
// CHANCELLOR TERM INTERFACES
// ============================================================================

/**
 * Account status for chancellor accounts
 */
export type ChancellorAccountStatus =
  | 'pending'      // Registered, awaiting approval from current chancellor
  | 'active'       // Currently active chancellor
  | 'ended'        // Term ended, account archived (read-only)
  | 'suspended';   // Temporarily suspended (can be reactivated)

/**
 * Chancellor term information
 */
export interface ChancellorTerm {
  startDate: Timestamp;            // When the term officially started
  endDate?: Timestamp;             // When the term ended (null if active)
  position: string;                // "Chancellor", "Vice-Chancellor", etc.
  termNumber?: number;             // Optional: sequential term number
}

/**
 * Statistics summary for a chancellor's term
 */
export interface TermStats {
  totalActions: number;            // Total audit log entries
  churchesApproved: number;        // Churches approved during term
  churchesRejected: number;        // Churches rejected during term
  usersCreated: number;            // User accounts created
  usersDeactivated: number;        // User accounts deactivated
  announcementsCreated: number;    // Announcements created
  feedbackModerated: number;       // Feedback items moderated
  lastActionDate: Timestamp | null; // Date of last action
}

/**
 * Extended user profile for chancellor accounts
 */
export interface ChancellorProfile {
  // Base user fields
  uid: string;
  email: string;
  name: string;
  role: 'chancery_office';
  diocese: Diocese;
  status: ChancellorAccountStatus;
  createdAt: Timestamp;
  lastLoginAt?: Timestamp;
  
  // Chancellor-specific fields
  accountType: 'chancellor' | 'system';  // Distinguish from hardcoded system accounts
  term: ChancellorTerm;
  
  // Approval tracking
  approvedBy?: string;             // UID of chancellor who approved
  approvedAt?: Timestamp;
  
  // Rejection tracking
  rejectedBy?: string;
  rejectedAt?: Timestamp;
  rejectionReason?: string;
  
  // Archival tracking
  archivedBy?: string;             // UID of user who archived
  archivedAt?: Timestamp;
  archiveReason?: string;          // "Term ended", "Resigned", etc.
  
  // Successor/predecessor links
  successorId?: string;            // UID of the next chancellor
  predecessorId?: string;          // UID of the previous chancellor
  
  // Term statistics (populated on archival)
  termStats?: TermStats;
}

/**
 * Historical record of a chancellor term (denormalized for queries)
 */
export interface ChancellorTermHistory {
  id: string;                      // Same as chancellor's UID
  diocese: Diocese;
  chancellorName: string;
  email: string;
  position: string;
  
  // Term dates
  termStart: Timestamp;
  termEnd?: Timestamp;
  
  // Status
  status: 'active' | 'ended';
  
  // Statistics
  actionCount: number;
  
  // Links
  predecessorId?: string;
  successorId?: string;
}

// ============================================================================
// QUERY AND FILTER TYPES
// ============================================================================

/**
 * Options for querying audit logs
 */
export interface AuditLogQueryOptions {
  diocese?: Diocese;               // Filter by diocese
  actorUid?: string;               // Filter by specific user
  resourceType?: ResourceType;     // Filter by resource type
  action?: AuditAction;            // Filter by specific action
  resourceId?: string;             // Filter by specific resource
  startDate?: Date;                // Filter from date
  endDate?: Date;                  // Filter to date
  limit?: number;                  // Max results to return
  orderBy?: 'timestamp';           // Field to order by
  orderDirection?: 'asc' | 'desc'; // Order direction
}

/**
 * Summary statistics for audit logs
 */
export interface AuditLogSummary {
  totalLogs: number;
  byAction: Record<AuditAction, number>;
  byResourceType: Record<ResourceType, number>;
  byActor: Record<string, number>;
  dateRange: {
    earliest: Timestamp | null;
    latest: Timestamp | null;
  };
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Human-readable labels for audit actions
 */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  // Auth
  'auth.login': 'Logged in',
  'auth.logout': 'Logged out',
  'auth.password_change': 'Changed password',
  'auth.password_reset_request': 'Requested password reset',
  
  // Chancellor
  'chancellor.register': 'Registered as chancellor',
  'chancellor.approve': 'Approved chancellor registration',
  'chancellor.reject': 'Rejected chancellor registration',
  'chancellor.archive': 'Archived chancellor account',
  'chancellor.term_end': 'Ended chancellor term',
  'chancellor.handover': 'Handed over to successor',
  'chancellor.suspend': 'Suspended chancellor account',
  'chancellor.reactivate': 'Reactivated chancellor account',
  
  // Parish Staff
  'parish_staff.register': 'Registered as parish staff',
  'parish_staff.approve': 'Approved parish staff registration',
  'parish_staff.reject': 'Rejected parish staff registration',
  'parish_staff.archive': 'Archived parish staff account',
  'parish_staff.term_end': 'Ended parish staff term',
  'parish_staff.suspend': 'Suspended parish staff account',
  'parish_staff.reactivate': 'Reactivated parish staff account',
  
  // Museum Staff
  'museum_staff.register': 'Registered as museum researcher',
  'museum_staff.approve': 'Approved museum researcher registration',
  'museum_staff.reject': 'Rejected museum researcher registration',
  'museum_staff.archive': 'Archived museum researcher account',
  'museum_staff.term_end': 'Ended museum researcher term',
  'museum_staff.suspend': 'Suspended museum researcher account',
  'museum_staff.reactivate': 'Reactivated museum researcher account',
  
  // User
  'user.create': 'Created user account',
  'user.update': 'Updated user profile',
  'user.deactivate': 'Deactivated user account',
  'user.reactivate': 'Reactivated user account',
  'user.delete': 'Deleted user account',
  'user.password_reset': 'Sent password reset',
  
  // Church
  'church.create': 'Created church',
  'church.update': 'Updated church',
  'church.submit': 'Submitted for review',
  'church.approve': 'Approved church',
  'church.reject': 'Rejected church',
  'church.request_revision': 'Requested revision',
  'church.unpublish': 'Unpublished church',
  'church.republish': 'Republished church',
  'church.forward_heritage': 'Forwarded for heritage review',
  'church.heritage_validate': 'Validated heritage status',
  'church.heritage_reject': 'Rejected heritage status',
  'church.delete': 'Deleted church',
  
  // Announcement
  'announcement.create': 'Created announcement',
  'announcement.update': 'Updated announcement',
  'announcement.publish': 'Published announcement',
  'announcement.archive': 'Archived announcement',
  'announcement.unarchive': 'Restored announcement',
  'announcement.delete': 'Deleted announcement',
  
  // Feedback
  'feedback.respond': 'Responded to feedback',
  'feedback.approve': 'Approved feedback',
  'feedback.reject': 'Rejected feedback',
  'feedback.hide': 'Hid feedback',
  'feedback.unhide': 'Restored feedback',
  'feedback.delete': 'Deleted feedback',
  
  // Heritage
  'heritage.validate': 'Validated heritage',
  'heritage.update_classification': 'Updated classification',
  'heritage.add_document': 'Added heritage document',
  'heritage.update': 'Updated heritage information',
  'heritage.approve': 'Approved heritage church',
  'heritage.reclassify': 'Reclassified heritage status',
  
  // System
  'system.config_update': 'Updated system config',
  'system.maintenance': 'Performed maintenance',
  
  // Import
  'church.import_apply': 'Applied church import',
};

/**
 * Human-readable labels for resource types
 */
export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  user: 'User Account',
  church: 'Church',
  announcement: 'Announcement',
  feedback: 'Feedback',
  heritage: 'Heritage',
  invite: 'Invite',
  system: 'System',
  import_session: 'Import Session',
};

/**
 * Icons for different action categories (Lucide icon names)
 */
export const ACTION_CATEGORY_ICONS: Record<string, string> = {
  auth: 'LogIn',
  chancellor: 'Crown',
  user: 'Users',
  church: 'Church',
  announcement: 'Megaphone',
  feedback: 'MessageSquare',
  heritage: 'Landmark',
  system: 'Settings',
};

/**
 * Get the category of an action from its name
 */
export function getActionCategory(action: AuditAction): string {
  return action.split('.')[0];
}

/**
 * Check if an action is a create action
 */
export function isCreateAction(action: AuditAction): boolean {
  return action.endsWith('.create') || action === 'chancellor.register';
}

/**
 * Check if an action is a destructive action
 */
export function isDestructiveAction(action: AuditAction): boolean {
  return action.endsWith('.delete') || 
         action.endsWith('.reject') ||
         action.endsWith('.archive') ||
         action.endsWith('.deactivate') ||
         action.endsWith('.suspend') ||
         action === 'church.unpublish' ||
         action === 'feedback.hide';
}
