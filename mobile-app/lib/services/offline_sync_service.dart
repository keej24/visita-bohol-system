import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:drift/drift.dart';
import '../database/offline_database.dart';
import '../models/church.dart';
import '../models/announcement.dart';
import '../models/user_profile.dart';
import '../models/enums.dart';
import 'connectivity_service.dart';

enum SyncStatus {
  idle,
  syncing,
  success,
  error,
  conflict,
}

class SyncProgress {
  final int current;
  final int total;
  final String currentItem;

  SyncProgress({
    required this.current,
    required this.total,
    required this.currentItem,
  });

  double get percentage => total > 0 ? current / total : 0.0;
}

class OfflineSyncService extends ChangeNotifier {
  static final OfflineSyncService _instance = OfflineSyncService._internal();
  factory OfflineSyncService() => _instance;
  OfflineSyncService._internal();

  final OfflineDatabase _db = OfflineDatabase();
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final ConnectivityService _connectivity = ConnectivityService();

  SyncStatus _status = SyncStatus.idle;
  SyncProgress? _progress;
  String? _lastError;
  DateTime? _lastSyncTime;
  Timer? _autoSyncTimer;

  // Getters
  SyncStatus get status => _status;
  SyncProgress? get progress => _progress;
  String? get lastError => _lastError;
  DateTime? get lastSyncTime => _lastSyncTime;
  bool get isSyncing => _status == SyncStatus.syncing;

  // Initialize sync service
  Future<void> initialize() async {
    debugPrint('🔄 Initializing OfflineSyncService');

    // Load last sync time from database
    _lastSyncTime = await _db.getLastSyncTime();

    // Listen to connectivity changes for automatic sync
    _connectivity.addListener(_onConnectivityChanged);

    // Start periodic sync timer (every 15 minutes when online)
    _startAutoSync();

    debugPrint('🔄 OfflineSyncService initialized. Last sync: $_lastSyncTime');
  }

  // Dispose resources
  @override
  void dispose() {
    _connectivity.removeListener(_onConnectivityChanged);
    _autoSyncTimer?.cancel();
    super.dispose();
  }

  // Handle connectivity changes
  void _onConnectivityChanged() {
    if (_connectivity.isOnline && _status == SyncStatus.idle) {
      // Auto-sync when coming back online
      syncAll();
    }
  }

  // Start automatic sync timer
  void _startAutoSync() {
    _autoSyncTimer?.cancel();
    _autoSyncTimer = Timer.periodic(
      const Duration(minutes: 15),
      (_) {
        if (_connectivity.isOnline && _status == SyncStatus.idle) {
          syncAll();
        }
      },
    );
  }

  // Sync all data (churches, announcements, user data)
  Future<void> syncAll({bool force = false}) async {
    if (!_connectivity.hasConnection) {
      debugPrint('🔄 Sync skipped: No internet connection');
      return;
    }

    if (_status == SyncStatus.syncing) {
      debugPrint('🔄 Sync already in progress');
      return;
    }

    try {
      _updateStatus(SyncStatus.syncing);
      _lastError = null;

      // Calculate total items to sync
      final churchCount = await _db.getChurchCount();
      final announcementCount = await _db.getAnnouncementCount();
      final totalItems = churchCount + announcementCount + 1; // +1 for user profile

      int currentItem = 0;

      // Sync churches
      _updateProgress(SyncProgress(
        current: currentItem,
        total: totalItems,
        currentItem: 'Syncing churches...',
      ));

      await _syncChurches(force);
      currentItem += churchCount;

      // Sync announcements
      _updateProgress(SyncProgress(
        current: currentItem,
        total: totalItems,
        currentItem: 'Syncing announcements...',
      ));

      await _syncAnnouncements(force);
      currentItem += announcementCount;

      // Sync user profile
      _updateProgress(SyncProgress(
        current: currentItem,
        total: totalItems,
        currentItem: 'Syncing user profile...',
      ));

      await _syncUserProfile(force);
      currentItem++;

      // Process pending sync logs
      await _processPendingSyncLogs();

      _lastSyncTime = DateTime.now();
      _updateStatus(SyncStatus.success);
      _updateProgress(null);

      debugPrint('🔄 Sync completed successfully');

    } catch (e) {
      _lastError = e.toString();
      _updateStatus(SyncStatus.error);
      _updateProgress(null);
      debugPrint('❌ Sync failed: $e');
    }
  }

