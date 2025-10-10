import 'package:cloud_firestore/cloud_firestore.dart';

class ParishDocument {
  final String id;
  final String name;
  final String url;
  final DateTime? uploadedAt;
  final String? contentType;

  ParishDocument({
    required this.id,
    required this.name,
    required this.url,
    this.uploadedAt,
    this.contentType,
  });

  factory ParishDocument.fromSnapshot(
    DocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final data = doc.data() ?? {};
    return ParishDocument(
      id: doc.id,
      name: data['name'] as String? ?? 'Untitled',
      url: data['url'] as String? ?? '',
      uploadedAt: (data['uploadedAt'] as Timestamp?)?.toDate(),
      contentType: data['contentType'] as String?,
    );
  }
}
