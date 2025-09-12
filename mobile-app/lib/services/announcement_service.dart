import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import '../models/announcement.dart';
import '../util/constants.dart';

class AnnouncementService {
  Future<List<Announcement>> load() async {
    final raw = await rootBundle.loadString(AppConstants.announcementsJson);
    final arr = json.decode(raw) as List<dynamic>;
    return arr
        .map((e) => Announcement.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
