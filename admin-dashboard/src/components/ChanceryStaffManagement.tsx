/**
 * FILE PURPOSE: Chancery Staff Management Component
 *
 * Displays all chancellor accounts (active, archived, pending, rejected)
 * for a diocese with management capabilities.
 *
 * FEATURES:
 * - List all chancellor accounts with status badges
 * - Filter by status (All / Active / Archived / Pending / Rejected)
 * - Stats cards (Total / Active / Archived)
 * - Deactivate an active chancellor (end their term manually)
 * - View term history
 * - Search by name/email
 *
 * USAGE:
 * ```tsx
 * <ChanceryStaffManagement diocese="tagbilaran" />
 * ```
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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
  Crown,
  Users,
  Clock,
  Mail,
  Phone,
  Briefcase,
  RefreshCw,
  Loader2,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  Calendar,
  Info,
  UserX,
  UserCheck,
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChancellorService, type ChancellorTermRecord } from '@/services/chancellorService';

type ToggleAction = 'deactivate' | 'reactivate';
import { useAuth, type Diocese, type UserProfile } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// TYPES
// ============================================================================

interface ChancellorAccount {
  uid: string;
  email: string;
  name: string;
  diocese: Diocese;
  status: string;
  position?: string;
  phoneNumber?: string;
  createdAt?: Date;
  lastLoginAt?: Date;
  approvedAt?: Date;
  deactivatedAt?: Date;
  deactivationReason?: string;
  termStart?: Date;
  termEnd?: Date;
}

type StatusFilter = 'all' | 'active' | 'inactive' | 'pending' | 'rejected';

interface ChanceryStaffManagementProps {
  diocese: Diocese;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ChanceryStaffManagement: React.FC<ChanceryStaffManagementProps> = ({ diocese }) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  // State
  const [accounts, setAccounts] = useState<ChancellorAccount[]>([]);
  const [termHistory, setTermHistory] = useState<ChancellorTermRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Deactivation dialog
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ChancellorAccount | null>(null);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivating, setDeactivating] = useState(false);

  // Term history dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadAccounts = useCallback(async () => {
    try {
      setError(null);
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'chancery_office'),
        where('diocese', '==', diocese),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const results: ChancellorAccount[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          uid: doc.id,
          email: data.email,
          name: data.name,
          diocese: data.diocese,
          status: data.status || 'active',
          position: data.position,
          phoneNumber: data.phoneNumber,
          createdAt: data.createdAt?.toDate(),
          lastLoginAt: data.lastLoginAt?.toDate(),
          approvedAt: data.approvedAt?.toDate?.(),
          deactivatedAt: data.deactivatedAt?.toDate?.(),
          deactivationReason: data.deactivationReason,
          termStart: data.termStart?.toDate?.(),
          termEnd: data.termEnd?.toDate?.(),
        };
      });

      setAccounts(results);
    } catch (err) {
      console.error('[ChanceryStaffManagement] Load error:', err);
      setError('Failed to load chancellor accounts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [diocese]);

  const loadTermHistory = useCallback(async () => {
    try {
      const terms = await ChancellorService.getChancellorTerms(diocese);
      setTermHistory(terms);
    } catch (err) {
      console.error('[ChanceryStaffManagement] Term history load error:', err);
    }
  }, [diocese]);

  useEffect(() => {
    loadAccounts();
    loadTermHistory();
  }, [loadAccounts, loadTermHistory]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAccounts();
    loadTermHistory();
  };

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const handleToggleStatusClick = (account: ChancellorAccount) => {
    setSelectedAccount(account);
    setDeactivateReason('');
    setDeactivateDialogOpen(true);
  };

  const toggleAction: ToggleAction = selectedAccount?.status === 'active' ? 'deactivate' : 'reactivate';
  const newStatus = toggleAction === 'deactivate' ? 'inactive' : 'active';

  const handleConfirmToggle = async () => {
    if (!selectedAccount || !userProfile) return;
    if (toggleAction === 'deactivate' && (!deactivateReason.trim() || deactivateReason.trim().length < 10)) return;

    setDeactivating(true);
    try {
      const result = await ChancellorService.toggleChancellorStatus(
        userProfile,
        selectedAccount.uid,
        newStatus,
        toggleAction === 'deactivate' ? deactivateReason.trim() : undefined
      );

      if (result.success) {
        toast({
          title: toggleAction === 'deactivate' ? 'Account Deactivated' : 'Account Reactivated',
          description: result.message,
        });
        setDeactivateDialogOpen(false);
        loadAccounts();
        loadTermHistory();
      } else {
        toast({
          title: 'Action Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('[ChanceryStaffManagement] Toggle status error:', err);
      toast({
        title: 'Error',
        description: `Failed to ${toggleAction} account. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setDeactivating(false);
    }
  };

  // ============================================================================
  // FILTERING & STATS
  // ============================================================================

  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      !searchTerm ||
      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || account.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: accounts.length,
    active: accounts.filter((a) => a.status === 'active').length,
    inactive: accounts.filter((a) => a.status === 'inactive').length,
    pending: accounts.filter((a) => a.status === 'pending').length,
    rejected: accounts.filter((a) => a.status === 'rejected').length,
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const formatDate = (date?: Date): string => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (date?: Date): string => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'inactive':
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-200">
            <XCircle className="h-3 w-3 mr-1" />
            Inactive
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        );
    }
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 py-4 border-b last:border-0">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
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

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter('all')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter('active')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter('inactive')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-600">{stats.inactive}</p>
                <p className="text-sm text-muted-foreground">Inactive</p>
              </div>
              <XCircle className="h-8 w-8 text-slate-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter('pending')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
              <Clock className="h-8 w-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Chancellor Accounts
              </CardTitle>
              <CardDescription>
                Manage chancellor accounts for the Diocese of {diocese === 'tagbilaran' ? 'Tagbilaran' : 'Talibon'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHistoryDialogOpen(true)}
                disabled={termHistory.length === 0}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Term History ({termHistory.length})
              </Button>
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
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Crown className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No chancellor accounts found</p>
              {(searchTerm || statusFilter !== 'all') && (
                <p className="text-sm mt-1">Try adjusting your search or filter criteria</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAccounts.map((account) => (
                <div
                  key={account.uid}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    account.status === 'active' ? 'bg-green-100' :
                    account.status === 'inactive' ? 'bg-slate-100' :
                    account.status === 'pending' ? 'bg-amber-100' :
                    'bg-red-100'
                  }`}>
                    <Crown className={`h-5 w-5 ${
                      account.status === 'active' ? 'text-green-600' :
                      account.status === 'inactive' ? 'text-slate-600' :
                      account.status === 'pending' ? 'text-amber-600' :
                      'text-red-600'
                    }`} />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{account.name}</h3>
                      {getStatusBadge(account.status)}
                      {account.uid === userProfile?.uid && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                    </div>

                    <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        <span>{account.email}</span>
                      </div>
                      {account.position && (
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-3 w-3" />
                          <span>{account.position}</span>
                        </div>
                      )}
                      {account.phoneNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{account.phoneNumber}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs flex-wrap">
                        {account.termStart && (
                          <span>Term started: {formatDate(account.termStart)}</span>
                        )}
                        {account.deactivatedAt && (
                          <span>Deactivated: {formatDate(account.deactivatedAt)}</span>
                        )}
                        {!account.termStart && account.createdAt && (
                          <span>Created: {formatDate(account.createdAt)}</span>
                        )}
                      </div>
                      {account.deactivationReason && (
                        <div className="text-xs italic text-muted-foreground/70 mt-1">
                          Reason: {account.deactivationReason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    {account.status === 'active' && account.uid !== userProfile?.uid && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleToggleStatusClick(account)}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Deactivate
                      </Button>
                    )}
                    {account.status === 'inactive' && account.uid !== userProfile?.uid && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleToggleStatusClick(account)}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Reactivate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Toggle Status Dialog */}
      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {toggleAction === 'deactivate' ? (
                <UserX className="h-5 w-5 text-red-600" />
              ) : (
                <UserCheck className="h-5 w-5 text-green-600" />
              )}
              {toggleAction === 'deactivate' ? 'Deactivate' : 'Reactivate'} Account
            </DialogTitle>
            <DialogDescription>
              {toggleAction === 'deactivate'
                ? <>You are about to deactivate the account for <strong>{selectedAccount?.name}</strong>. They will lose admin access until reactivated.</>
                : <>You are about to reactivate the account for <strong>{selectedAccount?.name}</strong>. They will regain admin access.</>
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {toggleAction === 'deactivate' ? (
              <Alert variant="default" className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">Account Deactivation</AlertTitle>
                <AlertDescription className="text-red-700 text-sm">
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    <li>{selectedAccount?.name} will be unable to log in</li>
                    <li>Their data and history will be preserved</li>
                    <li>You can reactivate the account at any time</li>
                    <li>This action will be recorded in the audit log</li>
                  </ul>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="default" className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Account Reactivation</AlertTitle>
                <AlertDescription className="text-green-700 text-sm">
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    <li>{selectedAccount?.name} will be able to log in again</li>
                    <li>Their previous data and history will be restored</li>
                    <li>This action will be recorded in the audit log</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {toggleAction === 'deactivate' && (
              <div className="space-y-2">
                <Label htmlFor="deactivateReason">
                  Reason for deactivation <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="deactivateReason"
                  placeholder="Please provide a reason for deactivation (minimum 10 characters)..."
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">{deactivateReason.length}/10 characters minimum</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeactivateDialogOpen(false)}
              disabled={deactivating}
            >
              Cancel
            </Button>
            {toggleAction === 'deactivate' ? (
              <Button
                variant="destructive"
                onClick={handleConfirmToggle}
                disabled={deactivating || deactivateReason.trim().length < 10}
              >
                {deactivating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deactivating...
                  </>
                ) : (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Deactivate Account
                  </>
                )}
              </Button>
            ) : (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleConfirmToggle}
                disabled={deactivating}
              >
                {deactivating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Reactivating...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Reactivate Account
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Term History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Chancellor Term History
            </DialogTitle>
            <DialogDescription>
              Historical record of chancellor terms for the Diocese of {diocese === 'tagbilaran' ? 'Tagbilaran' : 'Talibon'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {termHistory.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No term history records found</p>
              </div>
            ) : (
              termHistory.map((term) => (
                <div key={term.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{term.chancellorName}</div>
                    <Badge variant={term.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {term.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{term.chancellorEmail}</div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>From: {formatDate(term.termStart)}</span>
                    <span>To: {formatDate(term.termEnd)}</span>
                  </div>
                  {term.endReason && (
                    <div className="text-xs italic text-muted-foreground">
                      Reason: {term.endReason}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChanceryStaffManagement;
