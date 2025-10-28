class Announcement {
  final String id;
  final String title;
  final String description;
  final DateTime dateTime;
  final DateTime? endDateTime; // For multi-day events
  final String venue;
  final String scope; // 'diocese' or 'parish'
  final String? churchId;
  final String diocese; // Diocese of Tagbilaran or Diocese of Talibon
  final String category; // Festival, Mass, Exhibit, Community Event
  final String? imageUrl;
  final String? contactInfo;
  final bool isRecurring;
  final List<String> tags;
  final String? locationUrl; // Google Maps URL

  final bool isArchived;

  Announcement({
    required this.id,
    required this.title,
    required this.description,
    required this.dateTime,
    this.endDateTime,
    required this.venue,
    this.scope = 'diocese',
    this.churchId,
    this.diocese = 'Diocese of Tagbilaran', // Default to Diocese of Tagbilaran
    this.category = 'Community Event',
    this.imageUrl,
    this.contactInfo,
    this.isRecurring = false,
    this.tags = const [],
    this.locationUrl,
    this.isArchived = false,
  });

  // Helper getters for status
  bool get isUpcoming => DateTime.now().isBefore(dateTime);
  bool get isPast => endDateTime != null
      ? DateTime.now().isAfter(endDateTime!)
      : DateTime.now().isAfter(dateTime);
  bool get isOngoing => endDateTime != null
      ? DateTime.now().isAfter(dateTime) &&
          DateTime.now().isBefore(endDateTime!)
      : false;

  String get status {
    if (isOngoing) return 'Ongoing';
    if (isUpcoming) return 'Upcoming';
    return 'Past';
  }

  // Compatibility getters for church_detail_screen
  String get message => description;
  DateTime get date => dateTime;

  factory Announcement.fromJson(Map<String, dynamic> j) => Announcement(
        id: j['id'] ?? '',
        title: j['title'] ?? '',
        description: j['description'] ?? '',
        dateTime:
            DateTime.parse(j['dateTime'] ?? DateTime.now().toIso8601String()),
        endDateTime:
            j['endDateTime'] != null ? DateTime.parse(j['endDateTime']) : null,
        venue: j['venue'] ?? '',
        scope: j['scope'] ?? 'diocese',
        churchId: j['churchId'],
        diocese: j['diocese'] ?? 'Diocese of Tagbilaran',
        category: j['category'] ?? 'Community Event',
        imageUrl: j['imageUrl'],
        contactInfo: j['contactInfo'],
        isRecurring: j['isRecurring'] ?? false,
        tags: List<String>.from(j['tags'] ?? []),
        locationUrl: j['locationUrl'],
        isArchived: j['isArchived'] == true,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'dateTime': dateTime.toIso8601String(),
        'endDateTime': endDateTime?.toIso8601String(),
        'venue': venue,
        'scope': scope,
        'churchId': churchId,
        'diocese': diocese,
        'category': category,
        'imageUrl': imageUrl,
        'contactInfo': contactInfo,
        'isRecurring': isRecurring,
        'tags': tags,
        'locationUrl': locationUrl,
        'isArchived': isArchived,
      };
}
