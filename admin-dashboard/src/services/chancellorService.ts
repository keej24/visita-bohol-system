/**
 * FILE PURPOSE: Chancellor Lifecycle Management Service
 *
 * This service handles all chancellor-related operations including:
 * - Self-registration for new chancellors
 * - Approval workflow for pending chancellors
 * - Term management (start, end, archive)
 * - Chancellor profile queries
 *
 * BUSINESS CONTEXT:
 * Chancellors are not permanent - they change after each term. Each new
 * chancellor must create a new account to ensure audit trails are tied
 * to specific individuals rather than a shared "Chancery" account.
 *
 * WORKFLOW:
 * 1. New chancellor registers via self-registration form
 * 2. Registration creates Firebase Auth account + Firestore user (status: 'pending')
 * 3. Existing active chancellor (or system admin) approves the request
 * 4. Upon approval, previous chancellor's account is archived
 * 5. New chancellor gains full access to diocese
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
import { db, auth } from '@/lib/firebase';
import { AuditService } from './auditService';
import { notifyChancellorPendingApproval } from '@/lib/notifications';
import type { Diocese, UserProfile, UserRole } from '@/contexts/AuthContext';
import type { TermStats } from '@/types/audit';

// ============================================================================
// TYPES
// ============================================================================

export interface ChancellorRegistrationData {
  email: string;
  password: string;
  name: string;
  diocese: Diocese;
  position?: string;
  phoneNumber?: string;
}

export interface PendingChancellor {
  uid: string;
  email: string;
  name: string;
  diocese: Diocese;
  position?: string;
  phoneNumber?: string;
  status: 'pending';
  role: 'chancery_office';
  registeredAt: Date;
}

export interface ApprovalResult {
  success: boolean;
  message: string;
  archivedChancellorId?: string;
  newChancellorId?: string;
}

// ============================================================================
// CHANCELLOR REGISTRATION
// ============================================================================

/**
 * Register a new chancellor account
 *
 * This creates a Firebase Auth user and a Firestore user document with
 * status 'pending'. The account cannot access the system until approved
 * by an existing chancellor.
 *
 * @param data - Registration form data
 * @returns The created user profile
 */
