class UserProfile {
  final String id;
  final String name;
  final String email;
  final String? profileImageUrl;
  final String parish;
  final String affiliation;
  final DateTime joinDate;
  final List<String> visitedChurches;
  final List<String> favoriteChurches;
  final List<JournalEntry> journalEntries;
  final UserPreferences preferences;

  UserProfile({
    required this.id,
    required this.name,
    required this.email,
    this.profileImageUrl,
    required this.parish,
    required this.affiliation,
    required this.joinDate,
    required this.visitedChurches,
    required this.favoriteChurches,
    required this.journalEntries,
    required this.preferences,
  });

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

  // Factory for demo data
  factory UserProfile.demo() {
    return UserProfile(
      id: 'demo_user_001',
      name: 'Maria Santos',
      email: 'maria.santos@example.com',
      profileImageUrl: null,
      parish: 'Immaculate Conception Parish',
      affiliation: 'Diocese of Tagbilaran',
      joinDate: DateTime.now().subtract(const Duration(days: 120)),
      visitedChurches: [
        'baclayon_church',
        'loboc_church',
        'dauis_church',
        'panglao_church',
        'alburquerque_church',
      ],
      favoriteChurches: [
        'baclayon_church',
        'buenavista_church',
        'talibon_church',
      ],
      journalEntries: [
        JournalEntry(
          id: 'entry_001',
          churchId: 'baclayon_church',
          title: 'Amazing Architecture',
          content:
              'The Baclayon Church is truly a masterpiece of colonial architecture. The intricate details and the peaceful atmosphere made my visit unforgettable.',
          date: DateTime.now().subtract(const Duration(days: 7)),
          rating: 5,
          photos: [],
        ),
        JournalEntry(
          id: 'entry_002',
          churchId: 'loboc_church',
          title: 'River View Beauty',
          content:
              'Located by the beautiful Loboc River, this church offers both spiritual peace and natural beauty.',
          date: DateTime.now().subtract(const Duration(days: 14)),
          rating: 4,
          photos: [],
        ),
      ],
      preferences: UserPreferences(
        enableNotifications: true,
        enableFeastDayReminders: true,
        enableLocationReminders: true,
        shareProgressPublically: false,
        preferredLanguage: 'en',
        darkMode: false,
      ),
    );
  }

  UserProfile copyWith({
    String? name,
    String? email,
    String? profileImageUrl,
    String? parish,
    String? affiliation,
    List<String>? visitedChurches,
    List<String>? favoriteChurches,
    List<JournalEntry>? journalEntries,
    UserPreferences? preferences,
  }) {
    return UserProfile(
      id: id,
      name: name ?? this.name,
      email: email ?? this.email,
      profileImageUrl: profileImageUrl ?? this.profileImageUrl,
      parish: parish ?? this.parish,
      affiliation: affiliation ?? this.affiliation,
      joinDate: joinDate,
      visitedChurches: visitedChurches ?? this.visitedChurches,
      favoriteChurches: favoriteChurches ?? this.favoriteChurches,
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
