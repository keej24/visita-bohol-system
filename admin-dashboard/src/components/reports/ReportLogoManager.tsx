import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { LogoService } from '@/services/logoService';
import { 
  ImageIcon, 
  Upload, 
  Trash2, 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  Shield,
  Church
} from 'lucide-react';

interface ReportLogoManagerProps {
  /** The diocese ID (e.g., 'tagbilaran' or 'talibon') */
  dioceseId: string;
  /** The parish/church ID — optional, only for parish-level pages */
  parishId?: string;
  /** The current user's UID for audit trail */
  userId: string;
  /** The current user's role */
  userRole: 'chancery_office' | 'parish' | 'museum_researcher';
  /** Optional: parish name for display */
  parishName?: string;
}

/**
 * ReportLogoManager — a compact card placed on the report generation page
 * that lets users upload/preview/remove diocese and parish logos for PDF branding.
 *
 * - Chancery users can manage diocese logo + see parish logos (read-only)
 * - Parish secretaries can manage their parish logo + see diocese logo (read-only)
 */
export const ReportLogoManager: React.FC<ReportLogoManagerProps> = ({
  dioceseId,
  parishId,
  userId,
  userRole,
  parishName,
}) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);

  // Diocese logo state
  const [dioceseLogoUrl, setDioceseLogoUrl] = useState<string | null>(null);
  const [isDioceseUploading, setIsDioceseUploading] = useState(false);
  const [dioceseUploadProgress, setDioceseUploadProgress] = useState(0);

  // Parish logo state
  const [parishLogoUrl, setParishLogoUrl] = useState<string | null>(null);
  const [isParishUploading, setIsParishUploading] = useState(false);
  const [parishUploadProgress, setParishUploadProgress] = useState(0);

  const [isLoading, setIsLoading] = useState(true);

  const dioceseInputRef = useRef<HTMLInputElement>(null);
  const parishInputRef = useRef<HTMLInputElement>(null);

  const canEditDioceseLogo = userRole === 'chancery_office';
  const canEditParishLogo = userRole === 'parish' || userRole === 'chancery_office';

  // Load existing logos on mount
  useEffect(() => {
    const loadLogos = async () => {
      setIsLoading(true);
      try {
        const [dLogo, pLogo] = await Promise.all([
          LogoService.getDioceseLogoUrl(dioceseId),
          parishId ? LogoService.getParishLogoUrl(parishId) : Promise.resolve(null),
        ]);
        setDioceseLogoUrl(dLogo);
        setParishLogoUrl(pLogo);
      } catch (error) {
        console.error('Error loading logos:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadLogos();
  }, [dioceseId, parishId]);

  // Handle diocese logo upload
  const handleDioceseLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = LogoService.validateLogoFile(file);
    if (!validation.isValid) {
      toast({ title: 'Invalid File', description: validation.error, variant: 'destructive' });
      return;
    }

    setIsDioceseUploading(true);
    setDioceseUploadProgress(0);

    try {
      const url = await LogoService.uploadDioceseLogo(
        dioceseId,
        file,
        userId,
        (progress) => setDioceseUploadProgress(progress)
      );
      setDioceseLogoUrl(url);
      toast({ title: 'Logo Uploaded', description: 'Diocese logo has been updated. It will appear on generated reports.' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to upload diocese logo';
      toast({ title: 'Upload Failed', description: message, variant: 'destructive' });
    } finally {
      setIsDioceseUploading(false);
      setDioceseUploadProgress(0);
      // Reset file input
      if (dioceseInputRef.current) dioceseInputRef.current.value = '';
    }
  };

  // Handle diocese logo delete
  const handleDioceseLogoDelete = async () => {
    try {
      await LogoService.deleteDioceseLogo(dioceseId);
      setDioceseLogoUrl(null);
      toast({ title: 'Logo Removed', description: 'Diocese logo has been removed from reports.' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove diocese logo';
      toast({ title: 'Delete Failed', description: message, variant: 'destructive' });
    }
  };

  // Handle parish logo upload
  const handleParishLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !parishId) return;

    const validation = LogoService.validateLogoFile(file);
    if (!validation.isValid) {
      toast({ title: 'Invalid File', description: validation.error, variant: 'destructive' });
      return;
    }

    setIsParishUploading(true);
    setParishUploadProgress(0);

    try {
      const url = await LogoService.uploadParishLogo(
        parishId,
        file,
        userId,
        (progress) => setParishUploadProgress(progress)
      );
      setParishLogoUrl(url);
      toast({ title: 'Logo Uploaded', description: 'Parish logo has been updated. It will appear on generated reports.' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to upload parish logo';
      toast({ title: 'Upload Failed', description: message, variant: 'destructive' });
    } finally {
      setIsParishUploading(false);
      setParishUploadProgress(0);
      if (parishInputRef.current) parishInputRef.current.value = '';
    }
  };

  // Handle parish logo delete
  const handleParishLogoDelete = async () => {
    if (!parishId) return;
    try {
      await LogoService.deleteParishLogo(parishId);
      setParishLogoUrl(null);
      toast({ title: 'Logo Removed', description: 'Parish logo has been removed from reports.' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove parish logo';
      toast({ title: 'Delete Failed', description: message, variant: 'destructive' });
    }
  };

  // Logo slot renderer
  const renderLogoSlot = ({
    label,
    icon: Icon,
    logoUrl,
    isUploading,
    uploadProgress,
    canEdit,
    onUpload,
    onDelete,
    inputRef,
  }: {
    label: string;
    icon: React.ElementType;
    logoUrl: string | null;
    isUploading: boolean;
    uploadProgress: number;
    canEdit: boolean;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDelete: () => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
  }) => (
    <div className="flex items-center gap-4 p-3 border rounded-lg bg-background">
      {/* Logo preview */}
      <div className="relative w-16 h-16 flex-shrink-0 bg-muted rounded-lg flex items-center justify-center overflow-hidden border">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={label}
            className="w-full h-full object-contain p-1"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <Icon className="w-6 h-6 text-muted-foreground" />
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Label and actions */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium truncate">{label}</span>
          {logoUrl ? (
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
              Set
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              Not set
            </Badge>
          )}
        </div>

        {isUploading ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{Math.round(uploadProgress)}%</span>
          </div>
        ) : canEdit ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              aria-label={`Upload ${label}`}
              onChange={onUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="w-3 h-3 mr-1" />
              {logoUrl ? 'Change' : 'Upload'}
            </Button>
            {logoUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Remove
              </Button>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {logoUrl ? 'Managed by ' + (userRole === 'parish' ? 'Chancery Office' : 'Parish') : 'No logo uploaded yet'}
          </p>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading report branding...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <div>
              <CardTitle className="text-base sm:text-lg font-semibold">Report Branding</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Upload logos to appear on generated PDF reports
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-3">
          {/* Diocese Logo Slot */}
          {renderLogoSlot({
            label: `Diocese of ${dioceseId.charAt(0).toUpperCase() + dioceseId.slice(1)} Logo`,
            icon: Shield,
            logoUrl: dioceseLogoUrl,
            isUploading: isDioceseUploading,
            uploadProgress: dioceseUploadProgress,
            canEdit: canEditDioceseLogo,
            onUpload: handleDioceseLogoUpload,
            onDelete: handleDioceseLogoDelete,
            inputRef: dioceseInputRef,
          })}

          {/* Parish Logo Slot — only show if a parishId is provided */}
          {parishId && renderLogoSlot({
            label: parishName ? `${parishName} Logo` : 'Parish Logo',
            icon: Church,
            logoUrl: parishLogoUrl,
            isUploading: isParishUploading,
            uploadProgress: parishUploadProgress,
            canEdit: canEditParishLogo,
            onUpload: handleParishLogoUpload,
            onDelete: handleParishLogoDelete,
            inputRef: parishInputRef,
          })}

          <p className="text-xs text-muted-foreground">
            Logos will appear in the header of all generated PDF reports. Recommended: square image, PNG or JPEG, max 2MB.
          </p>
        </CardContent>
      )}
    </Card>
  );
};
