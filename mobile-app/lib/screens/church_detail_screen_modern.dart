import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';

import '../models/church.dart';
import '../models/app_state.dart';
import '../models/enums.dart';
import '../services/feedback_service.dart';
import '../services/profile_service.dart';
import 'feedback_submit_screen.dart';
import '../models/announcement.dart';
import '../repositories/firestore_announcement_repository.dart';
import 'virtual_tour_screen.dart';
import 'map_screen.dart';
import '../models/feedback.dart' as fbm;

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
                final forVisit = state.isForVisit(widget.church);
                return OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                        vertical: 12, horizontal: 16),
                    backgroundColor:
                        forVisit ? const Color(0xFF2C5F2D) : Colors.white,
                    foregroundColor:
                        forVisit ? Colors.white : const Color(0xFF1F2937),
                    side: BorderSide(
                      color: forVisit
                          ? const Color(0xFF2C5F2D)
                          : const Color(0xFFE5E7EB),
                      width: 1.5,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  icon: Icon(
                    forVisit ? Icons.bookmark : Icons.bookmark_outline,
                    size: 20,
                  ),
                  label: Text(
                    forVisit ? 'For Visit' : 'Add to Visit',
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  onPressed: () async {
                    final profileService = context.read<ProfileService>();

                    if (forVisit) {
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
              backgroundColor: widget.church.virtualTourUrl != null
                  ? const Color(0xFF2C5F2D).withValues(alpha: 0.1)
                  : Colors.white,
              foregroundColor: widget.church.virtualTourUrl != null
                  ? const Color(0xFF2C5F2D)
                  : const Color(0xFFD1D5DB),
              side: BorderSide(
                color: widget.church.virtualTourUrl != null
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
            onPressed: widget.church.virtualTourUrl != null
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
            _HistoryTab(church: widget.church),
            _MassTab(church: widget.church),
            _AnnouncementsTab(church: widget.church),
            _ReviewsTab(church: widget.church),
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
                Text(
                  'Image not available',
                  style: TextStyle(
                    color: const Color(0xFF6B7280),
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

  void _open360Tour(BuildContext context, Church church) {
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

  Future<void> _handleMarkAsVisited(
      BuildContext context, AppState state) async {
    // Check if already visited
    if (state.isVisited(widget.church)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.info, color: Colors.white),
              const SizedBox(width: 12),
              const Expanded(child: Text('Already marked as visited')),
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

// ==============================================================================
// TAB WIDGETS
// ==============================================================================

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
          // Historical Information
          if (church.history != null && church.history!.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE5E7EB), width: 1.5),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.history, color: Color(0xFF2C5F2D), size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Historical Background',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1F2937),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    church.history!,
                    style: const TextStyle(
                      fontSize: 15,
                      color: Color(0xFF374151),
                      height: 1.6,
                    ),
                  ),
                ],
              ),
            )
          else
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE5E7EB), width: 1.5),
              ),
              child: Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.history,
                      size: 48,
                      color: const Color(0xFF2C5F2D).withValues(alpha: 0.2),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'No historical information available yet',
                      style: TextStyle(
                        color: Color(0xFF9CA3AF),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Documents Section
          if (church.documents != null && church.documents!.isNotEmpty) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE5E7EB), width: 1.5),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.folder_open,
                          color: Color(0xFF2C5F2D), size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Historical Documents',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1F2937),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Documents uploaded by the parish',
                    style: TextStyle(
                      fontSize: 13,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                  const SizedBox(height: 16),
                  ...church.documents!.asMap().entries.map((entry) {
                    final index = entry.key;
                    final docUrl = entry.value;
                    final docName = docUrl.split('/').last.split('?').first;

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: InkWell(
                        onTap: () => _openDocument(context, docUrl, docName),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: const Color(0xFFE5E7EB),
                              width: 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF2C5F2D)
                                      .withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(
                                  Icons.description,
                                  color: Color(0xFF2C5F2D),
                                  size: 24,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Document ${index + 1}',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF1F2937),
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      docName.length > 40
                                          ? '${docName.substring(0, 40)}...'
                                          : docName,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Color(0xFF6B7280),
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(
                                Icons.open_in_new,
                                color: Color(0xFF2C5F2D),
                                size: 20,
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _openDocument(BuildContext context, String url, String name) {
    // TODO: Implement document viewer
    // For now, show a message
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.description, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(
              child: Text('Opening: $name'),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF2C5F2D),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
        duration: const Duration(seconds: 2),
      ),
    );
    // In production, use url_launcher to open PDF
    // await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  }
}

class _MassTab extends StatelessWidget {
  final Church church;
  const _MassTab({required this.church});

  List<Map<String, String>> _getSchedulesByDay(String day) {
    if (church.massSchedules == null) return [];
    return church.massSchedules!.where((s) => s['day'] == day).toList();
  }

  Widget _buildScheduleItem(Map<String, String> schedule) {
    final time = schedule['time'] ?? '';
    final endTime = schedule['endTime'] ?? '';
    final language = schedule['language'] ?? 'Filipino';
    final isFbLive = schedule['isFbLive'] == 'true';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xFFE5E7EB),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Time display with icon
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF2C5F2D).withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.access_time,
              size: 24,
              color: Color(0xFF2C5F2D),
            ),
          ),
          const SizedBox(width: 16),
          
          // Schedule details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Time
                Text(
                  endTime.isNotEmpty ? '$time – $endTime' : time,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1F2937),
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 8),
                
                // Language and FB Live badges
                Wrap(
                  spacing: 8,
                  runSpacing: 6,
                  children: [
                    // Language badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: language == 'English'
                            ? const Color(0xFF3B82F6).withValues(alpha: 0.1)
                            : const Color(0xFF6B7280).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: language == 'English'
                              ? const Color(0xFF3B82F6).withValues(alpha: 0.3)
                              : const Color(0xFF6B7280).withValues(alpha: 0.3),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.language,
                            size: 12,
                            color: language == 'English'
                                ? const Color(0xFF3B82F6)
                                : const Color(0xFF6B7280),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            language,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: language == 'English'
                                  ? const Color(0xFF3B82F6)
                                  : const Color(0xFF6B7280),
                              letterSpacing: 0.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                    
                    // FB Live badge
                    if (isFbLive)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: const Color(0xFFEF4444).withValues(alpha: 0.3),
                            width: 1,
                          ),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.circle,
                              size: 8,
                              color: Color(0xFFEF4444),
                            ),
                            SizedBox(width: 4),
                            Text(
                              'LIVE STREAM',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFFEF4444),
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDaySection(String title, List<String> days, IconData icon) {
    // Get schedules for all specified days
    final allSchedules = days
        .expand((day) => _getSchedulesByDay(day))
        .toList();

    if (allSchedules.isEmpty) return const SizedBox.shrink();

    // Group schedules by day
    final Map<String, List<Map<String, String>>> schedulesByDay = {};
    for (final schedule in allSchedules) {
      final day = schedule['day'] ?? '';
      if (day.isNotEmpty) {
        schedulesByDay.putIfAbsent(day, () => []);
        schedulesByDay[day]!.add(schedule);
      }
    }

    // Define day order
    final dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    final sortedDays = schedulesByDay.keys.toList()
      ..sort((a, b) => dayOrder.indexOf(a).compareTo(dayOrder.indexOf(b)));

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section header with total count
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF2C5F2D), Color(0xFF1E4620)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF2C5F2D).withValues(alpha: 0.2),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    icon,
                    size: 20,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                      letterSpacing: 0.3,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${allSchedules.length} ${allSchedules.length == 1 ? 'Mass' : 'Masses'}',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          
          // Day subsections with expansion tiles
          ...sortedDays.map((day) {
            final daySchedules = schedulesByDay[day]!;
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: const Color(0xFFE5E7EB),
                  width: 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: ExpansionTile(
                  initiallyExpanded: false,
                  tilePadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 4,
                  ),
                  childrenPadding: const EdgeInsets.only(
                    left: 16,
                    right: 16,
                    bottom: 12,
                  ),
                  backgroundColor: Colors.white,
                  collapsedBackgroundColor: Colors.white,
                  leading: Container(
                    width: 4,
                    height: 32,
                    decoration: BoxDecoration(
                      color: const Color(0xFF2C5F2D),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  title: Text(
                    day,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1F2937),
                    ),
                  ),
                  subtitle: Text(
                    '${daySchedules.length} ${daySchedules.length == 1 ? 'mass' : 'masses'}',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                  trailing: const Icon(
                    Icons.keyboard_arrow_down,
                    color: Color(0xFF2C5F2D),
                  ),
                  children: daySchedules.map((s) => _buildScheduleItem(s)).toList(),
                ),
              ),
            );
          }).toList(),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (church.massSchedules == null || church.massSchedules!.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.event_busy,
              size: 64,
              color: const Color(0xFF2C5F2D).withValues(alpha: 0.2),
            ),
            const SizedBox(height: 16),
            const Text(
              'No mass schedules available',
              style: TextStyle(
                color: Color(0xFF9CA3AF),
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Please check back later',
              style: TextStyle(
                color: Color(0xFF9CA3AF),
                fontSize: 12,
              ),
            ),
          ],
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header card
          Container(
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
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF2C5F2D), Color(0xFF1E4620)],
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.calendar_today,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Mass Schedule',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF1F2937),
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Weekly celebration times',
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Daily Masses (Monday-Friday)
          _buildDaySection(
            'Daily Masses (Monday–Friday)',
            ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            Icons.today,
          ),

          // Saturday
          _buildDaySection(
            'Saturday',
            ['Saturday'],
            Icons.event,
          ),

          // Sunday
          _buildDaySection(
            'Sunday',
            ['Sunday'],
            Icons.church,
          ),
        ],
      ),
    );
  }
}

