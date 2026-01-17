import 'church.dart';
import 'enums.dart';
import 'package:flutter/material.dart';

class ChurchFilterCriteria {
  final String search;
  final bool heritageOnly;
  final int? foundingYear;
  final Diocese? diocese; // null => all (for basic filter dropdown)
  final HeritageClassification? heritageClassification; // null => all
  final ArchitecturalStyle? architecturalStyle; // null => all
  final String? location; // location-based filtering

  // Advanced filter fields (multi-select)
  final RangeValues? foundingYearRange;
  final Set<ArchitecturalStyle> architecturalStyles;
  final Set<HeritageClassification> heritageClassifications;
  final Set<ReligiousClassification> religiousClassifications;
  final Set<Diocese> dioceses;

  const ChurchFilterCriteria({
    this.search = '',
    this.heritageOnly = false,
    this.foundingYear,
    this.diocese,
    this.heritageClassification,
    this.architecturalStyle,
    this.location,
    this.foundingYearRange,
    this.architecturalStyles = const {},
    this.heritageClassifications = const {},
    this.religiousClassifications = const {},
    this.dioceses = const {},
  });

  ChurchFilterCriteria copyWith({
    String? search,
    bool? heritageOnly,
    Object? foundingYear = _undefined,
    Object? diocese = _undefined,
    Object? heritageClassification = _undefined,
    Object? architecturalStyle = _undefined,
    Object? location = _undefined,
    Object? foundingYearRange = _undefined,
    Set<ArchitecturalStyle>? architecturalStyles,
    Set<HeritageClassification>? heritageClassifications,
    Set<ReligiousClassification>? religiousClassifications,
    Set<Diocese>? dioceses,
  }) =>
      ChurchFilterCriteria(
        search: search ?? this.search,
        heritageOnly: heritageOnly ?? this.heritageOnly,
        foundingYear: foundingYear == _undefined
            ? this.foundingYear
            : foundingYear as int?,
        diocese: diocese == _undefined ? this.diocese : diocese as Diocese?,
        heritageClassification: heritageClassification == _undefined
            ? this.heritageClassification
            : heritageClassification as HeritageClassification?,
        architecturalStyle: architecturalStyle == _undefined
            ? this.architecturalStyle
            : architecturalStyle as ArchitecturalStyle?,
        location: location == _undefined ? this.location : location as String?,
        foundingYearRange: foundingYearRange == _undefined
            ? this.foundingYearRange
            : foundingYearRange as RangeValues?,
        architecturalStyles: architecturalStyles ?? this.architecturalStyles,
        heritageClassifications:
            heritageClassifications ?? this.heritageClassifications,
        religiousClassifications:
            religiousClassifications ?? this.religiousClassifications,
        dioceses: dioceses ?? this.dioceses,
      );

  // Check if any advanced filters are active
  bool get hasAdvancedFilters =>
      search.isNotEmpty ||
      heritageOnly ||
      foundingYear != null ||
      diocese != null ||
      heritageClassification != null ||
      architecturalStyle != null ||
      location != null ||
      foundingYearRange != null ||
      architecturalStyles.isNotEmpty ||
      heritageClassifications.isNotEmpty ||
      religiousClassifications.isNotEmpty ||
      dioceses.isNotEmpty;

  // Get count of active filters
  int get activeFilterCount {
    int count = 0;
    if (search.isNotEmpty) count++;
    if (heritageOnly) count++;
    if (foundingYear != null) count++;
    if (diocese != null) count++;
    if (heritageClassification != null) count++;
    if (architecturalStyle != null) count++;
    if (location != null) count++;
    if (foundingYearRange != null) count++;
    if (architecturalStyles.isNotEmpty) count++;
    if (heritageClassifications.isNotEmpty) count++;
    if (religiousClassifications.isNotEmpty) count++;
    if (dioceses.isNotEmpty) count++;
    return count;
  }

  // Check if any advanced multi-select filters are active
  bool get hasActiveAdvancedFilters =>
      foundingYearRange != null ||
      architecturalStyles.isNotEmpty ||
      heritageClassifications.isNotEmpty ||
      religiousClassifications.isNotEmpty ||
      dioceses.isNotEmpty;

