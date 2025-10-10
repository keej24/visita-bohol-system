import type { ChurchStatus } from '@/lib/churches';
import type { UserProfile } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';

export type WorkflowTransition = {
  from: ChurchStatus;
  to: ChurchStatus;
  requiredRoles: string[];
  description: string;
  conditions?: (context: WorkflowContext) => boolean;
  onTransition?: (context: WorkflowContext) => Promise<void>;
};

export interface WorkflowContext {
  churchId: string;
  currentStatus: ChurchStatus;
  targetStatus: ChurchStatus;
  userProfile: UserProfile;
  note?: string;
  metadata?: Record<string, any>;
}

export interface StatusChangeAuditLog {
  id?: string;
  churchId: string;
  fromStatus: ChurchStatus;
  toStatus: ChurchStatus;
  changedBy: {
    uid: string;
    email: string;
    name?: string;
    role: string;
  };
  timestamp: Timestamp;
  note?: string;
  metadata?: Record<string, any>;
  isAutomated?: boolean;
  diocese?: string;
}

/**
 * Workflow State Machine Definition
 * Defines valid transitions between church statuses and their requirements
 */
const WORKFLOW_TRANSITIONS: WorkflowTransition[] = [
  // From Draft
  {
    from: 'pending',
    to: 'pending',
    requiredRoles: ['parish_secretary'],
    description: 'Submit church profile for initial review',
    conditions: (context) => {
      // Could add form completion validation here
      return true;
    }
  },

  // From Pending - Chancery Office Actions
  {
    from: 'pending',
    to: 'approved',
    requiredRoles: ['chancery_office'],
    description: 'Approve church directly (non-heritage churches)',
    conditions: (context) => {
      // Only allow direct approval for non-heritage churches
      // Heritage detection logic would be checked here
      return true;
    }
  },
  {
    from: 'pending',
    to: 'heritage_review',
    requiredRoles: ['chancery_office'],
    description: 'Forward to museum researcher for heritage validation',
    conditions: (context) => {
      return true;
    }
  },

  // From Heritage Review - Museum Researcher Actions
  {
    from: 'heritage_review',
    to: 'approved',
    requiredRoles: ['museum_researcher'],
    description: 'Approve after heritage validation',
    conditions: (context) => {
      return true;
    }
  },
  // From Approved - Administrative Updates can still go to heritage review if needed

  // Emergency/Administrative Transitions
  {
    from: 'approved',
    to: 'heritage_review',
    requiredRoles: ['chancery_office'],
    description: 'Send published church for heritage re-evaluation',
    conditions: (context) => {
      return !!context.note; // Require explanation
    }
  }
];

/**
 * Workflow State Machine Class
 */
export class ChurchWorkflowStateMachine {
  private transitions: Map<string, WorkflowTransition[]>;

  constructor() {
    this.transitions = new Map();
    this.buildTransitionMap();
  }

  private buildTransitionMap() {
    WORKFLOW_TRANSITIONS.forEach(transition => {
      const key = transition.from;
      if (!this.transitions.has(key)) {
        this.transitions.set(key, []);
      }
      this.transitions.get(key)!.push(transition);
    });
  }

  /**
   * Get all valid transitions from current status for a specific user role
   */
  getValidTransitions(fromStatus: ChurchStatus, userRole: string): WorkflowTransition[] {
    const transitions = this.transitions.get(fromStatus) || [];
    return transitions.filter(transition =>
      transition.requiredRoles.includes(userRole)
    );
  }

  /**
   * Check if a specific transition is valid
   */
  isTransitionValid(context: WorkflowContext): { valid: boolean; reason?: string } {
    const { currentStatus, targetStatus, userProfile } = context;

    // Find matching transition
    const transition = this.findTransition(currentStatus, targetStatus, userProfile.role);

    if (!transition) {
      return {
        valid: false,
        reason: `Transition from '${currentStatus}' to '${targetStatus}' is not allowed for role '${userProfile.role}'`
      };
    }

    // Check role requirements
    if (!transition.requiredRoles.includes(userProfile.role)) {
      return {
        valid: false,
        reason: `Role '${userProfile.role}' is not authorized for this transition`
      };
    }

    // Check additional conditions
    if (transition.conditions && !transition.conditions(context)) {
      return {
        valid: false,
        reason: 'Transition conditions not met'
      };
    }

    return { valid: true };
  }

  /**
   * Execute a status transition with validation and logging
   */
  async executeTransition(context: WorkflowContext): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate transition
      const validation = this.isTransitionValid(context);
      if (!validation.valid) {
        return { success: false, error: validation.reason };
      }

      // Find the transition
      const transition = this.findTransition(
        context.currentStatus,
        context.targetStatus,
        context.userProfile.role
      );

      if (!transition) {
        return { success: false, error: 'Transition not found' };
      }

      // Execute pre-transition hook
      if (transition.onTransition) {
        await transition.onTransition(context);
      }

      // Log the status change
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
   * Get workflow status information for display
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

    return statusConfig[status] || {
      label: status,
      color: 'gray',
      description: 'Unknown status'
    };
  }

  /**
   * Get next possible actions for a church in current status
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
      requiresNote: !!transition.conditions && transition.description.includes('explanation')
    }));
  }

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

  /**
   * Log status change for audit trail
   */
  private async logStatusChange(context: WorkflowContext): Promise<void> {
    try {
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
        timestamp: serverTimestamp() as Timestamp,
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
      console.error('Error creating audit log:', error);
      // Don't fail the entire operation if audit log fails
      // Just log the error and continue
    }
  }
}

// Export singleton instance
export const workflowStateMachine = new ChurchWorkflowStateMachine();

/**
 * Utility functions
 */
export function getStatusBadgeColor(status: ChurchStatus): string {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    heritage_review: 'bg-orange-100 text-orange-800 border-orange-300',
    approved: 'bg-green-100 text-green-800 border-green-300'
  };

  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
}

export function getStatusIcon(status: ChurchStatus): string {
  const icons = {
    pending: 'Clock',
    heritage_review: 'Building2',
    approved: 'CheckCircle2'
  };

  return icons[status] || 'Circle';
}