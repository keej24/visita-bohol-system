import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './BoholChurchHeatmap.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  MapPin,
  Church,
  Star,
  Users,
  Award,
  Layers,
  Download,
  ZoomIn,
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

// Types
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
  municipalityKey?: string;
  foundingYear?: number;
  architecturalStyle?: string;
}

type HeatmapLayer = 'visitors' | 'ratings' | 'heritage';

interface ExportData {
  type: string;
  diocese: string;
  layer: HeatmapLayer;
  timestamp: string;
  statistics: {
    total: number;
    heritage: number;
    totalVisitors: number;
    avgRating: number;
  };
  churches: Church[];
  filters: {
    municipality: string;
    heritageOnly: boolean;
  };
}

// Helper function to convert ChurchSummaryData to Church format for heatmap
function convertToChurchFormat(churchData: ChurchSummaryData): Church | null {
  // Skip churches without coordinates
  if (!churchData.coordinates || churchData.coordinates.length !== 2) {
    console.warn(`⚠️ Church ${churchData.name} skipped - missing valid coordinates`);
    return null;
  }

  // Determine heritage status text
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
    municipalityKey: churchData.municipality?.toLowerCase().replace(/\s+/g, '-'),
    foundingYear: churchData.foundingYear,
    architecturalStyle: churchData.architecturalStyle
  };
}

interface BoholChurchHeatmapProps {
  diocese: 'tagbilaran' | 'talibon';
  churches: ChurchSummaryData[]; // Real church data from Firestore
  onExport?: (data: ExportData) => void;
}

// Helper function to get intensity color (for inline use where needed)
function getIntensityColor(intensity: number): string {
  if (intensity >= 0.8) return '#dc2626';
  if (intensity >= 0.6) return '#ea580c';
  if (intensity >= 0.4) return '#f59e0b';
  if (intensity >= 0.2) return '#eab308';
  return '#16a34a';
}

// Helper function to get intensity CSS class
function getIntensityCSSClass(intensity: number): string {
  if (intensity >= 0.8) return 'intensity-high';
  if (intensity >= 0.6) return 'intensity-med-high';
  if (intensity >= 0.4) return 'intensity-medium';
  if (intensity >= 0.2) return 'intensity-med-low';
  return 'intensity-low';
}

// Custom church icon creator using CSS classes
const createChurchIcon = (classification: string, intensity: number, isSelected = false) => {
  const intensityClass = getIntensityCSSClass(intensity);
  const selectedClass = isSelected ? 'church-icon-selected' : '';
  const iconClass = `church-icon-${intensityClass.replace('intensity-', '')}`;
  
  return L.divIcon({
    html: `<div class="${iconClass} ${selectedClass}">⛪</div>`,
    className: 'custom-church-marker',
    iconSize: [25, 25],
    iconAnchor: [12, 12]
  });
};

