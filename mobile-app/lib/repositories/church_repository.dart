import 'dart:async';
import 'package:flutter/services.dart' show rootBundle;
import 'dart:convert';
import '../models/church.dart';
import '../util/constants.dart';

/// Repository providing cached access to churches data.
class ChurchRepository {
  List<Church>? _cache;
  Future<List<Church>>? _inFlight;

  Future<List<Church>> getAll() {
    if (_cache != null) return Future.value(_cache);
    if (_inFlight != null) return _inFlight!;
    _inFlight = _load();
    return _inFlight!;
  }

  Future<List<Church>> _load() async {
    final raw = await rootBundle.loadString(AppConstants.churchesJson);
    final arr = json.decode(raw) as List<dynamic>;
    _cache =
        arr.map((e) => Church.fromJson(e as Map<String, dynamic>)).toList();
    _inFlight = null;
    return _cache!;
  }
}
