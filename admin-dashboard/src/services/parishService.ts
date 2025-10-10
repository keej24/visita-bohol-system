import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import type { Diocese } from '@/contexts/AuthContext';

export interface Parish {
  id: string;
  name: string;
  diocese: Diocese;
  municipality?: string;
  priest?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export class ParishService {
  private static readonly COLLECTION = 'parishes';

  /**
   * Get all parishes for a specific diocese
   */
  static async getParishesForDiocese(diocese: Diocese): Promise<Parish[]> {
    try {
      const parishesQuery = query(
        collection(db, this.COLLECTION),
        where('diocese', '==', diocese)
      );

      const snapshot = await getDocs(parishesQuery);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Parish[];
    } catch (error) {
      console.error('Error fetching parishes:', error);
      throw new Error('Failed to fetch parishes');
    }
  }

  /**
   * Get total parish count for a diocese
   */
  static async getParishCountForDiocese(diocese: Diocese): Promise<number> {
    try {
      const parishes = await this.getParishesForDiocese(diocese);
      return parishes.length;
    } catch (error) {
      console.error('Error getting parish count:', error);
      return 0;
    }
  }

  /**
   * Get all parishes across both dioceses
   */
  static async getAllParishes(): Promise<Parish[]> {
    try {
      const snapshot = await getDocs(collection(db, this.COLLECTION));

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Parish[];
    } catch (error) {
      console.error('Error fetching all parishes:', error);
      throw new Error('Failed to fetch parishes');
    }
  }

  /**
   * Get active users count for a diocese (users who logged in within last 30 days)
   */
  static async getActiveUsersCountForDiocese(diocese: Diocese): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const usersQuery = query(
        collection(db, 'users'),
        where('diocese', '==', diocese),
        where('lastLogin', '>=', Timestamp.fromDate(thirtyDaysAgo))
      );

      const snapshot = await getDocs(usersQuery);
      return snapshot.docs.length;
    } catch (error) {
      console.error('Error getting active users count:', error);
      // Return 0 instead of throwing to prevent dashboard failure
      return 0;
    }
  }
}
