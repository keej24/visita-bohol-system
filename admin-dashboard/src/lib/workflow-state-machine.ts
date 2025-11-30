/**
 * =============================================================================
 * CHURCH APPROVAL WORKFLOW STATE MACHINE
 * =============================================================================
 * 
 * FILE PURPOSE:
 * This file controls how churches move through the approval process.
 * Think of it like a traffic light system - churches can only move from
 * one status to another in specific, controlled ways.
 * 
 * THE APPROVAL WORKFLOW (Simple Version):
 * 
 *   PENDING ──────────────────────────────► APPROVED
 *      │        (Chancery approves          (Published!)
 *      │         non-heritage church)
 *      │
 *      └──► HERITAGE_REVIEW ──────────────► APPROVED
 *           (Chancery sends to              (Museum approves)
 *            Museum Researcher)
 * 
 * WHY WE NEED THIS:
 * - Ensures only authorized people can approve churches
 * - Heritage churches (ICP/NCT) get expert review from museum staff
 * - Creates an audit trail of who approved what and when
 * - Prevents accidental or unauthorized status changes
 * 
 * REAL-WORLD ANALOGY:
 * Like a document that needs signatures - a parish submits it,
 * the Chancery reviews it, and if it's a heritage site, the
 * museum expert also signs off before it goes public.
 * 
 * =============================================================================
 */

import type { ChurchStatus } from '@/lib/churches';
import type { UserProfile } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';

/**
 * WorkflowTransition Type
 * 
 * Defines a single allowed status change in the system.
 * Each transition specifies:
 * - from: The starting status (where we are now)
 * - to: The target status (where we want to go)
 * - requiredRoles: Who is allowed to make this change
 * - description: Human-readable explanation
 * - conditions: Optional extra rules that must be met
 * - onTransition: Optional code to run when transition happens
 */
export type WorkflowTransition = {
  from: ChurchStatus;           // Current status of the church
  to: ChurchStatus;             // Status we're changing to
  requiredRoles: string[];      // User roles allowed to make this change
  description: string;          // What this transition does
  conditions?: (context: WorkflowContext) => boolean;  // Extra validation rules
  onTransition?: (context: WorkflowContext) => Promise<void>;  // Code to run after transition
};

/**
 * WorkflowContext Interface
 * 
 * Contains all the information needed to process a status change.
 * This is passed to every transition to provide context about:
 * - Which church is being changed
 * - What the current and target statuses are
 * - Who is making the change
 * - Any notes or additional data
 */
export interface WorkflowContext {
  churchId: string;              // The church being changed
  currentStatus: ChurchStatus;   // Current status (e.g., 'pending')
  targetStatus: ChurchStatus;    // New status we want (e.g., 'approved')
  userProfile: UserProfile;      // The user making this change
  note?: string;                 // Optional explanation for the change
  metadata?: Record<string, any>; // Additional data (e.g., heritage documents)
}

/**
 * StatusChangeAuditLog Interface
 * 
 * Records every status change for accountability and history.
 * This is important for:
 * - Tracking who approved what
 * - Debugging workflow issues
 * - Compliance and record-keeping
 * - Understanding the church's approval history
 * 
 * Each log entry captures the before/after status, who made
 * the change, when it happened, and any notes provided.
 */
export interface StatusChangeAuditLog {
  id?: string;                   // Firestore document ID (auto-generated)
  churchId: string;              // Which church was changed
  fromStatus: ChurchStatus;      // Status before the change
  toStatus: ChurchStatus;        // Status after the change
  changedBy: {                   // Who made this change
    uid: string;                 // User's Firebase ID
    email: string;               // User's email
    name?: string;               // User's display name
    role: string;                // User's role (chancery, museum, parish)
  };
  timestamp: Timestamp;          // When this change happened
  note?: string;                 // Explanation for the change
  metadata?: Record<string, any>; // Extra data attached to the change
  isAutomated?: boolean;         // Was this done automatically by the system?
  diocese?: string;              // Which diocese this belongs to
}

