/// =============================================================================
/// VISITOR VALIDATION SERVICE - GPS PROXIMITY CHECKING
/// =============================================================================
///
/// FILE PURPOSE:
/// This service validates that users are physically near a church before
/// they can mark it as "visited." It prevents fake visits from home.
///
/// WHY THIS EXISTS:
/// - Makes visit tracking meaningful and authentic
/// - Users must physically go to churches to mark them visited
/// - Creates a "proof of presence" through GPS verification
/// - Encourages actual church pilgrimages
///
/// HOW IT WORKS:
/// 1. User taps "Mark as Visited" button
/// 2. App gets user's current GPS location
/// 3. This service calculates distance to church
/// 4. If distance ≤ 500 meters → VALID (can mark visited)
/// 5. If distance > 500 meters → INVALID (shows distance error)
///
/// THE MATH:
/// Uses the Haversine formula (via Geolocator package) to calculate
/// the distance between two GPS coordinates on Earth's surface.
///
/// CONFIGURATION:
/// - visitRadiusMeters: 500 meters (adjustable constant)
/// - This is generous enough for large church grounds
/// - But restrictive enough to require actual presence
///
/// RELATED FILES:
/// - models/app_state.dart: Calls this service for visit validation
/// - screens/church_detail_screen.dart: UI for marking visits
/// - services/visitor_log_service.dart: Logs validated visits to Firestore
/// =============================================================================

import 'package:geolocator/geolocator.dart';
import '../models/church.dart';

/// VisitorValidationService provides GPS-based proximity validation.
///
/// This is a utility class with all static methods - no instance needed.
/// Think of it as a collection of helper functions for location checking.
///
/// USAGE:
/// ```dart
/// final result = await VisitorValidationService.validateProximity(
///   church: myChurch,
///   userPosition: currentPosition,
/// );
///
/// if (result.isValid) {
///   // User is close enough - allow marking as visited
/// } else {
///   // Show error with distance info
///   showError(result.message);
/// }
/// ```
class VisitorValidationService {
  // ─────────────────────────────────────────────────────────────────────────
  // CONFIGURATION CONSTANTS
  // ─────────────────────────────────────────────────────────────────────────

  /// Maximum distance (in meters) user can be from church to validate visit.
  ///
  /// WHY 500 METERS?
  /// - Large enough to cover entire church property/grounds
  /// - Accounts for GPS inaccuracy (±10-50 meters typical)
  /// - Small enough to ensure user is actually at location
  /// - Roughly 5-7 minutes walking distance
  ///
  /// TO CHANGE: Adjust this value if testing or if requirements change.
  /// For testing, you might temporarily set to 50000 (50km) to test remotely.
  static const double visitRadiusMeters = 500.0;

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN VALIDATION METHOD
  // ─────────────────────────────────────────────────────────────────────────

