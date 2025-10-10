import 'package:geolocator/geolocator.dart';
import '../models/church.dart';

/// Service for validating user proximity to churches before marking as visited
class VisitorValidationService {
  // Distance threshold in meters - user must be within this radius
  static const double visitRadiusMeters = 500.0;

  /// Validates if the user is within acceptable proximity to the church
  /// Returns true if user is within visitRadiusMeters of the church location
  static Future<ValidationResult> validateProximity({
    required Church church,
    required Position userPosition,
  }) async {
    // Check if church has valid coordinates
    if (church.latitude == null || church.longitude == null) {
      return ValidationResult(
        isValid: false,
        distance: null,
        message: 'Church location not available. Cannot validate visit.',
      );
    }

    // Calculate distance between user and church using Geolocator
    double distanceInMeters = Geolocator.distanceBetween(
      userPosition.latitude,
      userPosition.longitude,
      church.latitude!,
      church.longitude!,
    );

    bool isWithinRange = distanceInMeters <= visitRadiusMeters;

    return ValidationResult(
      isValid: isWithinRange,
      distance: distanceInMeters,
      message: isWithinRange
          ? 'You are at the church! Visit validated.'
          : 'You are ${(distanceInMeters / 1000).toStringAsFixed(2)} km away from the church. '
              'You must be within ${(visitRadiusMeters / 1000).toStringAsFixed(1)} km to mark as visited.',
    );
  }

  /// Gets the time of day category based on current time
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

  /// Determines device type based on screen size
  static String getDeviceType() {
    // For Flutter mobile app, always return 'mobile'
    // This could be enhanced to detect tablets if needed
    return 'mobile';
  }
}

/// Result of proximity validation
class ValidationResult {
  final bool isValid;
  final double? distance; // Distance in meters
  final String message;

  ValidationResult({
    required this.isValid,
    required this.distance,
    required this.message,
  });

  /// Gets distance in kilometers with 2 decimal places
  String get distanceInKm =>
      distance != null ? '${(distance! / 1000).toStringAsFixed(2)} km' : 'Unknown';
}