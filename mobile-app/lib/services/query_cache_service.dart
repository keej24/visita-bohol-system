import 'package:flutter/foundation.dart';

/// Service for caching query results to reduce Firestore reads
///
/// Implements an in-memory LRU cache with time-based expiration.
/// Helps reduce network usage and improve app responsiveness.
///
/// Usage:
/// ```dart
/// final cache = QueryCacheService();
///
/// // Check cache
/// final cached = await cache.get<List<Church>>('churches_approved');
/// if (cached != null) {
///   return cached; // Cache hit
/// }
///
/// // Query and cache
/// final data = await fetchFromFirestore();
/// cache.set('churches_approved', data);
/// ```
class QueryCacheService {
  static final QueryCacheService _instance = QueryCacheService._internal();
  factory QueryCacheService() => _instance;
  QueryCacheService._internal();

  /// In-memory cache storage
  final Map<String, CachedQuery> _cache = {};

  /// Default cache duration (5 minutes)
  static const Duration defaultCacheDuration = Duration(minutes: 5);

  /// Maximum cache size (number of entries)
  static const int maxCacheSize = 50;

  /// Cache hit counter (for monitoring)
  int _cacheHits = 0;

  /// Cache miss counter (for monitoring)
  int _cacheMisses = 0;

  /// Get cached data for a key
  ///
  /// Returns null if:
  /// - Key doesn't exist in cache
  /// - Cached data has expired
  ///
  /// Returns the cached data if still valid.
  T? get<T>(String key) {
    final cached = _cache[key];

    if (cached == null) {
      _cacheMisses++;
      debugPrint('❌ [CACHE] Miss: $key (total misses: $_cacheMisses)');
      return null;
    }

    // Check if cache entry is still valid
    final now = DateTime.now();
    final age = now.difference(cached.timestamp);

    if (age > cached.duration) {
      // Expired - remove from cache
      _cache.remove(key);
      _cacheMisses++;
      debugPrint('⏰ [CACHE] Expired: $key (age: ${age.inMinutes}m)');
      return null;
    }

    _cacheHits++;
    debugPrint(
        '✅ [CACHE] Hit: $key (age: ${age.inSeconds}s, hits: $_cacheHits)');
    return cached.data as T;
  }

  /// Store data in cache with optional custom duration
  ///
  /// If cache is full, removes the oldest entry (LRU eviction).
  void set<T>(String key, T data, {Duration? duration}) {
    // Enforce cache size limit (LRU eviction)
    if (_cache.length >= maxCacheSize) {
      _evictOldest();
    }

    _cache[key] = CachedQuery(
      data: data,
      timestamp: DateTime.now(),
      duration: duration ?? defaultCacheDuration,
    );

    debugPrint(
        '💾 [CACHE] Set: $key (duration: ${(duration ?? defaultCacheDuration).inMinutes}m, size: ${_cache.length})');
  }

  /// Invalidate (remove) cached data by key
  ///
  /// Useful when data is updated and cache should be refreshed.
  void invalidate(String key) {
    final removed = _cache.remove(key);
    if (removed != null) {
      debugPrint('🗑️ [CACHE] Invalidated: $key');
    }
  }

  /// Invalidate all keys matching a pattern (prefix match)
  ///
  /// Example:
  /// ```dart
  /// cache.invalidatePattern('churches_'); // Removes all church-related caches
  /// ```
  void invalidatePattern(String keyPattern) {
    final keysToRemove =
        _cache.keys.where((key) => key.startsWith(keyPattern)).toList();

    for (final key in keysToRemove) {
      _cache.remove(key);
    }

    if (keysToRemove.isNotEmpty) {
      debugPrint(
          '🗑️ [CACHE] Invalidated ${keysToRemove.length} keys matching "$keyPattern"');
    }
  }

  /// Clear all cached data
  void clearAll() {
    final count = _cache.length;
    _cache.clear();
    _cacheHits = 0;
    _cacheMisses = 0;
    debugPrint('🗑️ [CACHE] Cleared all ($count entries)');
  }

  /// Get cache statistics
  CacheStats getStats() {
    // Remove expired entries before calculating stats
    _removeExpired();

    final totalRequests = _cacheHits + _cacheMisses;
    final hitRate =
        totalRequests > 0 ? (_cacheHits / totalRequests) * 100.0 : 0.0;

    return CacheStats(
      size: _cache.length,
      hits: _cacheHits,
      misses: _cacheMisses,
      hitRate: hitRate,
      maxSize: maxCacheSize,
    );
  }

  /// Print cache statistics to debug console
  void printStats() {
    final stats = getStats();
    debugPrint('📊 [CACHE] Statistics:');
    debugPrint('   - Size: ${stats.size}/${stats.maxSize}');
    debugPrint('   - Hits: ${stats.hits}');
    debugPrint('   - Misses: ${stats.misses}');
    debugPrint('   - Hit Rate: ${stats.hitRate.toStringAsFixed(1)}%');
  }

  /// Evict the oldest cache entry (LRU)
  void _evictOldest() {
    if (_cache.isEmpty) return;

    // Find the oldest entry
    String? oldestKey;
    DateTime? oldestTime;

    for (final entry in _cache.entries) {
      if (oldestTime == null || entry.value.timestamp.isBefore(oldestTime)) {
        oldestKey = entry.key;
        oldestTime = entry.value.timestamp;
      }
    }

    if (oldestKey != null) {
      _cache.remove(oldestKey);
      debugPrint('🗑️ [CACHE] Evicted oldest: $oldestKey (LRU)');
    }
  }

  /// Remove all expired entries from cache
  void _removeExpired() {
    final now = DateTime.now();
    final expiredKeys = <String>[];

    for (final entry in _cache.entries) {
      final age = now.difference(entry.value.timestamp);
      if (age > entry.value.duration) {
        expiredKeys.add(entry.key);
      }
    }

    for (final key in expiredKeys) {
      _cache.remove(key);
    }

    if (expiredKeys.isNotEmpty) {
      debugPrint('🗑️ [CACHE] Removed ${expiredKeys.length} expired entries');
    }
  }
}

/// Represents a cached query result with metadata
class CachedQuery {
  /// The cached data
  final dynamic data;

  /// When this entry was cached
  final DateTime timestamp;

  /// How long this entry is valid
  final Duration duration;

  CachedQuery({
    required this.data,
    required this.timestamp,
    required this.duration,
  });

  /// Calculate the age of this cache entry
  Duration get age => DateTime.now().difference(timestamp);

  /// Check if this cache entry has expired
  bool get isExpired => age > duration;

  /// Calculate remaining time until expiration
  Duration get timeUntilExpiration {
    final remaining = duration - age;
    return remaining.isNegative ? Duration.zero : remaining;
  }
}

/// Cache statistics
class CacheStats {
  /// Current number of cached entries
  final int size;

  /// Total cache hits
  final int hits;

  /// Total cache misses
  final int misses;

  /// Hit rate percentage (0-100)
  final double hitRate;

  /// Maximum cache size
  final int maxSize;

  CacheStats({
    required this.size,
    required this.hits,
    required this.misses,
    required this.hitRate,
    required this.maxSize,
  });

  /// Calculate cache usage percentage
  double get usagePercent => (size / maxSize) * 100;

  @override
  String toString() {
    return 'CacheStats(size: $size/$maxSize, hits: $hits, misses: $misses, hitRate: ${hitRate.toStringAsFixed(1)}%)';
  }
}
