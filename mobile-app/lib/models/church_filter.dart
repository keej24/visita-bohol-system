import 'church.dart';
import 'enums.dart';

class ChurchFilterCriteria {
  final String search;
  final bool heritageOnly;
  final int? foundingYear;
  final Diocese? diocese; // null => all
  final HeritageClassification? heritageClassification; // null => all
  final ArchitecturalStyle? architecturalStyle; // null => all
  final String? location; // location-based filtering

  const ChurchFilterCriteria({
    this.search = '',
    this.heritageOnly = false,
    this.foundingYear,
    this.diocese,
    this.heritageClassification,
    this.architecturalStyle,
    this.location,
  });

  ChurchFilterCriteria copyWith({
    String? search,
    bool? heritageOnly,
    Object? foundingYear = _undefined,
    Object? diocese = _undefined,
    Object? heritageClassification = _undefined,
    Object? architecturalStyle = _undefined,
    Object? location = _undefined,
  }) =>
      ChurchFilterCriteria(
        search: search ?? this.search,
        heritageOnly: heritageOnly ?? this.heritageOnly,
        foundingYear: foundingYear == _undefined ? this.foundingYear : foundingYear as int?,
        diocese: diocese == _undefined ? this.diocese : diocese as Diocese?,
        heritageClassification: heritageClassification == _undefined ? this.heritageClassification : heritageClassification as HeritageClassification?,
        architecturalStyle: architecturalStyle == _undefined ? this.architecturalStyle : architecturalStyle as ArchitecturalStyle?,
        location: location == _undefined ? this.location : location as String?,
      );

  // Check if any advanced filters are active
  bool get hasAdvancedFilters =>
      search.isNotEmpty ||
      heritageOnly ||
      foundingYear != null ||
      diocese != null ||
      heritageClassification != null ||
      architecturalStyle != null ||
      location != null;

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

    // Diocese filter
    if (c.diocese != null && church.diocese != c.diocese!.label) {
      return false;
    }

    // Location filter (municipality or barangay)
    if (c.location != null && c.location!.isNotEmpty) {
      final locationMatch = church.location.toLowerCase().contains(c.location!.toLowerCase());
      if (!locationMatch) return false;
    }

    return true;
  }).toList();
}

// Helper function to get churches by specific criteria
List<Church> getHeritageChurches(List<Church> source) {
  return source.where((church) =>
      church.isPublicVisible &&
      (church.heritageClassification == HeritageClassification.icp ||
       church.heritageClassification == HeritageClassification.nct)
  ).toList();
}

List<Church> getChurchesByDiocese(List<Church> source, Diocese diocese) {
  return source.where((church) =>
      church.isPublicVisible &&
      church.diocese == diocese.label
  ).toList();
}

List<Church> getChurchesByArchitecturalStyle(List<Church> source, ArchitecturalStyle style) {
  return source.where((church) =>
      church.isPublicVisible &&
      church.architecturalStyle == style
  ).toList();
}
