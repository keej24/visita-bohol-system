import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../models/church.dart';

class MassScheduleTab extends StatelessWidget {
  final Church church;

  const MassScheduleTab({super.key, required this.church});

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
            Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  children: [
                    Icon(
                      Icons.event_busy,
                      size: 64,
                      color: const Color(0xFFD1D5DB),
                    ),
                    const SizedBox(height: 16),
                    const Text(
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
          '   - Day: ${schedule['day']}, Time: ${schedule['time']}, Language: "${schedule['language']}", isFbLive: ${schedule['isFbLive']}');
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
                var time = schedule['time'] ?? '';
                final language = schedule['language'] ?? '';
                final isFbLive = schedule['isFbLive'] == 'true' ||
                    schedule['isFbLive'] == true ||
                    (schedule['type']?.contains('FB Live') ?? false);

                // Fix 12:00 showing as 00:00
                if (time.startsWith('00:')) {
                  time = time.replaceFirst('00:', '12:');
                }

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
                              time,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF1F2937),
                              ),
                            ),
                            if (language.toLowerCase() == 'english' || isFbLive)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Wrap(
                                  spacing: 8,
                                  runSpacing: 4,
                                  children: [
                                    // Show language badge only for English masses
                                    if (language.toLowerCase() == 'english')
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF2C5F2D)
                                              .withValues(alpha: 0.1),
                                          borderRadius:
                                              BorderRadius.circular(4),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            const Icon(
                                              Icons.language,
                                              size: 14,
                                              color: Color(0xFF2C5F2D),
                                            ),
                                            const SizedBox(width: 4),
                                            const Text(
                                              'English',
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: Color(0xFF2C5F2D),
                                                fontWeight: FontWeight.w500,
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
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Colors.red.withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            const Icon(
                                              Icons.live_tv,
                                              size: 14,
                                              color: Colors.red,
                                            ),
                                            const SizedBox(width: 4),
                                            const Text(
                                              'FB Live',
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: Colors.red,
                                                fontWeight: FontWeight.w500,
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
