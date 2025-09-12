import { db } from '@/lib/firebase';
import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, setDoc, Timestamp, updateDoc, where, type QueryConstraint } from 'firebase/firestore';
import type { Diocese } from '@/contexts/AuthContext';

export type ChurchStatus = 'pending' | 'approved' | 'needs_revision' | 'heritage_review';

export interface Church {
  id: string;
  name: string;
  municipality?: string;
  parishId?: string;
  diocese: Diocese;
  status: ChurchStatus;
  classification?: 'ICP' | 'NCT' | 'non-heritage' | 'unknown';
  foundedYear?: number;
  // Parish-editable extended fields
  address?: string;
  latitude?: number;
  longitude?: number;
  architecturalStyle?: string;
  historicalBackground?: string;
  massSchedules?: string; // can be structured later
  assignedPriest?: string;
  // Heritage-related fields (museum researcher)
  culturalSignificance?: string;
  heritageNotes?: string;
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
  heritageResearcher?: string; // uid
  lastHeritageUpdate?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  submittedBy?: string; // uid
}

const CHURCHES = 'churches';

export async function getChurchesByDiocese(diocese: Diocese, statuses?: ChurchStatus[]): Promise<Church[]> {
  const col = collection(db, CHURCHES);
  const clauses: QueryConstraint[] = [where('diocese', '==', diocese)];
  if (statuses && statuses.length === 1) {
    clauses.push(where('status', '==', statuses[0]));
  }
  // For multiple statuses, Firestore requires 'in' with max 10 items
  if (statuses && statuses.length > 1) {
    clauses.push(where('status', 'in', statuses));
  }
  const q = query(col, ...clauses, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Church, 'id'>) }));
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
  const payload = {
    ...data,
    status: data.status ?? 'pending' as ChurchStatus,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  // Use parishId as the document ID to ensure one church per parish
  const ref = doc(db, CHURCHES, data.parishId);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new Error('Church already exists for this parish');
  }
  await setDoc(ref, payload);
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

export async function updateChurchStatus(churchId: string, status: ChurchStatus, note?: string, reviewerUid?: string) {
  const ref = doc(db, CHURCHES, churchId);
  await updateDoc(ref, {
    status,
    updatedAt: Timestamp.now(),
    lastReviewedBy: reviewerUid || null,
    lastReviewNote: note || null,
  });
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
