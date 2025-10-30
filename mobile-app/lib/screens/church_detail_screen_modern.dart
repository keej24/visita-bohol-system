import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:geolocator/geolocator.dart';

import '../models/church.dart';
import '../models/app_state.dart';
import '../models/enums.dart';
import '../services/profile_service.dart';
import 'map_screen.dart';
import 'virtual_tour_screen.dart';

// Tab widgets
import 'church_detail/tabs/history_tab.dart';
import 'church_detail/tabs/mass_schedule_tab.dart';
import 'church_detail/tabs/announcements_tab.dart';
import 'church_detail/tabs/reviews_tab.dart';

/// Modern Church Detail Screen - Clean design matching home screen aesthetic
///
/// Design Features:
/// - Clean white cards on light background
/// - Modern icon buttons with borders
/// - Floating Action Button for Mark Visited
/// - Consistent typography and spacing
/// - Smooth animations
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
      backgroundColor: const Color(0xFFF8FAFC), // Match home screen background
      body: CustomScrollView(
        slivers: [
          _buildAppBar(context),
          _buildLocationHeader(),
          if (widget.church.images.isNotEmpty) _buildPhotoCarouselWithActions(),
          _buildInfoCard(),
          _buildTabBar(),
          _buildTabContent(),
        ],
      ),
      floatingActionButton: _buildMarkVisitedFAB(context),
    );
  }

  /// Simplified App Bar - buttons moved to carousel section
  Widget _buildAppBar(BuildContext context) {
    return SliverAppBar(
      expandedHeight: 60,
      pinned: true,
      backgroundColor: const Color(0xFFF8FAFC),
      elevation: 0,
      leading: IconButton(
        icon: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE5E7EB), width: 1.5),
          ),
          child:
              const Icon(Icons.arrow_back, color: Color(0xFF1F2937), size: 20),
        ),
        onPressed: () => Navigator.pop(context),
      ),
    );
  }

  /// Action buttons to be shown below photo carousel
  Widget _buildActionButtons(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          // For Visit button (Wishlist/Bookmark) - expanded
          Expanded(
            child: Consumer<AppState>(
              builder: (context, state, _) {
                final isInVisitList = state.isForVisit(widget.church);
                return OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                        vertical: 12, horizontal: 16),
                    backgroundColor:
                        isInVisitList ? const Color(0xFF2C5F2D) : Colors.white,
                    foregroundColor:
                        isInVisitList ? Colors.white : const Color(0xFF2C5F2D),
                    side: BorderSide(
                      color: const Color(0xFF2C5F2D),
                      width: 1.5,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  icon: Icon(
                    isInVisitList ? Icons.bookmark : Icons.bookmark_outline,
                    size: 20,
                  ),
                  label: const Text(
                    'For Visit',
                    style: TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  onPressed: () async {
                    final profileService = context.read<ProfileService>();

                    if (isInVisitList) {
                      // Already in list - remove it
                      state.unmarkForVisit(widget.church);
                      await profileService
                          .toggleForVisitChurch(widget.church.id);

                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: const Row(
                              children: [
                                Icon(Icons.bookmark_remove,
                                    color: Colors.white),
                                SizedBox(width: 12),
                                Expanded(
                                    child: Text('Removed from For Visit list')),
                              ],
                            ),
                            backgroundColor: const Color(0xFF6B7280),
                            behavior: SnackBarBehavior.floating,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                            margin: const EdgeInsets.all(16),
                            duration: const Duration(seconds: 2),
                          ),
                        );
                      }
                    } else {
                      // Not in list - add it
                      state.markForVisit(widget.church);
                      await profileService
                          .toggleForVisitChurch(widget.church.id);

                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: const Row(
                              children: [
                                Icon(Icons.bookmark_added, color: Colors.white),
                                SizedBox(width: 12),
                                Expanded(
                                    child: Text('Added to For Visit list')),
                              ],
                            ),
                            backgroundColor: const Color(0xFF2C5F2D),
                            behavior: SnackBarBehavior.floating,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                            margin: const EdgeInsets.all(16),
                            duration: const Duration(seconds: 2),
                          ),
                        );
                      }
                    }
                  },
                );
              },
            ),
          ),
          const SizedBox(width: 8),
          // Map button
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              backgroundColor: Colors.white,
              foregroundColor: const Color(0xFF1F2937),
              side: const BorderSide(color: Color(0xFFE5E7EB), width: 1.5),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            icon: const Icon(Icons.map_outlined, size: 20),
            label: const Text(
              'Map',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            ),
            onPressed: () => _openMap(context, widget.church),
          ),
          const SizedBox(width: 8),
          // 360° Tour button
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              backgroundColor: _has360Tour()
                  ? const Color(0xFF2C5F2D).withValues(alpha: 0.1)
                  : Colors.white,
              foregroundColor: _has360Tour()
                  ? const Color(0xFF2C5F2D)
                  : const Color(0xFFD1D5DB),
              side: BorderSide(
                color: _has360Tour()
                    ? const Color(0xFF2C5F2D)
                    : const Color(0xFFE5E7EB),
                width: 1.5,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            icon: const Icon(Icons.threed_rotation, size: 20),
            label: const Text(
              '360°',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            ),
            onPressed: _has360Tour()
                ? () => _open360Tour(context, widget.church)
                : () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: const Row(
                          children: [
                            Icon(Icons.info, color: Colors.white),
                            SizedBox(width: 12),
                            Expanded(
                                child: Text(
                                    '360° tour not available for this church')),
                          ],
                        ),
                        backgroundColor: const Color(0xFF6B7280),
                        behavior: SnackBarBehavior.floating,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        margin: const EdgeInsets.all(16),
                        duration: const Duration(seconds: 2),
                      ),
                    );
                  },
          ),
        ],
      ),
    );
  }

  /// Location Header below app bar
  Widget _buildLocationHeader() {
    return SliverToBoxAdapter(
      child: Container(
        color: const Color(0xFFF8FAFC),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Church name with heritage badge inline
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    widget.church.name,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF1F2937),
                      height: 1.2,
                    ),
                  ),
                ),
                if (widget.church.isHeritage) ...[
                  const SizedBox(width: 8),
                  _buildCompactHeritageBadge(),
                ],
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2C5F2D).withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: const Color(0xFF2C5F2D).withValues(alpha: 0.2),
                    ),
                  ),
                  child: const Icon(
                    Icons.account_balance,
                    size: 24,
                    color: Color(0xFF2C5F2D),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    widget.church.location,
                    style: const TextStyle(
                      fontSize: 15,
                      color: Color(0xFF6B7280),
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Compact heritage badge for header
  Widget _buildCompactHeritageBadge() {
    final isICP =
        widget.church.heritageClassification == HeritageClassification.icp;
    final colors = isICP
        ? [const Color(0xFFD4AF37), const Color(0xFFB8941F)] // Gold for ICP
        : [const Color(0xFF7C3AED), const Color(0xFF5B21B6)]; // Purple for NCT

    return Tooltip(
      message:
          '${widget.church.heritageClassification.label} - Protected Heritage Site',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: colors),
          borderRadius: BorderRadius.circular(8),
          boxShadow: [
            BoxShadow(
              color: colors[0].withValues(alpha: 0.3),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isICP ? Icons.stars : Icons.diamond,
              color: Colors.white,
              size: 16,
            ),
            const SizedBox(width: 4),
            Text(
              isICP ? 'ICP' : 'NCT',
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: Colors.white,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Photo Carousel with modern design
  /// Photo Carousel with action buttons below
  Widget _buildPhotoCarouselWithActions() {
    return SliverToBoxAdapter(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
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
        child: Column(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: CarouselSlider(
                options: CarouselOptions(
                  height: 240,
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
                  return Container(
                    width: MediaQuery.of(context).size.width,
                    color: const Color(0xFFF3F4F6),
                    child: _buildChurchImage(imagePath),
                  );
                }).toList(),
              ),
            ),
            // Modern photo indicators (outside carousel to avoid Positioned error)
            if (widget.church.images.length > 1)
              Padding(
                padding: const EdgeInsets.only(top: 12, bottom: 8),
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
                            ? const Color(0xFF2C5F2D)
                            : const Color(0xFFE5E7EB),
                      ),
                    );
                  }).toList(),
                ),
              ),
            // Action buttons below carousel
            _buildActionButtons(context),
          ],
        ),
      ),
    );
  }

  /// Modern Info Card matching home screen design
  Widget _buildInfoCard() {
    return SliverToBoxAdapter(
      child: Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(20),
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
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Founding Information',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1F2937),
              ),
            ),
            const SizedBox(height: 20),
            _buildModernInfoRow(
              Icons.calendar_today_outlined,
              'Founded',
              widget.church.foundingYear?.toString() ?? 'Unknown',
            ),
            const SizedBox(height: 16),
            _buildModernInfoRow(
              Icons.architecture_outlined,
              'Architectural Style',
              widget.church.architecturalStyle.label,
            ),
            const SizedBox(height: 16),
            _buildModernInfoRow(
              Icons.location_on_outlined,
              'Diocese',
              widget.church.diocese,
            ),
            if (widget.church.isHeritage) ...[
              const SizedBox(height: 16),
              _buildHeritageBadge(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildModernInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFF2C5F2D).withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 20, color: const Color(0xFF2C5F2D)),
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
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 15,
                  color: Color(0xFF1F2937),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildHeritageBadge() {
    final isICP =
        widget.church.heritageClassification == HeritageClassification.icp;
    final colors = isICP
        ? [const Color(0xFFD4AF37), const Color(0xFFB8941F)] // Gold for ICP
        : [const Color(0xFF7C3AED), const Color(0xFF5B21B6)]; // Purple for NCT

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: colors),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: colors[0].withValues(alpha: 0.3),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Icon(
            isICP ? Icons.stars : Icons.diamond,
            color: Colors.white,
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.church.heritageClassification.label,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Protected Heritage Site',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.white,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Modern Tab Bar
  Widget _buildTabBar() {
    return SliverPersistentHeader(
      pinned: true,
      delegate: _SliverAppBarDelegate(
        Container(
          color: const Color(0xFFF8FAFC),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE5E7EB), width: 1.5),
            ),
            child: TabBar(
              controller: _tabController,
              labelColor: const Color(0xFF2C5F2D),
              unselectedLabelColor: const Color(0xFF6B7280),
              labelStyle: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 14,
              ),
              unselectedLabelStyle: const TextStyle(
                fontWeight: FontWeight.w500,
                fontSize: 14,
              ),
              indicator: BoxDecoration(
                color: const Color(0xFF2C5F2D).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              dividerColor: Colors.transparent,
              tabs: const [
                Tab(text: 'History'),
                Tab(text: 'Mass'),
                Tab(text: 'Announcements'),
                Tab(text: 'Reviews'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Tab Content
  Widget _buildTabContent() {
    return SliverToBoxAdapter(
      child: SizedBox(
        height: MediaQuery.of(context).size.height - 400,
        child: TabBarView(
          controller: _tabController,
          children: [
            HistoryTab(church: widget.church),
            MassScheduleTab(church: widget.church),
            AnnouncementsTab(church: widget.church),
            ReviewsTab(church: widget.church),
          ],
        ),
      ),
    );
  }

  /// Modern Floating Action Button
  Widget _buildMarkVisitedFAB(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, state, _) {
        final visited = state.isVisited(widget.church);

        return FloatingActionButton.extended(
          onPressed: _isMarkingVisited
              ? null
              : () => _handleMarkAsVisited(context, state),
          backgroundColor:
              visited ? const Color(0xFF4CAF50) : const Color(0xFF2C5F2D),
          foregroundColor: Colors.white,
          elevation: 6,
          extendedPadding: const EdgeInsets.symmetric(horizontal: 24),
          icon: _isMarkingVisited
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : Icon(visited ? Icons.check_circle : Icons.check_circle_outline,
                  size: 24),
          label: Text(
            visited ? 'Visited' : 'Mark Visited',
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 15,
              letterSpacing: 0.5,
            ),
          ),
        );
      },
    );
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  Widget _buildChurchImage(String imagePath) {
    // Check if it's a network URL (Firebase Storage)
    final isNetworkImage =
        imagePath.startsWith('http://') || imagePath.startsWith('https://');

    if (imagePath.toLowerCase().endsWith('.svg')) {
      // SVG images from assets
      return SvgPicture.asset(
        imagePath,
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
        placeholderBuilder: (context) => Container(
          color: const Color(0xFFF3F4F6),
          child: const Center(
            child: CircularProgressIndicator(color: Color(0xFF2C5F2D)),
          ),
        ),
      );
    } else if (isNetworkImage) {
      // Network images from Firebase Storage with caching
      return CachedNetworkImage(
        imageUrl: imagePath,
        fit: BoxFit.cover,
        placeholder: (context, url) => Container(
          color: const Color(0xFFF3F4F6),
          child: const Center(
            child: CircularProgressIndicator(
              color: Color(0xFF2C5F2D),
            ),
          ),
        ),
        errorWidget: (context, url, error) {
          debugPrint('❌ Error loading image from $url: $error');
          return Container(
            color: const Color(0xFFF3F4F6),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.account_balance,
                  size: 80,
                  color: const Color(0xFF2C5F2D).withValues(alpha: 0.5),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Image not available',
                  style: TextStyle(
                    color: Color(0xFF6B7280),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          );
        },
      );
    } else {
      // Local asset images
      return Image.asset(
        imagePath,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) {
          return Container(
            color: const Color(0xFFF3F4F6),
            child: Icon(
              Icons.account_balance,
              size: 80,
              color: const Color(0xFF2C5F2D).withValues(alpha: 0.5),
            ),
          );
        },
      );
    }
  }

  void _openMap(BuildContext context, Church church) {
    // Check if church has valid coordinates
    if (church.latitude == null || church.longitude == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.location_off, color: Colors.white),
              SizedBox(width: 12),
              Expanded(child: Text('Location not available for this church')),
            ],
          ),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(16),
          duration: const Duration(seconds: 2),
        ),
      );
      return;
    }

    // Navigate to MapScreen with the selected church
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => MapScreen(selectedChurch: church),
      ),
    );
  }

  /// Check if the church has 360° tour available
  bool _has360Tour() {
    return widget.church.hasVirtualTour;
  }

  /// Open 360° tour viewer
  void _open360Tour(BuildContext context, Church church) {
    if (church.virtualTour != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => VirtualTourScreen(
            tour: church.virtualTour!,
            churchName: church.name,
          ),
        ),
      );
    }
  }

  Future<void> _handleMarkAsVisited(
      BuildContext context, AppState state) async {
    // Check if already visited
    if (state.isVisited(widget.church)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.info, color: Colors.white),
              SizedBox(width: 12),
              Expanded(child: Text('Already marked as visited')),
            ],
          ),
          backgroundColor: const Color(0xFF2C5F2D),
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(16),
        ),
      );
      return;
    }

    setState(() {
      _isMarkingVisited = true;
    });

    try {
      // Check location permission
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw 'Location permission is required to mark as visited';
        }
      }

      if (permission == LocationPermission.deniedForever) {
        throw 'Location permission is permanently denied. Please enable it in settings.';
      }

      // Check if location service is enabled
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw 'Location services are disabled. Please enable GPS.';
      }

      // Get current position
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      // Validate proximity using the app_state method with location validation
      final validationResult = await state.markVisitedWithValidation(
        widget.church,
        position,
      );

      if (!context.mounted) return;

      if (validationResult.isValid) {
        // Success - church marked as visited
        // Sync with ProfileService
        final profileService = context.read<ProfileService>();
        await profileService.markChurchAsVisited(widget.church.id);

        if (!context.mounted) return;

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(
                  child: Text('${widget.church.name} marked as visited!'),
                ),
              ],
            ),
            backgroundColor: const Color(0xFF4CAF50),
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: const EdgeInsets.all(16),
            duration: const Duration(seconds: 3),
          ),
        );
      } else {
        // Validation failed - show distance message
        final distanceInMeters = validationResult.distance != null
            ? validationResult.distance!.toStringAsFixed(0)
            : 'Unknown';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.location_off, color: Colors.white),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Too far from church',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'You are ${distanceInMeters}m away. You need to be within 500m to mark as visited.',
                  style: const TextStyle(fontSize: 13),
                ),
              ],
            ),
            backgroundColor: const Color(0xFFF59E0B),
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: const EdgeInsets.all(16),
            duration: const Duration(seconds: 5),
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(child: Text(e.toString())),
              ],
            ),
            backgroundColor: const Color(0xFFEF4444),
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: const EdgeInsets.all(16),
            duration: const Duration(seconds: 4),
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
}


class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  final Widget _child;

  _SliverAppBarDelegate(this._child);

  @override
  double get minExtent => 60;
  @override
  double get maxExtent => 60;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return _child;
  }

  @override
  bool shouldRebuild(_SliverAppBarDelegate oldDelegate) {
    return false;
  }
}
