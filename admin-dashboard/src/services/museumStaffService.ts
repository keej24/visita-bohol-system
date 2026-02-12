/**
 * FILE PURPOSE: Museum Staff Lifecycle Management Service
 *
 * This service handles all museum researcher-related operations including:
 * - Self-registration for new museum researchers
 * - Approval workflow for pending registrations (by current museum researcher)
 * - Term management (start, end, archive)
 * - Museum staff profile queries
 *
 * BUSINESS CONTEXT:
 * Museum researchers change over time. Each new staff member must create a
 * new account to ensure audit trails are tied to specific individuals.
 * The current museum researcher approves their replacement.
 *
 * WORKFLOW:
 * 1. New museum staff registers via self-registration form
 * 2. Registration creates Firebase Auth account + Firestore user (status: 'pending')
 * 3. Current Museum Researcher reviews and approves the request
 * 4. Upon approval, previous staff member's account is archived
 * 5. New staff member gains access
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
  DocumentData,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { AuditService } from './auditService';
import { notifyMuseumStaffPendingApproval } from '@/lib/notifications';
import type { Diocese, UserProfile } from '@/contexts/AuthContext';

// ============================================================================
// TYPES
// ============================================================================

export interface MuseumStaffRegistrationData {
  email: string;
  password: string;
  name: string;
  position?: string; // e.g., "Heritage Specialist", "Curator", etc.
  phoneNumber?: string;
}

export interface PendingMuseumStaff {
  uid: string;
  email: string;
  name: string;
  position?: string;
  phoneNumber?: string;
  status: 'pending';
  role: 'museum_researcher';
  registeredAt: Date;
}

export interface MuseumStaffApprovalResult {
  success: boolean;
  message: string;
  archivedStaffId?: string;
  newStaffId?: string;
}

export interface MuseumStaffTermRecord {
  id: string;
  staffId: string;
  staffName: string;
  staffEmail: string;
  diocese: Diocese;
  institution: string;
  position?: string;
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
// SELF-REGISTRATION
// ============================================================================

/**
 * Register a new museum researcher account (self-registration)
 * 
 * Creates:
 * 1. Firebase Auth account
 * 2. Firestore user document with status='pending'
 * 
 * The account remains inactive until approved by the current museum researcher.
 */
