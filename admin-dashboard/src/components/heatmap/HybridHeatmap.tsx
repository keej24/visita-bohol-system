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
  Navigation,
  Eye,
  EyeOff,
  Flame
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
type ViewMode = 'heatmap' | 'markers' | 'both';

interface HybridHeatmapProps {
  diocese: 'tagbilaran' | 'talibon';
  churches: ChurchSummaryData[];
}

// Helper function to convert ChurchSummaryData to Church format
function convertToChurchFormat(churchData: ChurchSummaryData): Church | null {
  if (!churchData.coordinates || churchData.coordinates.length !== 2) {
    return null;
  }

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
  const [viewMode, setViewMode] = useState<ViewMode>('both');
  const [heatmapLayer, setHeatmapLayer] = useState<HeatmapLayer>('visitors');
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);

  const mapRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Convert churches data
  const [convertedChurches, setConvertedChurches] = useState<Church[]>([]);

  useEffect(() => {
    const converted = churches
      .map(convertToChurchFormat)
      .filter((church): church is Church => church !== null);
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

  // Calculate intensity based on selected layer
  const calculateIntensity = (church: Church): number => {
    switch (heatmapLayer) {
      case 'visitors':
        return Math.min(church.visitorCount / 1000, 1); // Normalize to 0-1
      case 'ratings':
        return church.avgRating / 5;
      case 'heritage':
        return church.classification === 'NCT' ? 1 : church.classification === 'ICP' ? 0.7 : 0.3;
      default:
        return 0.5;
    }
  };

  // Update map layers when data or view mode changes
  useEffect(() => {
    if (!mapRef.current || convertedChurches.length === 0) return;

    const map = mapRef.current;

    // Clear existing layers
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }
    markersRef.current.forEach(marker => map.removeLayer(marker));
    markersRef.current = [];

    // Add heatmap layer if enabled
    if (viewMode === 'heatmap' || viewMode === 'both') {
      const heatData: Array<[number, number, number]> = convertedChurches.map(church => [
        church.coordinates[0],
        church.coordinates[1],
        calculateIntensity(church)
      ]);

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
    }

    // Add marker layer if enabled
    if (viewMode === 'markers' || viewMode === 'both') {
      convertedChurches.forEach(church => {
        const marker = L.marker(church.coordinates, {
          icon: createChurchIcon(church)
        }).addTo(map);

        marker.bindPopup(`
          <div style="min-width: 200px;">
            <div style="font-weight: 600; font-size: 16px; margin-bottom: 8px;">
              ${church.name}
            </div>
            <div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">
              ${church.municipality || ''}
            </div>
            <div style="font-size: 14px; display: flex; flex-direction: column; gap: 4px;">
              <div>👥 ${church.visitorCount.toLocaleString()} visitors</div>
              <div>⭐ ${church.avgRating} (${church.feedbackCount} reviews)</div>
              <div>🏛️ ${church.heritageStatus}</div>
              ${church.foundingYear ? `<div style="margin-top: 4px; font-size: 12px; color: #6b7280;">Founded: ${church.foundingYear}</div>` : ''}
            </div>
          </div>
        `);

        marker.on('click', () => setSelectedChurch(church));

        markersRef.current.push(marker);
      });
    }
  }, [convertedChurches, viewMode, heatmapLayer]);

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* View Mode */}
            <div className="space-y-2">
              <Label>View Mode</Label>
              <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="heatmap">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4" />
                      Heatmap Only
                    </div>
                  </SelectItem>
                  <SelectItem value="markers">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Markers Only
                    </div>
                  </SelectItem>
                  <SelectItem value="both">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Both (Hybrid)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

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
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{convertedChurches.length}</div>
                <div className="text-xs text-muted-foreground">Churches with coordinates</div>
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
                <h5 className="text-sm font-medium">
                  {viewMode !== 'markers' ? 'Heat Intensity' : 'Church Markers'}
                </h5>
                {viewMode !== 'markers' && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded-full bg-red-600"></div>
                      <span className="text-xs">High</span>
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
                )}
              </div>

              <div className="space-y-2">
                <h5 className="text-sm font-medium">Church Classifications</h5>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-green-100 text-green-800 text-xs">ICP</Badge>
                  <Badge className="bg-blue-100 text-blue-800 text-xs">NCT</Badge>
                  <Badge className="bg-gray-100 text-gray-800 text-xs">Regular</Badge>
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              💡 Click on any church marker for detailed information • Toggle view mode to see different visualizations
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
