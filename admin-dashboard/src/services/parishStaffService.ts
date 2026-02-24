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
  getDocsFromServer,
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
import { db, auth, setRegistrationInProgress } from '@/lib/firebase';
import { AuditService } from './auditService';
import { notifyAccountPendingApproval, notifyAccountApproved } from '@/lib/notifications';
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
  role: 'parish';
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

    // Prevent AuthContext from calling signOut on the newly created pending
    // user, which would disrupt the Firestore setDoc promise and hang it.
    setRegistrationInProgress(true);

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
        role: 'parish' as UserRole, // All parish staff use parish role
        diocese: data.diocese,
        parishId: data.parishId,
        parishInfo: {
          name: data.parishName,
          municipality: data.municipality,
        },
        status: 'pending',
        registrationSource: 'self', // Self-registered via parish staff registration form
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
    } finally {
      // Release the lock so AuthContext resumes normal pending-user handling
      setRegistrationInProgress(false);
    }

    // Run audit log, active staff lookup + notification, and sign-out in parallel
    // All of these are independent and non-critical (except sign-out)
    const registrationProfile: UserProfile = {
      uid: user.uid,
      email: data.email.toLowerCase(),
      name: data.name,
      role: 'parish',
      diocese: data.diocese,
      parishId: data.parishId,
      status: 'pending',
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };

    // Fire-and-forget: Run audit log, notification, and sign-out in the background.
    // These are non-critical and must NOT block the return, because AuthContext's
    // onAuthStateChanged may also call signOut (for pending users), which can cause
    // these Firestore operations to lose their auth context and hang indefinitely.
    Promise.all([
      // 1. Audit log (non-critical)
      AuditService.logAction(
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
      ).catch(auditError => {
        console.warn('[ParishStaffService] Audit logging failed (non-critical):', auditError);
      }),

      // 2. Look up current active parish staff + send notification (non-critical)
      (async () => {
        try {
          let currentParishStaffUid: string | undefined;
          try {
            const activeStaffQuery = query(
              collection(db, 'users'),
              where('role', '==', 'parish'),
              where('parishId', '==', data.parishId),
              where('status', '==', 'active')
            );
            const activeStaffSnap = await getDocs(activeStaffQuery);
            if (!activeStaffSnap.empty) {
              currentParishStaffUid = activeStaffSnap.docs[0].id;
              console.log('[ParishStaffService] Found current parish staff UID:', currentParishStaffUid);
            }
          } catch (lookupError) {
            console.warn('[ParishStaffService] Could not look up current parish staff (non-critical):', lookupError);
          }

          await notifyAccountPendingApproval({
            name: data.name,
            email: data.email,
            position: data.position,
            parishName: data.parishName,
            parishId: data.parishId,
            diocese: data.diocese,
            uid: user.uid,
            currentParishStaffUid,
          });
        } catch (notificationError) {
          console.warn('[ParishStaffService] Notification failed (non-critical):', notificationError);
        }
      })(),

      // 3. Sign out
      auth.signOut().then(() => {
        console.log('[ParishStaffService] User signed out after successful registration');
      }).catch(signOutError => {
        console.warn('[ParishStaffService] Sign out failed (non-critical):', signOutError);
      }),
    ]).catch(() => {
      // Ensure no unhandled promise rejection from the background tasks
    });

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
      where('role', '==', 'parish'),
      where('parishId', '==', parishId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    // Use getDocsFromServer to bypass the SDK's memory cache and ensure
    // fresh results, especially after approval/rejection mutations.
    const snapshot = await getDocsFromServer(q);
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
        role: 'parish' as const,
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
    where('role', '==', 'parish'),
    where('parishId', '==', parishId),
    where('status', '==', 'active')
  );

  if (position) {
    q = query(
      collection(db, 'users'),
      where('role', '==', 'parish'),
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

/**
 * Get ALL currently active parish staff for a specific parish.
 * Unlike getActiveParishStaff (which returns only the first match),
 * this returns every active staff member — used for the parish staff
 * management UI where the current user can deactivate other staff.
 */
export async function getAllActiveParishStaff(
  parishId: string,
): Promise<UserProfile[]> {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'parish'),
    where('parishId', '==', parishId),
    where('status', 'in', ['active', 'inactive']),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
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
      position: data.position,
      registrationSource: data.registrationSource,
      createdAt: data.createdAt?.toDate(),
      lastLoginAt: data.lastLoginAt?.toDate(),
    } as UserProfile;
  });
}

