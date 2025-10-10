import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import '../models/feedback.dart';

class FeedbackService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Load all feedback/reviews from Firestore
  Future<List<FeedbackModel>> load() async {
    try {
      debugPrint('🔍 [FEEDBACK SERVICE] Loading all feedback...');

      final snapshot = await _firestore
          .collection('feedback')
          .orderBy('date_submitted', descending: true)
          .get();

      debugPrint('📊 [FEEDBACK SERVICE] Found ${snapshot.docs.length} feedback items');

      final feedbacks = snapshot.docs.map((doc) {
        try {
          final data = doc.data();
          return FeedbackModel.fromJson({
            'id': doc.id,
            ...data,
          });
        } catch (e) {
          debugPrint('💥 [FEEDBACK SERVICE] Failed to parse feedback ${doc.id}: $e');
          return null;
        }
      }).whereType<FeedbackModel>().toList();

      debugPrint('✅ [FEEDBACK SERVICE] Successfully loaded ${feedbacks.length} feedback items');
      return feedbacks;
    } catch (e) {
      debugPrint('💥 [FEEDBACK SERVICE] Error loading feedback: $e');
      return [];
    }
  }

  /// Load feedback for a specific church
  Future<List<FeedbackModel>> loadForChurch(String churchId) async {
    try {
      debugPrint('🔍 [FEEDBACK SERVICE] Loading feedback for church: $churchId');

      final snapshot = await _firestore
          .collection('feedback')
          .where('church_id', isEqualTo: churchId)
          .where('status', isEqualTo: 'published')
          .orderBy('date_submitted', descending: true)
          .get();

      debugPrint('📊 [FEEDBACK SERVICE] Found ${snapshot.docs.length} feedback items for $churchId');

      final feedbacks = snapshot.docs.map((doc) {
        try {
          final data = doc.data();
          return FeedbackModel.fromJson({
            'id': doc.id,
            ...data,
          });
        } catch (e) {
          debugPrint('💥 [FEEDBACK SERVICE] Failed to parse feedback ${doc.id}: $e');
          return null;
        }
      }).whereType<FeedbackModel>().toList();

      debugPrint('✅ [FEEDBACK SERVICE] Successfully loaded ${feedbacks.length} feedback items');
      return feedbacks;
    } catch (e) {
      debugPrint('💥 [FEEDBACK SERVICE] Error loading feedback: $e');
      return [];
    }
  }

  /// Save new feedback/review to Firestore
  Future<void> save(FeedbackModel fb) async {
    try {
      debugPrint('💾 [FEEDBACK SERVICE] Saving feedback for church: ${fb.churchId}');
      debugPrint('   - User: ${fb.userName} (${fb.userId})');
      debugPrint('   - Rating: ${fb.rating}/5');
      debugPrint('   - Category: ${fb.category.label}');

      await _firestore.collection('feedback').doc(fb.id).set(fb.toJson());

      debugPrint('✅ [FEEDBACK SERVICE] Feedback saved successfully!');
    } catch (e) {
      debugPrint('💥 [FEEDBACK SERVICE] Error saving feedback: $e');
      rethrow;
    }
  }
}
