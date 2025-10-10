import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Maximize, Info, Eye } from 'lucide-react';

// Note: This is a mock implementation
// In production, you would install: npm install pannellum-react
// import { Pannellum } from 'pannellum-react';

interface Hotspot {
  pitch: number;
  yaw: number;
  type: 'info' | 'scene' | 'link';
  text: string;
  targetSceneId?: string;
  description?: string;
}

interface PanoramaConfig {
  id: string;
  title: string;
  imageUrl: string;
  thumbnailUrl: string;
  hotspots: Hotspot[];
  initialView: {
    pitch: number;
    yaw: number;
    hfov: number;
  };
}

interface PanoramaViewerProps {
  config: PanoramaConfig;
  width?: string;
  height?: string;
  showControls?: boolean;
  autoLoad?: boolean;
}

// Mock Pannellum component for demonstration
interface MockPannellumProps {
  width: string;
  height: string;
  image: string;
  pitch: number;
  yaw: number;
  hfov: number;
  hotSpots?: Hotspot[];
  showControls?: boolean;
  onLoad?: () => void;
  onError?: (error: string) => void;
  onHotSpotClick?: (hotspotId: string) => void;
}

const MockPannellum: React.FC<MockPannellumProps> = ({
  width,
  height,
  image,
  pitch,
  yaw,
  hfov,
  hotSpots,
  showControls,
  onHotSpotClick
}) => {
  return (
    <div 
      style={{ width, height, backgroundColor: '#f0f0f0', position: 'relative' }}
      className="flex items-center justify-center border rounded-lg overflow-hidden"
    >
      {/* Mock panorama display */}
      <div className="text-center p-8">
        <Globe className="w-12 h-12 mx-auto mb-4 text-blue-600" />
        <h3 className="font-semibold mb-2">360° Virtual Tour</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Interactive panoramic view would appear here
        </p>
        <div className="space-y-2">
          <p className="text-xs">Image: {image.split('/').pop()}</p>
          <p className="text-xs">View: Pitch {pitch}°, Yaw {yaw}°, FOV {hfov}°</p>
          {hotSpots && (
            <p className="text-xs">Hotspots: {hotSpots.length}</p>
          )}
        </div>
        
        {/* Mock hotspot indicators */}
        {hotSpots?.map((hotspot: Hotspot, index: number) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="absolute"
            style={{
              left: `${50 + (hotspot.yaw / 360) * 30}%`,
              top: `${50 + (hotspot.pitch / 90) * 20}%`,
            }}
            onClick={() => onHotSpotClick?.(hotspot)}
          >
            <Info className="w-3 h-3" />
          </Button>
        ))}
      </div>
      
      {showControls && (
        <div className="absolute bottom-4 right-4 flex gap-2">
          <Button variant="secondary" size="sm">
            <Maximize className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm">
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export const PanoramaViewer: React.FC<PanoramaViewerProps> = ({
  config,
  width = '100%',
  height = '400px',
  showControls = true,
  autoLoad = true
}) => {
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);

  const handleHotspotClick = (hotspot: Hotspot) => {
    setSelectedHotspot(hotspot);
    console.log('Hotspot clicked:', hotspot);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {config.title}
              </CardTitle>
              <CardDescription>
                Interactive 360° virtual tour
              </CardDescription>
            </div>
            <Badge variant="secondary">{config.hotspots.length} hotspots</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <MockPannellum
            width={width}
            height={height}
            image={config.imageUrl}
            pitch={config.initialView.pitch}
            yaw={config.initialView.yaw}
            hfov={config.initialView.hfov}
            hotSpots={config.hotspots}
            showControls={showControls}
            autoLoad={autoLoad}
            onHotSpotClick={handleHotspotClick}
          />
          
          {selectedHotspot && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">{selectedHotspot.text}</h4>
              {selectedHotspot.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedHotspot.description}
                </p>
              )}
              <Badge variant="outline" className="mt-2">
                {selectedHotspot.type}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Example usage configuration
export const samplePanoramaConfig: PanoramaConfig = {
  id: 'santo-nino-interior',
  title: 'Santo Niño Church Interior',
  imageUrl: 'https://example.com/santo-nino-360.jpg',
  thumbnailUrl: 'https://example.com/santo-nino-thumb.jpg',
  initialView: {
    pitch: 10,
    yaw: 180,
    hfov: 100
  },
  hotspots: [
    {
      pitch: 14.1,
      yaw: 1.5,
      type: 'info',
      text: 'Main Altar',
      description: 'The main altar of Santo Niño Church, built in 1595 during the Spanish colonial period.'
    },
    {
      pitch: -0.9,
      yaw: 222.6,
      type: 'info',
      text: 'Side Chapel',
      description: 'The side chapel dedicated to Our Lady of Guadalupe.'
    },
    {
      pitch: 5.2,
      yaw: 90.0,
      type: 'info',
      text: 'Confessional',
      description: 'Traditional wooden confessional booth from the early 20th century.'
    }
  ]
};

export default PanoramaViewer;