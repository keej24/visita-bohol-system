

import type { ChurchStatus } from '@/lib/churches';
import type { UserProfile } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';


export type WorkflowTransition = {
  from: ChurchStatus;           // Current status of the church
  to: ChurchStatus;             // Status we're changing to
  requiredRoles: string[];      // User roles allowed to make this change
  description: string;          // What this transition does
  conditions?: (context: WorkflowContext) => boolean;  // Extra validation rules
  onTransition?: (context: WorkflowContext) => Promise<void>;  // Code to run after transition
};


export interface WorkflowContext {
  churchId: string;              // The church being changed
  currentStatus: ChurchStatus;   // Current status (e.g., 'pending')
  targetStatus: ChurchStatus;    // New status we want (e.g., 'approved')
  userProfile: UserProfile;      // The user making this change
  note?: string;                 // Optional explanation for the change
  metadata?: Record<string, any>; // Additional data (e.g., heritage documents)
}


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


const WORKFLOW_TRANSITIONS: WorkflowTransition[] = [
  
  
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

  
  // When: Church is NOT a heritage site (no ICP/NCT classification)
  // Who: Chancery Office only
  // Result: Church is APPROVED and visible to public immediately
 
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

  
  // When: Museum has validated the heritage information
  // Who: Museum Researcher only
  // Result: Church is APPROVED and visible to public
  
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


export class ChurchWorkflowStateMachine {
 
  private transitions: Map<string, WorkflowTransition[]>;

  
  constructor() {
    this.transitions = new Map();
    this.buildTransitionMap();
  }

  
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
   
   * @param fromStatus - Current church status
   * @param userRole - Role of the user trying to act
   * @returns Array of allowed transitions
   * 
   
   */
  getValidTransitions(fromStatus: ChurchStatus, userRole: string): WorkflowTransition[] {
    const transitions = this.transitions.get(fromStatus) || [];
    // Filter to only transitions this role is allowed to make
    return transitions.filter(transition =>
      transition.requiredRoles.includes(userRole)
    );
  }

  /**
   
   * 
   * @param context - All info about the attempted transition
   * @returns Object with valid=true/false and error reason if invalid
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
   
   * @returns The matching transition, or null if not found
   */
  private findTransition(from: ChurchStatus, to: ChurchStatus, role: string): WorkflowTransition | null {
    const transitions = this.transitions.get(from) || [];
    return transitions.find(t => t.to === to && t.requiredRoles.includes(role)) || null;
  }

  
  private getActionLabel(transition: WorkflowTransition): string {
    const actionLabels: Record<ChurchStatus, string> = {
      pending: 'Submit for Review',
      heritage_review: 'Send to Museum Researcher',
      approved: 'Approve & Publish'
    };

    return actionLabels[transition.to] || transition.to;
  }

  //audit logs
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



export const workflowStateMachine = new ChurchWorkflowStateMachine();



/**

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