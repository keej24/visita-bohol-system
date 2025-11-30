/// =============================================================================
/// LOCATION_SERVICE.DART - GPS Location Service for Church Distance/Validation
/// =============================================================================
///
/// PURPOSE:
/// This service manages the device's GPS location. It's used for:
/// 1. Calculating distance from user to each church
/// 2. Validating that user is near a church when marking "visited"
/// 3. Enabling "sort by distance" functionality on home screen
///
/// LOCATION USAGE IN APP:
/// - Home Screen: Sort churches by distance from user
/// - Church Cards: Display "X km away" text
/// - Mark Visited: Verify user is within 500m of church
/// - Map Screen: Center map on user's location
///
/// PERMISSION HANDLING:
/// GPS requires user permission. This service handles the full flow:
/// 1. Check if location services are enabled (device level)
/// 2. Check if app has permission (app level)
/// 3. Request permission if not granted
/// 4. Handle "denied forever" case (direct to settings)
///
/// GEOLOCATOR PACKAGE:
/// Uses the 'geolocator' package for cross-platform GPS access.
/// - Works on Android, iOS, and web (with limitations)
/// - Provides distance calculation (Geolocator.distanceBetween)
/// - Handles permission requests natively
///
/// STATE PROPERTIES:
/// - currentPosition: User's GPS coordinates (lat/lng)
/// - isLocationEnabled: Whether we have valid location
/// - isLoading: GPS acquisition in progress
/// - errorMessage: User-friendly error description
///
/// IMPORTANT NOTES:
/// - Location is optional: App works without it (no distance sorting)
/// - Battery impact: Only fetches on demand, not continuous tracking
/// - Privacy: Location never leaves device except for visit validation
///
/// RELATED FILES:
/// - services/visitor_validation_service.dart: Uses location for visit verification
/// - screens/home_screen.dart: Distance display on church cards
/// - screens/church_detail_screen_modern.dart: Mark Visited validation

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

/// LocationService - Manages GPS location for the mobile app
///
/// Registered as ChangeNotifierProvider in main.dart for app-wide access.
/// Other services like PaginatedChurchService depend on this for distance.
class LocationService extends ChangeNotifier {
  Position? _currentPosition;
  bool _isLocationEnabled = false;
  bool _isLoading = false;
  String? _errorMessage;

  // Public getters for location state
  Position? get currentPosition => _currentPosition;
  bool get isLocationEnabled => _isLocationEnabled;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<bool> checkLocationPermission() async {
    final permission = await Geolocator.checkPermission();
    return permission == LocationPermission.whileInUse ||
        permission == LocationPermission.always;
  }

  Future<bool> requestLocationPermission() async {
    final permission = await Geolocator.requestPermission();
    return permission == LocationPermission.whileInUse ||
        permission == LocationPermission.always;
  }

  Future<void> getCurrentLocation() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      // Check if location services are enabled
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        _errorMessage =
            'Location services are disabled. Please enable location services in your device settings.';
        _isLocationEnabled = false;
        _isLoading = false;
        notifyListeners();
        return;
      }

      // Check location permission
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          _errorMessage =
              'Location permissions are denied. Please allow location access to find nearby churches.';
          _isLocationEnabled = false;
          _isLoading = false;
          notifyListeners();
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        _errorMessage =
            'Location permissions are permanently denied. Please enable location access in app settings.';
        _isLocationEnabled = false;
        _isLoading = false;
        notifyListeners();
        return;
      }

      // Get current position
      _currentPosition = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );

      _isLocationEnabled = true;
      _errorMessage = null;
    } catch (e) {
      _errorMessage = 'Failed to get location: ${e.toString()}';
      _isLocationEnabled = false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  Future<void> openLocationSettings() async {
    await Geolocator.openLocationSettings();
  }

  Future<void> openAppSettings() async {
    await Geolocator.openAppSettings();
  }
}
