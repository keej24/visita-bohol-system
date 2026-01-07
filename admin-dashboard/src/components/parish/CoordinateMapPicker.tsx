import React, { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MapPin,
  Loader2,
  CheckCircle,
  AlertCircle,
  Target,
  RotateCcw,
  Search
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom church marker icon
const churchIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Bohol region constants (moved outside component to avoid dependency issues)
const BOHOL_CENTER = { lat: 9.85, lng: 124.1 };
const BOHOL_BOUNDS = {
  minLat: 9.4,
  maxLat: 10.2,
  minLng: 123.7,
  maxLng: 124.7
};

interface CoordinateMapPickerProps {
  latitude: number;
  longitude: number;
  onCoordinatesChange: (lat: number, lng: number) => void;
  disabled?: boolean;
  /** Parish/Church name from the form - used for auto-search */
  parishName?: string;
  /** Municipality from the form - used for auto-search */
  municipality?: string;
}

// Component to handle map click events
const MapClickHandler: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
  disabled?: boolean;
}> = ({ onMapClick, disabled }) => {
  useMapEvents({
    click: (e) => {
      if (!disabled) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

// Component to recenter map when coordinates change externally
const MapRecenter: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  
  useEffect(() => {
    if (lat !== 0 && lng !== 0) {
      map.setView([lat, lng], map.getZoom());
    }
  }, [lat, lng, map]);
  
  return null;
};

export const CoordinateMapPicker: React.FC<CoordinateMapPickerProps> = ({
  latitude,
  longitude,
  onCoordinatesChange,
  disabled = false,
  parishName = '',
  municipality = ''
}) => {
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hasValidCoordinates, setHasValidCoordinates] = useState(false);
  
  // Search state - simplified to use form data
  const [searchResults, setSearchResults] = useState<Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Check if coordinates are valid (non-zero and within Bohol)
  useEffect(() => {
    const isValid = latitude !== 0 && longitude !== 0 &&
      latitude >= BOHOL_BOUNDS.minLat && latitude <= BOHOL_BOUNDS.maxLat &&
      longitude >= BOHOL_BOUNDS.minLng && longitude <= BOHOL_BOUNDS.maxLng;
    setHasValidCoordinates(isValid);
  }, [latitude, longitude]);

  // Build search query from parish name and municipality
  const getSearchQuery = useCallback(() => {
    const parts = [];
    if (parishName) parts.push(parishName);
    if (municipality) parts.push(municipality);
    return parts.join(', ');
  }, [parishName, municipality]);

  // Generate alternative search queries for better results
  const getAlternativeQueries = useCallback(() => {
    const queries: string[] = [];
    
    // Clean municipality - remove common suffixes that break Nominatim search
    let cleanMunicipality = municipality?.trim() || '';
    cleanMunicipality = cleanMunicipality
      .replace(/\s+(city|town|municipality)$/i, '') // Remove "city", "town", "municipality" suffix
      .trim();
    
    const cleanParishName = parishName?.trim() || '';
    
    // Extract key words from parish name (church, cathedral, shrine, chapel, etc.)
    const churchKeywords = ['cathedral', 'church', 'shrine', 'chapel', 'basilica', 'parish'];
    const parishLower = cleanParishName.toLowerCase();
    const foundKeyword = churchKeywords.find(kw => parishLower.includes(kw));
    
    // Strategy 1: Extract saint name + municipality (PRIORITY - most specific)
    // e.g., "St. Joseph the Worker Cathedral Shrine" -> "St. Joseph Tagbilaran"
    if (cleanParishName && cleanMunicipality) {
      const words = cleanParishName.split(/\s+/);
      // Check if starts with "St.", "San", "Santo", "Santa", "Sto.", "Sta.", "Our Lady", etc.
      const saintPrefixes = ['st.', 'st', 'san', 'santo', 'santa', 'sto.', 'sta.', 'our'];
      const firstWordLower = words[0]?.toLowerCase() || '';
      
      if (saintPrefixes.includes(firstWordLower)) {
        // Take first 2-3 words (usually the saint name like "St. Joseph" or "Our Lady of")
        let nameWords = 2;
        if (firstWordLower === 'our' && words[1]?.toLowerCase() === 'lady') {
          nameWords = 4; // "Our Lady of [Name]"
        }
        const shortName = words.slice(0, nameWords).join(' ');
        queries.push(`${shortName} ${cleanMunicipality}`);
      }
    }
    
    // Strategy 2: Church type + municipality (e.g., "cathedral Tagbilaran")
    if (foundKeyword && cleanMunicipality) {
      queries.push(`${foundKeyword} ${cleanMunicipality}`);
    }
    
    // Strategy 3: Full query (less likely to work but try anyway)
    if (cleanParishName && cleanMunicipality) {
      queries.push(`${cleanParishName}, ${cleanMunicipality}`);
    } else if (cleanParishName) {
      queries.push(cleanParishName);
    }
    
    return queries;
  }, [parishName, municipality]);

  // Search for places using Nominatim API (OpenStreetMap)
  const searchPlaces = useCallback(async () => {
    const queries = getAlternativeQueries();
    if (queries.length === 0 || queries[0].length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    
    const expandedBounds = {
      minLat: BOHOL_BOUNDS.minLat - 0.5,
      maxLat: BOHOL_BOUNDS.maxLat + 0.5,
      minLng: BOHOL_BOUNDS.minLng - 0.5,
      maxLng: BOHOL_BOUNDS.maxLng + 0.5
    };

    try {
      // Try each query strategy until we get results
      for (const query of queries) {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
          `format=json&q=${encodeURIComponent(query + ', Bohol, Philippines')}&` +
          `limit=5`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'VISITA-Admin-Dashboard'
            }
          }
        );
        
        if (response.ok) {
          const results = await response.json();
          // Filter results to only include those within or near Bohol
          const filteredData = results.filter((result: { lat: string; lon: string }) => {
            const lat = parseFloat(result.lat);
            const lng = parseFloat(result.lon);
            return lat >= expandedBounds.minLat && lat <= expandedBounds.maxLat &&
                   lng >= expandedBounds.minLng && lng <= expandedBounds.maxLng;
          });
          
          if (filteredData.length > 0) {
            console.log(`🔍 Search succeeded with query: "${query}"`);
            setSearchResults(filteredData);
            setShowResults(true);
            return;
          }
        }
        
        // Small delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // No results from any query
      console.log('🔍 No results found for any query strategy');
      setSearchResults([]);
      setShowResults(false);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [getAlternativeQueries]);

  // Handle selecting a search result
  const handleSelectResult = (result: { lat: string; lon: string; display_name: string }) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    // Validate within Bohol bounds
    if (lat < BOHOL_BOUNDS.minLat || lat > BOHOL_BOUNDS.maxLat ||
        lng < BOHOL_BOUNDS.minLng || lng > BOHOL_BOUNDS.maxLng) {
      setLocationError('Selected location is outside Bohol region');
      return;
    }
    
    onCoordinatesChange(lat, lng);
    setSearchResults([]);
    setShowResults(false);
    setLocationError(null);
  };

  // Check if we have enough info to search
  const canSearch = parishName.length >= 3 || municipality.length >= 3;

  // Determine map center
  const mapCenter = hasValidCoordinates
    ? { lat: latitude, lng: longitude }
    : BOHOL_CENTER;

  const handleMapClick = useCallback((lat: number, lng: number) => {
    // Validate coordinates are within Bohol region
    if (lat < BOHOL_BOUNDS.minLat || lat > BOHOL_BOUNDS.maxLat ||
        lng < BOHOL_BOUNDS.minLng || lng > BOHOL_BOUNDS.maxLng) {
      setLocationError('Please select a location within Bohol region');
      return;
    }
    
    setLocationError(null);
    onCoordinatesChange(lat, lng);
  }, [onCoordinatesChange]);

  const handleResetToCenter = useCallback(() => {
    onCoordinatesChange(0, 0);
    setLocationError(null);
  }, [onCoordinatesChange]);

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardContent className="p-4 space-y-4">
        {/* Header with instructions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900">Select Church Location</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {canSearch && !hasValidCoordinates && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={searchPlaces}
                disabled={isSearching || disabled}
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Find Location
                  </>
                )}
              </Button>
            )}
            {hasValidCoordinates && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetToCenter}
                disabled={disabled}
                className="text-gray-600 hover:text-gray-800"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {locationError && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {locationError}
            </AlertDescription>
          </Alert>
        )}

        {/* Search Results - shown below when we have results */}
        {showResults && searchResults.length > 0 && (
          <div className="bg-white border border-blue-200 rounded-lg shadow-sm">
            <div className="px-3 py-2 bg-blue-50 border-b border-blue-200 rounded-t-lg">
              <p className="text-sm font-medium text-blue-800">
                Select a location for "{getSearchQuery()}"
              </p>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  type="button"
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-blue-50"
                  onClick={() => handleSelectResult(result)}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700 line-clamp-2">{result.display_name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No results message */}
        {hasSearched && !isSearching && searchResults.length === 0 && !hasValidCoordinates && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-800">
              No location found for "{getSearchQuery()}". Please click on the map to select the location manually.
            </AlertDescription>
          </Alert>
        )}        {/* Map Container */}
        <div className="relative rounded-lg overflow-hidden border border-blue-200">
          <MapContainer
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={hasValidCoordinates ? 15 : 10}
            style={{ height: '300px', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onMapClick={handleMapClick} disabled={disabled} />
            <MapRecenter lat={latitude} lng={longitude} />
            
            {/* Show marker only if we have valid coordinates */}
            {hasValidCoordinates && (
              <Marker position={[latitude, longitude]} icon={churchIcon} />
            )}
          </MapContainer>

          {/* Overlay instructions when no coordinates selected */}
          {!hasValidCoordinates && !disabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none z-10">
              <div className="bg-white/95 px-4 py-3 rounded-lg shadow-lg text-center">
                <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-800">Click on the map to select location</p>
                {canSearch && (
                  <p className="text-xs text-gray-500 mt-1">or use "Find Location" button above</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Selected Coordinates Display */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-blue-200">
          <div className="flex items-center gap-2">
            {hasValidCoordinates ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-700">
                  Selected: <span className="font-mono font-medium">{latitude.toFixed(6)}, {longitude.toFixed(6)}</span>
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-gray-600">No location selected</span>
              </>
            )}
          </div>
          
          {hasValidCoordinates && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <MapPin className="w-3 h-3 mr-1" />
              Within Bohol Region
            </Badge>
          )}
        </div>

        {/* Helper text */}
        <p className="text-xs text-gray-500">
          💡 <strong>Tip:</strong> {canSearch ? 'Click "Find Location" to search using your parish name, or click directly on the map.' : 'Enter your parish name and municipality above, then click "Find Location" to search.'} Only locations within Bohol are accepted.
        </p>
      </CardContent>
    </Card>
  );
};

export default CoordinateMapPicker;
