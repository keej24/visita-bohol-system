/// =============================================================================
/// APP STATE - USER'S CHURCH VISIT TRACKING
/// =============================================================================
///
/// FILE PURPOSE:
/// This file manages the user's personal visit data - which churches they've
/// visited and which ones they want to visit (their "For Visit" list).
///
/// WHAT IT TRACKS:
/// - Visited: Churches the user has physically been to (validated by GPS)
/// - For Visit: Churches the user wants to visit (like a wishlist)
///
/// KEY CONCEPTS:
///
/// 1. CHANGENOTIFIER PATTERN:
///    - AppState extends ChangeNotifier (from Flutter)
///    - When data changes, we call notifyListeners()
///    - This tells all widgets using this data to rebuild
///    - Like saying "hey everyone, the data changed!"
///
/// 2. DATA STORAGE (TWO PLACES):
///    - Firestore (cloud): Sync across devices, works when logged in
///    - SharedPreferences (local): Works offline, faster access
///    - We try Firestore first, fall back to local if it fails
///
/// 3. LOCATION VALIDATION:
///    - Users must be within 500 meters to mark a visit
///    - This prevents fake visits (can't mark visited from home)
///    - Uses GPS to verify location
///
/// HOW THE UI USES THIS:
/// ```dart
/// // In a widget:
/// Consumer<AppState>(
///   builder: (context, appState, child) {
///     return Text('Visited: ${appState.visited.length} churches');
///   },
/// );
/// ```
///
/// RELATED FILES:
/// - visitor_validation_service.dart: GPS proximity checking
/// - visitor_log_service.dart: Firestore logging
/// - profile_service.dart: User profile updates
/// =============================================================================

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:geolocator/geolocator.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'church.dart';
import '../utils/constants.dart';
import '../services/visitor_validation_service.dart';
import '../services/visitor_log_service.dart';
import '../services/profile_service.dart';

/// AppState manages the user's personal church visit tracking.
///
/// This class uses the ChangeNotifier pattern from Flutter to notify
/// widgets when data changes, allowing automatic UI updates.
///
/// PROPERTIES:
/// - visited: List of churches the user has physically visited
/// - forVisit: List of churches the user wants to visit (wishlist)
///
/// MAIN METHODS:
/// - markVisitedWithValidation(): Mark visited with GPS check
/// - markForVisit(): Add to wishlist
/// - loadVisitedChurches(): Load data from storage
class AppState extends ChangeNotifier {
  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE STATE VARIABLES
  // ─────────────────────────────────────────────────────────────────────────
  // Using _ prefix makes these private (Dart convention)
  // Access them through the getters below

  /// Churches the user has physically visited (validated by GPS)
  List<Church> _visited = [];

  /// Churches the user wants to visit (wishlist/bucket list)
  List<Church> _forVisit = [];

  /// Reference to ProfileService for syncing with user profile
  /// Optional because it's injected after construction
  ProfileService? _profileService;

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC GETTERS
  // ─────────────────────────────────────────────────────────────────────────
  // These expose the private lists as read-only to outside code

  /// Get the list of visited churches (read-only)
  List<Church> get visited => _visited;

  /// Get the list of churches marked "For Visit" (read-only)
  List<Church> get forVisit => _forVisit;

  // ─────────────────────────────────────────────────────────────────────────
  // DEPENDENCY INJECTION
  // ─────────────────────────────────────────────────────────────────────────

