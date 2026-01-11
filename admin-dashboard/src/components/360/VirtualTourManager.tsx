import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Trash2, Star, Edit, Eye, Navigation, Pencil, Check, AlertCircle, X, Play, GripVertical, Ban } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, UploadTask } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { VirtualTourService } from '@/services/virtualTourService';
import type { VirtualTour, TourScene, Uploaded360Image } from '@/types/virtualTour';
import { HotspotEditor } from './HotspotEditor';
import { validate360Image } from '@/utils/validate360Image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [pendingFiles, setPendingFiles] = useState<Uploaded360Image[]>([]); // Files staged for preview before upload
  const [loading, setLoading] = useState(true);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [previewSceneId, setPreviewSceneId] = useState<string | null>(null);
  const [brokenImageScenes, setBrokenImageScenes] = useState<Set<string>>(new Set());
  const [savingSceneId, setSavingSceneId] = useState<string | null>(null);
  const [savedSceneId, setSavedSceneId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Array<{ name: string; message: string }>>([]);
  const [duplicateWarnings, setDuplicateWarnings] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Upload queue management
  const CONCURRENT_UPLOADS = 2;
  const uploadQueueRef = useRef<Uploaded360Image[]>([]);
  const activeUploadsRef = useRef(0);
  const uploadTasksRef = useRef<Map<string, UploadTask>>(new Map());
  const titleDebounceRef = useRef<{ [sceneId: string]: NodeJS.Timeout }>({});
  
  // Batch upload tracking for proper scene ordering
  const batchUploadRef = useRef<{
    totalInBatch: number;
    completedInBatch: number;
    sceneOrderMap: Map<string, number>; // Maps scene ID -> original index
    batchId: string | null;
  }>({
    totalInBatch: 0,
    completedInBatch: 0,
    sceneOrderMap: new Map(),
    batchId: null,
  });

  // Delete scene confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sceneToDelete, setSceneToDelete] = useState<TourScene | null>(null);

  // Load existing tour
  useEffect(() => {
    loadTour();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Process files (shared between input and drag-drop) - Stage for preview
  const processFiles = useCallback(async (filesArray: File[]) => {
    setValidationErrors([]);
    setDuplicateWarnings([]);

    const MAX_SCENES = 15;
    const currentSceneCount = tour?.scenes.length || 0;
    const pendingCount = pendingFiles.length;
    const uploadingCount = uploadingImages.length;

    console.log(`[VirtualTourManager] Selected ${filesArray.length} file(s) for upload`);
    console.log(`[VirtualTourManager] Current scenes: ${currentSceneCount}/${MAX_SCENES}, Pending: ${pendingCount}, Uploading: ${uploadingCount}`);

    // Check if adding these files would exceed the limit
    const remainingSlots = MAX_SCENES - currentSceneCount - pendingCount - uploadingCount;

    if (remainingSlots <= 0) {
      alert(`Maximum of ${MAX_SCENES} scenes allowed. Please delete some scenes or pending files before adding more.`);
      return;
    }

    // Create a mutable copy to potentially trim
    let filesToProcess = [...filesArray];

    if (filesToProcess.length > remainingSlots) {
      const allowedCount = remainingSlots;
      alert(
        `You can only add ${allowedCount} more file(s). ` +
        `Currently: ${currentSceneCount} scenes, ${pendingCount} pending, ${uploadingCount} uploading.\n\n` +
        `Adding first ${allowedCount} file(s) only.`
      );
      filesToProcess = filesToProcess.slice(0, allowedCount);
    }

    // Validate all files for 2:1 aspect ratio
    console.log(`[VirtualTourManager] Validating ${filesToProcess.length} file(s) for equirectangular format...`);
    const validFiles: File[] = [];
    const errors: Array<{ name: string; message: string }> = [];
    const duplicates: string[] = [];

    // Get existing scene names for duplicate detection
    const existingNames = new Set([
      ...(tour?.scenes.map(s => s.title.toLowerCase()) || []),
      ...pendingFiles.map(p => p.file?.name.replace(/\.[^/.]+$/, '').toLowerCase() || ''),
      ...uploadingImages.map(u => u.file?.name.replace(/\.[^/.]+$/, '').toLowerCase() || '')
    ]);

    for (const file of filesToProcess) {
      // Check for duplicates by filename
      const baseName = file.name.replace(/\.[^/.]+$/, '').toLowerCase();
      if (existingNames.has(baseName)) {
        duplicates.push(file.name);
        console.warn(`[VirtualTourManager] ⚠ ${file.name}: Duplicate name detected`);
        continue; // Skip duplicates
      }

      const validation = await validate360Image(file);
      if (validation.isValid) {
        validFiles.push(file);
        existingNames.add(baseName); // Add to set to catch duplicates in same batch
        console.log(`[VirtualTourManager] ✓ ${file.name}: Valid (${validation.details?.width}x${validation.details?.height})`);
      } else {
        errors.push({ name: file.name, message: validation.message });
        console.warn(`[VirtualTourManager] ✗ ${file.name}: ${validation.message}`);
      }
    }

    // Show validation errors and duplicate warnings
    if (errors.length > 0) {
      setValidationErrors(errors);
    }
    if (duplicates.length > 0) {
      setDuplicateWarnings(duplicates);
    }

    // If no valid files, stop
    if (validFiles.length === 0) {
      console.log('[VirtualTourManager] No valid files to stage');
      return;
    }

    console.log(`[VirtualTourManager] Staging ${validFiles.length} valid file(s) for preview`);

    // Create pending uploads with preview URLs
    const newPendingFiles: Uploaded360Image[] = validFiles.map((file) => ({
      id: `pending-${Date.now()}-${Math.random()}`,
      file,
      url: '',
      previewUrl: URL.createObjectURL(file),
      uploadProgress: 0,
      uploading: false,
      status: 'pending' as const,
    }));

    setPendingFiles((prev) => [...prev, ...newPendingFiles]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [churchId, tour, pendingFiles, uploadingImages]);

  // Remove a pending file
  const removePendingFile = useCallback((id: string) => {
    setPendingFiles((prev) => {
      const file = prev.find(f => f.id === id);
      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  // Reorder pending files
  const movePendingFile = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setPendingFiles((prev) => {
      const newFiles = [...prev];
      const [removed] = newFiles.splice(fromIndex, 1);
      newFiles.splice(toIndex, 0, removed);
      return newFiles;
    });
  }, []);

  // Drag and drop handlers for pending files reordering
  const handlePendingDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Set a custom drag image (optional - uses default)
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 50, 50);
    }
  }, []);

  const handlePendingDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handlePendingDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handlePendingDrop = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      movePendingFile(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, movePendingFile]);

  const handlePendingDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  // Clear all pending files
  const clearAllPending = useCallback(() => {
    pendingFiles.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    setPendingFiles([]);
  }, [pendingFiles]);

  // Process upload queue
  const processQueue = useCallback(() => {
    while (activeUploadsRef.current < CONCURRENT_UPLOADS && uploadQueueRef.current.length > 0) {
      const next = uploadQueueRef.current.shift();
      if (next) {
        activeUploadsRef.current++;
        uploadImage(next);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start uploading all pending files
  const startUploadAll = useCallback(() => {
    if (pendingFiles.length === 0) return;

    // Initialize batch tracking
    const batchId = `batch-${Date.now()}`;
    batchUploadRef.current = {
      totalInBatch: pendingFiles.length,
      completedInBatch: 0,
      sceneOrderMap: new Map(),
      batchId,
    };
    
    console.log(`[VirtualTourManager] Starting batch upload: ${batchId} with ${pendingFiles.length} files`);

    // Move pending files to uploading state, preserving order with originalIndex
    const uploadsToStart: Uploaded360Image[] = pendingFiles.map((pending, index) => ({
      ...pending,
      id: `upload-${Date.now()}-${Math.random()}`,
      uploading: true,
      status: 'uploading' as const,
      originalIndex: index, // Track the original position (0 = first = start scene)
    }));

    // Clear pending and add to uploading
    setPendingFiles([]);
    setUploadingImages((prev) => [...prev, ...uploadsToStart]);

    // Add to queue and start processing
    uploadQueueRef.current = [...uploadQueueRef.current, ...uploadsToStart];
    processQueue();
  }, [pendingFiles, processQueue]);

  // Cancel an individual upload
  const cancelUpload = useCallback((id: string) => {
    const uploadTask = uploadTasksRef.current.get(id);
    if (uploadTask) {
      uploadTask.cancel();
      uploadTasksRef.current.delete(id);
    }
    
    setUploadingImages((prev) =>
      prev.map((img) =>
        img.id === id
          ? { ...img, uploading: false, status: 'canceled' as const, error: 'Upload canceled' }
          : img
      )
    );
  }, []);

  // Remove completed/errored upload from list
  const dismissUpload = useCallback((id: string) => {
    setUploadingImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  // Handle file selection (from input)
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
    // Reset input
    e.target.value = '';
  }, [processFiles]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    // Filter to only image files
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      alert('Please drop image files only.');
      return;
    }

    await processFiles(imageFiles);
  }, [processFiles]);

  // Upload image to Firebase Storage with compression
  const uploadImage = useCallback(async (upload: Uploaded360Image) => {
    if (!upload.file) {
      activeUploadsRef.current = Math.max(0, activeUploadsRef.current - 1);
      processQueue();
      return;
    }

    try {
      console.log(`[VirtualTourManager] Starting upload: ${upload.file.name}`);
      console.log(`[VirtualTourManager] Church ID received: "${churchId}"`);

      // Compress image
      setUploadingImages((prev) =>
        prev.map((img) =>
          img.id === upload.id ? { ...img, uploadProgress: 5, status: 'uploading' as const } : img
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

      // Sanitize churchId to create a valid storage path (remove spaces and special characters)
      // Firebase Storage paths should not contain spaces or special characters
      const sanitizedChurchId = churchId
        .replace(/\s+/g, '_')           // Replace spaces with underscores
        .replace(/[^a-zA-Z0-9._-]/g, '') // Remove special characters except . _ -
        .toLowerCase();                  // Lowercase for consistency

      // Use the correct storage path that matches Firebase Storage rules
      const storagePath = `churches/${sanitizedChurchId}/360tours/${fileName}`;
      console.log('[VirtualTourManager] Original Church ID:', churchId);
      console.log('[VirtualTourManager] Sanitized Church ID:', sanitizedChurchId);
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

      // Store upload task reference for cancellation
      uploadTasksRef.current.set(upload.id, uploadTask);

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

          // Cleanup and process next in queue
          uploadTasksRef.current.delete(upload.id);
          activeUploadsRef.current = Math.max(0, activeUploadsRef.current - 1);
          processQueue();

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
                ? { ...img, uploading: false, status: 'error' as const, error: errorMsg }
                : img
            )
          );
        },
        async () => {
          // Cleanup upload task reference
          uploadTasksRef.current.delete(upload.id);
          activeUploadsRef.current = Math.max(0, activeUploadsRef.current - 1);
          
          // Upload complete
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('[VirtualTourManager] Upload complete:', url);

          // Create new scene with a predictable ID for tracking
          const sceneId = `scene-${Date.now()}-${Math.random()}`;
          const newScene: TourScene = {
            id: sceneId,
            title: upload.file?.name.replace(/\.[^/.]+$/, '') || 'New Scene',
            imageUrl: url,
            isStartScene: false, // Will be set during reordering
            hotspots: [],
          };
          
          // Track this scene's original index for batch reordering
          const originalIndex = upload.originalIndex ?? 0;
          const isFirstInBatch = originalIndex === 0;
          
          console.log(`[VirtualTourManager] Scene "${newScene.title}" has originalIndex: ${originalIndex}, isFirstInBatch: ${isFirstInBatch}`);

          try {
            // Use atomic transaction-based addScene to prevent race conditions during parallel uploads
            // Pass the original index so the service can handle ordering
            console.log('[VirtualTourManager] Saving scene to Firestore:', newScene.title);
            await VirtualTourService.addScene(churchId, newScene, originalIndex, isFirstInBatch);
            console.log('[VirtualTourManager] ✓ Scene saved to Firestore successfully');
            
            // Track this scene in the batch for final reordering
            batchUploadRef.current.sceneOrderMap.set(sceneId, originalIndex);
            batchUploadRef.current.completedInBatch++;
            
            console.log(`[VirtualTourManager] Batch progress: ${batchUploadRef.current.completedInBatch}/${batchUploadRef.current.totalInBatch}`);
            
            // Check if all uploads in the batch are complete
            if (batchUploadRef.current.completedInBatch === batchUploadRef.current.totalInBatch) {
              console.log('[VirtualTourManager] All batch uploads complete! Reordering scenes...');
              
              try {
                // Reorder scenes to match the original file order
                await VirtualTourService.reorderScenesAfterBatchUpload(
                  churchId,
                  batchUploadRef.current.sceneOrderMap
                );
                console.log('[VirtualTourManager] ✓ Scenes reordered successfully');
              } catch (reorderError) {
                console.error('[VirtualTourManager] Error reordering scenes:', reorderError);
                // Non-fatal: scenes are uploaded, just potentially in wrong order
              }
              
              // Reset batch tracking
              batchUploadRef.current = {
                totalInBatch: 0,
                completedInBatch: 0,
                sceneOrderMap: new Map(),
                batchId: null,
              };
            }

            // Update status to completed
            setUploadingImages((prev) =>
              prev.map((img) =>
                img.id === upload.id
                  ? { ...img, uploading: false, status: 'completed' as const, uploadProgress: 100 }
                  : img
              )
            );

            // Reload tour to ensure UI is in sync with Firestore
            console.log('[VirtualTourManager] Reloading tour data...');
            await loadTour();

            // Auto-dismiss completed uploads after delay
            setTimeout(() => {
              setUploadingImages((prev) => prev.filter((img) => img.id !== upload.id));
            }, 2000);

            console.log('[VirtualTourManager] ✓✓ Scene uploaded and tour refreshed - should be visible now');
          } catch (error) {
            console.error('[VirtualTourManager] ✗ Error saving scene to Firestore:', error);
            console.error('[VirtualTourManager] Error details:', {
              message: error instanceof Error ? error.message : String(error),
              code: error?.code,
              stack: error?.stack,
            });

            setUploadingImages((prev) =>
              prev.map((img) =>
                img.id === upload.id
                  ? { ...img, uploading: false, status: 'error' as const, error: `Failed to save: ${error?.message || 'Unknown error'}` }
                  : img
              )
            );
          } finally {
            // Process next in queue
            processQueue();
          }
        }
      );
    } catch (error) {
      console.error('[VirtualTourManager] Upload process error:', error);
      console.error('[VirtualTourManager] Error details:', {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : typeof error,
      });

      // Cleanup and process next in queue
      activeUploadsRef.current = Math.max(0, activeUploadsRef.current - 1);
      processQueue();

      setUploadingImages((prev) =>
        prev.map((img) =>
          img.id === upload.id
            ? {
                ...img,
                uploading: false,
                status: 'error' as const,
                error: error?.message || 'Upload failed. Please try again.',
              }
            : img
        )
      );
    }
  }, [churchId, loadTour, processQueue]);

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

  // Delete scene - opens confirmation dialog
  const handleDeleteScene = useCallback((scene: TourScene) => {
    setSceneToDelete(scene);
    setDeleteDialogOpen(true);
  }, []);

  // Confirm delete scene - executes the deletion
  const handleConfirmDeleteScene = useCallback(async () => {
    if (!sceneToDelete) return;

    try {
      // Try to delete from storage (but continue if file doesn't exist)
      try {
        const storageRef = ref(storage, sceneToDelete.imageUrl);
        await deleteObject(storageRef);
        console.log('[VirtualTourManager] Storage file deleted successfully');
      } catch (storageError) {
        // If file doesn't exist (404), that's fine - it may have been manually deleted
        const errorCode = storageError && typeof storageError === 'object' && 'code' in storageError ? (storageError as { code: string }).code : null;
        if (errorCode === 'storage/object-not-found') {
          console.warn('[VirtualTourManager] Storage file not found (already deleted), continuing with Firestore cleanup');
        } else {
          // For other storage errors, log but continue with Firestore deletion
          console.warn('[VirtualTourManager] Storage deletion failed:', storageError);
        }
      }

      // Always delete from Firestore (even if Storage deletion failed)
      await VirtualTourService.deleteScene(churchId, sceneToDelete.id);
      await loadTour();

      console.log('[VirtualTourManager] Scene deleted successfully from tour');
    } catch (error) {
      console.error('[VirtualTourManager] Error deleting scene from Firestore:', error);
      alert('Failed to delete scene from database. Please try again.');
    } finally {
      setDeleteDialogOpen(false);
      setSceneToDelete(null);
    }
  }, [churchId, loadTour, sceneToDelete]);

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
            Upload 360° panoramic images and add navigation hotspots (Max: 15 scenes)
          </p>
        </div>
        <div className="text-sm">
          <span className={`font-semibold ${(tour?.scenes.length || 0) >= 15 ? 'text-red-600' : 'text-gray-900'}`}>
            {tour?.scenes.length || 0} / 15 scenes
          </span>
          {(tour?.scenes.length || 0) < 15 && (
            <span className="text-gray-500 ml-2">
              ({15 - (tour?.scenes.length || 0)} remaining)
            </span>
          )}
        </div>
      </div>

      {/* Upload Section */}
      {(tour?.scenes.length || 0) < 15 ? (
        <div 
          className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
            isDragging 
              ? 'border-green-500 bg-green-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <label className="flex flex-col items-center cursor-pointer">
            <Upload className={`w-12 h-12 mb-2 ${isDragging ? 'text-green-500' : 'text-gray-400'}`} />
            <span className={`text-sm font-medium ${isDragging ? 'text-green-700' : 'text-gray-700'}`}>
              {isDragging ? 'Drop images here' : 'Upload 360° Images'}
            </span>
            <span className="text-xs text-gray-500 mt-1">
              Drag & drop or click to select equirectangular images (2:1 aspect ratio)
            </span>
            <span className="text-xs text-blue-600 mt-1 font-medium">
              ✓ Multiple files supported • Max 15 scenes total • Images will be compressed
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
            <span className="text-sm font-medium text-red-700">Maximum scenes reached (15/15)</span>
            <span className="text-xs text-red-600 mt-1">
              Please delete some scenes before uploading more
            </span>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-800">
                {validationErrors.length} file(s) skipped - Invalid 360° format
              </h4>
              <p className="text-xs text-amber-700 mt-1 mb-2">
                360° images must have a 2:1 aspect ratio (equirectangular format)
              </p>
              <ul className="space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-xs text-amber-700">
                    <span className="font-medium">{error.name}:</span> {error.message}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setValidationErrors([])}
                className="text-xs text-amber-800 hover:text-amber-900 font-medium mt-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Warnings */}
      {duplicateWarnings.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Ban className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-orange-800">
                {duplicateWarnings.length} duplicate file(s) skipped
              </h4>
              <p className="text-xs text-orange-700 mt-1 mb-2">
                These files have the same name as existing scenes or pending uploads:
              </p>
              <ul className="space-y-1">
                {duplicateWarnings.map((name, index) => (
                  <li key={index} className="text-xs text-orange-700 font-medium">
                    {name}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setDuplicateWarnings([])}
                className="text-xs text-orange-800 hover:text-orange-900 font-medium mt-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Files Preview */}
      {pendingFiles.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-medium text-blue-900">
                Ready to Upload ({pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''})
              </h4>
              <p className="text-xs text-blue-700 mt-1">
                Drag to reorder • First image will be the start scene
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearAllPending}
                className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={startUploadAll}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
              >
                <Play className="w-4 h-4" />
                Upload All
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {pendingFiles.map((pending, index) => (
              <div
                key={pending.id}
                draggable
                onDragStart={(e) => handlePendingDragStart(e, index)}
                onDragOver={(e) => handlePendingDragOver(e, index)}
                onDragLeave={handlePendingDragLeave}
                onDrop={(e) => handlePendingDrop(e, index)}
                onDragEnd={handlePendingDragEnd}
                className={`relative group bg-white rounded-lg overflow-hidden border-2 shadow-sm cursor-grab active:cursor-grabbing transition-all duration-200 ${
                  draggedIndex === index 
                    ? 'opacity-50 scale-95 border-blue-400' 
                    : dragOverIndex === index 
                      ? 'border-green-500 ring-2 ring-green-200 scale-105' 
                      : 'border-blue-200 hover:border-blue-300'
                }`}
              >
                {/* Drag Handle Indicator */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-60 transition-opacity z-10">
                  <GripVertical className="w-8 h-8 text-gray-600" />
                </div>
                
                {/* Preview Image */}
                <div className="aspect-[2/1] bg-gray-100">
                  {pending.previewUrl && (
                    <img
                      src={pending.previewUrl}
                      alt={pending.file?.name}
                      className="w-full h-full object-cover pointer-events-none"
                      draggable={false}
                    />
                  )}
                </div>
                
                {/* Order Badge */}
                <div className={`absolute top-1 left-1 w-5 h-5 text-white text-xs font-bold rounded-full flex items-center justify-center transition-colors ${
                  dragOverIndex === index ? 'bg-green-600' : 'bg-blue-600'
                }`}>
                  {dragOverIndex === index ? '→' : index + 1}
                </div>
                
                {/* Remove Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); removePendingFile(pending.id); }}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  title="Remove"
                  draggable={false}
                >
                  <X className="w-3 h-3" />
                </button>
                
                {/* Filename */}
                <div className="p-1.5">
                  <p className="text-xs text-gray-700 truncate" title={pending.file?.name}>
                    {pending.file?.name}
                  </p>
                </div>
                
                {/* Start Scene Badge */}
                {index === 0 && (
                  <div className="absolute top-1 left-7 px-1.5 py-0.5 bg-green-500 text-white text-[10px] font-medium rounded">
                    Start
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress Summary & Active Uploads */}
      {uploadingImages.length > 0 && (
        <div className="space-y-3">
          {/* Progress Summary */}
          {(() => {
            const completed = uploadingImages.filter(u => u.status === 'completed').length;
            const uploading = uploadingImages.filter(u => u.status === 'uploading').length;
            const errors = uploadingImages.filter(u => u.status === 'error').length;
            const canceled = uploadingImages.filter(u => u.status === 'canceled').length;
            const pending = uploadingImages.filter(u => u.status === 'pending').length;
            const total = uploadingImages.length;
            const totalProgress = uploadingImages.reduce((sum, u) => sum + u.uploadProgress, 0) / total;

            return (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    Upload Progress
                  </h4>
                  <span className="text-sm text-gray-600">
                    {completed} of {total} complete
                    {errors > 0 && <span className="text-red-600 ml-1">({errors} failed)</span>}
                    {canceled > 0 && <span className="text-gray-500 ml-1">({canceled} canceled)</span>}
                  </span>
                </div>
                
                {/* Overall Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                  <div
                    className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${totalProgress}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{Math.round(totalProgress)}% overall</span>
                  <span>
                    {uploading > 0 && `${uploading} uploading`}
                    {pending > 0 && ` • ${pending} queued`}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Individual Upload Items */}
          <div className="space-y-2">
            {uploadingImages.map((upload) => (
              <div 
                key={upload.id} 
                className={`rounded-lg p-3 ${
                  upload.status === 'completed' ? 'bg-green-50 border border-green-200' :
                  upload.status === 'error' ? 'bg-red-50 border border-red-200' :
                  upload.status === 'canceled' ? 'bg-gray-100 border border-gray-200' :
                  'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Status Icon */}
                    {upload.status === 'completed' && (
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    )}
                    {upload.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    )}
                    {upload.status === 'canceled' && (
                      <Ban className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                    {(upload.status === 'uploading' || upload.status === 'pending') && (
                      <div className="w-4 h-4 flex-shrink-0">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      </div>
                    )}
                    
                    <span className="text-sm text-gray-700 truncate">{upload.file?.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs ${
                      upload.status === 'completed' ? 'text-green-600' :
                      upload.status === 'error' ? 'text-red-600' :
                      'text-gray-500'
                    }`}>
                      {upload.status === 'completed' ? 'Done' :
                       upload.status === 'error' ? 'Failed' :
                       upload.status === 'canceled' ? 'Canceled' :
                       upload.status === 'pending' ? 'Queued' :
                       `${Math.round(upload.uploadProgress)}%`}
                    </span>
                    
                    {/* Cancel Button - only for active uploads */}
                    {upload.status === 'uploading' && (
                      <button
                        onClick={() => cancelUpload(upload.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                        title="Cancel upload"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    
                    {/* Dismiss Button - for completed/error/canceled */}
                    {(upload.status === 'error' || upload.status === 'canceled') && (
                      <button
                        onClick={() => dismissUpload(upload.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Progress Bar - only for uploading */}
                {upload.status === 'uploading' && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-green-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${upload.uploadProgress}%` }}
                    />
                  </div>
                )}
                
                {/* Error Message */}
                {upload.error && upload.status !== 'canceled' && (
                  <p className="text-xs text-red-600 mt-1">{upload.error}</p>
                )}
              </div>
            ))}
          </div>
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
      {previewSceneId && tour?.scenes.find((s) => s.id === previewSceneId) && (
        <Preview360Modal
          scene={tour.scenes.find((s) => s.id === previewSceneId)!}
          onClose={() => setPreviewSceneId(null)}
        />
      )}

      {/* Delete Scene Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white border shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Delete Scene?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              {sceneToDelete && (
                <>
                  You are about to delete <strong className="text-foreground">"{sceneToDelete.title}"</strong>.
                  <br /><br />
                  This will remove the scene from the virtual tour and delete the image from storage. This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteScene}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete Scene
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Interactive 360° Preview Modal Component
function Preview360Modal({ scene, onClose }: { scene: TourScene; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const viewerRef = useRef<{ destroy: () => void; on: (event: string, callback: (...args: unknown[]) => void) => void } | null>(null);
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
        // Access Pannellum from window object
        const pannellum = (window as Window & { pannellum?: { viewer: (container: HTMLElement, config: unknown) => { destroy: () => void } } }).pannellum;

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
      if ((window as Window & { pannellum?: unknown }).pannellum) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
