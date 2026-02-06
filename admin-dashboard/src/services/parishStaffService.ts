/**
 * FILE PURPOSE: Parish Staff Lifecycle Management Service
 *
 * This service handles all parish staff-related operations including:
 * - Self-registration for new parish secretaries and parish priests
 * - Approval workflow for pending registrations
 * - Term management (start, end, archive)
 * - Parish staff profile queries
 *
 * BUSINESS CONTEXT:
 * Parish secretaries and parish priests change over time. Each new staff member
 * must create a new account to ensure audit trails are tied to specific
 * individuals rather than a shared "Parish" account.
 *
 * WORKFLOW:
 * 1. New parish staff registers via self-registration form
 * 2. Registration creates Firebase Auth account + Firestore user (status: 'pending')
 * 3. Chancery Office reviews and approves the request
 * 4. Upon approval, previous staff member's account is archived (if applicable)
 * 5. New staff member gains access to their parish
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { AuditService } from './auditService';
import type { Diocese, UserProfile, UserRole } from '@/contexts/AuthContext';

// ============================================================================
// TYPES
// ============================================================================

export type ParishStaffPosition = 'parish_secretary' | 'parish_priest';

export interface ParishStaffRegistrationData {
  email: string;
  password: string;
  name: string;
  diocese: Diocese;
  parishId: string;
  parishName: string;
  municipality: string;
  position: ParishStaffPosition;
  phoneNumber?: string;
}

export interface PendingParishStaff {
  uid: string;
  email: string;
  name: string;
  diocese: Diocese;
  parishId: string;
  parishName: string;
  municipality: string;
  position: ParishStaffPosition;
  phoneNumber?: string;
  status: 'pending';
  role: 'parish_secretary';
  registeredAt: Date;
}

export interface ParishStaffApprovalResult {
  success: boolean;
  message: string;
  archivedStaffId?: string;
  newStaffId?: string;
}

export interface ParishStaffTermRecord {
  id: string;
  staffId: string;
  staffName: string;
  staffEmail: string;
  diocese: Diocese;
  parishId: string;
  parishName: string;
  position: ParishStaffPosition;
  termStart: Date;
  termEnd?: Date;
  status: 'active' | 'completed' | 'suspended';
  endReason?: string;
  approvedSuccessorId?: string;
  stats?: {
    totalActions: number;
    actionBreakdown: Record<string, number>;
  };
}

// ============================================================================
// PARISH STAFF REGISTRATION
// ============================================================================

/**
 * Register a new parish staff account
 *
 * This creates a Firebase Auth user and a Firestore user document with
 * status 'pending'. The account cannot access the system until approved
 * by the Chancery Office.
 *
 * @param data - Registration form data
 * @returns The result of the registration attempt
 */
