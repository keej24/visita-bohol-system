/// =============================================================================
/// CHURCH_DETAIL_SCREEN_MODERN.DART - Individual Church Information Display
/// =============================================================================
///
/// PURPOSE:
/// This screen shows all details about a single church. When a user taps on a
/// church from the home screen list, this is where they land. It displays
/// photos, history, mass schedules, announcements, reviews, and interaction
/// options.
///
/// SCREEN LAYOUT:
/// ┌─────────────────────────────────────────────────────────────────────────┐
/// │  ← Back Button                              Share / Add To List        │
/// ├─────────────────────────────────────────────────────────────────────────┤
/// │                                                                          │
/// │                     PHOTO CAROUSEL                                       │
/// │              (swipeable church images)                                   │
/// │                                                                          │
/// ├─────────────────────────────────────────────────────────────────────────┤
/// │  Church Name                                                             │
/// │  Location • Distance                                                     │
/// │  [Heritage Badge] [Virtual Tour Button] [Directions] [Mark Visited]     │
/// ├─────────────────────────────────────────────────────────────────────────┤
/// │  [History]  [Mass Schedule]  [Announcements]  [Reviews]  ← Tabs         │
/// ├─────────────────────────────────────────────────────────────────────────┤
/// │                                                                          │
/// │              TAB CONTENT (varies by selected tab)                        │
/// │                                                                          │
/// └─────────────────────────────────────────────────────────────────────────┘
///
/// TAB SECTIONS:
/// 1. History: Founding year, historical background, architectural details
/// 2. Mass Schedule: Daily/weekly mass times with language indicators
/// 3. Announcements: Parish-specific news and events
/// 4. Reviews: User feedback with ratings, photos, and comments
///
/// KEY FEATURES:
/// - Photo Carousel: Swipeable gallery of church images
/// - Virtual Tour: 360° panoramic view (if available)
/// - Mark Visited: Location-validated visit confirmation
/// - For Visit List: Save churches to visit later
/// - Directions: Open in maps app for navigation
/// - Share: Share church info with others
///
/// VISIT VALIDATION:
/// - Uses GPS to verify user is near the church (500m radius)
/// - Prevents "armchair" visit claiming
/// - Shows distance and direction to church
/// - Records visit timestamp and location
///
/// STATE MANAGEMENT:
/// - AppState: Tracks visited/for-visit lists
/// - ProfileService: Syncs visit data with Firebase
/// - PaginatedChurchService: Provides church data
/// - LocationService: GPS position for visit validation
///
/// RELATED FILES:
/// - screens/church_detail/tabs/: Individual tab implementations
/// - screens/virtual_tour_screen.dart: 360° panoramic viewer
/// - services/visitor_validation_service.dart: Visit location logic
/// - models/app_state.dart: Visit tracking state

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
import '../services/paginated_church_service.dart';
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
  bool _showFAB = true;
  late Church _currentChurch;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _currentChurch = widget.church;

    // CRITICAL FIX: Sync AppState with ProfileService on screen load
    // This ensures buttons show correct state even if user navigates quickly
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _syncStateWithProfile();
    });
  }

  /// Sync AppState with ProfileService for both Visited and For Visit button states
  void _syncStateWithProfile() {
    try {
      final appState = context.read<AppState>();
      final profileService = context.read<ProfileService>();
      final profile = profileService.userProfile;

      if (profile == null) {
        debugPrint('⚠️ ProfileService has no user profile loaded');
        return;
      }

      final visitedIds = profile.visitedChurches;
      final forVisitIds = profile.forVisitChurches;

      // Sync For Visit state
      if (forVisitIds.contains(_currentChurch.id) &&
          !appState.isForVisit(_currentChurch)) {
        debugPrint(
            '🔄 Syncing: Church ${_currentChurch.id} is in ProfileService For Visit but not AppState');
        appState.markForVisit(_currentChurch);
      } else if (!forVisitIds.contains(_currentChurch.id) &&
          appState.isForVisit(_currentChurch)) {
        debugPrint(
            '🔄 Syncing: Church ${_currentChurch.id} is NOT in ProfileService For Visit, removing from AppState');
        appState.unmarkForVisit(_currentChurch);
      }

      // Sync Visited state
      if (visitedIds.contains(_currentChurch.id) &&
          !appState.isVisited(_currentChurch)) {
        debugPrint(
            '🔄 Syncing: Church ${_currentChurch.id} is in ProfileService Visited but not AppState');
        appState.markVisited(_currentChurch);
      }

      debugPrint('✅ State sync complete for church: ${_currentChurch.id}');
    } catch (e) {
      debugPrint('⚠️ Error syncing state with profile: $e');
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _refreshChurchData() async {
    try {
      debugPrint('🔄 Refreshing church data for: ${_currentChurch.id}');

      // Fetch fresh data from Firestore (bypassing cache)
      final churchService =
          Provider.of<PaginatedChurchService>(context, listen: false);
      final updatedChurch =
          await churchService.fetchChurchById(_currentChurch.id);

      if (updatedChurch != null && mounted) {
        setState(() {
          _currentChurch = updatedChurch;
        });
        debugPrint('✅ Church data refreshed successfully');
      } else {
        debugPrint('⚠️ No updated church data received');
      }
    } catch (e) {
      debugPrint('❌ Error refreshing church data: $e');
      // Show error message to user
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(child: Text('Failed to refresh: ${e.toString()}')),
              ],
            ),
            backgroundColor: const Color(0xFFEF4444),
            behavior: SnackBarBehavior.floating,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: const EdgeInsets.all(16),
            duration: const Duration(seconds: 3),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC), // Match home screen background
      body: NotificationListener<ScrollNotification>(
        onNotification: (ScrollNotification notification) {
          // Only respond to scroll notifications from the main scroll view, not carousel
          // Check if the notification is from a ScrollView (not PageView/Carousel)
          if (notification is ScrollUpdateNotification &&
              notification.depth == 0) {
            final scrollPosition = notification.metrics.pixels;

            // Show FAB only when at the top (scroll position near 0)
            // Hide FAB when scrolled down
            if (scrollPosition <= 50) {
              // At the top (with small threshold for smooth transition)
              if (!_showFAB) {
                setState(() {
                  _showFAB = true;
                });
              }
            } else {
              // Scrolled down
              if (_showFAB) {
                setState(() {
                  _showFAB = false;
                });
              }
            }
          }
          return false;
        },
        child: NestedScrollView(
          headerSliverBuilder: (BuildContext context, bool innerBoxIsScrolled) {
            return [
              _buildAppBar(context),
              _buildLocationHeader(),
              if (_currentChurch.images.isNotEmpty)
                _buildPhotoCarouselWithActions(),
              _buildInfoCard(),
              _buildTabBar(),
            ];
          },
          body: RefreshIndicator(
            onRefresh: _refreshChurchData,
            color: const Color(0xFF2C5F2D),
            child: TabBarView(
              controller: _tabController,
              children: [
                HistoryTab(church: _currentChurch),
                MassScheduleTab(church: _currentChurch),
                AnnouncementsTab(church: _currentChurch),
                ReviewsTab(church: _currentChurch),
              ],
            ),
          ),
        ),
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
          // Disabled when church is already visited
          Expanded(
            child: Consumer<AppState>(
              builder: (context, state, _) {
                final isInVisitList = state.isForVisit(_currentChurch);
                final isVisited = state.isVisited(_currentChurch);

                // Determine button colors based on state
                final Color backgroundColor;
                final Color foregroundColor;
                final Color borderColor;

                if (isVisited) {
                  // Disabled state - church already visited
                  backgroundColor = const Color(0xFFF3F4F6);
                  foregroundColor = const Color(0xFF9CA3AF);
                  borderColor = const Color(0xFFE5E7EB);
                } else if (isInVisitList) {
                  // Active state - in For Visit list
                  backgroundColor = const Color(0xFF2C5F2D);
                  foregroundColor = Colors.white;
                  borderColor = const Color(0xFF2C5F2D);
                } else {
                  // Default state
                  backgroundColor = Colors.white;
                  foregroundColor = const Color(0xFF2C5F2D);
                  borderColor = const Color(0xFF2C5F2D);
                }

                return OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                        vertical: 12, horizontal: 16),
                    backgroundColor: backgroundColor,
                    foregroundColor: foregroundColor,
                    side: BorderSide(
                      color: borderColor,
                      width: 1.5,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  icon: Icon(
                    isVisited
                        ? Icons.check_circle // Show check when visited
                        : (isInVisitList
                            ? Icons.bookmark
                            : Icons.bookmark_outline),
                    size: 20,
                  ),
                  label: Text(
                    isVisited ? 'Visited' : 'For Visit',
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  // Disable button if church is already visited
                  onPressed: isVisited
                      ? () {
                          // Show message that church is already visited
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: const Row(
                                children: [
                                  Icon(Icons.info_outline, color: Colors.white),
                                  SizedBox(width: 12),
                                  Expanded(
                                      child: Text(
                                          'This church is already in your Visited list')),
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
                      : () async {
                          final profileService = context.read<ProfileService>();

                          // Toggle in ProfileService (this handles Firebase sync)
                          await profileService
                              .toggleForVisitChurch(_currentChurch.id);

                          // Update local AppState to match ProfileService
                          final updatedList =
                              profileService.userProfile?.forVisitChurches ??
                                  [];
                          if (updatedList.contains(_currentChurch.id)) {
                            // Church was added to list
                            state.markForVisit(_currentChurch);

                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: const Row(
                                    children: [
                                      Icon(Icons.bookmark_added,
                                          color: Colors.white),
                                      SizedBox(width: 12),
                                      Expanded(
                                          child:
                                              Text('Added to For Visit list')),
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
                          } else {
                            // Church was removed from list
                            state.unmarkForVisit(_currentChurch);

                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: const Row(
                                    children: [
                                      Icon(Icons.bookmark_remove,
                                          color: Colors.white),
                                      SizedBox(width: 12),
                                      Expanded(
                                          child: Text(
                                              'Removed from For Visit list')),
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
            onPressed: () => _openMap(context, _currentChurch),
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
                ? () => _open360Tour(context, _currentChurch)
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
                    _currentChurch.name,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF1F2937),
                      height: 1.2,
                    ),
                  ),
                ),
                if (_currentChurch.isHeritage) ...[
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
                    _currentChurch.location,
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
        _currentChurch.heritageClassification == HeritageClassification.icp;
    final colors = isICP
        ? [const Color(0xFFD4AF37), const Color(0xFFB8941F)] // Gold for ICP
        : [const Color(0xFF7C3AED), const Color(0xFF5B21B6)]; // Purple for NCT

    return Tooltip(
      message:
          '${_currentChurch.heritageClassification.label} - Protected Heritage Site',
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
                items: _currentChurch.images.map((imagePath) {
                  return Container(
                    width: MediaQuery.of(context).size.width,
                    color: const Color(0xFFF3F4F6),
                    child: _buildChurchImage(imagePath),
                  );
                }).toList(),
              ),
            ),
            // Modern photo indicators (outside carousel to avoid Positioned error)
            if (_currentChurch.images.length > 1)
              Padding(
                padding: const EdgeInsets.only(top: 12, bottom: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: _currentChurch.images.asMap().entries.map((entry) {
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
              _currentChurch.foundingYear?.toString() ?? 'Unknown',
            ),
            const SizedBox(height: 16),
            _buildModernInfoRow(
              Icons.architecture_outlined,
              'Architectural Style',
              _currentChurch.architecturalStyle.label,
            ),
            const SizedBox(height: 16),
            _buildModernInfoRow(
              Icons.location_on_outlined,
              'Diocese',
              _currentChurch.diocese,
            ),
            if (_currentChurch.feastDay != null &&
                _currentChurch.feastDay!.isNotEmpty) ...[
              const SizedBox(height: 16),
              _buildModernInfoRow(
                Icons.celebration_outlined,
                'Feast Day',
                _currentChurch.feastDay!,
              ),
            ],
            if (_currentChurch.isHeritage) ...[
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
        _currentChurch.heritageClassification == HeritageClassification.icp;
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
                  _currentChurch.heritageClassification.label,
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
      delegate: _TabBarDelegate(
        child: Container(
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
                Tab(text: 'Feedback'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Modern Floating Action Button with scroll-aware visibility
  Widget _buildMarkVisitedFAB(BuildContext context) {
    return AnimatedSlide(
      duration: const Duration(milliseconds: 200),
      offset: _showFAB ? Offset.zero : const Offset(0, 2),
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 200),
        opacity: _showFAB ? 1.0 : 0.0,
        child: Consumer<AppState>(
          builder: (context, state, _) {
            final visited = state.isVisited(_currentChurch);

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
                  : Icon(
                      visited ? Icons.check_circle : Icons.check_circle_outline,
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
        ),
      ),
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

    // Navigate to MapScreen with the selected church in single church mode
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => MapScreen(
          selectedChurch: church,
          singleChurchMode: true,
        ),
      ),
    );
  }

  /// Check if the church has 360° tour available
  bool _has360Tour() {
    return _currentChurch.hasVirtualTour;
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
    if (state.isVisited(_currentChurch)) {
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
        _currentChurch,
        position,
      );

      if (!context.mounted) return;

      if (validationResult.isValid) {
        // Success - church marked as visited
        // Note: ProfileService sync is handled automatically in AppState.markVisitedWithValidation

        if (!context.mounted) return;

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(
                  child: Text('${_currentChurch.name} marked as visited!'),
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
                  'You are ${distanceInMeters}m away. You need to be within 200m to mark as visited.',
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

/// Custom delegate for pinned TabBar in NestedScrollView
class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  final Widget child;

  _TabBarDelegate({required this.child});

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
    return child;
  }

  @override
  bool shouldRebuild(_TabBarDelegate oldDelegate) {
    return false;
  }
}