/**
 * Deactivate or reactivate a parish staff member's account.
 * Can be called by a fellow parish staff member for accounts in the same parish.
 *
 * @param actingUser - The parish staff member performing the action
 * @param targetStaffId - UID of the staff member to deactivate/reactivate
 * @param newStatus - The target status: 'inactive' or 'active'
 * @param reason - Reason for deactivation (required when deactivating)
 */
export async function toggleParishStaffStatus(
  actingUser: UserProfile,
  targetStaffId: string,
  newStatus: 'active' | 'inactive',
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (actingUser.role !== 'parish') {
      return { success: false, message: 'Only parish staff can manage parish accounts.' };
    }

    if (actingUser.uid === targetStaffId) {
      return { success: false, message: 'You cannot deactivate your own account.' };
    }

    const targetDocRef = doc(db, 'users', targetStaffId);
    const targetDoc = await getDoc(targetDocRef);

    if (!targetDoc.exists()) {
      return { success: false, message: 'Staff member not found.' };
    }

    const targetData = targetDoc.data();

    // Must be in the same parish
    if (targetData.parishId !== actingUser.parishId) {
      return { success: false, message: 'You can only manage staff in your own parish.' };
    }

    // Validate current status allows the transition
    if (newStatus === 'inactive' && targetData.status !== 'active') {
      return { success: false, message: 'Only active accounts can be deactivated.' };
    }
    if (newStatus === 'active' && targetData.status !== 'inactive') {
      return { success: false, message: 'Only inactive accounts can be reactivated.' };
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: Timestamp.now(),
      updatedBy: actingUser.uid,
    };

    if (newStatus === 'inactive') {
      updateData.deactivatedAt = Timestamp.now();
      updateData.deactivatedBy = actingUser.uid;
      updateData.deactivationReason = reason || 'Deactivated by parish staff';
    } else {
      updateData.reactivatedAt = Timestamp.now();
      updateData.reactivatedBy = actingUser.uid;
    }

    await updateDoc(targetDocRef, updateData);

    // Audit trail
    const action = newStatus === 'inactive' ? 'user.deactivate' : 'user.reactivate';
    await AuditService.logAction(
      actingUser,
      action as 'user.deactivate' | 'user.reactivate',
      'user',
      targetStaffId,
      {
        resourceName: targetData.name,
        changes: [
          { field: 'status', oldValue: targetData.status, newValue: newStatus },
        ],
        metadata: {
          reason: reason || undefined,
          parishId: targetData.parishId,
        },
      }
    );

    const actionLabel = newStatus === 'inactive' ? 'deactivated' : 'reactivated';
    return {
      success: true,
      message: `${targetData.name}'s account has been ${actionLabel}.`,
    };
  } catch (error) {
    console.error('[ParishStaffService] Toggle status error:', error);
    return {
      success: false,
      message: 'Failed to update account status. Please try again.',
    };
  }
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
    if (approvingUser.role !== 'parish') {
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

    // Send notification to the approved user
    try {
      await notifyAccountApproved(
        {
          uid: pendingStaffId,
          name: pendingData.name,
          email: pendingData.email,
          parishName: pendingData.parishInfo?.name || pendingData.parish || '',
          diocese: pendingData.diocese,
        },
        {
          uid: approvingUser.uid,
          name: approvingUser.name || approvingUser.email,
          role: approvingUser.role,
        }
      );
    } catch (notificationError) {
      console.warn('[ParishStaffService] Approval notification failed (non-critical):', notificationError);
    }

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
    if (rejectingUser.role !== 'parish') {
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
  getAllActiveParishStaff,
  approveParishStaff,
  rejectParishStaff,
  toggleParishStaffStatus,
  getParishTermHistory,
  endParishStaffTerm,
};

export default ParishStaffService;
