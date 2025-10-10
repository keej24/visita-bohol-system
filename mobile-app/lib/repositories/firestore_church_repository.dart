import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../models/church.dart';
import '../models/mass_schedule.dart';
import '../models/church_status.dart';
import '../models/enums.dart';
import 'church_repository.dart';

class FirestoreChurchRepository extends ChurchRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static const String _churchesCollection = 'churches';
  static const String _massSchedulesCollection = 'mass_schedules';

  @override
  Future<List<Church>> getAll() async {
    try {
      debugPrint('🔍 [CHURCH REPO] Querying churches with status=${ChurchStatus.approved}');

      // For public mobile app, only return approved churches
      final QuerySnapshot snapshot = await _firestore
          .collection(_churchesCollection)
          .where('status', isEqualTo: ChurchStatus.approved)
          .get();

      debugPrint('📊 [CHURCH REPO] Found ${snapshot.docs.length} approved churches');

      if (snapshot.docs.isEmpty) {
        debugPrint('❌ [CHURCH REPO] No approved churches found!');
        debugPrint('💡 [CHURCH REPO] Check Firestore console for actual data');
        debugPrint('   Expected: status = "approved"');
        debugPrint('   Collection: churches');

        // Query ALL churches to debug status values
        debugPrint('🔍 [CHURCH REPO] Checking all churches for debugging...');
        final allSnapshot = await _firestore.collection(_churchesCollection).limit(10).get();
        debugPrint('📊 [CHURCH REPO] Total churches in database: ${allSnapshot.docs.length}');
        for (var doc in allSnapshot.docs) {
          final data = doc.data();
          debugPrint('   - ${doc.id}: status="${data['status']}", name="${data['name']}"');
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
          if (data['heritageClassification'] != null || data['classification'] != null || data['isHeritage'] == true) {
            debugPrint('🏛️  [RAW DATA] ${data['name']}:');
            debugPrint('   - heritageClassification: "${data['heritageClassification']}"');
            debugPrint('   - classification: "${data['classification']}"');
            debugPrint('   - isHeritage: ${data['isHeritage']}');
          }

          final church = Church.fromJson({
            'id': doc.id,
            ...data,
          });

          // Log parsed result for heritage churches
          if (church.heritageClassification != HeritageClassification.none) {
            debugPrint('✅ [PARSED] ${church.name}:');
            debugPrint('   - classification (enum): ${church.heritageClassification}');
            debugPrint('   - isHeritage: ${church.isHeritage}');
          }

          return church;
        } catch (e) {
          debugPrint('💥 [CHURCH REPO] Failed to parse church ${doc.id}: $e');
          debugPrint('   Data: $data');
          rethrow;
        }
      }).toList();

      debugPrint('✅ [CHURCH REPO] Successfully returned ${churches.length} churches');
      return churches;
    } catch (e) {
      debugPrint('💥 [CHURCH REPO] Error in getAll(): $e');
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
