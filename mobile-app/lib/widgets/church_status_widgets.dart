import 'package:flutter/material.dart';
import '../models/church.dart';
import '../models/church_status.dart';

/// Widget to display church approval status
/// Used in admin dashboards, not shown in public app
class ChurchStatusBadge extends StatelessWidget {
  final Church church;
  final bool showDescription;

  const ChurchStatusBadge({
    Key? key,
    required this.church,
    this.showDescription = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Color(church.statusColor).withValues(alpha: 0.1),
        border: Border.all(color: Color(church.statusColor)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _getStatusIcon(),
            size: 16,
            color: Color(church.statusColor),
          ),
          const SizedBox(width: 4),
          Text(
            showDescription
                ? church.statusDescription
                : church.status.toUpperCase(),
            style: TextStyle(
              color: Color(church.statusColor),
              fontWeight: FontWeight.w600,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  IconData _getStatusIcon() {
    switch (church.status) {
      case ChurchStatus.pending:
        return Icons.schedule;
      case ChurchStatus.approved:
        return Icons.check_circle;
      case ChurchStatus.revisions:
        return Icons.edit;
      case ChurchStatus.heritageReview:
        return Icons.history_edu;
      default:
        return Icons.help;
    }
  }
}

/// Widget for admin status filter chips
class StatusFilterChips extends StatelessWidget {
  final Set<String> selectedStatuses;
  final Function(String) onStatusToggle;

  const StatusFilterChips({
    Key? key,
    required this.selectedStatuses,
    required this.onStatusToggle,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      children: ChurchStatus.allStatuses.map((status) {
        final isSelected = selectedStatuses.contains(status);
        return FilterChip(
          label: Text(ChurchStatus.statusDescriptions[status] ?? status),
          selected: isSelected,
          onSelected: (_) => onStatusToggle(status),
          backgroundColor: Colors.grey[100],
          selectedColor: Color(ChurchStatus.statusColors[status] ?? 0xFF9E9E9E)
              .withValues(alpha: 0.2),
          checkmarkColor:
              Color(ChurchStatus.statusColors[status] ?? 0xFF9E9E9E),
        );
      }).toList(),
    );
  }
}

/// Status summary widget for admin dashboard
class StatusSummaryCard extends StatelessWidget {
  final Map<String, int> statusCounts;
  final Function(String)? onStatusTap;

  const StatusSummaryCard({
    Key? key,
    required this.statusCounts,
    this.onStatusTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Church Status Summary',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ...ChurchStatus.allStatuses.map((status) {
              final count = statusCounts[status] ?? 0;
              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(
                  _getStatusIcon(status),
                  color: Color(ChurchStatus.statusColors[status] ?? 0xFF9E9E9E),
                ),
                title: Text(ChurchStatus.statusDescriptions[status] ?? status),
                trailing: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color:
                        Color(ChurchStatus.statusColors[status] ?? 0xFF9E9E9E)
                            .withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    count.toString(),
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Color(
                          ChurchStatus.statusColors[status] ?? 0xFF9E9E9E),
                    ),
                  ),
                ),
                onTap: onStatusTap != null ? () => onStatusTap!(status) : null,
              );
            }).toList(),
          ],
        ),
      ),
    );
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case ChurchStatus.pending:
        return Icons.schedule;
      case ChurchStatus.approved:
        return Icons.check_circle;
      case ChurchStatus.revisions:
        return Icons.edit;
      case ChurchStatus.heritageReview:
        return Icons.history_edu;
      default:
        return Icons.help;
    }
  }
}
