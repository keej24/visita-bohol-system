import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/announcement.dart';

class AnnouncementRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static const String _collection = 'announcements';

  // Cache for announcements
  List<Announcement>? _cache;
  DateTime? _cacheTime;
  static const Duration _cacheDuration = Duration(minutes: 5);

  /// Get all announcements (with optional caching)
  Future<List<Announcement>> getAll({bool forceRefresh = false}) async {
    // Return cached data if available and fresh
    if (!forceRefresh &&
        _cache != null &&
        _cacheTime != null &&
        DateTime.now().difference(_cacheTime!) < _cacheDuration) {
      return _cache!;
    }

    try {
      // Fetch from Firestore
      final querySnapshot = await _firestore
          .collection(_collection)
          .orderBy('eventDate', descending: true)
          .get();

      final announcements = querySnapshot.docs
          .map((doc) => Announcement.fromFirestore(doc.id, doc.data()))
          .toList();

      // Update cache
      _cache = announcements;
      _cacheTime = DateTime.now();

      return announcements;
    } catch (e) {
      print('Error fetching announcements from Firestore: $e');
      // Return cached data if available, otherwise rethrow
      if (_cache != null) {
        return _cache!;
      }
      rethrow;
    }
  }

  /// Get announcements for a specific diocese
  Future<List<Announcement>> getByDiocese(String diocese,
      {bool forceRefresh = false}) async {
    try {
      // Normalize diocese name to match Firestore format
      final normalizedDiocese = _normalizeDiocese(diocese);

      final querySnapshot = await _firestore
          .collection(_collection)
          .where('diocese', isEqualTo: normalizedDiocese)
          .orderBy('eventDate', descending: true)
          .get();

      return querySnapshot.docs
          .map((doc) => Announcement.fromFirestore(doc.id, doc.data()))
          .toList();
    } catch (e) {
      print('Error fetching announcements by diocese: $e');
      rethrow;
    }
  }

  /// Get diocese announcements only (exclude parish announcements)
  Future<List<Announcement>> getDioceseAnnouncements({
    bool forceRefresh = false,
    bool includeArchived = false,
  }) async {
    try {
      var query = _firestore
          .collection(_collection)
          .where('scope', isEqualTo: 'diocese');

      // Only filter out archived if not explicitly including them
      if (!includeArchived) {
        query = query.where('isArchived', isEqualTo: false);
      }

      final querySnapshot =
          await query.orderBy('eventDate', descending: true).get();

      return querySnapshot.docs
          .map((doc) => Announcement.fromFirestore(doc.id, doc.data()))
          .toList();
    } catch (e) {
      print('Error fetching diocese announcements: $e');
      rethrow;
    }
  }

  /// Get parish announcements for a specific church
  Future<List<Announcement>> getParishAnnouncements(String parishId,
      {bool forceRefresh = false}) async {
    try {
      final querySnapshot = await _firestore
          .collection(_collection)
          .where('scope', isEqualTo: 'parish')
          .where('parishId', isEqualTo: parishId)
          .where('isArchived', isEqualTo: false)
          .orderBy('eventDate', descending: true)
          .get();

      return querySnapshot.docs
          .map((doc) => Announcement.fromFirestore(doc.id, doc.data()))
          .toList();
    } catch (e) {
      print('Error fetching parish announcements: $e');
      rethrow;
    }
  }

  /// Stream announcements in real-time
  Stream<List<Announcement>> streamAnnouncements() {
    return _firestore
        .collection(_collection)
        .where('isArchived', isEqualTo: false)
        .orderBy('eventDate', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => Announcement.fromFirestore(doc.id, doc.data()))
            .toList());
  }

  /// Clear cache
  void clearCache() {
    _cache = null;
    _cacheTime = null;
  }

  /// Helper to normalize diocese names
  String _normalizeDiocese(String diocese) {
    final lower = diocese.toLowerCase();
    if (lower.contains('tagbilaran')) return 'tagbilaran';
    if (lower.contains('talibon')) return 'talibon';
    return diocese.toLowerCase();
  }
}
