import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import type { ChurchInfo, ChurchImportSession } from '@/components/parish/types';
import { AuditService, createFieldChange } from '@/services/auditService';
import type { UserProfile } from '@/contexts/AuthContext';
import { ChurchImportService } from '@/services/churchImportService';

interface ChurchDocumentImportProps {
  churchId?: string;
  diocese?: string;
  user?: UserProfile | null;
  currentData: ChurchInfo;
  disabled?: boolean;
  onApply: (data: Partial<ChurchInfo>, metadata: { importId: string; appliedFields: string[] }) => void;
}

type FieldDefinition = {
  path: string;
  label: string;
  description?: string;
};

const FIELD_DEFINITIONS: FieldDefinition[] = [
  { path: 'parishName', label: 'Parish Name' },
  { path: 'churchName', label: 'Church Name' },
  { path: 'locationDetails.streetAddress', label: 'Street Address' },
  { path: 'locationDetails.barangay', label: 'Barangay' },
  { path: 'locationDetails.municipality', label: 'Municipality' },
  { path: 'locationDetails.province', label: 'Province' },
  { path: 'currentParishPriest', label: 'Current Parish Priest' },
  { path: 'feastDay', label: 'Feast Day' },
  { path: 'historicalDetails.foundingYear', label: 'Founding Year' },
  { path: 'historicalDetails.architecturalStyle', label: 'Architectural Style' },
  { path: 'historicalDetails.historicalBackground', label: 'Historical Background' },
  { path: 'historicalDetails.majorHistoricalEvents', label: 'Major Historical Events' },
  { path: 'contactInfo.phone', label: 'Contact Phone' },
  { path: 'contactInfo.email', label: 'Contact Email' },
  { path: 'contactInfo.website', label: 'Website' },
  { path: 'contactInfo.facebookPage', label: 'Facebook Page' }
];

const getNestedValue = (source: Record<string, any> | undefined, path: string) => {
  if (!source) return undefined;
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), source);
};

const setNestedValue = (target: Record<string, any>, path: string, value: unknown) => {
  const keys = path.split('.');
  let cursor = target;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    if (!cursor[key] || typeof cursor[key] !== 'object') {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, any>;
  }
  cursor[keys[keys.length - 1]] = value;
};

const formatValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') return '—';
  if (Array.isArray(value)) return value.length ? `${value.length} item(s)` : '—';
  return String(value);
};

const getConfidenceBadge = (confidence?: number) => {
  if (confidence === undefined) {
    return <Badge variant="secondary">Unknown</Badge>;
  }
  if (confidence >= 0.8) {
    return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">High</Badge>;
  }
  if (confidence >= 0.6) {
    return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Medium</Badge>;
  }
  return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Low</Badge>;
};