export async function registerParishStaff(
  data: ParishStaffRegistrationData
): Promise<{ success: boolean; message: string; uid?: string }> {
  console.log('[ParishStaffService] registerParishStaff called with:', { email: data.email, name: data.name, parishId: data.parishId });
  
  try {
    // NOTE: We no longer check Firestore for existing emails before auth creation
    // because the user is not authenticated yet and Firestore rules block the query.
    // Instead, Firebase Auth will reject duplicate emails with 'auth/email-already-in-use'.

    // Create Firebase Auth account first
    // Firebase Auth will reject if email already exists with error code 'auth/email-already-in-use'
    console.log('[ParishStaffService] Creating Firebase Auth account for:', data.email);
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const user = userCredential.user;
    console.log('[ParishStaffService] Auth account created with UID:', user.uid);

    // Create user profile in Firestore with 'pending' status
    // IMPORTANT: Must be done BEFORE signing out, while user is still authenticated
    try {
      console.log('[ParishStaffService] Creating Firestore user document...');
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: data.email.toLowerCase(),
        name: data.name,
        role: 'parish_secretary' as UserRole, // All parish staff use parish_secretary role
        diocese: data.diocese,
        parishId: data.parishId,
        parishInfo: {
          name: data.parishName,
          municipality: data.municipality,
        },
        status: 'pending',
        position: data.position, // Position distinguishes secretary vs priest
        phoneNumber: data.phoneNumber || null,
        createdAt: serverTimestamp(),
        registeredAt: serverTimestamp(),
      });
      console.log('[ParishStaffService] Firestore document created successfully');
    } catch (firestoreError) {
      console.error('[ParishStaffService] Firestore write failed:', firestoreError);
      // If Firestore write fails, clean up the Auth account
      try {
        await user.delete();
        console.log('[ParishStaffService] Cleaned up orphaned Auth account');
      } catch (cleanupError) {
        console.error('[ParishStaffService] Failed to cleanup Auth account:', cleanupError);
      }
      throw firestoreError;
    }

    // Log the registration BEFORE signing out (while still authenticated)
    const registrationProfile: UserProfile = {
      uid: user.uid,
      email: data.email.toLowerCase(),
      name: data.name,
      role: 'parish_secretary',
      diocese: data.diocese,
      parishId: data.parishId,
      status: 'pending',
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };

    try {
      await AuditService.logAction(
        registrationProfile,
        'parish_staff.register',
        'user',
        user.uid,
        {
          resourceName: data.name,
          metadata: {
            diocese: data.diocese,
            parishId: data.parishId,
            parishName: data.parishName,
            municipality: data.municipality,
            position: data.position,
          },
        }
      );
    } catch (auditError) {
      console.warn('[ParishStaffService] Audit logging failed (non-critical):', auditError);
    }

    // Sign out AFTER all writes are complete
    await auth.signOut();
    console.log('[ParishStaffService] User signed out after successful registration');

    return {
      success: true,
      message: 'Registration successful! Your account is pending approval by current parish staff.',
      uid: user.uid,
    };
  } catch (error: unknown) {
    console.error('[ParishStaffService] Registration error:', error);

    // Handle specific Firebase errors
    const firebaseError = error as { code?: string; message?: string };
    if (firebaseError.code === 'auth/email-already-in-use') {
      return {
        success: false,
        message: 'This email is already registered. If you previously submitted a registration, please wait for approval. Otherwise, try logging in or contact the administrator.',
      };
    }
    if (firebaseError.code === 'auth/weak-password') {
      return {
        success: false,
        message: 'Password is too weak. Please use at least 6 characters.',
      };
    }
    if (firebaseError.code === 'auth/invalid-email') {
      return {
        success: false,
        message: 'Invalid email format. Please check your email address.',
      };
    }

    return {
      success: false,
      message: 'Registration failed. Please try again later.',
    };
  }
}

// ============================================================================
// PENDING PARISH STAFF QUERIES
// ============================================================================

/**
 * Get all pending parish staff registrations for a specific parish
 */
export async function getPendingParishStaff(parishId: string): Promise<PendingParishStaff[]> {
  console.log('[ParishStaffService] Fetching pending parish staff for parishId:', parishId);
  
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'parish_secretary'),
      where('parishId', '==', parishId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    console.log('[ParishStaffService] Query returned', snapshot.size, 'pending parish staff');
    
    const results = snapshot.docs.map((doc) => {
      const data = doc.data();
      console.log('[ParishStaffService] Found pending parish staff:', { uid: doc.id, email: data.email, status: data.status, parishId: data.parishId });
      return {
        uid: doc.id,
        email: data.email,
        name: data.name,
        diocese: data.diocese,
        parishId: data.parishId,
        parishName: data.parishInfo?.name || data.parish || 'Unknown Parish',
        municipality: data.parishInfo?.municipality || '',
        position: data.position || 'parish_secretary',
        phoneNumber: data.phoneNumber,
        status: 'pending' as const,
        role: 'parish_secretary' as const,
        registeredAt: data.createdAt?.toDate() || new Date(),
      };
    });
    
    return results;
  } catch (error) {
    console.error('[ParishStaffService] Error fetching pending parish staff:', error);
    throw error;
  }
}

/**
 * Get the currently active parish staff for a specific parish
 */
export async function getActiveParishStaff(
  parishId: string,
  position?: ParishStaffPosition
): Promise<UserProfile | null> {
  let q = query(
    collection(db, 'users'),
    where('role', '==', 'parish_secretary'),
    where('parishId', '==', parishId),
    where('status', '==', 'active')
  );

  if (position) {
    q = query(
      collection(db, 'users'),
      where('role', '==', 'parish_secretary'),
      where('parishId', '==', parishId),
      where('status', '==', 'active'),
      where('position', '==', position)
    );
  }

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  // Return the first active staff member
  const docSnap = snapshot.docs[0];
  const data = docSnap.data();

  return {
    uid: docSnap.id,
    email: data.email,
    name: data.name,
    role: data.role,
    diocese: data.diocese,
    parishId: data.parishId,
    parishInfo: data.parishInfo,
    status: data.status,
    createdAt: data.createdAt?.toDate(),
    lastLoginAt: data.lastLoginAt?.toDate(),
  };
}

