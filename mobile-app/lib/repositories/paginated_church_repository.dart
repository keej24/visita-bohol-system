import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../models/church.dart';
import '../models/church_status.dart';

/// Paginated church repository for efficient data loading
///
/// Implements cursor-based pagination to load churches in chunks,
/// reducing initial load time and memory usage.
///
/// Usage:
/// ```dart
/// final repo = PaginatedChurchRepository();
///
/// // Load first page
/// final firstPage = await repo.getFirstPage();
///
/// // Load next page
/// if (firstPage.hasMore) {
///   final nextPage = await repo.getNextPage(firstPage.lastDocument!);
/// }
/// ```
class PaginatedChurchRepository {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static const String _churchesCollection = 'churches';

  /// Number of churches to load per page
  static const int pageSize = 20;

  /// Default timeout for queries
  static const Duration queryTimeout = Duration(seconds: 30);

  /// Get the first page of approved churches
  ///
  /// Returns [ChurchPage] with up to [pageSize] churches, ordered by
  /// most recently updated first.
  Future<ChurchPage> getFirstPage() async {
    try {
      debugPrint('📄 [PAGINATED REPO] Loading first page (limit: $pageSize)');

      final query = _firestore
          .collection(_churchesCollection)
          .where('status', isEqualTo: ChurchStatus.approved)
          .orderBy('updatedAt', descending: true)
          .limit(pageSize);

      final snapshot = await query.get().timeout(queryTimeout);

      final churches = _mapChurches(snapshot.docs);
      final hasMore = snapshot.docs.length == pageSize;
      final lastDoc = snapshot.docs.isNotEmpty ? snapshot.docs.last : null;

      debugPrint(
          '✅ [PAGINATED REPO] Loaded ${churches.length} churches (hasMore: $hasMore)');

      return ChurchPage(
        churches: churches,
        lastDocument: lastDoc,
        hasMore: hasMore,
        totalLoaded: churches.length,
      );
    } on TimeoutException {
      debugPrint('⏱️ [PAGINATED REPO] Query timeout - network issue');
      return ChurchPage.empty();
    } catch (e) {
      debugPrint('❌ [PAGINATED REPO] Error loading first page: $e');
      return ChurchPage.empty();
    }
  }

  /// Get the next page of churches after [lastDocument]
  ///
  /// Use the [lastDocument] from the previous [ChurchPage] to continue
  /// pagination. Returns empty page if [lastDocument] is null.
  Future<ChurchPage> getNextPage(DocumentSnapshot lastDocument) async {
    try {
      debugPrint(
          '📄 [PAGINATED REPO] Loading next page after ${lastDocument.id}');

      final query = _firestore
          .collection(_churchesCollection)
          .where('status', isEqualTo: ChurchStatus.approved)
          .orderBy('updatedAt', descending: true)
          .startAfterDocument(lastDocument)
          .limit(pageSize);

      final snapshot = await query.get().timeout(queryTimeout);

      final churches = _mapChurches(snapshot.docs);
      final hasMore = snapshot.docs.length == pageSize;
      final lastDoc = snapshot.docs.isNotEmpty ? snapshot.docs.last : null;

      debugPrint(
          '✅ [PAGINATED REPO] Loaded ${churches.length} more churches (hasMore: $hasMore)');

      return ChurchPage(
        churches: churches,
        lastDocument: lastDoc,
        hasMore: hasMore,
        totalLoaded: churches.length,
      );
    } on TimeoutException {
      debugPrint('⏱️ [PAGINATED REPO] Query timeout - network issue');
      return ChurchPage.empty();
    } catch (e) {
      debugPrint('❌ [PAGINATED REPO] Error loading next page: $e');
      return ChurchPage.empty();
    }
  }

