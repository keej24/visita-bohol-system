import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Trash2, Star, Edit, Eye, Navigation, Pencil, Check } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { VirtualTourService } from '@/services/virtualTourService';
import type { VirtualTour, TourScene, Uploaded360Image } from '@/types/virtualTour';
import { HotspotEditor } from './HotspotEditor';

interface VirtualTourManagerProps {
  churchId: string;
  churchName: string;
}

// Image compression utility
async function compressImage(file: File, maxSizeMB: number = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        // Calculate new dimensions (max 4096px for 360° images)
        let width = img.width;
        let height = img.height;
        const maxDimension = 4096;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        // Try different quality levels until file size is acceptable
        let quality = 0.85;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Compression failed'));
                return;
              }

              const sizeMB = blob.size / 1024 / 1024;
              if (sizeMB > maxSizeMB && quality > 0.5) {
                quality -= 0.05;
                tryCompress();
              } else {
                console.log(`[Compression] ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${sizeMB.toFixed(2)}MB (${quality * 100}% quality)`);
                resolve(blob);
              }
            },
            'image/jpeg',
            quality
          );
        };

        tryCompress();
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

export function VirtualTourManager({ churchId, churchName }: VirtualTourManagerProps) {
  const [tour, setTour] = useState<VirtualTour | null>(null);
  const [uploadingImages, setUploadingImages] = useState<Uploaded360Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [previewSceneId, setPreviewSceneId] = useState<string | null>(null);
  const [brokenImageScenes, setBrokenImageScenes] = useState<Set<string>>(new Set());
  const [savingSceneId, setSavingSceneId] = useState<string | null>(null);
  const [savedSceneId, setSavedSceneId] = useState<string | null>(null);
  const titleDebounceRef = useRef<{ [sceneId: string]: NodeJS.Timeout }>({});

  // Load existing tour
  useEffect(() => {
    loadTour();
  }, [churchId]);

  const loadTour = useCallback(async () => {
    try {
      setLoading(true);
      const existingTour = await VirtualTourService.getVirtualTour(churchId);
      setTour(existingTour);
      console.log('[VirtualTourManager] Loaded tour:', existingTour);

      // Check for broken images (using image loading instead of fetch to avoid CORS issues)
      if (existingTour) {
        const broken = new Set<string>();

        // Use Promise.allSettled to check all images in parallel
        const imageChecks = existingTour.scenes.map((scene) => {
          return new Promise<{ sceneId: string; isBroken: boolean }>((resolve) => {
            const img = new Image();

            // Set a timeout to avoid hanging
            const timeout = setTimeout(() => {
              console.warn(`[VirtualTourManager] Scene "${scene.title}" image check timeout`);
              resolve({ sceneId: scene.id, isBroken: true });
            }, 5000);

            img.onload = () => {
              clearTimeout(timeout);
              resolve({ sceneId: scene.id, isBroken: false });
            };

            img.onerror = (err) => {
              clearTimeout(timeout);
              console.warn(`[VirtualTourManager] Scene "${scene.title}" has broken image`);
              resolve({ sceneId: scene.id, isBroken: true });
            };

            // Trigger the load
            img.src = scene.imageUrl;
          });
        });

        const results = await Promise.allSettled(imageChecks);
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.isBroken) {
            broken.add(result.value.sceneId);
          }
        });

        setBrokenImageScenes(broken);

        if (broken.size > 0) {
          console.warn(`[VirtualTourManager] Found ${broken.size} scene(s) with broken images`);
        } else {
          console.log('[VirtualTourManager] All scene images are accessible');
        }
      }
    } catch (error) {
      console.error('[VirtualTourManager] Error loading tour:', error);
    } finally {
      setLoading(false);
    }
  }, [churchId]);

  // Handle file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const MAX_SCENES = 8;
    const currentSceneCount = tour?.scenes.length || 0;
    const filesArray = Array.from(files);

    console.log(`[VirtualTourManager] Selected ${filesArray.length} file(s) for upload`);
    console.log(`[VirtualTourManager] Current scenes: ${currentSceneCount}/${MAX_SCENES}`);

    // Check if adding these files would exceed the limit
    const remainingSlots = MAX_SCENES - currentSceneCount;

    if (remainingSlots <= 0) {
      alert(`Maximum of ${MAX_SCENES} scenes allowed. Please delete some scenes before uploading more.`);
      e.target.value = '';
      return;
    }

    if (filesArray.length > remainingSlots) {
      const allowedCount = remainingSlots;
      alert(
        `You can only upload ${allowedCount} more scene(s). ` +
        `Currently: ${currentSceneCount}/${MAX_SCENES} scenes. ` +
        `Selected: ${filesArray.length} files.\n\n` +
        `Uploading first ${allowedCount} file(s) only.`
      );
      // Only take the first N files that fit within the limit
      filesArray.splice(allowedCount);
    }

    console.log(`[VirtualTourManager] Uploading ${filesArray.length} file(s)`);

    const newUploads: Uploaded360Image[] = filesArray.map((file) => ({
      id: `upload-${Date.now()}-${Math.random()}`,
      file,
      url: '',
      uploadProgress: 0,
      uploading: true,
    }));

    setUploadingImages((prev) => [...prev, ...newUploads]);

    // Start uploading each file
    for (const upload of newUploads) {
      uploadImage(upload);
    }

    // Reset input
    e.target.value = '';
  }, [churchId, tour]);

  // Upload image to Firebase Storage with compression
  const uploadImage = useCallback(async (upload: Uploaded360Image) => {
    if (!upload.file) return;

    try {
      console.log(`[VirtualTourManager] Starting upload: ${upload.file.name}`);

      // Compress image
      setUploadingImages((prev) =>
        prev.map((img) =>
          img.id === upload.id ? { ...img, uploadProgress: 5 } : img
        )
      );

      const compressedBlob = await compressImage(upload.file, 2);

      setUploadingImages((prev) =>
        prev.map((img) =>
          img.id === upload.id ? { ...img, uploadProgress: 10 } : img
        )
      );

      // Upload to Firebase Storage
      // Sanitize filename: remove spaces and special characters
      const cleanFileName = upload.file.name
        .replace(/\s+/g, '-')           // Replace spaces with hyphens
        .replace(/[^a-zA-Z0-9._-]/g, '') // Remove special characters except . _ -
        .toLowerCase();                  // Lowercase for consistency

      const fileName = `${Date.now()}-${cleanFileName}`;

      // Firebase Storage handles special characters in paths natively
      const storagePath = `churches/${churchId}/360/${fileName}`;
      console.log('[VirtualTourManager] Upload path:', storagePath);

      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, compressedBlob, {
        contentType: 'image/jpeg',
        customMetadata: {
          originalName: upload.file.name,
          churchId: churchId,
          uploadedAt: new Date().toISOString(),
        },
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = 10 + (snapshot.bytesTransferred / snapshot.totalBytes) * 90;
          setUploadingImages((prev) =>
            prev.map((img) =>
              img.id === upload.id ? { ...img, uploadProgress: progress } : img
            )
          );
        },
        (error) => {
          console.error('[VirtualTourManager] Upload error:', error);
          console.error('[VirtualTourManager] Error code:', error.code);
          console.error('[VirtualTourManager] Error message:', error.message);
          console.error('[VirtualTourManager] Upload path:', storagePath);

          let errorMsg = error.message;
          if (error.code === 'storage/unauthorized') {
            errorMsg = 'Permission denied. Check Firebase Storage rules.';
          } else if (error.code === 'storage/canceled') {
            errorMsg = 'Upload canceled.';
          } else if (error.code === 'storage/unknown') {
            errorMsg = 'Upload failed. Please check your internet connection and try again.';
          } else if (error.code === 'storage/quota-exceeded') {
            errorMsg = 'Storage quota exceeded.';
          }

          setUploadingImages((prev) =>
            prev.map((img) =>
              img.id === upload.id
                ? { ...img, uploading: false, error: errorMsg }
                : img
            )
          );
        },
        async () => {
          // Upload complete
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('[VirtualTourManager] Upload complete:', url);

          // Create new scene
          const newScene: TourScene = {
            id: `scene-${Date.now()}-${Math.random()}`,
            title: upload.file?.name.replace(/\.[^/.]+$/, '') || 'New Scene',
            imageUrl: url,
            isStartScene: false, // We'll determine this based on position
            hotspots: [],
          };

          try {
            // Use atomic transaction-based addScene to prevent race conditions during parallel uploads
            console.log('[VirtualTourManager] Saving scene to Firestore:', newScene.title);
            await VirtualTourService.addScene(churchId, newScene);
            console.log('[VirtualTourManager] ✓ Scene saved to Firestore successfully');

            // Remove from uploading list
            setUploadingImages((prev) => prev.filter((img) => img.id !== upload.id));

            // Reload tour to ensure UI is in sync with Firestore
            console.log('[VirtualTourManager] Reloading tour data...');
            await loadTour();

            console.log('[VirtualTourManager] ✓✓ Scene uploaded and tour refreshed - should be visible now');
          } catch (error: any) {
            console.error('[VirtualTourManager] ✗ Error saving scene to Firestore:', error);
            console.error('[VirtualTourManager] Error details:', {
              message: error?.message,
              code: error?.code,
              stack: error?.stack,
            });

            setUploadingImages((prev) =>
              prev.map((img) =>
                img.id === upload.id
                  ? { ...img, uploading: false, error: `Failed to save: ${error?.message || 'Unknown error'}` }
                  : img
              )
            );

            // Show alert to user
            alert(`Failed to save scene "${newScene.title}" to database: ${error?.message || 'Unknown error'}`);
          }
        }
      );
    } catch (error: any) {
      console.error('[VirtualTourManager] Upload process error:', error);
      console.error('[VirtualTourManager] Error details:', {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });

      setUploadingImages((prev) =>
        prev.map((img) =>
          img.id === upload.id
            ? {
                ...img,
                uploading: false,
                error: error?.message || 'Upload failed. Please try again.',
              }
            : img
        )
      );
    }
  }, [churchId, loadTour]);

  // Update scene title
  const handleUpdateTitle = useCallback((sceneId: string, newTitle: string) => {
    if (!tour) return;

    // Update UI immediately for responsive feel
    const updatedScenes = tour.scenes.map((scene) =>
      scene.id === sceneId ? { ...scene, title: newTitle } : scene
    );
    setTour({ scenes: updatedScenes });

    // Clear existing timeout for this scene
    if (titleDebounceRef.current[sceneId]) {
      clearTimeout(titleDebounceRef.current[sceneId]);
    }

    // Clear "Saved" indicator when user types
    if (savedSceneId === sceneId) {
      setSavedSceneId(null);
    }

    // Debounce the save operation (500ms after user stops typing)
    titleDebounceRef.current[sceneId] = setTimeout(async () => {
      try {
        setSavingSceneId(sceneId);
        await VirtualTourService.saveVirtualTour(churchId, { scenes: updatedScenes });
        console.log(`[VirtualTourManager] Scene title updated: "${newTitle}"`);

        // Show "Saved" indicator
        setSavingSceneId(null);
        setSavedSceneId(sceneId);

        // Hide "Saved" indicator after 2 seconds
        setTimeout(() => {
          setSavedSceneId((prev) => prev === sceneId ? null : prev);
        }, 2000);
      } catch (error) {
        console.error('[VirtualTourManager] Error updating title:', error);
        setSavingSceneId(null);
        alert('Failed to save title. Please try again.');
      }
    }, 500);
  }, [churchId, tour, savedSceneId]);

  // Delete scene
  const handleDeleteScene = useCallback(async (scene: TourScene) => {
    if (!confirm(`Delete scene "${scene.title}"? This will remove it from the tour and attempt to delete the image from storage.`)) {
      return;
    }

    try {
      // Try to delete from storage (but continue if file doesn't exist)
      try {
        const storageRef = ref(storage, scene.imageUrl);
        await deleteObject(storageRef);
        console.log('[VirtualTourManager] Storage file deleted successfully');
      } catch (storageError: any) {
        // If file doesn't exist (404), that's fine - it may have been manually deleted
        if (storageError?.code === 'storage/object-not-found') {
          console.warn('[VirtualTourManager] Storage file not found (already deleted), continuing with Firestore cleanup');
        } else {
          // For other storage errors, log but continue with Firestore deletion
          console.warn('[VirtualTourManager] Storage deletion failed:', storageError);
        }
      }

      // Always delete from Firestore (even if Storage deletion failed)
      await VirtualTourService.deleteScene(churchId, scene.id);
      await loadTour();

      console.log('[VirtualTourManager] Scene deleted successfully from tour');
    } catch (error) {
      console.error('[VirtualTourManager] Error deleting scene from Firestore:', error);
      alert('Failed to delete scene from database. Please try again.');
    }
  }, [churchId, loadTour]);

  // Open hotspot editor
  const handleOpenHotspotEditor = useCallback((sceneId: string) => {
    setEditingSceneId(sceneId);
  }, []);

  // Close hotspot editor
  const handleCloseHotspotEditor = useCallback(() => {
    setEditingSceneId(null);
    loadTour(); // Reload to get updated hotspots
  }, [loadTour]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const editingScene = tour?.scenes.find((s) => s.id === editingSceneId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Virtual Tour Manager</h3>
          <p className="text-sm text-gray-600">
            Upload 360° panoramic images and add navigation hotspots (Max: 8 scenes)
          </p>
        </div>
        <div className="text-sm">
          <span className={`font-semibold ${(tour?.scenes.length || 0) >= 8 ? 'text-red-600' : 'text-gray-900'}`}>
            {tour?.scenes.length || 0} / 8 scenes
          </span>
          {(tour?.scenes.length || 0) < 8 && (
            <span className="text-gray-500 ml-2">
              ({8 - (tour?.scenes.length || 0)} remaining)
            </span>
          )}
        </div>
      </div>

      {/* Upload Section */}
      {(tour?.scenes.length || 0) < 8 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
          <label className="flex flex-col items-center cursor-pointer">
            <Upload className="w-12 h-12 text-gray-400 mb-2" />
            <span className="text-sm font-medium text-gray-700">Upload 360° Images</span>
            <span className="text-xs text-gray-500 mt-1">
              Click to select equirectangular panoramic images (images will be compressed)
            </span>
            <span className="text-xs text-blue-600 mt-1 font-medium">
              ✓ Multiple files supported • Max 8 scenes total
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="border-2 border-dashed border-red-300 rounded-lg p-6 bg-red-50">
          <div className="flex flex-col items-center">
            <Upload className="w-12 h-12 text-red-400 mb-2" />
            <span className="text-sm font-medium text-red-700">Maximum scenes reached (8/8)</span>
            <span className="text-xs text-red-600 mt-1">
              Please delete some scenes before uploading more
            </span>
          </div>
        </div>
      )}

      {/* Uploading Images */}
      {uploadingImages.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploading...</h4>
          {uploadingImages.map((upload) => (
            <div key={upload.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-700">{upload.file?.name}</span>
                <span className="text-xs text-gray-500">
                  {Math.round(upload.uploadProgress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${upload.uploadProgress}%` }}
                />
              </div>
              {upload.error && (
                <p className="text-xs text-red-600 mt-1">{upload.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Scene List */}
      {tour && tour.scenes.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Scenes</h4>
          {tour.scenes.map((scene, index) => (
            <div
              key={scene.id}
              className={`bg-white border rounded-lg p-4 ${
                index === 0 ? 'border-green-500 border-2' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Scene Number */}
                <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-700">
                  {index + 1}
                </div>

                {/* Scene Info */}
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 flex items-center gap-1 group">
                      <input
                        type="text"
                        value={scene.title}
                        onChange={(e) => handleUpdateTitle(scene.id, e.target.value)}
                        className="flex-1 text-sm font-medium text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-green-500 outline-none px-1 -ml-1 transition-colors"
                        placeholder="Enter scene name..."
                        title="Click to edit scene name"
                      />
                      <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      {savingSceneId === scene.id && (
                        <span className="text-xs text-gray-500 flex-shrink-0">Saving...</span>
                      )}
                      {savedSceneId === scene.id && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 flex-shrink-0">
                          <Check className="w-3 h-3" />
                          Saved
                        </span>
                      )}
                    </div>
                    {index === 0 && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded flex-shrink-0">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Start Scene
                      </span>
                    )}
                    {brokenImageScenes.has(scene.id) && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded flex-shrink-0">
                        ⚠️ Image Missing
                      </span>
                    )}
                  </div>

                  {/* Hotspot Count */}
                  <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                    <span className="flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      {scene.hotspots.length} hotspot{scene.hotspots.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Image URL Preview */}
                  <div className="text-xs text-gray-500 truncate mb-3">
                    {scene.imageUrl.substring(0, 80)}...
                  </div>

                  {/* Broken Image Warning */}
                  {brokenImageScenes.has(scene.id) && (
                    <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded mb-3">
                      ⚠️ The image file is missing from storage. You can safely delete this scene or re-upload the image.
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenHotspotEditor(scene.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Hotspots
                    </button>

                    <button
                      onClick={() => setPreviewSceneId(scene.id)}
                      disabled={brokenImageScenes.has(scene.id)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        brokenImageScenes.has(scene.id)
                          ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                          : 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                      }`}
                      title={brokenImageScenes.has(scene.id) ? 'Cannot preview - image missing' : 'Preview 360° scene'}
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </button>

                    <button
                      onClick={() => handleDeleteScene(scene)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors ml-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">No scenes uploaded yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Upload 360° panoramic images to get started
          </p>
        </div>
      )}

      {/* Hotspot Editor Modal */}
      {editingScene && (
        <HotspotEditor
          scene={editingScene}
          allScenes={tour?.scenes || []}
          churchId={churchId}
          onClose={handleCloseHotspotEditor}
        />
      )}

      {/* Preview Modal with Interactive 360° Viewer */}
      {previewSceneId && (
        <Preview360Modal
          scene={tour?.scenes.find((s) => s.id === previewSceneId)!}
          onClose={() => setPreviewSceneId(null)}
        />
      )}
    </div>
  );
}

// Interactive 360° Preview Modal Component
function Preview360Modal({ scene, onClose }: { scene: TourScene; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const viewerRef = useRef<any>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let mounted = true;

    const initViewer = () => {
      if (!mounted) return;

      const container = document.getElementById('preview-360-viewer-container');
      if (!container) {
        console.warn('[Preview360Modal] Container not found, retrying...');
        setTimeout(initViewer, 50);
        return;
      }

      try {
        const pannellum = (window as any).pannellum;

        if (!pannellum) {
          setError('Pannellum library failed to load');
          setLoading(false);
          return;
        }

        console.log('[Preview360Modal] Initializing viewer for:', scene.title);
        console.log('[Preview360Modal] Image URL:', scene.imageUrl);

        // Destroy existing viewer if any
        if (viewerRef.current) {
          try {
            viewerRef.current.destroy();
          } catch (e) {
            console.warn('[Preview360Modal] Error destroying previous viewer:', e);
          }
        }

        // Set a timeout in case the image never loads
        loadTimeoutRef.current = setTimeout(() => {
          if (mounted && loading) {
            console.error('[Preview360Modal] Load timeout - image may be too large or inaccessible');
            setError('Loading timeout. The image may be too large or inaccessible.');
            setLoading(false);
          }
        }, 15000); // 15 second timeout

        // Create new viewer using container ID
        viewerRef.current = pannellum.viewer('preview-360-viewer-container', {
          type: 'equirectangular',
          panorama: scene.imageUrl,
          autoLoad: true,
          showControls: true,
          showFullscreenCtrl: false,
          showZoomCtrl: true,
          mouseZoom: true,
          draggable: true,
          keyboardZoom: true,
          friction: 0.15,
        });

        console.log('[Preview360Modal] Viewer created, waiting for load...');

        // Manually attach load event listener
        viewerRef.current.on('load', () => {
          console.log('[Preview360Modal] Panorama loaded successfully');
          if (mounted) {
            if (loadTimeoutRef.current) {
              clearTimeout(loadTimeoutRef.current);
            }
            setLoading(false);
            setError(null);
          }
        });

        // Manually attach error event listener
        viewerRef.current.on('error', (err: string) => {
          console.error('[Preview360Modal] Panorama load error:', err);
          if (mounted) {
            if (loadTimeoutRef.current) {
              clearTimeout(loadTimeoutRef.current);
            }
            setError('Failed to load 360° image. The file may be corrupted or inaccessible.');
            setLoading(false);
          }
        });

        // Also try to detect load completion after a short delay
        // (fallback in case events don't fire)
        setTimeout(() => {
          if (mounted && loading) {
            console.log('[Preview360Modal] Fallback: Assuming viewer loaded');
            if (loadTimeoutRef.current) {
              clearTimeout(loadTimeoutRef.current);
            }
            setLoading(false);
          }
        }, 3000);

        console.log('[Preview360Modal] Viewer initialized');
      } catch (err) {
        console.error('[Preview360Modal] Error initializing viewer:', err);
        if (mounted) {
          setError('Failed to initialize 360° viewer');
          setLoading(false);
        }
      }
    };

    const loadPannellum = () => {
      // Check if Pannellum is already loaded
      if ((window as any).pannellum) {
        // Small delay to ensure DOM is ready
        setTimeout(initViewer, 100);
        return;
      }

      console.log('[Preview360Modal] Loading Pannellum library...');

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="pannellum.js"]');
      if (existingScript) {
        existingScript.addEventListener('load', initViewer);
        return;
      }

      // Load CSS
      const existingLink = document.querySelector('link[href*="pannellum.css"]');
      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
        document.head.appendChild(link);
      }

      // Load JS
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
      script.async = true;
      script.onload = () => {
        console.log('[Preview360Modal] Pannellum library loaded');
        initViewer();
      };
      script.onerror = () => {
        if (mounted) {
          console.error('[Preview360Modal] Failed to load Pannellum library');
          setError('Failed to load viewer library');
          setLoading(false);
        }
      };
      document.body.appendChild(script);
    };

    loadPannellum();

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
          console.log('[Preview360Modal] Viewer destroyed');
        } catch (e) {
          console.warn('[Preview360Modal] Error destroying viewer:', e);
        }
      }
    };
  }, [scene.imageUrl, scene.title]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold">Preview: {scene.title}</h3>
            <p className="text-xs text-gray-500 mt-1">
              Drag to look around • Scroll to zoom
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none px-2"
            title="Close preview"
          >
            ×
          </button>
        </div>

        {/* Viewer Container */}
        <div className="relative w-full h-[600px] bg-gray-900">
          <div id="preview-360-viewer-container" className="w-full h-full" />

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-sm">Loading 360° panorama...</p>
              </div>
            </div>
          )}

          {/* Error Overlay */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center text-white max-w-md px-4">
                <div className="text-red-500 text-5xl mb-4">⚠️</div>
                <p className="text-lg font-semibold mb-2">Failed to Load Preview</p>
                <p className="text-sm text-gray-300 mb-4">{error}</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-white text-gray-900 rounded hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Instructions */}
        {!loading && !error && (
          <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-600">
            <div className="flex items-center justify-between">
              <span>💡 Tip: Click and drag to look around, use mouse wheel to zoom</span>
              <button
                onClick={onClose}
                className="text-gray-700 hover:text-gray-900 font-medium"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
