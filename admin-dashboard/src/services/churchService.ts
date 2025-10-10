import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, Timestamp, onSnapshot, collection, query, where } from 'firebase/firestore';
import type { Church } from '@/types/church';

export class ChurchService {
  static async createChurch(data: any, diocese: string, userId: string, parishId: string): Promise<string> {
    try {
      const churchRef = doc(db, 'churches', parishId);

      await setDoc(churchRef, {
        ...data,
        diocese,
        parishId,
        submittedBy: userId,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      return parishId;
    } catch (error) {
      console.error('Error creating church:', error);
      throw error;
    }
  }

  static async updateChurch(churchId: string, data: any, diocese: string, userId: string): Promise<void> {
    try {
      const churchRef = doc(db, 'churches', churchId);

      await updateDoc(churchRef, {
        ...data,
        diocese,
        submittedBy: userId,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating church:', error);
      throw error;
    }
  }

  static async getChurchByParish(parishId: string): Promise<Church | null> {
    try {
      const churchRef = doc(db, 'churches', parishId);
      const churchSnap = await getDoc(churchRef);

      if (churchSnap.exists()) {
        return { id: churchSnap.id, ...churchSnap.data() } as Church;
      }
      return null;
    } catch (error) {
      console.error('Error fetching church:', error);
      throw error;
    }
  }

  // Alias for getChurchByParish
  static async getChurch(parishId: string): Promise<Church | null> {
    return this.getChurchByParish(parishId);
  }

  // Real-time subscription to churches collection
  static subscribeToChurches(
    callback: (churches: Church[]) => void,
    diocese?: string
  ): () => void {
    try {
      const churchesRef = collection(db, 'churches');
      let q = query(churchesRef);

      // Filter by diocese if provided
      if (diocese) {
        q = query(churchesRef, where('diocese', '==', diocese));
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const churches = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Church[];

        callback(churches);
      }, (error) => {
        console.error('Error in church subscription:', error);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up church subscription:', error);
      return () => {}; // Return empty unsubscribe function
    }
  }
}
