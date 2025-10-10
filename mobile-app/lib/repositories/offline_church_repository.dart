import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:drift/drift.dart';
import '../database/offline_database.dart';
import '../models/church.dart';
import '../models/enums.dart';
import '../services/connectivity_service.dart';
import '../services/offline_sync_service.dart';
import 'firestore_church_repository.dart';

class OfflineChurchRepository extends ChangeNotifier {
  final OfflineDatabase _db = OfflineDatabase();
  final ConnectivityService _connectivity = ConnectivityService();
  final OfflineSyncService _syncService = OfflineSyncService();
  final FirestoreChurchRepository _firestoreRepo = FirestoreChurchRepository();

  List<Church> _cachedChurches = [];
  bool _isLoading = false;
  String? _lastError;

  // Getters
  List<Church> get churches => _cachedChurches;
  bool get isLoading => _isLoading;
  String? get lastError => _lastError;
  bool get hasOfflineData => _cachedChurches.isNotEmpty;

  // Initialize repository
  Future<void> initialize() async {
    debugPrint('🏛️ Initializing OfflineChurchRepository');
    await loadChurches();
  }

  // Load churches (offline-first approach)
  Future<List<Church>> loadChurches() async {
    _setLoading(true);
    _lastError = null;

    try {
      // First, load from offline database
      await _loadOfflineChurches();

      // If online and no offline data, or if we want fresh data, sync
      if (_connectivity.isOnline) {
        if (_cachedChurches.isEmpty || await _shouldRefreshData()) {
          await _syncService.syncAll();
          await _loadOfflineChurches(); // Reload after sync
        }
      }

      debugPrint('🏛️ Loaded ${_cachedChurches.length} churches');
      return _cachedChurches;

    } catch (e) {
      _lastError = e.toString();
      debugPrint('❌ Error loading churches: $e');
      return _cachedChurches; // Return cached data even if sync fails
    } finally {
      _setLoading(false);
    }
  }

  // Load churches from offline database
  Future<void> _loadOfflineChurches() async {
    try {
      final offlineChurches = await _db.getAllChurches();
      _cachedChurches = offlineChurches.map(_convertFromOffline).toList();
      notifyListeners();
    } catch (e) {
      debugPrint('❌ Error loading offline churches: $e');
      rethrow;
    }
  }

  // Check if we should refresh data
  Future<bool> _shouldRefreshData() async {
    final lastSync = await _db.getLastSyncTime();
    if (lastSync == null) return true;

    // Refresh if last sync was more than 1 hour ago
    final hoursSinceSync = DateTime.now().difference(lastSync).inHours;
    return hoursSinceSync >= 1;
  }

  // Get church by ID (offline-first)
  Future<Church?> getChurchById(String id) async {
    try {
      // First check cache
      final cachedChurch = _cachedChurches.where((c) => c.id == id).firstOrNull;
      if (cachedChurch != null) {
        return cachedChurch;
      }

      // Check offline database
      final offlineChurch = await _db.getChurchById(id);
      if (offlineChurch != null) {
        return _convertFromOffline(offlineChurch);
      }

      // If online, try to fetch from Firestore and cache
      if (_connectivity.isOnline) {
        final church = await _firestoreRepo.getChurchById(id);
        if (church != null) {
          await _cacheChurch(church);
          return church;
        }
      }

      return null;
    } catch (e) {
      debugPrint('❌ Error getting church $id: $e');
      return null;
    }
  }

  // Get churches by diocese
  Future<List<Church>> getChurchesByDiocese(String diocese) async {
    try {
      final offlineChurches = await _db.getChurchesByDiocese(diocese);
      return offlineChurches.map(_convertFromOffline).toList();
    } catch (e) {
      debugPrint('❌ Error getting churches by diocese: $e');
      return [];
    }
  }

  // Search churches (offline)
  List<Church> searchChurches(String query) {
    if (query.isEmpty) return _cachedChurches;

    final lowercaseQuery = query.toLowerCase();
    return _cachedChurches.where((church) {
      return church.name.toLowerCase().contains(lowercaseQuery) ||
          church.location.toLowerCase().contains(lowercaseQuery) ||
          (church.history != null && church.history!.toLowerCase().contains(lowercaseQuery));
    }).toList();
  }

  // Filter churches by criteria
  List<Church> filterChurches({
    String? architecturalStyle,
    HeritageClassification? heritage,
    int? foundingYear,
    String? location,
  }) {
    return _cachedChurches.where((church) {
      if (architecturalStyle != null && church.architecturalStyle.label != architecturalStyle) {
        return false;
      }
      if (heritage != null && church.heritageClassification != heritage) {
        return false;
      }
      if (foundingYear != null && church.foundingYear != foundingYear) {
        return false;
      }
      if (location != null && church.location != location) {
        return false;
      }
      return true;
    }).toList();
  }

