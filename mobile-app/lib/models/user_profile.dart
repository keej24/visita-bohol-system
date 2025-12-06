class UserProfile {
  final String id;
  final String displayName;
  final String email;
  final String? profileImageUrl;
  final String? phoneNumber;
  final String? location;
  final String? bio;
  final String? nationality;
  final String parish;
  final String affiliation;
  final String accountType;
  final DateTime createdAt;
  final List<String> visitedChurches;
  final List<String> favoriteChurches;
  final List<String> forVisitChurches;
  final List<JournalEntry> journalEntries;
  final UserPreferences preferences;

  UserProfile({
    required this.id,
    required this.displayName,
    required this.email,
    this.profileImageUrl,
    this.phoneNumber,
    this.location,
    this.bio,
    this.nationality,
    this.parish = 'Not specified',
    this.affiliation = 'Public User',
    this.accountType = 'public',
    required this.createdAt,
    required this.visitedChurches,
    required this.favoriteChurches,
    required this.forVisitChurches,
    this.journalEntries = const [],
    UserPreferences? preferences,
  }) : preferences = preferences ?? UserPreferences.defaultPreferences();

  double get progressPercentage {
    const totalChurches = 25; // Total heritage churches in Bohol
    return (visitedChurches.length / totalChurches).clamp(0.0, 1.0);
  }

  String get motivationalMessage {
    final remaining = 25 - visitedChurches.length;
    if (remaining <= 0) return "🎉 You've completed your heritage pilgrimage!";
    if (remaining <= 5) return "✨ Almost there! Only $remaining churches left!";
    if (remaining <= 10) return "🚀 Great progress! $remaining more to go!";
    return "🌟 Your spiritual journey awaits! $remaining churches to explore.";
  }

  JournalEntry? get lastJournalEntry {
    if (journalEntries.isEmpty) return null;
    journalEntries.sort((a, b) => b.date.compareTo(a.date));
    return journalEntries.first;
  }

  String? get lastVisitedChurch {
    return visitedChurches.isNotEmpty ? visitedChurches.last : null;
  }

  // Factory from JSON for Firestore integration
  factory UserProfile.fromJson(Map<String, dynamic> json) {
    // Parse createdAt - handle Firestore Timestamp, milliseconds int, or null
    DateTime parsedCreatedAt;
    final createdAtValue = json['createdAt'];
    if (createdAtValue == null) {
      parsedCreatedAt = DateTime.now();
    } else if (createdAtValue is int) {
      parsedCreatedAt = DateTime.fromMillisecondsSinceEpoch(createdAtValue);
    } else if (createdAtValue is DateTime) {
      parsedCreatedAt = createdAtValue;
    } else if (createdAtValue.runtimeType.toString().contains('Timestamp')) {
      // Handle Firestore Timestamp object
      parsedCreatedAt = (createdAtValue as dynamic).toDate();
    } else {
      parsedCreatedAt = DateTime.now();
    }

    return UserProfile(
      id: json['id'] ?? json['uid'] ?? '',
      displayName: json['displayName'] ?? json['name'] ?? 'VISITA User',
      email: json['email'] ?? '',
      profileImageUrl: json['profileImageUrl'],
      phoneNumber: json['phoneNumber'],
      location: json['location'],
      bio: json['bio'],
      nationality: json['nationality'],
      parish: json['parish'] ?? 'Not specified',
      affiliation: json['affiliation'] ?? 'Public User',
      accountType: json['accountType'] ?? 'public',
      createdAt: parsedCreatedAt,
      visitedChurches: List<String>.from(json['visitedChurches'] ?? []),
      favoriteChurches: List<String>.from(json['favoriteChurches'] ?? []),
      forVisitChurches: List<String>.from(json['forVisitChurches'] ?? []),
      journalEntries: (json['journalEntries'] as List<dynamic>?)
              ?.map((e) => JournalEntry.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      preferences: json['preferences'] != null
          ? UserPreferences.fromJson(
              json['preferences'] as Map<String, dynamic>)
          : UserPreferences.defaultPreferences(),
    );
  }

  // Convert to JSON for Firestore
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'displayName': displayName,
      'email': email,
      'profileImageUrl': profileImageUrl,
      'phoneNumber': phoneNumber,
      'location': location,
      'bio': bio,
      'nationality': nationality,
      'parish': parish,
      'affiliation': affiliation,
      'accountType': accountType,
      'createdAt': createdAt.millisecondsSinceEpoch,
      'visitedChurches': visitedChurches,
      'favoriteChurches': favoriteChurches,
      'forVisitChurches': forVisitChurches,
      'journalEntries': journalEntries.map((e) => e.toJson()).toList(),
      'preferences': preferences.toJson(),
    };
  }

  UserProfile copyWith({
    String? displayName,
    String? email,
    String? profileImageUrl,
    String? phoneNumber,
    String? location,
    String? bio,
    String? nationality,
    String? parish,
    String? affiliation,
    String? accountType,
    List<String>? visitedChurches,
    List<String>? favoriteChurches,
    List<String>? forVisitChurches,
    List<JournalEntry>? journalEntries,
    UserPreferences? preferences,
  }) {
    return UserProfile(
      id: id,
      displayName: displayName ?? this.displayName,
      email: email ?? this.email,
      profileImageUrl: profileImageUrl ?? this.profileImageUrl,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      location: location ?? this.location,
      bio: bio ?? this.bio,
      nationality: nationality ?? this.nationality,
      parish: parish ?? this.parish,
      affiliation: affiliation ?? this.affiliation,
      accountType: accountType ?? this.accountType,
      createdAt: createdAt,
      visitedChurches: visitedChurches ?? this.visitedChurches,
      favoriteChurches: favoriteChurches ?? this.favoriteChurches,
      forVisitChurches: forVisitChurches ?? this.forVisitChurches,
      journalEntries: journalEntries ?? this.journalEntries,
      preferences: preferences ?? this.preferences,
    );
  }
}

