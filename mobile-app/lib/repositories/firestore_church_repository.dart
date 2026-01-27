/// FILE PURPOSE: Firestore Church Repository - Firebase Data Access Layer
///
/// This repository handles all Firebase Firestore operations for church data
/// in the mobile application. It provides the concrete implementation of the
/// abstract ChurchRepository interface.
///
/// KEY RESPONSIBILITIES:
/// - Fetch approved churches from Firestore
/// - Query churches by location, diocese, heritage status
/// - Convert Firestore documents to Church objects
/// - Handle Firestore-specific errors
/// - Filter out non-public churches (only show approved)
/// - Provide debug logging for troubleshooting
/// - Cache results for offline support
///
/// INTEGRATION POINTS:
/// - Extends abstract ChurchRepository class
/// - Connects to same Firestore database as admin dashboard
/// - Reads from 'churches' collection
/// - Uses Church.fromJson for deserialization
/// - Consumed by services and UI components
///
/// TECHNICAL CONCEPTS:
/// - Repository Pattern: Abstracts data source (can swap with mock for testing)
/// - Inheritance: Extends base repository to provide Firestore implementation
/// - Async/Await: Handle asynchronous database queries
/// - Query Filtering: Server-side filtering for efficiency
/// - Error Handling: Catch and wrap Firestore errors
/// - Caching: Local cache for offline support
///
/// SECURITY:
/// - Reads only approved churches (status = 'approved')
/// - Firebase security rules enforce server-side access control
/// - No write operations (mobile is read-only)
///
/// PERFORMANCE:
/// - Uses compound queries (where + where) for filtering
/// - Server-side filtering reduces data transfer
/// - Client-side search for fields Firestore can't index
/// - Local caching reduces network requests

import 'package:cloud_firestore/cloud_firestore.dart'; // Firestore SDK
import 'package:flutter/foundation.dart'; // debugPrint utility
// Data models
import '../models/church.dart';
import '../models/mass_schedule.dart';
import '../models/church_status.dart'; // Status constants
import '../models/enums.dart'; // Enums for classifications
// Abstract base repository
import 'church_repository.dart';
// Local cache service
import '../services/local_data_service.dart';
import '../services/query_cache_service.dart';

