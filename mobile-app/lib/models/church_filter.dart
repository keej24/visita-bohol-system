import 'church.dart';
import 'enums.dart';

class ChurchFilterCriteria {
  final String search;
  final bool heritageOnly;
  final int? foundingYear;
  final Diocese? diocese; // null => all

  const ChurchFilterCriteria({
    this.search = '',
    this.heritageOnly = false,
    this.foundingYear,
    this.diocese,
  });

  ChurchFilterCriteria copyWith({
    String? search,
    bool? heritageOnly,
    int? foundingYear,
    Diocese? diocese,
  }) =>
      ChurchFilterCriteria(
        search: search ?? this.search,
        heritageOnly: heritageOnly ?? this.heritageOnly,
        foundingYear: foundingYear ?? this.foundingYear,
        diocese: diocese ?? this.diocese,
      );
}

List<Church> applyChurchFilter(List<Church> source, ChurchFilterCriteria c) {
  final s = c.search.toLowerCase();
  return source.where((church) {
    if (s.isNotEmpty) {
      final match = church.name.toLowerCase().contains(s) ||
          church.location.toLowerCase().contains(s);
      if (!match) return false;
    }
    if (c.heritageOnly && !church.isHeritage) return false;
    if (c.foundingYear != null && church.foundingYear != c.foundingYear) {
      return false;
    }
    if (c.diocese != null && church.diocese != c.diocese!.label) {
      return false;
    }
    return true;
  }).toList();
}
