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

        // Announcements list
        Expanded(
          child: FutureBuilder<List<Announcement>>(
            future: FirestoreAnnouncementRepository()
                .getAnnouncementsByParish(widget.church.id),
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
                return b.dateTime.compareTo(a.dateTime);
              });

              if (filteredAnnouncements.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        _showArchived ? Icons.archive : Icons.campaign_outlined,
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
                  return Container(
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
                        Row(
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
                            Text(
                              DateFormat('MMM dd, yyyy')
                                  .format(announcement.dateTime),
                              style: const TextStyle(
                                fontSize: 13,
                                color: Color(0xFF2C5F2D),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            if (announcement.venue.isNotEmpty) ...[
                              const SizedBox(width: 16),
                              const Icon(
                                Icons.location_on,
                                size: 14,
                                color: Color(0xFF6B7280),
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  announcement.venue,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: Color(0xFF6B7280),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}
