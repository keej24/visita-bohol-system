import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, X, FileText, File, Loader2, ExternalLink, Eye } from 'lucide-react';

interface Document {
  id: string;
  file?: File;
  url?: string;
  name: string;
  size?: number;
  type?: 'photo' | 'document' | '360' | 'heritage-doc';
  status?: 'pending' | 'approved';
  uploadDate?: string;
}

interface DocumentUploaderProps {
  documents: Document[];
  onDocumentsChange: (documents: Document[]) => void;
  maxDocuments?: number;
  disabled?: boolean;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  documents,
  onDocumentsChange,
  maxDocuments = 10,
  disabled = false
}) => {
  const [dragOver, setDragOver] = useState(false);

  const processFiles = useCallback(async (files: FileList) => {
    const validFiles: Document[] = [];

    for (let i = 0; i < Math.min(files.length, maxDocuments - documents.length); i++) {
      const file = files[i];

      // Accept PDF, DOC, DOCX, images
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/jpg'
      ];

      if (!validTypes.includes(file.type)) {
        continue;
      }

      // Max 20MB per document
      if (file.size > 20 * 1024 * 1024) {
        continue;
      }

      const id = `doc_${Date.now()}_${i}`;
      
      // Determine document type based on file extension or MIME type
      let docType: 'photo' | 'document' | '360' | 'heritage-doc' = 'document';
      if (file.type.startsWith('image/')) {
        docType = 'photo';
      } else if (file.name.toLowerCase().includes('heritage') || file.name.toLowerCase().includes('declaration')) {
        docType = 'heritage-doc';
      }
      
      const doc: Document = {
        id,
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        type: docType
      };

      validFiles.push(doc);
    }

    onDocumentsChange([...documents, ...validFiles]);
  }, [documents, maxDocuments, onDocumentsChange]);

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

  const removeDocument = useCallback((id: string) => {
    onDocumentsChange(documents.filter(doc => doc.id !== id));
  }, [documents, onDocumentsChange]);

  const getFileIcon = (type?: string) => {
    if (type?.includes('pdf')) return '📄';
    if (type?.includes('word')) return '📝';
    if (type?.includes('image')) return '🖼️';
    return '📎';
  };

  const openDocument = useCallback((doc: Document) => {
    // If document has a Firebase Storage URL, open it
    if (doc.url && !doc.url.startsWith('blob:')) {
      window.open(doc.url, '_blank', 'noopener,noreferrer');
    } else if (doc.file) {
      // For newly uploaded files (blob URLs), create object URL and open
      const blobUrl = URL.createObjectURL(doc.file);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const canAddMore = documents.length < maxDocuments;

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
          onClick={() => !disabled && document.getElementById('doc-file-input')?.click()}
        >
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-medium text-gray-900 mb-2">Historical Documents</h3>
          <p className="text-sm text-gray-600 mb-3">
            Upload historical documents, certificates, or heritage declarations
          </p>
          <p className="text-xs text-gray-500">
            Drag and drop or click to browse • PDF, DOC, DOCX, Images • Max {maxDocuments} files • Max 20MB each
          </p>

          <input
            id="doc-file-input"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,image/jpeg,image/png,image/jpg"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
            aria-label="Upload historical documents"
          />
        </div>
      )}

      {/* Uploaded Documents List */}
      {documents.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            Uploaded Documents ({documents.length}/{maxDocuments})
          </h4>
          <div className="space-y-2">
            {documents.map((doc) => (
              <Card key={doc.id} className="hover:bg-gray-50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer group"
                      onClick={() => openDocument(doc)}
                      title="Click to open document"
                    >
                      <div className="text-2xl flex-shrink-0">
                        {getFileIcon(doc.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {doc.name}
                        </p>
                        {doc.size && (
                          <p className="text-sm text-gray-500">
                            {(doc.size / (1024 * 1024)).toFixed(1)} MB
                          </p>
                        )}
                        {doc.url && !doc.url.startsWith('blob:') && (
                          <p className="text-xs text-blue-500 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            Click to view
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDocument(doc)}
                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        title="Open document"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(doc.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Remove document"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUploader;
