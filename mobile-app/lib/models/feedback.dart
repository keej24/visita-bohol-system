class FeedbackModel {
  final String id;
  final String userId;
  final String churchId;
  final String comment;
  final int rating; // 1-5
  final List<String> photos;
  final DateTime createdAt;

  FeedbackModel({
    required this.id,
    required this.userId,
    required this.churchId,
    required this.comment,
    required this.rating,
    this.photos = const [],
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  factory FeedbackModel.fromJson(Map<String, dynamic> j) => FeedbackModel(
        id: j['id'] ?? '',
        userId: j['userId'] ?? '',
        churchId: j['churchId'] ?? '',
        comment: j['comment'] ?? '',
        rating: j['rating'] ?? 0,
        photos: List<String>.from(j['photos'] ?? []),
        createdAt:
            j['createdAt'] != null ? DateTime.parse(j['createdAt']) : null,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        'churchId': churchId,
        'comment': comment,
        'rating': rating,
        'photos': photos,
        'createdAt': createdAt.toIso8601String(),
      };
}
