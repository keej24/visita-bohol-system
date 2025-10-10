import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'dart:io';
import 'dart:math' show cos, sqrt, atan2, sin;
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

/// Enhanced Church Detail Screen
///
/// Features:
/// 1. Photo carousel with indicators and auto-play
/// 2. Parish priest display section
/// 3. Map navigation button
/// 4. 360° virtual tour integration
/// 5. For Visit/Wishlist button with Firestore sync
/// 6. History tab (founding year, founders, heritage, full history)
/// 7. Mass schedule tab with contact info
/// 8. Announcements tab with archive
/// 9. Reviews section with live Firestore data
/// 10. Mark as Visited with GPS validation (100m geofencing)
class ChurchDetailScreen extends StatefulWidget {
  final Church church;

  const ChurchDetailScreen({Key? key, required this.church}) : super(key: key);

  @override
  State<ChurchDetailScreen> createState() => _ChurchDetailScreenState();
}

class _ChurchDetailScreenState extends State<ChurchDetailScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _currentPhotoIndex = 0;
  bool _isMarkingVisited = false;

  @override
  void initState() {
    super.initState();
    // Initialize tab controller with 4 tabs
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: CustomScrollView(
        slivers: [
          // Modern toned header
          _buildAppBar(context),

          // Photo carousel (Feature 1)
          if (widget.church.images.isNotEmpty) _buildPhotoCarousel(),

          // Parish Priest Section (Feature 2)
          _buildParishPriestSection(),

          // Action Buttons Row (Features 3, 4, 5)
          _buildActionButtons(context),

          // Tab Bar (Features 6, 7, 8, 9)
          _buildTabBar(),

          // Tab Content
          _buildTabContent(),
        ],
      ),
    );
  }

  /// App Bar with church name and location
  Widget _buildAppBar(BuildContext context) {
    return SliverAppBar(
      expandedHeight: 160,
      pinned: true,
      backgroundColor: HeaderColors.churchDetail,
      elevation: 0,
      flexibleSpace: FlexibleSpaceBar(
        titlePadding: const EdgeInsetsDirectional.only(start: 16, bottom: 16),
        title: Text(
          widget.church.name,
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
                      widget.church.location,
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
    );
  }

  /// Photo Carousel (Feature 1)
  /// - Horizontal scrolling carousel
  /// - Auto-play every 5 seconds
  /// - Photo indicators showing current position
  /// - Smooth transitions
  Widget _buildPhotoCarousel() {
    return SliverToBoxAdapter(
      child: Column(
        children: [
          CarouselSlider(
            options: CarouselOptions(
              height: 250,
              viewportFraction: 1.0,
              autoPlay: true,
              autoPlayInterval: const Duration(seconds: 5),
              autoPlayAnimationDuration: const Duration(milliseconds: 800),
              autoPlayCurve: Curves.fastOutSlowIn,
              enlargeCenterPage: false,
              onPageChanged: (index, reason) {
                setState(() {
                  _currentPhotoIndex = index;
                });
              },
            ),
            items: widget.church.images.map((imagePath) {
              return Builder(
                builder: (BuildContext context) {
                  return Container(
                    width: MediaQuery.of(context).size.width,
                    decoration: BoxDecoration(
                      color: HeaderColors.churchDetail,
                    ),
                    child: _buildChurchImage(imagePath),
                  );
                },
              );
            }).toList(),
          ),
          // Photo indicators
          if (widget.church.images.length > 1)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: widget.church.images.asMap().entries.map((entry) {
                  return Container(
                    width: 8.0,
                    height: 8.0,
                    margin: const EdgeInsets.symmetric(horizontal: 4.0),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _currentPhotoIndex == entry.key
                          ? const Color(0xFF8B5E3C)
                          : const Color(0xFFD0D0D0),
                    ),
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }

  /// Parish Priest Section (Feature 2)
  /// - Displays current assigned parish priest
  /// - Only shown if priest information is available
  /// - Positioned below header and photos
  Widget _buildParishPriestSection() {
    // Note: Church model needs to be extended with assignedPriest field
    // For now, we'll use a placeholder check
    final String? priestName = null; // TODO: widget.church.assignedPriest when field is added

    if (priestName == null || priestName.isEmpty) {
      return const SliverToBoxAdapter(child: SizedBox.shrink());
    }

    return SliverToBoxAdapter(
      child: Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFFAF7F4),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE8DED3)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.person,
                size: 28,
                color: Color(0xFF8B5E3C),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Parish Priest',
                    style: TextStyle(
                      fontSize: 12,
                      color: Color(0xFF6B6B6B),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    priestName,
                    style: const TextStyle(
                      fontSize: 16,
                      color: Color(0xFF1A1A1A),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Action Buttons Row (Features 3, 4, 5)
  /// - Map navigation button
  /// - 360° virtual tour button
  /// - For Visit/Wishlist toggle button
  Widget _buildActionButtons(BuildContext context) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          children: [
            // Row 1: Map and Virtual Tour
            Row(
              children: [
                // Map Button (Feature 3)
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _openMap(context, widget.church),
                    icon: const Icon(Icons.map),
                    label: const Text('Map'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF8B5E3C),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Virtual Tour Button (Feature 4)
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: widget.church.virtualTourUrl != null
                        ? () => _open360Tour(context, widget.church)
                        : null,
                    icon: const Icon(Icons.view_in_ar),
                    label: const Text('360° Tour'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6A8C69),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Row 2: For Visit and Mark as Visited
            Row(
              children: [
                // For Visit Button (Feature 5)
                Expanded(
                  child: Consumer<AppState>(
                    builder: (context, state, _) {
                      final forVisit = state.isForVisit(widget.church);
                      return ElevatedButton.icon(
                        onPressed: () {
                          if (forVisit) {
                            state.unmarkForVisit(widget.church);
                          } else {
                            state.markForVisit(widget.church);
                          }
                        },
                        icon: Icon(forVisit
                            ? Icons.bookmark
                            : Icons.bookmark_outline),
                        label: Text(forVisit ? 'In Wishlist' : 'Add to Wishlist'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: forVisit
                              ? const Color(0xFF4A7C59)
                              : Colors.white,
                          foregroundColor: forVisit
                              ? Colors.white
                              : const Color(0xFF4A7C59),
                          side: BorderSide(
                            color: const Color(0xFF4A7C59),
                            width: forVisit ? 0 : 1.5,
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(width: 12),
                // Mark as Visited Button (Feature 10)
                Expanded(
                  child: Consumer<AppState>(
                    builder: (context, state, _) {
                      final visited = state.isVisited(widget.church);
                      return ElevatedButton.icon(
                        onPressed: _isMarkingVisited
                            ? null
                            : () => _handleMarkAsVisited(context, state),
                        icon: _isMarkingVisited
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : Icon(visited
                                ? Icons.check_circle
                                : Icons.check_circle_outline),
                        label: Text(visited ? 'Visited' : 'Mark Visited'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: visited
                              ? const Color(0xFF4CAF50)
                              : const Color(0xFF8B5E3C),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Tab Bar (Features 6, 7, 8, 9)
  Widget _buildTabBar() {
    return SliverPersistentHeader(
      pinned: true,
      delegate: _SliverAppBarDelegate(
        TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF8B5E3C),
          unselectedLabelColor: const Color(0xFF9E9E9E),
          indicatorColor: const Color(0xFF8B5E3C),
          indicatorWeight: 3,
          tabs: const [
            Tab(text: 'History'),
            Tab(text: 'Mass'),
            Tab(text: 'Announcements'),
            Tab(text: 'Reviews'),
          ],
        ),
      ),
    );
  }

  /// Tab Content
  Widget _buildTabContent() {
    return SliverFillRemaining(
      hasScrollBody: false,
      child: TabBarView(
        controller: _tabController,
        children: [
          _HistoryTab(church: widget.church),
          _MassTab(church: widget.church),
          _AnnouncementsTab(church: widget.church),
          _ReviewsTab(church: widget.church),
        ],
      ),
    );
  }

  // ============================================================================
  // FEATURE IMPLEMENTATIONS
  // ============================================================================

  /// Feature 3: Open Map Navigation
  /// Opens Google Maps (or Apple Maps on iOS) with church location pinned
  Future<void> _openMap(BuildContext context, Church church) async {
    if (church.latitude == null || church.longitude == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Location not available for this church')),
      );
      return;
    }

    final lat = church.latitude!;
    final lng = church.longitude!;

    // Try Google Maps first
    final googleMapsUrl =
        'https://www.google.com/maps/search/?api=1&query=$lat,$lng';
    final googleMapsUri = Uri.parse(googleMapsUrl);

    try {
      final canLaunch = await canLaunchUrl(googleMapsUri);
      if (canLaunch) {
        await launchUrl(googleMapsUri, mode: LaunchMode.externalApplication);
      } else {
        // Fallback to Apple Maps
        final appleMapsUrl = 'https://maps.apple.com/?q=$lat,$lng';
        final appleMapsUri = Uri.parse(appleMapsUrl);
        await launchUrl(appleMapsUri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      // ignore: use_build_context_synchronously
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not open maps: $e')),
      );
    }
  }

  /// Feature 4: Open 360° Virtual Tour
  /// Launches virtual tour screen with Pannellum viewer
  void _open360Tour(BuildContext context, Church church) {
    if (church.virtualTourUrl == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Virtual tour not available')),
      );
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => VirtualTourScreen(
          church: church,
          tourUrl: church.virtualTourUrl!,
        ),
      ),
    );
  }

  /// Feature 10: Mark as Visited with GPS Validation
  /// - Validates user is within 100m of church location
  /// - Uses Haversine formula for accurate distance calculation
  /// - Handles all permission edge cases
  /// - Shows loading state during validation
  /// - Provides feedback on distance if too far
  Future<void> _handleMarkAsVisited(BuildContext context, AppState state) async {
    setState(() {
      _isMarkingVisited = true;
    });

    try {
      // Validate proximity (100m geofencing)
      final isValid = await _validateProximity(context, widget.church);

      if (isValid) {
        // Mark as visited in app state
        state.markVisited(widget.church);

        // Show success message
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: 12),
                Text('${widget.church.name} marked as visited!'),
              ],
            ),
            backgroundColor: const Color(0xFF4CAF50),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isMarkingVisited = false;
        });
      }
    }
  }

  /// GPS Proximity Validation (100m threshold)
  /// Returns true if user is within 100 meters of church
  Future<bool> _validateProximity(BuildContext context, Church church) async {
    if (church.latitude == null || church.longitude == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Location not available for this church')),
      );
      return false;
    }

    // Check if location services are enabled
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      // ignore: use_build_context_synchronously
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Enable location services to validate visit'),
        ),
      );
      return false;
    }

    // Check location permission
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        // ignore: use_build_context_synchronously
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Location permission denied')),
        );
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      // ignore: use_build_context_synchronously
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Location permissions permanently denied'),
        ),
      );
      return false;
    }

    // Get current position
    final pos = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );

    // Calculate distance using Haversine formula
    final dist = _haversine(
      pos.latitude,
      pos.longitude,
      church.latitude!,
      church.longitude!,
    );

    // 100 meter threshold (0.1 km)
    if (dist <= 0.1) {
      return true;
    }

    // Show distance feedback
    // ignore: use_build_context_synchronously
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'You are ${(dist * 1000).toStringAsFixed(0)}m away from the church (need ≤100m)',
        ),
        duration: const Duration(seconds: 4),
      ),
    );
    return false;
  }

  /// Haversine Formula for calculating distance between two GPS coordinates
  /// Returns distance in kilometers
  double _haversine(double lat1, double lon1, double lat2, double lon2) {
    const R = 6371; // Earth's radius in km
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

  /// Convert degrees to radians
  double _deg2rad(double d) => d * 3.141592653589793 / 180.0;

  /// Build church image (supports both SVG and regular images)
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
}

// ==============================================================================
// TAB WIDGETS
// ==============================================================================

/// History Tab (Feature 6)
/// Displays:
/// - Founding year
/// - Founders (if available)
/// - Heritage classification
/// - Full history text
class _HistoryTab extends StatelessWidget {
  final Church church;

  const _HistoryTab({required this.church});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Founding Information Card
          _TonedCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Founding Information',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1A1A1A),
                  ),
                ),
                const SizedBox(height: 16),
                if (church.foundingYear != null) ...[
                  _buildInfoRow(
                    Icons.calendar_today,
                    'Founded',
                    church.foundingYear.toString(),
                  ),
                  const SizedBox(height: 12),
                ],
                _buildInfoRow(
                  Icons.church,
                  'Architectural Style',
                  church.architecturalStyle.label,
                ),
                const SizedBox(height: 12),
                if (church.isHeritage) ...[
                  _buildInfoRow(
                    Icons.stars,
                    'Heritage Status',
                    church.heritageClassification.label,
                  ),
                  const SizedBox(height: 12),
                ],
                _buildInfoRow(
                  Icons.location_on,
                  'Diocese',
                  church.diocese,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // History Text
          if (church.history != null && church.history!.isNotEmpty) ...[
            const Text(
              'History',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1A1A1A),
              ),
            ),
            const SizedBox(height: 12),
            _TonedCard(
              child: Text(
                church.history!,
                style: const TextStyle(
                  fontSize: 15,
                  color: Color(0xFF424242),
                  height: 1.6,
                ),
              ),
            ),
          ] else ...[
            _TonedCard(
              child: Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.history,
                      size: 48,
                      color: const Color(0xFF8B5E3C).withValues(alpha: 0.3),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'No historical information available yet',
                      style: TextStyle(
                        color: Color(0xFF9E9E9E),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: const Color(0xFF8B5E3C)),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF9E9E9E),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 15,
                  color: Color(0xFF1A1A1A),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Mass Schedule Tab (Feature 7)
/// Displays mass schedules and contact information
class _MassTab extends StatelessWidget {
  final Church church;

  const _MassTab({required this.church});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ElevatedButton.icon(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => MassScheduleScreen(church: church),
                ),
              );
            },
            icon: const Icon(Icons.event),
            label: const Text('View Full Mass Schedule'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8B5E3C),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Contact Information',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1A1A1A),
            ),
          ),
          const SizedBox(height: 12),
          _TonedCard(
            child: Column(
              children: [
                _buildContactRow(
                  Icons.location_on,
                  'Address',
                  church.location,
                  null,
                ),
                if (church.latitude != null && church.longitude != null) ...[
                  const Divider(height: 24),
                  _buildContactRow(
                    Icons.map,
                    'Coordinates',
                    '${church.latitude!.toStringAsFixed(6)}, ${church.longitude!.toStringAsFixed(6)}',
                    null,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContactRow(
    IconData icon,
    String label,
    String value,
    VoidCallback? onTap,
  ) {
    return InkWell(
      onTap: onTap,
      child: Row(
        children: [
          Icon(icon, size: 20, color: const Color(0xFF8B5E3C)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF9E9E9E),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 15,
                    color: Color(0xFF1A1A1A),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          if (onTap != null)
            const Icon(Icons.chevron_right, color: Color(0xFF9E9E9E)),
        ],
      ),
    );
  }
}

/// Announcements Tab (Feature 8)
/// Displays parish announcements with archive section
class _AnnouncementsTab extends StatelessWidget {
  final Church church;

  const _AnnouncementsTab({required this.church});

  @override
  Widget build(BuildContext context) {
    final annSvc = AnnouncementService();

    return FutureBuilder<List<Announcement>>(
      future: annSvc.load(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(
            child: CircularProgressIndicator(color: Color(0xFF8B5E3C)),
          );
        }

        if (snapshot.hasError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error, size: 48, color: Color(0xFFE57373)),
                const SizedBox(height: 12),
                Text('Error: ${snapshot.error}'),
              ],
            ),
          );
        }

        final announcements = (snapshot.data ?? [])
            .where((a) => a.churchId == church.id)
            .toList();

        if (announcements.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.campaign,
                  size: 64,
                  color: const Color(0xFF8B5E3C).withValues(alpha: 0.3),
                ),
                const SizedBox(height: 16),
                const Text(
                  'No announcements yet',
                  style: TextStyle(
                    fontSize: 16,
                    color: Color(0xFF9E9E9E),
                  ),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: announcements.length,
          itemBuilder: (context, index) {
            final announcement = announcements[index];
            return _AnnouncementCard(announcement: announcement);
          },
        );
      },
    );
  }
}

