import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:geolocator/geolocator.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'church.dart';
import '../utils/constants.dart';
import '../services/visitor_validation_service.dart';
import '../services/visitor_log_service.dart';

class AppState extends ChangeNotifier {
  List<Church> _visited = [];
  List<Church> _forVisit = [];

  List<Church> get visited => _visited;
  List<Church> get forVisit => _forVisit;

  // Tracks last validated church id (after location check)
  String? _lastValidatedChurchId;
  String? get lastValidatedChurchId => _lastValidatedChurchId;
  void setLastValidatedChurch(String id) {
    _lastValidatedChurchId = id;
    notifyListeners();
  }

  Future<void> loadFromPrefs(List<Church> allChurches) async {
    final prefs = await SharedPreferences.getInstance();
    final v = prefs.getStringList(AppConstants.visitedChurchIds) ?? [];
    final f = prefs.getStringList(AppConstants.forVisitChurchIds) ?? [];
    _visited = allChurches.where((c) => v.contains(c.id)).toList();
    _forVisit = allChurches.where((c) => f.contains(c.id)).toList();
    notifyListeners();
  }

  Future<void> _savePrefs() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(
        AppConstants.visitedChurchIds, _visited.map((e) => e.id).toList());
    await prefs.setStringList(
        AppConstants.forVisitChurchIds, _forVisit.map((e) => e.id).toList());
  }

  /// Mark church as visited with location validation
  /// Returns ValidationResult indicating success or failure
  Future<ValidationResult> markVisitedWithValidation(
    Church church,
    Position userPosition,
  ) async {
    // Validate proximity to church
    final validationResult = await VisitorValidationService.validateProximity(
      church: church,
      userPosition: userPosition,
    );

    if (!validationResult.isValid) {
      return validationResult;
    }

    // Validation passed - mark as visited locally
    if (!_visited.contains(church)) {
      _visited.add(church);
      _forVisit.remove(church);
      await _savePrefs();
      notifyListeners();
    }

    // Log visit to Firestore for analytics
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
      debugPrint('⚠️ Failed to log visit to Firestore: $error');
      // Don't fail the whole operation if logging fails
    }

    return validationResult;
  }

  /// Legacy method for backward compatibility (no validation)
  /// Use markVisitedWithValidation() for new code
  void markVisited(Church c) {
    if (!_visited.contains(c)) {
      _visited.add(c);
      _forVisit.remove(c);
      _savePrefs();
      notifyListeners();
    }
  }

  void markForVisit(Church c) {
    if (!_forVisit.contains(c)) {
      _forVisit.add(c);
      _savePrefs();
      notifyListeners();
    }
  }

  void unmarkVisited(Church c) {
    _visited.remove(c);
    _savePrefs();
    notifyListeners();
  }

  void unmarkForVisit(Church c) {
    _forVisit.remove(c);
    _savePrefs();
    notifyListeners();
  }

  bool isVisited(Church c) => _visited.any((e) => e.id == c.id);
  bool isForVisit(Church c) => _forVisit.any((e) => e.id == c.id);
}
