import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, X, FileText, File, Loader2, ExternalLink, Eye, ShieldAlert, Lock, Globe } from 'lucide-react';

interface Document {
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

      // Accept only PDF, DOC, DOCX documents (no images - use PhotoUploader for photos)
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!validTypes.includes(file.type)) {
        continue;
      }

      // Max 10MB per document
      if (file.size > 10 * 1024 * 1024) {
        continue;
      }

      const id = `doc_${Date.now()}_${i}`;
      
      // Determine document type based on file name
      let docType: 'photo' | 'document' | '360' | 'heritage-doc' = 'document';
      if (file.name.toLowerCase().includes('heritage') || file.name.toLowerCase().includes('declaration')) {
        docType = 'heritage-doc';
      }
      
      const doc: Document = {
        id,
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        type: docType,
        visibility: 'public' // Default to public visibility
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
      {/* Security Notice */}
      <Alert className="bg-amber-50 border-amber-200">
        <ShieldAlert className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 text-sm">
          <strong>Document Guidelines:</strong> Do not upload documents containing artifact inventories, monetary valuations, security measure details, or storage locations of valuable church property.
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
          onClick={() => !disabled && document.getElementById('doc-file-input')?.click()}
        >
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-medium text-gray-900 mb-2">Historical Documents</h3>
          <p className="text-sm text-gray-600 mb-3">
            Upload historical documents, certificates, or heritage declarations
          </p>
          <p className="text-xs text-gray-500">
            Drag and drop or click to browse • PDF, DOC, DOCX only • Max {maxDocuments} files • Max 10MB each
          </p>

          <input
            id="doc-file-input"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
          <h4 className="font-medium text-gray-900 mb-2">
            Uploaded Documents ({documents.length}/{maxDocuments})
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            <strong>Visibility:</strong> Click <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-medium"><Globe className="w-3 h-3 mr-1" />Public</span> or <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-xs font-medium"><Lock className="w-3 h-3 mr-1" />Internal Only</span> to toggle. Internal documents are only visible to administrators.
          </p>
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
                            {doc.name}
                          </p>
                          {doc.visibility === 'internal' && (
                            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                              <Lock className="w-3 h-3 mr-1" /> Internal
                            </Badge>
                          )}
                        </div>
                        {doc.size && (
                          <p className="text-sm text-gray-500">
                            {(doc.size / (1024 * 1024)).toFixed(1)} MB
                          </p>
                        )}
                        {doc.url && !doc.url.startsWith('blob:') && (
                          <p className="text-xs text-emerald-500 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            Click to view
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Visibility Toggle - Explicit button with text */}
                      <Button
                        variant={doc.visibility === 'internal' ? "outline" : "secondary"}
                        size="sm"
                        onClick={() => {
                          const updatedDocs = documents.map(d => 
                            d.id === doc.id 
                              ? { ...d, visibility: d.visibility === 'internal' ? 'public' as const : 'internal' as const }
                              : d
                          );
                          onDocumentsChange(updatedDocs);
                        }}
                        className={doc.visibility === 'internal' 
                          ? "text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100" 
                          : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"}
                      >
                        {doc.visibility === 'internal' ? (
                          <>
                            <Lock className="w-3 h-3 mr-1" />
                            Internal Only
                          </>
                        ) : (
                          <>
                            <Globe className="w-3 h-3 mr-1" />
                            Public
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDocument(doc)}
                        className="text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
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
