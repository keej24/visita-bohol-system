import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../models/church.dart';
import '../../../models/enums.dart';

class HistoryTab extends StatelessWidget {
  final Church church;

  const HistoryTab({super.key, required this.church});

  /// Opens a document URL in an external browser or PDF viewer
  Future<void> _openDocument(BuildContext context, String documentUrl) async {
    final Uri uri = Uri.parse(documentUrl);

    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(
          uri,
          mode: LaunchMode.externalApplication,
        );
      } else {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Could not open document. Please try again later.'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      debugPrint('Error opening document: $e');
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error opening document: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Extracts and formats a clean filename from the document URL
  /// Strips timestamp and document type prefixes added during upload
  String _getDocumentName(String documentUrl, int index) {
    try {
      // Get the filename from the URL path
      final uri = Uri.parse(documentUrl);
      String filename = uri.pathSegments.isNotEmpty
          ? uri.pathSegments.last
          : 'Document ${index + 1}';

      // Remove query parameters and decode
      filename = Uri.decodeComponent(filename.split('?').first);

      // Clean up Firebase Storage encoded paths
      if (filename.contains('%2F')) {
        filename = filename.split('%2F').last;
      }

      // Strip timestamp and document type prefixes
      // Pattern: {type}-{timestamp}-{originalname} or {type}_{timestamp}_{index}_{originalname}
      // Examples: "document-1704067200000-myfile.pdf" -> "myfile.pdf"
      final prefixPattern = RegExp(
          r'^(?:document|heritage-doc|historical_document)[_-]\d+[_-](?:\d+[_-])?',
          caseSensitive: false);
      filename = filename.replaceFirst(prefixPattern, '');

      // Truncate if too long
      if (filename.length > 35) {
        final extension =
            filename.contains('.') ? '.${filename.split('.').last}' : '';
        filename = '${filename.substring(0, 30)}...$extension';
      }

      return filename.isNotEmpty ? filename : 'Document ${index + 1}';
    } catch (e) {
      return 'Document ${index + 1}';
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Founders & Key Figures Card
          if (church.founders != null ||
              (church.keyFigures != null && church.keyFigures!.isNotEmpty))
            _buildCard(
              icon: Icons.people,
              title: 'Founders & Key Figures',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (church.founders != null) ...[
                    const Text(
                      'Founders',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF2C5F2D),
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      church.founders!,
                      style: const TextStyle(
                        height: 1.5,
                        color: Color(0xFF1F2937),
                      ),
                    ),
                    if (church.keyFigures != null &&
                        church.keyFigures!.isNotEmpty)
                      const SizedBox(height: 16),
                  ],
                  if (church.keyFigures != null &&
                      church.keyFigures!.isNotEmpty) ...[
                    const Text(
                      'Key Historical Figures',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF2C5F2D),
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...church.keyFigures!.map((figure) => Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('• ',
                                  style: TextStyle(color: Color(0xFF2C5F2D))),
                              Expanded(
                                child: Text(
                                  figure,
                                  style: const TextStyle(
                                    height: 1.5,
                                    color: Color(0xFF1F2937),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        )),
                  ],
                ],
              ),
            ),

          // Historical Background Card
          if (church.history != null && church.history!.isNotEmpty)
            _buildCard(
              icon: Icons.history_edu,
              title: 'Historical Background',
              child: Text(
                church.history!,
                style: const TextStyle(
                  height: 1.6,
                  color: Color(0xFF1F2937),
                  fontSize: 14,
                ),
                textAlign: TextAlign.justify,
              ),
            ),

          // Architectural & Heritage Information (Merged)
          _buildCard(
            icon: Icons.architecture,
            title: 'Architectural & Heritage Information',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Architectural Style
                _buildInfoRow('Style', church.architecturalStyle.label),
                if (church.heritageClassification !=
                    HeritageClassification.none) ...[
                  _buildInfoRow('Heritage Classification',
                      church.heritageClassification.label),
                  const SizedBox(height: 8),
                ],

                // Architectural Features (NEW)
                if (church.architecturalFeatures != null &&
                    church.architecturalFeatures!.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  const Text(
                    'Architectural Features',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF2C5F2D),
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    church.architecturalFeatures!,
                    style: const TextStyle(
                      height: 1.6,
                      color: Color(0xFF1F2937),
                    ),
                    textAlign: TextAlign.justify,
                  ),
                ],

                // Heritage Information (NEW)
                if (church.heritageInformation != null &&
                    church.heritageInformation!.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  const Text(
                    'Heritage Information',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF2C5F2D),
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    church.heritageInformation!,
                    style: const TextStyle(
                      height: 1.6,
                      color: Color(0xFF1F2937),
                    ),
                    textAlign: TextAlign.justify,
                  ),
                ],
              ],
            ),
          ),

          // Document Viewer
          if (church.documents != null && church.documents!.isNotEmpty)
            _buildCard(
              icon: Icons.picture_as_pdf,
              title: 'Historical Documents (${church.documents!.length})',
              child: Column(
                children: church.documents!.asMap().entries.map((entry) {
                  final index = entry.key;
                  final doc = entry.value;
                  // Use stored name if available, otherwise extract from URL
                  final documentName = doc.name.isNotEmpty
                      ? doc.name
                      : _getDocumentName(doc.url, index);

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => _openDocument(context, doc.url),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color:
                                const Color(0xFF2C5F2D).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: const Color(0xFF2C5F2D)
                                  .withValues(alpha: 0.3),
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF2C5F2D),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(
                                  Icons.picture_as_pdf,
                                  color: Colors.white,
                                  size: 28,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      documentName,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF1F2937),
                                        fontSize: 16,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 4),
                                    const Text(
                                      'Tap to open document',
                                      style: TextStyle(
                                        color: Color(0xFF2C5F2D),
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF2C5F2D)
                                      .withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(
                                  Icons.open_in_new,
                                  color: Color(0xFF2C5F2D),
                                  size: 20,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCard({
    required IconData icon,
    required String title,
    required Widget child,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: const Color(0xFF2C5F2D), size: 20),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1F2937),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            child,
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                color: Color(0xFF6B7280),
                fontSize: 14,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: Color(0xFF1F2937),
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
