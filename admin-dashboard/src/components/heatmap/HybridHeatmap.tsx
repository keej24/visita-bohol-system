import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  MapPin,
  Users,
  Star,
  Award,
  Layers,
  Navigation
} from 'lucide-react';
import type { ChurchSummaryData } from '@/services/dioceseAnalyticsService';

// Fix default marker icons for Leaflet
const defaultIcon = L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: () => void };
delete defaultIcon._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Type augmentation for leaflet.heat
declare module 'leaflet' {
  function heatLayer(
    latlngs: Array<[number, number, number]>,
    options?: {
      radius?: number;
      blur?: number;
      maxZoom?: number;
      max?: number;
      gradient?: { [key: number]: string };
    }
  ): L.Layer;
}

interface Church {
  id: string;
  name: string;
  coordinates: [number, number];
  classification: 'ICP' | 'NCT' | 'non_heritage';
  visitorCount: number;
  avgRating: number;
  feedbackCount: number;
  heritageStatus: string;
  municipality?: string;
  foundingYear?: number;
  architecturalStyle?: string;
}

type HeatmapLayer = 'visitors' | 'ratings' | 'heritage';

interface HybridHeatmapProps {
  diocese: 'tagbilaran' | 'talibon';
  churches: ChurchSummaryData[];
}

// Helper function to convert ChurchSummaryData to Church format
function convertToChurchFormat(churchData: ChurchSummaryData): Church | null {
  if (!churchData.coordinates || churchData.coordinates.length !== 2) {
    console.log(`❌ Church "${churchData.name}" has no valid coordinates:`, churchData.coordinates);
    return null;
  }

  console.log(`✓ Church "${churchData.name}" has coordinates:`, churchData.coordinates);

  let heritageStatus = 'Regular Parish';
  if (churchData.classification === 'ICP') {
    heritageStatus = 'Important Cultural Property';
  } else if (churchData.classification === 'NCT') {
    heritageStatus = 'National Cultural Treasure';
  }

  return {
    id: churchData.id,
    name: churchData.name,
    coordinates: [churchData.coordinates[0], churchData.coordinates[1]],
    classification: churchData.classification,
    visitorCount: churchData.visitorCount,
    avgRating: churchData.avgRating,
    feedbackCount: churchData.feedbackCount,
    heritageStatus,
    municipality: churchData.municipality,
    foundingYear: churchData.foundingYear,
    architecturalStyle: churchData.architecturalStyle
  };
}