/// Reviews Tab (Feature 9)
/// Displays live Firestore reviews with improved UI
class _ReviewsTab extends StatelessWidget {
  final Church church;

  const _ReviewsTab({required this.church});

  @override
  Widget build(BuildContext context) {
    final fbSvc = FeedbackService();

    return FutureBuilder<List<fbm.FeedbackModel>>(
      future: fbSvc.load(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(
            child: CircularProgressIndicator(color: Color(0xFF8B5E3C)),
          );
        }

        if (snapshot.hasError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error, size: 48, color: Color(0xFFE57373)),
                const SizedBox(height: 12),
                Text('Error: ${snapshot.error}'),
              ],
            ),
          );
        }

        final reviews = (snapshot.data ?? [])
            .where((f) => f.churchId == church.id)
            .toList();

        return Column(
          children: [
            // Submit Review Button
            Padding(
              padding: const EdgeInsets.all(16),
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => FeedbackSubmitScreen(church: church),
                    ),
                  );
                },
                icon: const Icon(Icons.rate_review),
                label: const Text('Write a Review'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF8B5E3C),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ),
            // Reviews List
            Expanded(
              child: reviews.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.star_border,
                            size: 64,
                            color: const Color(0xFF8B5E3C).withValues(alpha: 0.3),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'No reviews yet',
                            style: TextStyle(
                              fontSize: 16,
                              color: Color(0xFF9E9E9E),
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Be the first to review!',
                            style: TextStyle(
                              fontSize: 14,
                              color: Color(0xFFBDBDBD),
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: reviews.length,
                      itemBuilder: (context, index) {
                        final review = reviews[index];
                        return _ReviewCard(review: review);
                      },
                    ),
            ),
          ],
        );
      },
    );
  }
}

