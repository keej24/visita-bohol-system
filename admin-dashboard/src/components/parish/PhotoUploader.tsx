import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Upload, X, Camera, Loader2, ShieldAlert, Lock, Globe } from 'lucide-react';

interface Photo {
  id: string;
  file?: File;
  url?: string;
  name: string;
  size?: number;
  type?: 'photo' | 'document' | '360' | 'heritage-doc';
  status?: 'pending' | 'approved';
  uploadDate?: string;
  visibility?: 'public' | 'internal';
}

interface PhotoUploaderProps {
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photos,
  onPhotosChange,
  maxPhotos = 10,
  disabled = false
}) => {
  const [dragOver, setDragOver] = useState(false);

  const processFiles = useCallback(async (files: FileList) => {
    const validFiles: Photo[] = [];

    for (let i = 0; i < Math.min(files.length, maxPhotos - photos.length); i++) {
      const file = files[i];

      // Basic validation
      if (!file.type.startsWith('image/')) {
        continue;
      }

      // Max 5MB per photo
      if (file.size > 5 * 1024 * 1024) {
        continue;
      }

      const id = `photo_${Date.now()}_${i}`;
      const photo: Photo = {
        id,
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size
      };

      validFiles.push(photo);
    }

    onPhotosChange([...photos, ...validFiles]);
  }, [photos, maxPhotos, onPhotosChange]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      processFiles(files);
    }
    event.target.value = '';
  }, [processFiles]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);

    const files = event.dataTransfer.files;
    if (files && !disabled) {
      processFiles(files);
    }
  }, [disabled, processFiles]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const removePhoto = useCallback((id: string) => {
    onPhotosChange(photos.filter(photo => photo.id !== id));
  }, [photos, onPhotosChange]);

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="space-y-4">
      {/* Security Notice */}
      <Alert className="bg-amber-50 border-amber-200">
        <ShieldAlert className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 text-sm">
          <strong>Photo Guidelines:</strong> Avoid close-up photos of removable valuable items such as antique statues, gold relics, or jewelry. Focus on architectural features and the overall church environment to protect sacred artifacts.
        </AlertDescription>
      </Alert>

      {/* Upload Area */}
      {canAddMore && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && document.getElementById('photo-file-input')?.click()}
        >
          <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-medium text-gray-900 mb-2">Church Photos</h3>
          <p className="text-sm text-gray-600 mb-3">
            Upload regular photos of your church exterior, interior, and special features
          </p>
          <p className="text-xs text-gray-500">
            Drag and drop or click to browse • JPEG, PNG • Max {maxPhotos} photos • Max 5MB each
          </p>

          <input
            id="photo-file-input"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/jpg"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
            aria-label="Upload church photos"
          />
        </div>
      )}

      {/* Uploaded Photos Grid */}
      {photos.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            Uploaded Photos ({photos.length}/{maxPhotos})
          </h4>
          <TooltipProvider>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <div key={photo.id || `photo-${index}`} className="relative group">
                <div className={`aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 ${photo.visibility === 'internal' ? 'border-amber-400' : 'border-gray-200'}`}>
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Internal badge overlay */}
                  {photo.visibility === 'internal' && (
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-amber-300 shadow-sm">
                        <Lock className="w-3 h-3 mr-1" /> Internal
                      </Badge>
                    </div>
                  )}
                </div>
                {/* Action buttons */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Visibility Toggle */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const updatedPhotos = photos.map(p => 
                            p.id === photo.id 
                              ? { ...p, visibility: p.visibility === 'internal' ? 'public' as const : 'internal' as const }
                              : p
                          );
                          onPhotosChange(updatedPhotos);
                        }}
                        className={`h-8 w-8 p-0 ${photo.visibility === 'internal' ? 'bg-amber-100 hover:bg-amber-200 text-amber-700' : 'bg-white/90 hover:bg-white text-gray-600'}`}
                      >
                        {photo.visibility === 'internal' ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {photo.visibility === 'internal' 
                        ? "Internal Only - Click to make public" 
                        : "Public - Click to mark as internal"}
                    </TooltipContent>
                  </Tooltip>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removePhoto(photo.id)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-600 mt-1 truncate">{photo.name}</p>
                {photo.size && (
                  <p className="text-xs text-gray-500">
                    {(photo.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                )}
              </div>
            ))}
          </div>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;
