import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import '../models/church.dart';
import '../util/constants.dart';

class LocalDataService {
  Future<List<Church>> loadChurches() async {
    final raw = await rootBundle.loadString(AppConstants.churchesJson);
    final arr = json.decode(raw) as List<dynamic>;
    return arr.map((e) => Church.fromJson(e as Map<String, dynamic>)).toList();
  }
}