// Map content component to avoid context issues
const MapContent: React.FC<{
  boholBoundaries: GeoJSON.FeatureCollection | null;
  boundaryStyle: () => any;
  filteredChurches: Church[];
  calculateIntensity: (church: Church) => number;
  selectedChurch: Church | null;
  createChurchIcon: (classification: string, intensity: number, isSelected: boolean) => L.DivIcon;
  handleChurchClick: (church: Church) => void;
  getClassificationColor: (classification: string) => string;
}> = ({
  boholBoundaries,
  boundaryStyle,
  filteredChurches,
  calculateIntensity,
  selectedChurch,
  createChurchIcon,
  handleChurchClick,
  getClassificationColor
}) => {
  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {boholBoundaries && (
        <GeoJSON data={boholBoundaries} style={boundaryStyle} />
      )}
      {filteredChurches.map((church) => {
        const intensity = calculateIntensity(church);
        const isSelected = selectedChurch?.id === church.id;
        return (
          <Marker
            key={church.id}
            position={church.coordinates}
            icon={createChurchIcon(church.classification, intensity, isSelected)}
            eventHandlers={{ click: () => handleChurchClick(church) }}
          >
            <Popup>
              <div className="p-2 min-w-64">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{church.name}</h3>
                  <Badge className={getClassificationColor(church.classification)}>
                    {church.classification}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3">{church.municipality}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{church.visitorCount.toLocaleString()} visitors</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{church.avgRating} ({church.feedbackCount} reviews)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    <span>{church.heritageStatus}</span>
                  </div>
                  {church.foundingYear && (
                    <div className="text-xs text-gray-500 mt-2">
                      Founded: {church.foundingYear} • {church.architecturalStyle}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => handleChurchClick(church)}
                >
                  <ZoomIn className="w-4 h-4 mr-1" />
                  View Details
                </Button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

const BoholChurchHeatmap: React.FC<BoholChurchHeatmapProps> = ({ diocese, churches, onExport }) => {
  const [heatmapLayer, setHeatmapLayer] = useState<HeatmapLayer>('visitors');
  const [showHeritageOnly, setShowHeritageOnly] = useState(false);
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [boholBoundaries, setBoholBoundaries] = useState<GeoJSON.FeatureCollection | null>(null);

  // Convert real church data to heatmap format
  const [realChurches, setRealChurches] = useState<Church[]>([]);

  useEffect(() => {
    console.log(`🗺️ Heatmap: Processing ${churches.length} churches for ${diocese} diocese`);

    const converted = churches
      .map(convertToChurchFormat)
      .filter((church): church is Church => church !== null);

    console.log(`✅ Heatmap: ${converted.length} churches have valid coordinates`);
    if (converted.length > 0) {
      console.log('Sample church:', converted[0]);
    }

    setRealChurches(converted);
  }, [churches, diocese]);

  // Load Bohol boundaries
  useEffect(() => {
    fetch('/bohol-boundaries.geojson')
      .then(response => response.json())
      .then(data => setBoholBoundaries(data))
      .catch(error => console.error('Error loading Bohol boundaries:', error));
  }, []);

  // Get unique municipalities from real church data
  const availableMunicipalities = React.useMemo(() => {
    const municipalityMap = new Map<string, string>();

    realChurches.forEach(church => {
      if (church.municipality && church.municipalityKey) {
        municipalityMap.set(church.municipalityKey, church.municipality);
      }
    });

    return Array.from(municipalityMap.entries()).map(([key, name]) => ({
      key,
      name
    }));
  }, [realChurches]);

  // Calculate heatmap intensity based on selected layer
  const calculateIntensity = (church: Church): number => {
    switch (heatmapLayer) {
      case 'visitors':
        return Math.min(church.visitorCount / 25000, 1);
      case 'ratings':
        return church.avgRating / 5;
      case 'heritage':
        return church.classification === 'ICP' ? 1 : church.classification === 'NCT' ? 0.7 : 0.3;
      default:
        return 0.5;
    }
  };

  // Get classification badge color
  const getClassificationColor = (classification: string): string => {
    switch (classification) {
      case 'ICP': return 'bg-green-100 text-green-800';
      case 'NCT': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter churches based on current filters
  const filteredChurches = React.useMemo(() => {
    return realChurches.filter(church => {
      // Filter by municipality
      if (selectedMunicipality !== 'all' && church.municipalityKey !== selectedMunicipality) {
        return false;
      }

      // Filter by heritage status
      if (showHeritageOnly && !['ICP', 'NCT'].includes(church.classification)) {
        return false;
      }

      return true;
    });
  }, [realChurches, selectedMunicipality, showHeritageOnly]);

  // Calculate statistics for the legend
  const stats = {
    total: filteredChurches.length,
    heritage: filteredChurches.filter(c => ['ICP', 'NCT'].includes(c.classification)).length,
    totalVisitors: filteredChurches.reduce((sum, c) => sum + c.visitorCount, 0),
    avgRating: filteredChurches.length > 0 ? filteredChurches.reduce((sum, c) => sum + c.avgRating, 0) / filteredChurches.length : 0
  };

  // Handle church marker click
  const handleChurchClick = (church: Church) => {
    setSelectedChurch(church);
  };

  // Handle export
  const handleExport = () => {
    const exportData: ExportData = {
      type: 'heatmap_analysis',
      diocese,
      layer: heatmapLayer,
      timestamp: new Date().toISOString(),
      statistics: stats,
      churches: filteredChurches,
      filters: {
        municipality: selectedMunicipality,
        heritageOnly: showHeritageOnly
      }
    };
    onExport?.(exportData);
  };

  // GeoJSON style function for boundaries
  const boundaryStyle = () => ({
    fillColor: 'rgba(59, 130, 246, 0.1)',
    weight: 2,
    opacity: 0.8,
    color: '#3b82f6',
    fillOpacity: 0.1
  });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Interactive Heatmap Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Heatmap Layer</Label>
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

            <div className="space-y-2">
              <Label>Municipality</Label>
              <Select value={selectedMunicipality} onValueChange={setSelectedMunicipality}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Municipalities</SelectItem>
                  {availableMunicipalities.map(({ key, name }) => (
                    <SelectItem key={key} value={key}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="heritage-only"
                checked={showHeritageOnly}
                onCheckedChange={setShowHeritageOnly}
              />
              <Label htmlFor="heritage-only" className="text-sm">
                Heritage Sites Only
              </Label>
            </div>

            <div className="flex items-end">
              <Button onClick={handleExport} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Export Map Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            Interactive Bohol Churches Map - {heatmapLayer === 'visitors' ? 'Visitor Density' : 
                            heatmapLayer === 'ratings' ? 'Rating Distribution' : 
                            'Heritage Significance'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 rounded-lg overflow-hidden border">
            <MapContainer center={[9.8, 124.0]} zoom={10} style={{ height: '100%', width: '100%' }}>
              <MapContent
                boholBoundaries={boholBoundaries}
                boundaryStyle={boundaryStyle}
                filteredChurches={filteredChurches}
                calculateIntensity={calculateIntensity}
                selectedChurch={selectedChurch}
                createChurchIcon={createChurchIcon}
                handleChurchClick={handleChurchClick}
                getClassificationColor={getClassificationColor}
              />
            </MapContainer>
          </div>

          {/* Legend */}
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <h4 className="font-semibold mb-3">Interactive Map Legend</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h5 className="text-sm font-medium">Intensity Scale ({heatmapLayer})</h5>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-red-600"></div>
                    <span className="text-xs">High</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                    <span className="text-xs">Med-High</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                    <span className="text-xs">Medium</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-green-600"></div>
                    <span className="text-xs">Low</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h5 className="text-sm font-medium">Church Classifications</h5>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-green-100 text-green-800 text-xs">ICP - Important Cultural Property</Badge>
                  <Badge className="bg-blue-100 text-blue-800 text-xs">NCT - National Cultural Treasure</Badge>
                  <Badge className="bg-gray-100 text-gray-800 text-xs">Regular Parish</Badge>
                </div>
              </div>
            </div>
            
            <div className="mt-3 text-xs text-gray-500">
              💡 Click on any church marker for detailed information and zoom controls
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Church Details */}
      {selectedChurch && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Selected Church Details</span>
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
                
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Coordinates:</span> {selectedChurch.coordinates[0].toFixed(4)}, {selectedChurch.coordinates[1].toFixed(4)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Churches List */}
      <Card>
        <CardHeader>
          <CardTitle>Churches in Current View ({filteredChurches.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {filteredChurches.map((church) => {
              const intensity = calculateIntensity(church);
              const intensityClass = getIntensityCSSClass(intensity);
              
              return (
                <div key={church.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer church-list-item"
                     onClick={() => handleChurchClick(church)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border border-white ${intensityClass}`} />
                    <div>
                      <h4 className="font-medium">{church.name}</h4>
                      <p className="text-sm text-muted-foreground">{church.municipality}</p>
                    </div>
                    <Badge className={getClassificationColor(church.classification)}>
                      {church.classification}
                    </Badge>
                  </div>
                  
                  <div className="text-right text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{church.visitorCount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{church.avgRating}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BoholChurchHeatmap;