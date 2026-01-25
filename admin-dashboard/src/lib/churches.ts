import { db } from '@/lib/firebase';
import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, setDoc, Timestamp, updateDoc, where, type QueryConstraint } from 'firebase/firestore';
import type { Diocese, UserProfile } from '@/contexts/AuthContext';
import { workflowStateMachine, type WorkflowContext } from '@/lib/workflow-state-machine';
import { shouldRequireHeritageReview } from '@/lib/heritage-detection';

export type ChurchStatus = 'draft' | 'pending' | 'approved' | 'under_review' | 'heritage_review';

export interface MassSchedule {
  day: string;
  time: string;
  endTime?: string;
  type?: string; // Sunday Mass, Daily Mass, etc.
  language?: string; // Language of the mass (Filipino, English, Cebuano, etc.)
  isFbLive?: boolean; // Whether the mass is live-streamed on Facebook
}

export interface Church {
  id: string;
  name: string;
  fullName?: string;
  municipality?: string;
  parishId?: string;
  diocese: Diocese;
  status: ChurchStatus;
  classification?: 'ICP' | 'NCT' | 'non-heritage' | 'unknown';
  foundedYear?: number;
  foundingYear?: number;
  founders?: string;
  // Parish-editable extended fields
  address?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  architecturalStyle?: string;
  historicalBackground?: string;
  description?: string;
  massSchedules?: MassSchedule[];
  assignedPriest?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: string;
    website?: string;
    facebookPage?: string;
  };
  // Media fields
  images?: string[]; // Legacy - simple URL array
  photos?: (string | { url: string; name?: string; visibility?: 'public' | 'internal' })[]; // Photos with visibility
  documents?: (string | { url: string; name?: string; visibility?: 'public' | 'internal' })[];
  virtualTour360?: string[];
  // Heritage-related fields (museum researcher)
  culturalSignificance?: string;
  heritageNotes?: string;
  architecturalFeatures?: string;
  heritageInformation?: string;
  religiousClassification?: string;
  heritageValidation?: {
    validated: boolean;
    notes?: string;
    validatedAt?: Timestamp;
  };
  heritageDeclaration?: {
    type: 'ICP' | 'NCT';
    referenceNo?: string;
    issuedBy?: string;
    dateIssued?: string; // ISO string for now
    notes?: string;
  };
  // Parish form historical details (includes heritage classification)
  historicalDetails?: {
    heritageClassification?: 'National Cultural Treasures' | 'Important Cultural Properties' | 'None';
    foundingYear?: string;
    founders?: string;
    architecturalStyle?: string;
    historicalBackground?: string;
    majorHistoricalEvents?: string;
    religiousClassifications?: string[];
  };
  heritageResearcher?: string; // uid
  lastHeritageUpdate?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  submittedBy?: string; // uid
  createdBy?: string; // uid
  // Status tracking fields
  lastReviewedBy?: string; // uid
  lastReviewNote?: string;
  lastStatusChange?: Timestamp;
}

const CHURCHES = 'churches';

export async function getChurchesByDiocese(diocese: Diocese, statuses?: ChurchStatus[]): Promise<Church[]> {
  try {
    const col = collection(db, CHURCHES);
    const clauses: QueryConstraint[] = [where('diocese', '==', diocese)];

    if (statuses && statuses.length === 1) {
      clauses.push(where('status', '==', statuses[0]));
    }
    // For multiple statuses, Firestore requires 'in' with max 10 items
    if (statuses && statuses.length > 1) {
      clauses.push(where('status', 'in', statuses));
    }

    // Try with ordering first, fall back without ordering if it fails
    try {
      const q = query(col, ...clauses, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Church, 'id'>) }));
    } catch (orderError) {
      console.warn('Churches query failed with ordering, retrying without ordering:', orderError);
      // Fallback query without ordering
      const q = query(col, ...clauses);
      const snap = await getDocs(q);
      const churches = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Church, 'id'>) }));
      // Sort in memory as fallback
      return churches.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });
    }
  } catch (error) {
    console.error('Error fetching churches by diocese:', error);
    return [];
  }
}

export async function getChurchesByParish(parishId: string, statuses?: ChurchStatus[]): Promise<Church[]> {
  const col = collection(db, CHURCHES);
  const clauses: QueryConstraint[] = [where('parishId', '==', parishId)];
  if (statuses && statuses.length === 1) clauses.push(where('status', '==', statuses[0]));
  if (statuses && statuses.length > 1) clauses.push(where('status', 'in', statuses));
  const q = query(col, ...clauses, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Church, 'id'>) }));
}

export async function getChurchesByStatus(statuses: ChurchStatus[]): Promise<Church[]> {
  const col = collection(db, CHURCHES);
  const clauses: QueryConstraint[] = [];
  if (statuses && statuses.length === 1) clauses.push(where('status', '==', statuses[0]));
  if (statuses && statuses.length > 1) clauses.push(where('status', 'in', statuses));
  const q = query(col, ...clauses, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Church, 'id'>) }));
}