// ==============================================================================
// HELPER WIDGETS
// ==============================================================================

/// Announcement Card Widget
class _AnnouncementCard extends StatelessWidget {
  final Announcement announcement;

  const _AnnouncementCard({required this.announcement});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      color: const Color(0xFFFAF7F4),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE8DED3)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              announcement.title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1A1A1A),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              announcement.message,
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF424242),
                height: 1.5,
              ),
            ),
            if (announcement.date != null) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(Icons.calendar_today, size: 14, color: Color(0xFF9E9E9E)),
                  const SizedBox(width: 6),
                  Text(
                    announcement.date!,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF9E9E9E),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Review Card Widget
class _ReviewCard extends StatelessWidget {
  final fbm.FeedbackModel review;

  const _ReviewCard({required this.review});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 0,
      color: const Color(0xFFFAF7F4),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE8DED3)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Star Rating
            Row(
              children: List.generate(5, (index) {
                return Icon(
                  index < review.rating ? Icons.star : Icons.star_border,
                  size: 20,
                  color: const Color(0xFFFFA726),
                );
              }),
            ),
            const SizedBox(height: 12),
            // Comment
            Text(
              review.comments,
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF424242),
                height: 1.5,
              ),
            ),
            // Photos (if any)
            if (review.photos.isNotEmpty) ...[
              const SizedBox(height: 12),
              SizedBox(
                height: 80,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: review.photos.length,
                  itemBuilder: (context, index) {
                    return Container(
                      margin: const EdgeInsets.only(right: 8),
                      width: 80,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        image: DecorationImage(
                          image: AssetImage(review.photos[index]),
                          fit: BoxFit.cover,
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
    );
  }
}

/// Toned Card Widget (reusable styled container)
class _TonedCard extends StatelessWidget {
  final Widget child;

  const _TonedCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFAF7F4),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE8DED3)),
      ),
      child: child,
    );
  }
}

/// Sliver App Bar Delegate for persistent tab bar
class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar _tabBar;

  _SliverAppBarDelegate(this._tabBar);

  @override
  double get minExtent => _tabBar.preferredSize.height;
  @override
  double get maxExtent => _tabBar.preferredSize.height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Container(
      color: Colors.white,
      child: _tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverAppBarDelegate oldDelegate) {
    return false;
  }
}
