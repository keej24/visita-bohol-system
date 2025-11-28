import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/church.dart';
import '../utils/constants.dart';

/// Enhanced Local Data Service with offline caching support
///
/// Provides two-tier data access:
/// 1. SharedPreferences cache (persisted between app launches)
/// 2. Bundled JSON fallback (shipped with app)
///
/// This ensures the app works offline while staying up-to-date when online.
class LocalDataService {
  static const String _cachedChurchesKey = 'cached_churches_v2';
  static const String _cacheTimestampKey = 'cache_timestamp';
  static const Duration _cacheMaxAge = Duration(hours: 24);

  /// Load churches from local storage
  ///
  /// Priority order:
  /// 1. SharedPreferences cache (if fresh)
  /// 2. Bundled JSON file (fallback)
  Future<List<Church>> loadChurches() async {
    try {
      // Try cached data first
      final cachedChurches = await loadCachedChurches();
      if (cachedChurches != null && cachedChurches.isNotEmpty) {
        debugPrint(
            '📱 [LOCAL] Loaded ${cachedChurches.length} churches from cache');
        return cachedChurches;
      }

      // Fallback to bundled JSON
      return await loadBundledChurches();
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ [LOCAL] Failed to load churches: $e');
      }
      // Ultimate fallback - return empty list
      return [];
    }
  }

  /// Load churches from bundled JSON asset
  Future<List<Church>> loadBundledChurches() async {
    try {
      final raw = await rootBundle.loadString(AppConstants.churchesJson);
      if (raw.trim().isEmpty) return [];
      final arr = json.decode(raw) as List<dynamic>;
      final churches =
          arr.map((e) => Church.fromJson(e as Map<String, dynamic>)).toList();
      debugPrint(
          '📦 [LOCAL] Loaded ${churches.length} churches from bundled JSON');
      return churches;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ [LOCAL] Failed to load bundled churches: $e');
      }
      return [];
    }
  }

  /// Load churches from SharedPreferences cache
  Future<List<Church>?> loadCachedChurches() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Check cache age
      final timestampMs = prefs.getInt(_cacheTimestampKey);
      if (timestampMs == null) {
        debugPrint('📱 [LOCAL] No cache timestamp found');
        return null;
      }

      final cacheTime = DateTime.fromMillisecondsSinceEpoch(timestampMs);
      final age = DateTime.now().difference(cacheTime);

      if (age > _cacheMaxAge) {
        debugPrint(
            '⏰ [LOCAL] Cache expired (age: ${age.inHours}h > ${_cacheMaxAge.inHours}h max)');
        return null;
      }

      // Load cached data
      final cachedJson = prefs.getString(_cachedChurchesKey);
      if (cachedJson == null || cachedJson.isEmpty) {
        debugPrint('📱 [LOCAL] No cached data found');
        return null;
      }

      final arr = json.decode(cachedJson) as List<dynamic>;
      final churches =
          arr.map((e) => Church.fromJson(e as Map<String, dynamic>)).toList();

      debugPrint(
          '✅ [LOCAL] Cache hit: ${churches.length} churches (age: ${age.inMinutes}m)');
      return churches;
    } catch (e) {
      debugPrint('❌ [LOCAL] Failed to load cached churches: $e');
      return null;
    }
  }

  /// Save churches to SharedPreferences cache
  ///
  /// Call this after fetching fresh data from Firestore
  Future<bool> cacheChurches(List<Church> churches) async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Convert to JSON
      final jsonList = churches.map((c) => c.toJson()).toList();
      final jsonString = json.encode(jsonList);

      // Save data and timestamp
      await prefs.setString(_cachedChurchesKey, jsonString);
      await prefs.setInt(
          _cacheTimestampKey, DateTime.now().millisecondsSinceEpoch);

      debugPrint('💾 [LOCAL] Cached ${churches.length} churches');
      return true;
    } catch (e) {
      debugPrint('❌ [LOCAL] Failed to cache churches: $e');
      return false;
    }
  }

  /// Clear the churches cache
  Future<void> clearCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_cachedChurchesKey);
      await prefs.remove(_cacheTimestampKey);
      debugPrint('🗑️ [LOCAL] Cache cleared');
    } catch (e) {
      debugPrint('❌ [LOCAL] Failed to clear cache: $e');
    }
  }

  /// Get cache information
  Future<CacheInfo?> getCacheInfo() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      final timestampMs = prefs.getInt(_cacheTimestampKey);
      final cachedJson = prefs.getString(_cachedChurchesKey);

      if (timestampMs == null || cachedJson == null) {
        return null;
      }

      final cacheTime = DateTime.fromMillisecondsSinceEpoch(timestampMs);
      final arr = json.decode(cachedJson) as List<dynamic>;

      return CacheInfo(
        timestamp: cacheTime,
        itemCount: arr.length,
        sizeBytes: cachedJson.length,
      );
    } catch (e) {
      return null;
    }
  }
}

/// Information about the local cache
class CacheInfo {
  final DateTime timestamp;
  final int itemCount;
  final int sizeBytes;

  CacheInfo({
    required this.timestamp,
    required this.itemCount,
    required this.sizeBytes,
  });

  Duration get age => DateTime.now().difference(timestamp);

  String get sizeFormatted {
    if (sizeBytes < 1024) return '$sizeBytes B';
    if (sizeBytes < 1024 * 1024)
      return '${(sizeBytes / 1024).toStringAsFixed(1)} KB';
    return '${(sizeBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  @override
  String toString() {
    return 'CacheInfo(items: $itemCount, size: $sizeFormatted, age: ${age.inMinutes}m)';
  }
}
