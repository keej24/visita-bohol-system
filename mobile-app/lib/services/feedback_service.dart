/// =============================================================================
/// FEEDBACK SERVICE - USER REVIEWS AND RATINGS
/// =============================================================================
///
/// FILE PURPOSE:
/// This service handles all feedback/review operations for churches.
/// Users can submit ratings and reviews about their church visits.
///
/// WHAT IT DOES:
/// - Save: Submit new feedback/reviews to Firestore
/// - Load: Retrieve all feedback or feedback for specific church
/// - Delete: Remove feedback (for moderation purposes)
///
/// HOW FEEDBACK WORKS IN THE SYSTEM:
///
/// 1. USER SUBMITS REVIEW:
///    User → FeedbackService.save() → Firestore 'feedback' collection
///
/// 2. MOBILE APP DISPLAYS:
///    - Church detail page shows published reviews
///    - Only 'published' status reviews are visible to public
///
/// 3. ADMIN MODERATION:
///    - Admin dashboard can moderate/delete inappropriate reviews
///    - Admin can change status (pending → published/rejected)
///
/// FIRESTORE COLLECTION STRUCTURE:
/// feedback/
///   {feedbackId}/
///     - church_id: string (which church this is for)
///     - user_id: string (who submitted it)
///     - user_name: string (display name)
///     - rating: number (1-5 stars)
///     - comment: string (review text)
///     - category: string (type of feedback)
///     - status: string ('pending', 'published', 'rejected')
///     - date_submitted: timestamp
///
/// RELATED FILES:
/// - models/feedback.dart: FeedbackModel data class
/// - screens/church_detail_screen.dart: Displays reviews
/// - admin-dashboard/components/FeedbackManagement.tsx: Admin moderation
/// =============================================================================

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../models/feedback.dart';

/// FeedbackService handles CRUD operations for user reviews.
///
/// This is a simple service class (not a Provider/ChangeNotifier)
/// because feedback doesn't need real-time UI updates like AppState.
///
/// USAGE:
/// ```dart
/// final feedbackService = FeedbackService();
///
/// // Submit a new review
/// await feedbackService.save(myFeedback);
///
/// // Get reviews for a church
/// final reviews = await feedbackService.loadForChurch('church-123');
/// ```
class FeedbackService {
  // ─────────────────────────────────────────────────────────────────────────
  // FIREBASE INSTANCE
  // ─────────────────────────────────────────────────────────────────────────
  // Single instance of Firestore used throughout this service.
  // Using instance variable (not static) allows for testing with mocks.
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE FEEDBACK
  // ─────────────────────────────────────────────────────────────────────────