export async function registerMuseumStaff(
  data: MuseumStaffRegistrationData
): Promise<{ success: boolean; message: string; uid?: string }> {
  console.log('[MuseumStaffService] registerMuseumStaff called with:', { email: data.email, name: data.name });
  
  try {
    // NOTE: We no longer check Firestore for existing emails before auth creation
    // because the user is not authenticated yet and Firestore rules block the query.
    // Instead, Firebase Auth will reject duplicate emails with 'auth/email-already-in-use'.

    // Create Firebase Auth account first
    // Firebase Auth will reject if email already exists with error code 'auth/email-already-in-use'
    console.log('[MuseumStaffService] Creating Firebase Auth account for:', data.email);
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );
    const uid = userCredential.user.uid;
    console.log('[MuseumStaffService] Auth account created with UID:', uid);

    // Create Firestore user document
    // IMPORTANT: Must be done BEFORE signing out, while user is still authenticated
    try {
      console.log('[MuseumStaffService] Creating Firestore user document...');
      const userDocRef = doc(db, 'users', uid);
      await setDoc(userDocRef, {
        uid,
        email: data.email.toLowerCase(),
        name: data.name,
        role: 'museum_researcher',
        status: 'pending',
        position: data.position || null,
        phoneNumber: data.phoneNumber || null,
        accountType: 'admin',
        createdAt: serverTimestamp(),
        registeredAt: serverTimestamp(),
        requirePasswordChange: false,
      });
      console.log('[MuseumStaffService] Firestore document created successfully');
    } catch (firestoreError) {
      console.error('[MuseumStaffService] Firestore write failed:', firestoreError);
      // If Firestore write fails, clean up the Auth account
      try {
        await userCredential.user.delete();
        console.log('[MuseumStaffService] Cleaned up orphaned Auth account');
      } catch (cleanupError) {
        console.error('[MuseumStaffService] Failed to cleanup Auth account:', cleanupError);
      }
      throw firestoreError;
    }

    // Run audit log, active staff lookup + notification, and sign-out in parallel
    // All of these are independent and non-critical (except sign-out)
    // IMPORTANT: All Firestore queries happen BEFORE sign-out since they run concurrently
    await Promise.all([
      // 1. Audit log (non-critical)
      AuditService.logAction(
        {
          uid,
          email: data.email,
          name: data.name,
          role: 'museum_researcher',
          status: 'pending',
        } as UserProfile,
        'museum_staff.register',
        'user',
        uid,
        {
          resourceName: data.name,
          changes: [
            { field: 'status', oldValue: null, newValue: 'pending' },
          ],
          metadata: {
            position: data.position,
            selfRegistration: true,
          },
        }
      ).catch(auditError => {
        console.warn('[MuseumStaffService] Audit logging failed (non-critical):', auditError);
      }),

      // 2. Look up current active museum researcher + send notification (non-critical)
      (async () => {
        try {
          let currentMuseumStaffUid: string | undefined;
          try {
            const activeStaffQuery = query(
              collection(db, 'users'),
              where('role', '==', 'museum_researcher'),
              where('status', '==', 'active')
            );
            const activeStaffSnap = await getDocs(activeStaffQuery);
            if (!activeStaffSnap.empty) {
              currentMuseumStaffUid = activeStaffSnap.docs[0].id;
              console.log('[MuseumStaffService] Found current museum staff UID:', currentMuseumStaffUid);
            }
          } catch (lookupError) {
            console.warn('[MuseumStaffService] Could not look up current museum staff (non-critical):', lookupError);
          }

          await notifyMuseumStaffPendingApproval({
            name: data.name,
            email: data.email,
            uid,
            currentMuseumStaffUid,
          });
        } catch (notificationError) {
          console.warn('[MuseumStaffService] Notification failed (non-critical):', notificationError);
        }
      })(),

      // 3. Sign out
      auth.signOut().then(() => {
        console.log('[MuseumStaffService] User signed out after successful registration');
      }),
    ]);

    return {
      success: true,
      message: 'Registration successful! Your account is pending approval by the current Museum Researcher.',
      uid,
    };
  } catch (error: unknown) {
    console.error('[MuseumStaffService] Registration error:', error);

    // Handle specific Firebase Auth errors
    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as { code: string };
      if (firebaseError.code === 'auth/email-already-in-use') {
        return { success: false, message: 'This email is already registered. If you previously submitted a registration, please wait for approval. Otherwise, try logging in or contact the administrator.' };
      }
      if (firebaseError.code === 'auth/weak-password') {
        return { success: false, message: 'Password is too weak. Please use at least 6 characters.' };
      }
      if (firebaseError.code === 'auth/invalid-email') {
        return { success: false, message: 'Invalid email address.' };
      }
    }

    return { success: false, message: 'Registration failed. Please try again.' };
  }
}

// ============================================================================
// PENDING MUSEUM STAFF QUERIES
// ============================================================================

/**
 * Get all pending museum staff registrations
 */
export async function getPendingMuseumStaff(): Promise<PendingMuseumStaff[]> {
  console.log('[MuseumStaffService] Fetching pending museum staff registrations');
  
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'museum_researcher'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    console.log('[MuseumStaffService] Query returned', snapshot.size, 'pending museum staff');
    
    const results = snapshot.docs.map((doc) => {
      const data = doc.data();
      console.log('[MuseumStaffService] Found pending museum staff:', { uid: doc.id, email: data.email, status: data.status });
      return {
        uid: doc.id,
        email: data.email,
        name: data.name,
        position: data.position,
        phoneNumber: data.phoneNumber,
        status: 'pending' as const,
        role: 'museum_researcher' as const,
        registeredAt: data.createdAt?.toDate() || new Date(),
      };
    });
    
    return results;
  } catch (error) {
    console.error('[MuseumStaffService] Error fetching pending museum staff:', error);
    throw error;
  }
}

/**
 * Get the currently active museum researcher
 */
export async function getActiveMuseumStaff(): Promise<UserProfile | null> {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'museum_researcher'),
    where('status', '==', 'active')
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  const data = docSnap.data();

  return {
    uid: docSnap.id,
    email: data.email,
    name: data.name,
    role: data.role,
    diocese: data.diocese,
    status: data.status,
    position: data.position,
    createdAt: data.createdAt?.toDate(),
    lastLoginAt: data.lastLoginAt?.toDate(),
  } as UserProfile;
}

// ============================================================================
// MUSEUM STAFF APPROVAL
// ============================================================================

