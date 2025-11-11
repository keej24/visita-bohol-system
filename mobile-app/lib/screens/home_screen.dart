/// FILE PURPOSE: Home Screen - Main User Interface
///
/// This is the primary screen users see when they open the VISITA mobile app.
/// It provides a comprehensive browsing experience for discovering Bohol's churches.
///
/// KEY RESPONSIBILITIES:
/// - Display list of approved churches
/// - Show diocese-wide announcements in carousel
/// - Provide search and filtering capabilities
/// - Support both list and grid view layouts
/// - Calculate and display distance to churches
/// - Handle pull-to-refresh for data updates
/// - Manage advanced filter bottom sheet
/// - Navigate to church detail screens
///
/// INTEGRATION POINTS:
/// - Fetches churches from ChurchRepository
/// - Fetches announcements from AnnouncementRepository
/// - Uses LocationService for distance calculations
/// - Integrates with ProfileService for user avatar
/// - Connects to FilterState for filter persistence
/// - Uses PaginatedChurchService for advanced filters
///
/// TECHNICAL CONCEPTS:
/// - StatefulWidget: Screen with mutable state
/// - CustomScrollView: Advanced scrolling with slivers
/// - SliverAppBar: Collapsible header with parallax effect
/// - Provider Pattern: Access services via context
/// - Debouncing: Delay search to reduce queries
/// - Pull-to-Refresh: User-initiated data reload
/// - Bottom Sheet: Modal filter interface
/// - Grid/List Toggle: Different view modes
///
/// USER EXPERIENCE:
/// - Hero header with branding
/// - Announcement carousel for important updates
/// - Quick filters (search, diocese, heritage)
/// - Advanced filters (year range, styles, classifications)
/// - Distance-based sorting (when location enabled)
/// - Smooth animations and transitions
///
/// PERFORMANCE OPTIMIZATIONS:
/// - Search debouncing (300ms delay)
/// - Filter state persistence (SharedPreferences)
/// - Cached network images
/// - Lazy loading (only render visible items)
///
/// WHY IMPORTANT:
/// - Primary user interaction point
/// - First impression of the app
/// - Drives discovery and engagement
/// - Gateway to all churches

import 'package:flutter/material.dart';
// Other screens for navigation
import 'map_screen.dart';
import 'profile_screen.dart';
import 'announcements_screen.dart';
// Data models
import '../models/announcement.dart';
import '../models/church.dart';
import '../models/church_filter.dart';
import '../models/enums.dart';
// Data access
import '../repositories/church_repository.dart';
import '../repositories/announcement_repository.dart';
// Services for business logic
import '../services/paginated_church_service.dart';
import '../services/profile_service.dart';
import '../services/location_service.dart';
// Persistence
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';
// Navigation
import 'church_detail_screen.dart';
// Async utilities
import 'dart:async';
// Reusable widgets
import '../widgets/async_content.dart';
import '../widgets/home/hero_header.dart';
import '../widgets/home/filter_bar.dart';
import '../widgets/home/announcement_carousel.dart';
import '../widgets/home/church_card.dart';
import '../models/filter_state.dart';
import '../theme/header_palette.dart';
// State management
import 'package:provider/provider.dart';
// Image caching
import 'package:cached_network_image/cached_network_image.dart';

/// =============================================================================
/// HOME ANNOUNCEMENTS TAB - Main Content Tab
/// =============================================================================
///
/// This is the first tab in the bottom navigation, showing the main home screen
/// with announcements carousel and church listings.
///
/// STATE MANAGEMENT:
/// - _filterState: Persistent filter configuration
/// - _allChurches: Complete list of churches (unfiltered)
/// - _filteredChurches: Churches matching current filters
/// - _searchDebounce: Timer for search input delay
/// - _useEnhancedSearch: Whether to use advanced filter results
/// - _isGridView: Toggle between list and grid layout
///
/// LIFECYCLE:
/// 1. initState: Load filter state, fetch churches
/// 2. User interaction: Update filters, refresh data
/// 3. dispose: Clean up resources (timers, listeners)
class HomeAnnouncementsTab extends StatefulWidget {
  const HomeAnnouncementsTab({super.key});

