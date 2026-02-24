/**
 * FILE PURPOSE: Pending Museum Staff Management Component
 *
 * This component displays pending museum researcher registrations and allows
 * the current museum researcher to approve or reject their replacement.
 *
 * FEATURES:
 * - List all pending registrations
 * - Approve a pending researcher (activates new, current stays active)
 * - Reject a pending registration with reason
 * - Shows warning about account transition
 *
 * USAGE:
 * ```tsx
 * <PendingMuseumStaff currentUser={userProfile} />
 * ```
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Building,
  UserPlus,
  Check,
  X,
  AlertTriangle,
  Clock,
  Mail,
  Phone,
  Briefcase,
  RefreshCw,
  Loader2,
  Info,
  Users,
} from 'lucide-react';
import { MuseumStaffService, type PendingMuseumStaff as PendingStaffType } from '@/services/museumStaffService';
import type { UserProfile } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PendingMuseumStaffProps {
  currentUser: UserProfile;
  onStaffApproved?: () => void;
}

export const PendingMuseumStaff: React.FC<PendingMuseumStaffProps> = ({
  currentUser,
  onStaffApproved,
}) => {
  const { toast } = useToast();

  // State
  const [pendingList, setPendingList] = useState<PendingStaffType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Approval dialog state
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedPending, setSelectedPending] = useState<PendingStaffType | null>(null);
  const [approving, setApproving] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Rejection dialog state
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Load pending staff
  const loadPendingStaff = React.useCallback(async () => {
    try {
      setError(null);
      const pending = await MuseumStaffService.getPendingMuseumStaff();
      setPendingList(pending);
    } catch (err) {
      console.error('[PendingMuseumStaff] Load error:', err);
      setError('Failed to load pending registrations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadPendingStaff();
  }, [loadPendingStaff]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadPendingStaff();
  };

  // Open approval dialog
  const handleApproveClick = (pending: PendingStaffType) => {
    setSelectedPending(pending);
    setConfirmText('');
    setApprovalDialogOpen(true);
  };

  // Confirm approval
  const handleConfirmApproval = async () => {
    if (!selectedPending) return;

    setApproving(true);
    try {
      const result = await MuseumStaffService.approveMuseumStaff(
        currentUser,
        selectedPending.uid
      );

      if (result.success) {
        toast({
          title: 'Researcher Approved',
          description: result.message,
        });
        setApprovalDialogOpen(false);
        onStaffApproved?.();
        // Refresh the list to reflect the change
        loadPendingStaff();
      } else {
        toast({
          title: 'Approval Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('[PendingMuseumStaff] Approval error:', err);
      toast({
        title: 'Error',
        description: 'Failed to approve researcher. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setApproving(false);
    }
  };

  // Open rejection dialog
  const handleRejectClick = (pending: PendingStaffType) => {
    setSelectedPending(pending);
    setRejectionReason('');
    setRejectionDialogOpen(true);
  };

  // Confirm rejection
  const handleConfirmRejection = async () => {
    if (!selectedPending || !rejectionReason.trim()) return;

    setRejecting(true);
    try {
      const result = await MuseumStaffService.rejectMuseumStaff(
        currentUser,
        selectedPending.uid,
        rejectionReason.trim()
      );

      if (result.success) {
        toast({
          title: 'Registration Rejected',
          description: result.message,
        });
        setRejectionDialogOpen(false);
        // Optimistically remove the rejected entry for instant UI feedback
        setPendingList(prev => prev.filter(p => p.uid !== selectedPending?.uid));
        loadPendingStaff();
      } else {
        toast({
          title: 'Rejection Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('[PendingMuseumStaff] Rejection error:', err);
      toast({
        title: 'Error',
        description: 'Failed to reject registration. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRejecting(false);
    }
  };

  // Format date
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Pending Museum Staff Registrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Pending Museum Staff Registrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={handleRefresh} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Pending Museum Staff Registrations
              </CardTitle>
              <CardDescription>
                Review and approve new museum staff registrations
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {pendingList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No pending registrations</p>
              <p className="text-sm mt-1">
                New museum staff registrations will appear here for your review.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingList.map((pending) => (
                <div
                  key={pending.uid}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Building className="h-6 w-6 text-amber-600" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{pending.name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        <Building className="h-3 w-3 mr-1" />
                        Museum Staff
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>

                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {pending.position && (
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-3 w-3" />
                          <span>{pending.position}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span>{pending.email}</span>
                      </div>
                      {pending.phoneNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{pending.phoneNumber}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="h-3 w-3" />
                        <span>Registered: {formatDate(pending.registeredAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectClick(pending)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApproveClick(pending)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Approve Museum Staff Registration
            </DialogTitle>
            <DialogDescription>
              You are about to approve {selectedPending?.name} as the new Museum Staff.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Info about approval */}
            <Alert variant="default" className="border-green-200 bg-green-50">
              <Check className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Approval Information</AlertTitle>
              <AlertDescription className="text-green-700 text-sm">
                <p className="mb-2">
                  By approving this registration:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <strong>{selectedPending?.name}</strong> will become an active Museum Staff
                  </li>
                  <li>
                    <strong>Your account will remain active</strong> — you can continue using the system until your account is deactivated
                  </li>
                  <li>
                    To complete the transition, your account must be deactivated separately
                  </li>
                  <li>
                    This action will be recorded in the audit log
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Selected researcher info */}
            <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
              <div className="font-medium">{selectedPending?.name}</div>
              {selectedPending?.position && (
                <div className="text-muted-foreground">{selectedPending.position}</div>
              )}
              <div className="text-muted-foreground">{selectedPending?.email}</div>
            </div>

            {/* Confirmation input */}
            <div className="space-y-2">
              <Label htmlFor="confirmMuseumApproval" className="text-sm font-medium">
                Type <strong>APPROVE</strong> to confirm this action
              </Label>
              <Input
                id="confirmMuseumApproval"
                type="text"
                placeholder="Type APPROVE to confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={approving}
                className={confirmText === 'APPROVE' ? 'border-green-300 focus-visible:ring-green-500' : ''}
              />
            </div>

          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApprovalDialogOpen(false)}
              disabled={approving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmApproval}
              disabled={approving || confirmText !== 'APPROVE'}
              className="bg-green-600 hover:bg-green-700"
            >
              {approving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-600" />
              Reject Registration
            </DialogTitle>
            <DialogDescription>
              You are about to reject the registration for {selectedPending?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">
                Reason for rejection <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejectionReason"
                placeholder="Please provide a reason for rejecting this registration..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                The applicant's account will be marked as rejected. They will need to
                register again if they wish to reapply.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectionDialogOpen(false)}
              disabled={rejecting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRejection}
              disabled={rejecting || !rejectionReason.trim()}
            >
              {rejecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Reject Registration
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PendingMuseumStaff;