// ============================================================================
// PARISH STAFF APPROVAL
// ============================================================================

/**
 * Approve a pending parish staff registration
 *
 * This operation:
 * 1. Archives the current active staff member for that position (if exists)
 * 2. Activates the new staff member
 * 3. Creates term records for audit trail
 * 4. Logs all actions
 *
 * @param approvingUser - The current parish staff approving their replacement
 * @param pendingStaffId - UID of the pending staff member to approve
 * @param notes - Optional notes for the approval
 */
export async function approveParishStaff(
  approvingUser: UserProfile,
  pendingStaffId: string,
  notes?: string
): Promise<ParishStaffApprovalResult> {
  try {
    // Only parish staff can approve new parish staff for their own parish
    if (approvingUser.role !== 'parish_secretary') {
      return { success: false, message: 'Only current parish staff can approve new parish staff registrations.' };
    }

    const batch = writeBatch(db);
    const now = Timestamp.now();

    // Get the pending staff member's data
    const pendingDocRef = doc(db, 'users', pendingStaffId);
    const pendingDoc = await getDoc(pendingDocRef);

    if (!pendingDoc.exists()) {
      return { success: false, message: 'Pending registration not found.' };
    }

    const pendingData = pendingDoc.data();
    if (pendingData.status !== 'pending') {
      return { success: false, message: 'This registration has already been processed.' };
    }
    // Must be same parish to approve
    if (pendingData.parishId !== approvingUser.parishId) {
      return { success: false, message: 'You can only approve staff for your own parish.' };
    }

    const position = pendingData.position || 'parish_secretary';
    const parishId = pendingData.parishId;

    // Note: We no longer archive the approving user's account.
    // Both the old and new staff accounts will remain active.
    // This allows multiple staff members to be active simultaneously.

    // Activate the new staff member
    batch.update(pendingDocRef, {
      status: 'active',
      approvedAt: now,
      approvedBy: approvingUser.uid,
      approvedByName: approvingUser.name,
      approvalNotes: notes || null,
      termStart: now,
    });

    // Commit all changes
    await batch.commit();

    // Log the approval
    await AuditService.logAction(
      approvingUser,
      'parish_staff.approve',
      'user',
      pendingStaffId,
      {
        resourceName: pendingData.name,
        changes: [
          { field: 'status', oldValue: 'pending', newValue: 'active' },
        ],
        metadata: {
          diocese: pendingData.diocese,
          parishId: parishId,
          parishName: pendingData.parishInfo?.name || pendingData.parish,
          position: position,
          notes,
        },
      }
    );

    const positionLabel = position === 'parish_priest' ? 'Parish Priest' : 'Parish Secretary';
    return {
      success: true,
      message: `${pendingData.name} has been approved as a ${positionLabel}.`,
      newStaffId: pendingStaffId,
    };
  } catch (error) {
    console.error('[ParishStaffService] Approval error:', error);
    return {
      success: false,
      message: 'Failed to approve registration. Please try again.',
    };
  }
}

/**
 * Reject a pending parish staff registration
 *
 * @param rejectingUser - The current parish staff rejecting the request
 * @param pendingStaffId - UID of the pending staff member to reject
 * @param reason - Reason for rejection
 */
export async function rejectParishStaff(
  rejectingUser: UserProfile,
  pendingStaffId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Only parish staff can reject new parish staff for their own parish
    if (rejectingUser.role !== 'parish_secretary') {
      return { success: false, message: 'Only current parish staff can reject parish staff registrations.' };
    }

    const pendingDocRef = doc(db, 'users', pendingStaffId);
    const pendingDoc = await getDoc(pendingDocRef);

    if (!pendingDoc.exists()) {
      return { success: false, message: 'Pending registration not found.' };
    }

    const pendingData = pendingDoc.data();
    if (pendingData.status !== 'pending') {
      return { success: false, message: 'This registration has already been processed.' };
    }
    // Must be same parish to reject
    if (pendingData.parishId !== rejectingUser.parishId) {
      return { success: false, message: 'You can only reject staff for your own parish.' };
    }

    const position = pendingData.position as ParishStaffPosition;

    // Update status to rejected
    await updateDoc(pendingDocRef, {
      status: 'rejected',
      rejectedAt: serverTimestamp(),
      rejectedBy: rejectingUser.uid,
      rejectedByName: rejectingUser.name,
      rejectionReason: reason,
    });

    // Log the rejection
    await AuditService.logAction(
      rejectingUser,
      'parish_staff.reject',
      'user',
      pendingStaffId,
      {
        resourceName: pendingData.name,
        changes: [
          { field: 'status', oldValue: 'pending', newValue: 'rejected' },
        ],
        metadata: {
          diocese: pendingData.diocese,
          parishId: pendingData.parishId,
          parishName: pendingData.parishInfo?.name || pendingData.parish,
          position,
          reason,
        },
      }
    );

    return {
      success: true,
      message: `Registration for ${pendingData.name} has been rejected.`,
    };
  } catch (error) {
    console.error('[ParishStaffService] Rejection error:', error);
    return {
      success: false,
      message: 'Failed to reject registration. Please try again.',
    };
  }
}

