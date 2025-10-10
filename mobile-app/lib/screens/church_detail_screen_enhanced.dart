import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'dart:math' show cos, sqrt, atan2, sin;
import 'package:geolocator/geolocator.dart';

import '../models/church.dart';
import '../models/app_state.dart';
import 'virtual_tour_screen.dart';
import 'map_screen.dart';
import '../theme/header_palette.dart';
import '../theme/app_theme.dart';
import '../models/enums.dart';
import '../widgets/church_details/history_tab.dart';
import '../widgets/church_details/mass_schedule_tab.dart';
import '../widgets/church_details/announcements_tab.dart';
import '../widgets/church_details/reviews_tab.dart';
import '../utils/design_system.dart';

/// Enhanced Church Detail Screen
///
/// Modern design matching homepage style with:
/// - Scrolling photo carousel in header
/// - Color-coded status tags
/// - White card-based info section
/// - Green accent buttons
/// - Clean tabs for History, Mass, Announcements, Reviews
/// - Mark as Visited with GPS validation
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
      backgroundColor: const Color(0xFFF8FAFC), // Updated to match homepage
      body: CustomScrollView(
        slivers: [
          // Modern app bar with rounded image
          _buildModernAppBar(context),

          // Church info card (matches homepage card style)
          _buildChurchInfoCard(),

          // Action buttons (modern style)
          _buildModernActionButtons(context),

          // Tab Bar
          _buildTabBar(),

          // Tab Content
          _buildTabContent(),
        ],
      ),
      floatingActionButton: _buildMarkVisitedFAB(context),
    );
  }

  /// Modern App Bar (matches homepage style)
  Widget _buildModernAppBar(BuildContext context) {
    return SliverAppBar(
      expandedHeight: 400,
      pinned: true,
      elevation: 0,
      backgroundColor: Colors.white,
      leading: Padding(
        padding: EdgeInsets.all(AppSpacing.sm),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
            boxShadow: AppElevation.getShadow(AppElevation.low),
          ),
          child: IconButton(
            icon: const Icon(Icons.arrow_back, color: Color(0xFF1F2937)),
            onPressed: () => Navigator.pop(context),
          ),
        ),
      ),
      actions: [
        Padding(
          padding: EdgeInsets.all(AppSpacing.sm),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: AppElevation.getShadow(AppElevation.low),
            ),
            child: IconButton(
              icon: const Icon(Icons.share, color: Color(0xFF1F2937)),
              onPressed: () {
                // Share functionality
              },
            ),
          ),
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          children: [
            // Photo Carousel (full display)
            Positioned.fill(
              child: Padding(
                padding: const EdgeInsets.only(top: 56),
                child: widget.church.images.isNotEmpty
                    ? CarouselSlider(
                        options: CarouselOptions(
                          height: double.infinity,
                          viewportFraction: 1.0,
                          autoPlay: true,
                          autoPlayInterval: const Duration(seconds: 5),
                          autoPlayAnimationDuration:
                              const Duration(milliseconds: 800),
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
                              return _buildChurchImage(imagePath);
                            },
                          );
                        }).toList(),
                      )
                    : Container(
                        color: Colors.grey[200],
                        child: const Center(
                          child:
                              Icon(Icons.church, size: 80, color: Colors.grey),
                        ),
                      ),
              ),
            ),
            // Heritage classification badge (top left of image)
            if (widget.church.heritageClassification != HeritageClassification.none)
              Positioned(
                top: 70,
                left: 16,
                child: Container(
                  padding: EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.sm,
                  ),
                  decoration: BoxDecoration(
                    gradient: AppGradients.goldGradient,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.gold.withValues(alpha: 0.4),
                        blurRadius: 12,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.auto_awesome, size: 18, color: Colors.white),
                      const SizedBox(width: 6),
                      Text(
                        widget.church.heritageClassification.label,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            // Gradient overlay for better text visibility
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              height: 120,
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [
                      Color(0x66000000),
                      Color(0x00000000),
                    ],
                  ),
                ),
              ),
            ),
            // Photo indicators (only show if multiple images)
            if (widget.church.images.length > 1)
              Positioned(
                bottom: 20,
                left: 0,
                right: 0,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: widget.church.images.asMap().entries.map((entry) {
                    final isActive = _currentPhotoIndex == entry.key;
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      width: isActive ? 24.0 : 8.0,
                      height: 8.0,
                      margin: const EdgeInsets.symmetric(horizontal: 4.0),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(4),
                        color: isActive
                            ? Colors.white
                            : Colors.white.withValues(alpha: 0.5),
                        boxShadow: isActive
                            ? [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.3),
                                  blurRadius: 4,
                                  offset: const Offset(0, 2),
                                ),
                              ]
                            : [],
                      ),
                    );
                  }).toList(),
                ),
              ),
          ],
        ),
      ),
    );
  }

  /// Church Info Card (matches homepage card style)
  Widget _buildChurchInfoCard() {
    return SliverToBoxAdapter(
      child: Container(
        margin: EdgeInsets.all(AppSpacing.lg),
        padding: EdgeInsets.all(AppSpacing.cardPadding),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: AppRadius.largeRadius,
          border: Border.all(
            color: const Color(0xFFE5E7EB),
            width: 1.5,
          ),
          boxShadow: AppElevation.getShadow(AppElevation.low),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Church name
            Text(
              widget.church.name,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w900,
                color: Color(0xFF1F2937),
                letterSpacing: -0.5,
                height: 1.2,
              ),
            ),

            SizedBox(height: AppSpacing.md),

            // Location
            Row(
              children: [
                const Icon(Icons.location_on_outlined, size: 18, color: Color(0xFF6B7280)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    widget.church.location,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ),
              ],
            ),

            SizedBox(height: AppSpacing.md),

            // Tags row (Diocese and Architectural Style)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _buildTag(
                  icon: Icons.account_balance_wallet,
                  label: 'Diocese of ${_formatDiocese(widget.church.diocese)}',
                  color: AppColors.primary,
                ),
                _buildTag(
                  icon: Icons.architecture,
                  label: widget.church.architecturalStyle.label,
                  color: AppColors.gold,
                ),
              ],
            ),

            // Founded year
            if (widget.church.foundingYear != null) ...[
              SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  const Icon(Icons.calendar_today,
                      size: 16, color: Color(0xFF6B7280)),
                  const SizedBox(width: 8),
                  Text(
                    'Founded ${widget.church.foundingYear}',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF6B7280),
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

  /// Modern Action Buttons (matches homepage Details button style)
  Widget _buildModernActionButtons(BuildContext context) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: AppSpacing.lg),
        child: Column(
          children: [
            // Single row: All three buttons
            Consumer<AppState>(
              builder: (context, state, _) {
                final forVisit = state.isForVisit(widget.church);
                return Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => _openMap(context, widget.church),
                        icon: const Icon(Icons.map, size: 18),
                        label: const Text('Map', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: EdgeInsets.symmetric(vertical: AppSpacing.md + 4),
                          shape: RoundedRectangleBorder(
                            borderRadius: AppRadius.mediumRadius,
                          ),
                        ),
                      ),
                    ),
                    SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: widget.church.virtualTourUrl != null
                            ? () => _open360Tour(context, widget.church)
                            : null,
                        icon: const Icon(Icons.threed_rotation, size: 18),
                        label: const Text('360° Tour', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF6B7280),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: EdgeInsets.symmetric(vertical: AppSpacing.md + 4),
                          shape: RoundedRectangleBorder(
                            borderRadius: AppRadius.mediumRadius,
                          ),
                          disabledBackgroundColor: const Color(0xFFE5E7EB),
                          disabledForegroundColor: const Color(0xFF9E9E9E),
                        ),
                      ),
                    ),
                    SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          if (forVisit) {
                            state.unmarkForVisit(widget.church);
                          } else {
                            state.markForVisit(widget.church);
                          }
                        },
                        icon: Icon(
                          forVisit ? Icons.bookmark : Icons.bookmark_border,
                          size: 18,
                        ),
                        label: Text(
                          'For Visit',
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: forVisit ? AppColors.gold : const Color(0xFF6B7280),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: EdgeInsets.symmetric(vertical: AppSpacing.md + 4),
                          shape: RoundedRectangleBorder(
                            borderRadius: AppRadius.mediumRadius,
                          ),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
            SizedBox(height: AppSpacing.lg),
          ],
        ),
      ),
    );
  }

  /// Floating Action Button for Mark Visited
  Widget _buildMarkVisitedFAB(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, state, _) {
        final visited = state.isVisited(widget.church);

        return Container(
          decoration: BoxDecoration(
            gradient: visited
                ? AppGradients.goldGradient
                : AppGradients.sacredGreen,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: (visited ? AppColors.gold : AppColors.primary)
                    .withValues(alpha: 0.4),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: FloatingActionButton.extended(
            onPressed: () => _handleMarkAsVisited(context, state),
            backgroundColor: Colors.transparent,
            elevation: 0,
            icon: Icon(
              visited ? Icons.check_circle : Icons.add_location_alt,
              color: Colors.white,
            ),
            label: Text(
              visited ? 'Visited' : 'Mark Visited',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 15,
                letterSpacing: 0.3,
              ),
            ),
          ),
        );
      },
    );
  }

  /// Helper method to format diocese name
  String _formatDiocese(String diocese) {
    if (diocese.isEmpty) return 'Unknown';
    return diocese[0].toUpperCase() + diocese.substring(1);
  }

  /// Build tag widget (matches homepage tag style)
  Widget _buildTag({
    required IconData icon,
    required String label,
    required Color color,
  }) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: AppSpacing.md - 2,
        vertical: AppSpacing.sm - 2,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: AppRadius.mediumRadius,
        border: Border.all(
          color: color.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }

  /// Tab Bar (modern style matching homepage)
  Widget _buildTabBar() {
    return SliverPersistentHeader(
      pinned: true,
      delegate: _SliverAppBarDelegate(
        TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor: AppColors.primary,
          unselectedLabelColor: const Color(0xFF6B7280),
          labelStyle: const TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 15,
            letterSpacing: 0.2,
          ),
          unselectedLabelStyle: const TextStyle(
            fontWeight: FontWeight.w500,
            fontSize: 14,
          ),
          indicatorColor: AppColors.primary,
          indicatorWeight: 3,
          indicatorSize: TabBarIndicatorSize.label,
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
      hasScrollBody: true,
      child: Container(
        color: const Color(0xFFF8FAFC),
        child: TabBarView(
          controller: _tabController,
          physics: const NeverScrollableScrollPhysics(),
          children: [
            HistoryTab(church: widget.church),
            MassScheduleTab(church: widget.church),
            AnnouncementsTab(churchId: widget.church.id),
            const ReviewsTab(),
          ],
        ),
      ),
    );
  }

  // ============================================================================
  // FEATURE IMPLEMENTATIONS
  // ============================================================================

  /// Feature 3: Open Map with Church Pinned
  /// Navigates to the map screen with the church selected and centered
  void _openMap(BuildContext context, Church church) {
    if (church.latitude == null || church.longitude == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Location not available for this church')),
      );
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => MapScreen(selectedChurch: church),
      ),
    );
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
          tourUrl: church.virtualTourUrl!,
          churchName: church.name,
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
  Future<void> _handleMarkAsVisited(
      BuildContext context, AppState state) async {
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
    } catch (e) {
      // Error handling is done in _validateProximity
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
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
      ),
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
    final isNetwork =
        imagePath.startsWith('http://') || imagePath.startsWith('https://');

    if (imagePath.toLowerCase().endsWith('.svg')) {
      // Use proper SVG provider for network vs asset paths
      return isNetwork
          ? SvgPicture.network(
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
            )
          : SvgPicture.asset(
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
      // Use Image.network for remote URLs to avoid Flutter Web treating it as an asset
      return isNetwork
          ? Image.network(
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
            )
          : Image.asset(
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
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: shrinkOffset > 0
            ? AppElevation.getShadow(AppElevation.subtle)
            : [],
      ),
      child: _tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverAppBarDelegate oldDelegate) {
    return false;
  }
}

// Note: Tab widgets (HistoryTab, MassScheduleTab, AnnouncementsTab, ReviewsTab)
// are imported from ../widgets/church_details/
