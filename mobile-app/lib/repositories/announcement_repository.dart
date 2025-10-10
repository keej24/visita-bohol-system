import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import '../models/announcement.dart';
import '../utils/constants.dart';

class AnnouncementRepository {
  List<Announcement>? _cache;
  Future<List<Announcement>>? _inFlight;

  Future<List<Announcement>> getAll() {
    if (_cache != null) return Future.value(_cache);
    if (_inFlight != null) return _inFlight!;
    _inFlight = _load();
    return _inFlight!;
  }

  Future<List<Announcement>> _load() async {
    final raw = await rootBundle.loadString(AppConstants.announcementsJson);
    final arr = json.decode(raw) as List<dynamic>;
    _cache = arr
        .map((e) => Announcement.fromJson(e as Map<String, dynamic>))
        .toList();
    _inFlight = null;
    return _cache!;
  }
}