  /// Validates if the user is within acceptable proximity to the church.
  ///
  /// This is the main method called when user tries to mark a visit.
  ///
  /// VALIDATION STEPS:
  /// 1. Check if church has GPS coordinates (some may not)
  /// 2. Calculate distance using Geolocator (Haversine formula)
  /// 3. Compare distance to visitRadiusMeters threshold
  /// 4. Return result with distance info for user feedback
  ///
  /// [church] - The church the user is trying to visit
  /// [userPosition] - The user's current GPS position from device
  ///
  /// Returns: ValidationResult with:
  /// - isValid: true if within range, false otherwise
  /// - distance: actual distance in meters (null if church has no coords)
  /// - message: Human-readable message for UI display
  static Future<ValidationResult> validateProximity({
    required Church church,
    required Position userPosition,
  }) async {
    // ─────────────────────────────────────────────────────────────────────
    // STEP 1: Check if church has valid coordinates
    // ─────────────────────────────────────────────────────────────────────
    // Some churches might not have GPS coordinates in the database.
    // In this case, we can't validate - return error.
    if (church.latitude == null || church.longitude == null) {
      return ValidationResult(
        isValid: false,
        distance: null,
        message: 'Church location not available. Cannot validate visit.',
      );
    }

    // ─────────────────────────────────────────────────────────────────────
    // STEP 2: Calculate distance using Geolocator
    // ─────────────────────────────────────────────────────────────────────
    // distanceBetween() uses the Haversine formula to calculate
    // the "great-circle distance" between two points on Earth.
    //
    // Parameters: (lat1, lon1, lat2, lon2)
    // Returns: Distance in meters as a double
    double distanceInMeters = Geolocator.distanceBetween(
      userPosition.latitude, // User's latitude
      userPosition.longitude, // User's longitude
      church.latitude!, // Church's latitude (! because we checked null above)
      church.longitude!, // Church's longitude
    );

    // ─────────────────────────────────────────────────────────────────────
    // STEP 3: Compare to threshold
    // ─────────────────────────────────────────────────────────────────────
    bool isWithinRange = distanceInMeters <= visitRadiusMeters;

    // ─────────────────────────────────────────────────────────────────────
    // STEP 4: Return result with appropriate message
    // ─────────────────────────────────────────────────────────────────────
    return ValidationResult(
      isValid: isWithinRange,
      distance: distanceInMeters,
      // User-friendly message based on result
      message: isWithinRange
          ? 'You are at the church! Visit validated.'
          : 'You are ${(distanceInMeters / 1000).toStringAsFixed(2)} km away from the church. '
              'You must be within ${(visitRadiusMeters / 1000).toStringAsFixed(1)} km to mark as visited.',
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ANALYTICS HELPER METHODS
  // ─────────────────────────────────────────────────────────────────────────
  // These methods help categorize visits for analytics/reporting purposes.

  /// Gets the time of day category based on current time.
  ///
  /// Used for analytics - tracking when users visit churches.
  /// Helps identify popular visiting times.
  ///
  /// Returns: 'morning', 'afternoon', or 'evening'
  static String getTimeOfDay() {
    final hour = DateTime.now().hour;

    if (hour >= 6 && hour < 12) {
      return 'morning'; // 6:00 AM - 11:59 AM
    } else if (hour >= 12 && hour < 18) {
      return 'afternoon'; // 12:00 PM - 5:59 PM
    } else {
      return 'evening'; // 6:00 PM - 5:59 AM
    }
  }

  /// Determines device type for analytics tracking.
  ///
  /// Currently always returns 'mobile' since this is a mobile app.
  /// Could be enhanced to detect tablets vs phones if needed.
  ///
  /// Returns: Device type string (currently always 'mobile')
  static String getDeviceType() {
    // For Flutter mobile app, always return 'mobile'
    // This could be enhanced to detect tablets if needed
    return 'mobile';
  }
}

// =============================================================================
// VALIDATION RESULT DATA CLASS
// =============================================================================

/// Result of proximity validation.
///
/// This class packages together all the information needed
/// to tell the user whether their visit was validated.
///
/// CONTAINS:
/// - isValid: Whether user is close enough
/// - distance: How far they actually are (in meters)
/// - message: User-friendly text for display
///
/// EXAMPLE USAGE:
/// ```dart
/// if (result.isValid) {
///   showSuccess('Visit recorded!');
/// } else {
///   showError(result.message);  // "You are 2.5 km away..."
/// }
/// ```
class ValidationResult {
  /// Whether the validation passed (user is within range)
  final bool isValid;

  /// Distance in meters from user to church (null if church has no coords)
  final double? distance;

  /// Human-readable message explaining the result
  final String message;

  /// Creates a new ValidationResult.
  ValidationResult({
    required this.isValid,
    required this.distance,
    required this.message,
  });

  /// Gets distance formatted as kilometers with 2 decimal places.
  ///
  /// Example: 1500 meters → "1.50 km"
  /// Returns "Unknown" if distance is null.
  String get distanceInKm => distance != null
      ? '${(distance! / 1000).toStringAsFixed(2)} km'
      : 'Unknown';
}
