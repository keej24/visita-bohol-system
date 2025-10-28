import 'package:flutter/material.dart';
import '../../models/announcement.dart';
import '../../repositories/announcement_repository.dart';
import '../optimized_image_widget.dart';

class AnnouncementsTab extends StatefulWidget {
  final String churchId;

  const AnnouncementsTab({super.key, required this.churchId});

  @override
  State<AnnouncementsTab> createState() => _AnnouncementsTabState();
}

class _AnnouncementsTabState extends State<AnnouncementsTab> {
  final _announcementRepo = AnnouncementRepository();

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Announcement>>(
      future: _announcementRepo.getAll(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
                const SizedBox(height: 16),
                Text(
                  'Error loading announcements',
                  style: TextStyle(color: Colors.red[700], fontSize: 16),
                ),
              ],
            ),
          );
        }

        // Filter parish announcements for this church
        final parishAnnouncements = snapshot.data
                ?.where((ann) =>
                    ann.scope == 'parish' && ann.churchId == widget.churchId)
                .toList() ??
            [];

        if (parishAnnouncements.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.campaign_outlined,
                    size: 64,
                    color: Colors.grey[400],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'No announcements yet',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Parish announcements will appear here',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.grey[500],
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: parishAnnouncements.length,
          itemBuilder: (context, index) {
            final announcement = parishAnnouncements[index];
            return buildAnnouncementCard(announcement);
          },
        );
      },
    );
  }

  Widget buildAnnouncementCard(Announcement announcement) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image (if available)
          if (announcement.imageUrl != null)
            ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(12)),
              child: OptimizedChurchImage(
                imageUrl: announcement.imageUrl!,
                height: 180,
                fit: BoxFit.cover,
                isNetworkImage: announcement.imageUrl!.startsWith('http'),
              ),
            ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Status Badge
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: getStatusColor(announcement.status),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    announcement.status.toUpperCase(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Title
                Text(
                  announcement.title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF333333),
                  ),
                ),
                const SizedBox(height: 8),

                // Category
                Row(
                  children: [
                    const Icon(Icons.category,
                        size: 16, color: Color(0xFF8B5E3C)),
                    const SizedBox(width: 4),
                    Text(
                      announcement.category,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF8B5E3C),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Description
                Text(
                  announcement.description,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF666666),
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 16),

                // Date & Venue
                buildAnnouncementInfo(
                  Icons.calendar_today,
                  _formatDate(announcement.dateTime),
                ),
                const SizedBox(height: 8),
                buildAnnouncementInfo(Icons.place, announcement.venue),

                // Contact Info
                if (announcement.contactInfo != null) ...[
                  const SizedBox(height: 8),
                  buildAnnouncementInfo(
                      Icons.contact_phone, announcement.contactInfo!),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget buildAnnouncementInfo(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 16, color: const Color(0xFF8B5E3C)),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFF666666),
            ),
          ),
        ),
      ],
    );
  }

  Color getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'ongoing':
        return Colors.green;
      case 'upcoming':
        return Colors.blue;
      case 'past':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  String _formatDate(DateTime date) {
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
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }
}
