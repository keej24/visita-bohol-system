/**
 * FILE PURPOSE: Pending Parish Staff Management Component
 *
 * This component displays pending parish staff registrations and allows
 * the current parish staff to approve or reject their replacement.
 *
 * FEATURES:
 * - List all pending registrations for the parish
 * - Approve a pending staff member (archives current, activates new)
 * - Reject a pending registration with reason
 * - Shows warning about account transition
 *
 * USAGE:
 * ```tsx
 * <PendingParishStaff parishId="church123" currentUser={userProfile} />
 * ```
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
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
  Church,
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
  MapPin,
  Users,
  Archive,
} from 'lucide-react';
import { ParishStaffService, type PendingParishStaff as PendingStaffType } from '@/services/parishStaffService';
import type { Diocese, UserProfile } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PendingParishStaffProps {
  parishId: string;
  currentUser: UserProfile;
  onStaffApproved?: () => void;
}

export const PendingParishStaff: React.FC<PendingParishStaffProps> = ({
  parishId,
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
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approving, setApproving] = useState(false);

  // Rejection dialog state
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Load pending staff
  const loadPendingStaff = React.useCallback(async () => {
    try {
      setError(null);
      const pending = await ParishStaffService.getPendingParishStaff(parishId);
      setPendingList(pending);
    } catch (err) {
      console.error('[PendingParishStaff] Load error:', err);
      setError('Failed to load pending registrations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parishId]);

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
    setApprovalNotes('');
    setApprovalDialogOpen(true);
  };

  // Confirm approval
  const handleConfirmApproval = async () => {
    if (!selectedPending) return;

    setApproving(true);
    try {
      const result = await ParishStaffService.approveParishStaff(
        currentUser,
        selectedPending.uid,
        approvalNotes || undefined
      );

      if (result.success) {
        toast({
          title: 'Staff Approved',
          description: result.message,
        });
        setApprovalDialogOpen(false);
        loadPendingStaff();
        onStaffApproved?.();
      } else {
        toast({
          title: 'Approval Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('[PendingParishStaff] Approval error:', err);
      toast({
        title: 'Error',
        description: 'Failed to approve staff. Please try again.',
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
      const result = await ParishStaffService.rejectParishStaff(
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
        loadPendingStaff();
      } else {
        toast({
          title: 'Rejection Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('[PendingParishStaff] Rejection error:', err);
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

  // Get position label
  const getPositionLabel = (position: string): string => {
    switch (position) {
      case 'parish_priest':
        return 'Parish Priest';
      case 'parish_secretary':
        return 'Parish Secretary';
      default:
        return position;
    }
  };

  // Get position badge variant
  const getPositionBadgeVariant = (position: string): 'default' | 'secondary' => {
    return position === 'parish_priest' ? 'default' : 'secondary';
  };

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Pending Parish Staff Registrations
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
            Pending Parish Staff Registrations
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
                Pending Parish Staff Registrations
              </CardTitle>
              <CardDescription>
                Review and approve new parish secretary and priest registrations
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
                New parish staff registrations will appear here for your review.
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
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Church className="h-6 w-6 text-blue-600" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{pending.name}</h3>
                      <Badge variant={getPositionBadgeVariant(pending.position)} className="text-xs">
                        <Briefcase className="h-3 w-3 mr-1" />
                        {getPositionLabel(pending.position)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>

                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span>
                          {pending.parishName}
                          {pending.municipality && ` - ${pending.municipality}`}
                        </span>
                      </div>
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
              Approve Parish Staff Registration
            </DialogTitle>
            <DialogDescription>
              You are about to approve {selectedPending?.name} as the new{' '}
              {selectedPending && getPositionLabel(selectedPending.position)} for{' '}
              {selectedPending?.parishName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Info about account approval */}
            <Alert variant="default" className="border-green-200 bg-green-50">
              <Check className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Approval Information</AlertTitle>
              <AlertDescription className="text-green-700 text-sm">
                <p className="mb-2">
                  By approving this registration:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    {selectedPending?.name} will become an active{' '}
                    {selectedPending && getPositionLabel(selectedPending.position).toLowerCase()}
                  </li>
                  <li>
                    <strong>Your account will remain active</strong> - you can continue using the system
                  </li>
                  <li>
                    Multiple staff members can be active at the same time
                  </li>
                  <li>
                    This action will be recorded in the audit log
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Approval notes */}
            <div className="space-y-2">
              <Label htmlFor="approvalNotes">Notes (optional)</Label>
              <Textarea
                id="approvalNotes"
                placeholder="Add any notes about this approval..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={3}
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
              disabled={approving}
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

export default PendingParishStaff;
