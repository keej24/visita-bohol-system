import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Camera, Loader2 } from 'lucide-react';

interface Photo {
  id: string;
  file?: File;
  url?: string;
  name: string;
  size?: number;
  type?: 'photo' | 'document' | '360' | 'heritage-doc';
  status?: 'pending' | 'approved' | 'rejected';
  uploadDate?: string;
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

      // Max 10MB per photo
      if (file.size > 10 * 1024 * 1024) {
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
      {/* Upload Area */}
      {canAddMore && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
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
            Drag and drop or click to browse • JPEG, PNG • Max {maxPhotos} photos • Max 10MB each
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <div key={photo.id || `photo-${index}`} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removePhoto(photo.id)}
                  className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </Button>
                <p className="text-xs text-gray-600 mt-1 truncate">{photo.name}</p>
                {photo.size && (
                  <p className="text-xs text-gray-500">
                    {(photo.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;
