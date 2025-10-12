import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../models/church.dart';
import '../models/enhanced_filter.dart';
import '../models/enums.dart';
import '../repositories/paginated_church_repository.dart';
import '../services/location_service.dart';
import '../services/query_cache_service.dart';

/// Enhanced church service with pagination support
///
/// Extends the original church service with efficient pagination,
/// reducing initial load time and memory usage.
///
/// Key improvements:
/// - Loads churches in pages (20 at a time)
/// - Query result caching
/// - Automatic scroll-based page loading
/// - Maintains filter compatibility
class PaginatedChurchService extends ChangeNotifier {
  final PaginatedChurchRepository _repository;
  final LocationService _locationService;
  final QueryCacheService _cacheService;

  // Church data
  List<Church> _churches = [];
  List<Church> _filteredChurches = [];
  DocumentSnapshot? _lastDocument;
  bool _hasMore = true;

  // Filter state
  EnhancedChurchFilter _currentFilter = const EnhancedChurchFilter();

  // Loading state
  bool _isLoading = false;
  bool _isLoadingMore = false;
  String? _errorMessage;

  PaginatedChurchService(
    this._repository,
    this._locationService,
  ) : _cacheService = QueryCacheService();

  // Getters
  List<Church> get filteredChurches => _filteredChurches;
  List<Church> get allChurches => _churches;
  EnhancedChurchFilter get currentFilter => _currentFilter;
  bool get isLoading => _isLoading;
  bool get isLoadingMore => _isLoadingMore;
  bool get hasMore => _hasMore;
  String? get errorMessage => _errorMessage;
  int get totalLoaded => _churches.length;

  /// Initialize and load first page
  Future<void> initialize() async {
    await loadFirstPage();
  }

  /// Load the first page of churches
  Future<void> loadFirstPage() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      debugPrint('📄 [PAGINATED SERVICE] Loading first page');

      // Check cache first
      const cacheKey = 'churches_page_0';
      final cached = _cacheService.get<ChurchPage>(cacheKey);

      ChurchPage page;
      if (cached != null) {
        debugPrint('✅ [PAGINATED SERVICE] Cache hit for first page');
        page = cached;
      } else {
        // Load from Firestore
        page = await _repository.getFirstPage();

        // Cache the result
        _cacheService.set(cacheKey, page,
            duration: const Duration(minutes: 10));
      }

      _churches = page.churches;
      _lastDocument = page.lastDocument;
      _hasMore = page.hasMore;

      _applyFilters();

