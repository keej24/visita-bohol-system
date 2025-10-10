import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;
import 'package:crypto/crypto.dart';
import 'package:drift/drift.dart';
import 'dart:convert';
import '../database/offline_database.dart';
import 'connectivity_service.dart';

class OfflineImageCacheService extends ChangeNotifier {
  static final OfflineImageCacheService _instance = OfflineImageCacheService._internal();
  factory OfflineImageCacheService() => _instance;
  OfflineImageCacheService._internal();

  final OfflineDatabase _db = OfflineDatabase();
  final ConnectivityService _connectivity = ConnectivityService();

  late Directory _cacheDirectory;
  bool _initialized = false;
  int _maxCacheSizeMB = 100; // 100MB default
  int _currentCacheSizeMB = 0;

  // Cache statistics
  int _cacheHits = 0;
  int _cacheMisses = 0;
  int _totalRequests = 0;

  // Getters
  bool get isInitialized => _initialized;
  int get maxCacheSizeMB => _maxCacheSizeMB;
  int get currentCacheSizeMB => _currentCacheSizeMB;
  double get cacheHitRatio => _totalRequests > 0 ? _cacheHits / _totalRequests : 0;

  // Initialize cache service
  Future<void> initialize({int maxCacheSizeMB = 100}) async {
    if (_initialized) return;

    debugPrint('🖼️ Initializing OfflineImageCacheService');

    _maxCacheSizeMB = maxCacheSizeMB;

    // Get cache directory
    final appDir = await getApplicationDocumentsDirectory();
    _cacheDirectory = Directory(path.join(appDir.path, 'image_cache'));

    // Create cache directory if it doesn't exist
    if (!await _cacheDirectory.exists()) {
      await _cacheDirectory.create(recursive: true);
    }

    // Calculate current cache size
    await _calculateCacheSize();

    // Clean up old cache entries
    await _cleanupOldCache();

    _initialized = true;
    debugPrint('🖼️ OfflineImageCacheService initialized. Cache size: ${_currentCacheSizeMB}MB');
  }

  // Get cached image or download if not available
  Future<Uint8List?> getImage(String url, {bool isPermanent = false}) async {
    if (!_initialized) await initialize();

    _totalRequests++;
    final cacheId = _generateCacheId(url);

    try {
      // First, check database cache
      final cachedImage = await _db.getCachedImage(url);

      if (cachedImage != null) {
        // Check if file still exists
        final file = File(cachedImage.localPath);
        if (await file.exists()) {
          // Update last accessed time
          await _updateLastAccessed(cacheId);
          _cacheHits++;
          debugPrint('🖼️ Cache HIT: $url');
          return await file.readAsBytes();
        } else {
          // File missing, remove from database
          await _db.deleteCachedImage(cacheId);
        }
      }

      // Cache miss - download if online
      if (_connectivity.isOnline) {
        _cacheMisses++;
        debugPrint('🖼️ Cache MISS: $url - downloading...');
        return await _downloadAndCacheImage(url, cacheId, isPermanent);
      } else {
        debugPrint('🖼️ Cache MISS: $url - offline, cannot download');
        return null;
      }

    } catch (e) {
      debugPrint('❌ Error getting image $url: $e');
      return null;
    }
  }

  // Download and cache image
  Future<Uint8List?> _downloadAndCacheImage(String url, String cacheId, bool isPermanent) async {
    try {
      final response = await http.get(
        Uri.parse(url),
        headers: {'User-Agent': 'VisitaApp/1.0'},
      );

      if (response.statusCode == 200) {
        final imageBytes = response.bodyBytes;
        final filePath = path.join(_cacheDirectory.path, '$cacheId.jpg');
        final file = File(filePath);

        // Save to file system
        await file.writeAsBytes(imageBytes);

        // Save to database
        await _db.insertCachedImage(
          OfflineImageCachesCompanion(
            id: Value(cacheId),
            url: Value(url),
            localPath: Value(filePath),
            sizeBytes: Value(imageBytes.length),
            cachedAt: Value(DateTime.now()),
            lastAccessedAt: Value(DateTime.now()),
            isPermanent: Value(isPermanent),
          ),
        );

        // Update cache size
        _currentCacheSizeMB += (imageBytes.length / (1024 * 1024)).ceil();

        // Check if we need to cleanup
        if (_currentCacheSizeMB > _maxCacheSizeMB) {
          await _enforceMaxCacheSize();
        }

        debugPrint('🖼️ Image cached: $url (${(imageBytes.length / 1024).toStringAsFixed(1)}KB)');
        notifyListeners();

        return imageBytes;
      } else {
        debugPrint('❌ Failed to download image: $url (${response.statusCode})');
        return null;
      }

    } catch (e) {
      debugPrint('❌ Error downloading image $url: $e');
      return null;
    }
  }

  // Preload images for offline use
  Future<void> preloadImages(List<String> urls, {bool isPermanent = true}) async {
    if (!_connectivity.isOnline) {
      debugPrint('🖼️ Cannot preload images - offline');
      return;
    }

    debugPrint('🖼️ Preloading ${urls.length} images...');

    int loaded = 0;
    for (final url in urls) {
      try {
        await getImage(url, isPermanent: isPermanent);
        loaded++;
      } catch (e) {
        debugPrint('❌ Error preloading image $url: $e');
      }
    }

    debugPrint('🖼️ Preloaded $loaded/${urls.length} images');
  }