export const ChurchDocumentImport: React.FC<ChurchDocumentImportProps> = ({
  churchId,
  diocese,
  user,
  currentData,
  disabled = false,
  onApply
}) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [importSession, setImportSession] = useState<ChurchImportSession | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFileName, setLastFileName] = useState<string | null>(null);

  useEffect(() => {
    if (!importSession?.id) return;
    const unsubscribe = ChurchImportService.subscribeToImportSession(importSession.id, (session) => {
      setImportSession(session);
    });
    return () => unsubscribe();
  }, [importSession?.id]);

  const parsedFields = useMemo(() => {
    const data = importSession?.parsedData;
    if (!data) return [];
    return FIELD_DEFINITIONS.map((field) => {
      const value = getNestedValue(data as Record<string, any>, field.path);
      if (value === undefined || value === '') return null;
      return {
        ...field,
        value,
        currentValue: getNestedValue(currentData as Record<string, any>, field.path),
        confidence: importSession?.confidence?.[field.path]
      };
    }).filter(Boolean) as Array<FieldDefinition & { value: unknown; currentValue: unknown; confidence?: number }>;
  }, [currentData, importSession?.confidence, importSession?.parsedData]);

  useEffect(() => {
    if (!parsedFields.length) return;
    const defaults = new Set<string>();
    parsedFields.forEach((field) => {
      const confidence = field.confidence ?? 0.7;
      if (confidence >= 0.6) {
        defaults.add(field.path);
      }
    });
    setSelectedFields(defaults);
  }, [parsedFields]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.uid) return;
    setErrorMessage(null);
    setIsUploading(true);
    setUploadProgress(0);
    setImportSession(null);
    setSelectedFields(new Set());

    try {
      const session = await ChurchImportService.createImportSession({
        file,
        churchId,
        diocese,
        createdBy: user.uid,
        onProgress: (progress) => {
          setUploadProgress(progress.progress);
        }
      });
      setImportSession(session);
      setLastFileName(file.name);
      await ChurchImportService.startImportProcessing(session.id, file);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to upload file.';
      setErrorMessage(message);
    } finally {
      setIsUploading(false);
    }

    event.target.value = '';
  };

  const handleToggleField = (path: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleApply = async () => {
    if (!importSession?.parsedData) return;
    const patch: Record<string, any> = {};
    const appliedPaths = Array.from(selectedFields);
    appliedPaths.forEach((path) => {
      const value = getNestedValue(importSession.parsedData as Record<string, any>, path);
      if (value !== undefined) {
        setNestedValue(patch, path, value);
      }
    });
    onApply(patch as Partial<ChurchInfo>, { importId: importSession.id, appliedFields: appliedPaths });
    if (user?.uid) {
      await ChurchImportService.markImportApplied(importSession.id, user.uid, appliedPaths);
      if (churchId) {
        const changes = appliedPaths.map((path) => createFieldChange(path, 'import', 'applied'));
        void AuditService.logAction(
          user,
          'church.import_apply',
          'import_session',
          importSession.id,
          {
            resourceName: importSession.sourceFile?.name || 'Church Import',
            parishId: user.parishId,
            metadata: {
              churchId,
              importId: importSession.id,
              appliedFields: appliedPaths
            },
            changes
          }
        );
      }
    }
  };

  const renderStatus = () => {
    if (!importSession) return null;
    if (importSession.status === 'queued' || importSession.status === 'processing') {
      return (
        <Alert className="border-blue-200 bg-blue-50">
          <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
          <AlertDescription className="text-blue-800">
            We are processing your document. This usually takes a few minutes.
          </AlertDescription>
        </Alert>
      );
    }
    if (importSession.status === 'failed') {
      return (
        <Alert className="border-rose-200 bg-rose-50">
          <AlertTriangle className="h-4 w-4 text-rose-600" />
          <AlertDescription className="text-rose-800">
            {importSession.errorMessage || 'We could not process the document yet. Please try again later.'}
          </AlertDescription>
        </Alert>
      );
    }
    if (importSession.status === 'ready') {
      return (
        <Alert className="border-emerald-200 bg-emerald-50">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800">
            Document processed. Review the extracted fields below.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  const canApply = parsedFields.length > 0 && selectedFields.size > 0 && importSession?.status === 'ready';

  return (
    <Card className="border-2 border-dashed border-emerald-200 bg-emerald-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-emerald-900">
          <UploadCloud className="h-5 w-5" />
          Import Church Details From Document
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 text-sm text-emerald-900">
          <span>
            Upload a document containing church details. We will extract key fields and let you review them before applying.
          </span>
          <span className="text-xs text-emerald-700">
            Accepted formats: PDF, DOC, DOCX, JPG, PNG (max 20MB).
          </span>
        </div>

        {errorMessage && (
          <Alert className="border-rose-200 bg-rose-50">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <AlertDescription className="text-rose-800">{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || isUploading || !user?.uid}
            onClick={() => document.getElementById('church-import-input')?.click()}
          >
            <FileText className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Choose Document'}
          </Button>
          {lastFileName && (
            <Badge variant="outline" className="border-emerald-200 text-emerald-800">
              {lastFileName}
            </Badge>
          )}
        </div>

        <input
          id="church-import-input"
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled || isUploading || !user?.uid}
          aria-label="Select church document file to import"
        />

        {isUploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} />
            <p className="text-xs text-emerald-700">{Math.round(uploadProgress)}% uploaded</p>
          </div>
        )}

        {renderStatus()}

        {importSession?.status === 'ready' && parsedFields.length === 0 && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              We could not confidently extract fields from this document. Please try another file or fill the form manually.
            </AlertDescription>
          </Alert>
        )}

        {parsedFields.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-emerald-900">Extracted Fields</div>
              <div className="text-xs text-emerald-700">{selectedFields.size} selected</div>
            </div>
            <div className="space-y-2">
              {parsedFields.map((field) => (
                <div key={field.path} className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-white/70 p-3">
                  <Checkbox
                    checked={selectedFields.has(field.path)}
                    onCheckedChange={() => handleToggleField(field.path)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-emerald-900">{field.label}</span>
                      {getConfidenceBadge(field.confidence)}
                    </div>
                    <div className="text-xs text-emerald-800">
                      Proposed: <span className="font-medium">{formatValue(field.value)}</span>
                    </div>
                    <div className="text-xs text-emerald-600">
                      Current: {formatValue(field.currentValue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" disabled={!canApply} onClick={handleApply}>
              Apply Selected Fields
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
