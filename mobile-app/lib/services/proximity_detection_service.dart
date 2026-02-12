/// =============================================================================
/// PROXIMITY DETECTION SERVICE - Auto Visit via GPS Stream
/// =============================================================================
///
/// PURPOSE:
/// Listens to the device's GPS position stream while the church detail screen
/// is open. When the user enters the church's proximity radius (200 m), it
/// automatically triggers "Mark as Visited" — no button press needed.
///
/// HOW IT WORKS:
/// 1. Start listening to GPS position updates (foreground only)
/// 2. On each update, check distance to the target church
/// 3. If within 200 m and church not already visited → auto-mark
/// 4. Fire a callback so the UI can show a success message
/// 5. Stop listening after a successful auto-visit or on dispose
///
/// BATTERY CONSIDERATIONS:
/// - Uses distanceFilter of 20 m — updates only on meaningful movement
/// - Stream is active only while church detail screen is open (foreground)
/// - Automatically cancelled after successful auto-visit
///
/// RELATED FILES:
/// - services/visitor_validation_service.dart: Reused for proximity math
/// - models/app_state.dart: markVisitedWithValidation() for persistence
/// - screens/church_detail_screen_modern.dart: UI integration
/// =============================================================================

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import '../models/church.dart';
import 'visitor_validation_service.dart';

/// Callback signature fired when auto-visit is triggered.
///
/// [result] contains validation details (distance, message, etc.)
typedef OnAutoVisitDetected = Future<void> Function(
    Position position, ValidationResult result);

/// ProximityDetectionService manages a foreground GPS stream that
/// automatically detects when a user arrives at a church.
class ProximityDetectionService {
  // ─────────────────────────────────────────────────────────────────────────
  // CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────

  /// Minimum movement (in meters) before the OS delivers a new position.
  /// 20 m keeps updates infrequent enough to save battery while still
  /// detecting arrival quickly.
  static const int _distanceFilterMeters = 20;

  // ─────────────────────────────────────────────────────────────────────────
  // INTERNAL STATE
  // ─────────────────────────────────────────────────────────────────────────

  StreamSubscription<Position>? _positionSubscription;
  bool _autoVisitTriggered = false;
  bool _isListening = false;

  /// Whether the service is currently listening to position updates.
  bool get isListening => _isListening;

  /// Whether an auto-visit has already been triggered in this session.
  bool get autoVisitTriggered => _autoVisitTriggered;

  // ─────────────────────────────────────────────────────────────────────────
  // START LISTENING
  // ─────────────────────────────────────────────────────────────────────────

  /// Begin monitoring the user's position relative to [church].
  ///
  /// Preconditions (caller must ensure before calling):
  /// - Location permission is granted
  /// - Location services are enabled
  /// - User is authenticated (not a guest)
  /// - Church is not already visited
  /// - Platform is not web (`!kIsWeb`)
  ///
  /// [church] — the church to monitor proximity for.
  /// [onAutoVisitDetected] — called once when the user enters the radius.
  /// [onError] — optional error callback.
  void startListening({
    required Church church,
    required OnAutoVisitDetected onAutoVisitDetected,
    void Function(String error)? onError,
  }) {
    // Guard: don't start twice or after already triggered
    if (_isListening || _autoVisitTriggered) return;

    // Guard: church must have coordinates
    if (church.latitude == null || church.longitude == null) {
      debugPrint('⚠️ ProximityDetection: Church has no coordinates, skipping.');
      return;
    }

    debugPrint(
        '📍 ProximityDetection: Starting location stream for "${church.name}"');

    _isListening = true;

    final locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: _distanceFilterMeters,
    );

    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen(
      (Position position) async {
        // Prevent re-entry if already triggered
        if (_autoVisitTriggered) return;

        debugPrint('📍 ProximityDetection: Position update — '
            '(${position.latitude.toStringAsFixed(5)}, '
            '${position.longitude.toStringAsFixed(5)})');

        // Check proximity using the same validation the manual button uses
        final result = await VisitorValidationService.validateProximity(
          church: church,
          userPosition: position,
        );

        if (result.isValid) {
          debugPrint('✅ ProximityDetection: User is within range! '
              'Distance: ${result.distance?.toStringAsFixed(0)}m');

          _autoVisitTriggered = true;
          stopListening();

          // Notify the UI / caller to complete the visit
          await onAutoVisitDetected(position, result);
        } else {
          debugPrint(
              '📍 ProximityDetection: Still ${result.distance?.toStringAsFixed(0)}m away');
        }
      },
      onError: (error) {
        debugPrint('❌ ProximityDetection: Stream error — $error');
        onError?.call(error.toString());
      },
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STOP LISTENING
  // ─────────────────────────────────────────────────────────────────────────

  /// Cancel the position stream. Safe to call multiple times.
  void stopListening() {
    if (_positionSubscription != null) {
      debugPrint('📍 ProximityDetection: Stopping location stream');
      _positionSubscription?.cancel();
      _positionSubscription = null;
    }
    _isListening = false;
  }

  /// Full cleanup — cancel stream and reset state.
  /// Call this in the widget's `dispose()`.
  void dispose() {
    stopListening();
    _autoVisitTriggered = false;
  }
}