  // Update last accessed time
  Future<void> _updateLastAccessed(String cacheId) async {
    try {
      await _db.updateCachedImage(
        OfflineImageCachesCompanion(
          id: Value(cacheId),
          lastAccessedAt: Value(DateTime.now()),
        ),
      );
    } catch (e) {
      debugPrint('❌ Error updating last accessed: $e');
    }
  }

  // Enforce maximum cache size
  Future<void> _enforceMaxCacheSize() async {
    try {
      debugPrint('🖼️ Enforcing max cache size...');

      // Get all non-permanent cached images, sorted by last accessed (oldest first)
      final cachedImages = await _db.getAllCachedImages();
      final nonPermanentImages = cachedImages
          .where((img) => !img.isPermanent)
          .toList()
        ..sort((a, b) => a.lastAccessedAt.compareTo(b.lastAccessedAt));

      int freedSpace = 0;
      for (final image in nonPermanentImages) {
        if (_currentCacheSizeMB <= _maxCacheSizeMB * 0.8) break; // Leave 20% buffer

        try {
          // Delete file
          final file = File(image.localPath);
          if (await file.exists()) {
            await file.delete();
            freedSpace += image.sizeBytes;
          }

          // Remove from database
          await _db.deleteCachedImage(image.id);

        } catch (e) {
          debugPrint('❌ Error deleting cached image ${image.id}: $e');
        }
      }

      // Recalculate cache size
      await _calculateCacheSize();

      debugPrint('🖼️ Cache cleanup completed. Freed: ${(freedSpace / (1024 * 1024)).toStringAsFixed(1)}MB');
      notifyListeners();

    } catch (e) {
      debugPrint('❌ Error enforcing cache size: $e');
    }
  }

  // Calculate current cache size
  Future<void> _calculateCacheSize() async {
    try {
      final cachedImages = await _db.getAllCachedImages();
      int totalSize = 0;

      for (final image in cachedImages) {
        final file = File(image.localPath);
        if (await file.exists()) {
          totalSize += image.sizeBytes;
        } else {
          // File missing, remove from database
          await _db.deleteCachedImage(image.id);
        }
      }

      _currentCacheSizeMB = (totalSize / (1024 * 1024)).ceil();

    } catch (e) {
      debugPrint('❌ Error calculating cache size: $e');
    }
  }

  // Clean up old cache entries
  Future<void> _cleanupOldCache() async {
    try {
      // Remove cache entries older than 30 days (except permanent ones)
      final cutoffDate = DateTime.now().subtract(const Duration(days: 30));
      final deletedCount = await _db.clearOldCachedImages(cutoffDate);

      if (deletedCount > 0) {
        debugPrint('🖼️ Cleaned up $deletedCount old cache entries');
      }

    } catch (e) {
      debugPrint('❌ Error cleaning up old cache: $e');
    }
  }

  // Generate cache ID from URL
  String _generateCacheId(String url) {
    final bytes = utf8.encode(url);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  // Clear all cache
  Future<void> clearCache() async {
    try {
      debugPrint('🖼️ Clearing all image cache...');

      // Delete all cache files
      final cachedImages = await _db.getAllCachedImages();
      for (final image in cachedImages) {
        try {
          final file = File(image.localPath);
          if (await file.exists()) {
            await file.delete();
          }
        } catch (e) {
          debugPrint('❌ Error deleting file ${image.localPath}: $e');
        }
      }

      // Clear database
      await _db.customStatement('DELETE FROM offline_image_caches');

      // Reset counters
      _currentCacheSizeMB = 0;
      _cacheHits = 0;
      _cacheMisses = 0;
      _totalRequests = 0;

      debugPrint('🖼️ Image cache cleared');
      notifyListeners();

    } catch (e) {
      debugPrint('❌ Error clearing cache: $e');
    }
  }

  // Clear only temporary cache (keep permanent images)
  Future<void> clearTemporaryCache() async {
    try {
      debugPrint('🖼️ Clearing temporary image cache...');

      // Get temporary cached images
      final cachedImages = await _db.getAllCachedImages();
      final temporaryImages = cachedImages.where((img) => !img.isPermanent);

      for (final image in temporaryImages) {
        try {
          final file = File(image.localPath);
          if (await file.exists()) {
            await file.delete();
          }
          await _db.deleteCachedImage(image.id);
        } catch (e) {
          debugPrint('❌ Error deleting temporary cache ${image.id}: $e');
        }
      }

      // Recalculate cache size
      await _calculateCacheSize();

      debugPrint('🖼️ Temporary cache cleared');
      notifyListeners();

    } catch (e) {
      debugPrint('❌ Error clearing temporary cache: $e');
    }
  }

  // Get cache statistics
  Map<String, dynamic> getCacheStats() {
    return {
      'totalRequests': _totalRequests,
      'cacheHits': _cacheHits,
      'cacheMisses': _cacheMisses,
      'hitRatio': cacheHitRatio,
      'currentSizeMB': _currentCacheSizeMB,
      'maxSizeMB': _maxCacheSizeMB,
      'utilizationPercent': (_currentCacheSizeMB / _maxCacheSizeMB * 100).toStringAsFixed(1),
    };
  }

  // Check if image is cached
  Future<bool> isImageCached(String url) async {
    if (!_initialized) return false;

    try {
      final cachedImage = await _db.getCachedImage(url);
      if (cachedImage != null) {
        final file = File(cachedImage.localPath);
        return await file.exists();
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // Get local file path for cached image
  Future<String?> getCachedImagePath(String url) async {
    try {
      final cachedImage = await _db.getCachedImage(url);
      if (cachedImage != null) {
        final file = File(cachedImage.localPath);
        if (await file.exists()) {
          return cachedImage.localPath;
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}