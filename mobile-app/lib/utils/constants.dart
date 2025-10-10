/// Centralized constants for asset paths, shared preferences keys, etc.
class AppConstants {
  // Asset roots
  static const churchesJson = 'assets/data/churches.json';
  static const announcementsJson = 'assets/data/announcements.json';

  // Shared Preferences keys
  static const visitedChurchIds = 'visited_church_ids';
  static const forVisitChurchIds = 'forvisit_church_ids';

  // UI state persistence
  static const lastTabIndex = 'last_tab_index';
  static const filterSearch = 'filter_search';
  static const filterLocation = 'filter_location';
  static const filterClassification = 'filter_classification';
  static const filterDiocese = 'filter_diocese';
}