// ============================================================================
// TERM MANAGEMENT
// ============================================================================

/**
 * Get all term records for a parish
 */
export async function getParishTermHistory(parishId: string): Promise<ParishStaffTermRecord[]> {
  const q = query(
    collection(db, 'parish_staff_terms'),
    where('parishId', '==', parishId),
    orderBy('termStart', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      staffId: data.staffId,
      staffName: data.staffName,
      staffEmail: data.staffEmail,
      diocese: data.diocese,
      parishId: data.parishId,
      parishName: data.parishName,
      position: data.position || 'parish_secretary',
      termStart: data.termStart?.toDate() || new Date(),
      termEnd: data.termEnd?.toDate(),
      status: data.status,
      endReason: data.endReason,
      approvedSuccessorId: data.approvedSuccessorId,
      stats: data.stats,
    };
  });
}

/**
 * Manually end a parish staff member's term
 *
 * @param chancellorUser - The Chancery user ending the term
 * @param staffId - UID of the staff member
 * @param reason - Reason for ending the term
 */
export async function endParishStaffTerm(
  chancellorUser: UserProfile,
  staffId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (chancellorUser.role !== 'chancery_office') {
      return { success: false, message: 'Only Chancery Office can end staff terms.' };
    }

    const staffDocRef = doc(db, 'users', staffId);
    const staffDoc = await getDoc(staffDocRef);

    if (!staffDoc.exists()) {
      return { success: false, message: 'Staff member not found.' };
    }

    const staffData = staffDoc.data();
    if (staffData.status !== 'active') {
      return { success: false, message: 'This account is not active.' };
    }
    if (staffData.diocese !== chancellorUser.diocese) {
      return { success: false, message: 'You can only manage staff in your own diocese.' };
    }

    const now = Timestamp.now();
    const termStats = await AuditService.getTermStats(staffId);

    // Create term record
    const termDocRef = doc(collection(db, 'parish_staff_terms'));
    await setDoc(termDocRef, {
      staffId: staffId,
      staffName: staffData.name,
      staffEmail: staffData.email,
      diocese: staffData.diocese,
      parishId: staffData.parishId,
      parishName: staffData.parishInfo?.name || staffData.parish,
      position: staffData.position || 'parish_secretary',
      termStart: staffData.termStart || staffData.createdAt || now,
      termEnd: now,
      status: 'completed',
      endReason: reason,
      stats: termStats,
      createdAt: now,
    });

    // Archive the staff member's account
    await updateDoc(staffDocRef, {
      status: 'archived',
      archivedAt: now,
      archivedReason: reason,
    });

    // Log the term end
    await AuditService.logAction(
      chancellorUser,
      'parish_staff.term_end',
      'user',
      staffId,
      {
        resourceName: staffData.name,
        changes: [
          { field: 'status', oldValue: 'active', newValue: 'archived' },
        ],
        metadata: {
          parishId: staffData.parishId,
          position: staffData.position || 'parish_secretary',
          reason,
          termStats,
        },
      }
    );

    return {
      success: true,
      message: `${staffData.name}'s term has been ended.`,
    };
  } catch (error) {
    console.error('[ParishStaffService] End term error:', error);
    return {
      success: false,
      message: 'Failed to end term. Please try again.',
    };
  }
}

// ============================================================================
// EXPORT SERVICE OBJECT
// ============================================================================

export const ParishStaffService = {
  registerParishStaff,
  getPendingParishStaff,
  getActiveParishStaff,
  approveParishStaff,
  rejectParishStaff,
  getParishTermHistory,
  endParishStaffTerm,
};

export default ParishStaffService;