  /// Set the ProfileService reference for syncing visit data.
  ///
  /// This is called during app initialization to provide
  /// access to the user's profile for data synchronization.
  ///
  /// DEPENDENCY INJECTION EXPLAINED:
  /// Instead of creating ProfileService ourselves, we receive it
  /// from outside. This makes testing easier and reduces coupling.
  void setProfileService(ProfileService profileService) {
    _profileService = profileService;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOCATION VALIDATION TRACKING
  // ─────────────────────────────────────────────────────────────────────────

  /// Stores the ID of the last church validated by GPS.
  /// Used to prevent repeated validation checks.
  String? _lastValidatedChurchId;

  /// Get the last validated church ID (read-only)
  String? get lastValidatedChurchId => _lastValidatedChurchId;

  /// Record that a church was validated by GPS.
  /// UI can use this to show immediate feedback.
  void setLastValidatedChurch(String id) {
    _lastValidatedChurchId = id;
    notifyListeners(); // Tell widgets to update
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING DATA
  // ─────────────────────────────────────────────────────────────────────────

  /// Load the user's visit history from storage.
  ///
  /// This is called when the app starts to restore the user's data.
  ///
  /// DATA SOURCE PRIORITY:
  /// 1. Firestore (if user is logged in) - syncs across devices
  /// 2. SharedPreferences (local) - fallback for offline/errors
  ///
  /// HOW IT WORKS:
  /// 1. Check if user is logged in
  /// 2. If yes: Load from Firestore, save to local for offline access
  /// 3. If no: Load from local SharedPreferences
  ///
  /// [allChurches] is needed to convert church IDs back to Church objects
  Future<void> loadVisitedChurches(List<Church> allChurches) async {
    try {
      // Check if user is logged into Firebase
      final user = FirebaseAuth.instance.currentUser;

      if (user != null) {
        // ═══════════════════════════════════════════════════════════════════
        // USER IS LOGGED IN - Load from Firestore (cloud)
        // ═══════════════════════════════════════════════════════════════════
        debugPrint(
            '📥 Loading visited churches from Firestore for user: ${user.uid}');

        // Fetch visit history from Firestore
        final visitHistory =
            await VisitorLogService.getUserVisitHistory(userId: user.uid);

        // Extract unique church IDs from the visit records
        // Using toSet().toList() removes duplicates (if visited same church twice)
        final visitedChurchIds = visitHistory
            .map((visit) => visit['church_id'] as String)
            .toSet()
            .toList();

        debugPrint(
            '📥 Found ${visitedChurchIds.length} visited churches in Firestore');

        // Convert IDs to Church objects by finding matches in allChurches
        _visited =
            allChurches.where((c) => visitedChurchIds.contains(c.id)).toList();

        // Save to local storage for offline access
        await _savePrefs();

        debugPrint(
            '✅ Loaded ${_visited.length} visited churches from Firestore');

        // ─────────────────────────────────────────────────────────────────────
        // LOAD "FOR VISIT" LIST (from local storage, not Firestore)
        // ─────────────────────────────────────────────────────────────────────
        // The "For Visit" wishlist is stored locally only (SharedPreferences)
        // It's not synced to Firestore because it's personal/temporary
        final prefs = await SharedPreferences.getInstance();
        final forVisitIds =
            prefs.getStringList(AppConstants.forVisitChurchIds) ?? [];
        _forVisit =
            allChurches.where((c) => forVisitIds.contains(c.id)).toList();
        debugPrint(
            '✅ Loaded ${_forVisit.length} For Visit churches from SharedPreferences');
      } else {
        // ═══════════════════════════════════════════════════════════════════
        // USER NOT LOGGED IN - Load from local storage only
        // ═══════════════════════════════════════════════════════════════════
        debugPrint('📱 User not authenticated, loading from local cache');
        await loadFromPrefs(allChurches);
      }

      // Tell all listening widgets that data has changed
      notifyListeners();
    } catch (error) {
      // ═══════════════════════════════════════════════════════════════════
      // ERROR HANDLING - Fall back to local storage
      // ═══════════════════════════════════════════════════════════════════
      debugPrint('⚠️ Error loading visited churches from Firestore: $error');
      debugPrint('📱 Falling back to local storage');
      await loadFromPrefs(allChurches);
    }
  }

  /// Load data from SharedPreferences (local device storage).
  ///
  /// This is the fallback method when:
  /// - User is not logged in
  /// - Firestore fails (network error, etc.)
  /// - App is in offline mode
  ///
  /// SharedPreferences stores data as key-value pairs on the device.
  Future<void> loadFromPrefs(List<Church> allChurches) async {
    // Get SharedPreferences instance (async because it reads from disk)
    final prefs = await SharedPreferences.getInstance();

    // Load saved church ID lists (empty list if not found)
    final v = prefs.getStringList(AppConstants.visitedChurchIds) ?? [];
    final f = prefs.getStringList(AppConstants.forVisitChurchIds) ?? [];

    // Convert IDs to Church objects by matching with allChurches
    _visited = allChurches.where((c) => v.contains(c.id)).toList();
    _forVisit = allChurches.where((c) => f.contains(c.id)).toList();

    // Notify widgets that data changed
    notifyListeners();
  }

  /// Save current state to SharedPreferences.
  ///
  /// Called after any change to visited or forVisit lists.
  /// This ensures data persists even if the app is closed.
  Future<void> _savePrefs() async {
    final prefs = await SharedPreferences.getInstance();

    // Save just the IDs (not full Church objects) to keep it lightweight
    await prefs.setStringList(
        AppConstants.visitedChurchIds, _visited.map((e) => e.id).toList());
    await prefs.setStringList(
        AppConstants.forVisitChurchIds, _forVisit.map((e) => e.id).toList());
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MARKING CHURCHES AS VISITED
  // ─────────────────────────────────────────────────────────────────────────

  /// Mark a church as visited WITH GPS location validation.
  ///
  /// This is the main method for recording visits. It:
  /// 1. Checks if user is within 500 meters of the church
  /// 2. If valid: marks as visited and logs to Firestore
  /// 3. If not valid: returns error with distance info
  ///
  /// WHY VALIDATION?
  /// - Ensures users actually visit the church
  /// - Makes visit tracking meaningful
  /// - Prevents gaming the system
  ///
  /// [church] - The church being visited
  /// [userPosition] - User's current GPS coordinates
  ///
  /// Returns: ValidationResult with success/failure and distance info
  Future<ValidationResult> markVisitedWithValidation(
    Church church,
    Position userPosition,
  ) async {
    // ─────────────────────────────────────────────────────────────────────
    // STEP 1: Validate user is near the church (within 500m)
    // ─────────────────────────────────────────────────────────────────────
    final validationResult = await VisitorValidationService.validateProximity(
      church: church,
      userPosition: userPosition,
    );

    // If not close enough, return early with error
    if (!validationResult.isValid) {
      return validationResult;
    }

    // ─────────────────────────────────────────────────────────────────────
    // STEP 2: Update local state
    // ─────────────────────────────────────────────────────────────────────
    if (!_visited.contains(church)) {
      _visited.add(church); // Add to visited list
      _forVisit.remove(church); // Remove from wishlist (if present)
      await _savePrefs(); // Save to local storage
      notifyListeners(); // Update UI
    }

    // ─────────────────────────────────────────────────────────────────────
    // STEP 3: Log visit to Firestore (for analytics and cloud sync)
    // ─────────────────────────────────────────────────────────────────────
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        await VisitorLogService.logVisit(
          churchId: church.id,
          userId: user.uid,
          userPosition: userPosition,
          distanceFromChurch: validationResult.distance,
        );
        debugPrint('✅ Visit logged to Firestore successfully');
      }
    } catch (error) {
      // Don't fail if logging fails - local update already happened
      debugPrint('⚠️ Failed to log visit to Firestore: $error');
    }

    // ─────────────────────────────────────────────────────────────────────
    // STEP 4: Sync with ProfileService (updates user's profile stats)
    // ─────────────────────────────────────────────────────────────────────
    try {
      if (_profileService != null) {
        await _profileService!.markChurchAsVisited(church.id);
        debugPrint('✅ Profile updated with visited church: ${church.id}');
      } else {
        debugPrint('⚠️ ProfileService not available for sync');
      }
    } catch (error) {
      // Don't fail if profile update fails
      debugPrint('⚠️ Failed to update profile: $error');
    }

    return validationResult;
  }

  /// Mark a church as visited WITHOUT location validation.
  ///
  /// DEPRECATED: Use markVisitedWithValidation() for new code.
  ///
  /// This method exists for backward compatibility but should
  /// generally not be used because it doesn't verify the user
  /// actually visited the church.
  void markVisited(Church c) {
    if (!_visited.contains(c)) {
      _visited.add(c);
      _forVisit.remove(c); // Remove from wishlist if present
      _savePrefs();
      notifyListeners();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FOR VISIT WISHLIST MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  /// Add a church to the "For Visit" wishlist.
  ///
  /// Unlike visited, this doesn't require location validation.
  /// Users can add any church they want to visit later.
  void markForVisit(Church c) {
    if (!_forVisit.contains(c)) {
      _forVisit.add(c);
      _savePrefs();
      notifyListeners();
    }
  }

  /// Remove a church from the visited list.
  void unmarkVisited(Church c) {
    _visited.remove(c);
    _savePrefs();
    notifyListeners();
  }

  /// Remove a church from the "For Visit" wishlist.
  void unmarkForVisit(Church c) {
    _forVisit.remove(c);
    _savePrefs();
    notifyListeners();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATUS CHECKERS
  // ─────────────────────────────────────────────────────────────────────────

  /// Check if a church has been visited.
  /// Uses ID comparison (not object equality) for reliability.
  bool isVisited(Church c) => _visited.any((e) => e.id == c.id);

  /// Check if a church is in the "For Visit" wishlist.
  /// Uses ID comparison (not object equality) for reliability.
  bool isForVisit(Church c) => _forVisit.any((e) => e.id == c.id);
}
