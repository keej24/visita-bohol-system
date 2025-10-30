enum FeedbackCategory {
  general,
  accessibility,
  facilities,
  experience,
}

extension FeedbackCategoryX on FeedbackCategory {
  String get label {
    switch (this) {
      case FeedbackCategory.general:
        return 'General';
      case FeedbackCategory.accessibility:
        return 'Accessibility';
      case FeedbackCategory.facilities:
        return 'Facilities';
      case FeedbackCategory.experience:
        return 'Experience';
    }
  }

  String get description {
    switch (this) {
      case FeedbackCategory.general:
        return 'General thoughts and impressions';
      case FeedbackCategory.accessibility:
        return 'Accessibility for people with disabilities';
      case FeedbackCategory.facilities:
        return 'Church facilities and amenities';
      case FeedbackCategory.experience:
        return 'Overall visit experience';
    }
  }

  static FeedbackCategory fromLabel(String? value) {
    switch (value?.toLowerCase()) {
      case 'accessibility':
        return FeedbackCategory.accessibility;
      case 'facilities':
        return FeedbackCategory.facilities;
      case 'experience':
        return FeedbackCategory.experience;
      default:
        return FeedbackCategory.general;
    }
  }
}

class FeedbackModel {
  final String id;
  final String userId;
  final String userName;
  final String churchId;
  final String comment;
  final int rating; // 1-5
  final List<String> photos;
  final DateTime createdAt;
  final FeedbackCategory category;
  final bool hasResponse;
  final String? response;
  final DateTime? responseDate;

  FeedbackModel({
    required this.id,
    required this.userId,
    this.userName = 'Anonymous',
    required this.churchId,
    required this.comment,
    required this.rating,
    this.photos = const [],
    DateTime? createdAt,
    this.category = FeedbackCategory.general,
    this.hasResponse = false,
    this.response,
    this.responseDate,
  }) : createdAt = createdAt ?? DateTime.now();

  factory FeedbackModel.fromJson(Map<String, dynamic> j) {
    // Try to get photos from multiple possible field names
    List<String> photosList = [];
    if (j['photos'] != null) {
      photosList = List<String>.from(j['photos']);
    } else if (j['images'] != null) {
      photosList = List<String>.from(j['images']);
    }
    
    return FeedbackModel(
      id: j['id'] ?? '',
      userId: j['userId'] ?? j['pub_user_id'] ?? '',
      userName: j['userName'] ?? j['pub_user_name'] ?? 'Anonymous',
      churchId: j['churchId'] ?? j['church_id'] ?? '',
      comment: j['comment'] ?? j['message'] ?? '',
      rating: j['rating'] ?? 0,
      photos: photosList,
      createdAt:
          j['createdAt'] != null ? DateTime.parse(j['createdAt']) : null,
      category: FeedbackCategoryX.fromLabel(j['category']),
      hasResponse: j['hasResponse'] ?? false,
      response: j['response'],
      responseDate: j['responseDate'] != null
          ? DateTime.parse(j['responseDate'])
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'userId': userId,
        'userName': userName,
        'pub_user_id': userId,
        'pub_user_name': userName,
        'church_id': churchId,
        'churchId': churchId,
        'comment': comment,
        'message': comment, // Admin dashboard compatibility
        'subject': '${category.label} Review', // Add subject for admin dashboard
        'rating': rating,
        'photos': photos,
        'images': photos, // Admin dashboard compatibility
        'createdAt': createdAt.toIso8601String(),
        'date_submitted': createdAt, // Firestore Timestamp for admin dashboard
        'category': category.label.toLowerCase(),
        'hasResponse': hasResponse,
        'response': response,
        'responseDate': responseDate?.toIso8601String(),
        'status': 'published', // Auto-publish reviews
      };

  // Helper method to create a copy with response
  FeedbackModel copyWithResponse(String response) {
    return FeedbackModel(
      id: id,
      userId: userId,
      userName: userName,
      churchId: churchId,
      comment: comment,
      rating: rating,
      photos: photos,
      createdAt: createdAt,
      category: category,
      hasResponse: true,
      response: response,
      responseDate: DateTime.now(),
    );
  }

  // Compatibility getter for church_detail_screen
  String get comments => comment;
}