  /// Get churches by diocese with pagination
  Future<ChurchPage> getFirstPageByDiocese(String diocese) async {
    try {
      debugPrint(
          '📄 [PAGINATED REPO] Loading first page for diocese: $diocese');

      final query = _firestore
          .collection(_churchesCollection)
          .where('status', isEqualTo: ChurchStatus.approved)
          .where('diocese', isEqualTo: diocese)
          .orderBy('updatedAt', descending: true)
          .limit(pageSize);

      final snapshot = await query.get().timeout(queryTimeout);

      final churches = _mapChurches(snapshot.docs);
      final hasMore = snapshot.docs.length == pageSize;
      final lastDoc = snapshot.docs.isNotEmpty ? snapshot.docs.last : null;

      debugPrint(
          '✅ [PAGINATED REPO] Loaded ${churches.length} churches for $diocese');

      return ChurchPage(
        churches: churches,
        lastDocument: lastDoc,
        hasMore: hasMore,
        totalLoaded: churches.length,
      );
    } catch (e) {
      debugPrint('❌ [PAGINATED REPO] Error loading diocese page: $e');
      return ChurchPage.empty();
    }
  }

  /// Get next page by diocese
  Future<ChurchPage> getNextPageByDiocese(
    String diocese,
    DocumentSnapshot lastDocument,
  ) async {
    try {
      final query = _firestore
          .collection(_churchesCollection)
          .where('status', isEqualTo: ChurchStatus.approved)
          .where('diocese', isEqualTo: diocese)
          .orderBy('updatedAt', descending: true)
          .startAfterDocument(lastDocument)
          .limit(pageSize);

      final snapshot = await query.get().timeout(queryTimeout);

      final churches = _mapChurches(snapshot.docs);
      final hasMore = snapshot.docs.length == pageSize;
      final lastDoc = snapshot.docs.isNotEmpty ? snapshot.docs.last : null;

      return ChurchPage(
        churches: churches,
        lastDocument: lastDoc,
        hasMore: hasMore,
        totalLoaded: churches.length,
      );
    } catch (e) {
      debugPrint('❌ [PAGINATED REPO] Error loading next diocese page: $e');
      return ChurchPage.empty();
    }
  }

  /// Get a single church by ID from Firestore
  ///
  /// Returns the church if found, null otherwise.
  /// Always fetches fresh data from Firestore (no cache).
  Future<Church?> getChurchById(String churchId) async {
    try {
      debugPrint('📄 [PAGINATED REPO] Fetching church by ID: $churchId');

      final doc = await _firestore
          .collection(_churchesCollection)
          .doc(churchId)
          .get()
          .timeout(queryTimeout);

      if (!doc.exists) {
        debugPrint('⚠️ [PAGINATED REPO] Church not found: $churchId');
        return null;
      }

      final data = doc.data() as Map<String, dynamic>;
      final church = Church.fromJson({
        'id': doc.id,
        ...data,
      });

      debugPrint('✅ [PAGINATED REPO] Church loaded: ${church.name}');
      return church;
    } on TimeoutException {
      debugPrint('⏱️ [PAGINATED REPO] Query timeout for church $churchId');
      return null;
    } catch (e) {
      debugPrint('❌ [PAGINATED REPO] Error loading church $churchId: $e');
      return null;
    }
  }

  /// Map Firestore documents to Church objects
  List<Church> _mapChurches(List<QueryDocumentSnapshot> docs) {
    return docs
        .map((doc) {
          try {
            final data = doc.data() as Map<String, dynamic>;
            return Church.fromJson({
              'id': doc.id,
              ...data,
            });
          } catch (e) {
            debugPrint(
                '⚠️ [PAGINATED REPO] Error parsing church ${doc.id}: $e');
            return null;
          }
        })
        .whereType<Church>()
        .toList();
  }
}

/// Represents a page of church results with pagination metadata
class ChurchPage {
  /// Churches loaded in this page
  final List<Church> churches;

  /// Last document for pagination cursor (null if no more pages)
  final DocumentSnapshot? lastDocument;

  /// Whether there are more churches to load
  final bool hasMore;

  /// Total number of churches loaded in this page
  final int totalLoaded;

  ChurchPage({
    required this.churches,
    this.lastDocument,
    required this.hasMore,
    required this.totalLoaded,
  });

  /// Create an empty page (used for errors)
  factory ChurchPage.empty() {
    return ChurchPage(
      churches: [],
      lastDocument: null,
      hasMore: false,
      totalLoaded: 0,
    );
  }

  /// Check if this page is empty
  bool get isEmpty => churches.isEmpty;

  /// Check if this page has churches
  bool get isNotEmpty => churches.isNotEmpty;
}
