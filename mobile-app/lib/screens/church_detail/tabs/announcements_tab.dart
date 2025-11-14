import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../models/church.dart';
import '../../../models/announcement.dart';
import '../../../repositories/firestore_announcement_repository.dart';

/// Announcements tab for church detail screen
///
/// Displays:
/// - Active announcements
/// - Archived announcements (toggle)
/// - Announcement cards with status badges
/// - Date and venue information
class AnnouncementsTab extends StatefulWidget {
  final Church church;
  const AnnouncementsTab({super.key, required this.church});

  @override
  State<AnnouncementsTab> createState() => _AnnouncementsTabState();
}

class _AnnouncementsTabState extends State<AnnouncementsTab> {
  bool _showArchived = false;
  final FirestoreAnnouncementRepository _repository =
      FirestoreAnnouncementRepository();
  late Future<List<Announcement>> _announcementsFuture;

  @override
  void initState() {
    super.initState();
    _loadAnnouncements();
  }

  void _showAnnouncementDetail(Announcement announcement) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _buildAnnouncementDetailSheet(announcement),
    );
  }

  void _loadAnnouncements() {
    _announcementsFuture =
        _repository.getAnnouncementsByParish(widget.church.id);
  }

  Future<void> _refreshAnnouncements() async {
    setState(() {
      _loadAnnouncements();
    });
  }

  String _formatDateTimeRange(Announcement announcement) {
    if (announcement.dateTime == null) return '';

    final startDate = announcement.dateTime!;
    final endDate = announcement.endDateTime;
    final startTime = announcement.eventTime;
    final endTime = announcement.endTime;

    // Format date range
    String dateStr;
    if (endDate != null && !_isSameDay(startDate, endDate)) {
      // Multi-day event
      if (startDate.year == endDate.year && startDate.month == endDate.month) {
        dateStr =
            '${DateFormat('MMM d').format(startDate)}-${DateFormat('d, y').format(endDate)}';
      } else if (startDate.year == endDate.year) {
        dateStr =
            '${DateFormat('MMM d').format(startDate)} - ${DateFormat('MMM d, y').format(endDate)}';
      } else {
        dateStr =
            '${DateFormat('MMM d, y').format(startDate)} - ${DateFormat('MMM d, y').format(endDate)}';
      }
    } else {
      // Single day event
      dateStr = DateFormat('MMM dd, yyyy').format(startDate);
    }

    // Format time range
    if (startTime != null && startTime.isNotEmpty) {
      try {
        final parsedStartTime = _parseTimeString(startTime);
        if (endTime != null && endTime.isNotEmpty) {
          final parsedEndTime = _parseTimeString(endTime);
          return '$dateStr · ${DateFormat('h:mm a').format(parsedStartTime)} - ${DateFormat('h:mm a').format(parsedEndTime)}';
        } else {
          return '$dateStr · ${DateFormat('h:mm a').format(parsedStartTime)}';
        }
      } catch (e) {
        // If parsing fails, show date only
        return dateStr;
      }
    }

    return dateStr;
  }

  bool _isSameDay(DateTime date1, DateTime date2) {
    return date1.year == date2.year &&
        date1.month == date2.month &&
        date1.day == date2.day;
  }

  DateTime _parseTimeString(String timeStr) {
    try {
      final now = DateTime.now();
      if (timeStr.contains('AM') || timeStr.contains('PM')) {
        final parsed = DateFormat('h:mm a').parse(timeStr);
        return DateTime(
            now.year, now.month, now.day, parsed.hour, parsed.minute);
      } else {
        final parts = timeStr.split(':');
        final hour = int.parse(parts[0]);
        final minute = int.parse(parts[1]);
        return DateTime(now.year, now.month, now.day, hour, minute);
      }
    } catch (e) {
      return DateTime.now();
    }
  }

  Widget _buildAnnouncementDetailSheet(Announcement announcement) {
    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFE5E7EB),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Announcement Details',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1F2937),
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close),
                      color: const Color(0xFF6B7280),
                    ),
                  ],
                ),
              ),
              const Divider(),
              // Content
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(20),
                  children: [
                    // Status badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: announcement.isUpcoming
                            ? const Color(0xFF2C5F2D).withValues(alpha: 0.1)
                            : announcement.isOngoing
                                ? Colors.orange.withValues(alpha: 0.1)
                                : Colors.grey.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        announcement.status.toUpperCase(),
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: announcement.isUpcoming
                              ? const Color(0xFF2C5F2D)
                              : announcement.isOngoing
                                  ? Colors.orange
                                  : Colors.grey,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    // Title
                    Text(
                      announcement.title,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1F2937),
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Description
                    Text(
                      announcement.description,
                      style: const TextStyle(
                        fontSize: 16,
                        color: Color(0xFF4B5563),
                        height: 1.6,
                      ),
                    ),
                    const SizedBox(height: 24),
                    // Event details
                    if (announcement.dateTime != null) ...[
                      _buildDetailRow(
                        icon: Icons.event,
                        label: 'Date & Time',
                        value: _formatDateTimeRange(announcement),
                      ),
                      const SizedBox(height: 16),
                    ],
                    if (announcement.venue?.isNotEmpty ?? false) ...[
                      _buildDetailRow(
                        icon: Icons.location_on,
                        label: 'Venue',
                        value: announcement.venue!,
                      ),
                      const SizedBox(height: 16),
                    ],
                    if (announcement.category.isNotEmpty) ...[
                      _buildDetailRow(
                        icon: Icons.category,
                        label: 'Category',
                        value: announcement.category,
                      ),
                      const SizedBox(height: 16),
                    ],
                    // Image if available
                    if (announcement.imageUrl?.isNotEmpty ?? false) ...[
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(
                          announcement.imageUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return Container(
                              height: 200,
                              color: const Color(0xFFF3F4F6),
                              child: const Center(
                                child: Icon(
                                  Icons.image_not_supported,
                                  size: 48,
                                  color: Color(0xFF9CA3AF),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFF2C5F2D).withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            icon,
            size: 20,
            color: const Color(0xFF2C5F2D),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF9CA3AF),
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 15,
                  color: Color(0xFF1F2937),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Toggle for archived announcements
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  _showArchived
                      ? 'Archived Announcements'
                      : 'Active Announcements',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1F2937),
                  ),
                ),
              ),
              OutlinedButton.icon(
                onPressed: () {
                  setState(() {
                    _showArchived = !_showArchived;
                  });
                },
                icon: Icon(
                  _showArchived ? Icons.unarchive : Icons.archive,
                  size: 18,
                ),
                label: Text(
                  _showArchived ? 'Show Active' : 'View Archived',
                  style: const TextStyle(fontSize: 13),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF2C5F2D),
                  side: const BorderSide(color: Color(0xFF2C5F2D)),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                ),
              ),
            ],
          ),
        ),

        // Announcements list with RefreshIndicator
        Expanded(
          child: RefreshIndicator(
            onRefresh: _refreshAnnouncements,
            color: const Color(0xFF2C5F2D),
            child: FutureBuilder<List<Announcement>>(
              future: _announcementsFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(
                    child: CircularProgressIndicator(color: Color(0xFF2C5F2D)),
                  );
                }

                if (snapshot.hasError) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.error_outline,
                          size: 64,
                          color: Colors.red.withValues(alpha: 0.3),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Error loading announcements',
                          style: TextStyle(
                            color: Color(0xFF9CA3AF),
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          snapshot.error.toString(),
                          style: const TextStyle(
                            color: Color(0xFF9CA3AF),
                            fontSize: 12,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  );
                }

                final allAnnouncements = snapshot.data ?? [];
                final filteredAnnouncements = allAnnouncements.where((a) {
                  // Consider both isArchived flag and "past" status as archived
                  final isArchivedOrPast =
                      a.isArchived == true || a.status.toLowerCase() == 'past';
                  // Show archived announcements if _showArchived, else show active
                  return _showArchived ? isArchivedOrPast : !isArchivedOrPast;
                }).toList();

                // Sort: upcoming first, then by date
                filteredAnnouncements.sort((a, b) {
                  if (!_showArchived) {
                    if (a.isUpcoming && !b.isUpcoming) return -1;
                    if (!a.isUpcoming && b.isUpcoming) return 1;
                  }
                  final aDate = a.dateTime ?? (a.createdAt ?? DateTime.now());
                  final bDate = b.dateTime ?? (b.createdAt ?? DateTime.now());
                  return bDate.compareTo(aDate);
                });

                if (filteredAnnouncements.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          _showArchived
                              ? Icons.archive
                              : Icons.campaign_outlined,
                          size: 64,
                          color: const Color(0xFF2C5F2D).withValues(alpha: 0.2),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _showArchived
                              ? 'No archived announcements'
                              : 'No active announcements',
                          style: const TextStyle(
                            color: Color(0xFF9CA3AF),
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  itemCount: filteredAnnouncements.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final announcement = filteredAnnouncements[index];
                    return GestureDetector(
                      onTap: () => _showAnnouncementDetail(announcement),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: const Color(0xFFE5E7EB),
                            width: 1.5,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Status badge
                            if (!_showArchived)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: announcement.isUpcoming
                                      ? const Color(0xFF2C5F2D)
                                          .withValues(alpha: 0.1)
                                      : announcement.isOngoing
                                          ? Colors.orange.withValues(alpha: 0.1)
                                          : Colors.grey.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  announcement.status.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: announcement.isUpcoming
                                        ? const Color(0xFF2C5F2D)
                                        : announcement.isOngoing
                                            ? Colors.orange
                                            : Colors.grey,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                            if (_showArchived)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.red.withValues(alpha: 0.08),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Text(
                                  'ARCHIVED',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.red,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                            const SizedBox(height: 12),
                            Text(
                              announcement.title,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF1F2937),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              announcement.description,
                              style: const TextStyle(
                                fontSize: 14,
                                color: Color(0xFF6B7280),
                                height: 1.5,
                              ),
                            ),
                            const SizedBox(height: 12),
                            // Event date/time information
                            if (announcement.dateTime != null)
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(6),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF2C5F2D)
                                          .withValues(alpha: 0.08),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Icon(
                                      Icons.event,
                                      size: 14,
                                      color: Color(0xFF2C5F2D),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _formatDateTimeRange(announcement),
                                      style: const TextStyle(
                                        fontSize: 13,
                                        color: Color(0xFF2C5F2D),
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            // Venue information
                            if (announcement.venue?.isNotEmpty ?? false) ...[
                              const SizedBox(height: 8),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(6),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF6B7280)
                                          .withValues(alpha: 0.08),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Icon(
                                      Icons.location_on,
                                      size: 14,
                                      color: Color(0xFF6B7280),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      announcement.venue!,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        color: Color(0xFF6B7280),
                                      ),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}