  // Get count of advanced filters only
  int get advancedFilterCount {
    int count = 0;
    if (foundingYearRange != null) count++;
    if (architecturalStyles.isNotEmpty) count++;
    if (heritageClassifications.isNotEmpty) count++;
    if (religiousClassifications.isNotEmpty) count++;
    if (dioceses.isNotEmpty) count++;
    return count;
  }
}

const _undefined = Object();

List<Church> applyChurchFilter(List<Church> source, ChurchFilterCriteria c) {
  final s = c.search.toLowerCase();
  return source.where((church) {
    // Only show approved churches to public users
    if (!church.isPublicVisible) return false;

    // Text search in church name, location, and history
    if (s.isNotEmpty) {
      final match = church.name.toLowerCase().contains(s) ||
          church.location.toLowerCase().contains(s) ||
          (church.history != null && church.history!.toLowerCase().contains(s));
      if (!match) return false;
    }

    // Heritage filter - check both isHeritage flag and heritage classification
    if (c.heritageOnly) {
      final isHeritageChurch = church.isHeritage ||
          church.heritageClassification == HeritageClassification.icp ||
          church.heritageClassification == HeritageClassification.nct;
      if (!isHeritageChurch) return false;
    }

    // Heritage classification filter (more specific)
    if (c.heritageClassification != null &&
        church.heritageClassification != c.heritageClassification) {
      return false;
    }

    // Architectural style filter
    if (c.architecturalStyle != null &&
        church.architecturalStyle != c.architecturalStyle) {
      return false;
    }

    // Founding year filter
    if (c.foundingYear != null && church.foundingYear != c.foundingYear) {
      return false;
    }

    // Diocese filter (basic)
    if (c.diocese != null && church.diocese != c.diocese!.label) {
      return false;
    }

    // Location filter (municipality or barangay)
    if (c.location != null && c.location!.isNotEmpty) {
      final locationMatch =
          church.location.toLowerCase().contains(c.location!.toLowerCase());
      if (!locationMatch) return false;
    }

    // Advanced filters (multi-select)

    // Founding year range filter
    if (c.foundingYearRange != null && church.foundingYear != null) {
      if (church.foundingYear! < c.foundingYearRange!.start.round() ||
          church.foundingYear! > c.foundingYearRange!.end.round()) {
        return false;
      }
    }

    // Architectural styles filter (multi-select)
    if (c.architecturalStyles.isNotEmpty) {
      if (!c.architecturalStyles.contains(church.architecturalStyle)) {
        return false;
      }
    }

    // Heritage classifications filter (multi-select)
    if (c.heritageClassifications.isNotEmpty) {
      if (!c.heritageClassifications.contains(church.heritageClassification)) {
        return false;
      }
    }

    // Religious classifications filter (multi-select)
    // Match if church has ANY of the selected classifications
    if (c.religiousClassifications.isNotEmpty) {
      final churchClassifications = church.allReligiousClassifications;
      final hasMatch = c.religiousClassifications
          .any((filterClass) => churchClassifications.contains(filterClass));
      if (!hasMatch) {
        return false;
      }
    }

    // Dioceses filter (multi-select)
    if (c.dioceses.isNotEmpty) {
      final matchesDiocese = c.dioceses.any((d) => church.diocese == d.label);
      if (!matchesDiocese) {
        return false;
      }
    }

    return true;
  }).toList();
}

// Helper function to get churches by specific criteria
List<Church> getHeritageChurches(List<Church> source) {
  return source
      .where((church) =>
          church.isPublicVisible &&
          (church.heritageClassification == HeritageClassification.icp ||
              church.heritageClassification == HeritageClassification.nct))
      .toList();
}

List<Church> getChurchesByDiocese(List<Church> source, Diocese diocese) {
  return source
      .where(
          (church) => church.isPublicVisible && church.diocese == diocese.label)
      .toList();
}

List<Church> getChurchesByArchitecturalStyle(
    List<Church> source, ArchitecturalStyle style) {
  return source
      .where((church) =>
          church.isPublicVisible && church.architecturalStyle == style)
      .toList();
}
