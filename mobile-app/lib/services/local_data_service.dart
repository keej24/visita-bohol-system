import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter/foundation.dart';
import '../models/church.dart';
import '../utils/constants.dart';

class LocalDataService {
  Future<List<Church>> loadChurches() async {
    try {
      final raw = await rootBundle.loadString(AppConstants.churchesJson);
      if (raw.trim().isEmpty) return [];
      final arr = json.decode(raw) as List<dynamic>;
      return arr
          .map((e) => Church.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      if (kDebugMode) {
        debugPrint('LocalDataService: failed to load churches.json - $e');
      }
      return [];
    }
  }
}
