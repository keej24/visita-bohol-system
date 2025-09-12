import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import '../models/feedback.dart';

class FeedbackService {
  Future<File> _localFile() async {
    final dir = await getApplicationDocumentsDirectory();
    return File('${dir.path}/feedbacks.json');
  }

  Future<List<FeedbackModel>> load() async {
    try {
      final f = await _localFile();
      if (!await f.exists()) return [];
      final raw = await f.readAsString();
      final arr = json.decode(raw) as List<dynamic>;
      return arr
          .map((e) => FeedbackModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  Future<void> save(FeedbackModel fb) async {
    final list = await load();
    list.add(fb);
    final f = await _localFile();
    await f.writeAsString(json.encode(list.map((e) => e.toJson()).toList()));
  }
}
