import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Maximize2, Info, RotateCcw } from 'lucide-react';
import styles from './VirtualTour360.module.css';

interface VirtualTour360Props {
  imageUrl: string;
  title?: string;
  description?: string;
  height?: string;
  className?: string;
  showControls?: boolean;
  autoLoad?: boolean;
}

export const VirtualTour360: React.FC<VirtualTour360Props> = ({
  imageUrl,
  title = "Virtual Tour",
  description,
  height = "400px",
  className = "",
  showControls = true,
  autoLoad = true
}) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<Pannellum.Viewer | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const initializeViewer = useCallback(() => {
    if (!viewerRef.current || !window.pannellum) return;

    try {
      setIsLoading(true);
      setError(null);

      // Clear previous viewer
      if (viewer) {
        viewer.destroy();
      }

      const newViewer = window.pannellum.viewer(viewerRef.current, {
        type: 'equirectangular',
        panorama: imageUrl,
        autoLoad: autoLoad,
        showControls: showControls,
        showZoomCtrl: true,
        showFullscreenCtrl: true,
        mouseZoom: true,
        keyboardZoom: true,
        draggable: true,
        friction: 0.15,
        hfov: 90,
        pitch: 0,
        yaw: 0,
        minHfov: 50,
        maxHfov: 120,
        compass: true,
        northOffset: 0,
        hotSpotDebug: false,
        backgroundColor: [0, 0, 0],
        strings: {
          loadButtonLabel: 'Click to Load Virtual Tour',
          loadingLabel: 'Loading Church Virtual Tour...',
          bylineLabel: 'VISITA Bohol Churches',
          noPanoramaError: 'Failed to load virtual tour image.',
          fileAccessError: 'Unable to access virtual tour file.',
          malformedURLError: 'Invalid virtual tour URL.',
        }
      } as Pannellum.ConfigOptions);

      // Event listeners
      newViewer.on('load', () => {
        setIsLoading(false);
        console.log('360° tour loaded successfully');
      });

      newViewer.on('error', (error: unknown) => {
        setError('Failed to load virtual tour');
        setIsLoading(false);
        console.error('Pannellum error:', error);
      });

      newViewer.on('fullscreenchange', (isFullscreen: boolean) => {
        setIsFullscreen(isFullscreen);
      });

      setViewer(newViewer);

    } catch (err) {
      setError('Failed to initialize virtual tour');
      setIsLoading(false);
      console.error('Viewer initialization error:', err);
    }
  }, [imageUrl, autoLoad, showControls, viewer]);

  const loadPannellum = useCallback(() => {
    if (window.pannellum) {
      return;
    }

    // Load Pannellum CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
    document.head.appendChild(link);

    // Load Pannellum JS
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
    script.onload = () => {
      if (imageUrl) {
        initializeViewer();
      }
    };
    script.onerror = () => {
      setError('Failed to load 360° viewer');
      setIsLoading(false);
    };
    document.head.appendChild(script);
  }, [imageUrl, initializeViewer]);


  useEffect(() => {
    loadPannellum();
  }, [loadPannellum]);

  useEffect(() => {
    if (window.pannellum && viewerRef.current && imageUrl) {
      initializeViewer();
    }
  }, [imageUrl, initializeViewer]);

  const resetView = useCallback(() => {
    if (viewer) {
      viewer.setPitch(0);
      viewer.setYaw(0);
      viewer.setHfov(90);
    }
  }, [viewer]);

  const toggleFullscreen = useCallback(() => {
    if (viewer) {
      viewer.toggleFullscreen();
    }
  }, [viewer]);

  if (error) {
    return (
      <Card className={className}>
        <CardContent>
          <div
            className={styles.errorState}
            data-height={height}
          >
            <div className={styles.errorIcon}>⚠️</div>
            <h3 className={styles.errorTitle}>Failed to Load Virtual Tour</h3>
            <p className={styles.errorMessage}>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={initializeViewer}
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {title && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              🏛️ {title}
              <Badge variant="secondary" className="text-xs">360°</Badge>
            </CardTitle>
            {showControls && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetView}
                  disabled={!viewer}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFullscreen}
                  disabled={!viewer}
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div
          className={styles.virtualTourContainer}
          data-height={height}
        >
          {isLoading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.loadingContent}>
                <Loader2 className={styles.loadingSpinner} />
                <p className={styles.loadingText}>Loading Virtual Tour...</p>
              </div>
            </div>
          )}
          <div
            ref={viewerRef}
            className={styles.viewer}
          />
          
          {!isLoading && (
            <div className={styles.controls}>
              <div className="bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                <Info className="w-3 h-3" />
                Drag to explore • Scroll to zoom
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VirtualTour360;