import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:file_picker/file_picker.dart';
import '../models/parish_document.dart';

class ParishDocumentService {
  FirebaseFirestore? get _firestore =>
      Firebase.apps.isNotEmpty ? FirebaseFirestore.instance : null;
  FirebaseStorage? get _storage =>
      Firebase.apps.isNotEmpty ? FirebaseStorage.instance : null;

  /// Streams public documents for a church (filters out internal/private documents)
  /// Documents with visibility='internal' are only for administrators, not mobile app users
  Stream<List<ParishDocument>> streamDocuments(String churchId) {
    final fs = _firestore;
    if (fs == null) return const Stream<List<ParishDocument>>.empty();

    // First check the subcollection (new structure)
    return fs
        .collection('churches')
        .doc(churchId)
        .collection('documents')
        .orderBy('uploadedAt', descending: true)
        .snapshots()
        .asyncMap((snapshot) async {
      // If subcollection has documents, return them (filtered by visibility)
      if (snapshot.docs.isNotEmpty) {
        return snapshot.docs
            .map((d) => ParishDocument.fromSnapshot(d))
            .where((doc) => doc.isPublic) // Only include public documents
            .toList();
      }

      // Otherwise, check the documents array field (old structure from admin dashboard)
      final churchDoc = await fs.collection('churches').doc(churchId).get();
      final data = churchDoc.data();
      if (data == null || data['documents'] == null) {
        return <ParishDocument>[];
      }

      final docs = data['documents'] as List<dynamic>;
      return docs
          .asMap()
          .entries
          .map((entry) {
            final index = entry.key;
            final doc = entry.value;

            // Handle both string URLs and object structures
            if (doc is String) {
              // Just a URL string - legacy format, assume public
              final fileName = doc.split('/').last.split('?').first;
              return ParishDocument(
                id: 'doc_$index',
                name: Uri.decodeComponent(fileName),
                url: doc,
                uploadedAt: null,
                visibility: 'public', // Legacy format defaults to public
              );
            } else if (doc is Map) {
              // Object with url, name, and visibility
              final visibility = doc['visibility']?.toString() ?? 'public';
              return ParishDocument(
                id: doc['id']?.toString() ?? 'doc_$index',
                name: doc['name']?.toString() ??
                    doc['url']?.toString().split('/').last.split('?').first ??
                    'Document ${index + 1}',
                url: doc['url']?.toString() ?? '',
                uploadedAt: doc['uploadedAt'] != null
                    ? (doc['uploadedAt'] as Timestamp).toDate()
                    : null,
                contentType: doc['contentType']?.toString(),
                visibility: visibility,
              );
            }

            return ParishDocument(
              id: 'doc_$index',
              name: 'Document ${index + 1}',
              url: '',
              uploadedAt: null,
              visibility: 'public',
            );
          })
          .where((doc) => doc.isPublic) // Only include public documents
          .toList();
    });
  }

  Future<ParishDocument?> uploadDocument(String churchId) async {
    final fs = _firestore;
    final storage = _storage;
    if (fs == null || storage == null) return null;

    final result = await FilePicker.platform.pickFiles(withData: true);
    if (result == null || result.files.isEmpty) return null;

    final file = result.files.single;
    final fileName = _uniqueName(file.name);
    final ref = storage.ref().child('churches/$churchId/documents/$fileName');

    // Always use bytes to support all platforms including Web.
    if (file.bytes == null) return null;
    final contentType = _inferContentType(file.extension);
    await ref.putData(
      file.bytes!,
      SettableMetadata(contentType: contentType),
    );

    final url = await ref.getDownloadURL();
    final docRef = await fs
        .collection('churches')
        .doc(churchId)
        .collection('documents')
        .add({
      'name': file.name,
      'url': url,
      'uploadedAt': FieldValue.serverTimestamp(),
      'contentType': contentType,
    });

    final snap = await docRef.get();
    return ParishDocument.fromSnapshot(snap);
  }

  String _uniqueName(String name) {
    final ts = DateTime.now().millisecondsSinceEpoch;
    final dot = name.lastIndexOf('.');
    if (dot == -1) return '${name}_$ts';
    final base = name.substring(0, dot);
    final ext = name.substring(dot);
    return '${base}_$ts$ext';
  }
}

String _inferContentType(String? ext) {
  final e = (ext ?? '').toLowerCase();
  switch (e) {
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
  }
}