class JournalEntry {
  final String id;
  final String churchId;
  final String title;
  final String content;
  final DateTime date;
  final int rating; // 1-5 stars
  final List<String> photos;

  JournalEntry({
    required this.id,
    required this.churchId,
    required this.title,
    required this.content,
    required this.date,
    required this.rating,
    required this.photos,
  });

  factory JournalEntry.fromJson(Map<String, dynamic> json) {
    return JournalEntry(
      id: json['id'] ?? '',
      churchId: json['churchId'] ?? '',
      title: json['title'] ?? '',
      content: json['content'] ?? '',
      date: json['date'] != null
          ? DateTime.fromMillisecondsSinceEpoch(json['date'])
          : DateTime.now(),
      rating: json['rating'] ?? 0,
      photos: List<String>.from(json['photos'] ?? []),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'churchId': churchId,
      'title': title,
      'content': content,
      'date': date.millisecondsSinceEpoch,
      'rating': rating,
      'photos': photos,
    };
  }
}

class UserPreferences {
  final bool enableNotifications;
  final bool enableFeastDayReminders;
  final bool enableLocationReminders;
  final bool shareProgressPublically;
  final String preferredLanguage;
  final bool darkMode;

  UserPreferences({
    required this.enableNotifications,
    required this.enableFeastDayReminders,
    required this.enableLocationReminders,
    required this.shareProgressPublically,
    required this.preferredLanguage,
    required this.darkMode,
  });

  factory UserPreferences.defaultPreferences() {
    return UserPreferences(
      enableNotifications: true,
      enableFeastDayReminders: true,
      enableLocationReminders: true,
      shareProgressPublically: false,
      preferredLanguage: 'en',
      darkMode: false,
    );
  }

  factory UserPreferences.fromJson(Map<String, dynamic> json) {
    return UserPreferences(
      enableNotifications: json['enableNotifications'] ?? true,
      enableFeastDayReminders: json['enableFeastDayReminders'] ?? true,
      enableLocationReminders: json['enableLocationReminders'] ?? true,
      shareProgressPublically: json['shareProgressPublically'] ?? false,
      preferredLanguage: json['preferredLanguage'] ?? 'en',
      darkMode: json['darkMode'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'enableNotifications': enableNotifications,
      'enableFeastDayReminders': enableFeastDayReminders,
      'enableLocationReminders': enableLocationReminders,
      'shareProgressPublically': shareProgressPublically,
      'preferredLanguage': preferredLanguage,
      'darkMode': darkMode,
    };
  }

  UserPreferences copyWith({
    bool? enableNotifications,
    bool? enableFeastDayReminders,
    bool? enableLocationReminders,
    bool? shareProgressPublically,
    String? preferredLanguage,
    bool? darkMode,
  }) {
    return UserPreferences(
      enableNotifications: enableNotifications ?? this.enableNotifications,
      enableFeastDayReminders:
          enableFeastDayReminders ?? this.enableFeastDayReminders,
      enableLocationReminders:
          enableLocationReminders ?? this.enableLocationReminders,
      shareProgressPublically:
          shareProgressPublically ?? this.shareProgressPublically,
      preferredLanguage: preferredLanguage ?? this.preferredLanguage,
      darkMode: darkMode ?? this.darkMode,
    );
  }
}