export async function registerChancellor(
  data: ChancellorRegistrationData
): Promise<{ success: boolean; message: string; uid?: string }> {
  console.log('[ChancellorService] registerChancellor called with:', { email: data.email, name: data.name, diocese: data.diocese });
  
  try {
    // NOTE: We no longer check Firestore for existing emails before auth creation
    // because the user is not authenticated yet and Firestore rules block the query.
    // Instead, Firebase Auth will reject duplicate emails with 'auth/email-already-in-use'.

    // Create Firebase Auth account first
    // Firebase Auth will reject if email already exists with error code 'auth/email-already-in-use'
    console.log('[ChancellorService] Creating Firebase Auth account for:', data.email);
    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const user = userCredential.user;
    console.log('[ChancellorService] Auth account created with UID:', user.uid);

    // Create user profile in Firestore with 'pending' status
    // IMPORTANT: Must be done BEFORE signing out, while user is still authenticated
    try {
      console.log('[ChancellorService] Creating Firestore user document...');
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: data.email.toLowerCase(),
        name: data.name,
        role: 'chancery_office' as UserRole,
        diocese: data.diocese,
        status: 'pending',
        position: data.position || 'Chancellor',
        phoneNumber: data.phoneNumber || null,
        createdAt: serverTimestamp(),
        registeredAt: serverTimestamp(),
      });
      console.log('[ChancellorService] Firestore document created successfully');
    } catch (firestoreError) {
      console.error('[ChancellorService] Firestore write failed:', firestoreError);
      // If Firestore write fails, we should clean up the Auth account
      try {
        await user.delete();
        console.log('[ChancellorService] Cleaned up orphaned Auth account');
      } catch (cleanupError) {
        console.error('[ChancellorService] Failed to cleanup Auth account:', cleanupError);
      }
      throw firestoreError; // Re-throw to be caught by outer handler
    }

    // Run audit log, active chancellor lookup + notification, and sign-out in parallel
    // All of these are independent and non-critical (except sign-out)
    // IMPORTANT: All Firestore queries happen BEFORE sign-out since they run concurrently
    const registrationProfile: UserProfile = {
      uid: user.uid,
      email: data.email.toLowerCase(),
      name: data.name,
      role: 'chancery_office',
      diocese: data.diocese,
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
        'chancellor.register',
        'user',
        user.uid,
        {
          resourceName: data.name,
          metadata: {
            diocese: data.diocese,
            position: data.position || 'Chancellor',
          },
        }
      ).catch(auditError => {
        console.warn('[ChancellorService] Audit logging failed (non-critical):', auditError);
      }),

      // 2. Look up current active chancellor + send notification (non-critical)
      (async () => {
        try {
          let currentChancellorUid: string | undefined;
          try {
            const activeChancellorQuery = query(
              collection(db, 'users'),
              where('role', '==', 'chancery_office'),
              where('diocese', '==', data.diocese),
              where('status', '==', 'active')
            );
            const activeChancellorSnap = await getDocs(activeChancellorQuery);
            if (!activeChancellorSnap.empty) {
              currentChancellorUid = activeChancellorSnap.docs[0].id;
              console.log('[ChancellorService] Found current chancellor UID:', currentChancellorUid);
            }
          } catch (lookupError) {
            console.warn('[ChancellorService] Could not look up current chancellor (non-critical):', lookupError);
          }

          await notifyChancellorPendingApproval({
            name: data.name,
            email: data.email,
            diocese: data.diocese,
            uid: user.uid,
            currentChancellorUid,
          });
        } catch (notificationError) {
          console.warn('[ChancellorService] Notification failed (non-critical):', notificationError);
        }
      })(),

      // 3. Sign out
      auth.signOut().then(() => {
        console.log('[ChancellorService] User signed out after successful registration');
      }).catch(signOutError => {
        console.warn('[ChancellorService] Sign out failed (non-critical):', signOutError);
      }),
    ]).catch(() => {
      // Ensure no unhandled promise rejection from the background tasks
    });

    return {
      success: true,
      message: 'Registration successful! Your account is pending approval.',
      uid: user.uid,
    };
  } catch (error: unknown) {
    console.error('[ChancellorService] Registration error:', error);

    // Handle specific Firebase errors
    const firebaseError = error as { code?: string; message?: string };
    if (firebaseError.code === 'auth/email-already-in-use') {
      return {
        success: false,
        message: 'This email is already registered. If you previously submitted a registration, please wait for approval. Otherwise, try logging in or contact the diocese administrator.',
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
// PENDING CHANCELLOR QUERIES
// ============================================================================

/**
 * Get all pending chancellor registrations for a diocese
 */
export async function getPendingChancellors(diocese: Diocese): Promise<PendingChancellor[]> {
  console.log('[ChancellorService] Fetching pending chancellors for diocese:', diocese);
  
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'chancery_office'),
      where('diocese', '==', diocese),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    // Use getDocsFromServer to bypass the SDK's memory cache and ensure
    // fresh results, especially after approval/rejection mutations.
    const snapshot = await getDocsFromServer(q);
    console.log('[ChancellorService] Query returned', snapshot.size, 'pending chancellors');
    
    const results = snapshot.docs.map((doc) => {
      const data = doc.data();
      console.log('[ChancellorService] Found pending chancellor:', { uid: doc.id, email: data.email, status: data.status });
      return {
        uid: doc.id,
        email: data.email,
        name: data.name,
        diocese: data.diocese,
        position: data.position,
        phoneNumber: data.phoneNumber,
        status: 'pending' as const,
        role: 'chancery_office' as const,
        registeredAt: data.createdAt?.toDate() || new Date(),
      };
    });
    
    return results;
  } catch (error) {
    console.error('[ChancellorService] Error fetching pending chancellors:', error);
    throw error;
  }
}

/**
 * Get the currently active chancellor for a diocese
 */
export async function getActiveChancellor(diocese: Diocese): Promise<UserProfile | null> {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'chancery_office'),
    where('diocese', '==', diocese),
    where('status', '==', 'active')
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  // Return the first active chancellor (there should only be one)
  const doc = snapshot.docs[0];
  const data = doc.data();

  return {
    uid: doc.id,
    email: data.email,
    name: data.name,
    role: data.role,
    diocese: data.diocese,
    status: data.status,
    position: data.position,
    phoneNumber: data.phoneNumber,
    createdAt: data.createdAt?.toDate(),
    lastLoginAt: data.lastLoginAt?.toDate(),
  };
}

// ============================================================================
// CHANCELLOR APPROVAL
// ============================================================================

/**
 * Approve a pending chancellor registration
 *
 * This is a critical operation that:
 * 1. Archives the current active chancellor (ends their term)
 * 2. Activates the new chancellor
 * 3. Creates term records for audit trail
 * 4. Logs all actions
 *
 * @param approvingChancellor - The currently active chancellor approving the request
 * @param pendingChancellorId - UID of the pending chancellor to approve
 * @param notes - Optional notes for the approval
 */