  // Cache single church
  Future<void> _cacheChurch(Church church) async {
    try {
      final offlineChurch = _convertToOffline(church);

      final existing = await _db.getChurchById(church.id);
      if (existing != null) {
        await _db.updateChurch(offlineChurch);
      } else {
        await _db.insertChurch(offlineChurch);
      }

      // Update cached list
      final index = _cachedChurches.indexWhere((c) => c.id == church.id);
      if (index >= 0) {
        _cachedChurches[index] = church;
      } else {
        _cachedChurches.add(church);
      }
      notifyListeners();

    } catch (e) {
      debugPrint('❌ Error caching church: $e');
    }
  }

  // Convert offline church to Church model
  Church _convertFromOffline(OfflineChurch offline) {
    return Church(
      id: offline.id,
      name: offline.name,
      location: offline.location,
      latitude: offline.latitude,
      longitude: offline.longitude,
      foundingYear: offline.foundingYear,
      architecturalStyle: offline.architecturalStyle != null
          ? ArchitecturalStyleX.fromLabel(offline.architecturalStyle!)
          : ArchitecturalStyle.other,
      heritageClassification: HeritageClassificationX.fromLabel(offline.heritageClassification),
      history: offline.history,
      images: offline.imagesJson != null
          ? (jsonDecode(offline.imagesJson!) as List).cast<String>()
          : const [],
      isHeritage: offline.heritageClassification != 'none',
      diocese: offline.diocese,
      virtualTourUrl: null, // TODO: Add field if needed
      virtual360Images: null, // TODO: Add field if needed
      status: offline.status,
    );
  }

  // Convert Church model to offline format
  OfflineChurchesCompanion _convertToOffline(Church church) {
    return OfflineChurchesCompanion(
      id: Value(church.id),
      name: Value(church.name),
      fullName: Value(church.name), // Use name as fullName
      location: Value(church.location),
      municipality: Value(church.location), // Use location as municipality
      diocese: Value(church.diocese),
      foundingYear: Value(church.foundingYear),
      foundersJson: const Value(null), // Not available in current model
      architecturalStyle: Value(church.architecturalStyle.label),
      history: Value(church.history),
      description: Value(church.history), // Use history as description
      heritageClassification: Value(church.heritageClassification.label),
      assignedPriest: const Value(null), // Not available in current model
      massSchedulesJson: const Value(null), // Not available in current model
      latitude: Value(church.latitude),
      longitude: Value(church.longitude),
      contactInfoJson: const Value(null), // Not available in current model
      imagesJson: Value(jsonEncode(church.images)),
      isPublicVisible: const Value(true), // Default to true
      status: Value(church.status),
      createdAt: Value(DateTime.now()),
      updatedAt: Value(DateTime.now()),
      lastSyncedAt: Value(DateTime.now()),
      needsSync: const Value(false),
    );
  }

  // Force refresh from network
  Future<void> refresh() async {
    if (!_connectivity.isOnline) {
      throw Exception('No internet connection');
    }

    _setLoading(true);
    try {
      await _syncService.forceSync();
      await _loadOfflineChurches();
    } finally {
      _setLoading(false);
    }
  }

  // Get statistics
  Map<String, int> getStatistics() {
    final stats = <String, int>{};

    // Count by heritage classification
    for (final church in _cachedChurches) {
      final key = church.heritageClassification.label;
      stats[key] = (stats[key] ?? 0) + 1;
    }

    return stats;
  }

  // Get municipalities (using location field)
  List<String> getMunicipalities() {
    final municipalities = _cachedChurches
        .map((church) => church.location)
        .toSet()
        .toList();
    municipalities.sort();
    return municipalities;
  }

  // Get architectural styles
  List<ArchitecturalStyle> getArchitecturalStyles() {
    final styles = _cachedChurches
        .map((church) => church.architecturalStyle)
        .toSet()
        .toList();
    return styles;
  }

  // Check if church is cached
  bool isChurchCached(String id) {
    return _cachedChurches.any((church) => church.id == id);
  }

  // Get cache info
  Map<String, dynamic> getCacheInfo() {
    return {
      'totalChurches': _cachedChurches.length,
      'lastUpdated': DateTime.now().toIso8601String(),
      'hasOfflineData': hasOfflineData,
      'isOnline': _connectivity.isOnline,
    };
  }

  // Private helper methods
  void _setLoading(bool loading) {
    if (_isLoading != loading) {
      _isLoading = loading;
      notifyListeners();
    }
  }

  // Clear cache
  Future<void> clearCache() async {
    try {
      await _db.customStatement('DELETE FROM offline_churches');
      _cachedChurches.clear();
      notifyListeners();
      debugPrint('🏛️ Church cache cleared');
    } catch (e) {
      debugPrint('❌ Error clearing cache: $e');
    }
  }
}