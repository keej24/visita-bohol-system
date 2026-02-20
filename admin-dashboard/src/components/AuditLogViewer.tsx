/**
 * FILE PURPOSE: Audit Log Viewer Component
 *
 * Reusable activity log viewer for all roles:
 * - Chancery: Shows all logs in their diocese
 * - Museum Researcher: Shows all logs (cross-diocese)
 * - Parish Secretary: Shows own actions + actions on their parish
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  History,
  User,
  Church,
  Megaphone,
  MessageSquare,
  Landmark,
  Settings,
  LogIn,
  Crown,
  Users,
  RefreshCw,
  ChevronRight,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { AuditService } from '@/services/auditService';
import type { AuditLog, ResourceType, AuditAction } from '@/types/audit';
import { AUDIT_ACTION_LABELS, RESOURCE_TYPE_LABELS, getActionCategory, isDestructiveAction } from '@/types/audit';
import type { Diocese } from '@/contexts/AuthContext';

/**
 * Query mode determines how logs are fetched:
 * - 'diocese': Filter by diocese (Chancery)
 * - 'all': No filtering (Museum Researcher)
 * - 'parish': Filter by actorUid OR parishId (Parish Secretary)
 */
type QueryMode = 'diocese' | 'all' | 'parish';

interface AuditLogViewerProps {
  /** Diocese filter (required for 'diocese' mode) */
  diocese?: Diocese;
  /** Query mode - determines how logs are fetched */
  mode?: QueryMode;
  /** Actor UID for parish-scoped queries */
  actorUid?: string;
  /** Parish ID for parish-scoped queries */
  parishId?: string;
  limit?: number;
  showFilters?: boolean;
  compact?: boolean;
  /** Client-side filter: only show logs matching these actions */
  filterActions?: AuditAction[];
}

// Get appropriate icon based on action category
const getActionIcon = (action: AuditAction) => {
  const category = getActionCategory(action);
  switch (category) {
    case 'auth':
      return <LogIn className="h-4 w-4" />;
    case 'chancellor':
      return <Crown className="h-4 w-4" />;
    case 'user':
      return <Users className="h-4 w-4" />;
    case 'church':
      return <Church className="h-4 w-4" />;
    case 'announcement':
      return <Megaphone className="h-4 w-4" />;
    case 'feedback':
      return <MessageSquare className="h-4 w-4" />;
    case 'heritage':
      return <Landmark className="h-4 w-4" />;
    default:
      return <Settings className="h-4 w-4" />;
  }
};

// Format timestamp for display
const formatTimestamp = (timestamp: { toDate: () => Date } | Date): string => {
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

// Get badge variant based on action type
const getActionBadgeVariant = (action: AuditAction): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (isDestructiveAction(action)) return 'destructive';
  if (action.endsWith('.create') || action.endsWith('.approve')) return 'default';
  return 'secondary';
};

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({
  diocese,
  mode = 'diocese',
  actorUid,
  parishId,
  limit = 50,
  compact = false,
  filterActions,
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Load audit logs based on mode
  const loadLogs = React.useCallback(async () => {
    try {
      setError(null);
      let fetchedLogs: AuditLog[];

      if (mode === 'parish' && actorUid && parishId) {
        // Parish: own actions + actions on their parish
        fetchedLogs = await AuditService.getParishLogs(actorUid, parishId, { limit });
      } else if (mode === 'all') {
        // Museum researcher: all logs (cross-diocese)
        fetchedLogs = await AuditService.getAllLogs({ limit });
      } else if (diocese) {
        // Chancery: diocese-scoped logs
        fetchedLogs = await AuditService.getLogsByDiocese(diocese, { limit });
      } else {
        fetchedLogs = [];
      }

      // Apply client-side action filter if provided
      if (filterActions && filterActions.length > 0) {
        const allowedSet = new Set(filterActions);
        fetchedLogs = fetchedLogs.filter(log => allowedSet.has(log.action));
      }

      setLogs(fetchedLogs);
    } catch (err) {
      console.error('[AuditLogViewer] Failed to load logs:', err);
      setError('Failed to load activity log');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [diocese, mode, actorUid, parishId, limit, filterActions]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    loadLogs();
  }, [loadLogs]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadLogs();
  };

  // Handle view details
  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  // Render loading skeleton
  if (loading) {
    return (
      <Card className={compact ? 'border-0 shadow-none' : ''}>
        {!compact && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Activity Log
            </CardTitle>
            <CardDescription>Loading recent activity...</CardDescription>
          </CardHeader>
        )}
        <CardContent className={compact ? 'p-0' : ''}>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card className={compact ? 'border-0 shadow-none' : ''}>
        {!compact && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Activity Log
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={compact ? 'p-0' : ''}>
          <div className="text-center py-8 text-muted-foreground">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={compact ? 'border-0 shadow-none' : ''}>
        {!compact && (
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Activity Log
                </CardTitle>
                <CardDescription>
                  {mode === 'all'
                    ? 'Recent actions across all dioceses'
                    : mode === 'parish'
                    ? 'Your recent actions and parish activity'
                    : `Recent actions in ${diocese === 'tagbilaran' ? 'Tagbilaran' : 'Talibon'} Diocese`}
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
        )}

        <CardContent className={compact ? 'p-0' : ''}>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No activity recorded yet</p>
            </div>
          ) : (
            <ScrollArea className={compact ? 'h-[400px]' : 'h-[500px]'}>
              <div className="space-y-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleViewDetails(log)}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      {getActionIcon(log.action)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{log.actor.name}</span>
                        <Badge variant={getActionBadgeVariant(log.action)} className="text-xs">
                          {AUDIT_ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </div>
                      {log.resourceName && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {log.resourceName}
                        </p>
                      )}
                    </div>

                    {/* Timestamp & Arrow */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimestamp(log.timestamp)}</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog && getActionIcon(selectedLog.action)}
              Activity Details
            </DialogTitle>
            <DialogDescription>
              {selectedLog && (
                <>
                  {AUDIT_ACTION_LABELS[selectedLog.action] || selectedLog.action} •{' '}
                  {formatTimestamp(selectedLog.timestamp)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* Actor Info */}
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="text-sm font-medium mb-2">Performed By</h4>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedLog.actor.name}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{selectedLog.actor.email}</p>
              </div>

              {/* Resource Info */}
              {selectedLog.resourceName && (
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Resource</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{RESOURCE_TYPE_LABELS[selectedLog.resourceType]}</Badge>
                    <span>{selectedLog.resourceName}</span>
                  </div>
                </div>
              )}

              {/* Changes */}
              {selectedLog.changes && selectedLog.changes.length > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Changes</h4>
                  <div className="space-y-2">
                    {selectedLog.changes.map((change, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{change.field}:</span>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span className="text-muted-foreground line-through">
                            {String(change.oldValue || 'empty')}
                          </span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="text-foreground">{String(change.newValue || 'empty')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Clock className="h-3 w-3" />
                {selectedLog.timestamp instanceof Date
                  ? selectedLog.timestamp.toLocaleString()
                  : selectedLog.timestamp.toDate().toLocaleString()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AuditLogViewer;
