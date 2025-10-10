import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter/foundation.dart';
import '../models/announcement.dart';
import '../utils/constants.dart';

class AnnouncementService {
  Future<List<Announcement>> load() async {
    try {
      final raw = await rootBundle.loadString(AppConstants.announcementsJson);
      if (raw.trim().isEmpty) {
        if (kDebugMode) {
          debugPrint('AnnouncementService: announcements.json is empty');
        }
        return [];
      }
      final decoded = json.decode(raw);
      if (decoded is! List) {
        if (kDebugMode) {
          debugPrint('AnnouncementService: announcements.json is not a list');
        }
        return [];
      }
      return decoded
          .map((e) => Announcement.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      if (kDebugMode) {
        debugPrint('AnnouncementService: failed to load announcements - $e');
      }
      return [];
    }
  }
}