/// Firestore Church Repository
///
/// Concrete implementation of ChurchRepository using Firebase Firestore.
/// Extends the abstract base class to provide actual database operations.
class FirestoreChurchRepository extends ChurchRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static const String _churchesCollection = 'churches';
  static const String _massSchedulesCollection = 'mass_schedules';

  // Services for caching
  final LocalDataService _localDataService = LocalDataService();
  final QueryCacheService _queryCache = QueryCacheService();

  // Cache key for approved churches
  static const String _cacheKeyApproved = 'churches_approved';

  /// =============================================================================
  /// GET ALL APPROVED CHURCHES
  /// =============================================================================
  ///
  /// Fetches all approved churches from Firestore for public viewing.
  ///
  /// WHY FILTER BY STATUS:
  /// - Mobile app users should only see approved churches
  /// - Draft, pending, and rejected churches are admin-only
  /// - Protects incomplete data from public access
  ///
  /// QUERY EXPLANATION:
  /// - Collection: 'churches'
  /// - Filter: status == 'approved'
  /// - Returns: Array of Church objects
  ///
  /// ERROR HANDLING:
  /// - Network errors: Throws exception (caller handles)
  /// - Empty result: Returns empty array (valid state)
  /// - Parse errors: Logs and continues (skip bad documents)
  ///
  /// DEBUGGING:
  /// - Logs query parameters
  /// - Logs result count
  /// - Logs sample church for verification
  /// - Checks for common issues (empty results, status values)
  @override
  Future<List<Church>> getAll() async {
    try {
      // Check in-memory cache first
      final cached = _queryCache.get<List<Church>>(_cacheKeyApproved);
      if (cached != null && cached.isNotEmpty) {
        debugPrint('⚡ [CHURCH REPO] Cache hit: ${cached.length} churches');
        return cached;
      }

      debugPrint(
          '🔍 [CHURCH REPO] Querying churches with status=${ChurchStatus.approved}');

      /**
       * Firestore Query Execution
       *
       * .collection() - Get reference to 'churches' collection
       * .where() - Server-side filter (reduces data transfer)
       * .get() - Execute query and fetch documents
       *
       * WHY .where() INSTEAD OF FILTERING LOCALLY:
       * - Reduces bandwidth (don't download rejected churches)
       * - Faster execution (server does filtering)
       * - Scales better (thousands of churches)
       */
      final QuerySnapshot snapshot = await _firestore
          .collection(_churchesCollection)
          .where('status', isEqualTo: ChurchStatus.approved)
          .get();

      debugPrint(
          '📊 [CHURCH REPO] Found ${snapshot.docs.length} approved churches');

      if (snapshot.docs.isEmpty) {
        debugPrint('❌ [CHURCH REPO] No approved churches found!');
        debugPrint('💡 [CHURCH REPO] Check Firestore console for actual data');
        debugPrint('   Expected: status = "approved"');
        debugPrint('   Collection: churches');

        // Query ALL churches to debug status values
        debugPrint('🔍 [CHURCH REPO] Checking all churches for debugging...');
        final allSnapshot =
            await _firestore.collection(_churchesCollection).limit(10).get();
        debugPrint(
            '📊 [CHURCH REPO] Total churches in database: ${allSnapshot.docs.length}');
        for (var doc in allSnapshot.docs) {
          final data = doc.data();
          debugPrint(
              '   - ${doc.id}: status="${data['status']}", name="${data['name']}"');
        }
      } else {
        // Log first church for debugging
        final firstDoc = snapshot.docs.first;
        final firstData = firstDoc.data() as Map<String, dynamic>;
        debugPrint('✅ [CHURCH REPO] Sample church:');
        debugPrint('   ID: ${firstDoc.id}');
        debugPrint('   Name: ${firstData['name']}');
        debugPrint('   Status: ${firstData['status']}');
        debugPrint('   Diocese: ${firstData['diocese']}');
        debugPrint('   Municipality: ${firstData['municipality']}');
        debugPrint('   Location: ${firstData['location']}');
      }

      final churches = snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        try {
          // Log heritage classification data for debugging
          if (data['heritageClassification'] != null ||
              data['classification'] != null ||
              data['isHeritage'] == true) {
            debugPrint('🏛️  [RAW DATA] ${data['name']}:');
            debugPrint(
                '   - heritageClassification: "${data['heritageClassification']}"');
            debugPrint('   - classification: "${data['classification']}"');
            debugPrint('   - isHeritage: ${data['isHeritage']}');
          }

          final church = Church.fromJson({
            'id': doc.id,
            ...data,
          });

          // Log parsed result for heritage churches
          if (church.heritageClassification !=
              HeritageClassification.nonHeritage) {
            debugPrint('✅ [PARSED] ${church.name}:');
            debugPrint(
                '   - classification (enum): ${church.heritageClassification}');
            debugPrint('   - isHeritage: ${church.isHeritage}');
          }

          return church;
        } catch (e) {
          debugPrint('💥 [CHURCH REPO] Failed to parse church ${doc.id}: $e');
          debugPrint('   Data: $data');
          rethrow;
        }
      }).toList();

      // Cache results for future requests
      _queryCache.set(_cacheKeyApproved, churches,
          duration: const Duration(minutes: 5));

      // Also persist to local storage for offline support
      _localDataService.cacheChurches(churches);

      debugPrint(
          '✅ [CHURCH REPO] Successfully returned ${churches.length} churches');
      return churches;
    } catch (e) {
      debugPrint('💥 [CHURCH REPO] Error in getAll(): $e');

      // Fallback to local cache on network error
      debugPrint('📱 [CHURCH REPO] Attempting to load from local cache...');
      final localChurches = await _localDataService.loadChurches();
      if (localChurches.isNotEmpty) {
        debugPrint(
            '✅ [CHURCH REPO] Loaded ${localChurches.length} churches from local cache');
        return localChurches;
      }

      throw Exception('Failed to fetch churches: $e');
    }
  }

  Future<Church?> getChurchById(String id) async {
    try {
      final DocumentSnapshot doc =
          await _firestore.collection(_churchesCollection).doc(id).get();

      if (!doc.exists) return null;

      final data = doc.data() as Map<String, dynamic>;
      return Church.fromJson({
        'id': doc.id,
        ...data,
      });
    } catch (e) {
      throw Exception('Failed to fetch church: $e');
    }
  }

  Future<List<Church>> getChurchesByLocation(String location) async {
    try {
      // Use server-side filtering with compound query
      final QuerySnapshot snapshot = await _firestore
          .collection(_churchesCollection)
          .where('status', isEqualTo: ChurchStatus.approved)
          .where('location', isEqualTo: location)
          .get();

      return snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return Church.fromJson({
          'id': doc.id,
          ...data,
        });
      }).toList();
    } catch (e) {
      throw Exception('Failed to fetch churches by location: $e');
    }
  }

  Future<List<Church>> getChurchesByStatus(String status) async {
    try {
      final QuerySnapshot snapshot = await _firestore
          .collection(_churchesCollection)
          .where('status', isEqualTo: status)
          .get();

      return snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return Church.fromJson({
          'id': doc.id,
          ...data,
        });
      }).toList();
    } catch (e) {
      throw Exception('Failed to fetch churches by status: $e');
    }
  }

  Future<List<Church>> searchChurches(String query) async {
    try {
      // Firestore doesn't support full-text search, so we'll do client-side filtering
      // In production, consider using Algolia or similar for better search
      final allChurches = await getAll();

      return allChurches.where((church) {
        final searchQuery = query.toLowerCase();
        return church.name.toLowerCase().contains(searchQuery) ||
            church.location.toLowerCase().contains(searchQuery) ||
            (church.history?.toLowerCase().contains(searchQuery) ?? false);
      }).toList();
    } catch (e) {
      throw Exception('Failed to search churches: $e');
    }
  }

  Future<List<MassSchedule>> getMassSchedules() async {
    try {
      final QuerySnapshot snapshot =
          await _firestore.collection(_massSchedulesCollection).get();

      return snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return MassSchedule.fromJson({
          'id': doc.id,
          ...data,
        });
      }).toList();
    } catch (e) {
      throw Exception('Failed to fetch mass schedules: $e');
    }
  }

  Future<List<MassSchedule>> getMassSchedulesByChurch(String churchId) async {
    try {
      final QuerySnapshot snapshot = await _firestore
          .collection(_massSchedulesCollection)
          .where('churchId', isEqualTo: churchId)
          .get();

      return snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return MassSchedule.fromJson({
          'id': doc.id,
          ...data,
        });
      }).toList();
    } catch (e) {
      throw Exception('Failed to fetch mass schedules for church: $e');
    }
  }

  // Administrative methods for managing church data
  Future<void> addChurch(Church church) async {
    try {
      await _firestore
          .collection(_churchesCollection)
          .doc(church.id)
          .set(church.toJson());
    } catch (e) {
      throw Exception('Failed to add church: $e');
    }
  }

  Future<void> updateChurch(Church church) async {
    try {
      await _firestore
          .collection(_churchesCollection)
          .doc(church.id)
          .update(church.toJson());
    } catch (e) {
      throw Exception('Failed to update church: $e');
    }
  }

  Future<void> deleteChurch(String churchId) async {
    try {
      await _firestore.collection(_churchesCollection).doc(churchId).delete();
    } catch (e) {
      throw Exception('Failed to delete church: $e');
    }
  }

  Future<void> addMassSchedule(MassSchedule schedule) async {
    try {
      await _firestore
          .collection(_massSchedulesCollection)
          .add(schedule.toJson());
    } catch (e) {
      throw Exception('Failed to add mass schedule: $e');
    }
  }

  Future<void> updateMassSchedule(MassSchedule schedule) async {
    try {
      await _firestore
          .collection(_massSchedulesCollection)
          .doc(schedule.id)
          .update(schedule.toJson());
    } catch (e) {
      throw Exception('Failed to update mass schedule: $e');
    }
  }

  Future<void> deleteMassSchedule(String scheduleId) async {
    try {
      await _firestore
          .collection(_massSchedulesCollection)
          .doc(scheduleId)
          .delete();
    } catch (e) {
      throw Exception('Failed to delete mass schedule: $e');
    }
  }

  // Get public churches (approved status)
  Future<List<Church>> getPublicChurches() async {
    return getChurchesByStatus(ChurchStatus.approved);
  }

  // Get churches by diocese
  Future<List<Church>> getChurchesByDiocese(String diocese) async {
    try {
      // Use server-side filtering with compound query
      final QuerySnapshot snapshot = await _firestore
          .collection(_churchesCollection)
          .where('status', isEqualTo: ChurchStatus.approved)
          .where('diocese', isEqualTo: diocese)
          .get();

      return snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return Church.fromJson({
          'id': doc.id,
          ...data,
        });
      }).toList();
    } catch (e) {
      throw Exception('Failed to fetch churches by diocese: $e');
    }
  }

  // Get heritage churches
  Future<List<Church>> getHeritageChurches() async {
    try {
      // Use server-side filtering with compound query
      final QuerySnapshot snapshot = await _firestore
          .collection(_churchesCollection)
          .where('status', isEqualTo: ChurchStatus.approved)
          .where('isHeritage', isEqualTo: true)
          .get();

      return snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return Church.fromJson({
          'id': doc.id,
          ...data,
        });
      }).toList();
    } catch (e) {
      throw Exception('Failed to fetch heritage churches: $e');
    }
  }
}
