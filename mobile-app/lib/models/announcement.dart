class Announcement {
  final String id;
  final String title;
  final String description;
  final DateTime dateTime;
  final DateTime? endDateTime; // For multi-day events (endDate in Firestore)
  final String? eventTime;
  final String? endTime;
  final String venue;
  final String scope; // 'diocese' or 'parish'
  final String? churchId; // parishId in Firestore
  final String diocese; // 'tagbilaran' or 'talibon' in Firestore
  final String category; // Festival, Mass, Exhibit, Community Event, Celebration, Pilgrimage, Conference, Meeting, Other
  final String? imageUrl;
  final String? contactInfo;
  final bool isRecurring;
  final List<String> tags;
  final String? locationUrl; // Google Maps URL

  final bool isArchived;
  final DateTime? archivedAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String? createdBy;

  Announcement({
    required this.id,
    required this.title,
    required this.description,
    required this.dateTime,
    this.endDateTime,
    this.eventTime,
    this.endTime,
    required this.venue,
    this.scope = 'diocese',
    this.churchId,
    this.diocese = 'tagbilaran', // Default to tagbilaran
    this.category = 'Community Event',
    this.imageUrl,
    this.contactInfo,
    this.isRecurring = false,
    this.tags = const [],
    this.locationUrl,
    this.isArchived = false,
    this.archivedAt,
    this.createdAt,
    this.updatedAt,
    this.createdBy,
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
        eventTime: j['eventTime'],
        endTime: j['endTime'],
        venue: j['venue'] ?? '',
        scope: j['scope'] ?? 'diocese',
        churchId: j['churchId'],
        diocese: j['diocese'] ?? 'tagbilaran',
        category: j['category'] ?? 'Community Event',
        imageUrl: j['imageUrl'],
        contactInfo: j['contactInfo'],
        isRecurring: j['isRecurring'] ?? false,
        tags: List<String>.from(j['tags'] ?? []),
        locationUrl: j['locationUrl'],
        isArchived: j['isArchived'] == true,
        archivedAt:
            j['archivedAt'] != null ? DateTime.parse(j['archivedAt']) : null,
        createdAt:
            j['createdAt'] != null ? DateTime.parse(j['createdAt']) : null,
        updatedAt:
            j['updatedAt'] != null ? DateTime.parse(j['updatedAt']) : null,
        createdBy: j['createdBy'],
      );

  // Factory for Firestore documents
  factory Announcement.fromFirestore(String id, Map<String, dynamic> data) {
    // Helper to convert Firestore Timestamp to DateTime
    DateTime? parseTimestamp(dynamic value) {
      if (value == null) return null;
      if (value is DateTime) return value;
      // Firestore Timestamp has seconds and nanoseconds
      if (value is Map && value.containsKey('_seconds')) {
        return DateTime.fromMillisecondsSinceEpoch(
            value['_seconds'] * 1000 + (value['_nanoseconds'] ?? 0) ~/ 1000000);
      }
      return null;
    }

    // Convert diocese format
    String convertDiocese(String? diocese) {
      if (diocese == null) return 'tagbilaran';
      if (diocese == 'tagbilaran' || diocese == 'talibon') return diocese;
      // Convert from old format if needed
      if (diocese.toLowerCase().contains('tagbilaran')) return 'tagbilaran';
      if (diocese.toLowerCase().contains('talibon')) return 'talibon';
      return 'tagbilaran';
    }

    return Announcement(
      id: id,
      title: data['title'] ?? '',
      description: data['description'] ?? '',
      dateTime: parseTimestamp(data['eventDate']) ?? DateTime.now(),
      endDateTime: parseTimestamp(data['endDate']),
      eventTime: data['eventTime'],
      endTime: data['endTime'],
      venue: data['venue'] ?? '',
      scope: data['scope'] ?? 'diocese',
      churchId: data['parishId'],
      diocese: convertDiocese(data['diocese']),
      category: data['category'] ?? 'Community Event',
      contactInfo: data['contactInfo'],
      isArchived: data['isArchived'] ?? false,
      archivedAt: parseTimestamp(data['archivedAt']),
      createdAt: parseTimestamp(data['createdAt']),
      updatedAt: parseTimestamp(data['updatedAt']),
      createdBy: data['createdBy'],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'dateTime': dateTime.toIso8601String(),
        'endDateTime': endDateTime?.toIso8601String(),
        'eventTime': eventTime,
        'endTime': endTime,
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
        'archivedAt': archivedAt?.toIso8601String(),
        'createdAt': createdAt?.toIso8601String(),
        'updatedAt': updatedAt?.toIso8601String(),
        'createdBy': createdBy,
      };
}
