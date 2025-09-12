/// Constants for church approval status workflow
class ChurchStatus {
  /// Church entry created by Parish Secretary, awaiting Chancery review
  static const String pending = 'pending';

  /// Church approved by Chancery Office and visible to public
  static const String approved = 'approved';

  /// Church needs revisions based on Chancery feedback
  static const String revisions = 'revisions';

  /// Heritage church forwarded to Museum Researcher for validation
  static const String heritageReview = 'heritage_review';

  /// All possible status values
  static const List<String> allStatuses = [
    pending,
    approved,
    revisions,
    heritageReview,
  ];

  /// Status descriptions for UI display
  static const Map<String, String> statusDescriptions = {
    pending: 'Pending Chancery Review',
    approved: 'Approved & Public',
    revisions: 'Needs Revisions',
    heritageReview: 'Heritage Review in Progress',
  };

  /// Status colors for UI display
  static const Map<String, int> statusColors = {
    pending: 0xFFFFA726, // Orange
    approved: 0xFF4CAF50, // Green
    revisions: 0xFFF44336, // Red
    heritageReview: 0xFF2196F3, // Blue
  };

  /// Check if status allows public visibility
  static bool isPublicVisible(String status) {
    return status == approved;
  }

  /// Check if status requires admin action
  static bool requiresAdminAction(String status) {
    return status == pending || status == revisions;
  }

  /// Check if status is under researcher review
  static bool isUnderResearcherReview(String status) {
    return status == heritageReview;
  }
}
