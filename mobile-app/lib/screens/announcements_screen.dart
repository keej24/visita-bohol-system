import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../repositories/announcement_repository.dart';
import '../models/announcement.dart';
import '../theme/header_palette.dart';

enum DateFilter { all, thisWeek, thisMonth, custom }

enum ViewMode { card, compact }

class FilterChipData {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  FilterChipData(this.label, this.isSelected, this.onTap);
}

class AnnouncementsScreen extends StatefulWidget {
  const AnnouncementsScreen({super.key});
  @override
  State<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends State<AnnouncementsScreen>
    with TickerProviderStateMixin {
  late final AnimationController _animationController;
  final _searchController = TextEditingController();

  // Filter states
  String _search = '';
  String _diocese = 'All';
  String _category = 'All';
  DateFilter _dateFilter = DateFilter.all;
  ViewMode _viewMode = ViewMode.card;
  DateTimeRange? _customDateRange;
  bool _showArchivedAnnouncements = false;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF121212) : Colors.white,
      body: CustomScrollView(
        slivers: [
          _buildSliverAppBar(isDark),
          _buildActiveFiltersChips(isDark),
          _buildAnnouncementsList(isDark),
        ],
      ),
      floatingActionButton: _buildFloatingActionButton(isDark),
    );
  }

  Widget _buildSliverAppBar(bool isDark) {
    return SliverAppBar(
      expandedHeight: 60,
      floating: false,
      pinned: true,
      backgroundColor:
          isDark ? const Color(0xFF1F1F1F) : HeaderColors.announcements,
      elevation: 0,
      iconTheme: IconThemeData(
        color: isDark ? Colors.white : const Color(0xFF1A1A1A),
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 3,
                  offset: const Offset(0, 1),
                ),
              ],
            ),
            child: const Icon(
              Icons.campaign_rounded,
              size: 16,
              color: Color(0xFF2563EB),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            'Announcements',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 18,
              color: isDark ? Colors.white : const Color(0xFF1A1A1A),
            ),
          ),
        ],
      ),
      actions: [
        // Filter button with badge
        Stack(
          alignment: Alignment.center,
          children: [
            IconButton(
              icon: const Icon(Icons.tune_rounded),
              onPressed: () => _showFilterBottomSheet(context, isDark),
            ),
            if (_getActiveFilterCount() > 0)
              Positioned(
                right: 8,
                top: 8,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: Color(0xFFEF4444),
                    shape: BoxShape.circle,
                  ),
                  constraints: const BoxConstraints(
                    minWidth: 16,
                    minHeight: 16,
                  ),
                  child: Text(
                    '${_getActiveFilterCount()}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
          ],
        ),
        IconButton(
          icon: Icon(
              _viewMode == ViewMode.card ? Icons.view_list : Icons.view_module),
          onPressed: () {
            setState(() {
              _viewMode =
                  _viewMode == ViewMode.card ? ViewMode.compact : ViewMode.card;
            });
          },
        ),
        const SizedBox(width: 8),
      ],
    );
  }

  // Active Filter Chips Widget
  Widget _buildActiveFiltersChips(bool isDark) {
    final List<Map<String, dynamic>> activeFilters = [];

    if (_search.isNotEmpty) {
      activeFilters.add({
        'label': 'Search: $_search',
        'onClear': () => setState(() {
              _search = '';
              _searchController.clear();
            })
      });
    }
    if (_diocese != 'All') {
      activeFilters.add({
        'label': _diocese.replaceAll('Diocese of ', ''),
        'onClear': () => setState(() => _diocese = 'All')
      });
    }
    if (_category != 'All') {
      activeFilters.add({
        'label': _category,
        'onClear': () => setState(() => _category = 'All')
      });
    }
    if (_dateFilter == DateFilter.thisWeek) {
      activeFilters.add({
        'label': 'This Week',
        'onClear': () => setState(() => _dateFilter = DateFilter.all)
      });
    }
    if (_dateFilter == DateFilter.thisMonth) {
      activeFilters.add({
        'label': 'This Month',
        'onClear': () => setState(() => _dateFilter = DateFilter.all)
      });
    }
    if (_customDateRange != null) {
      activeFilters.add({
        'label': 'Custom Date',
        'onClear': () => setState(() {
              _customDateRange = null;
              _dateFilter = DateFilter.all;
            })
      });
    }

    if (activeFilters.isEmpty) {
      return const SliverToBoxAdapter(child: SizedBox.shrink());
    }

    return SliverToBoxAdapter(
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
        child: Wrap(
          spacing: 8,
          runSpacing: 8,
          children: activeFilters.map((filter) {
            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    filter['label'] as String,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(width: 6),
                  GestureDetector(
                    onTap: filter['onClear'] as VoidCallback,
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.3),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.close_rounded,
                        size: 14,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  // Filter Bottom Sheet
  void _showFilterBottomSheet(BuildContext context, bool isDark) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.9,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (_, scrollController) => Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1F1F1F) : Colors.white,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(28),
              topRight: Radius.circular(28),
            ),
          ),
          child: Column(
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? Colors.white24 : Colors.black26,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // Header
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF2563EB).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.tune_rounded,
                        color: Color(0xFF2563EB),
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Text(
                        'Filters',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color:
                              isDark ? Colors.white : const Color(0xFF1F2937),
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        _clearAllFilters();
                        Navigator.pop(context);
                      },
                      child: const Text(
                        'Clear All',
                        style: TextStyle(
                          color: Color(0xFFEF4444),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const Divider(height: 1),

              // Scrollable filter content
              Expanded(
                child: SingleChildScrollView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Search Filter
                      _buildFilterSection(
                        'Search',
                        Icons.search_rounded,
                        isDark,
                        TextField(
                          controller: _searchController,
                          decoration: InputDecoration(
                            hintText: 'Search announcements...',
                            hintStyle: TextStyle(
                                color: isDark
                                    ? Colors.white54
                                    : const Color(0xFF9CA3AF),
                                fontSize: 15),
                            prefixIcon: Icon(
                              Icons.search_rounded,
                              color: isDark
                                  ? Colors.white54
                                  : const Color(0xFF6B7280),
                              size: 20,
                            ),
                            suffixIcon: _search.isNotEmpty
                                ? IconButton(
                                    icon: Icon(
                                      Icons.clear_rounded,
                                      color: isDark
                                          ? Colors.white54
                                          : const Color(0xFF6B7280),
                                      size: 20,
                                    ),
                                    onPressed: () {
                                      _searchController.clear();
                                      setState(() => _search = '');
                                    },
                                  )
                                : null,
                            filled: true,
                            fillColor: isDark
                                ? const Color(0xFF2A2A2A)
                                : const Color(0xFFF8F9FA),
                            contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 12),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide.none,
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: BorderSide.none,
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(
                                  color: Color(0xFF2563EB), width: 2),
                            ),
                          ),
                          style: TextStyle(
                            color: isDark ? Colors.white : Colors.black,
                            fontSize: 15,
                          ),
                          onChanged: (v) => setState(() => _search = v),
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Diocese Filter
                      _buildFilterSection(
                        'Diocese',
                        Icons.location_on_outlined,
                        isDark,
                        _buildDropdown(
                          'Select Diocese',
                          _diocese,
                          [
                            'All',
                            'Diocese of Tagbilaran',
                            'Diocese of Talibon'
                          ],
                          (v) => setState(() => _diocese = v),
                          isDark,
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Category Filter
                      _buildFilterSection(
                        'Category',
                        Icons.category_outlined,
                        isDark,
                        _buildDropdown(
                          'Select Category',
                          _category,
                          [
                            'All',
                            'Festival',
                            'Mass',
                            'Exhibit',
                            'Community Event'
                          ],
                          (v) => setState(() => _category = v),
                          isDark,
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Date Range Filter
                      _buildFilterSection(
                        'Date Range',
                        Icons.calendar_today_rounded,
                        isDark,
                        Column(
                          children: [
                            _buildFilterChips([
                              FilterChipData(
                                  'All Dates',
                                  _dateFilter == DateFilter.all,
                                  () => setState(
                                      () => _dateFilter = DateFilter.all)),
                              FilterChipData(
                                  'This Week',
                                  _dateFilter == DateFilter.thisWeek,
                                  () => setState(
                                      () => _dateFilter = DateFilter.thisWeek)),
                              FilterChipData(
                                  'This Month',
                                  _dateFilter == DateFilter.thisMonth,
                                  () => setState(() =>
                                      _dateFilter = DateFilter.thisMonth)),
                              FilterChipData(
                                  'Custom',
                                  _dateFilter == DateFilter.custom,
                                  _showDatePicker),
                            ], isDark),
                            if (_customDateRange != null) ...[
                              const SizedBox(height: 10),
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF2563EB)
                                      .withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                      color: const Color(0xFF2563EB)
                                          .withValues(alpha: 0.3)),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.date_range_rounded,
                                        size: 14, color: Color(0xFF2563EB)),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        '${DateFormat('MMM dd').format(_customDateRange!.start)} - ${DateFormat('MMM dd, yyyy').format(_customDateRange!.end)}',
                                        style: const TextStyle(
                                          color: Color(0xFF2563EB),
                                          fontWeight: FontWeight.w600,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    GestureDetector(
                                      onTap: () => setState(() {
                                        _customDateRange = null;
                                        _dateFilter = DateFilter.all;
                                      }),
                                      child: Container(
                                        padding: const EdgeInsets.all(4),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF2563EB)
                                              .withValues(alpha: 0.1),
                                          borderRadius:
                                              BorderRadius.circular(4),
                                        ),
                                        child: const Icon(Icons.close_rounded,
                                            size: 14, color: Color(0xFF2563EB)),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Apply button
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isDark
                      ? const Color(0xFF2A2A2A)
                      : const Color(0xFFF8F9FA),
                  border: Border(
                    top: BorderSide(
                      color: isDark
                          ? const Color(0xFF3A3A3A)
                          : const Color(0xFFE5E7EB),
                    ),
                  ),
                ),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: Text(
                      'Apply Filters${_getActiveFilterCount() > 0 ? ' (${_getActiveFilterCount()})' : ''}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFilterSection(
    String title,
    IconData icon,
    bool isDark,
    Widget child,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Icon(
                icon,
                size: 14,
                color: const Color(0xFF2563EB),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              title,
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 16,
                color: isDark ? Colors.white : const Color(0xFF1F2937),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        child,
      ],
    );
  }

  int _getActiveFilterCount() {
    int count = 0;
    if (_search.isNotEmpty) count++;
    if (_diocese != 'All') count++;
    if (_category != 'All') count++;
    if (_dateFilter != DateFilter.all) count++;
    return count;
  }

  Widget _buildFilterChips(List<FilterChipData> chips, bool isDark) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: chips
          .map((chip) => _buildFilterChip(
                chip.label,
                chip.isSelected,
                chip.onTap,
                isDark,
              ))
          .toList(),
    );
  }

  Widget _buildFilterChip(
      String label, bool isSelected, VoidCallback onTap, bool isDark) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF2563EB)
              : (isDark ? const Color(0xFF2A2A2A) : const Color(0xFFF8F9FA)),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? const Color(0xFF2563EB)
                : (isDark ? const Color(0xFF3A3A3A) : const Color(0xFFE5E7EB)),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected
                ? Colors.white
                : (isDark ? Colors.white70 : const Color(0xFF374151)),
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  Widget _buildDropdown(String label, String value, List<String> items,
      Function(String) onChanged, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        DropdownButtonFormField<String>(
          initialValue: value,
          decoration: InputDecoration(
            labelText: label,
            labelStyle: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 14,
              color: isDark ? Colors.white70 : const Color(0xFF6B7280),
            ),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            filled: true,
            fillColor:
                isDark ? const Color(0xFF2A2A2A) : const Color(0xFFF8F9FA),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(
                color:
                    isDark ? const Color(0xFF3A3A3A) : const Color(0xFFE5E7EB),
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF2563EB), width: 2),
            ),
          ),
          dropdownColor: isDark ? const Color(0xFF2A2A2A) : Colors.white,
          style: TextStyle(color: isDark ? Colors.white : Colors.black),
          items: items
              .map((item) => DropdownMenuItem(
                    value: item,
                    child: Text(item, style: const TextStyle(fontSize: 13)),
                  ))
              .toList(),
          onChanged: (v) => onChanged(v ?? items.first),
        ),
      ],
    );
  }

  Widget _buildAnnouncementsList(bool isDark) {
    return SliverToBoxAdapter(
      child: FutureBuilder<List<Announcement>>(
        future: context.read<AnnouncementRepository>().getAll(),
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return _buildLoadingState(isDark);
          }

          if (snapshot.hasError) {
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 60, horizontal: 32),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: (isDark ? Colors.white : const Color(0xFFEF4444))
                          .withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.cloud_off_rounded,
                      size: 48,
                      color: isDark ? Colors.white54 : const Color(0xFFEF4444),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Can\'t load announcements',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white : const Color(0xFF1F2937),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Please check your internet connection or sign in to continue.\nIf you\'re developing, verify Firestore rules allow read access.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 15,
                      color: isDark ? Colors.white70 : const Color(0xFF6B7280),
                      height: 1.5,
                    ),
                  ),
                ],
              ),
            );
          }

          final announcements =
              (snapshot.data ?? []).where(_matchesFilters).toList();

          if (announcements.isEmpty) {
            return _buildEmptyState(isDark);
          }

          // Group announcements by status
          final grouped = _groupAnnouncements(announcements);

          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                if (grouped['upcoming']!.isNotEmpty)
                  _buildSection('Upcoming Events', grouped['upcoming']!, isDark,
                      Icons.upcoming),
                if (grouped['ongoing']!.isNotEmpty)
                  _buildSection('Ongoing Events', grouped['ongoing']!, isDark,
                      Icons.timelapse),

                // Show "View Archive" button if there are past announcements and they're hidden
                if (grouped['past']!.isNotEmpty && !_showArchivedAnnouncements)
                  _buildArchiveButton(grouped['past']!.length, isDark),

                // Show archived/past announcements if enabled
                if (grouped['past']!.isNotEmpty && _showArchivedAnnouncements)
                  _buildSection('Archived Events', grouped['past']!, isDark,
                      Icons.archive),

                const SizedBox(height: 100), // Space for FAB
              ],
            ),
          );
        },
      ),
    );
  }

  bool _matchesFilters(Announcement a) {
    // IMPORTANT: Exclude parish announcements - they should only appear in church profiles
    if (a.scope.toLowerCase() == 'parish') {
      return false;
    }

    // Search filter
    final searchLower = _search.toLowerCase();
    final matchesSearch = searchLower.isEmpty ||
        a.title.toLowerCase().contains(searchLower) ||
        a.description.toLowerCase().contains(searchLower) ||
        a.venue.toLowerCase().contains(searchLower) ||
        a.category.toLowerCase().contains(searchLower);

    // Diocese filter
    final matchesDiocese = _diocese == 'All' || a.diocese == _diocese;

    // Category filter
    final matchesCategory = _category == 'All' || a.category == _category;

    // Date filter
    bool matchesDate = true;
    final now = DateTime.now();
    switch (_dateFilter) {
      case DateFilter.thisWeek:
        final weekStart = now.subtract(Duration(days: now.weekday - 1));
        final weekEnd = weekStart.add(const Duration(days: 6));
        matchesDate =
            a.dateTime.isAfter(weekStart) && a.dateTime.isBefore(weekEnd);
        break;
      case DateFilter.thisMonth:
        final monthStart = DateTime(now.year, now.month, 1);
        final monthEnd = DateTime(now.year, now.month + 1, 0);
        matchesDate =
            a.dateTime.isAfter(monthStart) && a.dateTime.isBefore(monthEnd);
        break;
      case DateFilter.custom:
        if (_customDateRange != null) {
          matchesDate = a.dateTime.isAfter(_customDateRange!.start) &&
              a.dateTime.isBefore(_customDateRange!.end);
        }
        break;
      case DateFilter.all:
        matchesDate = true;
        break;
    }

    return matchesSearch && matchesDiocese && matchesCategory && matchesDate;
  }

  Map<String, List<Announcement>> _groupAnnouncements(
      List<Announcement> announcements) {
    final Map<String, List<Announcement>> grouped = {
      'upcoming': <Announcement>[],
      'ongoing': <Announcement>[],
      'past': <Announcement>[],
    };

    for (final announcement in announcements) {
      if (announcement.isUpcoming) {
        grouped['upcoming']!.add(announcement);
      } else if (announcement.isOngoing) {
        grouped['ongoing']!.add(announcement);
      } else {
        grouped['past']!.add(announcement);
      }
    }

    // Sort each group by date
    grouped['upcoming']!.sort((a, b) => a.dateTime.compareTo(b.dateTime));
    grouped['ongoing']!.sort((a, b) => a.dateTime.compareTo(b.dateTime));
    grouped['past']!.sort((a, b) => b.dateTime.compareTo(a.dateTime));

    return grouped;
  }

  Widget _buildArchiveButton(int archivedCount, bool isDark) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 24),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            setState(() {
              _showArchivedAnnouncements = true;
            });
          },
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1F1F1F) : Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color:
                    isDark ? const Color(0xFF2A2A2A) : const Color(0xFFE5E7EB),
                width: 2,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF6B7280).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.archive_outlined,
                    size: 28,
                    color: Color(0xFF6B7280),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'View Archived Announcements',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color:
                              isDark ? Colors.white : const Color(0xFF1F2937),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$archivedCount past ${archivedCount == 1 ? 'event' : 'events'} available',
                        style: TextStyle(
                          fontSize: 14,
                          color:
                              isDark ? Colors.white70 : const Color(0xFF6B7280),
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF6B7280).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.arrow_forward_ios_rounded,
                    size: 18,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSection(String title, List<Announcement> announcements,
      bool isDark, IconData icon) {
    // Calculate status color based on section
    Color sectionColor;
    if (title.contains('Upcoming')) {
      sectionColor = const Color(0xFF10B981);
    } else if (title.contains('Ongoing')) {
      sectionColor = const Color(0xFFF59E0B);
    } else {
      sectionColor = const Color(0xFF6B7280);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 20),

        // Enhanced section header
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                sectionColor.withValues(alpha: 0.1),
                sectionColor.withValues(alpha: 0.05),
              ],
            ),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: sectionColor.withValues(alpha: 0.2),
            ),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: sectionColor,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: [
                    BoxShadow(
                      color: sectionColor.withValues(alpha: 0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Icon(icon, size: 18, color: Colors.white),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white : const Color(0xFF1F2937),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${announcements.length} ${announcements.length == 1 ? 'event' : 'events'}',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color:
                            isDark ? Colors.white60 : const Color(0xFF6B7280),
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: sectionColor,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${announcements.length}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 14),

        // Announcements list
        ...announcements.map((announcement) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _viewMode == ViewMode.card
                  ? _buildAnnouncementCard(announcement, isDark)
                  : _buildCompactAnnouncementCard(announcement, isDark),
            )),
      ],
    );
  }

  Widget _buildAnnouncementCard(Announcement announcement, bool isDark) {
    final statusColor = _getStatusColor(announcement);
    final isArchived = announcement.isPast;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1F1F1F) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isArchived
              ? (isDark ? const Color(0xFF2A2A2A) : const Color(0xFFE5E7EB))
              : statusColor.withValues(alpha: 0.2),
          width: isArchived ? 1 : 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with status indicator
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.05),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
              ),
            ),
            child: Row(
              children: [
                // Status badge
                _buildStatusBadge(announcement.status, statusColor),
                const SizedBox(width: 8),

                // Scope badge
                _buildBadge(
                  announcement.scope.toUpperCase(),
                  _getScopeColor(announcement.scope),
                ),

                const Spacer(),

                // Category badge
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: (isDark ? Colors.white : Colors.black)
                        .withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _getCategoryIcon(announcement.category),
                        size: 12,
                        color:
                            isDark ? Colors.white60 : const Color(0xFF6B7280),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        announcement.category,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color:
                              isDark ? Colors.white60 : const Color(0xFF6B7280),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Content
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title
                Text(
                  announcement.title,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: isDark ? Colors.white : const Color(0xFF1F2937),
                    height: 1.3,
                  ),
                ),

                const SizedBox(height: 10),

                // Description
                Text(
                  announcement.description,
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.white70 : const Color(0xFF6B7280),
                    height: 1.5,
                  ),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),

                const SizedBox(height: 16),

                // Event details - Compact grid
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isDark
                        ? const Color(0xFF2A2A2A)
                        : const Color(0xFFF8F9FA),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      _buildCompactDetailRow(
                        Icons.access_time_rounded,
                        _formatDateTime(announcement.dateTime),
                        isDark,
                      ),
                      const SizedBox(height: 10),
                      _buildCompactDetailRow(
                        Icons.location_on_outlined,
                        announcement.venue,
                        isDark,
                      ),
                      const SizedBox(height: 10),
                      _buildCompactDetailRow(
                        Icons.church_outlined,
                        announcement.diocese.replaceAll('Diocese of ', ''),
                        isDark,
                      ),
                    ],
                  ),
                ),

                // Action buttons
                if (announcement.contactInfo != null) ...[
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () =>
                          _showContactInfo(announcement.contactInfo!),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF2563EB),
                        side: const BorderSide(
                            color: Color(0xFF2563EB), width: 1.5),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      icon: const Icon(Icons.phone_rounded, size: 16),
                      label: const Text(
                        'Contact Info',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCompactDetailRow(IconData icon, String text, bool isDark) {
    return Row(
      children: [
        Icon(
          icon,
          size: 16,
          color: isDark ? Colors.white60 : const Color(0xFF6B7280),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: isDark ? Colors.white70 : const Color(0xFF374151),
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  IconData _getCategoryIcon(String category) {
    switch (category.toLowerCase()) {
      case 'festival':
        return Icons.celebration_outlined;
      case 'mass':
        return Icons.church_outlined;
      case 'exhibit':
        return Icons.museum_outlined;
      case 'community event':
        return Icons.groups_outlined;
      default:
        return Icons.event_outlined;
    }
  }

  Widget _buildCompactAnnouncementCard(Announcement announcement, bool isDark) {
    final statusColor = _getStatusColor(announcement);

    return Card(
      elevation: 0,
      color: isDark ? const Color(0xFF1F1F1F) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isDark ? const Color(0xFF2A2A2A) : const Color(0xFFE5E7EB),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            // Status indicator
            Container(
              width: 4,
              height: 60,
              decoration: BoxDecoration(
                color: statusColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            const SizedBox(width: 16),

            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          announcement.title,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color:
                                isDark ? Colors.white : const Color(0xFF1F2937),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      _buildStatusBadge(announcement.status, statusColor,
                          isCompact: true),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatDateTime(announcement.dateTime),
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? Colors.white70 : const Color(0xFF6B7280),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    announcement.venue,
                    style: TextStyle(
                      fontSize: 13,
                      color: isDark ? Colors.white54 : const Color(0xFF9CA3AF),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status, Color color,
      {bool isCompact = false}) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isCompact ? 8 : 12,
        vertical: isCompact ? 4 : 6,
      ),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(isCompact ? 8 : 12),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          fontSize: isCompact ? 10 : 11,
          fontWeight: FontWeight.w700,
          color: Colors.white,
        ),
      ),
    );
  }

  Widget _buildLoadingState(bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 60),
      child: Center(
        child: Column(
          children: [
            CircularProgressIndicator(
              color: const Color(0xFF2563EB),
              backgroundColor:
                  isDark ? const Color(0xFF2A2A2A) : const Color(0xFFE5E7EB),
            ),
            const SizedBox(height: 16),
            Text(
              'Loading announcements...',
              style: TextStyle(
                color: isDark ? Colors.white70 : const Color(0xFF6B7280),
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 60, horizontal: 32),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: (isDark ? Colors.white : const Color(0xFF2563EB))
                  .withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.event_busy_rounded,
              size: 48,
              color: isDark ? Colors.white54 : const Color(0xFF2563EB),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'No announcements found',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: isDark ? Colors.white : const Color(0xFF1F2937),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Try adjusting your filters or check back later for new events and announcements.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 15,
              color: isDark ? Colors.white70 : const Color(0xFF6B7280),
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFloatingActionButton(bool isDark) {
    // Show different FAB based on archive visibility
    if (_showArchivedAnnouncements) {
      return FloatingActionButton.extended(
        onPressed: () {
          setState(() {
            _showArchivedAnnouncements = false;
          });
        },
        backgroundColor: const Color(0xFF6B7280),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.archive_rounded),
        label: const Text(
          'Hide Archive',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
      );
    }

    // Show clear filters button if any filter is active
    final hasActiveFilters = _search.isNotEmpty ||
        _diocese != 'All' ||
        _category != 'All' ||
        _dateFilter != DateFilter.all;

    if (hasActiveFilters) {
      return FloatingActionButton.extended(
        onPressed: _clearAllFilters,
        backgroundColor: const Color(0xFF2563EB),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.filter_alt_off_rounded),
        label: const Text(
          'Clear Filters',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
      );
    }

    // No FAB if no filters and archive is hidden
    return const SizedBox.shrink();
  }

  // Helper methods
  Color _getStatusColor(Announcement announcement) {
    if (announcement.isUpcoming) return const Color(0xFF10B981);
    if (announcement.isOngoing) return const Color(0xFFF59E0B);
    return const Color(0xFF6B7280);
  }

  Color _getScopeColor(String scope) {
    switch (scope.toLowerCase()) {
      case 'diocese':
        return const Color(0xFF2563EB);
      case 'parish':
        return const Color(0xFF10B981);
      default:
        return const Color(0xFF6B7280);
    }
  }

  String _formatDateTime(DateTime dateTime) {
    return DateFormat('MMMM d, y · h:mm a').format(dateTime);
  }

  void _showDatePicker() async {
    final DateTimeRange? picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      currentDate: DateTime.now(),
      saveText: 'Apply',
    );

    if (picked != null) {
      setState(() {
        _customDateRange = picked;
        _dateFilter = DateFilter.custom;
      });
    }
  }

  void _clearAllFilters() {
    setState(() {
      _search = '';
      _diocese = 'All';
      _category = 'All';
      _dateFilter = DateFilter.all;
      _customDateRange = null;
      _showArchivedAnnouncements = false; // Also hide archive when clearing
    });
    _searchController.clear();
  }

  void _showContactInfo(String contactInfo) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Contact Information'),
        content: Text(contactInfo),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}
