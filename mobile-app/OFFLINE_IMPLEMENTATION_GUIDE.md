# VISITA Mobile App - Offline Capabilities Implementation Guide

## Overview

This guide documents the comprehensive offline capabilities added to the VISITA mobile app, enabling users to browse churches, view information, and interact with the app even without an internet connection.

## Architecture

### Offline-First Approach
The app now follows an **offline-first architecture** where:
- Data is primarily loaded from local storage
- Online data is synced in the background when available
- Users can access all core features offline
- Seamless experience between online/offline states

### Key Components

#### 1. Database Layer (`lib/database/`)
- **`offline_database.dart`**: SQLite database using Drift ORM
- Tables for churches, announcements, user profiles, sync logs, and image cache
- Automatic migrations and schema versioning

#### 2. Services (`lib/services/`)
- **`connectivity_service.dart`**: Network connectivity monitoring
- **`offline_sync_service.dart`**: Background data synchronization
- **`offline_image_cache_service.dart`**: Image caching and management
- **`offline_enhanced_church_service.dart`**: Offline-first church data service

#### 3. Repositories (`lib/repositories/`)
- **`offline_church_repository.dart`**: Church data management with offline support
- Handles online/offline data fetching and caching

#### 4. UI Components (`lib/widgets/`)
- **`offline_indicator.dart`**: Connectivity and sync status indicators
- **`cached_network_image_widget.dart`**: Offline-capable image widgets

## Features

### 1. Data Persistence
- **Local SQLite Database**: Stores churches, announcements, and user data
- **Automatic Caching**: Data automatically cached when online
- **Smart Sync**: Only syncs changed data to minimize bandwidth
- **Conflict Resolution**: Handles data conflicts between local and remote

### 2. Image Caching
- **Intelligent Caching**: Images cached based on usage patterns
- **Size Management**: Automatic cleanup to stay within size limits (100MB default)
- **Permanent vs Temporary**: Church images cached permanently, others temporarily
- **Progressive Loading**: Images load from cache first, then update if newer version available

### 3. Connectivity Monitoring
- **Real-time Status**: Continuous network connectivity monitoring
- **Connection Quality**: Detects poor connections vs full offline
- **Auto-sync**: Triggers sync when connection restored
- **User Feedback**: Clear indicators of connection status

### 4. Background Sync
- **Periodic Sync**: Automatic sync every 15 minutes when online
- **Change Detection**: Only syncs modified data
- **Retry Logic**: Handles failed syncs with exponential backoff
- **Progress Tracking**: Real-time sync progress indicators

### 5. Offline Search & Filtering
- **Full-text Search**: Search churches by name, location, history
- **Advanced Filters**: Filter by heritage, architectural style, diocese, etc.
- **Spatial Queries**: "Near me" functionality using cached location data
- **Sorting Options**: Multiple sort criteria available offline

## Implementation Details

### Database Schema

```sql
-- Churches table
CREATE TABLE offline_churches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  diocese TEXT NOT NULL,
  -- ... other church fields
  last_synced_at DATETIME,
  needs_sync BOOLEAN DEFAULT FALSE
);

-- Image cache table
CREATE TABLE offline_image_caches (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  local_path TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  cached_at DATETIME NOT NULL,
  last_accessed_at DATETIME NOT NULL,
  is_permanent BOOLEAN DEFAULT FALSE
);

-- Sync logs for conflict resolution
CREATE TABLE offline_sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  timestamp DATETIME NOT NULL,
  synced BOOLEAN DEFAULT FALSE
);
```

### Sync Strategy

1. **Incremental Sync**: Only sync data changed since last sync
2. **Priority-based**: Critical data (churches) synced first
3. **Batch Processing**: Multiple changes bundled for efficiency
4. **Error Handling**: Failed syncs queued for retry
5. **Conflict Resolution**: Last-write-wins with user notification

### Image Caching Strategy

1. **On-demand Loading**: Images loaded when requested
2. **Progressive Enhancement**: Show cached version immediately, update if newer available
3. **Size-based Eviction**: LRU eviction when cache exceeds limit
4. **Permanent Caching**: Important images (church photos) never evicted
5. **Background Preloading**: Preload images for offline use

## Usage

### Basic Integration

```dart
// Initialize offline services
await ConnectivityService().initialize();
await OfflineSyncService().initialize();
await OfflineImageCacheService().initialize();

// Use offline repository
final repository = OfflineChurchRepository();
await repository.initialize();

// Load churches (works offline)
final churches = await repository.loadChurches();
```

### UI Integration

```dart
// Wrap screens with offline indicator
OfflineIndicator(
  child: YourScreen(),
)

// Show connectivity status
ConnectivityStatusWidget(showDetails: true)

// Show sync status
SyncStatusWidget(showLastSync: true)

// Use cached images
CachedNetworkImageWidget(
  imageUrl: church.imageUrl,
  cacheImage: true,
)
```

