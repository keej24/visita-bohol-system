import 'package:flutter/material.dart';
import '../models/church.dart';
import '../models/enhanced_filter.dart';
import '../models/enums.dart';
import '../services/location_service.dart';
import '../services/local_data_service.dart';

class EnhancedChurchService extends ChangeNotifier {
  final LocalDataService _localDataService;
  final LocationService _locationService;

  List<Church> _allChurches = [];
  List<Church> _filteredChurches = [];
  EnhancedChurchFilter _currentFilter = const EnhancedChurchFilter();
  bool _isLoading = false;
  String? _errorMessage;

  EnhancedChurchService(this._localDataService, this._locationService);

  // Getters
  List<Church> get filteredChurches => _filteredChurches;
  List<Church> get allChurches => _allChurches;
  EnhancedChurchFilter get currentFilter => _currentFilter;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  // Initialize and load churches
  Future<void> initialize() async {
    await loadChurches();
  }

  // Load all churches (only approved ones for public users)
  Future<void> loadChurches() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final allChurches = await _localDataService.loadChurches();
      // Filter to only show approved churches for public users
      _allChurches =
          allChurches.where((church) => church.isPublicVisible).toList();
      assert(() {
        debugPrint(
            '🏛️ Loaded ${_allChurches.length} approved churches out of ${allChurches.length} total');
        return true;
      }());
      _applyFilters();
    } catch (e) {
      _errorMessage = 'Failed to load churches: ${e.toString()}';
    } finally {
      _isLoading = false;
      notifyListeners();
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

  // Apply all filters
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

  // Apply sorting to filtered results
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

  // Get church by ID
  Church? getChurchById(String id) {
    try {
      return _allChurches.firstWhere((church) => church.id == id);
    } catch (e) {
      return null;
    }
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
}