class _AnnouncementsTab extends StatefulWidget {
  final Church church;
  const _AnnouncementsTab({required this.church});

  @override
  State<_AnnouncementsTab> createState() => _AnnouncementsTabState();
}

class _AnnouncementsTabState extends State<_AnnouncementsTab> {
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
                return _showArchived ? a.isPast : !a.isPast;
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
                              color: Colors.red.withOpacity(0.08),
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
            child: CircularProgressIndicator(color: Color(0xFF2C5F2D)),
          );
        }

        final feedbacks = (snapshot.data ?? [])
            .where((f) => f.churchId == church.id)
            .toList();

        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) =>
                            FeedbackSubmitScreen(churchId: church.id),
                      ),
                    );
                  },
                  icon: const Icon(Icons.rate_review),
                  label: const Text('Write a Review'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2C5F2D),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ),
            if (feedbacks.isEmpty)
              Expanded(
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.rate_review_outlined,
                        size: 64,
                        color: const Color(0xFF2C5F2D).withValues(alpha: 0.2),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'No reviews yet',
                        style: TextStyle(
                          color: Color(0xFF9CA3AF),
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Be the first to review!',
                        style: TextStyle(
                          color: Color(0xFF9CA3AF),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: feedbacks.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final feedback = feedbacks[index];
                    return Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                            color: const Color(0xFFE5E7EB), width: 1.5),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [
                                      Color(0xFF2C5F2D),
                                      Color(0xFF1E4620)
                                    ],
                                  ),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Center(
                                  child: Text(
                                    feedback.userName
                                        .substring(0, 1)
                                        .toUpperCase(),
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 18,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      feedback.userName,
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF1F2937),
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Row(
                                      children: List.generate(5, (i) {
                                        return Icon(
                                          i < feedback.rating
                                              ? Icons.star
                                              : Icons.star_border,
                                          size: 14,
                                          color: const Color(0xFFD4AF37),
                                        );
                                      }),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            feedback.comment,
                            style: const TextStyle(
                              fontSize: 14,
                              color: Color(0xFF6B7280),
                              height: 1.5,
                            ),
                          ),

                          // Display photos if available
                          if (feedback.photos.isNotEmpty) ...[
                            const SizedBox(height: 12),
                            SizedBox(
                              height: 120,
                              child: ListView.separated(
                                scrollDirection: Axis.horizontal,
                                itemCount: feedback.photos.length,
                                separatorBuilder: (context, index) =>
                                    const SizedBox(width: 8),
                                itemBuilder: (context, photoIndex) {
                                  final photoUrl = feedback.photos[photoIndex];
                                  return GestureDetector(
                                    onTap: () => _showPhotoGallery(
                                      context,
                                      feedback.photos,
                                      photoIndex,
                                    ),
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(12),
                                      child: Container(
                                        width: 120,
                                        decoration: BoxDecoration(
                                          border: Border.all(
                                            color: const Color(0xFFE5E7EB),
                                            width: 1,
                                          ),
                                          borderRadius:
                                              BorderRadius.circular(12),
                                        ),
                                        child: CachedNetworkImage(
                                          imageUrl: photoUrl,
                                          fit: BoxFit.cover,
                                          placeholder: (context, url) =>
                                              Container(
                                            color: const Color(0xFFF3F4F6),
                                            child: const Center(
                                              child: CircularProgressIndicator(
                                                color: Color(0xFF2C5F2D),
                                                strokeWidth: 2,
                                              ),
                                            ),
                                          ),
                                          errorWidget: (context, url, error) =>
                                              Container(
                                            color: const Color(0xFFF3F4F6),
                                            child: const Icon(
                                              Icons.broken_image,
                                              color: Color(0xFF9CA3AF),
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),
                          ],

                          const SizedBox(height: 8),
                          Text(
                            DateFormat('MMM dd, yyyy')
                                .format(feedback.createdAt),
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF9CA3AF),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
          ],
        );
      },
    );
  }

  void _showPhotoGallery(
      BuildContext context, List<String> photos, int initialIndex) {
    showDialog(
      context: context,
      barrierColor: Colors.black87,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: EdgeInsets.zero,
        child: Stack(
          children: [
            // Photo viewer
            Center(
              child: PageView.builder(
                itemCount: photos.length,
                controller: PageController(initialPage: initialIndex),
                itemBuilder: (context, index) {
                  return InteractiveViewer(
                    minScale: 0.5,
                    maxScale: 4.0,
                    child: Center(
                      child: CachedNetworkImage(
                        imageUrl: photos[index],
                        fit: BoxFit.contain,
                        placeholder: (context, url) => const Center(
                          child: CircularProgressIndicator(
                            color: Colors.white,
                          ),
                        ),
                        errorWidget: (context, url, error) => const Center(
                          child: Icon(
                            Icons.broken_image,
                            color: Colors.white,
                            size: 64,
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            // Close button
            Positioned(
              top: 40,
              right: 16,
              child: IconButton(
                onPressed: () => Navigator.pop(context),
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.close,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ==============================================================================
// HELPER CLASSES
// ==============================================================================

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
