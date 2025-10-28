class MassSchedule {
  final String id;
  final String churchId;
  final String dayOfWeek; // Monday, Tuesday, etc.
  final String time; // e.g., "6:00 AM", "7:30 PM"
  final String type; // Regular, Vigil, Sunday, Holiday, etc.
  final String? language; // English, Filipino, Latin, etc.
  final String? notes; // Special instructions or notes
  final bool isActive; // Whether this schedule is currently active
  final bool isFbLive; // Whether this mass is FB Live

  MassSchedule({
    required this.id,
    required this.churchId,
    required this.dayOfWeek,
    required this.time,
    this.type = 'Regular',
    this.language,
    this.notes,
    this.isActive = true,
    this.isFbLive = false,
  });

  factory MassSchedule.fromJson(Map<String, dynamic> j) => MassSchedule(
        id: j['id'] ?? '',
        churchId: j['churchId'] ?? '',
        dayOfWeek: j['dayOfWeek'] ?? '',
        time: j['time'] ?? '',
        type: j['type'] ?? 'Regular',
        language: j['language'],
        notes: j['notes'],
        isActive: j['isActive'] ?? true,
        isFbLive: (j['isFbLive'] is bool)
            ? j['isFbLive']
            : (j['isFbLive'] is String)
                ? j['isFbLive'].toLowerCase() == 'true'
                : (j['type']?.toString().contains('FB Live') ?? false),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'churchId': churchId,
        'dayOfWeek': dayOfWeek,
        'time': time,
        'type': type,
        'language': language,
        'notes': notes,
        'isActive': isActive,
        'isFbLive': isFbLive,
      };

  // Helper getter for sorting
  int get dayOrder {
    const days = {
      'Sunday': 0,
      'Monday': 1,
      'Tuesday': 2,
      'Wednesday': 3,
      'Thursday': 4,
      'Friday': 5,
      'Saturday': 6,
    };
    return days[dayOfWeek] ?? 7;
  }

  // Helper getter for time sorting
  int get timeOrder {
    try {
      final time24 = _convertTo24Hour(time);
      final parts = time24.split(':');
      final hours = int.parse(parts[0]);
      final minutes = int.parse(parts[1]);
      return hours * 60 + minutes; // Convert to minutes for sorting
    } catch (e) {
      return 9999; // Put invalid times at the end
    }
  }

  String _convertTo24Hour(String time12) {
    if (time12.contains('AM') || time12.contains('PM')) {
      final ispm = time12.toUpperCase().contains('PM');
      final timeOnly = time12.replaceAll(RegExp(r'[APM\s]'), '');
      final parts = timeOnly.split(':');
      var hours = int.parse(parts[0]);
      final minutes = parts.length > 1 ? parts[1] : '00';

      if (ispm && hours != 12) hours += 12;
      if (!ispm && hours == 12) hours = 0;

      return '${hours.toString().padLeft(2, '0')}:$minutes';
    }
    return time12; // Assume already 24-hour format
  }
}