/**
 * Approve a pending museum staff registration
 *
 * This operation:
 * 1. Archives the current active museum researcher (if exists)
 * 2. Activates the new staff member
 * 3. Creates term records for audit trail
 * 4. Logs all actions
 *
 * @param approvingUser - The current museum researcher approving their replacement
 * @param pendingStaffId - UID of the pending staff member to approve
 * @param notes - Optional notes for the approval
 */
export async function approveMuseumStaff(
  approvingUser: UserProfile,
  pendingStaffId: string,
  notes?: string
): Promise<MuseumStaffApprovalResult> {
  try {
    // Only museum researcher can approve new museum staff
    if (approvingUser.role !== 'museum_researcher') {
      return { success: false, message: 'Only the current Museum Researcher can approve new registrations.' };
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

    // Note: We no longer archive the approving user's account.
    // Both the old and new museum researcher accounts will remain active.
    // This allows multiple researchers to be active simultaneously.

    // Activate the new museum staff
    batch.update(pendingDocRef, {
      status: 'active',
      approvedAt: now,
      approvedBy: approvingUser.uid,
      approvedByName: approvingUser.name,
      approvalNotes: notes || null,
      termStart: now,
    });

    // Execute all changes
    await batch.commit();

    // Log the approval action
    await AuditService.logAction(
      approvingUser,
      'museum_staff.approve',
      'user',
      pendingStaffId,
      {
        resourceName: pendingData.name,
        changes: [
          { field: 'status', oldValue: 'pending', newValue: 'active' },
        ],
        metadata: {
          institution: pendingData.institution || pendingData.institutionName,
          position: pendingData.position,
          diocese: pendingData.diocese,
          approvalNotes: notes,
          approvedByUserId: approvingUser.uid,
        },
      }
    );

    return {
      success: true,
      message: `${pendingData.name} has been approved as a Museum Researcher.`,
      newStaffId: pendingStaffId,
    };
  } catch (error) {
    console.error('[MuseumStaffService] Approval error:', error);
    return { success: false, message: 'Failed to approve registration. Please try again.' };
  }
}

/**
 * Reject a pending museum staff registration
 *
 * @param rejectingUser - The current museum researcher rejecting the request
 * @param pendingStaffId - UID of the pending staff member to reject
 * @param reason - Reason for rejection
 */
export async function rejectMuseumStaff(
  rejectingUser: UserProfile,
  pendingStaffId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Only museum researcher can reject new museum staff
    if (rejectingUser.role !== 'museum_researcher') {
      return { success: false, message: 'Only the current Museum Researcher can reject registrations.' };
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
      'museum_staff.reject',
      'user',
      pendingStaffId,
      {
        resourceName: pendingData.name,
        changes: [
          { field: 'status', oldValue: 'pending', newValue: 'rejected' },
        ],
        metadata: {
          institutionName: pendingData.institutionName,
          position: pendingData.position,
          reason,
        },
      }
    );

    return {
      success: true,
      message: `Registration for ${pendingData.name} has been rejected.`,
    };
  } catch (error) {
    console.error('[MuseumStaffService] Rejection error:', error);
    return { success: false, message: 'Failed to reject registration. Please try again.' };
  }
}

// ============================================================================
// TERM HISTORY
// ============================================================================

/**
 * Get the term history for museum researchers
 */
export async function getMuseumTermHistory(diocese?: Diocese): Promise<MuseumStaffTermRecord[]> {
  let q;
  if (diocese) {
    q = query(
      collection(db, 'museum_staff_terms'),
      where('diocese', '==', diocese),
      orderBy('termEnd', 'desc')
    );
  } else {
    q = query(
      collection(db, 'museum_staff_terms'),
      orderBy('termEnd', 'desc')
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as DocumentData;
    return {
      id: docSnap.id,
      staffId: data.staffId,
      staffName: data.staffName,
      staffEmail: data.staffEmail,
      diocese: data.diocese as Diocese,
      institution: data.institution || data.institutionName || 'National Museum of the Philippines',
      position: data.position,
      termStart: data.termStart?.toDate() || new Date(),
      termEnd: data.termEnd?.toDate(),
      status: data.status,
      endReason: data.endReason,
      approvedSuccessorId: data.approvedSuccessorId,
      stats: data.stats,
    };
  });
}

// ============================================================================
// SERVICE EXPORT
// ============================================================================

export const MuseumStaffService = {
  registerMuseumStaff,
  getPendingMuseumStaff,
  getActiveMuseumStaff,
  approveMuseumStaff,
  rejectMuseumStaff,
  getMuseumTermHistory,
};
