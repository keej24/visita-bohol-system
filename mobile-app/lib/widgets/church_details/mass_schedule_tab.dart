import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/church.dart';

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
          // Contact Information Card
          if (church.contactInfo != null && church.contactInfo!.isNotEmpty)
            buildCard(
              icon: Icons.contact_phone,
              title: 'Contact Information',
              child: Column(
                children: [
                  if (church.contactInfo!['phone'] != null)
                    buildContactRow(
                      icon: Icons.phone,
                      label: 'Phone',
                      value: church.contactInfo!['phone']!,
                      onTap: () =>
                          _makePhoneCall(church.contactInfo!['phone']!),
                    ),
                  if (church.contactInfo!['email'] != null)
                    buildContactRow(
                      icon: Icons.email,
                      label: 'Email',
                      value: church.contactInfo!['email']!,
                      onTap: () => _sendEmail(church.contactInfo!['email']!),
                    ),
                  if (church.contactInfo!['website'] != null)
                    buildContactRow(
                      icon: Icons.language,
                      label: 'Website',
                      value: church.contactInfo!['website']!,
                      onTap: () =>
                          _openWebsite(church.contactInfo!['website']!),
                    ),
                  if (church.contactInfo!['address'] != null)
                    buildContactRow(
                      icon: Icons.location_on,
                      label: 'Address',
                      value: church.contactInfo!['address']!,
                      onTap: null,
                    ),
                ],
              ),
            ),

          // Parish Priest Card (Prominent Dark Green - inspired by reference)
          if (church.assignedPriest != null)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF1E5128), // Dark green
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
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
                      color: Colors.white.withOpacity(0.2),
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
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Pastor',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Colors.white.withOpacity(0.9),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

          // Mass Schedules Card
          if (church.massSchedules != null && church.massSchedules!.isNotEmpty)
            buildCard(
              icon: Icons.access_time,
              title: 'Mass Schedules',
              child: Column(
                children: church.massSchedules!.map((schedule) {
                  final language = schedule['language'] ?? '';
                  final isFbLive = schedule['isFbLive'] == 'true' ||
                      schedule['isFbLive'] == true ||
                      (schedule['type']?.contains('FB Live') ?? false);
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SizedBox(
                              width: 100,
                              child: Text(
                                schedule['day'] ?? '',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF666666),
                                  fontSize: 14,
                                ),
                              ),
                            ),
                            Expanded(
                              child: Text(
                                schedule['time'] ?? '',
                                style: const TextStyle(
                                  color: Color(0xFF333333),
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (language.isNotEmpty || isFbLive)
                          Padding(
                            padding: const EdgeInsets.only(left: 100, top: 2),
                            child: Row(
                              children: [
                                if (language.isNotEmpty) ...[
                                  const Icon(Icons.language,
                                      size: 16, color: Color(0xFF2C5F2D)),
                                  const SizedBox(width: 4),
                                  Text(language,
                                      style: const TextStyle(
                                          fontSize: 12,
                                          color: Color(0xFF2C5F2D))),
                                ],
                                if (isFbLive) ...[
                                  const SizedBox(width: 12),
                                  const Icon(Icons.live_tv,
                                      size: 16, color: Colors.red),
                                  const SizedBox(width: 4),
                                  Text('FB Live',
                                      style: const TextStyle(
                                          fontSize: 12, color: Colors.red)),
                                ],
                              ],
                            ),
                          ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),

          // Quick Actions Card
          buildCard(
            icon: Icons.touch_app,
            title: 'Quick Actions',
            child: Row(
              children: [
                if (church.contactInfo != null &&
                    church.contactInfo!['phone'] != null)
                  Expanded(
                    child: buildActionButton(
                      icon: Icons.phone,
                      label: 'Call',
                      onTap: () =>
                          _makePhoneCall(church.contactInfo!['phone']!),
                    ),
                  ),
                if (church.contactInfo != null &&
                    church.contactInfo!['phone'] != null &&
                    church.latitude != null &&
                    church.longitude != null)
                  const SizedBox(width: 12),
                if (church.latitude != null && church.longitude != null)
                  Expanded(
                    child: buildActionButton(
                      icon: Icons.directions,
                      label: 'Directions',
                      onTap: () =>
                          _openMaps(church.latitude!, church.longitude!),
                    ),
                  ),
              ],
            ),
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
                      color: Colors.grey[400],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No mass schedule information available yet',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.grey[600],
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

  Widget buildCard({
    required IconData icon,
    required String title,
    required Widget child,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
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
                Icon(icon, color: const Color(0xFF8B5E3C), size: 20),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF8B5E3C),
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

  Widget buildContactRow({
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
                color: const Color(0xFF8B5E3C).withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: const Color(0xFF8B5E3C), size: 20),
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
                      color: Color(0xFF666666),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    value,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF333333),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            if (onTap != null)
              const Icon(Icons.chevron_right, color: Color(0xFF8B5E3C)),
          ],
        ),
      ),
    );
  }

  Widget buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF8B5E3C),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, color: Colors.white, size: 28),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
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

  Future<void> _openMaps(double latitude, double longitude) async {
    final Uri uri = Uri.parse(
        'https://www.google.com/maps/search/?api=1&query=$latitude,$longitude');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}
