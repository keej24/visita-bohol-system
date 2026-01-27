import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc, Timestamp, runTransaction } from 'firebase/firestore';
import type { VirtualTour, TourScene, TourHotspot } from '@/types/virtualTour';

/**
 * Recursively removes undefined values from an object
 * Firestore doesn't accept undefined values
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const removeUndefinedValues = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedValues);
  }
  if (typeof obj === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cleanedObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleanedObj[key] = removeUndefinedValues(value);
      }
    }
    return cleanedObj;
  }
  return obj;
};

export class VirtualTourService {
  /**
   * Get virtual tour for a church
   * Returns null if the church doesn't exist or has no virtual tour
   */
  static async getVirtualTour(churchId: string): Promise<VirtualTour | null> {
    try {
      const churchDoc = await getDoc(doc(db, 'churches', churchId));
      if (!churchDoc.exists()) {
        // Church doesn't exist yet - return null instead of throwing
        // This allows the VirtualTourManager to render even for new churches
        console.log('[VirtualTourService] Church document not found, returning null');
        return null;
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

      // Clean undefined values before saving to Firestore
      const cleanedTour = removeUndefinedValues(tour);
      console.log('[VirtualTourService] Cleaned tour:', cleanedTour);

      const churchRef = doc(db, 'churches', churchId);
      await updateDoc(churchRef, {
        virtualTour: cleanedTour,
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
   * @param churchId - The church ID
   * @param scene - The scene to add
   * @param originalIndex - Optional: The intended position in the scene list (0 = first/start scene)
   * @param isFirstInBatch - Optional: Whether this is the first scene in a batch upload (should be start scene)
   * @param userInfo - Optional: User info for creating new church documents (required by Firestore rules)
   */
  static async addScene(
    churchId: string,
    scene: TourScene,
    originalIndex?: number,
    isFirstInBatch?: boolean,
    userInfo?: { diocese?: string; parishId?: string }
  ): Promise<void> {
    try {
      const churchRef = doc(db, 'churches', churchId);

      await runTransaction(db, async (transaction) => {
        const churchDoc = await transaction.get(churchRef);

        // Clean the scene to remove undefined values
        const cleanedScene = removeUndefinedValues(scene);

        let updatedScenes: TourScene[];
        
        if (!churchDoc.exists()) {
          // Church document doesn't exist yet - create it with the first scene
          // This handles the case where a user tries to upload 360° images before saving the church profile
          console.log('[VirtualTourService] Church document not found, creating new document with virtual tour');
          
          updatedScenes = [{
            ...cleanedScene,
            isStartScene: isFirstInBatch ?? (originalIndex === 0),
          }];
          
          // Create new church document with the virtual tour
          // Include diocese and parishId for Firestore security rules compliance
          const newChurchData: Record<string, unknown> = {
            virtualTour: removeUndefinedValues({ scenes: updatedScenes }),
            status: 'draft',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };
          
          // Add user info if available (required for parish secretary permissions)
          if (userInfo?.diocese) {
            newChurchData.diocese = userInfo.diocese;
          }
          if (userInfo?.parishId) {
            newChurchData.parishId = userInfo.parishId;
          }
          
          transaction.set(churchRef, newChurchData);
          
          console.log('[VirtualTourService] ✓ New church document created with scene:', scene.title);
          return;
        }

        const data = churchDoc.data();
        const currentTour = data.virtualTour as VirtualTour | undefined;
        
        if (!currentTour || currentTour.scenes.length === 0) {
          // First scene - create new tour, mark as start scene if first in batch
          updatedScenes = [{
            ...cleanedScene,
            isStartScene: isFirstInBatch ?? (originalIndex === 0),
          }];
        } else if (originalIndex !== undefined) {
          // Insert at the correct position based on original index
          // Count how many scenes from this batch are already in place
          const existingScenes = [...currentTour.scenes];
          
          // Find the correct insertion point
          // Scenes should be ordered by their original index
          let insertAt = existingScenes.length; // Default: append at end
          
          for (let i = 0; i < existingScenes.length; i++) {
            // We need to maintain order relative to other batch scenes
            // For simplicity, just append and we'll reorder after all uploads complete
            insertAt = existingScenes.length;
          }
          
          // Add the new scene with isStartScene=false (preserve existing start scene)
          existingScenes.splice(insertAt, 0, { ...cleanedScene, isStartScene: false });
          updatedScenes = existingScenes;
        } else {
          // No index specified, just append with isStartScene=false
          updatedScenes = [...currentTour.scenes, { ...cleanedScene, isStartScene: false }];
        }

        // Update with transaction (ensures atomicity)
        transaction.update(churchRef, {
          virtualTour: removeUndefinedValues({ scenes: updatedScenes }),
          updatedAt: Timestamp.now(),
        });

        console.log('[VirtualTourService] ✓ Scene added via transaction:', scene.title, 
          originalIndex !== undefined ? `(originalIndex: ${originalIndex})` : '');
      });

      console.log('[VirtualTourService] ✓ Transaction committed successfully');
    } catch (error) {
      console.error('[VirtualTourService] ✗ Error adding scene:', error);
      throw error;
    }
  }

  /**
   * Reorder scenes after batch upload completes to ensure correct order
   * This is called after all uploads finish to sort scenes by their original order
   */
  static async reorderScenesAfterBatchUpload(
    churchId: string,
    sceneOrderMap: Map<string, number> // Map of sceneId -> originalIndex
  ): Promise<void> {
    try {
      const tour = await this.getVirtualTour(churchId);
      if (!tour || tour.scenes.length === 0) return;

      // Separate scenes that have order info from those that don't
      const orderedScenes: Array<{ scene: TourScene; index: number }> = [];
      const unorderedScenes: TourScene[] = [];

      for (const scene of tour.scenes) {
        const originalIndex = sceneOrderMap.get(scene.id);
        if (originalIndex !== undefined) {
          orderedScenes.push({ scene, index: originalIndex });
        } else {
          unorderedScenes.push(scene);
        }
      }

      // Sort by original index
      orderedScenes.sort((a, b) => a.index - b.index);

      // Combine: existing scenes (not in batch) + newly ordered scenes
      const reorderedScenes = [
        ...unorderedScenes, // Keep existing scenes at the start
        ...orderedScenes.map((o) => o.scene),
      ];

      // Ensure the first scene from the batch is the start scene
      // (only if there were no existing scenes before)
      if (unorderedScenes.length === 0 && reorderedScenes.length > 0) {
        const firstSceneId = reorderedScenes[0].id;
        const finalScenes = reorderedScenes.map((s) => ({
          ...s,
          isStartScene: s.id === firstSceneId,
        }));
        await this.saveVirtualTour(churchId, { scenes: finalScenes });
      } else {
        await this.saveVirtualTour(churchId, { scenes: reorderedScenes });
      }

      console.log('[VirtualTourService] ✓ Scenes reordered after batch upload');
    } catch (error) {
      console.error('[VirtualTourService] ✗ Error reordering scenes:', error);
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
