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
import { ShieldCheck, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import type { Church } from '@/lib/churches';

interface SecurityReviewChecklistProps {
  church: Church | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (church: Church) => Promise<void>;
  isHeritage?: boolean;
}

/**
 * Security Review Checklist Dialog
 * 
 * Displays a checklist of security considerations that reviewers must verify
 * before approving a church for public display. This helps prevent:
 * - Publishing detailed artifact information that could attract theft
 * - Misrepresentation of sacred content
 * - Disclosure of security-sensitive information
 */
export function SecurityReviewChecklist({
  church,
  isOpen,
  onClose,
  onApprove,
  isHeritage = false
}: SecurityReviewChecklistProps) {
  const [checks, setChecks] = useState({
    noArtifactDetails: false,
    noSecurityInfo: false,
    noValuations: false,
    contentAccurate: false,
    parishApproved: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allChecked = Object.values(checks).every(Boolean);

  const handleApprove = async () => {
    if (!church || !allChecked) return;
    
    setIsSubmitting(true);
    try {
      await onApprove(church);
      // Reset checks for next use
      setChecks({
        noArtifactDetails: false,
        noSecurityInfo: false,
        noValuations: false,
        contentAccurate: false,
        parishApproved: false,
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
      contentAccurate: false,
      parishApproved: false,
    });
    onClose();
  };

  if (!church) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Security Review Checklist
          </DialogTitle>
          <DialogDescription>
            Before approving <strong>{church.name}</strong> for public display, verify the following security considerations.
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            Publishing detailed artifact information could unintentionally attract theft or undermine local safeguards.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="no-artifact-details"
              checked={checks.noArtifactDetails}
              onCheckedChange={(checked) => 
                setChecks(prev => ({ ...prev, noArtifactDetails: checked === true }))
              }
            />
            <Label htmlFor="no-artifact-details" className="text-sm font-normal cursor-pointer leading-relaxed">
              Content does <strong>NOT</strong> include specific descriptions of portable valuable artifacts (antique statues, gold items, relics, jewelry)
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
              Content does <strong>NOT</strong> include storage locations of sacred objects or security measure details
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
              Content does <strong>NOT</strong> include monetary valuations or inventory details of church property
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="content-accurate"
              checked={checks.contentAccurate}
              onCheckedChange={(checked) => 
                setChecks(prev => ({ ...prev, contentAccurate: checked === true }))
              }
            />
            <Label htmlFor="content-accurate" className="text-sm font-normal cursor-pointer leading-relaxed">
              Historical and religious information is <strong>accurate and respectful</strong> to the religious community
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="parish-approved"
              checked={checks.parishApproved}
              onCheckedChange={(checked) => 
                setChecks(prev => ({ ...prev, parishApproved: checked === true }))
              }
            />
            <Label htmlFor="parish-approved" className="text-sm font-normal cursor-pointer leading-relaxed">
              Parish has confirmed <strong>consent for public display</strong> of all submitted content
            </Label>
          </div>
        </div>

        {isHeritage && (
          <Alert className="bg-purple-50 border-purple-200">
            <AlertDescription className="text-purple-800 text-sm">
              <strong>Heritage Site:</strong> This church has heritage classification. Museum Researcher validation is recommended for historical accuracy.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            disabled={!allChecked || isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirm & Publish
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