      debugPrint(
          '✅ [PAGINATED SERVICE] Loaded ${_churches.length} churches (hasMore: $_hasMore)');
    } catch (e) {
      _errorMessage = 'Failed to load churches: ${e.toString()}';
      debugPrint('❌ [PAGINATED SERVICE] Error: $_errorMessage');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Load the next page of churches
  Future<void> loadNextPage() async {
    // Don't load if already loading or no more pages
    if (_isLoadingMore || !_hasMore || _lastDocument == null) {
      return;
    }

    _isLoadingMore = true;
    notifyListeners();

    try {
      debugPrint(
          '📄 [PAGINATED SERVICE] Loading next page (current: ${_churches.length})');

      final page = await _repository.getNextPage(_lastDocument!);

      _churches.addAll(page.churches);
      _lastDocument = page.lastDocument;
      _hasMore = page.hasMore;

      _applyFilters();

      debugPrint(
          '✅ [PAGINATED SERVICE] Loaded ${page.churches.length} more churches (total: ${_churches.length}, hasMore: $_hasMore)');
    } catch (e) {
      debugPrint('❌ [PAGINATED SERVICE] Error loading next page: $e');
      // Don't show error to user for pagination failures, just stop loading
    } finally {
      _isLoadingMore = false;
      notifyListeners();
    }
  }

  /// Refresh churches (clear cache and reload)
  Future<void> refresh() async {
    debugPrint('🔄 [PAGINATED SERVICE] Refreshing churches');

    // Clear cache
    _cacheService.invalidatePattern('churches_');

    // Reset state
    _churches = [];
    _filteredChurches = [];
    _lastDocument = null;
    _hasMore = true;

    // Reload first page
    await loadFirstPage();
  }

  /// Update filter and apply
  void updateFilter(EnhancedChurchFilter newFilter) {
    _currentFilter = newFilter;
    _applyFilters();
  }

  /// Reset all filters
  void resetFilters() {
    _currentFilter = const EnhancedChurchFilter();
    _applyFilters();
  }

  /// Enable Near Me filter
  Future<void> enableNearMeFilter([double radius = 10.0]) async {
    if (!_locationService.isLocationEnabled) {
      await _locationService.getCurrentLocation();
    }

    if (_locationService.currentPosition != null) {
      final position = _locationService.currentPosition!;
      _currentFilter = _currentFilter.copyWith(
        showNearMeOnly: true,
        nearMeRadius: radius,
        userLatitude: position.latitude,
        userLongitude: position.longitude,
      );
      _applyFilters();
    }
  }

  /// Disable Near Me filter
  void disableNearMeFilter() {
    _currentFilter = _currentFilter.copyWith(showNearMeOnly: false);
    _applyFilters();
  }

  /// Apply current filters to the church list
  void _applyFilters() {
    var filtered = List<Church>.from(_churches);

    // Text search
    if (_currentFilter.searchQuery?.isNotEmpty == true) {
      final query = _currentFilter.searchQuery!.toLowerCase();
      filtered = filtered.where((church) {
        return church.name.toLowerCase().contains(query) ||
            church.location.toLowerCase().contains(query) ||
            (church.fullName?.toLowerCase().contains(query) ?? false);
      }).toList();
    }

    // Architectural style filter
    if (_currentFilter.architecturalStyles.isNotEmpty) {
      filtered = filtered
          .where((church) => _currentFilter.architecturalStyles
              .contains(church.architecturalStyle))
          .toList();
    }

    // Heritage classification filter
    if (_currentFilter.heritageClassifications.isNotEmpty) {
      filtered = filtered
          .where((church) => _currentFilter.heritageClassifications
              .contains(church.heritageClassification))
          .toList();
    }

    // Diocese filter
    if (_currentFilter.dioceses.isNotEmpty) {
      filtered = filtered
          .where((church) => _currentFilter.dioceses.contains(church.diocese))
          .toList();
    }

    // Founding year range filter
    if (_currentFilter.foundingYearRange != null) {
      final range = _currentFilter.foundingYearRange!;
      filtered = filtered.where((church) {
        if (church.foundingYear == null) return false;
        return church.foundingYear! >= range.start &&
            church.foundingYear! <= range.end;
      }).toList();
    }

    // Near Me filter
    if (_currentFilter.showNearMeOnly &&
        _currentFilter.userLatitude != null &&
        _currentFilter.userLongitude != null) {
      filtered = _filterByProximity(
        filtered,
        _currentFilter.userLatitude!,
        _currentFilter.userLongitude!,
        _currentFilter.nearMeRadius ?? 10.0,
      );
    }

    // Sorting
    filtered = _sortChurches(filtered, _currentFilter.sortBy);

    _filteredChurches = filtered;
    notifyListeners();
  }

  /// Filter churches by proximity to user location
  List<Church> _filterByProximity(
    List<Church> churches,
    double userLat,
    double userLon,
    double radiusKm,
  ) {
    return churches.where((church) {
      if (church.latitude == null || church.longitude == null) return false;

      final distance = Geolocator.distanceBetween(
            userLat,
            userLon,
            church.latitude!,
            church.longitude!,
          ) /
          1000; // Convert to kilometers

      return distance <= radiusKm;
    }).toList();
  }

  /// Sort churches based on sort option
  List<Church> _sortChurches(List<Church> churches, SortOption sortBy) {
    final sorted = List<Church>.from(churches);

    switch (sortBy) {
      case SortOption.name:
        sorted.sort((a, b) => a.name.compareTo(b.name));
        break;
      case SortOption.foundingYear:
        sorted.sort((a, b) {
          if (a.foundingYear == null && b.foundingYear == null) return 0;
          if (a.foundingYear == null) return 1;
          if (b.foundingYear == null) return -1;
          return a.foundingYear!.compareTo(b.foundingYear!);
        });
        break;
      case SortOption.distance:
        if (_locationService.currentPosition != null) {
          final position = _locationService.currentPosition!;
          sorted.sort((a, b) {
            final distA = (a.latitude != null && a.longitude != null)
                ? Geolocator.distanceBetween(
                    position.latitude,
                    position.longitude,
                    a.latitude!,
                    a.longitude!,
                  )
                : double.infinity;
            final distB = (b.latitude != null && b.longitude != null)
                ? Geolocator.distanceBetween(
                    position.latitude,
                    position.longitude,
                    b.latitude!,
                    b.longitude!,
                  )
                : double.infinity;
            return distA.compareTo(distB);
          });
        }
        break;
      case SortOption.heritage:
        sorted.sort((a, b) {
          // Sort by heritage classification priority
          final aValue = a.heritageClassification.index;
          final bValue = b.heritageClassification.index;
          return aValue.compareTo(bValue);
        });
        break;
    }

    return sorted;
  }

  /// Get distance to a church from user's current position
  double? getDistanceToChurch(Church church) {
    if (_locationService.currentPosition == null ||
        church.latitude == null ||
        church.longitude == null) {
      return null;
    }

    final position = _locationService.currentPosition!;
    return Geolocator.distanceBetween(
          position.latitude,
          position.longitude,
          church.latitude!,
          church.longitude!,
        ) /
        1000; // Convert to kilometers
  }

  /// Check if should show distance indicators
  bool shouldShowDistance() {
    return _locationService.currentPosition != null;
  }

  /// Search churches by query
  void searchChurches(String query) {
    _currentFilter = _currentFilter.copyWith(searchQuery: query);
    _applyFilters();
  }

  /// Toggle architectural style filter
  void toggleArchitecturalStyle(ArchitecturalStyle style) {
    final currentStyles =
        Set<ArchitecturalStyle>.from(_currentFilter.architecturalStyles);
    if (currentStyles.contains(style)) {
      currentStyles.remove(style);
    } else {
      currentStyles.add(style);
    }
    _currentFilter =
        _currentFilter.copyWith(architecturalStyles: currentStyles);
    _applyFilters();
  }

  /// Toggle heritage classification filter
  void toggleHeritageClassification(HeritageClassification classification) {
    final currentClassifications = Set<HeritageClassification>.from(
        _currentFilter.heritageClassifications);
    if (currentClassifications.contains(classification)) {
      currentClassifications.remove(classification);
    } else {
      currentClassifications.add(classification);
    }
    _currentFilter = _currentFilter.copyWith(
        heritageClassifications: currentClassifications);
    _applyFilters();
  }

  /// Toggle diocese filter
  void toggleDiocese(Diocese diocese) {
    final currentDioceses = Set<Diocese>.from(_currentFilter.dioceses);
    if (currentDioceses.contains(diocese)) {
      currentDioceses.remove(diocese);
    } else {
      currentDioceses.add(diocese);
    }
    _currentFilter = _currentFilter.copyWith(dioceses: currentDioceses);
    _applyFilters();
  }

  /// Set founding year range filter
  void setFoundingYearRange(RangeValues? range) {
    _currentFilter = _currentFilter.copyWith(foundingYearRange: range);
    _applyFilters();
  }

  /// Clear founding year range filter
  void clearFoundingYearRange() {
    setFoundingYearRange(null);
  }

  /// Set sort option
  void setSortOption(SortOption option) {
    _currentFilter = _currentFilter.copyWith(sortBy: option);
    _applyFilters();
  }

  /// Get church by ID
  Church? getChurchById(String id) {
    try {
      return _churches.firstWhere((church) => church.id == id);
    } catch (e) {
      return null;
    }
  }

  /// Get available founding year range from all churches
  RangeValues getFoundingYearRange() {
    if (_churches.isEmpty) return const RangeValues(1500, 2024);

    final years = _churches
        .where((church) => church.foundingYear != null)
        .map((church) => church.foundingYear!.toDouble())
        .toList();

    if (years.isEmpty) return const RangeValues(1500, 2024);

    years.sort();
    return RangeValues(years.first, years.last);
  }

  @override
  void dispose() {
    debugPrint('🗑️ [PAGINATED SERVICE] Disposing');
    super.dispose();
  }
}
