import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Award, CheckCircle2, AlertTriangle, Loader2, BookOpen, ShieldCheck } from 'lucide-react';
import type { Church } from '@/lib/churches';

interface HeritageValidationChecklistProps {
  church: Church | null;
  isOpen: boolean;
  onClose: () => void;
  onValidate: (church: Church) => Promise<void>;
}

/**
 * Heritage Validation Checklist Dialog for Museum Researchers
 * 
 * Displays a comprehensive checklist that museum researchers must verify
 * before approving a heritage church (ICP/NCT) for public display.
 * 
 * This includes:
 * - Security considerations (artifact protection)
 * - Historical accuracy verification
 * - Cultural sensitivity review
 * - Heritage documentation verification
 */
export function HeritageValidationChecklist({
  church,
  isOpen,
  onClose,
  onValidate,
}: HeritageValidationChecklistProps) {
  const [checks, setChecks] = useState({
    // Security checks
    noArtifactDetails: false,
    noSecurityInfo: false,
    noValuations: false,
    // Heritage accuracy checks
    historicalAccuracy: false,
    heritageClassificationCorrect: false,
    architecturalInfoVerified: false,
    // (Removed cultural sensitivity and documentation/consent checks)
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allChecked = Object.values(checks).every(Boolean);
  const securityChecksComplete = checks.noArtifactDetails && checks.noSecurityInfo && checks.noValuations;
  const heritageChecksComplete = checks.historicalAccuracy && checks.heritageClassificationCorrect && checks.architecturalInfoVerified;

  const handleValidate = async () => {
    if (!church || !allChecked) return;
    
    setIsSubmitting(true);
    try {
      await onValidate(church);
      // Reset checks for next use
      setChecks({
        noArtifactDetails: false,
        noSecurityInfo: false,
        noValuations: false,
        historicalAccuracy: false,
        heritageClassificationCorrect: false,
        architecturalInfoVerified: false,
        religiousContentRespectful: false,
        noUnpublishedDevotional: false,
        supportingDocsReviewed: false,
        parishConsentConfirmed: false,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset checks when closing
    setChecks({
      noArtifactDetails: false,
      noSecurityInfo: false,
      noValuations: false,
      historicalAccuracy: false,
      heritageClassificationCorrect: false,
      architecturalInfoVerified: false,
      religiousContentRespectful: false,
      noUnpublishedDevotional: false,
      supportingDocsReviewed: false,
      parishConsentConfirmed: false,
    });
    onClose();
  };

  if (!church) return null;

  const classificationLabel = church.classification === 'NCT' 
    ? 'National Cultural Treasure' 
    : church.classification === 'ICP' 
      ? 'Important Cultural Property' 
      : 'Heritage Site';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            Heritage Validation Checklist
          </DialogTitle>
          <DialogDescription>
            Before publishing <strong>{church.name}</strong> ({classificationLabel}), verify all items below.
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            As a Museum Researcher, you are responsible for verifying the accuracy and appropriateness of heritage information before it becomes publicly accessible.
          </AlertDescription>
        </Alert>

        {/* Security Checks Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className={`w-4 h-4 ${securityChecksComplete ? 'text-emerald-600' : 'text-gray-400'}`} />
            <h4 className="font-medium text-sm">Security & Artifact Protection</h4>
            {securityChecksComplete && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          </div>
          
          <div className="space-y-3 pl-6">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="no-artifact-details"
                checked={checks.noArtifactDetails}
                onCheckedChange={(checked) => 
                  setChecks(prev => ({ ...prev, noArtifactDetails: checked === true }))
                }
              />
              <Label htmlFor="no-artifact-details" className="text-sm font-normal cursor-pointer leading-relaxed">
                No specific descriptions of <strong>portable valuable artifacts</strong> (antique statues, gold items, relics)
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="no-security-info"
                checked={checks.noSecurityInfo}
                onCheckedChange={(checked) => 
                  setChecks(prev => ({ ...prev, noSecurityInfo: checked === true }))
                }
              />
              <Label htmlFor="no-security-info" className="text-sm font-normal cursor-pointer leading-relaxed">
                No <strong>storage locations</strong> or <strong>security measure details</strong> disclosed
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="no-valuations"
                checked={checks.noValuations}
                onCheckedChange={(checked) => 
                  setChecks(prev => ({ ...prev, noValuations: checked === true }))
                }
              />
              <Label htmlFor="no-valuations" className="text-sm font-normal cursor-pointer leading-relaxed">
                No <strong>monetary valuations</strong> or detailed <strong>inventory lists</strong> included
              </Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Heritage Accuracy Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className={`w-4 h-4 ${heritageChecksComplete ? 'text-emerald-600' : 'text-gray-400'}`} />
            <h4 className="font-medium text-sm">Historical & Heritage Accuracy</h4>
            {heritageChecksComplete && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          </div>
          
          <div className="space-y-3 pl-6">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="historical-accuracy"
                checked={checks.historicalAccuracy}
                onCheckedChange={(checked) => 
                  setChecks(prev => ({ ...prev, historicalAccuracy: checked === true }))
                }
              />
              <Label htmlFor="historical-accuracy" className="text-sm font-normal cursor-pointer leading-relaxed">
                Historical information (founding year, events, figures) is <strong>accurate and verified</strong>
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="heritage-classification"
                checked={checks.heritageClassificationCorrect}
                onCheckedChange={(checked) => 
                  setChecks(prev => ({ ...prev, heritageClassificationCorrect: checked === true }))
                }
              />
              <Label htmlFor="heritage-classification" className="text-sm font-normal cursor-pointer leading-relaxed">
                Heritage classification ({classificationLabel}) is <strong>correctly documented</strong> with valid references
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="architectural-info"
                checked={checks.architecturalInfoVerified}
                onCheckedChange={(checked) => 
                  setChecks(prev => ({ ...prev, architecturalInfoVerified: checked === true }))
                }
              />
              <Label htmlFor="architectural-info" className="text-sm font-normal cursor-pointer leading-relaxed">
                Architectural style and features are <strong>accurately described</strong>
              </Label>
            </div>
          </div>
        </div>



        <DialogFooter className="flex gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleValidate}
            disabled={!allChecked || isSubmitting}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Award className="w-4 h-4 mr-2" />
                Validate & Publish
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