  // Sync churches from Firestore
  Future<void> _syncChurches(bool force) async {
    try {
      final query = _firestore.collection('churches')
          .where('status', isEqualTo: 'approved');

      // If not force sync, only get churches updated since last sync
      if (!force && _lastSyncTime != null) {
        query.where('updatedAt', isGreaterThan: _lastSyncTime);
      }

      final snapshot = await query.get();

      for (final doc in snapshot.docs) {
        try {
          final data = doc.data();

          // Create church from Firestore data
          final church = Church(
            id: doc.id,
            name: data['name'] ?? '',
            location: data['location'] ?? '',
            latitude: (data['latitude'] as num?)?.toDouble() ?? 0.0,
            longitude: (data['longitude'] as num?)?.toDouble() ?? 0.0,
            foundingYear: data['foundingYear'] as int?,
            architecturalStyle: ArchitecturalStyleX.fromLabel(data['architecturalStyle']),
            heritageClassification: HeritageClassificationX.fromLabel(data['heritageClassification']),
            history: data['history'],
            images: (data['images'] as List?)?.cast<String>() ?? [],
            isHeritage: data['isHeritage'] ?? false,
            diocese: data['diocese'] ?? '',
            status: data['status'] ?? 'approved',
          );

          // Convert to offline format
          final offlineChurch = OfflineChurchesCompanion(
            id: Value(church.id),
            name: Value(church.name),
            fullName: Value(church.name),
            location: Value(church.location),
            municipality: Value(church.location),
            diocese: Value(church.diocese),
            foundingYear: Value(church.foundingYear),
            foundersJson: const Value(null),
            architecturalStyle: Value(church.architecturalStyle.label),
            history: Value(church.history),
            description: Value(church.history),
            heritageClassification: Value(church.heritageClassification.label),
            assignedPriest: const Value(null),
            massSchedulesJson: const Value(null),
            latitude: Value(church.latitude),
            longitude: Value(church.longitude),
            contactInfoJson: const Value(null),
            imagesJson: Value(jsonEncode(church.images)),
            isPublicVisible: const Value(true),
            status: Value(church.status),
            createdAt: Value(DateTime.now()),
            updatedAt: Value(DateTime.now()),
            lastSyncedAt: Value(DateTime.now()),
            needsSync: const Value(false),
          );

          // Check if church exists
          final existing = await _db.getChurchById(church.id);
          if (existing != null) {
            await _db.updateChurch(offlineChurch);
          } else {
            await _db.insertChurch(offlineChurch);
          }

        } catch (e) {
          debugPrint('❌ Error syncing church ${doc.id}: $e');
        }
      }

    } catch (e) {
      debugPrint('❌ Error syncing churches: $e');
      rethrow;
    }
  }

  // Sync announcements from Firestore
  Future<void> _syncAnnouncements(bool force) async {
    try {
      final query = _firestore.collection('announcements')
          .where('isActive', isEqualTo: true);

      // If not force sync, only get announcements updated since last sync
      if (!force && _lastSyncTime != null) {
        query.where('updatedAt', isGreaterThan: _lastSyncTime);
      }

      final snapshot = await query.get();

      for (final doc in snapshot.docs) {
        try {
          final data = doc.data();

          // Create announcement from Firestore data
          final announcement = Announcement(
            id: doc.id,
            title: data['title'] ?? '',
            description: data['description'] ?? '',
            dateTime: (data['dateTime'] as Timestamp?)?.toDate() ?? DateTime.now(),
            endDateTime: (data['endDateTime'] as Timestamp?)?.toDate(),
            venue: data['venue'] ?? '',
            scope: data['scope'] ?? 'diocese',
            churchId: data['churchId'],
            diocese: data['diocese'] ?? 'Diocese of Tagbilaran',
            category: data['category'] ?? 'Community Event',
            imageUrl: data['imageUrl'],
            contactInfo: data['contactInfo'],
            isRecurring: data['isRecurring'] ?? false,
            tags: (data['tags'] as List?)?.cast<String>() ?? [],
            locationUrl: data['locationUrl'],
          );

          // Convert to offline format
          final offlineAnnouncement = OfflineAnnouncementsCompanion(
            id: Value(announcement.id),
            title: Value(announcement.title),
            content: Value(announcement.description),
            churchId: Value(announcement.churchId),
            diocese: Value(announcement.diocese),
            eventDate: Value(announcement.dateTime),
            venue: Value(announcement.venue),
            imageUrl: Value(announcement.imageUrl),
            priority: const Value('medium'),
            isActive: const Value(true),
            createdAt: Value(DateTime.now()),
            updatedAt: Value(DateTime.now()),
            lastSyncedAt: Value(DateTime.now()),
            needsSync: const Value(false),
          );

          // Check if announcement exists
          final existing = await _db.getAnnouncementById(announcement.id);
          if (existing != null) {
            await _db.updateAnnouncement(offlineAnnouncement);
          } else {
            await _db.insertAnnouncement(offlineAnnouncement);
          }

        } catch (e) {
          debugPrint('❌ Error syncing announcement ${doc.id}: $e');
        }
      }

    } catch (e) {
      debugPrint('❌ Error syncing announcements: $e');
      rethrow;
    }
  }

