/// Constants for church approval status workflow
class ChurchStatus {
  /// Church entry created by Parish Secretary, awaiting Chancery review
  static const String pending = 'pending';

  /// Church approved by Chancery Office and visible to public
  static const String approved = 'approved';

  /// Church needs revisions based on Chancery feedback (admin uses 'needs_revision')
  static const String revisions = 'revisions';
  static const String needsRevision = 'needs_revision'; // Admin dashboard format

  /// Church rejected by Chancery
  static const String rejected = 'rejected';

  /// Heritage church forwarded to Museum Researcher for validation (admin uses 'under_review')
  static const String heritageReview = 'heritage_review';
  static const String underReview = 'under_review'; // Admin dashboard format

  /// All possible status values (including admin dashboard variants)
  static const List<String> allStatuses = [
    pending,
    approved,
    revisions,
    needsRevision,
    rejected,
    heritageReview,
    underReview,
  ];

  /// Status descriptions for UI display
  static const Map<String, String> statusDescriptions = {
    pending: 'Pending Chancery Review',
    approved: 'Approved & Public',
    revisions: 'Needs Revisions',
    needsRevision: 'Needs Revisions',
    rejected: 'Rejected',
    heritageReview: 'Heritage Review in Progress',
    underReview: 'Heritage Review in Progress',
  };

  /// Status colors for UI display
  static const Map<String, int> statusColors = {
    pending: 0xFFFFA726, // Orange
    approved: 0xFF4CAF50, // Green
    revisions: 0xFFF44336, // Red
    needsRevision: 0xFFF44336, // Red
    rejected: 0xFF9E9E9E, // Gray
    heritageReview: 0xFF2196F3, // Blue
    underReview: 0xFF2196F3, // Blue
  };

  /// Check if status allows public visibility
  static bool isPublicVisible(String status) {
    return status == approved;
  }

  /// Check if status requires admin action
  static bool requiresAdminAction(String status) {
    return status == pending ||
           status == revisions ||
           status == needsRevision;
  }

  /// Check if status is under researcher review
  static bool isUnderResearcherReview(String status) {
    return status == heritageReview || status == underReview;
  }
}