export async function createChurch(data: Omit<Church, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: ChurchStatus }) {
  if (!data.parishId) throw new Error('parishId is required to create a church');
  
  // Check for duplicate church name within the same municipality and diocese
  if (data.name && data.municipality) {
    const col = collection(db, CHURCHES);
    const duplicateCheck = query(
      col,
      where('diocese', '==', data.diocese),
      where('name', '==', data.name),
      where('municipality', '==', data.municipality)
    );
    const existingChurches = await getDocs(duplicateCheck);
    
    if (!existingChurches.empty) {
      throw new Error(`A church named "${data.name}" already exists in ${data.municipality}, ${data.diocese} diocese. Churches must have unique names within the same municipality.`);
    }
  }
  
  const payload = {
    ...data,
    status: data.status ?? 'pending' as ChurchStatus,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  // Use auto-generated ID to allow multiple churches per parish
  const ref = await addDoc(collection(db, CHURCHES), payload);
  return ref.id;
}

export async function submitChurchForReview(churchId: string) {
  const ref = doc(db, CHURCHES, churchId);
  await updateDoc(ref, { status: 'pending', updatedAt: Timestamp.now() });
}

export type ChurchUpdate = Partial<Pick<Church,
  'name' | 'municipality' | 'foundedYear' | 'address' | 'latitude' | 'longitude' |
  'architecturalStyle' | 'historicalBackground' | 'massSchedules' | 'assignedPriest' | 'classification' |
  'culturalSignificance' | 'heritageNotes' | 'heritageValidation' | 'heritageDeclaration' | 'heritageResearcher' | 'lastHeritageUpdate'
>>;

export async function updateChurch(churchId: string, data: ChurchUpdate) {
  const ref = doc(db, CHURCHES, churchId);
  await updateDoc(ref, { ...data, updatedAt: Timestamp.now() });
}

export async function updateChurchStatus(
  churchId: string,
  status: ChurchStatus,
  note?: string,
  reviewerUid?: string,
  userProfile?: UserProfile
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current church data
    const ref = doc(db, CHURCHES, churchId);
    const churchSnap = await getDoc(ref);

    if (!churchSnap.exists()) {
      return { success: false, error: 'Church not found' };
    }

    const churchData = { id: churchSnap.id, ...churchSnap.data() } as Church;
    const currentStatus = churchData.status;

    // If no userProfile provided, fallback to basic update (legacy compatibility)
    if (!userProfile) {
      await updateDoc(ref, {
        status,
        updatedAt: Timestamp.now(),
        lastReviewedBy: reviewerUid || null,
        lastReviewNote: note || null,
      });
      return { success: true };
    }

    // Use workflow state machine for validation and logging
    const workflowContext: WorkflowContext = {
      churchId,
      currentStatus,
      targetStatus: status,
      userProfile,
      note,
      metadata: {
        reviewerUid,
        isAutomated: false
      }
    };

    // Validate and execute transition
    const result = await workflowStateMachine.executeTransition(workflowContext);

    if (!result.success) {
      return result;
    }

    // Update church document
    const updateData = {
      status,
      updatedAt: Timestamp.now(),
      lastReviewedBy: reviewerUid || userProfile.uid,
      lastReviewNote: note || null,
      lastStatusChange: Timestamp.now()
    };

    console.log('Attempting to update church document:', churchId, updateData);
    await updateDoc(ref, updateData);
    console.log('Church document updated successfully');

    return { success: true };

  } catch (error) {
    console.error('Error updating church status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Enhanced church status update with automatic heritage detection
 */
export async function updateChurchStatusWithValidation(
  churchId: string,
  targetStatus: ChurchStatus,
  userProfile: UserProfile,
  note?: string
): Promise<{ success: boolean; error?: string; autoForwarded?: boolean }> {
  try {
    // Get current church data
    const churchData = await getChurch(churchId);
    if (!churchData) {
      return { success: false, error: 'Church not found' };
    }

    let finalStatus = targetStatus;
    let autoForwarded = false;
    let finalNote = note;

    // Smart heritage detection logic
    if (targetStatus === 'approved' && userProfile.role === 'chancery_office') {
      // Check if church should go to heritage review instead
      if (shouldRequireHeritageReview(churchData)) {
        finalStatus = 'heritage_review';
        autoForwarded = true;
        finalNote = `Automatically forwarded to heritage review due to heritage indicators. ${note || ''}`.trim();
      }
    }

    // Execute the status update
    const result = await updateChurchStatus(
      churchId,
      finalStatus,
      finalNote,
      userProfile.uid,
      userProfile
    );

    return {
      ...result,
      autoForwarded
    };

  } catch (error) {
    console.error('Error in enhanced status update:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get a single church by ID
 */
export async function getChurch(churchId: string): Promise<Church | null> {
  try {
    const ref = doc(db, CHURCHES, churchId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return null;
    }

    return { id: snap.id, ...snap.data() as Omit<Church, 'id'> };
  } catch (error) {
    console.error('Error getting church:', error);
    return null;
  }
}

// Optional: seed a few sample churches for a diocese in dev
export async function seedSampleChurches(diocese: Diocese) {
  const samples: Omit<Church, 'id'>[] = [
    { name: 'St. Joseph the Worker Parish', municipality: 'Sample Town', diocese, status: 'pending', classification: 'non-heritage' },
    { name: 'Our Lady of the Holy Rosary', municipality: 'San Miguel', diocese, status: 'approved', classification: 'ICP' },
  ];
  for (const item of samples) {
    const id = crypto.randomUUID();
    await setDoc(doc(db, CHURCHES, id), {
      ...item,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }
}