export async function approveChancellor(
  approvingChancellor: UserProfile,
  pendingChancellorId: string,
  notes?: string
): Promise<ApprovalResult> {
  try {
    const batch = writeBatch(db);
    const now = Timestamp.now();

    // Get the pending chancellor's data
    const pendingDocRef = doc(db, 'users', pendingChancellorId);
    const pendingDoc = await getDoc(pendingDocRef);

    if (!pendingDoc.exists()) {
      return { success: false, message: 'Pending chancellor not found.' };
    }

    const pendingData = pendingDoc.data();
    if (pendingData.status !== 'pending') {
      return { success: false, message: 'This registration has already been processed.' };
    }
    if (pendingData.diocese !== approvingChancellor.diocese) {
      return { success: false, message: 'You can only approve chancellors for your own diocese.' };
    }

    // Get current active chancellor (the one approving)
    const activeChancellor = await getActiveChancellor(approvingChancellor.diocese);

    // Step 1: Archive the approving chancellor's account
    if (activeChancellor) {
      const approvingDocRef = doc(db, 'users', approvingChancellor.uid);
      batch.update(approvingDocRef, {
        status: 'archived',
        archivedAt: now,
        archivedReason: `Term ended - approved successor: ${pendingData.name}`,
        termEnd: now,
      });

      // Step 2: Create a term record for the outgoing chancellor
      const termRef = doc(collection(db, 'chancellor_terms'));
      batch.set(termRef, {
        chancellorId: approvingChancellor.uid,
        chancellorName: approvingChancellor.name,
        chancellorEmail: approvingChancellor.email,
        diocese: approvingChancellor.diocese,
        termStart: activeChancellor.createdAt || now,
        termEnd: now,
        status: 'completed',
        endReason: `Approved successor: ${pendingData.name}`,
        successorId: pendingChancellorId,
        successorName: pendingData.name,
        createdAt: now,
      });
    }

    // Step 3: Activate the new chancellor
    batch.update(pendingDocRef, {
      status: 'active',
      approvedAt: now,
      approvedBy: approvingChancellor.uid,
      approvedByName: approvingChancellor.name,
      approvalNotes: notes || null,
      termStart: now,
    });

    // Commit all changes
    await batch.commit();

    // Log the approval
    const newChancellorProfile: UserProfile = {
      uid: pendingChancellorId,
      email: pendingData.email,
      name: pendingData.name,
      role: 'chancery_office',
      diocese: pendingData.diocese,
      status: 'active',
      createdAt: pendingData.createdAt?.toDate() || new Date(),
      lastLoginAt: new Date(),
    };

    await AuditService.logAction(
      approvingChancellor,
      'chancellor.approve',
      'user',
      pendingChancellorId,
      {
        resourceName: pendingData.name,
        changes: [
          { field: 'status', oldValue: 'pending', newValue: 'active' },
          { field: 'previous_chancellor_status', oldValue: 'active', newValue: 'archived' },
        ],
        metadata: {
          diocese: pendingData.diocese,
          archivedChancellorId: approvingChancellor.uid,
          archivedChancellorName: approvingChancellor.name,
          notes,
        },
      }
    );

    return {
      success: true,
      message: `${pendingData.name} has been approved as the new chancellor. Your account has been archived.`,
      archivedChancellorId: activeChancellor?.uid,
      newChancellorId: pendingChancellorId,
    };
  } catch (error) {
    console.error('[ChancellorService] Approval error:', error);
    return {
      success: false,
      message: 'Failed to approve chancellor. Please try again.',
    };
  }
}

/**
 * Reject a pending chancellor registration
 */
