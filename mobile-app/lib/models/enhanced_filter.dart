import 'package:flutter/material.dart';
import 'enums.dart';

class EnhancedChurchFilter {
  final String? searchQuery;
  final RangeValues? foundingYearRange;
  final Set<ArchitecturalStyle> architecturalStyles;
  final Set<HeritageClassification> heritageClassifications;
  final Set<Diocese> dioceses;
  final double? nearMeRadius; // in kilometers
  final double? userLatitude;
  final double? userLongitude;
  final bool showNearMeOnly;
  final SortOption sortBy;

  const EnhancedChurchFilter({
    this.searchQuery,
    this.foundingYearRange,
    this.architecturalStyles = const {},
    this.heritageClassifications = const {},
    this.dioceses = const {},
    this.nearMeRadius,
    this.userLatitude,
    this.userLongitude,
    this.showNearMeOnly = false,
    this.sortBy = SortOption.name,
  });

  bool get hasActiveFilters {
    return searchQuery?.isNotEmpty == true ||
        foundingYearRange != null ||
        architecturalStyles.isNotEmpty ||
        heritageClassifications.isNotEmpty ||
        dioceses.isNotEmpty ||
        showNearMeOnly;
  }

  int get activeFilterCount {
    int count = 0;
    if (searchQuery?.isNotEmpty == true) count++;
    if (foundingYearRange != null) count++;
    if (architecturalStyles.isNotEmpty) count++;
    if (heritageClassifications.isNotEmpty) count++;
    if (dioceses.isNotEmpty) count++;
    if (showNearMeOnly) count++;
    return count;
  }

  EnhancedChurchFilter copyWith({
    String? searchQuery,
    RangeValues? foundingYearRange,
    Set<ArchitecturalStyle>? architecturalStyles,
    Set<HeritageClassification>? heritageClassifications,
    Set<Diocese>? dioceses,
    double? nearMeRadius,
    double? userLatitude,
    double? userLongitude,
    bool? showNearMeOnly,
    SortOption? sortBy,
  }) {
    return EnhancedChurchFilter(
      searchQuery: searchQuery ?? this.searchQuery,
      foundingYearRange: foundingYearRange ?? this.foundingYearRange,
      architecturalStyles: architecturalStyles ?? this.architecturalStyles,
      heritageClassifications:
          heritageClassifications ?? this.heritageClassifications,
      dioceses: dioceses ?? this.dioceses,
      nearMeRadius: nearMeRadius ?? this.nearMeRadius,
      userLatitude: userLatitude ?? this.userLatitude,
      userLongitude: userLongitude ?? this.userLongitude,
      showNearMeOnly: showNearMeOnly ?? this.showNearMeOnly,
      sortBy: sortBy ?? this.sortBy,
    );
  }

  EnhancedChurchFilter reset() {
    return const EnhancedChurchFilter();
  }
}

enum SortOption {
  name,
  foundingYear,
  distance,
  heritage,
}

extension SortOptionX on SortOption {
  String get label {
    switch (this) {
      case SortOption.name:
        return 'Name (A-Z)';
      case SortOption.foundingYear:
        return 'Founding Year';
      case SortOption.distance:
        return 'Distance';
      case SortOption.heritage:
        return 'Heritage Status';
    }
  }
}
