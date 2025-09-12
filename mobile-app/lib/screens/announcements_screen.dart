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
  String _scope = 'All';
  String _diocese = 'All';
  String _category = 'All';
  DateFilter _dateFilter = DateFilter.all;
  ViewMode _viewMode = ViewMode.card;
  DateTimeRange? _customDateRange;

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
          SliverToBoxAdapter(child: _buildFilters(isDark)),
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

  Widget _buildFilters(bool isDark) {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 8, 12, 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1F1F1F) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? const Color(0xFF2A2A2A) : const Color(0xFFE0E0E0),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Search bar
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Search announcements, venues, events...',
              hintStyle: TextStyle(
                  color: isDark ? Colors.white54 : const Color(0xFF6B7280)),
              prefixIcon: Icon(
                Icons.search_rounded,
                color: isDark ? Colors.white54 : const Color(0xFF9CA3AF),
              ),
              suffixIcon: _search.isNotEmpty
                  ? IconButton(
                      icon: Icon(
                        Icons.clear_rounded,
                        color:
                            isDark ? Colors.white54 : const Color(0xFF6B7280),
                      ),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _search = '');
                      },
                    )
                  : null,
              filled: true,
              fillColor:
                  isDark ? const Color(0xFF2A2A2A) : const Color(0xFFF8F9FA),
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide.none,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(
                  color: isDark
                      ? const Color(0xFF2A2A2A)
                      : const Color(0xFFE5E7EB),
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide:
                    const BorderSide(color: Color(0xFF2563EB), width: 2),
              ),
            ),
            style: TextStyle(color: isDark ? Colors.white : Colors.black),
            onChanged: (v) => setState(() => _search = v),
          ),

          const SizedBox(height: 20),

          // Filter chips section
          Text(
            'Quick Filters',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 16,
              color: isDark ? Colors.white : const Color(0xFF1F2937),
            ),
          ),
          const SizedBox(height: 12),

          // Scope filters
          _buildFilterChips([
            FilterChipData(
                'All', _scope == 'All', () => setState(() => _scope = 'All')),
            FilterChipData('Diocese', _scope == 'Diocese',
                () => setState(() => _scope = 'Diocese')),
            FilterChipData('Parish', _scope == 'Parish',
                () => setState(() => _scope = 'Parish')),
          ], isDark),

          const SizedBox(height: 16),

          // Diocese and Category filters
          Row(
            children: [
              Expanded(
                  child: _buildDropdown(
                'Diocese',
                _diocese,
                ['All', 'Diocese of Tagbilaran', 'Diocese of Talibon'],
                (v) => setState(() => _diocese = v),
                isDark,
              )),
              const SizedBox(width: 12),
              Expanded(
                  child: _buildDropdown(
                'Category',
                _category,
                ['All', 'Festival', 'Mass', 'Exhibit', 'Community Event'],
                (v) => setState(() => _category = v),
                isDark,
              )),
            ],
          ),

          const SizedBox(height: 16),

          // Date filters
          Text(
            'Date Range',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 14,
              color: isDark ? Colors.white70 : const Color(0xFF6B7280),
            ),
          ),
          const SizedBox(height: 8),
          _buildFilterChips([
            FilterChipData('All', _dateFilter == DateFilter.all,
                () => setState(() => _dateFilter = DateFilter.all)),
            FilterChipData('This Week', _dateFilter == DateFilter.thisWeek,
                () => setState(() => _dateFilter = DateFilter.thisWeek)),
            FilterChipData('This Month', _dateFilter == DateFilter.thisMonth,
                () => setState(() => _dateFilter = DateFilter.thisMonth)),
            FilterChipData(
                'Custom', _dateFilter == DateFilter.custom, _showDatePicker),
          ], isDark),

          if (_customDateRange != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: const Color(0xFF2563EB).withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.date_range_rounded,
                      size: 16, color: Color(0xFF2563EB)),
                  const SizedBox(width: 8),
                  Text(
                    '${DateFormat('MMM dd').format(_customDateRange!.start)} - ${DateFormat('MMM dd, yyyy').format(_customDateRange!.end)}',
                    style: const TextStyle(
                      color: Color(0xFF2563EB),
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => setState(() {
                      _customDateRange = null;
                      _dateFilter = DateFilter.all;
                    }),
                    child: const Icon(Icons.close_rounded,
                        size: 16, color: Color(0xFF2563EB)),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
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
        Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
            color: isDark ? Colors.white70 : const Color(0xFF6B7280),
          ),
        ),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          value: value,
          decoration: InputDecoration(
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
                if (grouped['past']!.isNotEmpty)
                  _buildSection(
                      'Past Events', grouped['past']!, isDark, Icons.history),
                const SizedBox(height: 100), // Space for FAB
              ],
            ),
          );
        },
      ),
    );
  }

  bool _matchesFilters(Announcement a) {
    // Search filter
    final searchLower = _search.toLowerCase();
    final matchesSearch = searchLower.isEmpty ||
        a.title.toLowerCase().contains(searchLower) ||
        a.description.toLowerCase().contains(searchLower) ||
        a.venue.toLowerCase().contains(searchLower) ||
        a.category.toLowerCase().contains(searchLower);

    // Scope filter
    final matchesScope =
        _scope == 'All' || a.scope.toLowerCase() == _scope.toLowerCase();

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

    return matchesSearch &&
        matchesScope &&
        matchesDiocese &&
        matchesCategory &&
        matchesDate;
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

  Widget _buildSection(String title, List<Announcement> announcements,
      bool isDark, IconData icon) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 24),
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, size: 20, color: const Color(0xFF2563EB)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: isDark ? Colors.white : const Color(0xFF1F2937),
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: const Color(0xFF2563EB).withValues(alpha: 0.3)),
              ),
              child: Text(
                '${announcements.length}',
                style: const TextStyle(
                  color: Color(0xFF2563EB),
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        ...announcements.map((announcement) => Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: _viewMode == ViewMode.card
                  ? _buildAnnouncementCard(announcement, isDark)
                  : _buildCompactAnnouncementCard(announcement, isDark),
            )),
      ],
    );
  }

  Widget _buildAnnouncementCard(Announcement announcement, bool isDark) {
    final statusColor = _getStatusColor(announcement);

    return Card(
      elevation: 0,
      color: isDark ? const Color(0xFF1F1F1F) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: isDark ? const Color(0xFF2A2A2A) : const Color(0xFFE5E7EB),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with badges
            Row(
              children: [
                _buildBadge(announcement.scope.toUpperCase(),
                    _getScopeColor(announcement.scope)),
                const SizedBox(width: 8),
                _buildBadge(announcement.category, const Color(0xFF6B7280)),
                const Spacer(),
                _buildStatusBadge(announcement.status, statusColor),
              ],
            ),

            const SizedBox(height: 16),

            // Title and description
            Text(
              announcement.title,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: isDark ? Colors.white : const Color(0xFF1F2937),
                height: 1.2,
              ),
            ),

            const SizedBox(height: 8),

            Text(
              announcement.description,
              style: TextStyle(
                fontSize: 15,
                color: isDark ? Colors.white70 : const Color(0xFF6B7280),
                height: 1.5,
              ),
            ),

            const SizedBox(height: 20),

            // Event details
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color:
                    isDark ? const Color(0xFF2A2A2A) : const Color(0xFFF8F9FA),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark
                      ? const Color(0xFF3A3A3A)
                      : const Color(0xFFE5E7EB),
                ),
              ),
              child: Column(
                children: [
                  _buildDetailRow(
                    Icons.schedule_rounded,
                    _formatDateTime(announcement.dateTime),
                    isDark,
                  ),
                  const SizedBox(height: 12),
                  _buildDetailRow(
                    Icons.location_on_rounded,
                    announcement.venue,
                    isDark,
                  ),
                  const SizedBox(height: 12),
                  _buildDetailRow(
                    Icons.account_balance_rounded,
                    announcement.diocese,
                    isDark,
                  ),
                ],
              ),
            ),

            // Action buttons
            if (announcement.contactInfo != null) ...[
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _buildActionButton(
                      'Contact',
                      Icons.phone_rounded,
                      () => _showContactInfo(announcement.contactInfo!),
                      isDark,
                      isSecondary: true,
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

  Widget _buildDetailRow(IconData icon, String text, bool isDark,
      {VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Row(
        children: [
          Icon(
            icon,
            size: 18,
            color: onTap != null
                ? const Color(0xFF2563EB)
                : (isDark ? Colors.white70 : const Color(0xFF6B7280)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: onTap != null
                    ? const Color(0xFF2563EB)
                    : (isDark ? Colors.white70 : const Color(0xFF374151)),
                decoration: onTap != null ? TextDecoration.underline : null,
              ),
            ),
          ),
          if (onTap != null)
            const Icon(
              Icons.open_in_new_rounded,
              size: 16,
              color: Color(0xFF2563EB),
            ),
        ],
      ),
    );
  }

  Widget _buildActionButton(
      String label, IconData icon, VoidCallback onPressed, bool isDark,
      {bool isSecondary = false}) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: isSecondary
            ? (isDark ? const Color(0xFF2A2A2A) : Colors.white)
            : const Color(0xFF2563EB),
        foregroundColor: isSecondary
            ? (isDark ? Colors.white70 : const Color(0xFF374151))
            : Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: isSecondary
              ? BorderSide(
                  color: isDark
                      ? const Color(0xFF3A3A3A)
                      : const Color(0xFFE5E7EB))
              : BorderSide.none,
        ),
      ),
      icon: Icon(icon, size: 18),
      label: Text(
        label,
        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
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
      _scope = 'All';
      _diocese = 'All';
      _category = 'All';
      _dateFilter = DateFilter.all;
      _customDateRange = null;
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
