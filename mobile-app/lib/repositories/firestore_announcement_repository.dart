import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../models/announcement.dart';
import 'announcement_repository.dart';

/// Repository for managing church announcements from Firestore
///
/// Announcement Scope Rules:
/// - Diocese scope ('diocese'): Created by chancery office, visible in:
///   * Homepage carousel (upcoming diocese announcements only)
///   * Announcements screen (all diocese announcements)
/// - Parish scope ('parish'): Created by parish secretary, visible in:
///   * Individual church detail page only
///   * NOT shown in homepage carousel or main announcements screen
class FirestoreAnnouncementRepository extends AnnouncementRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static const String _announcementsCollection = 'announcements';

  @override
  Future<List<Announcement>> getAll() async {
    try {
      debugPrint('🔍 [ANNOUNCEMENT REPO] Querying announcements...');

      // Try without the isArchived filter first to see all announcements
      final QuerySnapshot snapshot =
          await _firestore.collection(_announcementsCollection).get();

      debugPrint(
          '📊 [ANNOUNCEMENT REPO] Found ${snapshot.docs.length} total announcements');

      if (snapshot.docs.isEmpty) {
        debugPrint(
            '❌ [ANNOUNCEMENT REPO] No announcements found in Firestore!');
        debugPrint('   Check Firebase Console → announcements collection');
        return [];
      }

      // Log first announcement for debugging
      final firstDoc = snapshot.docs.first;
      final firstData = firstDoc.data() as Map<String, dynamic>;
      debugPrint('✅ [ANNOUNCEMENT REPO] Sample announcement:');
      debugPrint('   ID: ${firstDoc.id}');
      debugPrint('   Title: ${firstData['title']}');
      debugPrint('   Scope: ${firstData['scope']}');
      debugPrint('   Diocese: ${firstData['diocese']}');
      debugPrint('   EventDate: ${firstData['eventDate']}');
      debugPrint('   IsArchived: ${firstData['isArchived']}');

      final announcements = snapshot.docs
          .map((doc) {
            final data = doc.data() as Map<String, dynamic>;

            try {
              // Skip archived announcements (if field exists)
              if (data['isArchived'] == true) {
                debugPrint('⏭️  Skipping archived: ${data['title']}');
                return null;
              }

              // Convert admin dashboard format to mobile app format
              final announcement = Announcement.fromJson({
                'id': doc.id,
                'title': data['title'] ?? '',
                'description': data['description'] ?? '',
                'dateTime': data['eventDate'] != null
                    ? (data['eventDate'] as Timestamp)
                        .toDate()
                        .toIso8601String()
                    : DateTime.now().toIso8601String(),
                'endDateTime': data['endDate'] != null
                    ? (data['endDate'] as Timestamp).toDate().toIso8601String()
                    : null,
                'venue': data['venue'] ?? '',
                'scope': data['scope'] ?? 'diocese',
                'churchId': data['parishId'], // Map parishId to churchId
                'diocese': data['diocese'] == 'tagbilaran'
                    ? 'Diocese of Tagbilaran'
                    : 'Diocese of Talibon',
                'category': data['category'] ?? 'Event',
                'contactInfo': data['contactInfo'],
                'isRecurring': false,
                'tags': [],
              });

              debugPrint(
                  '✅ Parsed: ${announcement.title} (${announcement.scope})');
              return announcement;
            } catch (e) {
              debugPrint('💥 Failed to parse announcement ${doc.id}: $e');
              debugPrint('   Data: $data');
              return null;
            }
          })
          .whereType<Announcement>()
          .toList(); // Filter out nulls

      debugPrint(
          '✅ [ANNOUNCEMENT REPO] Successfully returned ${announcements.length} announcements');
      return announcements;
    } catch (e) {
      debugPrint('💥 [ANNOUNCEMENT REPO] Error in getAll(): $e');
      throw Exception('Failed to fetch announcements: $e');
    }
  }

  Future<List<Announcement>> getAnnouncementsByType(String category) async {
    try {
      final QuerySnapshot snapshot = await _firestore
          .collection(_announcementsCollection)
          .where('category', isEqualTo: category)
          .where('isArchived', isEqualTo: false)
          .orderBy('eventDate', descending: true)
          .get();

      return snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return Announcement.fromJson({
          'id': doc.id,
          'title': data['title'],
          'description': data['description'],
          'dateTime':
              (data['eventDate'] as Timestamp).toDate().toIso8601String(),
          'endDateTime': data['endDate'] != null
              ? (data['endDate'] as Timestamp).toDate().toIso8601String()
              : null,
          'venue': data['venue'],
          'scope': data['scope'],
          'churchId': data['parishId'],
          'diocese': data['diocese'] == 'tagbilaran'
              ? 'Diocese of Tagbilaran'
              : 'Diocese of Talibon',
          'category': data['category'],
          'contactInfo': data['contactInfo'],
          'isRecurring': false,
          'tags': [],
        });
      }).toList();
    } catch (e) {
      debugPrint('❌ Error fetching announcements by category: $e');
      throw Exception('Failed to fetch announcements by category: $e');
    }
  }

  /// Get parish-specific announcements
  /// These should only be displayed on individual church detail pages
  Future<List<Announcement>> getAnnouncementsByParish(String parishId) async {
    try {
      debugPrint('🔍 Fetching announcements for parish: $parishId');

      // Query all announcements for parish, regardless of archived status
      final QuerySnapshot snapshot = await _firestore
          .collection(_announcementsCollection)
          .where('parishId', isEqualTo: parishId)
          .get();

      debugPrint(
          '✅ Found ${snapshot.docs.length} announcements for parish $parishId');

      final announcements = snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return Announcement.fromJson({
          'id': doc.id,
          'title': data['title'],
          'description': data['description'],
          'dateTime':
              (data['eventDate'] as Timestamp).toDate().toIso8601String(),
          'endDateTime': data['endDate'] != null
              ? (data['endDate'] as Timestamp).toDate().toIso8601String()
              : null,
          'venue': data['venue'],
          'scope': data['scope'],
          'churchId': data['parishId'],
          'diocese': data['diocese'] == 'tagbilaran'
              ? 'Diocese of Tagbilaran'
              : 'Diocese of Talibon',
          'category': data['category'],
          'contactInfo': data['contactInfo'],
          'isRecurring': false,
          'tags': [],
        });
      }).toList();

      // Sort by date in-memory to avoid index requirement
      announcements.sort((a, b) => b.dateTime.compareTo(a.dateTime));

      return announcements;
    } catch (e) {
      debugPrint('❌ Error fetching announcements by parish: $e');
      // Return empty list instead of throwing to handle gracefully
      return [];
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

  /// Get diocese-wide (chancery) announcements only
  /// These are displayed in the homepage carousel and main announcements screen
  Future<List<Announcement>> getDioceseAnnouncements() async {
    try {
      debugPrint('🔍 Fetching diocese-wide announcements');

      // Query without orderBy first to avoid index requirement issues
      final QuerySnapshot snapshot = await _firestore
          .collection(_announcementsCollection)
          .where('scope', isEqualTo: 'diocese')
          .where('isArchived', isEqualTo: false)
          .get();

      debugPrint('✅ Found ${snapshot.docs.length} diocese announcements');

      final announcements = snapshot.docs.map((doc) {
        final data = doc.data() as Map<String, dynamic>;
        return Announcement.fromJson({
          'id': doc.id,
          'title': data['title'],
          'description': data['description'],
          'dateTime':
              (data['eventDate'] as Timestamp).toDate().toIso8601String(),
          'endDateTime': data['endDate'] != null
              ? (data['endDate'] as Timestamp).toDate().toIso8601String()
              : null,
          'venue': data['venue'],
          'scope': data['scope'],
          'churchId': data['parishId'],
          'diocese': data['diocese'] == 'tagbilaran'
              ? 'Diocese of Tagbilaran'
              : 'Diocese of Talibon',
          'category': data['category'],
          'contactInfo': data['contactInfo'],
          'isRecurring': false,
          'tags': [],
        });
      }).toList();

      // Sort by date in-memory to avoid index requirement
      announcements.sort((a, b) => b.dateTime.compareTo(a.dateTime));

      return announcements;
    } catch (e) {
      debugPrint('❌ Error fetching diocese announcements: $e');
      // Return empty list instead of throwing to handle gracefully
      return [];
    }
  }
}
