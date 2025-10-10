// Simple workflow state machine for church approval process
export type ChurchStatus = 'pending' | 'approved' | 'needs_revision' | 'heritage_review' | 'rejected';

export interface WorkflowContext {
  currentStatus: ChurchStatus;
  role: 'parish' | 'chancery' | 'museum_researcher';
  hasHeritageClassification?: boolean;
}

export interface WorkflowTransition {
  from: ChurchStatus;
  to: ChurchStatus;
  allowedRoles: ('parish' | 'chancery' | 'museum_researcher')[];
  requiresHeritageReview?: boolean;
}

const transitions: WorkflowTransition[] = [
  // Parish can submit for review
  { from: 'pending', to: 'pending', allowedRoles: ['parish'] },
  
  // Chancery can approve or request revision
  { from: 'pending', to: 'approved', allowedRoles: ['chancery'] },
  { from: 'pending', to: 'needs_revision', allowedRoles: ['chancery'] },
  { from: 'pending', to: 'heritage_review', allowedRoles: ['chancery'], requiresHeritageReview: true },
  
  // Parish can resubmit after revision
  { from: 'needs_revision', to: 'pending', allowedRoles: ['parish'] },
  
  // Museum researcher can validate heritage
  { from: 'heritage_review', to: 'approved', allowedRoles: ['museum_researcher'] },
  { from: 'heritage_review', to: 'needs_revision', allowedRoles: ['museum_researcher'] },
  
  // Approved churches can be revised
  { from: 'approved', to: 'needs_revision', allowedRoles: ['chancery'] },
];

export const workflowStateMachine = {
  canTransition(context: WorkflowContext, targetStatus: ChurchStatus): boolean {
    const transition = transitions.find(
      t => t.from === context.currentStatus && 
           t.to === targetStatus &&
           t.allowedRoles.includes(context.role)
    );
    
    if (!transition) return false;
    
    // Check heritage review requirement
    if (transition.requiresHeritageReview && !context.hasHeritageClassification) {
      return false;
    }
    
    return true;
  },
  
  getAvailableTransitions(context: WorkflowContext): ChurchStatus[] {
    return transitions
      .filter(t => 
        t.from === context.currentStatus &&
        t.allowedRoles.includes(context.role)
      )
      .map(t => t.to);
  },
  
  getTransitionLabel(from: ChurchStatus, to: ChurchStatus): string {
    const labels: Record<string, string> = {
      'pending-approved': 'Approve',
      'pending-needs_revision': 'Request Revision',
      'pending-heritage_review': 'Forward to Heritage Review',
      'needs_revision-pending': 'Resubmit',
      'heritage_review-approved': 'Approve Heritage',
      'heritage_review-needs_revision': 'Request Revision',
      'approved-needs_revision': 'Request Changes',
    };
    
    return labels[`${from}-${to}`] || 'Update Status';
  }
};
