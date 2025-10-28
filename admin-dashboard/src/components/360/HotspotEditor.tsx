import { useState, useEffect, useRef } from 'react';
import { X, Save, Trash2, Navigation, Plus, Info, Link2 } from 'lucide-react';
import { VirtualTourService } from '@/services/virtualTourService';
import type { TourScene, TourHotspot } from '@/types/virtualTour';

interface HotspotEditorProps {
  scene: TourScene;
  allScenes: TourScene[];
  churchId: string;
  onClose: () => void;
}

export function HotspotEditor({ scene, allScenes, churchId, onClose }: HotspotEditorProps) {
  const [hotspots, setHotspots] = useState<TourHotspot[]>(scene.hotspots || []);
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewerReady, setViewerReady] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false); // Prevents viewer updates during text input only
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const currentHotspotIds = useRef<string[]>([]); // Track which hotspots are currently in the viewer

  // Initialize Pannellum viewer
  useEffect(() => {
    if (!containerRef.current) return;

    // Load Pannellum scripts
    const loadPannellum = async () => {
      // Check if already loaded
      if ((window as any).pannellum) {
        initViewer();
        return;
      }

      // Load CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
      document.head.appendChild(link);

      // Load JS
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
      script.onload = initViewer;
      document.body.appendChild(script);
    };

    const initViewer = () => {
      if (!containerRef.current) return;

      const pannellum = (window as any).pannellum;

      // Create viewer container
      const viewerDiv = document.createElement('div');
      viewerDiv.id = 'pannellum-viewer';
      viewerDiv.style.width = '100%';
      viewerDiv.style.height = '500px';
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(viewerDiv);

      // Initialize viewer
      const viewer = pannellum.viewer('pannellum-viewer', {
        type: 'equirectangular',
        panorama: scene.imageUrl,
        autoLoad: true,
        showControls: true,
        showFullscreenCtrl: false,
        showZoomCtrl: true,
        mouseZoom: true,
        hotSpots: hotspots.map((h) => ({
          ...h,
          cssClass: h.type === 'info' ? 'info-hotspot' : 'navigation-hotspot',
          createTooltipFunc: function(hotSpotDiv: HTMLElement) {
            const span = document.createElement('span');
            span.innerHTML = h.label;
            hotSpotDiv.appendChild(span);
          },
          clickHandlerFunc: function() {
            setSelectedHotspot(h.id);
          },
        })),
      });

      viewerRef.current = viewer;
      setViewerReady(true);

      // Add click handler to add hotspots
      viewerDiv.addEventListener('click', handleViewerClick);
    };

    loadPannellum();

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
      }
    };
  }, [scene.imageUrl]);

  // Update hotspots in viewer when they change (but not while editing text or saving)
  useEffect(() => {
    if (!viewerRef.current || !viewerReady || isEditingText || saving) return;

    console.log('[HotspotEditor] Syncing hotspots with viewer. Current:', currentHotspotIds.current, 'New:', hotspots.map(h => h.id));

    // Step 1: Remove hotspots that no longer exist
    const currentIds = new Set(hotspots.map(h => h.id));
    const idsToRemove = currentHotspotIds.current.filter(id => !currentIds.has(id));

    idsToRemove.forEach((id) => {
      try {
        viewerRef.current.removeHotSpot(id);
        console.log('[HotspotEditor] Removed hotspot:', id);
      } catch (error) {
        console.warn('[HotspotEditor] Failed to remove hotspot:', id, error);
      }
    });

    // Step 2: Update or add hotspots
    hotspots.forEach((h) => {
      const exists = currentHotspotIds.current.includes(h.id);

      if (exists) {
        // Update existing hotspot by removing and re-adding
        try {
          viewerRef.current.removeHotSpot(h.id);
        } catch (error) {
          console.warn('[HotspotEditor] Hotspot already removed:', h.id);
        }
      }

      // Add the hotspot
      try {
        viewerRef.current.addHotSpot({
          id: h.id,
          pitch: h.pitch,
          yaw: h.yaw,
          type: 'info', // Pannellum type (always 'info' for custom hotspots)
          cssClass: h.type === 'info' ? 'info-hotspot' : 'navigation-hotspot',
          createTooltipFunc: function(hotSpotDiv: HTMLElement) {
            const span = document.createElement('span');
            span.innerHTML = h.label;
            hotSpotDiv.appendChild(span);
          },
          clickHandlerFunc: function() {
            setSelectedHotspot(h.id);
          },
        });
        console.log('[HotspotEditor] Added/Updated hotspot:', h.id, `at pitch=${h.pitch}, yaw=${h.yaw}`);
      } catch (error) {
        console.error('[HotspotEditor] Failed to add hotspot:', h.id, error);
      }
    });

    // Step 3: Update tracking
    currentHotspotIds.current = hotspots.map(h => h.id);
    console.log('[HotspotEditor] Sync complete. Active hotspots:', currentHotspotIds.current);
  }, [hotspots, viewerReady, isEditingText, saving]);

  // Handle click on viewer to add hotspot (Ctrl+Click or Cmd+Click)
  const handleViewerClick = (e: MouseEvent) => {
    if (!viewerRef.current) return;

    // Only add hotspot if Ctrl key (Windows/Linux) or Cmd key (Mac) is held
    if (!e.ctrlKey && !e.metaKey) return;

    // Check if clicked on a hotspot (don't add new one)
    if ((e.target as HTMLElement).closest('.pnlm-hotspot')) return;

    // Get the viewer container to calculate relative coordinates
    const container = document.getElementById('pannellum-viewer');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert mouse coordinates to pitch/yaw using Pannellum's method
    const coords = viewerRef.current.mouseEventToCoords(e);

    if (!coords || coords.length < 2) {
      console.warn('[HotspotEditor] Failed to get coordinates from click');
      return;
    }

    const pitch = coords[0];
    const yaw = coords[1];

    console.log(`[HotspotEditor] Adding hotspot at click position: pitch=${pitch.toFixed(2)}, yaw=${yaw.toFixed(2)}`);

    // Add new navigation hotspot by default
    const newHotspot: TourHotspot = {
      id: `hotspot-${Date.now()}`,
      type: 'navigation',
      pitch,
      yaw,
      targetSceneId: allScenes.find((s) => s.id !== scene.id)?.id || '',
      label: 'Go to...',
    };

    setHotspots((prev) => [...prev, newHotspot]);
    setSelectedHotspot(newHotspot.id);
  };

  // Update hotspot
  const handleUpdateHotspot = (id: string, updates: Partial<TourHotspot>) => {
    setHotspots((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...updates } : h))
    );
  };

  // Delete hotspot
  const handleDeleteHotspot = (id: string) => {
    setHotspots((prev) => prev.filter((h) => h.id !== id));
    setSelectedHotspot(null);
  };

  // Save hotspots
  const handleSave = async () => {
    try {
      setSaving(true);
      await VirtualTourService.updateSceneHotspots(churchId, scene.id, hotspots);
      onClose();
    } catch (error) {
      console.error('[HotspotEditor] Error saving hotspots:', error);
      alert('Failed to save hotspots. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const selectedHotspotData = hotspots.find((h) => h.id === selectedHotspot);
  const targetScenes = allScenes.filter((s) => s.id !== scene.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Hotspot Editor</h2>
            <p className="text-sm text-gray-600 mt-1">{scene.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close hotspot editor"
            title="Close hotspot editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Viewer */}
            <div className="lg:col-span-2">
              <div className="bg-gray-900 rounded-lg overflow-hidden">
                <div ref={containerRef} className="w-full" />
              </div>
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Instructions:</strong> Hold <kbd className="px-1.5 py-0.5 bg-white border border-blue-300 rounded text-xs font-mono">Ctrl</kbd> (or <kbd className="px-1.5 py-0.5 bg-white border border-blue-300 rounded text-xs font-mono">Cmd</kbd> on Mac) and click anywhere to add a hotspot.
                  Click existing hotspots to edit them. Drag freely to look around without Ctrl.
                </p>
              </div>
            </div>

            {/* Hotspot List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Hotspots ({hotspots.length})
                </h3>
              </div>

              {hotspots.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Navigation className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No hotspots yet</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Click on the panorama to add one
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-auto">
                  {hotspots.map((hotspot) => (
                    <div
                      key={hotspot.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedHotspot === hotspot.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedHotspot(hotspot.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {hotspot.type === 'info' ? (
                              <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                            ) : (
                              <Link2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                            )}
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {hotspot.label}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Pitch: {hotspot.pitch.toFixed(1)}° | Yaw: {hotspot.yaw.toFixed(1)}°
                          </div>
                          {hotspot.type === 'navigation' && (
                            <div className="text-xs text-gray-600 mt-1">
                              → {allScenes.find((s) => s.id === hotspot.targetSceneId)?.title || 'Unknown'}
                            </div>
                          )}
                          {hotspot.type === 'info' && hotspot.description && (
                            <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {hotspot.description}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHotspot(hotspot.id);
                          }}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                          aria-label={`Delete hotspot ${hotspot.label}`}
                          title={`Delete hotspot ${hotspot.label}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Edit Selected Hotspot */}
              {selectedHotspotData && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900">Edit Hotspot</h4>

                  <div>
                    <label htmlFor="hotspot-type-select" className="block text-xs font-medium text-gray-700 mb-1">
                      Hotspot Type
                    </label>
                    <select
                      id="hotspot-type-select"
                      value={selectedHotspotData.type}
                      onChange={(e) => {
                        const newType = e.target.value as 'navigation' | 'info';
                        handleUpdateHotspot(selectedHotspotData.id, {
                          type: newType,
                          // Clear irrelevant fields when switching types
                          ...(newType === 'navigation' ? { description: undefined } : { targetSceneId: undefined })
                        });
                      }}
                      onFocus={() => setIsEditingText(true)}
                      onBlur={() => setIsEditingText(false)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      aria-label="Select hotspot type"
                    >
                      <option value="navigation">Navigation (Link to another scene)</option>
                      <option value="info">Information (Show description)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={selectedHotspotData.label}
                      onChange={(e) =>
                        handleUpdateHotspot(selectedHotspotData.id, { label: e.target.value })
                      }
                      onFocus={() => setIsEditingText(true)}
                      onBlur={() => setIsEditingText(false)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder={selectedHotspotData.type === 'info' ? 'e.g., About the Altar' : 'e.g., Go to Altar'}
                    />
                  </div>

                  {selectedHotspotData.type === 'navigation' && (
                    <div>
                      <label htmlFor="target-scene-select" className="block text-xs font-medium text-gray-700 mb-1">
                        Target Scene
                      </label>
                      <select
                        id="target-scene-select"
                        value={selectedHotspotData.targetSceneId || ''}
                        onChange={(e) =>
                          handleUpdateHotspot(selectedHotspotData.id, {
                            targetSceneId: e.target.value,
                          })
                        }
                        onFocus={() => setIsEditingText(true)}
                        onBlur={() => setIsEditingText(false)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        aria-label="Select target scene for navigation"
                      >
                        <option value="">Select a scene...</option>
                        {targetScenes.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedHotspotData.type === 'info' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={selectedHotspotData.description || ''}
                        onChange={(e) =>
                          handleUpdateHotspot(selectedHotspotData.id, {
                            description: e.target.value,
                          })
                        }
                        onFocus={() => setIsEditingText(true)}
                        onBlur={() => setIsEditingText(false)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Enter information about this point of interest..."
                        rows={4}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="hotspot-pitch-input" className="block text-xs font-medium text-gray-700 mb-1">
                        Pitch
                      </label>
                      <input
                        id="hotspot-pitch-input"
                        type="number"
                        value={selectedHotspotData.pitch.toFixed(1)}
                        onChange={(e) =>
                          handleUpdateHotspot(selectedHotspotData.id, {
                            pitch: parseFloat(e.target.value),
                          })
                        }
                        onFocus={() => setIsEditingText(true)}
                        onBlur={() => setIsEditingText(false)}
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        aria-label="Hotspot pitch angle in degrees"
                        title="Vertical angle (-90 to 90 degrees)"
                      />
                    </div>
                    <div>
                      <label htmlFor="hotspot-yaw-input" className="block text-xs font-medium text-gray-700 mb-1">
                        Yaw
                      </label>
                      <input
                        id="hotspot-yaw-input"
                        type="number"
                        value={selectedHotspotData.yaw.toFixed(1)}
                        onChange={(e) =>
                          handleUpdateHotspot(selectedHotspotData.id, {
                            yaw: parseFloat(e.target.value),
                          })
                        }
                        onFocus={() => setIsEditingText(true)}
                        onBlur={() => setIsEditingText(false)}
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        aria-label="Hotspot yaw angle in degrees"
                        title="Horizontal angle (-180 to 180 degrees)"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {hotspots.length} hotspot{hotspots.length !== 1 ? 's' : ''} added
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Hotspots'}
            </button>
          </div>
        </div>

        {/* Custom CSS for hotspots */}
        <style>{`
          /* Navigation hotspot - Green circle with link icon */
          .navigation-hotspot {
            width: 44px;
            height: 44px;
            background: rgba(34, 197, 94, 0.95);
            border: 3px solid white;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .navigation-hotspot::before {
            content: '🔗';
            font-size: 20px;
          }

          .navigation-hotspot:hover {
            transform: scale(1.15);
            background: rgba(34, 197, 94, 1);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
          }

          /* Info hotspot - Blue circle with info icon */
          .info-hotspot {
            width: 44px;
            height: 44px;
            background: rgba(59, 130, 246, 0.95);
            border: 3px solid white;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .info-hotspot::before {
            content: 'ℹ';
            color: white;
            font-size: 26px;
            font-weight: bold;
          }

          .info-hotspot:hover {
            transform: scale(1.15);
            background: rgba(59, 130, 246, 1);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
          }

          /* Tooltip for both types */
          .navigation-hotspot span,
          .info-hotspot span {
            position: absolute;
            bottom: -35px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 13px;
            white-space: nowrap;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
            max-width: 200px;
            text-align: center;
            line-height: 1.3;
          }

          .navigation-hotspot:hover span,
          .info-hotspot:hover span {
            opacity: 1;
          }
        `}</style>
      </div>
    </div>
  );
}
