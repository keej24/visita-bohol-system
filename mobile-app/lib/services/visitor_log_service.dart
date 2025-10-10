import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'visitor_validation_service.dart';

/// Service for logging physical church visits to Firestore
class VisitorLogService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static const String collectionName = 'church_visited';

  /// Logs a validated church visit to Firestore
  ///
  /// This creates an immutable record of the physical visit for analytics
  ///
  /// Parameters:
  /// - [churchId]: The church document ID
  /// - [userId]: The authenticated user's UID
  /// - [userPosition]: User's validated GPS location
  /// - [distanceFromChurch]: Distance in meters (optional)
  static Future<void> logVisit({
    required String churchId,
    required String userId,
    required Position userPosition,
    double? distanceFromChurch,
  }) async {
    try {
      final visitData = {
        'church_id': churchId,
        'pub_user_id': userId,
        'visit_date': FieldValue.serverTimestamp(),
        'visit_status': 'validated',
        'time_of_day': VisitorValidationService.getTimeOfDay(),
        'validated_location': {
          'latitude': userPosition.latitude,
          'longitude': userPosition.longitude,
        },
        'distance_from_church': distanceFromChurch,
        'device_type': VisitorValidationService.getDeviceType(),
        'created_at': FieldValue.serverTimestamp(),
      };

      await _firestore.collection(collectionName).add(visitData);

      debugPrint('✅ Visit logged successfully for church: $churchId');
    } catch (error) {
      debugPrint('❌ Error logging visit: $error');
      // Rethrow so calling code can handle the error
      rethrow;
    }
  }

  /// Gets visit history for a specific user
  ///
  /// Returns list of church IDs the user has visited, sorted by date
  static Future<List<Map<String, dynamic>>> getUserVisitHistory({
    required String userId,
    int? limit,
  }) async {
    try {
      Query query = _firestore
          .collection(collectionName)
          .where('pub_user_id', isEqualTo: userId)
          .orderBy('visit_date', descending: true);

      if (limit != null) {
        query = query.limit(limit);
      }

      final snapshot = await query.get();

      return snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return {
          'visit_id': doc.id,
          'church_id': data['church_id'],
          'visit_date': (data['visit_date'] as Timestamp?)?.toDate(),
          'time_of_day': data['time_of_day'],
          'distance_from_church': data['distance_from_church'],
        };
      }).toList();
    } catch (error) {
      debugPrint('❌ Error getting visit history: $error');
      return [];
    }
  }

  /// Checks if user has visited a specific church
  static Future<bool> hasVisitedChurch({
    required String churchId,
    required String userId,
  }) async {
    try {
      final snapshot = await _firestore
          .collection(collectionName)
          .where('church_id', isEqualTo: churchId)
          .where('pub_user_id', isEqualTo: userId)
          .limit(1)
          .get();

      return snapshot.docs.isNotEmpty;
    } catch (error) {
      debugPrint('❌ Error checking visit status: $error');
      return false;
    }
  }

  /// Gets visit count for a specific church
  ///
  /// Used for analytics and church popularity metrics
  static Future<int> getChurchVisitCount(String churchId) async {
    try {
      final snapshot = await _firestore
          .collection(collectionName)
          .where('church_id', isEqualTo: churchId)
          .count()
          .get();

      return snapshot.count ?? 0;
    } catch (error) {
      debugPrint('❌ Error getting visit count: $error');
      return 0;
    }
  }

  /// Gets recent visits for a church (for analytics)
  static Future<List<Map<String, dynamic>>> getChurchVisits({
    required String churchId,
    DateTime? startDate,
    DateTime? endDate,
    int? limit,
  }) async {
    try {
      Query query = _firestore
          .collection(collectionName)
          .where('church_id', isEqualTo: churchId);

      if (startDate != null) {
        query = query.where('visit_date',
            isGreaterThanOrEqualTo: Timestamp.fromDate(startDate));
      }

      if (endDate != null) {
        query = query.where('visit_date',
            isLessThanOrEqualTo: Timestamp.fromDate(endDate));
      }

      query = query.orderBy('visit_date', descending: true);

      if (limit != null) {
        query = query.limit(limit);
      }

      final snapshot = await query.get();

      return snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return {
          'visit_id': doc.id,
          'pub_user_id': data['pub_user_id'],
          'visit_date': (data['visit_date'] as Timestamp?)?.toDate(),
          'time_of_day': data['time_of_day'],
          'device_type': data['device_type'],
        };
      }).toList();
    } catch (error) {
      debugPrint('❌ Error getting church visits: $error');
      return [];
    }
  }
}
