import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp, runTransaction } from 'firebase/firestore';
import type { VirtualTour, TourScene, TourHotspot } from '@/types/virtualTour';

export class VirtualTourService {
  /**
   * Get virtual tour for a church
   */
  static async getVirtualTour(churchId: string): Promise<VirtualTour | null> {
    try {
      const churchDoc = await getDoc(doc(db, 'churches', churchId));
      if (!churchDoc.exists()) {
        throw new Error('Church not found');
      }

      const data = churchDoc.data();
      return data.virtualTour || null;
    } catch (error) {
      console.error('[VirtualTourService] Error fetching tour:', error);
      throw error;
    }
  }

  /**
   * Save virtual tour for a church
   */
  static async saveVirtualTour(
    churchId: string,
    tour: VirtualTour
  ): Promise<void> {
    try {
      console.log('[VirtualTourService] Saving tour:', tour);

      const churchRef = doc(db, 'churches', churchId);
      await updateDoc(churchRef, {
        virtualTour: tour,
        updatedAt: Timestamp.now(),
      });

      console.log('[VirtualTourService] ✓ Tour saved successfully');
    } catch (error) {
      console.error('[VirtualTourService] ✗ Error saving tour:', error);
      throw error;
    }
  }

  /**
   * Update a specific scene's hotspots
   */
  static async updateSceneHotspots(
    churchId: string,
    sceneId: string,
    hotspots: TourHotspot[]
  ): Promise<void> {
    try {
      // Get current tour
      const tour = await this.getVirtualTour(churchId);
      if (!tour) {
        throw new Error('No virtual tour found for this church');
      }

      // Update the scene's hotspots
      const updatedScenes = tour.scenes.map((scene) =>
        scene.id === sceneId ? { ...scene, hotspots } : scene
      );

      // Save updated tour
      await this.saveVirtualTour(churchId, { scenes: updatedScenes });
    } catch (error) {
      console.error('[VirtualTourService] Error updating hotspots:', error);
      throw error;
    }
  }

  /**
   * Set the start scene
   */
  static async setStartScene(
    churchId: string,
    sceneId: string
  ): Promise<void> {
    try {
      const tour = await this.getVirtualTour(churchId);
      if (!tour) {
        throw new Error('No virtual tour found for this church');
      }

      // Update isStartScene for all scenes
      const updatedScenes = tour.scenes.map((scene) => ({
        ...scene,
        isStartScene: scene.id === sceneId,
      }));

      await this.saveVirtualTour(churchId, { scenes: updatedScenes });
    } catch (error) {
      console.error('[VirtualTourService] Error setting start scene:', error);
      throw error;
    }
  }

  /**
   * Add a new scene to the tour (atomic operation using Firestore transaction)
   */
  static async addScene(churchId: string, scene: TourScene): Promise<void> {
    try {
      const churchRef = doc(db, 'churches', churchId);

      await runTransaction(db, async (transaction) => {
        const churchDoc = await transaction.get(churchRef);

        if (!churchDoc.exists()) {
          throw new Error('Church not found');
        }

        const data = churchDoc.data();
        const currentTour = data.virtualTour as VirtualTour | undefined;

        // Add scene to existing tour or create new tour
        const updatedScenes = currentTour ? [...currentTour.scenes, scene] : [scene];

        // Update with transaction (ensures atomicity)
        transaction.update(churchRef, {
          virtualTour: { scenes: updatedScenes },
          updatedAt: Timestamp.now(),
        });

        console.log('[VirtualTourService] ✓ Scene added via transaction:', scene.title);
      });

      console.log('[VirtualTourService] ✓ Transaction committed successfully');
    } catch (error) {
      console.error('[VirtualTourService] ✗ Error adding scene:', error);
      throw error;
    }
  }

  /**
   * Delete a scene
   */
  static async deleteScene(churchId: string, sceneId: string): Promise<void> {
    try {
      const tour = await this.getVirtualTour(churchId);
      if (!tour) {
        throw new Error('No virtual tour found for this church');
      }

      // Remove the scene
      const updatedScenes = tour.scenes.filter(
        (scene) => scene.id !== sceneId
      );

      // If we deleted the start scene, make the first scene the start
      if (updatedScenes.length > 0) {
        const hasStartScene = updatedScenes.some((s) => s.isStartScene);
        if (!hasStartScene) {
          updatedScenes[0].isStartScene = true;
        }
      }

      await this.saveVirtualTour(churchId, { scenes: updatedScenes });
    } catch (error) {
      console.error('[VirtualTourService] Error deleting scene:', error);
      throw error;
    }
  }
}