  // Sync user profile from Firestore
  Future<void> _syncUserProfile(bool force) async {
    try {
      // This would typically sync the current user's profile
      // Implementation depends on your auth system
      debugPrint('🔄 User profile sync - placeholder implementation');

    } catch (e) {
      debugPrint('❌ Error syncing user profile: $e');
      rethrow;
    }
  }

  // Process pending sync logs (upload local changes)
  Future<void> _processPendingSyncLogs() async {
    try {
      final unsyncedLogs = await _db.getUnsyncedLogs();

      for (final log in unsyncedLogs) {
        try {
          await _processSyncLog(log);
          await _db.markSyncLogAsCompleted(log.id);
        } catch (e) {
          debugPrint('❌ Error processing sync log ${log.id}: $e');
          // Increment retry count or handle errors
        }
      }

    } catch (e) {
      debugPrint('❌ Error processing sync logs: $e');
      rethrow;
    }
  }

  // Process individual sync log
  Future<void> _processSyncLog(OfflineSyncLog log) async {
    switch (log.entityType) {
      case 'church':
        await _uploadChurchChanges(log);
        break;
      case 'announcement':
        await _uploadAnnouncementChanges(log);
        break;
      case 'user':
        await _uploadUserChanges(log);
        break;
      default:
        debugPrint('❌ Unknown entity type: ${log.entityType}');
    }
  }

  // Upload church changes to Firestore
  Future<void> _uploadChurchChanges(OfflineSyncLog log) async {
    // Implementation depends on user permissions
    // Public users typically can't modify church data
    debugPrint('🔄 Church upload - placeholder implementation');
  }

  // Upload announcement changes to Firestore
  Future<void> _uploadAnnouncementChanges(OfflineSyncLog log) async {
    // Implementation depends on user permissions
    debugPrint('🔄 Announcement upload - placeholder implementation');
  }

  // Upload user changes to Firestore
  Future<void> _uploadUserChanges(OfflineSyncLog log) async {
    try {
      final userData = await _db.getUserProfile(log.entityId);
      if (userData == null) return;

      // Convert to Firestore format and upload
      final userProfile = UserProfile(
        id: userData.id,
        email: userData.email,
        displayName: userData.displayName,
        phoneNumber: userData.phoneNumber,
        location: userData.location,
        bio: userData.bio,
        accountType: userData.accountType,
        visitedChurches: (jsonDecode(userData.visitedChurchesJson) as List).cast<String>(),
        favoriteChurches: (jsonDecode(userData.favoriteChurchesJson) as List).cast<String>(),
        forVisitChurches: (jsonDecode(userData.forVisitChurchesJson) as List).cast<String>(),
        journalEntries: [], // Parse from JSON if needed
        createdAt: userData.createdAt,
      );

      await _firestore.collection('users').doc(userData.id).set(userProfile.toJson());

    } catch (e) {
      debugPrint('❌ Error uploading user changes: $e');
      rethrow;
    }
  }

  // Force full sync
  Future<void> forceSync() async {
    await syncAll(force: true);
  }

  // Sync specific church
  Future<void> syncChurch(String churchId) async {
    if (!_connectivity.hasConnection) return;

    try {
      final doc = await _firestore.collection('churches').doc(churchId).get();
      if (!doc.exists) return;

      // For single church sync - placeholder implementation
      debugPrint('🔄 Single church sync for $churchId');

      // Convert and save to offline database
      // Implementation similar to _syncChurches but for single church

    } catch (e) {
      debugPrint('❌ Error syncing church $churchId: $e');
    }
  }

  // Clear offline data
  Future<void> clearOfflineData() async {
    try {
      _updateStatus(SyncStatus.syncing);

      // Clear all tables except user profiles
      await _db.customStatement('DELETE FROM offline_churches');
      await _db.customStatement('DELETE FROM offline_announcements');
      await _db.customStatement('DELETE FROM offline_sync_logs');

      _lastSyncTime = null;
      _updateStatus(SyncStatus.idle);

      debugPrint('🔄 Offline data cleared');

    } catch (e) {
      _lastError = e.toString();
      _updateStatus(SyncStatus.error);
      debugPrint('❌ Error clearing offline data: $e');
    }
  }

  // Update sync status
  void _updateStatus(SyncStatus newStatus) {
    if (_status != newStatus) {
      _status = newStatus;
      notifyListeners();
    }
  }

  // Update sync progress
  void _updateProgress(SyncProgress? newProgress) {
    _progress = newProgress;
    notifyListeners();
  }

  // Get sync statistics
  Map<String, dynamic> getSyncStats() {
    return {
      'status': _status.name,
      'lastSyncTime': _lastSyncTime?.toIso8601String(),
      'lastError': _lastError,
      'hasConnection': _connectivity.hasConnection,
      'isAutoSyncEnabled': _autoSyncTimer?.isActive ?? false,
    };
  }
}