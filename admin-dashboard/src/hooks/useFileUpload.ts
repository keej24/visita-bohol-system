import { useState, useCallback } from 'react';
import uploadService, { UploadProgress } from '@/services/uploadService';

interface FileUploadState {
  isUploading: boolean;
  progress: Record<string, number>;
  errors: Record<string, string>;
  completedFiles: string[];
}

interface UseFileUploadOptions {
  maxFiles?: number;
  maxSize?: number;
  allowedTypes?: string[];
  onSuccess?: (urls: string[]) => void;
  onError?: (error: string) => void;
}

export const useFileUpload = (options: UseFileUploadOptions = {}) => {
  const {
    maxFiles = 10,
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['image/*'],
    onSuccess,
    onError
  } = options;

  const [state, setState] = useState<FileUploadState>({
    isUploading: false,
    progress: {},
    errors: {},
    completedFiles: []
  });

  const updateProgress = useCallback((fileId: string, progress: number) => {
    setState(prev => ({
      ...prev,
      progress: { ...prev.progress, [fileId]: progress }
    }));
  }, []);

  const setError = useCallback((fileId: string, error: string) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [fileId]: error }
    }));
  }, []);

  const uploadFiles = useCallback(async (
    files: File[],
    uploadType: 'church_images' | '360_images' | 'heritage_documents' = 'church_images',
    churchId?: string,
    documentType?: 'heritage_declaration' | 'historical_document' | 'restoration_record'
  ) => {
    if (files.length === 0) return;

    if (files.length > maxFiles) {
      onError?.(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate all files first
    for (const file of files) {
      const validation = uploadService.validateFile(file, { maxSize, allowedTypes });
      if (!validation.isValid) {
        onError?.(validation.error || 'Invalid file');
        return;
      }
    }

    setState(prev => ({
      ...prev,
      isUploading: true,
      progress: {},
      errors: {},
      completedFiles: []
    }));

    try {
      let uploadedUrls: string[] = [];

      switch (uploadType) {
        case 'church_images':
          if (!churchId) throw new Error('Church ID required for church images');
          uploadedUrls = await uploadService.uploadChurchImages(
            churchId,
            files,
            (fileIndex, progress) => {
              updateProgress(`file_${fileIndex}`, progress.progress);
            }
          );
          break;

        case '360_images':
          if (!churchId) throw new Error('Church ID required for 360 images');
          const uploaded360 = await uploadService.upload360Images(
            churchId,
            files,
            (fileIndex, progress) => {
              updateProgress(`file_${fileIndex}`, progress.progress);
            }
          );
          uploadedUrls = uploaded360.map(item => item.url);
          break;

        case 'heritage_documents':
          if (!churchId) throw new Error('Church ID required for heritage documents');
          if (!documentType) throw new Error('Document type required for heritage documents');
          const uploadedDocs = await uploadService.uploadHeritageDocuments(
            churchId,
            files,
            documentType,
            (fileIndex, progress) => {
              updateProgress(`file_${fileIndex}`, progress.progress);
            }
          );
          uploadedUrls = uploadedDocs.map(item => item.url);
          break;
      }

      setState(prev => ({
        ...prev,
        isUploading: false,
        completedFiles: uploadedUrls
      }));

      onSuccess?.(uploadedUrls);
      return uploadedUrls;

    } catch (error) {
      setState(prev => ({
        ...prev,
        isUploading: false
      }));

      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onError?.(errorMessage);
      throw error;
    }
  }, [maxFiles, maxSize, allowedTypes, onSuccess, onError, updateProgress]);

  const uploadSingleFile = useCallback(async (
    file: File,
    folder?: string,
    filename?: string
  ): Promise<string> => {
    const validation = uploadService.validateFile(file, { maxSize, allowedTypes });
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid file');
    }

    setState(prev => ({
      ...prev,
      isUploading: true,
      progress: { single: 0 },
      errors: {},
      completedFiles: []
    }));

    try {
      const url = await uploadService.uploadFile(file, {
        folder,
        filename,
        onProgress: (progress) => {
          updateProgress('single', progress.progress);
        }
      });

      setState(prev => ({
        ...prev,
        isUploading: false,
        completedFiles: [url]
      }));

      onSuccess?.[url];
      return url;

    } catch (error) {
      setState(prev => ({
        ...prev,
        isUploading: false
      }));

      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onError?.(errorMessage);
      throw error;
    }
  }, [maxSize, allowedTypes, onSuccess, onError, updateProgress]);

  const resetState = useCallback(() => {
    setState({
      isUploading: false,
      progress: {},
      errors: {},
      completedFiles: []
    });
  }, []);

  const deleteFile = useCallback(async (url: string) => {
    try {
      await uploadService.deleteFile(url);
      setState(prev => ({
        ...prev,
        completedFiles: prev.completedFiles.filter(fileUrl => fileUrl !== url)
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      onError?.(errorMessage);
      throw error;
    }
  }, [onError]);

  const getOverallProgress = useCallback(() => {
    const progressValues = Object.values(state.progress);
    if (progressValues.length === 0) return 0;

    const totalProgress = progressValues.reduce((sum, progress) => sum + progress, 0);
    return Math.round(totalProgress / progressValues.length);
  }, [state.progress]);

  return {
    // State
    isUploading: state.isUploading,
    progress: state.progress,
    errors: state.errors,
    completedFiles: state.completedFiles,
    overallProgress: getOverallProgress(),

    // Methods
    uploadFiles,
    uploadSingleFile,
    deleteFile,
    resetState,

    // Utilities
    formatFileSize: uploadService.formatFileSize,
    validateFile: (file: File) => uploadService.validateFile(file, { maxSize, allowedTypes })
  };
};

export default useFileUpload;