// Get classification color
const getClassificationColor = (classification: string): string => {
  switch (classification) {
    case 'ICP': return 'bg-green-100 text-green-800';
    case 'NCT': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Create custom church icon
const createChurchIcon = (church: Church) => {
  const color = church.classification === 'ICP' ? '#16a34a' :
                church.classification === 'NCT' ? '#2563eb' : '#6b7280';

  return L.divIcon({
    html: `<div style="
      background: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    ">⛪</div>`,
    className: 'custom-church-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

export const HybridHeatmap: React.FC<HybridHeatmapProps> = ({ diocese, churches }) => {
  const [heatmapLayer, setHeatmapLayer] = useState<HeatmapLayer>('visitors');
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);

  const mapRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Convert churches data
  const [convertedChurches, setConvertedChurches] = useState<Church[]>([]);

  useEffect(() => {
    console.log('🗺️ HybridHeatmap: Received churches data:', churches.length);
    
    const converted = churches
      .map(convertToChurchFormat)
      .filter((church): church is Church => church !== null);
    
    console.log('✅ HybridHeatmap: Converted churches with coordinates:', converted.length);
    
    if (converted.length === 0 && churches.length > 0) {
      console.warn('⚠️ HybridHeatmap: No churches have valid coordinates!');
      console.log('Sample church data:', churches[0]);
    }
    
    if (converted.length > 0) {
      console.log('Sample converted church:', converted[0]);
      console.log('Visitor counts:', converted.map(c => ({ name: c.name, visitors: c.visitorCount })));
    }
    
    setConvertedChurches(converted);
  }, [churches]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([9.8, 124.0], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Calculate max values for normalization
  const maxVisitorCount = React.useMemo(() => {
    if (convertedChurches.length === 0) return 1;
    const max = Math.max(...convertedChurches.map(c => c.visitorCount));
    console.log('📊 Max visitor count for normalization:', max);
    return max || 1; // Avoid division by zero
  }, [convertedChurches]);

  // Calculate intensity based on selected layer
  const calculateIntensity = React.useCallback((church: Church): number => {
    const MIN_INTENSITY = 0.15; // Minimum visibility for any church
    
    switch (heatmapLayer) {
      case 'visitors': {
        // Use dynamic normalization based on actual max visitor count
        // This ensures churches with visitors show visible intensity
        if (church.visitorCount === 0) return MIN_INTENSITY;
        const normalizedValue = church.visitorCount / maxVisitorCount;
        // Scale between MIN_INTENSITY and 1.0
        const intensity = MIN_INTENSITY + (normalizedValue * (1 - MIN_INTENSITY));
        console.log(`🔥 Visitor intensity for ${church.name}: ${church.visitorCount} visitors → ${intensity.toFixed(3)}`);
        return intensity;
      }
      case 'ratings': {
        // Ensure minimum visibility even for unrated churches
        if (church.avgRating === 0) return MIN_INTENSITY;
        const normalizedRating = church.avgRating / 5;
        return MIN_INTENSITY + (normalizedRating * (1 - MIN_INTENSITY));
      }
      case 'heritage':
        return church.classification === 'NCT' ? 1 : church.classification === 'ICP' ? 0.7 : 0.3;
      default:
        return 0.5;
    }
  }, [heatmapLayer, maxVisitorCount]);

  // Update map layers when data or view mode changes
  useEffect(() => {
    if (!mapRef.current || convertedChurches.length === 0) {
      console.log('⏳ Heatmap waiting for data:', { 
        hasMap: !!mapRef.current, 
        churchCount: convertedChurches.length 
      });
      return;
    }

    console.log('🎨 Rendering heatmap with:', {
      heatmapLayer,
      churchCount: convertedChurches.length
    });

    const map = mapRef.current;

    // Clear existing layers
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }
    markersRef.current.forEach(marker => map.removeLayer(marker));
    markersRef.current = [];

    // Add heatmap layer only
    const heatData: Array<[number, number, number]> = convertedChurches.map(church => [
      church.coordinates[0],
      church.coordinates[1],
      calculateIntensity(church)
    ]);

    console.log('🔥 Adding heatmap layer with data points:', heatData.length);
    console.log('📊 Visitor counts:', convertedChurches.map(c => ({ name: c.name.substring(0, 20), visitors: c.visitorCount })));
    console.log('🎨 Heat data sample (lat, lng, intensity):', heatData.slice(0, 3));
    console.log('📈 Intensity range:', {
      min: Math.min(...heatData.map(d => d[2])).toFixed(3),
      max: Math.max(...heatData.map(d => d[2])).toFixed(3)
    });

    heatLayerRef.current = L.heatLayer(heatData, {
      radius: 25,
      blur: 20,
      maxZoom: 10,
      gradient: {
        0.0: '#16a34a',  // green
        0.3: '#fbbf24',  // yellow
        0.5: '#f59e0b',  // orange
        0.7: '#ea580c',  // dark orange
        1.0: '#dc2626'   // red
      }
    }).addTo(map);
    
    console.log('✅ Heatmap layer added successfully');
  }, [convertedChurches, heatmapLayer, calculateIntensity]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Heatmap Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Heatmap Layer */}
            <div className="space-y-2">
              <Label>Intensity Metric</Label>
              <Select value={heatmapLayer} onValueChange={(value: HeatmapLayer) => setHeatmapLayer(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visitors">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Visitor Density
                    </div>
                  </SelectItem>
                  <SelectItem value="ratings">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Rating Distribution
                    </div>
                  </SelectItem>
                  <SelectItem value="heritage">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      Heritage Significance
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stats */}
            <div className="space-y-2">
              <Label>Statistics</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{convertedChurches.length}</div>
                  <div className="text-xs text-muted-foreground">Churches with coordinates</div>
                </div>
                {heatmapLayer === 'visitors' && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {convertedChurches.reduce((sum, c) => sum + c.visitorCount, 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-blue-600">Total Visitors</div>
                  </div>
                )}
                {heatmapLayer === 'ratings' && (
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {convertedChurches.length > 0 
                        ? (convertedChurches.reduce((sum, c) => sum + c.avgRating, 0) / convertedChurches.length).toFixed(1)
                        : '0'}
                    </div>
                    <div className="text-xs text-yellow-600">Avg Rating</div>
                  </div>
                )}
                {heatmapLayer === 'heritage' && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {convertedChurches.filter(c => c.classification === 'ICP' || c.classification === 'NCT').length}
                    </div>
                    <div className="text-xs text-green-600">Heritage Sites</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            {diocese === 'tagbilaran' ? 'Diocese of Tagbilaran' : 'Diocese of Talibon'} - {
              heatmapLayer === 'visitors' ? 'Visitor Density' :
              heatmapLayer === 'ratings' ? 'Rating Distribution' :
              'Heritage Significance'
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {convertedChurches.length === 0 && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                <strong>Note:</strong> No churches with valid coordinates found. The heatmap will show once churches have location data.
              </p>
            </div>
          )}
          <div
            ref={mapContainerRef}
            style={{ height: '500px', width: '100%' }}
            className="rounded-lg overflow-hidden border"
          />

          {/* Legend */}
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <h4 className="font-semibold mb-3">Legend</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h5 className="text-sm font-medium">Heat Intensity</h5>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-red-600"></div>
                    <span className="text-xs">High {heatmapLayer === 'visitors' ? 'visitors' : heatmapLayer === 'ratings' ? 'rating' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                    <span className="text-xs">Medium</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-yellow-400"></div>
                    <span className="text-xs">Low</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-green-600"></div>
                    <span className="text-xs">Minimal</span>
                  </div>
                </div>
                {heatmapLayer === 'visitors' && maxVisitorCount > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    Scale: 0 - {maxVisitorCount.toLocaleString()} visitors
                  </div>
                )}
              </div>

             
            </div>

            <div className="mt-3 text-xs text-gray-500">
              💡 {heatmapLayer === 'visitors' 
                ? 'Brighter/warmer colors indicate churches with more visitors' 
                : heatmapLayer === 'ratings'
                ? 'Brighter/warmer colors indicate churches with higher ratings'
                : 'NCT sites show highest intensity, followed by ICP, then regular churches'
              }
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Church Details */}
      {selectedChurch && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Selected Church</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedChurch(null)}
              >
                Close
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <h3 className="text-xl font-semibold">{selectedChurch.name}</h3>
                  <p className="text-gray-600">{selectedChurch.municipality}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className={getClassificationColor(selectedChurch.classification)}>
                    {selectedChurch.classification}
                  </Badge>
                  <span className="text-sm text-gray-600">{selectedChurch.heritageStatus}</span>
                </div>

                {selectedChurch.foundingYear && (
                  <div className="text-sm">
                    <span className="font-medium">Founded:</span> {selectedChurch.foundingYear}
                  </div>
                )}

                {selectedChurch.architecturalStyle && (
                  <div className="text-sm">
                    <span className="font-medium">Architectural Style:</span> {selectedChurch.architecturalStyle}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">{selectedChurch.visitorCount.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">Visitors</div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <div className="text-lg font-bold text-yellow-600 flex items-center justify-center gap-1">
                      {selectedChurch.avgRating}
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="text-xs text-gray-600">Rating</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">{selectedChurch.feedbackCount}</div>
                    <div className="text-xs text-gray-600">Reviews</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
