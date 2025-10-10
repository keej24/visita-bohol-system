import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/connectivity_service.dart';
import '../services/offline_sync_service.dart';

class OfflineIndicator extends StatelessWidget {
  final Widget child;
  final bool showSyncStatus;

  const OfflineIndicator({
    super.key,
    required this.child,
    this.showSyncStatus = true,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer2<ConnectivityService, OfflineSyncService>(
      builder: (context, connectivity, syncService, _) {
        return Stack(
          children: [
            child,
            _buildConnectionBanner(context, connectivity, syncService),
            if (showSyncStatus && syncService.isSyncing)
              _buildSyncProgressOverlay(context, syncService),
          ],
        );
      },
    );
  }

  Widget _buildConnectionBanner(
    BuildContext context,
    ConnectivityService connectivity,
    OfflineSyncService syncService,
  ) {
    if (connectivity.isOnline) return const SizedBox.shrink();

    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: Material(
        color: Colors.orange.shade600,
        elevation: 4,
        child: SafeArea(
          bottom: false,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                const Icon(
                  Icons.wifi_off,
                  color: Colors.white,
                  size: 20,
                ),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'You\'re offline. Using cached data.',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                if (syncService.lastSyncTime != null)
                  Text(
                    _formatLastSync(syncService.lastSyncTime!),
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 12,
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSyncProgressOverlay(
    BuildContext context,
    OfflineSyncService syncService,
  ) {
    final progress = syncService.progress;
    if (progress == null) return const SizedBox.shrink();

    return Positioned(
      bottom: 16,
      left: 16,
      right: 16,
      child: Material(
        borderRadius: BorderRadius.circular(8),
        elevation: 8,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: Theme.of(context).dividerColor,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      value: progress.percentage,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      progress.currentItem,
                      style: Theme.of(context).textTheme.bodyMedium,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Text(
                    '${progress.current}/${progress.total}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: progress.percentage,
                backgroundColor: Theme.of(context).dividerColor,
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatLastSync(DateTime lastSync) {
    final now = DateTime.now();
    final difference = now.difference(lastSync);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inDays < 1) {
      return '${difference.inHours}h ago';
    } else {
      return '${difference.inDays}d ago';
    }
  }
}

class ConnectivityStatusWidget extends StatelessWidget {
  final bool showDetails;

  const ConnectivityStatusWidget({
    super.key,
    this.showDetails = false,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<ConnectivityService>(
      builder: (context, connectivity, child) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: connectivity.statusColor.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: connectivity.statusColor.withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                connectivity.statusIcon,
                size: 16,
                color: connectivity.statusColor,
              ),
              if (showDetails) ...[
                const SizedBox(width: 4),
                Text(
                  connectivity.statusString,
                  style: TextStyle(
                    fontSize: 12,
                    color: connectivity.statusColor,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }
}

class SyncStatusWidget extends StatelessWidget {
  final bool showLastSync;

  const SyncStatusWidget({
    super.key,
    this.showLastSync = true,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<OfflineSyncService>(
      builder: (context, syncService, child) {
        return InkWell(
          onTap: () => _showSyncDialog(context, syncService),
          borderRadius: BorderRadius.circular(8),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: _getSyncStatusColor(syncService.status)
                  .withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: _getSyncStatusColor(syncService.status)
                    .withValues(alpha: 0.3),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (syncService.isSyncing)
                  SizedBox(
                    width: 12,
                    height: 12,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: _getSyncStatusColor(syncService.status),
                    ),
                  )
                else
                  Icon(
                    _getSyncStatusIcon(syncService.status),
                    size: 16,
                    color: _getSyncStatusColor(syncService.status),
                  ),
                const SizedBox(width: 6),
                Text(
                  _getSyncStatusText(syncService.status),
                  style: TextStyle(
                    fontSize: 12,
                    color: _getSyncStatusColor(syncService.status),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (showLastSync && syncService.lastSyncTime != null) ...[
                  const SizedBox(width: 4),
                  Text(
                    '• ${_formatLastSync(syncService.lastSyncTime!)}',
                    style: TextStyle(
                      fontSize: 10,
                      color: _getSyncStatusColor(syncService.status)
                          .withValues(alpha: 0.7),
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  void _showSyncDialog(BuildContext context, OfflineSyncService syncService) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sync Status'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSyncInfoRow(
                'Status:', _getSyncStatusText(syncService.status)),
            if (syncService.lastSyncTime != null)
              _buildSyncInfoRow(
                  'Last Sync:', _formatFullDate(syncService.lastSyncTime!)),
            if (syncService.lastError != null)
              _buildSyncInfoRow('Error:', syncService.lastError!,
                  isError: true),
            if (syncService.progress != null) ...[
              const SizedBox(height: 8),
              const Text('Progress:',
                  style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              LinearProgressIndicator(value: syncService.progress!.percentage),
              const SizedBox(height: 4),
              Text(syncService.progress!.currentItem),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
          if (!syncService.isSyncing)
            ElevatedButton(
              onPressed: () {
                syncService.forceSync();
                Navigator.of(context).pop();
              },
              child: const Text('Sync Now'),
            ),
        ],
      ),
    );
  }

  Widget _buildSyncInfoRow(String label, String value, {bool isError = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: isError ? Colors.red : null,
              ),
            ),
          ),
        ],
      ),
    );
  }

  IconData _getSyncStatusIcon(SyncStatus status) {
    switch (status) {
      case SyncStatus.idle:
        return Icons.sync;
      case SyncStatus.syncing:
        return Icons.sync;
      case SyncStatus.success:
        return Icons.sync;
      case SyncStatus.error:
        return Icons.sync_problem;
      case SyncStatus.conflict:
        return Icons.warning;
    }
  }

  Color _getSyncStatusColor(SyncStatus status) {
    switch (status) {
      case SyncStatus.idle:
        return Colors.grey;
      case SyncStatus.syncing:
        return Colors.blue;
      case SyncStatus.success:
        return Colors.green;
      case SyncStatus.error:
        return Colors.red;
      case SyncStatus.conflict:
        return Colors.orange;
    }
  }

  String _getSyncStatusText(SyncStatus status) {
    switch (status) {
      case SyncStatus.idle:
        return 'Ready';
      case SyncStatus.syncing:
        return 'Syncing';
      case SyncStatus.success:
        return 'Synced';
      case SyncStatus.error:
        return 'Error';
      case SyncStatus.conflict:
        return 'Conflict';
    }
  }

  String _formatLastSync(DateTime lastSync) {
    final now = DateTime.now();
    final difference = now.difference(lastSync);

    if (difference.inMinutes < 1) {
      return 'now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}m';
    } else if (difference.inDays < 1) {
      return '${difference.inHours}h';
    } else {
      return '${difference.inDays}d';
    }
  }

  String _formatFullDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }
}
