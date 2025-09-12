import { db } from '@/lib/firebase';
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc, type Timestamp } from 'firebase/firestore';
import type { Diocese } from '@/contexts/AuthContext';

export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface ParishInvite {
  id?: string;
  type: 'parish_secretary';
  diocese: Diocese;
  parishName: string;
  parishId?: string; // optional if you later model parishes
  email: string;
  status: InviteStatus;
  token: string; // simple random token displayed to user; kept in doc for now
  createdAt: Timestamp | null;
  createdBy: { uid: string; email: string; name?: string };
  acceptedAt?: Timestamp | null;
  acceptedBy?: { uid: string; email: string; name?: string };
}

const randomToken = (len = 8) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
};

export async function createParishInvite(params: {
  diocese: Diocese;
  parishName: string;
  email: string;
  createdBy: { uid: string; email: string; name?: string };
  parishId?: string;
}): Promise<{ id: string; token: string }> {
  const token = randomToken();
  const payload: Omit<ParishInvite, 'id'> = {
    type: 'parish_secretary',
    diocese: params.diocese,
    parishName: params.parishName,
    parishId: params.parishId,
    email: params.email.toLowerCase().trim(),
    status: 'pending',
    token,
    createdAt: serverTimestamp(),
    createdBy: params.createdBy,
  };
  const ref = await addDoc(collection(db, 'invites'), payload);
  return { id: ref.id, token };
}

export async function getInvite(inviteId: string) {
  const snap = await getDoc(doc(db, 'invites', inviteId));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as ParishInvite) }) : null;
}

export async function markInviteAccepted(inviteId: string, by: { uid: string; email: string; name?: string }) {
  await updateDoc(doc(db, 'invites', inviteId), {
    status: 'accepted',
    acceptedAt: serverTimestamp(),
    acceptedBy: by,
  });
}