  @override
  State<HomeAnnouncementsTab> createState() => _HomeAnnouncementsTabState();
}

class _HomeAnnouncementsTabState extends State<HomeAnnouncementsTab> {
  late final FilterState _filterState; // Manages filter state
  List<Church> _allChurches = []; // All churches from database
  List<Church> _filteredChurches = []; // Filtered subset to display
  Timer? _searchDebounce; // Prevents excessive search queries
  bool _useEnhancedSearch = false; // Use advanced vs basic filters
  bool _isGridView = false; // List (false) or grid (true) layout
  final ScrollController _scrollController =
      ScrollController(); // For scroll events

  /// =============================================================================
  /// INITIALIZATION
  /// =============================================================================
  ///
  /// Sets up the screen when it first loads.
  ///
  /// STEPS:
  /// 1. Create FilterState instance for managing filters
  /// 2. Add listener to rebuild UI when filters change
  /// 3. Load saved filter preferences from storage
  /// 4. Fetch churches from repository
  ///
  /// WHY LISTENER:
  /// - Automatically updates UI when user changes filters
  /// - Keeps display in sync with filter state
  /// - Avoids manual setState calls throughout code
  @override
  void initState() {
    super.initState();
    _filterState = FilterState(); // Initialize filter state
    _filterState.addListener(_onFilterChanged); // Listen for changes
    _filterState
        .load()
        .then((_) => _loadChurches()); // Load saved filters, then churches

    // Initialize enhanced church service - DISABLED: using Firestore instead
    // WidgetsBinding.instance.addPostFrameCallback((_) {
    //   final enhancedService = context.read<EnhancedChurchService>();
    //   enhancedService.initialize();
    // });
  }

  void _onFilterChanged() {
    _applyFilter();
  }

  /// =============================================================================
  /// LOAD CHURCHES FROM REPOSITORY
  /// =============================================================================
  ///
  /// Fetches all approved churches from the data source.
  ///
  /// PROCESS:
  /// 1. Get ChurchRepository from Provider
  /// 2. Call getAll() to fetch approved churches
  /// 3. Update state with churches
  /// 4. Apply current filters to show relevant subset
  ///
  /// ERROR HANDLING:
  /// - Catches network/database errors
  /// - Logs error but doesn't crash
  /// - User sees empty list if error occurs
  ///
  /// MOUNTED CHECK:
  /// - Prevents setState on unmounted widget
  /// - Common issue with async operations
  void _loadChurches() async {
    try {
      assert(() {
        debugPrint('🏠 HomeScreen loading churches...');
        return true;
      }());
      final churchRepo = context.read<ChurchRepository>(); // Get repository
      final churches = await churchRepo.getAll(); // Fetch data
      assert(() {
        debugPrint('🏠 HomeScreen received ${churches.length} churches');
        return true;
      }());
      if (!mounted) return; // Don't update if widget destroyed
      setState(() {
        _allChurches = churches; // Store all churches
        _applyFilter(); // Filter and display
      });
    } catch (e) {
      debugPrint('Error loading churches: $e');
    }
  }

  Future<void> _refreshChurches() async {
    debugPrint('🔄 Refreshing churches from Firestore...');
    try {
      // Refresh data using PaginatedChurchService if available
      final churchService = context.read<PaginatedChurchService>();
      await churchService.refresh();

      // Reload churches
      _loadChurches();

      debugPrint('✅ Churches refreshed successfully');
    } catch (e) {
      debugPrint('❌ Error refreshing churches: $e');
    }
  }

