import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'dart:io';
import 'dart:math' show cos, sqrt, atan2, sin; // updated
import 'package:geolocator/geolocator.dart';

import '../models/church.dart';
import '../models/app_state.dart';
import '../services/feedback_service.dart';
import '../models/feedback.dart' as fbm;
import 'feedback_submit_screen.dart';
import '../services/announcement_service.dart';
import '../models/announcement.dart';
import 'virtual_tour_screen.dart';
import 'parish_announcements_screen.dart';
import 'mass_schedule_screen.dart';
import '../theme/header_palette.dart';

class ChurchDetailScreen extends StatelessWidget {
  final Church church;
  const ChurchDetailScreen({Key? key, required this.church}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final fbSvc = FeedbackService();
    final annSvc = AnnouncementService();
    return Scaffold(
      backgroundColor: Colors.white,
      body: CustomScrollView(
        slivers: [
          // Modern toned header
          SliverAppBar(
            expandedHeight: 160,
            pinned: true,
            backgroundColor: HeaderColors.churchDetail,
            elevation: 0,
            flexibleSpace: FlexibleSpaceBar(
              titlePadding:
                  const EdgeInsetsDirectional.only(start: 16, bottom: 16),
              title: Text(
                church.name,
                style: const TextStyle(
                  color: Color(0xFF1A1A1A),
                  fontWeight: FontWeight.w600,
                  fontSize: 18,
                ),
              ),
              background: Container(
                color: HeaderColors.churchDetail,
                child: Align(
                  alignment: Alignment.bottomLeft,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 56),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.05),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: const Icon(Icons.account_balance,
                              size: 32, color: Color(0xFF8B5E3C)),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Text(
                            church.location,
                            style: const TextStyle(
                              fontSize: 14,
                              color: Color(0xFF6B6B6B),
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(1),
              child: Container(height: 1, color: HeaderColors.divider),
            ),
          ),

          // Optional hero image below header (if exists)
          if (church.images.isNotEmpty)
            SliverToBoxAdapter(
              child: Container(
                margin: const EdgeInsets.all(16.0),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: AspectRatio(
                    aspectRatio: 16 / 9,
                    child: _buildChurchImage(church.images.first),
                  ),
                ),
              ),
            ),

          // Content
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Church Information Card
                  _TonedCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.info_outline,
                                color: Color(0xFF8B5E3C)),
                            const SizedBox(width: 8),
                            const Text(
                              'Church Information',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF8B5E3C),
                              ),
                            ),
                            const Spacer(),
                            if (church.isHeritage)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFD4AF37),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.star,
                                        size: 12, color: Colors.white),
                                    SizedBox(width: 4),
                                    Text(
                                      'Heritage Site',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        _buildInfoRow(
                            Icons.location_on, 'Location', church.location),
                        if (church.foundingYear != null)
                          _buildInfoRow(Icons.calendar_today, 'Founded',
                              church.foundingYear.toString()),
                        _buildInfoRow(Icons.architecture, 'Style',
                            church.architecturalStyle.toString()),
                        if (church.history != null &&
                            church.history!.isNotEmpty) ...[
                          const SizedBox(height: 16),
                          const Divider(),
                          const SizedBox(height: 16),
                          const Text(
                            'History',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF8B5E3C),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            church.history!,
                            style: const TextStyle(
                              height: 1.5,
                              color: Color(0xFF333333),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  // Parish Announcements
                  FutureBuilder<List<Announcement>>(
                    future: annSvc.load(),
                    builder: (context, snap) {
                      if (snap.connectionState != ConnectionState.done) {
                        return const SizedBox.shrink();
                      }
                      final now = DateTime.now();
                      final parishAnns = (snap.data ?? [])
                          .where((a) =>
                              a.scope == 'parish' &&
                              a.churchId == church.id &&
                              a.dateTime.isAfter(now))
                          .toList();
                      if (parishAnns.isEmpty) {
                        return const SizedBox.shrink();
                      }

                      return _TonedCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.announcement,
                                    color: Color(0xFF8B5E3C)),
                                SizedBox(width: 8),
                                Text(
                                  'Parish Announcements',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF8B5E3C),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            ...parishAnns
                                .map((a) => Container(
                                      margin: const EdgeInsets.only(bottom: 8),
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: HeaderColors.churchDetail,
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(
                                            color: Colors.black
                                                .withValues(alpha: 0.05)),
                                      ),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            a.title,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w600,
                                              color: Color(0xFF8B5E3C),
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(a.description),
                                          const SizedBox(height: 4),
                                          Text(
                                            '${a.dateTime.toLocal()} @ ${a.venue}',
                                            style: const TextStyle(
                                              fontSize: 12,
                                              color: Color(0xFF6B6B6B),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ))
                                .toList(),
                          ],
                        ),
                      );
                    },
                  ),

