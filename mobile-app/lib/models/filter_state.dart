import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'enums.dart';
import '../utils/constants.dart';
import 'church_filter.dart';

class FilterState extends ChangeNotifier {
  ChurchFilterCriteria _criteria = const ChurchFilterCriteria();
  ChurchFilterCriteria get criteria => _criteria;

  bool _loaded = false;
  bool get loaded => _loaded;

  Future<void> load() async {
    if (_loaded) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final search = prefs.getString(AppConstants.filterSearch) ?? '';
      final dioceseLabel = prefs.getString(AppConstants.filterDiocese);
      Diocese? diocese;
      if (dioceseLabel != null && dioceseLabel != 'All') {
        diocese = DioceseX.fromLabel(dioceseLabel);
      }
      const heritageOnly = false; // legacy persisted flag not yet added
      _criteria = ChurchFilterCriteria(
        search: search,
        heritageOnly: heritageOnly,
        diocese: diocese,
      );
      _loaded = true;
      notifyListeners();
    } catch (_) {
      _loaded = true; // avoid retry loop
      notifyListeners();
    }
  }

  Future<void> _persist() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(AppConstants.filterSearch, _criteria.search);
      await prefs.setString(
          AppConstants.filterDiocese, _criteria.diocese?.label ?? 'All');
    } catch (_) {}
  }

  void setSearch(String v) {
    if (v == _criteria.search) return;
    _criteria = _criteria.copyWith(search: v);
    notifyListeners();
    _persist();
  }

  void setDiocese(Diocese? d) {
    if (d == _criteria.diocese) return;
    _criteria = _criteria.copyWith(diocese: d);
    notifyListeners();
    _persist();
  }

  void toggleHeritage() {
    _criteria = _criteria.copyWith(heritageOnly: !_criteria.heritageOnly);
    notifyListeners();
    _persist();
  }

  void reset() {
    _criteria = const ChurchFilterCriteria();
    notifyListeners();
    _persist();
  }

  // Advanced filter methods
  void setAdvancedFilters({
    RangeValues? foundingYearRange,
    Set<ArchitecturalStyle>? architecturalStyles,
    Set<HeritageClassification>? heritageClassifications,
    Set<ReligiousClassification>? religiousClassifications,
    Set<Diocese>? dioceses,
  }) {
    _criteria = _criteria.copyWith(
      foundingYearRange: foundingYearRange,
      architecturalStyles: architecturalStyles,
      heritageClassifications: heritageClassifications,
      religiousClassifications: religiousClassifications,
      dioceses: dioceses,
    );
    notifyListeners();
  }

  void resetAdvancedFilters() {
    _criteria = _criteria.copyWith(
      foundingYearRange: null,
      architecturalStyles: const {},
      heritageClassifications: const {},
      religiousClassifications: const {},
      dioceses: const {},
    );
    notifyListeners();
  }
}