/**
 * =============================================================================
 * WORKFLOW TRANSITIONS DEFINITION
 * =============================================================================
 * 
 * This is the "rule book" for all allowed status changes.
 * 
 * THE 5 VALID TRANSITIONS:
 * 
 * 1. PENDING → PENDING (Parish re-submits their church for review)
 * 2. PENDING → APPROVED (Chancery approves a non-heritage church)
 * 3. PENDING → HERITAGE_REVIEW (Chancery sends heritage church to museum)
 * 4. HERITAGE_REVIEW → APPROVED (Museum researcher validates and approves)
 * 5. APPROVED → HERITAGE_REVIEW (Rare: re-evaluate an approved church)
 * 
 * Any transition NOT in this list is BLOCKED by the system.
 * This prevents unauthorized or accidental status changes.
 */
const WORKFLOW_TRANSITIONS: WorkflowTransition[] = [
  
  // ─────────────────────────────────────────────────────────────────────────
  // TRANSITION 1: Parish Secretary Re-submits
  // ─────────────────────────────────────────────────────────────────────────
  // When: Parish needs to update their submission after making changes
  // Who: Parish Secretary only
  // Result: Church stays in PENDING (refreshes the submission)
  {
    from: 'pending',
    to: 'pending',
    requiredRoles: ['parish_secretary'],
    description: 'Submit church profile for initial review',
    conditions: (context) => {
      // Future: Could add form completion validation here
      // For now, always allow re-submission
      return true;
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSITION 2: Chancery Directly Approves (Non-Heritage)
  // ─────────────────────────────────────────────────────────────────────────
  // When: Church is NOT a heritage site (no ICP/NCT classification)
  // Who: Chancery Office only
  // Result: Church is APPROVED and visible to public immediately
  // Note: This is the fast track for regular churches
  {
    from: 'pending',
    to: 'approved',
    requiredRoles: ['chancery_office'],
    description: 'Approve church directly (non-heritage churches)',
    conditions: (context) => {
      // Heritage churches should go to heritage_review instead
      // The UI handles this routing based on classification
      return true;
    }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // TRANSITION 3: Chancery Forwards to Museum (Heritage)
  // ─────────────────────────────────────────────────────────────────────────
  // When: Church IS a heritage site (ICP or NCT classification)
  // Who: Chancery Office only
  // Result: Church enters HERITAGE_REVIEW for museum validation
  // Why: Heritage sites need expert validation for historical accuracy
  {
    from: 'pending',
    to: 'heritage_review',
    requiredRoles: ['chancery_office'],
    description: 'Forward to museum researcher for heritage validation',
    conditions: (context) => {
      // Chancery decides when a church needs heritage review
      return true;
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSITION 4: Museum Researcher Approves Heritage Church
  // ─────────────────────────────────────────────────────────────────────────
  // When: Museum has validated the heritage information
  // Who: Museum Researcher only
  // Result: Church is APPROVED and visible to public
  // Important: This is the ONLY way heritage churches can be published
  {
    from: 'heritage_review',
    to: 'approved',
    requiredRoles: ['museum_researcher'],
    description: 'Approve after heritage validation',
    conditions: (context) => {
      // Museum researcher confirms heritage info is accurate
      return true;
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSITION 5: Re-evaluate Published Church (Emergency/Administrative)
  // ─────────────────────────────────────────────────────────────────────────
  // When: An already-published church needs heritage re-evaluation
  // Who: Chancery Office only
  // Result: Church goes back to HERITAGE_REVIEW (temporarily unpublished)
  // REQUIRES: An explanation note (to prevent accidental use)
  // Use case: New evidence about heritage status, errors found, etc.
  {
    from: 'approved',
    to: 'heritage_review',
    requiredRoles: ['chancery_office'],
    description: 'Send published church for heritage re-evaluation',
    conditions: (context) => {
      // IMPORTANT: Require a note explaining why we're doing this
      // This prevents accidental re-evaluation of published churches
      return !!context.note;
    }
  }
];

/**
 * =============================================================================
 * CHURCH WORKFLOW STATE MACHINE CLASS
 * =============================================================================
 * 
 * This class is the "brain" that controls all status changes.
 * It enforces the rules defined in WORKFLOW_TRANSITIONS above.
 * 
 * HOW IT WORKS:
 * 1. When someone tries to change a church's status...
 * 2. The state machine checks: Is this transition allowed?
 * 3. If allowed: Execute the change and log it
 * 4. If not allowed: Reject with an error message
 * 
 * MAIN RESPONSIBILITIES:
 * - Validate transitions before they happen
 * - Execute transitions safely
 * - Log all changes for audit trail
 * - Provide status information for UI display
 * 
 * DESIGN PATTERN: State Machine
 * - Each status is a "state"
 * - Each transition is an "edge" between states
 * - The machine only allows defined edges
 */
export class ChurchWorkflowStateMachine {
  /**
   * Map of all transitions, organized by starting status.
   * This makes it fast to look up "what can I do from status X?"
   * 
   * Structure:
   * {
   *   'pending' => [transition1, transition2, transition3],
   *   'heritage_review' => [transition4],
   *   'approved' => [transition5]
   * }
   */
  private transitions: Map<string, WorkflowTransition[]>;

  /**
   * Constructor - Initialize the state machine
   * Called once when the app loads (singleton pattern)
   */
  constructor() {
    this.transitions = new Map();
    this.buildTransitionMap();
  }

  /**
   * Build the transition lookup map from the WORKFLOW_TRANSITIONS array.
   * 
   * This organizes transitions by their "from" status so we can
   * quickly answer: "Given status X, what transitions are possible?"
   * 
   * Called once during initialization.
   */
  private buildTransitionMap() {
    WORKFLOW_TRANSITIONS.forEach(transition => {
      const key = transition.from;  // Group by starting status
      if (!this.transitions.has(key)) {
        this.transitions.set(key, []);  // Create array if first time
      }
      this.transitions.get(key)!.push(transition);  // Add to group
    });
  }

  /**
   * Get all valid transitions from a status for a specific user role.
   * 
   * Used by the UI to show available actions.
   * For example: "As a Chancery user, what can I do with a PENDING church?"
   * 
   * @param fromStatus - Current church status
   * @param userRole - Role of the user trying to act
   * @returns Array of allowed transitions
   * 
   * Example:
   *   getValidTransitions('pending', 'chancery_office')
   *   → Returns transitions to 'approved' and 'heritage_review'
   */
  getValidTransitions(fromStatus: ChurchStatus, userRole: string): WorkflowTransition[] {
    const transitions = this.transitions.get(fromStatus) || [];
    // Filter to only transitions this role is allowed to make
    return transitions.filter(transition =>
      transition.requiredRoles.includes(userRole)
    );
  }

  /**
   * Check if a specific transition is valid WITHOUT executing it.
   * 
   * This is the validation step - we check:
   * 1. Does a transition exist from current → target?
   * 2. Is the user's role allowed to make this transition?
   * 3. Are any additional conditions met?
   * 
   * @param context - All info about the attempted transition
   * @returns Object with valid=true/false and error reason if invalid
   * 
   * Example:
   *   isTransitionValid({ currentStatus: 'pending', targetStatus: 'approved', userProfile: {role: 'parish_secretary'} })
   *   → { valid: false, reason: "Role 'parish_secretary' is not authorized..." }
   */
  isTransitionValid(context: WorkflowContext): { valid: boolean; reason?: string } {
    const { currentStatus, targetStatus, userProfile } = context;

    // Step 1: Find a matching transition in our rules
    const transition = this.findTransition(currentStatus, targetStatus, userProfile.role);

    if (!transition) {
      return {
        valid: false,
        reason: `Transition from '${currentStatus}' to '${targetStatus}' is not allowed for role '${userProfile.role}'`
      };
    }

    // Step 2: Double-check role requirements
    if (!transition.requiredRoles.includes(userProfile.role)) {
      return {
        valid: false,
        reason: `Role '${userProfile.role}' is not authorized for this transition`
      };
    }

    // Step 3: Check any additional conditions (e.g., requiring a note)
    if (transition.conditions && !transition.conditions(context)) {
      return {
        valid: false,
        reason: 'Transition conditions not met'
      };
    }

    // All checks passed!
    return { valid: true };
  }

  /**
   * Execute a status transition with full validation and logging.
   * 
   * This is the main entry point for changing a church's status.
   * It performs these steps:
   * 1. Validate the transition is allowed
   * 2. Run any pre-transition hooks
   * 3. Log the change to the audit trail
   * 4. Return success or error
   * 
   * NOTE: This method does NOT update the church document itself.
   * The calling code should update Firestore after this returns success.
   * 
   * @param context - All info about the transition
   * @returns Object with success=true/false and error message if failed
   */
  async executeTransition(context: WorkflowContext): Promise<{ success: boolean; error?: string }> {
    try {
      // Step 1: Validate the transition first
      const validation = this.isTransitionValid(context);
      if (!validation.valid) {
        return { success: false, error: validation.reason };
      }

      // Step 2: Find the transition definition
      const transition = this.findTransition(
        context.currentStatus,
        context.targetStatus,
        context.userProfile.role
      );

      if (!transition) {
        return { success: false, error: 'Transition not found' };
      }

      // Step 3: Run pre-transition hook if defined
      // (Could be used for sending notifications, etc.)
      if (transition.onTransition) {
        await transition.onTransition(context);
      }

      // Step 4: Log the status change for audit trail
      await this.logStatusChange(context);

      return { success: true };

    } catch (error) {
      console.error('Workflow transition error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get human-readable status information for UI display.
   * 
   * Each status has:
   * - label: What to show users (e.g., "Pending Review")
   * - color: For badges/indicators
   * - description: Tooltip/help text
   * 
   * @param status - The church status to get info for
   * @returns Object with label, color, and description
   */
  getStatusInfo(status: ChurchStatus): { label: string; color: string; description: string } {
    const statusConfig = {
      pending: {
        label: 'Pending Review',
        color: 'yellow',
        description: 'Awaiting Chancery Office review'
      },
      heritage_review: {
        label: 'Heritage Review',
        color: 'orange',
        description: 'Under review by Museum Researcher'
      },
      approved: {
        label: 'Published',
        color: 'green',
        description: 'Church profile is live and public'
      }
    };

    // Return config for known status, or generic fallback
    return statusConfig[status] || {
      label: status,
      color: 'gray',
      description: 'Unknown status'
    };
  }

  /**
   * Get list of possible actions for a church in its current status.
   * 
   * Used by the UI to show buttons like "Approve", "Send to Museum", etc.
   * Only shows actions the current user is allowed to perform.
   * 
   * @param churchId - The church ID (for context)
   * @param currentStatus - Current status of the church
   * @param userRole - Role of the viewing user
   * @returns Array of possible actions with labels and descriptions
   */
  getNextActions(churchId: string, currentStatus: ChurchStatus, userRole: string): {
    action: ChurchStatus;
    label: string;
    description: string;
    requiresNote: boolean;
  }[] {
    const transitions = this.getValidTransitions(currentStatus, userRole);

    return transitions.map(transition => ({
      action: transition.to,
      label: this.getActionLabel(transition),
      description: transition.description,
      // Some transitions require a note (like re-evaluation)
      requiresNote: !!transition.conditions && transition.description.includes('explanation')
    }));
  }

  /**
   * Find a specific transition in our rules.
   * 
   * Searches for a transition that matches:
   * - Starting from 'from' status
   * - Going to 'to' status
   * - Allowed for 'role'
   * 
   * @returns The matching transition, or null if not found
   */
  private findTransition(from: ChurchStatus, to: ChurchStatus, role: string): WorkflowTransition | null {
    const transitions = this.transitions.get(from) || [];
    return transitions.find(t => t.to === to && t.requiredRoles.includes(role)) || null;
  }

  /**
   * Get a user-friendly label for a transition action button.
   * 
   * Converts status codes to readable button text.
   * Example: 'heritage_review' → 'Send to Museum Researcher'
   */
  private getActionLabel(transition: WorkflowTransition): string {
    const actionLabels: Record<ChurchStatus, string> = {
      pending: 'Submit for Review',
      heritage_review: 'Send to Museum Researcher',
      approved: 'Approve & Publish'
    };

    return actionLabels[transition.to] || transition.to;
  }

  /**
   * Log a status change to Firestore for audit trail.
   * 
   * Creates a permanent record of every status change including:
   * - What changed (from → to)
   * - Who made the change
   * - When it happened
   * - Any notes provided
   * 
   * This is stored in the 'church_status_audit' collection.
   * 
   * IMPORTANT: We don't fail the transition if logging fails.
   * The status change is more important than the audit log.
   */
  private async logStatusChange(context: WorkflowContext): Promise<void> {
    try {
      // Build the audit log entry
      const auditLog: Omit<StatusChangeAuditLog, 'id'> = {
        churchId: context.churchId,
        fromStatus: context.currentStatus,
        toStatus: context.targetStatus,
        changedBy: {
          uid: context.userProfile.uid,
          email: context.userProfile.email,
          name: context.userProfile.name,
          role: context.userProfile.role
        },
        timestamp: serverTimestamp() as Timestamp,  // Server sets the time
        note: context.note,
        metadata: context.metadata,
        isAutomated: context.metadata?.isAutomated || false,
        diocese: context.userProfile.diocese
      };

      console.log('Attempting to create audit log:', auditLog);
      
      // Save to Firestore audit collection
      await addDoc(collection(db, 'church_status_audit'), auditLog);
      
      console.log('Audit log created successfully');
    } catch (error) {
      // Log the error but don't fail the transition
      // The audit log is nice-to-have, not critical
      console.error('Error creating audit log:', error);
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================
// We create ONE instance of the state machine that the whole app shares.
// This is called the "Singleton Pattern" - ensures consistent behavior everywhere.
export const workflowStateMachine = new ChurchWorkflowStateMachine();

// =============================================================================
// UTILITY FUNCTIONS FOR UI DISPLAY
// =============================================================================
// These helper functions make it easy to display status information
// consistently across the admin dashboard.

/**
 * Get CSS classes for status badge styling.
 * 
 * Returns Tailwind CSS classes for:
 * - Background color
 * - Text color
 * - Border color
 * 
 * Used by status badges throughout the dashboard.
 * 
 * @param status - The church status
 * @returns CSS class string (e.g., 'bg-yellow-100 text-yellow-800 border-yellow-300')
 */
export function getStatusBadgeColor(status: ChurchStatus): string {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',      // Yellow = waiting
    heritage_review: 'bg-orange-100 text-orange-800 border-orange-300', // Orange = in review
    approved: 'bg-green-100 text-green-800 border-green-300'         // Green = published
  };

  // Return matching color, or gray for unknown status
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
}

/**
 * Get icon name for a status.
 * 
 * Returns the name of a Lucide icon to display with the status.
 * Icons are from the lucide-react library.
 * 
 * @param status - The church status
 * @returns Icon name string (e.g., 'Clock', 'Building2', 'CheckCircle2')
 */
export function getStatusIcon(status: ChurchStatus): string {
  const icons = {
    pending: 'Clock',           // Clock = waiting
    heritage_review: 'Building2', // Building = museum review
    approved: 'CheckCircle2'    // Checkmark = approved
  };

  return icons[status] || 'Circle';  // Default circle for unknown
}