### Provider Setup

```dart
MultiProvider(
  providers: [
    // Offline services
    ChangeNotifierProvider.value(value: ConnectivityService()),
    ChangeNotifierProvider.value(value: OfflineSyncService()),
    ChangeNotifierProvider.value(value: OfflineImageCacheService()),

    // Offline repositories
    ChangeNotifierProvider(create: (_) => OfflineChurchRepository()),
  ],
  child: MaterialApp(...)
)
```

## Dependencies Added

```yaml
dependencies:
  # Offline database
  sqflite: ^2.3.0
  drift: ^2.14.1
  sqlite3_flutter_libs: ^0.5.15

  # Connectivity monitoring
  connectivity_plus: ^5.0.2

  # Local storage
  hive: ^2.2.3
  hive_flutter: ^1.1.0

dev_dependencies:
  # Code generation
  drift_dev: ^2.14.1
  build_runner: ^2.4.7
  hive_generator: ^2.0.1
```

## Testing

### Offline Test Runner

The app includes a comprehensive test runner (`offline_test_runner.dart`) that validates:

- Database initialization
- Connectivity service functionality
- Data persistence and retrieval
- Image caching operations
- Sync functionality
- Error handling
- Performance benchmarks

### Running Tests

```dart
final testRunner = OfflineTestRunner();
final results = await testRunner.runOfflineTests();
final report = testRunner.generateTestReport(results);
```

## Performance Considerations

### Database Optimization
- Indexed queries for fast search
- Prepared statements for bulk operations
- Connection pooling for concurrent access
- Automatic vacuum for storage optimization

### Memory Management
- Lazy loading of large datasets
- Image cache size limits
- Automatic cleanup of old data
- Efficient data structures

### Network Optimization
- Compressed data transfer
- Delta sync for minimal bandwidth
- Request batching
- Smart retry policies

## User Experience

### Offline Indicators
- **Connection Banner**: Persistent indicator when offline
- **Sync Progress**: Real-time sync progress overlay
- **Status Widgets**: Compact status indicators in app bar
- **Error Messages**: Clear error messages with suggested actions

### Graceful Degradation
- **Read-only Mode**: Full browsing available offline
- **Smart Defaults**: Reasonable defaults when data unavailable
- **Progressive Enhancement**: Features unlock as connectivity improves
- **Smooth Transitions**: Seamless online/offline state changes

## Best Practices

### Data Management
1. Always check connectivity before network operations
2. Implement proper error handling for all offline scenarios
3. Use optimistic updates with rollback capabilities
4. Cache critical data proactively
5. Implement proper data retention policies

### User Interface
1. Provide clear feedback about offline status
2. Show cached data timestamps when relevant
3. Disable features that require network connectivity
4. Implement pull-to-refresh for manual sync
5. Use appropriate loading states

### Performance
1. Minimize database queries on UI thread
2. Implement proper pagination for large datasets
3. Use background sync to avoid blocking UI
4. Optimize image loading and caching
5. Monitor and limit resource usage

## Troubleshooting

### Common Issues

1. **Sync Failures**: Check connectivity, retry with exponential backoff
2. **Database Corruption**: Implement backup/restore mechanisms
3. **Storage Full**: Automatic cleanup and user notifications
4. **Image Loading Errors**: Fallback to placeholder images
5. **Performance Issues**: Monitor query performance and optimize

### Debug Tools

- Connectivity status logging
- Sync operation logging
- Database query performance monitoring
- Cache hit/miss ratio tracking
- Error reporting and logging

## Future Enhancements

### Planned Features
1. **Peer-to-peer Sync**: Share data between nearby devices
2. **Advanced Caching**: ML-based cache optimization
3. **Offline Maps**: Cache map tiles for offline navigation
4. **Voice Search**: Offline voice recognition
5. **Smart Preloading**: Predictive content loading

### Scalability
1. **Sharding**: Distribute data across multiple databases
2. **Compression**: Implement data compression for storage efficiency
3. **CDN Integration**: Leverage CDN for faster global sync
4. **Edge Computing**: Process data closer to users

## Conclusion

The offline capabilities transform the VISITA mobile app into a truly robust, always-available church exploration tool. Users can now discover and learn about Bohol's churches regardless of their internet connectivity, ensuring the rich cultural heritage is accessible to everyone, everywhere.

The implementation follows modern mobile development best practices with:
- Offline-first architecture
- Intelligent caching strategies
- Seamless sync mechanisms
- Excellent user experience
- Comprehensive error handling
- Performance optimization

This foundation enables future enhancements while providing immediate value to users in areas with limited connectivity.