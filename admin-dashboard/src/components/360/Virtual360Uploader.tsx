import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Loader2, CheckCircle, AlertTriangle, Cloud, CloudUpload } from 'lucide-react';
import VirtualTour360 from '../360/VirtualTour360';
import { useFileUpload } from '@/hooks/useFileUpload';
import { validate360Image, validateFileSize } from '@/utils/validate360Image';
import { compress360Image, getSizeReduction } from '@/utils/imageCompression';

interface Virtual360Image {
  id: string;
  file?: File;
  url: string;
  name: string;
  size?: number;
  description?: string;
  isProcessing?: boolean;
  isValid?: boolean;
  error?: string;
}

interface Virtual360UploaderProps {
  images: Virtual360Image[];
  onImagesChange: (images: Virtual360Image[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

const Virtual360Uploader: React.FC<Virtual360UploaderProps> = ({
  images,
  onImagesChange,
  maxImages = 3,
  disabled = false
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const validateAndCompressFile = useCallback(async (file: File): Promise<{
    isValid: boolean;
    compressedFile?: File;
    error?: string;
    compressionInfo?: string;
  }> => {
    try {
      // Step 1: Validate file size (max 10MB before compression)
      const sizeValidation = validateFileSize(file, 10);
      if (!sizeValidation.isValid) {
        return { isValid: false, error: sizeValidation.message };
      }

      // Step 2: Validate 360° aspect ratio
      const ratioValidation = await validate360Image(file);
      if (!ratioValidation.isValid) {
        return { isValid: false, error: ratioValidation.message };
      }

      // Step 3: Compress the image
      const compressedFile = await compress360Image(file);
      const reduction = getSizeReduction(file, compressedFile);

      return {
        isValid: true,
        compressedFile,
        compressionInfo: `Compressed from ${reduction.originalSizeMB}MB to ${reduction.compressedSizeMB}MB (saved ${reduction.savedMB}MB)`
      };
    } catch (error) {
      console.error('Error processing 360° image:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Failed to process image'
      };
    }
  }, []);

  const processFiles = useCallback(async (files: FileList) => {
    const validFiles: Virtual360Image[] = [];

    for (let i = 0; i < Math.min(files.length, maxImages - images.length); i++) {
      const file = files[i];

      // Basic validation
      if (!file.type.startsWith('image/')) {
        continue;
      }

      const id = `360_${Date.now()}_${i}`;
      const tempImage: Virtual360Image = {
        id,
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        isProcessing: true,
        isValid: false
      };

      validFiles.push(tempImage);

      // Validate, compress, and process the image
      const result = await validateAndCompressFile(file);

      tempImage.isProcessing = false;
      tempImage.isValid = result.isValid;

      if (result.isValid && result.compressedFile) {
        // Replace with compressed file
        tempImage.file = result.compressedFile;
        tempImage.size = result.compressedFile.size;
        tempImage.url = URL.createObjectURL(result.compressedFile);
        tempImage.description = result.compressionInfo;
      } else {
        tempImage.error = result.error || 'Failed to process image';
      }
    }

    onImagesChange([...images, ...validFiles]);
  }, [images, maxImages, onImagesChange, validateAndCompressFile]);

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

  const removeImage = useCallback((id: string) => {
    onImagesChange(images.filter(img => img.id !== id));
  }, [images, onImagesChange]);

  const updateDescription = useCallback((id: string, description: string) => {
    onImagesChange(
      images.map(img => 
        img.id === id ? { ...img, description } : img
      )
    );
  }, [images, onImagesChange]);

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {canAddMore && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && document.getElementById('360-file-input')?.click()}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Upload 360° Equirectangular Images
          </h3>
          <p className="text-gray-600 mb-4">
            Drag and drop your 360° photos here, or click to browse
          </p>
          <p className="text-sm text-gray-500">
            Supports JPEG, PNG • Max {maxImages} images • Must be 2:1 aspect ratio
          </p>
          
          <input
            id="360-file-input"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
            aria-label="Upload 360 degree equirectangular images"
            title="Upload 360° equirectangular images with 2:1 aspect ratio"
          />
        </div>
      )}

      {/* Guidelines */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>360° Image Requirements:</strong> Upload equirectangular panoramic images with 2:1 aspect ratio (max 10MB).
          Images will be automatically validated, compressed, and optimized. Use cameras like Insta360, Ricoh Theta, or similar 360° cameras for best results.
        </AlertDescription>
      </Alert>

      {/* Uploaded Images */}
      {images.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Uploaded 360° Images ({images.length}/{maxImages})</h4>
          
          {images.map((image) => (
            <Card key={image.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🏛️</div>
                    <div>
                      <CardTitle className="text-base">{image.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {image.isProcessing && (
                          <Badge variant="secondary" className="text-xs">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Processing...
                          </Badge>
                        )}
                        {!image.isProcessing && image.isValid && (
                          <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Valid 360° Image
                          </Badge>
                        )}
                        {!image.isProcessing && !image.isValid && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Invalid Format
                          </Badge>
                        )}
                        {image.size && (
                          <span className="text-xs text-gray-500">
                            {(image.size / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeImage(image.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                {image.error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{image.error}</AlertDescription>
                  </Alert>
                )}
                
                {image.isValid && !image.isProcessing && (
                  <div className="space-y-4">
                    {/* 360° Preview */}
                    <VirtualTour360
                      imageUrl={image.url}
                      title="Preview"
                      height="300px"
                      showControls={true}
                      autoLoad={false}
                    />
                    
                    {/* Description Input */}
                    <div>
                      <Label htmlFor={`desc-${image.id}`} className="text-sm font-medium">
                        Description (Optional)
                      </Label>
                      <Input
                        id={`desc-${image.id}`}
                        placeholder="Describe this 360° view (e.g., 'Church Interior', 'Altar View', 'Main Entrance')"
                        value={image.description || ''}
                        onChange={(e) => updateDescription(image.id, e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Virtual360Uploader;
