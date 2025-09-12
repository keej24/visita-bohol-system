import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/announcement.dart';
import 'announcement_repository.dart';

class FirestoreAnnouncementRepository extends AnnouncementRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static const String _announcementsCollection = 'announcements';

  @override
  Future<List<Announcement>> getAll() async {
    try {
      final QuerySnapshot snapshot = await _firestore
          .collection(_announcementsCollection)
          .orderBy('date', descending: true)
          .get();

      return snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return Announcement.fromJson({
          'id': doc.id,
          ...data,
        });
      }).toList();
    } catch (e) {
      throw Exception('Failed to fetch announcements: $e');
    }
  }

  Future<List<Announcement>> getAnnouncementsByType(String category) async {
    try {
      final QuerySnapshot snapshot = await _firestore
          .collection(_announcementsCollection)
          .where('category', isEqualTo: category)
          .orderBy('date', descending: true)
          .get();

      return snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return Announcement.fromJson({
          'id': doc.id,
          ...data,
        });
      }).toList();
    } catch (e) {
      throw Exception('Failed to fetch announcements by category: $e');
    }
  }

  Future<List<Announcement>> getAnnouncementsByParish(String parishId) async {
    try {
      final QuerySnapshot snapshot = await _firestore
          .collection(_announcementsCollection)
          .where('parishId', isEqualTo: parishId)
          .orderBy('date', descending: true)
          .get();

      return snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return Announcement.fromJson({
          'id': doc.id,
          ...data,
        });
      }).toList();
    } catch (e) {
      throw Exception('Failed to fetch announcements by parish: $e');
    }
  }

  Future<List<Announcement>> searchAnnouncements(String query) async {
    try {
      // Firestore doesn't support full-text search, so we'll do client-side filtering
      // In production, consider using Algolia or similar for better search
      final allAnnouncements = await getAll();

      return allAnnouncements.where((announcement) {
        final searchQuery = query.toLowerCase();
        return announcement.title.toLowerCase().contains(searchQuery) ||
            announcement.description.toLowerCase().contains(searchQuery) ||
            (announcement.venue.toLowerCase().contains(searchQuery));
      }).toList();
    } catch (e) {
      throw Exception('Failed to search announcements: $e');
    }
  }

  Future<Announcement?> getAnnouncementById(String id) async {
    try {
      final DocumentSnapshot doc =
          await _firestore.collection(_announcementsCollection).doc(id).get();

      if (!doc.exists) return null;

      final data = doc.data() as Map<String, dynamic>;
      return Announcement.fromJson({
        'id': doc.id,
        ...data,
      });
    } catch (e) {
      throw Exception('Failed to fetch announcement: $e');
    }
  }

  // Administrative methods for managing announcement data
  Future<void> addAnnouncement(Announcement announcement) async {
    try {
      await _firestore
          .collection(_announcementsCollection)
          .add(announcement.toJson());
    } catch (e) {
      throw Exception('Failed to add announcement: $e');
    }
  }

  Future<void> updateAnnouncement(Announcement announcement) async {
    try {
      await _firestore
          .collection(_announcementsCollection)
          .doc(announcement.id)
          .update(announcement.toJson());
    } catch (e) {
      throw Exception('Failed to update announcement: $e');
    }
  }

  Future<void> deleteAnnouncement(String announcementId) async {
    try {
      await _firestore
          .collection(_announcementsCollection)
          .doc(announcementId)
          .delete();
    } catch (e) {
      throw Exception('Failed to delete announcement: $e');
    }
  }

  // Get announcements within a date range
  Future<List<Announcement>> getAnnouncementsByDateRange(
      DateTime startDate, DateTime endDate) async {
    try {
      final QuerySnapshot snapshot = await _firestore
          .collection(_announcementsCollection)
          .where('date', isGreaterThanOrEqualTo: Timestamp.fromDate(startDate))
          .where('date', isLessThanOrEqualTo: Timestamp.fromDate(endDate))
          .orderBy('date', descending: true)
          .get();

      return snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return Announcement.fromJson({
          'id': doc.id,
          ...data,
        });
      }).toList();
    } catch (e) {
      throw Exception('Failed to fetch announcements by date range: $e');
    }
  }

  // Get recent announcements (last 30 days)
  Future<List<Announcement>> getRecentAnnouncements() async {
    final thirtyDaysAgo = DateTime.now().subtract(const Duration(days: 30));
    return getAnnouncementsByDateRange(thirtyDaysAgo, DateTime.now());
  }

  // Get upcoming events
  Future<List<Announcement>> getUpcomingEvents() async {
    try {
      final QuerySnapshot snapshot = await _firestore
          .collection(_announcementsCollection)
          .where('category', isEqualTo: 'Festival')
          .where('dateTime',
              isGreaterThanOrEqualTo: Timestamp.fromDate(DateTime.now()))
          .orderBy('dateTime', descending: false)
          .get();

      return snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return Announcement.fromJson({
          'id': doc.id,
          ...data,
        });
      }).toList();
    } catch (e) {
      throw Exception('Failed to fetch upcoming events: $e');
    }
  }
}
