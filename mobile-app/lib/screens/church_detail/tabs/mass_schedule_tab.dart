import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../models/church.dart';

class MassScheduleTab extends StatelessWidget {
  final Church church;

  const MassScheduleTab({super.key, required this.church});

  /// Converts 24-hour time format to 12-hour format with AM/PM
  /// Handles both single times and time ranges
  /// Examples:
  /// - "09:00" -> "9:00 AM"
  /// - "13:30" -> "1:30 PM"
  /// - "09:00 - 10:00" -> "9:00 AM - 10:00 AM"
  /// - "04:30 - 06:29" -> "4:30 AM - 6:29 AM"
  String _formatTo12Hour(String time24) {
    if (time24.isEmpty) return '';

    try {
      // Check if it's a time range (contains ' - ')
      if (time24.contains(' - ')) {
        final parts = time24.split(' - ');
        if (parts.length == 2) {
          final startTime = _convertSingleTime(parts[0].trim());
          final endTime = _convertSingleTime(parts[1].trim());
          return '$startTime - $endTime';
        }
      }

      // Single time
      return _convertSingleTime(time24);
    } catch (e) {
      return time24; // Return original if parsing fails
    }
  }

  /// Converts a single 24-hour time to 12-hour format
  String _convertSingleTime(String time24) {
    final parts = time24.split(':');
    if (parts.length != 2) return time24;

    int hours = int.parse(parts[0]);
    final minutes = parts[1];

    // Determine AM/PM
    final period = hours >= 12 ? 'PM' : 'AM';

    // Convert to 12-hour format
    if (hours == 0) {
      hours = 12; // Midnight
    } else if (hours > 12) {
      hours -= 12; // Afternoon/Evening
    }
    // Keep 12 as is for noon

    return '$hours:$minutes $period';
  }

  /// Parses time string (HH:MM or time range) to minutes for sorting
  /// Handles formats like "09:00", "13:30", "09:00 - 10:00"
  int _parseTimeToMinutes(String time) {
    if (time.isEmpty) return 0;

    try {
      // If it's a range, take the start time
      String startTime = time;
      if (time.contains(' - ')) {
        startTime = time.split(' - ')[0].trim();
      }

      final parts = startTime.split(':');
      if (parts.length == 2) {
        final hours = int.tryParse(parts[0]) ?? 0;
        final minutes = int.tryParse(parts[1]) ?? 0;
        return hours * 60 + minutes;
      }
    } catch (e) {
      debugPrint('⚠️ Error parsing time "$time": $e');
    }

    return 0;
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Parish Priest Card
          if (church.assignedPriest != null)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF2C5F2D),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.person,
                      color: Colors.white,
                      size: 32,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          church.assignedPriest!,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Parish Priest',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Colors.white.withValues(alpha: 0.9),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

          // Contact Information Card
          if (church.contactInfo != null && church.contactInfo!.isNotEmpty)
            _buildCard(
              icon: Icons.contact_phone,
              title: 'Contact Information',
              child: Column(
                children: [
                  if (church.contactInfo!['phone'] != null)
                    _buildContactRow(
                      icon: Icons.phone,
                      label: 'Phone',
                      value: church.contactInfo!['phone']!,
                      onTap: () =>
                          _makePhoneCall(church.contactInfo!['phone']!),
                    ),
                  if (church.contactInfo!['email'] != null)
                    _buildContactRow(
                      icon: Icons.email,
                      label: 'Email',
                      value: church.contactInfo!['email']!,
                      onTap: () => _sendEmail(church.contactInfo!['email']!),
                    ),
                  if (church.contactInfo!['website'] != null)
                    _buildContactRow(
                      icon: Icons.language,
                      label: 'Website',
                      value: church.contactInfo!['website']!,
                      onTap: () =>
                          _openWebsite(church.contactInfo!['website']!),
                    ),
                  if (church.contactInfo!['address'] != null)
                    _buildContactRow(
                      icon: Icons.location_on,
                      label: 'Address',
                      value: church.contactInfo!['address']!,
                      onTap: null,
                    ),
                ],
              ),
            ),

          // Mass Schedules Card
          if (church.massSchedules != null && church.massSchedules!.isNotEmpty)
            _buildCard(
              icon: Icons.access_time,
              title: 'Mass Schedules',
              child: _buildGroupedMassSchedules(),
            ),

