/// =============================================================================
/// CHURCH_DETAIL_SCREEN.DART - Export Barrel for Church Detail Screen
/// =============================================================================
///
/// PURPOSE:
/// This file is a "barrel export" that re-exports the actual implementation
/// from church_detail_screen_modern.dart. This pattern allows code throughout
/// the app to import from a stable filename while the implementation can be
/// changed or versioned independently.
///
/// WHY THIS PATTERN:
/// - Historical: The app previously had different versions of this screen
/// - Clean imports: Other files just import 'church_detail_screen.dart'
/// - Easy swapping: Can point to different implementations if needed
/// - Single source: Avoids confusion about which file to import
///
/// ACTUAL IMPLEMENTATION: church_detail_screen_modern.dart
///
export 'church_detail_screen_modern.dart';
