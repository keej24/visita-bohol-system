import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/church.dart';
import '../models/announcement.dart';
import '../repositories/announcement_repository.dart';

class ParishAnnouncementsScreen extends StatelessWidget {
  final Church church;

  const ParishAnnouncementsScreen({Key? key, required this.church})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('${church.name} Announcements'),
        backgroundColor: const Color(0xFF8B5E3C),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      backgroundColor: const Color(0xFFF8F9FA),
      body: FutureBuilder<List<Announcement>>(
        future: context.read<AnnouncementRepository>().getAll(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(
                color: Color(0xFF8B5E3C),
              ),
            );
          }

          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Colors.red,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Error loading announcements',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    snapshot.error.toString(),
                    style: Theme.of(context).textTheme.bodyMedium,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            );
          }

          final allAnnouncements = snapshot.data ?? [];
          final parishAnnouncements = allAnnouncements
              .where((announcement) =>
                  announcement.scope == 'parish' &&
                  announcement.churchId == church.id)
              .toList();

          // Sort announcements: upcoming first, then by date
          parishAnnouncements.sort((a, b) {
            final now = DateTime.now();
            final aUpcoming = a.dateTime.isAfter(now);
            final bUpcoming = b.dateTime.isAfter(now);

            if (aUpcoming && !bUpcoming) return -1;
            if (!aUpcoming && bUpcoming) return 1;
            return a.dateTime.compareTo(b.dateTime);
          });

          if (parishAnnouncements.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.announcement_outlined,
                    size: 64,
                    color: Colors.grey[400],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No Parish Announcements',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: Colors.grey[600],
                        ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'There are no announcements for this parish at the moment.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey[500],
                        ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: parishAnnouncements.length,
            itemBuilder: (context, index) {
              final announcement = parishAnnouncements[index];
              return _AnnouncementCard(announcement: announcement);
            },
          );
        },
      ),
    );
  }
}

class _AnnouncementCard extends StatelessWidget {
  final Announcement announcement;

  const _AnnouncementCard({required this.announcement});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final isUpcoming = announcement.dateTime.isAfter(now);
    final isOngoing = announcement.isOngoing;

    Color statusColor;
    String statusText;
    IconData statusIcon;

    if (isOngoing) {
      statusColor = const Color(0xFF10B981);
      statusText = 'Ongoing';
      statusIcon = Icons.play_circle_filled;
    } else if (isUpcoming) {
      statusColor = const Color(0xFF2563EB);
      statusText = 'Upcoming';
      statusIcon = Icons.schedule;
    } else {
      statusColor = Colors.grey[600]!;
      statusText = 'Past';
      statusIcon = Icons.history;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
        border: Border.all(
          color: isUpcoming
              ? const Color(0xFF8B5E3C).withValues(alpha: 0.2)
              : Colors.grey.withValues(alpha: 0.1),
          width: isUpcoming ? 1.5 : 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with status and category
            Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(statusIcon, size: 12, color: statusColor),
                      const SizedBox(width: 4),
                      Text(
                        statusText,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: statusColor,
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF8B5E3C).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    announcement.category,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF8B5E3C),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Title
            Text(
              announcement.title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1A1A1A),
              ),
            ),
            const SizedBox(height: 8),

            // Description
            Text(
              announcement.description,
              style: TextStyle(
                fontSize: 14,
                height: 1.5,
                color: Colors.grey[700],
              ),
            ),
            const SizedBox(height: 12),

            // Date and Time
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8F9FA),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Icon(Icons.calendar_today,
                          size: 16, color: Color(0xFF8B5E3C)),
                      const SizedBox(width: 8),
                      Text(
                        _formatDate(announcement.dateTime),
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF8B5E3C),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.access_time,
                          size: 16, color: Color(0xFF8B5E3C)),
                      const SizedBox(width: 8),
                      Text(
                        _formatTime(announcement.dateTime),
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF8B5E3C),
                        ),
                      ),
                      if (announcement.endDateTime != null) ...[
                        Text(
                          ' - ${_formatTime(announcement.endDateTime!)}',
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF8B5E3C),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.location_on,
                          size: 16, color: Color(0xFF8B5E3C)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          announcement.venue,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF8B5E3C),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Contact info if available
            if (announcement.contactInfo != null) ...[
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.contact_phone,
                      size: 16, color: Color(0xFF8B5E3C)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      announcement.contactInfo!,
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  ),
                ],
              ),
            ],

            // Tags if available
            if (announcement.tags.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: announcement.tags
                    .map((tag) => Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.grey[200],
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '#$tag',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey[600],
                            ),
                          ),
                        ))
                    .toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime dateTime) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    final day = days[dateTime.weekday % 7];
    final month = months[dateTime.month - 1];

    return '$day, $month ${dateTime.day}, ${dateTime.year}';
  }

  String _formatTime(DateTime dateTime) {
    final hour = dateTime.hour;
    final minute = dateTime.minute.toString().padLeft(2, '0');
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour);

    return '$displayHour:$minute $period';
  }
}
