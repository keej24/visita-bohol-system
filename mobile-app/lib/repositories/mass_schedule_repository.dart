import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import '../models/mass_schedule.dart';

class MassScheduleRepository {
  Future<List<MassSchedule>> getAll() async {
    try {
      final String response =
          await rootBundle.loadString('assets/data/mass_schedules.json');
      final List<dynamic> data = json.decode(response);
      return data.map((json) => MassSchedule.fromJson(json)).toList();
    } catch (e) {
      debugPrint('Error loading mass schedules: $e');
      return [];
    }
  }

  Future<List<MassSchedule>> getByChurchId(String churchId) async {
    final allSchedules = await getAll();
    return allSchedules
        .where((schedule) => schedule.churchId == churchId && schedule.isActive)
        .toList()
      ..sort((a, b) {
        // Sort by day of week first, then by time
        final dayComparison = a.dayOrder.compareTo(b.dayOrder);
        if (dayComparison != 0) return dayComparison;
        return a.timeOrder.compareTo(b.timeOrder);
      });
  }

  Future<List<MassSchedule>> getTodaySchedules() async {
    final today = _getCurrentDay();
    final allSchedules = await getAll();
    return allSchedules
        .where((schedule) => schedule.dayOfWeek == today && schedule.isActive)
        .toList()
      ..sort((a, b) => a.timeOrder.compareTo(b.timeOrder));
  }

  String _getCurrentDay() {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ];
    return days[DateTime.now().weekday % 7];
  }
}
