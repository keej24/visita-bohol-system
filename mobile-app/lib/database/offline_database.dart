import 'package:drift/drift.dart';
import 'connection/connection.dart';

part 'offline_database.g.dart';

@DataClassName('OfflineChurch')
class OfflineChurches extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get fullName => text().nullable()();
  TextColumn get location => text()();
  TextColumn get municipality => text()();
  TextColumn get diocese => text()();
  IntColumn get foundingYear => integer().nullable()();
  TextColumn get foundersJson => text().nullable()();
  TextColumn get architecturalStyle => text().nullable()();
  TextColumn get history => text().nullable()();
  TextColumn get description => text().nullable()();
  TextColumn get heritageClassification => text()();
  TextColumn get assignedPriest => text().nullable()();
  TextColumn get massSchedulesJson => text().nullable()();
  RealColumn get latitude => real().nullable()();
  RealColumn get longitude => real().nullable()();
  TextColumn get contactInfoJson => text().nullable()();
  TextColumn get imagesJson => text().nullable()();
  BoolColumn get isPublicVisible =>
      boolean().withDefault(const Constant(true))();
  TextColumn get status => text().withDefault(const Constant('approved'))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();
  BoolColumn get needsSync => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('OfflineAnnouncement')
class OfflineAnnouncements extends Table {
  TextColumn get id => text()();
  TextColumn get title => text()();
  TextColumn get content => text()();
  TextColumn get churchId => text().nullable()();
  TextColumn get diocese => text()();
  DateTimeColumn get eventDate => dateTime().nullable()();
  TextColumn get venue => text().nullable()();
  TextColumn get imageUrl => text().nullable()();
  TextColumn get priority => text().withDefault(const Constant('normal'))();
  BoolColumn get isActive => boolean().withDefault(const Constant(true))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();
  BoolColumn get needsSync => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('OfflineUserData')
class OfflineUserProfiles extends Table {
  TextColumn get id => text()();
  TextColumn get email => text()();
  TextColumn get displayName => text()();
  TextColumn get phoneNumber => text().nullable()();
  TextColumn get location => text().nullable()();
  TextColumn get bio => text().nullable()();
  TextColumn get accountType => text().withDefault(const Constant('public'))();
  TextColumn get visitedChurchesJson =>
      text().withDefault(const Constant('[]'))();
  TextColumn get favoriteChurchesJson =>
      text().withDefault(const Constant('[]'))();
  TextColumn get forVisitChurchesJson =>
      text().withDefault(const Constant('[]'))();
  TextColumn get journalEntriesJson =>
      text().withDefault(const Constant('[]'))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();
  BoolColumn get needsSync => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('OfflineSyncLog')
class OfflineSyncLogs extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get entityType => text()(); // 'church', 'announcement', 'user'
  TextColumn get entityId => text()();
  TextColumn get operation => text()(); // 'create', 'update', 'delete'
  TextColumn get dataJson => text().nullable()();
  DateTimeColumn get timestamp => dateTime()();
  BoolColumn get synced => boolean().withDefault(const Constant(false))();
  TextColumn get error => text().nullable()();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
}

@DataClassName('OfflineImageCache')
class OfflineImageCaches extends Table {
  TextColumn get id => text()();
  TextColumn get url => text()();
  TextColumn get localPath => text()();
  IntColumn get sizeBytes => integer()();
  DateTimeColumn get cachedAt => dateTime()();
  DateTimeColumn get lastAccessedAt => dateTime()();
  BoolColumn get isPermanent => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}

@DriftDatabase(
  tables: [
    OfflineChurches,
    OfflineAnnouncements,
    OfflineUserProfiles,
    OfflineSyncLogs,
    OfflineImageCaches,
  ],
)
class OfflineDatabase extends _$OfflineDatabase {
  OfflineDatabase() : super(openConnection());

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) async => m.createAll(),
        onUpgrade: (m, from, to) async {
          // Handle database upgrades here
        },
      );

  // Church operations
  Future<List<OfflineChurch>> getAllChurches() => select(offlineChurches).get();

  Future<List<OfflineChurch>> getChurchesByDiocese(String diocese) =>
      (select(offlineChurches)..where((tbl) => tbl.diocese.equals(diocese)))
          .get();

  Future<OfflineChurch?> getChurchById(String id) =>
      (select(offlineChurches)..where((tbl) => tbl.id.equals(id)))
          .getSingleOrNull();

  Future<int> insertChurch(OfflineChurchesCompanion church) =>
      into(offlineChurches).insert(church);

  Future<bool> updateChurch(OfflineChurchesCompanion church) =>
      update(offlineChurches).replace(church);

  Future<int> deleteChurch(String id) =>
      (delete(offlineChurches)..where((tbl) => tbl.id.equals(id))).go();

  // Announcement operations
  Future<List<OfflineAnnouncement>> getAllAnnouncements() =>
      select(offlineAnnouncements).get();

  Future<List<OfflineAnnouncement>> getActiveAnnouncements() =>
      (select(offlineAnnouncements)..where((tbl) => tbl.isActive.equals(true)))
          .get();

  Future<OfflineAnnouncement?> getAnnouncementById(String id) =>
      (select(offlineAnnouncements)..where((tbl) => tbl.id.equals(id)))
          .getSingleOrNull();

  Future<int> insertAnnouncement(OfflineAnnouncementsCompanion announcement) =>
      into(offlineAnnouncements).insert(announcement);

  Future<bool> updateAnnouncement(OfflineAnnouncementsCompanion announcement) =>
      update(offlineAnnouncements).replace(announcement);

  Future<int> deleteAnnouncement(String id) =>
      (delete(offlineAnnouncements)..where((tbl) => tbl.id.equals(id))).go();

  // User profile operations
  Future<OfflineUserData?> getUserProfile(String id) =>
      (select(offlineUserProfiles)..where((tbl) => tbl.id.equals(id)))
          .getSingleOrNull();

  Future<int> insertUserProfile(OfflineUserProfilesCompanion profile) =>
      into(offlineUserProfiles).insert(profile);

  Future<bool> updateUserProfile(OfflineUserProfilesCompanion profile) =>
      update(offlineUserProfiles).replace(profile);

  // Sync operations
  Future<List<OfflineSyncLog>> getUnsyncedLogs() =>
      (select(offlineSyncLogs)..where((tbl) => tbl.synced.equals(false))).get();

  Future<int> insertSyncLog(OfflineSyncLogsCompanion log) =>
      into(offlineSyncLogs).insert(log);

  Future<bool> markSyncLogAsCompleted(int id) async {
    final result = await (update(offlineSyncLogs)
          ..where((tbl) => tbl.id.equals(id)))
        .write(const OfflineSyncLogsCompanion(synced: Value(true)));
    return result > 0;
  }

  Future<int> clearOldSyncLogs(DateTime before) => (delete(offlineSyncLogs)
        ..where((tbl) => tbl.timestamp.isSmallerThanValue(before)))
      .go();

  // Image cache operations
  Future<List<OfflineImageCache>> getAllCachedImages() =>
      select(offlineImageCaches).get();

  Future<OfflineImageCache?> getCachedImage(String url) =>
      (select(offlineImageCaches)..where((tbl) => tbl.url.equals(url)))
          .getSingleOrNull();

  Future<int> insertCachedImage(OfflineImageCachesCompanion image) =>
      into(offlineImageCaches).insert(image);

  Future<bool> updateCachedImage(OfflineImageCachesCompanion image) =>
      update(offlineImageCaches).replace(image);

  Future<int> deleteCachedImage(String id) =>
      (delete(offlineImageCaches)..where((tbl) => tbl.id.equals(id))).go();

  Future<int> clearOldCachedImages(DateTime before) =>
      (delete(offlineImageCaches)
            ..where((tbl) =>
                tbl.lastAccessedAt.isSmallerThanValue(before) &
                tbl.isPermanent.equals(false)))
          .go();

  // Utility methods
  Future<void> markEntityForSync(String entityType, String entityId) async {
    await into(offlineSyncLogs).insert(
      OfflineSyncLogsCompanion(
        entityType: Value(entityType),
        entityId: Value(entityId),
        operation: const Value('update'),
        timestamp: Value(DateTime.now()),
      ),
    );
  }

  Future<int> getChurchCount() async {
    final count =
        await customSelect('SELECT COUNT(*) as count FROM offline_churches')
            .getSingle();
    return count.data['count'] as int;
  }

  Future<int> getAnnouncementCount() async {
    final count = await customSelect(
            'SELECT COUNT(*) as count FROM offline_announcements')
        .getSingle();
    return count.data['count'] as int;
  }

  Future<DateTime?> getLastSyncTime() async {
    final result =
        await customSelect('SELECT MAX(last_synced_at) as last_sync FROM ('
                'SELECT last_synced_at FROM offline_churches UNION ALL '
                'SELECT last_synced_at FROM offline_announcements UNION ALL '
                'SELECT last_synced_at FROM offline_user_profiles'
                ')')
            .getSingleOrNull();

    if (result?.data['last_sync'] != null) {
      return DateTime.parse(result!.data['last_sync'] as String);
    }
    return null;
  }
}