          // Empty State
          if ((church.contactInfo == null || church.contactInfo!.isEmpty) &&
              church.assignedPriest == null &&
              (church.massSchedules == null || church.massSchedules!.isEmpty))
            const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Column(
                  children: [
                    Icon(
                      Icons.event_busy,
                      size: 64,
                      color: Color(0xFFD1D5DB),
                    ),
                    SizedBox(height: 16),
                    Text(
                      'No mass schedule information available yet',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Color(0xFF6B7280),
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCard({
    required IconData icon,
    required String title,
    required Widget child,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: const Color(0xFF2C5F2D), size: 20),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1F2937),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            child,
          ],
        ),
      ),
    );
  }

  Widget _buildGroupedMassSchedules() {
    // Debug: Log all mass schedules to see the actual data
    debugPrint('🕐 [MASS SCHEDULE] Church: ${church.name}');
    debugPrint(
        '🕐 [MASS SCHEDULE] Total schedules: ${church.massSchedules!.length}');
    for (var schedule in church.massSchedules!) {
      debugPrint(
          '   - Day: ${schedule['day']}, Time: ${schedule['time']}, Language: "${schedule['language']}", isFbLive: ${schedule['isFbLive']}, Type: ${schedule['type']}');
    }

    // Group schedules by day
    final Map<String, List<Map<String, dynamic>>> groupedSchedules = {};

    for (var schedule in church.massSchedules!) {
      final day = schedule['day'] ?? 'Other';
      if (!groupedSchedules.containsKey(day)) {
        groupedSchedules[day] = [];
      }
      groupedSchedules[day]!.add(schedule);
    }

    // Sort schedules within each day by time
    groupedSchedules.forEach((day, schedules) {
      schedules.sort((a, b) {
        final timeA = _parseTimeToMinutes(a['time'] ?? '');
        final timeB = _parseTimeToMinutes(b['time'] ?? '');
        return timeA.compareTo(timeB);
      });
    });

    // Define day order for proper sorting
    final dayOrder = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Daily',
      'Weekdays',
      'Weekends',
      'Other'
    ];

    // Sort days
    final sortedDays = groupedSchedules.keys.toList()
      ..sort((a, b) {
        final aIndex = dayOrder.indexOf(a);
        final bIndex = dayOrder.indexOf(b);
        if (aIndex == -1 && bIndex == -1) return a.compareTo(b);
        if (aIndex == -1) return 1;
        if (bIndex == -1) return -1;
        return aIndex.compareTo(bIndex);
      });

    return Column(
      children: sortedDays.map((day) {
        final schedules = groupedSchedules[day]!;
        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF2C5F2D).withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: const Color(0xFF2C5F2D).withValues(alpha: 0.2),
              width: 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Day Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2C5F2D),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      day,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    schedules.length > 1
                        ? '${schedules.length} masses'
                        : '1 mass',
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF6B7280),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // Mass Times
              ...schedules.map((schedule) {
                final time24 = schedule['time'] ?? '';
                final language = (schedule['language'] ?? '').trim();
                final isFbLive = schedule['isFbLive'] == 'true' ||
                    schedule['isFbLive'] == true ||
                    (schedule['type']?.contains('FB Live') ?? false);

                // Convert to 12-hour format
                final time12 = _formatTo12Hour(time24);

                // Check if this is an English mass (case-insensitive)
                final isEnglishMass = language.toLowerCase() == 'english';

                // Debug: Log badge conditions
                debugPrint(
                    '   🏷️ Badge check for $time12: language="$language", isEnglish=$isEnglishMass, isFbLive=$isFbLive');

                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.access_time,
                        size: 18,
                        color: Color(0xFF2C5F2D),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              time12,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF1F2937),
                              ),
                            ),
                            if (isEnglishMass || isFbLive)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Wrap(
                                  spacing: 8,
                                  runSpacing: 4,
                                  children: [
                                    // Show language badge only for English masses
                                    if (isEnglishMass)
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF2C5F2D)
                                              .withValues(alpha: 0.15),
                                          borderRadius:
                                              BorderRadius.circular(6),
                                        ),
                                        child: const Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              Icons.language,
                                              size: 14,
                                              color: Color(0xFF2C5F2D),
                                            ),
                                            SizedBox(width: 4),
                                            Text(
                                              'English',
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: Color(0xFF2C5F2D),
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    // Show FB Live badge if applicable
                                    if (isFbLive)
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Colors.red
                                              .withValues(alpha: 0.15),
                                          borderRadius:
                                              BorderRadius.circular(6),
                                        ),
                                        child: const Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              Icons.live_tv,
                                              size: 14,
                                              color: Colors.red,
                                            ),
                                            SizedBox(width: 4),
                                            Text(
                                              'FB Live',
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: Colors.red,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildContactRow({
    required IconData icon,
    required String label,
    required String value,
    required VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF2C5F2D).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: const Color(0xFF2C5F2D), size: 20),
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
                      color: Color(0xFF6B7280),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    value,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF1F2937),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            if (onTap != null)
              const Icon(Icons.chevron_right, color: Color(0xFF2C5F2D)),
          ],
        ),
      ),
    );
  }

  Future<void> _makePhoneCall(String phone) async {
    final Uri uri = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _sendEmail(String email) async {
    final Uri uri = Uri(scheme: 'mailto', path: email);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _openWebsite(String url) async {
    final Uri uri = Uri.parse(url.startsWith('http') ? url : 'https://$url');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}