                  // Parish Information Section
                  _TonedCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.church, color: Color(0xFF8B5E3C)),
                            SizedBox(width: 8),
                            Text(
                              'Parish Information',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF8B5E3C),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) =>
                                          ParishAnnouncementsScreen(
                                        church: church,
                                      ),
                                    ),
                                  );
                                },
                                icon: const Icon(Icons.announcement),
                                label: const Text('Announcements'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF8B5E3C),
                                  foregroundColor: Colors.white,
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => MassScheduleScreen(
                                        church: church,
                                      ),
                                    ),
                                  );
                                },
                                icon: const Icon(Icons.schedule),
                                label: const Text('Mass Schedule'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF2563EB),
                                  foregroundColor: Colors.white,
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Virtual Tour & Map Section
                  _TonedCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.explore, color: Color(0xFF8B5E3C)),
                            SizedBox(width: 8),
                            Text(
                              'Explore',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF8B5E3C),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: church.virtualTourUrl != null
                                    ? () {
                                        Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (context) =>
                                                VirtualTourScreen(
                                              tourUrl: church.virtualTourUrl!,
                                              churchName: church.name,
                                            ),
                                          ),
                                        );
                                      }
                                    : null,
                                icon: const Icon(Icons.view_in_ar),
                                label: const Text('Virtual Tour'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: church.virtualTourUrl != null
                                      ? const Color(0xFF2563EB)
                                      : Colors.grey,
                                  foregroundColor: Colors.white,
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ElevatedButton.icon(
                                onPressed: (church.latitude != null &&
                                        church.longitude != null)
                                    ? () => _openMap(context, church)
                                    : null,
                                icon: const Icon(Icons.map),
                                label: const Text('View on Map'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: (church.latitude != null &&
                                          church.longitude != null)
                                      ? const Color(0xFF10B981)
                                      : Colors.grey,
                                  foregroundColor: Colors.white,
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (church.virtualTourUrl == null ||
                            church.latitude == null ||
                            church.longitude == null)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              church.virtualTourUrl == null
                                  ? 'Virtual tour coming soon!'
                                  : 'Map location not available',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),

                  // Action Buttons
                  Consumer<AppState>(builder: (context, state, _) {
                    final visited = state.isVisited(church);
                    final forVisit = state.isForVisit(church);
                    return _TonedCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Your Visit',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF8B5E3C),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: () async {
                                    if (visited) {
                                      state.unmarkVisited(church);
                                      return;
                                    }
                                    final ok = await _validateProximity(
                                        context, church);
                                    if (ok) {
                                      state.markVisited(church);
                                    }
                                  },
                                  icon: Icon(visited
                                      ? Icons.check_circle
                                      : Icons.check_circle_outline),
                                  label: Text(
                                      visited ? 'Visited' : 'Mark as Visited'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: visited
                                        ? const Color(0xFF10B981)
                                        : const Color(0xFF8B5E3C),
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 12),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: () => forVisit
                                      ? state.unmarkForVisit(church)
                                      : state.markForVisit(church),
                                  icon: Icon(forVisit
                                      ? Icons.bookmark
                                      : Icons.bookmark_outline),
                                  label: Text(forVisit
                                      ? 'In Wishlist'
                                      : 'Add to Wishlist'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: forVisit
                                        ? const Color(0xFFFF9800)
                                        : Colors.white,
                                    foregroundColor: forVisit
                                        ? Colors.white
                                        : const Color(0xFF8B5E3C),
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 12),
                                    side: const BorderSide(
                                        color: Color(0xFF8B5E3C)),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  }),

                  // Feedback Section
                  _TonedCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.rate_review,
                                    color: Color(0xFF8B5E3C)),
                                SizedBox(width: 8),
                                Text(
                                  'Feedback & Reviews',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF8B5E3C),
                                  ),
                                ),
                              ],
                            ),
                            ElevatedButton.icon(
                              onPressed: () async {
                                final navigator = Navigator.of(context);
                                final scaffoldMessenger =
                                    ScaffoldMessenger.of(context);
                                final res = await navigator.push(
                                    MaterialPageRoute(
                                        builder: (_) => FeedbackSubmitScreen(
                                            churchId: church.id)));
                                if (res == true) {
                                  scaffoldMessenger.showSnackBar(const SnackBar(
                                    content: Text(
                                        'Feedback submitted successfully!'),
                                    backgroundColor: Color(0xFF10B981),
                                  ));
                                }
                              },
                              icon: const Icon(Icons.add, size: 18),
                              label: const Text('Add Review'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF8B5E3C),
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(20),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        FutureBuilder<List<fbm.FeedbackModel>>(
                          future: fbSvc.load(),
                          builder: (c, snap) {
                            if (snap.connectionState != ConnectionState.done) {
                              return const Center(
                                  child: CircularProgressIndicator());
                            }
                            final list = (snap.data ?? [])
                                .where((f) => f.churchId == church.id)
                                .toList();

                            if (list.isEmpty) {
                              return Container(
                                padding: const EdgeInsets.all(20),
                                child: const Column(
                                  children: [
                                    Icon(Icons.rate_review_outlined,
                                        size: 48, color: Colors.grey),
                                    SizedBox(height: 12),
                                    Text(
                                      'No reviews yet',
                                      style: TextStyle(
                                        fontSize: 16,
                                        color: Color(0xFF424242),
                                      ),
                                    ),
                                    Text(
                                      'Be the first to share your experience!',
                                      style: TextStyle(
                                        fontSize: 14,
                                        color: Color(0xFF616161),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }

                            return Column(
                              children: list
                                  .map((f) => Container(
                                        margin:
                                            const EdgeInsets.only(bottom: 12),
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: HeaderColors.churchDetail,
                                          borderRadius:
                                              BorderRadius.circular(12),
                                          border: Border.all(
                                              color: Colors.black
                                                  .withValues(alpha: 0.05)),
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Row(
                                                  children: List.generate(
                                                      5,
                                                      (index) => Icon(
                                                            index < f.rating
                                                                ? Icons.star
                                                                : Icons
                                                                    .star_outline,
                                                            size: 16,
                                                            color: const Color(
                                                                0xFFD4AF37),
                                                          )),
                                                ),
                                                const Spacer(),
                                                Text(
                                                  'Rating: ${f.rating}/5',
                                                  style: const TextStyle(
                                                    fontSize: 12,
                                                    color: Color(0xFF6B6B6B),
                                                    fontWeight: FontWeight.w500,
                                                  ),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 8),
                                            Text(
                                              f.comment,
                                              style: const TextStyle(
                                                color: Color(0xFF333333),
                                                height: 1.4,
                                              ),
                                            ),
                                            if (f.photos.isNotEmpty) ...[
                                              const SizedBox(height: 8),
                                              SizedBox(
                                                height: 70,
                                                child: ListView.separated(
                                                  scrollDirection:
                                                      Axis.horizontal,
                                                  itemBuilder: (_, i) =>
                                                      ClipRRect(
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                            8),
                                                    child: Image.file(
                                                      File(f.photos[i]),
                                                      width: 70,
                                                      height: 70,
                                                      fit: BoxFit.cover,
                                                    ),
                                                  ),
                                                  separatorBuilder: (_, __) =>
                                                      const SizedBox(width: 8),
                                                  itemCount: f.photos.length,
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ))
                                  .toList(),
                            );
                          },
                        ),
                      ],
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

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        children: [
          Icon(icon, size: 18, color: const Color(0xFF8B5E3C)),
          const SizedBox(width: 12),
          Text(
            '$label: ',
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              color: Color(0xFF8B5E3C),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: Color(0xFF333333),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _openMap(BuildContext context, Church church) async {
    if (church.latitude == null || church.longitude == null) {
      return;
    }
    final lat = church.latitude!;
    final lng = church.longitude!;
    final googleMapsUrl =
        'https://www.google.com/maps/search/?api=1&query=$lat,$lng';
    final googleMapsUri = Uri.parse(googleMapsUrl);
    final appleMapsUrl = 'https://maps.apple.com/?q=$lat,$lng';
    final appleMapsUri = Uri.parse(appleMapsUrl);
    try {
      if (await canLaunchUrl(googleMapsUri)) {
        await launchUrl(googleMapsUri, mode: LaunchMode.externalApplication);
      } else if (await canLaunchUrl(appleMapsUri)) {
        await launchUrl(appleMapsUri, mode: LaunchMode.externalApplication);
      } else {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('No map application available'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error opening map: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Widget _buildChurchImage(String imagePath) {
    if (imagePath.toLowerCase().endsWith('.svg')) {
      return SvgPicture.asset(
        imagePath,
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
        placeholderBuilder: (context) => Container(
          color: HeaderColors.churchDetail,
          child: const Center(
            child: CircularProgressIndicator(color: Color(0xFF8B5E3C)),
          ),
        ),
      );
    } else {
      return Image.asset(
        imagePath,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) {
          return Container(
            color: HeaderColors.churchDetail,
            child: Icon(
              Icons.account_balance,
              size: 100,
              color: const Color(0xFF8B5E3C).withValues(alpha: 0.5),
            ),
          );
        },
      );
    }
  }

  Future<bool> _validateProximity(BuildContext context, Church church) async {
    if (church.latitude == null || church.longitude == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Location not available for this church')));
      return false;
    }
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      // ignore: use_build_context_synchronously
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Enable location services to validate visit')));
      return false;
    }
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        // ignore: use_build_context_synchronously
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Location permission denied')));
        return false;
      }
    }
    if (permission == LocationPermission.deniedForever) {
      // ignore: use_build_context_synchronously
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Location permissions permanently denied')));
      return false;
    }
    final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high);
    final dist = _haversine(
        pos.latitude, pos.longitude, church.latitude!, church.longitude!);
    if (dist <= 0.15) {
      // 150 meters threshold
      return true;
    }
    // ignore: use_build_context_synchronously
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(
            'You are ${dist.toStringAsFixed(2)} km away from the church (need <=0.15 km)')));
    return false;
  }

  double _haversine(double lat1, double lon1, double lat2, double lon2) {
    const R = 6371; // km
    final dLat = _deg2rad(lat2 - lat1);
    final dLon = _deg2rad(lon2 - lon1);
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_deg2rad(lat1)) *
            cos(_deg2rad(lat2)) *
            sin(dLon / 2) *
            sin(dLon / 2);
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return R * c;
  }

  double _deg2rad(double d) => d * 3.141592653589793 / 180.0;
}

class _TonedCard extends StatelessWidget {
  final Widget child;
  const _TonedCard({required this.child});
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: child,
      ),
    );
  }
}
