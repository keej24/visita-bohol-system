import 'package:flutter/material.dart';
import '../models/church.dart';
import '../models/enhanced_filter.dart';
import '../models/enums.dart';
import '../services/location_service.dart';
import '../repositories/offline_church_repository.dart';
import 'connectivity_service.dart';
import 'offline_sync_service.dart';

class OfflineEnhancedChurchService extends ChangeNotifier {
  final OfflineChurchRepository _offlineRepository;
  final LocationService _locationService;
  final ConnectivityService _connectivity;
  final OfflineSyncService _syncService;

  List<Church> _allChurches = [];
  List<Church> _filteredChurches = [];
  EnhancedChurchFilter _currentFilter = const EnhancedChurchFilter();
  bool _isLoading = false;
  String? _errorMessage;

  OfflineEnhancedChurchService(
    this._offlineRepository,
    this._locationService,
    this._connectivity,
    this._syncService,
  );

  // Getters
  List<Church> get filteredChurches => _filteredChurches;
  List<Church> get allChurches => _allChurches;
  EnhancedChurchFilter get currentFilter => _currentFilter;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get hasOfflineData => _allChurches.isNotEmpty;

  // Initialize and load churches (offline-first)
  Future<void> initialize() async {
    await loadChurches();

    // Listen to offline repository changes
    _offlineRepository.addListener(_onOfflineRepositoryChanged);

    // Listen to connectivity changes for automatic sync
    _connectivity.addListener(_onConnectivityChanged);
  }

  @override
  void dispose() {
    _offlineRepository.removeListener(_onOfflineRepositoryChanged);
    _connectivity.removeListener(_onConnectivityChanged);
    super.dispose();
  }

  // Handle offline repository changes
  void _onOfflineRepositoryChanged() {
    if (_offlineRepository.churches != _allChurches) {
      _allChurches = List.from(_offlineRepository.churches);
      _applyFilters();
    }
  }

  // Handle connectivity changes
  void _onConnectivityChanged() {
    if (_connectivity.isOnline && _allChurches.isEmpty) {
      // Auto-load when coming back online if no data
      loadChurches();
    }
  }

  // Load all churches (offline-first approach)
  Future<void> loadChurches() async {
    _setLoading(true);
    _errorMessage = null;

    try {
      // Load from offline repository (which handles online/offline logic)
      final churches = await _offlineRepository.loadChurches();

      // Filter to only show approved churches for public users
      _allChurches = churches.where((church) => church.isPublicVisible).toList();

      assert(() {
        debugPrint(
            '🏛️ Loaded ${_allChurches.length} approved churches from offline repository');
        return true;
      }());

      _applyFilters();

    } catch (e) {
      _errorMessage = _connectivity.isOffline
          ? 'No offline data available. Please connect to the internet.'
          : 'Failed to load churches: ${e.toString()}';
      debugPrint('❌ Error loading churches: $e');
    } finally {
      _setLoading(false);
    }
  }

  // Refresh churches (force sync)
  Future<void> refresh() async {
    if (!_connectivity.isOnline) {
      _errorMessage = 'Cannot refresh while offline';
      notifyListeners();
      return;
    }

    _setLoading(true);
    try {
      await _offlineRepository.refresh();
      _allChurches = List.from(_offlineRepository.churches
          .where((church) => church.isPublicVisible));
      _applyFilters();
      _errorMessage = null;
    } catch (e) {
      _errorMessage = 'Failed to refresh: ${e.toString()}';
    } finally {
      _setLoading(false);
    }
  }

  // Update filter and apply
  void updateFilter(EnhancedChurchFilter newFilter) {
    _currentFilter = newFilter;
    _applyFilters();
  }

  // Reset all filters
  void resetFilters() {
    _currentFilter = const EnhancedChurchFilter();
    _applyFilters();
  }

