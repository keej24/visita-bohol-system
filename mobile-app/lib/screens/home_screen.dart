import 'package:flutter/material.dart';
import 'map_screen.dart';
import 'profile_screen.dart';
import 'announcements_screen.dart';
import 'enhanced_church_exploration_screen.dart';
import '../models/announcement.dart';
import '../models/church.dart';
import '../models/church_filter.dart';
import '../repositories/church_repository.dart';
import '../repositories/announcement_repository.dart';
import '../services/enhanced_church_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../util/constants.dart';
import 'church_detail_screen.dart';
import 'dart:async';
import '../widgets/async_content.dart';
import '../widgets/home/hero_header.dart';
import '../widgets/home/stats_row.dart';
import '../widgets/home/filter_bar.dart';
import '../widgets/home/announcement_carousel.dart';
import '../widgets/home/church_card.dart';
import '../models/filter_state.dart';
import '../theme/header_palette.dart';
import 'package:provider/provider.dart';
import '../widgets/public_user_profile_bar.dart';

// Top-level widget for announcements tab
class HomeAnnouncementsTab extends StatefulWidget {
  const HomeAnnouncementsTab({Key? key}) : super(key: key);

  @override
  State<HomeAnnouncementsTab> createState() => _HomeAnnouncementsTabState();
}

class _HomeAnnouncementsTabState extends State<HomeAnnouncementsTab> {
  late final FilterState _filterState;
  List<Church> _allChurches = [];
  List<Church> _filteredChurches = [];
  Timer? _searchDebounce;
  bool _useEnhancedSearch = false;

  @override
  void initState() {
    super.initState();
    _filterState = FilterState();
    _filterState.addListener(_onFilterChanged);
    _filterState.load().then((_) => _loadChurches());

    // Initialize enhanced church service
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final enhancedService = context.read<EnhancedChurchService>();
      enhancedService.initialize();
    });
  }

  void _onFilterChanged() {
    _applyFilter();
  }

  void _loadChurches() async {
    try {
      assert(() {
        debugPrint('🏠 HomeScreen loading churches...');
        return true;
      }());
      final churchRepo = context.read<ChurchRepository>();
      final churches = await churchRepo.getAll();
      assert(() {
        debugPrint('🏠 HomeScreen received ${churches.length} churches');
        return true;
      }());
      if (!mounted) return;
      setState(() {
        _allChurches = churches;
        _applyFilter();
      });
    } catch (e) {
      debugPrint('Error loading churches: $e');
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
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _filterState,
      builder: (context, _) {
        final criteria = _filterState.criteria;
        return CustomScrollView(
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
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(1),
                child: Container(height: 1, color: HeaderColors.divider),
              ),
            ),
            // Public User Profile Bar
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: PublicUserProfileBar(),
              ),
            ),
            const SliverToBoxAdapter(
              child: StatsRow(),
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
                            final now = DateTime.now();
                            final dioceseAnns = data
                                .where((a) =>
                                    a.scope == 'diocese' &&
                                    a.dateTime.isAfter(now))
                                .toList();
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
                    title: 'Heritage Churches',
                    subtitle: 'Discover Bohol\'s spiritual treasures'),
              ),
            ),
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
                  onAdvancedSearchTap: () {
                    // Transfer current search to enhanced search
                    _navigateToEnhancedSearch(criteria.search);
                  },
                ),
              ),
            ),
            // Churches list
            _buildChurchList(),
            // Enhanced search status
            _buildEnhancedSearchStatus(),
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
          ],
        );
      },
    );
  }

  String _formatDate(DateTime d) => '${d.day}/${d.month}/${d.year}';

  void _navigateToEnhancedSearch(String currentSearch) {
    // Navigate to enhanced search with current search query pre-filled
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const EnhancedChurchExplorationScreen(),
      ),
    ).then((_) {
      // Optionally refresh results when coming back
      _loadChurches();
    });

    // Pre-fill the search in enhanced search if we have access to the service
    if (currentSearch.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final enhancedService = context.read<EnhancedChurchService>();
        enhancedService.searchChurches(currentSearch);
      });
    }
  }

  Widget _buildChurchList() {
    return Consumer<EnhancedChurchService>(
      builder: (context, enhancedService, child) {
        final useEnhanced = _useEnhancedSearch &&
            enhancedService.currentFilter.hasActiveFilters;
        final churches =
            useEnhanced ? enhancedService.filteredChurches : _filteredChurches;

        return SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              if (churches.isEmpty) {
                return Padding(
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
                            onPressed: () {
                              enhancedService.resetFilters();
                            },
                            child: const Text('Clear filters'),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              }
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
                ),
              );
            },
            childCount: churches.isEmpty ? 1 : churches.length,
          ),
        );
      },
    );
  }

  Widget _buildSearchModeToggle() {
    return Consumer<EnhancedChurchService>(
      builder: (context, enhancedService, child) {
        final hasActiveFilters = enhancedService.currentFilter.hasActiveFilters;

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
      },
    );
  }

  Widget _buildEnhancedSearchStatus() {
    return Consumer<EnhancedChurchService>(
      builder: (context, enhancedService, child) {
        final filter = enhancedService.currentFilter;

        if (!filter.hasActiveFilters) {
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
                TextButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) =>
                            const EnhancedChurchExplorationScreen(),
                      ),
                    );
                  },
                  child: const Text(
                    'Manage',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
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

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;
  @override
  void initState() {
    super.initState();
    _loadLastTab();
  }

  Future<void> _loadLastTab() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final idx = prefs.getInt(AppConstants.lastTabIndex) ?? 0;
      if (mounted) setState(() => _selectedIndex = idx.clamp(0, 3));
    } catch (_) {}
  }

  final List<Widget> _screens = const [
    HomeAnnouncementsTab(),
    MapScreen(),
    AnnouncementsScreen(),
    ProfileScreen(),
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
            BottomNavigationBarItem(
              icon: _NavIcon(
                icon: Icons.person_outline,
                activeIcon: Icons.person,
                isActive: _selectedIndex == 3,
              ),
              label: 'Profile',
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