  /// Delete feedback by its ID.
  ///
  /// Used for:
  /// - Admin moderation (removing inappropriate content)
  /// - User deleting their own review (if feature enabled)
  ///
  /// [feedbackId] - The document ID of the feedback to delete
  ///
  /// Throws: Re-throws any Firestore errors for caller to handle
  Future<void> delete(String feedbackId) async {
    try {
      await _firestore.collection('feedback').doc(feedbackId).delete();
      debugPrint('🗑️ [FEEDBACK SERVICE] Deleted feedback $feedbackId');
    } catch (e) {
      debugPrint('💥 [FEEDBACK SERVICE] Error deleting feedback: $e');
      rethrow; // Let caller handle the error (show message to user)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOAD ALL FEEDBACK (ADMIN USE)
  // ─────────────────────────────────────────────────────────────────────────

  /// Load ALL feedback from Firestore (for admin/analytics).
  ///
  /// This returns ALL feedback regardless of:
  /// - Which church it's for
  /// - What status it has (pending, published, rejected)
  ///
  /// Used by: Admin dashboard for moderation queue
  /// NOT for: Public church detail pages (use loadForChurch instead)
  ///
  /// Returns: List of all FeedbackModel objects, sorted by newest first
  Future<List<FeedbackModel>> load() async {
    try {
      debugPrint('🔍 [FEEDBACK SERVICE] Loading all feedback...');

      // Query Firestore 'feedback' collection
      // orderBy: Sort by date_submitted, newest first (descending)
      final snapshot = await _firestore
          .collection('feedback')
          .orderBy('date_submitted', descending: true)
          .get();

      debugPrint(
          '📊 [FEEDBACK SERVICE] Found ${snapshot.docs.length} feedback items');

      // Convert Firestore documents to FeedbackModel objects
      // Using map().whereType<T>() pattern to filter out null values
      final feedbacks = snapshot.docs
          .map((doc) {
            try {
              final data = doc.data();
              // Merge document ID with document data for the model
              return FeedbackModel.fromJson({
                'id': doc.id, // Document ID becomes feedback ID
                ...data, // Spread all document fields
              });
            } catch (e) {
              // If one document fails to parse, log it but don't crash
              debugPrint(
                  '💥 [FEEDBACK SERVICE] Failed to parse feedback ${doc.id}: $e');
              return null; // Will be filtered out by whereType
            }
          })
          .whereType<FeedbackModel>() // Filter out nulls (failed parses)
          .toList();

      debugPrint(
          '✅ [FEEDBACK SERVICE] Successfully loaded ${feedbacks.length} feedback items');
      return feedbacks;
    } catch (e) {
      debugPrint('💥 [FEEDBACK SERVICE] Error loading feedback: $e');
      return []; // Return empty list on error (graceful degradation)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOAD FEEDBACK FOR SPECIFIC CHURCH (PUBLIC USE)
  // ─────────────────────────────────────────────────────────────────────────

  /// Load published feedback for a specific church.
  ///
  /// This is what the mobile app uses to show reviews on church pages.
  /// It only returns 'published' reviews (not pending/rejected).
  ///
  /// QUERY FILTERS:
  /// - church_id == churchId (specific church only)
  /// - status == 'published' (approved reviews only)
  /// - Sorted by date (newest first)
  ///
  /// [churchId] - The ID of the church to get feedback for
  ///
  /// Returns: List of published FeedbackModel objects for that church
  Future<List<FeedbackModel>> loadForChurch(String churchId) async {
    try {
      debugPrint(
          '🔍 [FEEDBACK SERVICE] Loading feedback for church: $churchId');

      // Compound query: filter by church AND status
      // Note: Firestore may require a composite index for this query
      final snapshot = await _firestore
          .collection('feedback')
          .where('church_id', isEqualTo: churchId) // Only this church
          .where('status', isEqualTo: 'published') // Only approved reviews
          .orderBy('date_submitted', descending: true) // Newest first
          .get();

      debugPrint(
          '📊 [FEEDBACK SERVICE] Found ${snapshot.docs.length} feedback items for $churchId');

      // Convert documents to FeedbackModel objects (same pattern as load())
      final feedbacks = snapshot.docs
          .map((doc) {
            try {
              final data = doc.data();
              return FeedbackModel.fromJson({
                'id': doc.id,
                ...data,
              });
            } catch (e) {
              debugPrint(
                  '💥 [FEEDBACK SERVICE] Failed to parse feedback ${doc.id}: $e');
              return null;
            }
          })
          .whereType<FeedbackModel>()
          .toList();

      debugPrint(
          '✅ [FEEDBACK SERVICE] Successfully loaded ${feedbacks.length} feedback items');
      return feedbacks;
    } catch (e) {
      debugPrint('💥 [FEEDBACK SERVICE] Error loading feedback: $e');
      return []; // Graceful degradation - show no reviews instead of crash
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SAVE NEW FEEDBACK
  // ─────────────────────────────────────────────────────────────────────────

  /// Save new feedback/review to Firestore.
  ///
  /// Called when a user submits a review through the mobile app.
  /// The feedback is saved with the ID specified in the FeedbackModel.
  ///
  /// NEW FEEDBACK WORKFLOW:
  /// 1. User fills out review form in mobile app
  /// 2. App creates FeedbackModel with status: 'pending' or 'published'
  /// 3. This method saves it to Firestore
  /// 4. Admin may moderate it later (change status)
  ///
  /// [fb] - The FeedbackModel to save
  ///
  /// Throws: Re-throws any Firestore errors for caller to handle
  Future<void> save(FeedbackModel fb) async {
    try {
      // Debug logging - helpful for development/debugging
      debugPrint(
          '💾 [FEEDBACK SERVICE] Saving feedback for church: ${fb.churchId}');
      debugPrint('   - User: ${fb.userName} (${fb.userId})');
      debugPrint('   - Rating: ${fb.rating}/5');
      debugPrint('   - Category: ${fb.category.label}');

      // Save to Firestore using the feedback's ID as document ID
      // Using set() with specific ID (not add() which auto-generates ID)
      await _firestore.collection('feedback').doc(fb.id).set(fb.toJson());

      debugPrint('✅ [FEEDBACK SERVICE] Feedback saved successfully!');
    } catch (e) {
      debugPrint('💥 [FEEDBACK SERVICE] Error saving feedback: $e');
      rethrow; // Let caller handle error (show message to user)
    }
  }
}