export async function rejectChancellor(
  rejectingChancellor: UserProfile,
  pendingChancellorId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const pendingDocRef = doc(db, 'users', pendingChancellorId);
    const pendingDoc = await getDoc(pendingDocRef);

    if (!pendingDoc.exists()) {
      return { success: false, message: 'Pending chancellor not found.' };
    }

    const pendingData = pendingDoc.data();
    if (pendingData.status !== 'pending') {
      return { success: false, message: 'This registration has already been processed.' };
    }
    if (pendingData.diocese !== rejectingChancellor.diocese) {
      return { success: false, message: 'You can only reject registrations for your own diocese.' };
    }

    // Update status to rejected
    await updateDoc(pendingDocRef, {
      status: 'rejected',
      rejectedAt: serverTimestamp(),
      rejectedBy: rejectingChancellor.uid,
      rejectedByName: rejectingChancellor.name,
      rejectionReason: reason,
    });

    // Log the rejection
    await AuditService.logAction(
      rejectingChancellor,
      'chancellor.reject',
      'user',
      pendingChancellorId,
      {
        resourceName: pendingData.name,
        changes: [
          { field: 'status', oldValue: 'pending', newValue: 'rejected' },
        ],
        metadata: {
          reason,
        },
      }
    );

    return {
      success: true,
      message: `Registration for ${pendingData.name} has been rejected.`,
    };
  } catch (error) {
    console.error('[ChancellorService] Rejection error:', error);
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
 * Historical chancellor term record (as stored in Firestore)
 */
export interface ChancellorTermRecord {
  id: string;
  chancellorId: string;
  chancellorName: string;
  chancellorEmail: string;
  diocese: Diocese;
  termStart: Date;
  termEnd: Date;
  status: 'completed' | 'active';
  endReason?: string;
  stats?: TermStats;
}

/**
 * Get all chancellor terms for a diocese
 */
export async function getChancellorTerms(diocese: Diocese): Promise<ChancellorTermRecord[]> {
  const q = query(
    collection(db, 'chancellor_terms'),
    where('diocese', '==', diocese),
    orderBy('termEnd', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      chancellorId: data.chancellorId,
      chancellorName: data.chancellorName,
      chancellorEmail: data.chancellorEmail,
      diocese: data.diocese,
      termStart: data.termStart?.toDate(),
      termEnd: data.termEnd?.toDate(),
      status: data.status,
      endReason: data.endReason,
      stats: data.stats,
    };
  });
}

/**
 * Toggle a chancellor's status between active and inactive.
 * This is a reversible operation — inactive chancellors can be reactivated.
 *
 * @param actingUser - The chancellor performing the action
 * @param chancellorId - UID of the chancellor to deactivate/reactivate
 * @param newStatus - The target status: 'inactive' or 'active'
 * @param reason - Reason for deactivation (required when deactivating)
 */
export async function toggleChancellorStatus(
  actingUser: UserProfile,
  chancellorId: string,
  newStatus: 'active' | 'inactive',
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (actingUser.role !== 'chancery_office') {
      return { success: false, message: 'Only chancery office staff can manage chancellor accounts.' };
    }

    if (actingUser.uid === chancellorId) {
      return { success: false, message: 'You cannot deactivate your own account.' };
    }

    const chancellorDocRef = doc(db, 'users', chancellorId);
    const chancellorDoc = await getDoc(chancellorDocRef);

    if (!chancellorDoc.exists()) {
      return { success: false, message: 'Chancellor not found.' };
    }

    const chancellorData = chancellorDoc.data();
    const currentStatus = chancellorData.status || 'active';

    // Must be in the same diocese
    if (chancellorData.diocese !== actingUser.diocese) {
      return { success: false, message: 'You can only manage chancellors in your own diocese.' };
    }

    // Validate current status allows the transition
    if (newStatus === 'inactive' && currentStatus !== 'active') {
      return { success: false, message: 'Only active accounts can be deactivated.' };
    }
    if (newStatus === 'active' && currentStatus !== 'inactive') {
      return { success: false, message: 'Only inactive accounts can be reactivated.' };
    }

    const now = Timestamp.now();

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: now,
      updatedBy: actingUser.uid,
    };

    if (newStatus === 'inactive') {
      updateData.deactivatedAt = now;
      updateData.deactivatedBy = actingUser.uid;
      updateData.deactivationReason = reason || 'Deactivated by chancery office';
    } else {
      updateData.reactivatedAt = now;
      updateData.reactivatedBy = actingUser.uid;
    }

    await updateDoc(chancellorDocRef, updateData);

    // Audit trail
    const action = newStatus === 'inactive' ? 'user.deactivate' : 'user.reactivate';
    await AuditService.logAction(
      actingUser,
      action as 'user.deactivate' | 'user.reactivate',
      'user',
      chancellorId,
      {
        resourceName: chancellorData.name,
        changes: [
          { field: 'status', oldValue: currentStatus, newValue: newStatus },
        ],
        metadata: {
          reason: reason || undefined,
          diocese: chancellorData.diocese,
        },
      }
    );

    const actionLabel = newStatus === 'inactive' ? 'deactivated' : 'reactivated';
    return {
      success: true,
      message: `${chancellorData.name}'s account has been ${actionLabel}.`,
    };
  } catch (error) {
    console.error('[ChancellorService] Toggle status error:', error);
    return {
      success: false,
      message: 'Failed to update account status. Please try again.',
    };
  }
}

// Export as singleton service object for consistency with other services
export const ChancellorService = {
  registerChancellor,
  getPendingChancellors,
  getActiveChancellor,
  approveChancellor,
  rejectChancellor,
  getChancellorTerms,
  toggleChancellorStatus,
};

export default ChancellorService;