  // Enable Near Me filter
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
        sortBy: SortOption.distance,
      );
      _applyFilters();
    }
  }

  // Disable Near Me filter
  void disableNearMeFilter() {
    _currentFilter = _currentFilter.copyWith(
      showNearMeOnly: false,
      nearMeRadius: null,
      userLatitude: null,
      userLongitude: null,
    );
    _applyFilters();
  }

  // Apply all filters (same logic as original but with offline data)
  void _applyFilters() {
    List<Church> filtered = List.from(_allChurches);

    // Apply search query filter
    if (_currentFilter.searchQuery?.isNotEmpty == true) {
      final query = _currentFilter.searchQuery!.toLowerCase();
      filtered = filtered.where((church) {
        return church.name.toLowerCase().contains(query) ||
            church.location.toLowerCase().contains(query) ||
            church.history?.toLowerCase().contains(query) == true;
      }).toList();
    }

    // Apply founding year range filter
    if (_currentFilter.foundingYearRange != null) {
      final range = _currentFilter.foundingYearRange!;
      filtered = filtered.where((church) {
        if (church.foundingYear == null) return false;
        return church.foundingYear! >= range.start.round() &&
            church.foundingYear! <= range.end.round();
      }).toList();
    }

    // Apply architectural style filter
    if (_currentFilter.architecturalStyles.isNotEmpty) {
      filtered = filtered.where((church) {
        return _currentFilter.architecturalStyles
            .contains(church.architecturalStyle);
      }).toList();
    }

    // Apply heritage classification filter
    if (_currentFilter.heritageClassifications.isNotEmpty) {
      filtered = filtered.where((church) {
        return _currentFilter.heritageClassifications
            .contains(church.heritageClassification);
      }).toList();
    }

    // Apply diocese filter
    if (_currentFilter.dioceses.isNotEmpty) {
      filtered = filtered.where((church) {
        final churchDiocese = DioceseX.fromLabel(church.diocese);
        return _currentFilter.dioceses.contains(churchDiocese);
      }).toList();
    }

    // Apply near me filter
    if (_currentFilter.showNearMeOnly &&
        _currentFilter.userLatitude != null &&
        _currentFilter.userLongitude != null) {
      filtered = filtered.where((church) {
        final distance = church.distanceFrom(
          _currentFilter.userLatitude!,
          _currentFilter.userLongitude!,
        );
        return distance != null &&
            distance <= (_currentFilter.nearMeRadius ?? 10.0);
      }).toList();
    }

    // Apply sorting
    _applySorting(filtered);

    _filteredChurches = filtered;
    notifyListeners();
  }

  // Apply sorting to filtered results (same as original)
  void _applySorting(List<Church> churches) {
    switch (_currentFilter.sortBy) {
      case SortOption.name:
        churches.sort((a, b) => a.name.compareTo(b.name));
        break;
      case SortOption.foundingYear:
        churches.sort((a, b) {
          if (a.foundingYear == null && b.foundingYear == null) return 0;
          if (a.foundingYear == null) return 1;
          if (b.foundingYear == null) return -1;
          return a.foundingYear!.compareTo(b.foundingYear!);
        });
        break;
      case SortOption.distance:
        if (_currentFilter.userLatitude != null &&
            _currentFilter.userLongitude != null) {
          churches.sort((a, b) {
            final distanceA = a.distanceFrom(
              _currentFilter.userLatitude!,
              _currentFilter.userLongitude!,
            );
            final distanceB = b.distanceFrom(
              _currentFilter.userLatitude!,
              _currentFilter.userLongitude!,
            );

            if (distanceA == null && distanceB == null) return 0;
            if (distanceA == null) return 1;
            if (distanceB == null) return -1;
            return distanceA.compareTo(distanceB);
          });
        }
        break;
      case SortOption.heritage:
        churches.sort((a, b) {
          final aValue = _getHeritageValue(a.heritageClassification);
          final bValue = _getHeritageValue(b.heritageClassification);
          return bValue.compareTo(aValue); // Descending order (NCT, ICP, None)
        });
        break;
    }
  }

  int _getHeritageValue(HeritageClassification classification) {
    switch (classification) {
      case HeritageClassification.nct:
        return 3;
      case HeritageClassification.icp:
        return 2;
      case HeritageClassification.nonHeritage:
        return 1;
      case HeritageClassification.none:
        return 1;
    }
  }

  // Get available founding year range from all churches
  RangeValues getFoundingYearRange() {
    if (_allChurches.isEmpty) return const RangeValues(1500, 2024);

    final years = _allChurches
        .where((church) => church.foundingYear != null)
        .map((church) => church.foundingYear!.toDouble())
        .toList();

    if (years.isEmpty) return const RangeValues(1500, 2024);

    years.sort();
    return RangeValues(years.first, years.last);
  }

  // Get church by ID (offline-first)
  Future<Church?> getChurchById(String id) async {
    // First check in-memory cache
    final cachedChurch = _allChurches.where((c) => c.id == id).firstOrNull;
    if (cachedChurch != null) {
      return cachedChurch;
    }

    // Try offline repository
    return await _offlineRepository.getChurchById(id);
  }

  // Search churches by query
  void searchChurches(String query) {
    _currentFilter = _currentFilter.copyWith(searchQuery: query);
    _applyFilters();
  }

  // Toggle architectural style filter
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

  // Toggle heritage classification filter
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

  // Toggle diocese filter
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

  // Set founding year range
  void setFoundingYearRange(RangeValues? range) {
    _currentFilter = _currentFilter.copyWith(foundingYearRange: range);
    _applyFilters();
  }

  // Clear founding year range
  void clearFoundingYearRange() {
    _currentFilter = _currentFilter.copyWith(foundingYearRange: null);
    _applyFilters();
  }

  // Set sort option
  void setSortOption(SortOption sortOption) {
    _currentFilter = _currentFilter.copyWith(sortBy: sortOption);
    _applyFilters();
  }

  // Get statistics (offline data)
  Map<String, int> getStatistics() {
    return _offlineRepository.getStatistics();
  }

  // Get municipalities (offline data)
  List<String> getMunicipalities() {
    return _offlineRepository.getMunicipalities();
  }

  // Get architectural styles (offline data)
  List<ArchitecturalStyle> getArchitecturalStyles() {
    return _offlineRepository.getArchitecturalStyles();
  }

  // Get cache info
  Map<String, dynamic> getCacheInfo() {
    return {
      ..._offlineRepository.getCacheInfo(),
      'filterActive': _currentFilter.hasActiveFilters,
      'filteredCount': _filteredChurches.length,
      'totalCount': _allChurches.length,
      'connectivityStatus': _connectivity.statusString,
      'syncStatus': _syncService.status.name,
    };
  }

  // Private helper methods
  void _setLoading(bool loading) {
    if (_isLoading != loading) {
      _isLoading = loading;
      notifyListeners();
    }
  }

  // Clear cache
  Future<void> clearCache() async {
    await _offlineRepository.clearCache();
    _allChurches.clear();
    _filteredChurches.clear();
    notifyListeners();
  }
}