  void _applyFilter() {
    final criteria = _filterState.criteria;
    setState(() {
      _filteredChurches = applyChurchFilter(_allChurches, criteria);
    });
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _filterState.removeListener(_onFilterChanged);
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _filterState,
      builder: (context, _) {
        final criteria = _filterState.criteria;
        return RefreshIndicator(
          onRefresh: _refreshChurches,
          color: const Color(0xFF2C5F2D),
          child: CustomScrollView(
            slivers: [
              SliverAppBar(
                pinned: true,
                expandedHeight: 200,
                automaticallyImplyLeading: false,
                flexibleSpace: const FlexibleSpaceBar(
                  background: HeroHeader(),
                ),
                backgroundColor: HeaderColors.home,
                elevation: 0,
                actions: [
                  // Profile Avatar Button
                  Padding(
                    padding: const EdgeInsets.only(right: 16, top: 8),
                    child: _ProfileAvatarButton(),
                  ),
                ],
                bottom: PreferredSize(
                  preferredSize: const Size.fromHeight(1),
                  child: Container(height: 1, color: HeaderColors.divider),
                ),
              ),
              SliverPadding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8),
                sliver: SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      FutureBuilder<List<Announcement>>(
                        future: context.read<AnnouncementRepository>().getAll(),
                        builder: (context, snap) {
                          return AsyncContent<List<Announcement>>(
                            snapshot: snap,
                            emptyMessage: 'No current announcements',
                            onRetry: () => setState(() {}),
                            builder: (data) {
                              // Show active, upcoming, or ongoing diocese announcements (exclude archived and past)
                              final dioceseAnns = data
                                  .where((a) =>
                                      a.scope == 'diocese' &&
                                      !a.isArchived &&
                                      (a.isUpcoming || a.isOngoing || a.status == 'Active'))
                                  .toList();

                              // Sort by most recent: use createdAt for active announcements, dateTime for events
                              dioceseAnns.sort((a, b) {
                                final aDate = a.dateTime ?? a.createdAt ?? DateTime.now();
                                final bDate = b.dateTime ?? b.createdAt ?? DateTime.now();
                                return bDate.compareTo(aDate); // Most recent first
                              });

                              return AnnouncementCarousel(
                                announcements: dioceseAnns,
                                formatDate: _formatDate,
                              );
                            },
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
              const SliverPadding(
                padding: EdgeInsets.fromLTRB(16, 24, 16, 0),
                sliver: SliverToBoxAdapter(
                  child: _ModernSectionHeader(
                      icon: Icons.church_outlined,
                      title: 'Bohol Churches',
                      subtitle: 'Discover Bohol\'s spiritual treasures'),
                ),
              ),
              // View toggle and advanced filter button
              _buildViewToggleAndFilterButton(),
              // Active advanced filters indicator
              _buildAdvancedFiltersIndicator(),
              // Search mode toggle
              _buildSearchModeToggle(),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                  child: FilterBar(
                    search: criteria.search,
                    diocese: criteria.diocese,
                    heritageOnly: criteria.heritageOnly,
                    onSearchChanged: (v) {
                      _searchDebounce?.cancel();
                      _searchDebounce =
                          Timer(const Duration(milliseconds: 300), () {
                        _filterState.setSearch(v);
                      });
                    },
                    onDioceseChanged: _filterState.setDiocese,
                    onHeritageOnlyChanged: (_) => _filterState.toggleHeritage(),
                  ),
                ),
              ),
              // Churches list
              _buildChurchList(),
              // Enhanced search status
              _buildEnhancedSearchStatus(),
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],
          ),
        );
      },
    );
  }

  String _formatDate(DateTime d) => '${d.month}/${d.day}/${d.year}';

  Widget _buildChurchList() {
    // Make PaginatedChurchService optional to avoid crashes when not provided (e.g., tests)
    PaginatedChurchService? enhancedService;
    try {
      enhancedService =
          Provider.of<PaginatedChurchService>(context, listen: true);
    } catch (_) {
      enhancedService = null;
    }
    final hasActive = enhancedService?.currentFilter.hasActiveFilters ?? false;
    final useEnhanced = _useEnhancedSearch && hasActive;
    final churches = useEnhanced
        ? (enhancedService?.filteredChurches ?? const <Church>[])
        : _filteredChurches;

    if (churches.isEmpty) {
      return SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 40),
          child: Center(
            child: Column(
              children: [
                Text(useEnhanced
                    ? 'No churches match your advanced filters'
                    : 'No churches found'),
                if (useEnhanced) ...[
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: enhancedService != null
                        ? () {
                            enhancedService?.resetFilters();
                          }
                        : null,
                    child: const Text('Clear filters'),
                  ),
                ],
              ],
            ),
          ),
        ),
      );
    }

    // Grid view
    if (_isGridView) {
      return SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        sliver: SliverGrid(
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            childAspectRatio: 0.75,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
          ),
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final church = churches[index];
              return _buildChurchGridItem(church);
            },
            childCount: churches.length,
          ),
        ),
      );
    }

    // List view
    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final church = churches[index];
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: ChurchCard(
              church: church,
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ChurchDetailScreen(church: church),
                  ),
                );
              },
              showDistance: _shouldShowDistance(),
              distance: _getChurchDistance(church),
            ),
          );
        },
        childCount: churches.length,
      ),
    );
  }

  Widget _buildChurchGridItem(Church church) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1F1F1F) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 3,
            child: InkWell(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ChurchDetailScreen(church: church),
                  ),
                );
              },
              child: Container(
                decoration: BoxDecoration(
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(16)),
                  image: church.images.isNotEmpty
                      ? DecorationImage(
                          image: (church.images.first.startsWith('http://') ||
                                  church.images.first.startsWith('https://'))
                              ? NetworkImage(church.images.first)
                              : AssetImage(church.images.first)
                                  as ImageProvider,
                          fit: BoxFit.cover,
                        )
                      : null,
                  color: Colors.grey[300],
                ),
                child: church.images.isEmpty
                    ? const Icon(Icons.church, size: 40, color: Colors.grey)
                    : null,
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    church.name,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    church.location,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.white70 : Colors.grey[600],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (_shouldShowDistance()) ...[
                    const SizedBox(height: 4),
                    Text(
                      '${_getChurchDistance(church)?.toStringAsFixed(1) ?? '?'} km away',
                      style: TextStyle(
                        fontSize: 11,
                        color: Theme.of(context).primaryColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildViewToggleAndFilterButton() {
    PaginatedChurchService? enhancedService;
    try {
      enhancedService =
          Provider.of<PaginatedChurchService>(context, listen: true);
    } catch (_) {
      enhancedService = null;
    }
    final churches = _useEnhancedSearch &&
            (enhancedService?.currentFilter.hasActiveFilters ?? false)
        ? (enhancedService?.filteredChurches ?? const <Church>[])
        : _filteredChurches;

    return SliverToBoxAdapter(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '${churches.length} churches found',
              style: TextStyle(
                color: Colors.grey[600],
                fontWeight: FontWeight.w500,
              ),
            ),
            Row(
              children: [
                // Advanced Filter Button with badge
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    OutlinedButton.icon(
                      onPressed: () => _showAdvancedFilterBottomSheet(),
                      icon: const Icon(Icons.tune, size: 18),
                      label: const Text('Filters'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                        visualDensity: VisualDensity.compact,
                        backgroundColor:
                            _filterState.criteria.hasActiveAdvancedFilters
                                ? Theme.of(context)
                                    .primaryColor
                                    .withValues(alpha: 0.1)
                                : null,
                        foregroundColor:
                            _filterState.criteria.hasActiveAdvancedFilters
                                ? Theme.of(context).primaryColor
                                : null,
                      ),
                    ),
                    if (_filterState.criteria.hasActiveAdvancedFilters)
                      Positioned(
                        right: -4,
                        top: -4,
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: Theme.of(context).primaryColor,
                            shape: BoxShape.circle,
                          ),
                          constraints: const BoxConstraints(
                            minWidth: 18,
                            minHeight: 18,
                          ),
                          child: Center(
                            child: Text(
                              '${_filterState.criteria.advancedFilterCount}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(width: 8),
                // View toggle
                IconButton(
                  icon: Icon(
                    Icons.view_list,
                    color: !_isGridView
                        ? Theme.of(context).primaryColor
                        : Colors.grey,
                  ),
                  onPressed: () => setState(() => _isGridView = false),
                ),
                IconButton(
                  icon: Icon(
                    Icons.grid_view,
                    color: _isGridView
                        ? Theme.of(context).primaryColor
                        : Colors.grey,
                  ),
                  onPressed: () => setState(() => _isGridView = true),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  bool _shouldShowDistance() {
    try {
      final locationService = context.read<LocationService>();
      return locationService.currentPosition != null;
    } catch (_) {
      return false;
    }
  }

  double? _getChurchDistance(Church church) {
    try {
      final locationService = context.read<LocationService>();
      final position = locationService.currentPosition;
      if (position == null) return null;
      return church.distanceFrom(position.latitude, position.longitude);
    } catch (_) {
      return null;
    }
  }

  Widget _buildAdvancedFiltersIndicator() {
    final criteria = _filterState.criteria;

    if (!criteria.hasActiveAdvancedFilters) {
      return const SliverToBoxAdapter(child: SizedBox.shrink());
    }

    List<String> activeFilters = [];
    if (criteria.foundingYearRange != null) {
      activeFilters.add(
          'Years: ${criteria.foundingYearRange!.start.round()}-${criteria.foundingYearRange!.end.round()}');
    }
    if (criteria.architecturalStyles.isNotEmpty) {
      activeFilters.add('Styles: ${criteria.architecturalStyles.length}');
    }
    if (criteria.heritageClassifications.isNotEmpty) {
      activeFilters.add('Heritage: ${criteria.heritageClassifications.length}');
    }
    if (criteria.dioceses.isNotEmpty) {
      activeFilters.add('Dioceses: ${criteria.dioceses.length}');
    }

    return SliverToBoxAdapter(
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF2563EB).withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: const Color(0xFF2563EB).withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.filter_list,
              size: 16,
              color: Color(0xFF2563EB),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  for (final filter in activeFilters)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: const Color(0xFF2563EB).withValues(alpha: 0.3),
                        ),
                      ),
                      child: Text(
                        filter,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF2563EB),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            InkWell(
              onTap: () {
                _filterState.resetAdvancedFilters();
              },
              child: Container(
                padding: const EdgeInsets.all(4),
                child: const Icon(
                  Icons.close,
                  size: 16,
                  color: Color(0xFF2563EB),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showAdvancedFilterBottomSheet() {
    final criteria = _filterState.criteria;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _AdvancedFilterBottomSheet(
        allChurches: _allChurches,
        // Pass existing filter values
        initialYearRange: criteria.foundingYearRange,
        initialArchitecturalStyles: criteria.architecturalStyles,
        initialHeritageClassifications: criteria.heritageClassifications,
        initialReligiousClassifications: criteria.religiousClassifications,
        initialDioceses: criteria.dioceses,
        onApplyFilters: (foundingYearRange, architecturalStyles,
            heritageClassifications, religiousClassifications, dioceses) {
          // Update filter state instead of directly modifying _filteredChurches
          _filterState.setAdvancedFilters(
            foundingYearRange: foundingYearRange,
            architecturalStyles: architecturalStyles,
            heritageClassifications: heritageClassifications,
            religiousClassifications: religiousClassifications,
            dioceses: dioceses,
          );
          // Filter will be automatically applied via listener
        },
        onResetFilters: () {
          _filterState.resetAdvancedFilters();
        },
      ),
    );
  }

  Widget _buildSearchModeToggle() {
    PaginatedChurchService? enhancedService;
    try {
      enhancedService =
          Provider.of<PaginatedChurchService>(context, listen: true);
    } catch (_) {
      enhancedService = null;
    }
    final hasActiveFilters =
        enhancedService?.currentFilter.hasActiveFilters ?? false;

    if (!hasActiveFilters) {
      return const SliverToBoxAdapter(child: SizedBox.shrink());
    }

    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: [
            Icon(
              Icons.tune,
              size: 16,
              color: Colors.grey[600],
            ),
            const SizedBox(width: 8),
            Text(
              'Advanced filters active',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
                fontWeight: FontWeight.w500,
              ),
            ),
            const Spacer(),
            Switch.adaptive(
              value: _useEnhancedSearch,
              onChanged: (value) {
                setState(() {
                  _useEnhancedSearch = value;
                });
              },
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            const SizedBox(width: 4),
            Text(
              'Show results',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEnhancedSearchStatus() {
    PaginatedChurchService? enhancedService;
    try {
      enhancedService =
          Provider.of<PaginatedChurchService>(context, listen: true);
    } catch (_) {
      enhancedService = null;
    }
    final filter = enhancedService?.currentFilter;

    if (filter == null || !filter.hasActiveFilters) {
      return const SliverToBoxAdapter(child: SizedBox.shrink());
    }

    return SliverToBoxAdapter(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF2563EB).withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: const Color(0xFF2563EB).withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          children: [
            const Icon(
              Icons.filter_list,
              size: 16,
              color: Color(0xFF2563EB),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                '${filter.activeFilterCount} advanced filter(s) active',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF2563EB),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ModernSectionHeader extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  const _ModernSectionHeader(
      {required this.icon, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Theme.of(context).colorScheme.primary,
                    Theme.of(context)
                        .colorScheme
                        .primary
                        .withValues(alpha: 0.7),
                  ],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF1F2937),
                          letterSpacing: -0.5,
                        ),
                  ),
                  Text(
                    subtitle,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: const Color(0xFF6B7280),
                          fontWeight: FontWeight.w500,
                        ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
}

// Advanced Filter Bottom Sheet Widget
class _AdvancedFilterBottomSheet extends StatefulWidget {
  final List<Church> allChurches;
  final RangeValues? initialYearRange;
  final Set<ArchitecturalStyle> initialArchitecturalStyles;
  final Set<HeritageClassification> initialHeritageClassifications;
  final Set<ReligiousClassification> initialReligiousClassifications;
  final Set<Diocese> initialDioceses;
  final Function(
      RangeValues?,
      Set<ArchitecturalStyle>,
      Set<HeritageClassification>,
      Set<ReligiousClassification>,
      Set<Diocese>) onApplyFilters;
  final VoidCallback onResetFilters;

  const _AdvancedFilterBottomSheet({
    required this.allChurches,
    this.initialYearRange,
    this.initialArchitecturalStyles = const {},
    this.initialHeritageClassifications = const {},
    this.initialReligiousClassifications = const {},
    this.initialDioceses = const {},
    required this.onApplyFilters,
    required this.onResetFilters,
  });

  @override
  State<_AdvancedFilterBottomSheet> createState() =>
      _AdvancedFilterBottomSheetState();
}

class _AdvancedFilterBottomSheetState
    extends State<_AdvancedFilterBottomSheet> {
  RangeValues? _yearRange;
  late Set<ArchitecturalStyle> _architecturalStyles;
  late Set<HeritageClassification> _heritageClassifications;
  late Set<ReligiousClassification> _religiousClassifications;
  late Set<Diocese> _dioceses;
  late RangeValues _availableYearRange;

  @override
  void initState() {
    super.initState();
    // Initialize with passed values
    _yearRange = widget.initialYearRange;
    _architecturalStyles = Set.from(widget.initialArchitecturalStyles);
    _heritageClassifications = Set.from(widget.initialHeritageClassifications);
    _religiousClassifications =
        Set.from(widget.initialReligiousClassifications);
    _dioceses = Set.from(widget.initialDioceses);
    _calculateAvailableYearRange();
  }

  void _calculateAvailableYearRange() {
    final years = widget.allChurches
        .where((c) => c.foundingYear != null)
        .map((c) => c.foundingYear!)
        .toList();

    if (years.isEmpty) {
      _availableYearRange = const RangeValues(1500, 2024);
    } else {
      years.sort();
      _availableYearRange = RangeValues(
        years.first.toDouble(),
        years.last.toDouble(),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      maxChildSize: 0.9,
      minChildSize: 0.5,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1F1F1F) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              _buildHandle(),
              _buildHeader(),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(20),
                  children: [
                    _buildFoundingYearFilter(),
                    const SizedBox(height: 24),
                    _buildArchitecturalStyleFilter(),
                    const SizedBox(height: 24),
                    _buildHeritageClassificationFilter(),
                    const SizedBox(height: 24),
                    _buildReligiousClassificationFilter(),
                    const SizedBox(height: 24),
                    _buildDioceseFilter(),
                    const SizedBox(height: 80), // Space for buttons
                  ],
                ),
              ),
              _buildBottomActions(),
            ],
          ),
        );
      },
    );
  }

  Widget _buildHandle() {
    return Container(
      width: 40,
      height: 4,
      margin: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: Colors.grey[300],
        borderRadius: BorderRadius.circular(2),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          Text(
            'Advanced Filters',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: Theme.of(context).brightness == Brightness.dark
                  ? Colors.white
                  : Colors.black87,
            ),
          ),
          const Spacer(),
          TextButton(
            onPressed: () {
              setState(() {
                _yearRange = null;
                _architecturalStyles.clear();
                _heritageClassifications.clear();
                _religiousClassifications.clear();
                _dioceses.clear();
              });
              // Apply the reset immediately
              widget.onResetFilters();
            },
            child: const Text('Reset All'),
          ),
        ],
      ),
    );
  }

  Widget _buildFoundingYearFilter() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Founding Year',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.white
                : Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        RangeSlider(
          values: _yearRange ?? _availableYearRange,
          min: _availableYearRange.start,
          max: _availableYearRange.end,
          divisions:
              (_availableYearRange.end - _availableYearRange.start).round() > 0
                  ? (_availableYearRange.end - _availableYearRange.start)
                      .round()
                  : null,
          labels: RangeLabels(
            (_yearRange?.start ?? _availableYearRange.start).round().toString(),
            (_yearRange?.end ?? _availableYearRange.end).round().toString(),
          ),
          onChanged: (values) {
            setState(() {
              _yearRange = values;
            });
          },
        ),
        Text(
          'From ${(_yearRange?.start ?? _availableYearRange.start).round()} to ${(_yearRange?.end ?? _availableYearRange.end).round()}',
          style: TextStyle(
            fontSize: 14,
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.white70
                : Colors.grey[600],
          ),
        ),
      ],
    );
  }

  Widget _buildArchitecturalStyleFilter() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Architectural Style',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.white
                : Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: ArchitecturalStyle.values.map((style) {
            final isSelected = _architecturalStyles.contains(style);
            return FilterChip(
              label: Text(style.label),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  if (selected) {
                    _architecturalStyles.add(style);
                  } else {
                    _architecturalStyles.remove(style);
                  }
                });
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildHeritageClassificationFilter() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Heritage Classification',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.white
                : Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: HeritageClassification.values.map((classification) {
            final isSelected =
                _heritageClassifications.contains(classification);
            return FilterChip(
              label: Text(classification.shortLabel),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  if (selected) {
                    _heritageClassifications.add(classification);
                  } else {
                    _heritageClassifications.remove(classification);
                  }
                });
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildReligiousClassificationFilter() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Religious Classification',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.white
                : Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: ReligiousClassification.values.map((classification) {
            final isSelected =
                _religiousClassifications.contains(classification);
            return FilterChip(
              label: Text(classification.label),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  if (selected) {
                    _religiousClassifications.add(classification);
                  } else {
                    _religiousClassifications.remove(classification);
                  }
                });
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildDioceseFilter() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Diocese',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.white
                : Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: Diocese.values.map((diocese) {
            final isSelected = _dioceses.contains(diocese);
            return FilterChip(
              label: Text(diocese.label),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  if (selected) {
                    _dioceses.add(diocese);
                  } else {
                    _dioceses.remove(diocese);
                  }
                });
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildBottomActions() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(
            color: Theme.of(context).brightness == Brightness.dark
                ? const Color(0xFF2A2A2A)
                : Colors.grey[200]!,
          ),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () => Navigator.pop(context),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: const Text('Cancel'),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: ElevatedButton(
              onPressed: () {
                widget.onApplyFilters(
                  _yearRange,
                  _architecturalStyles,
                  _heritageClassifications,
                  _religiousClassifications,
                  _dioceses,
                );
                Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: const Text('Apply Filters'),
            ),
          ),
        ],
      ),
    );
  }
}

// Profile Avatar Button Widget
class _ProfileAvatarButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<ProfileService>(
      builder: (context, profileService, child) {
        final userProfile = profileService.userProfile;
        if (userProfile == null) {
          // Show loading indicator while profile is loading
          return Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            child: const CircularProgressIndicator(strokeWidth: 2),
          );
        }
        final displayName = userProfile.displayName;
        final profileImageUrl = userProfile.profileImageUrl;
        final hasImage = profileImageUrl != null && profileImageUrl.isNotEmpty;

        return GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => const ProfileScreen(),
              ),
            );
          },
          child: Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF2563EB).withOpacity(0.3),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
              border: Border.all(
                color: Colors.white,
                width: 2,
              ),
            ),
            child: ClipOval(
              child: hasImage
                  ? CachedNetworkImage(
                      imageUrl: profileImageUrl,
                      width: 40,
                      height: 40,
                      fit: BoxFit.cover,
                      placeholder: (context, url) =>
                          _buildInitialsAvatar(displayName),
                      errorWidget: (context, url, error) =>
                          _buildInitialsAvatar(displayName),
                    )
                  : _buildInitialsAvatar(displayName),
            ),
          ),
        );
      },
    );
  }

  Widget _buildInitialsAvatar(String displayName) {
    final initials = displayName.isNotEmpty
        ? displayName.split(' ').take(2).map((e) => e[0]).join().toUpperCase()
        : 'U';

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Color(0xFF2563EB),
            Color(0xFF1D4ED8),
          ],
        ),
      ),
      child: Center(
        child: Text(
          initials,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;
  @override
  void initState() {
    super.initState();
    _loadLastTab();
    // Trigger profile loading on home screen startup
    Future.microtask(() {
      final profileService =
          Provider.of<ProfileService>(context, listen: false);
      if (profileService.userProfile == null && !profileService.isLoading) {
        profileService.loadUserProfile();
      }
    });
  }

  Future<void> _loadLastTab() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final idx = prefs.getInt(AppConstants.lastTabIndex) ?? 0;
      if (mounted) setState(() => _selectedIndex = idx.clamp(0, 2));
    } catch (_) {}
  }

  final List<Widget> _screens = const [
    HomeAnnouncementsTab(), // Home screen with VISITA header and announcement carousel
    MapScreen(),
    AnnouncementsScreen(),
  ];

  void _onTap(int idx) async {
    setState(() => _selectedIndex = idx);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(AppConstants.lastTabIndex, idx);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: _screens[_selectedIndex],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _selectedIndex,
          onTap: _onTap,
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.white,
          selectedItemColor: const Color(0xFF2563EB),
          unselectedItemColor: const Color(0xFF6B7280),
          selectedLabelStyle: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 12,
          ),
          unselectedLabelStyle: const TextStyle(
            fontWeight: FontWeight.w500,
            fontSize: 12,
          ),
          items: [
            BottomNavigationBarItem(
              icon: _NavIcon(
                icon: Icons.home_outlined,
                activeIcon: Icons.home,
                isActive: _selectedIndex == 0,
              ),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: _NavIcon(
                icon: Icons.map_outlined,
                activeIcon: Icons.map,
                isActive: _selectedIndex == 1,
              ),
              label: 'Map',
            ),
            BottomNavigationBarItem(
              icon: _NavIcon(
                icon: Icons.campaign_outlined,
                activeIcon: Icons.campaign,
                isActive: _selectedIndex == 2,
              ),
              label: 'Announcements',
            ),
          ],
        ),
      ),
      floatingActionButton: null,
    );
  }
}

class _NavIcon extends StatelessWidget {
  final IconData icon;
  final IconData activeIcon;
  final bool isActive;

  const _NavIcon({
    required this.icon,
    required this.activeIcon,
    required this.isActive,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: isActive
            ? const Color(0xFF2563EB).withValues(alpha: 0.12)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(
        isActive ? activeIcon : icon,
        size: 24,
      ),
    );
  }
}
