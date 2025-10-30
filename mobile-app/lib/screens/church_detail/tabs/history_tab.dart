import 'package:flutter/material.dart';
import '../../../models/church.dart';
import '../../../models/enums.dart';

class HistoryTab extends StatelessWidget {
  final Church church;

  const HistoryTab({super.key, required this.church});

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

                // Cultural Significance
                if (church.culturalSignificance != null) ...[
                  const SizedBox(height: 8),
                  const Text(
                    'Cultural Significance',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF2C5F2D),
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    church.culturalSignificance!,
                    style: const TextStyle(
                      height: 1.6,
                      color: Color(0xFF1F2937),
                    ),
                  ),
                ],

                // Preservation History
                if (church.preservationHistory != null) ...[
                  const SizedBox(height: 16),
                  const Text(
                    'Preservation History',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF2C5F2D),
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    church.preservationHistory!,
                    style: const TextStyle(
                      height: 1.6,
                      color: Color(0xFF1F2937),
                    ),
                  ),
                ],

                // Restoration History
                if (church.restorationHistory != null) ...[
                  const SizedBox(height: 16),
                  const Text(
                    'Restoration History',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF2C5F2D),
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    church.restorationHistory!,
                    style: const TextStyle(
                      height: 1.6,
                      color: Color(0xFF1F2937),
                    ),
                  ),
                ],
              ],
            ),
          ),

          // Document Viewer
          if (church.documents != null && church.documents!.isNotEmpty)
            _buildCard(
              icon: Icons.picture_as_pdf,
              title: 'Historical Documents',
              child: Column(
                children: church.documents!.map((documentUrl) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: InkWell(
                      onTap: () {
                        // TODO: Open document viewer or browser
                        // You can use url_launcher package to open the document
                        debugPrint('Opening document: $documentUrl');
                      },
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF2C5F2D).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color:
                                const Color(0xFF2C5F2D).withValues(alpha: 0.3),
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
                                  const Text(
                                    'Historical Document',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF1F2937),
                                      fontSize: 16,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    documentUrl.split('/').last.length > 30
                                        ? '${documentUrl.split('/').last.substring(0, 30)}...'
                                        : documentUrl.split('/').last,
                                    style: const TextStyle(
                                      color: Color(0xFF6B7280),
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(
                              Icons.arrow_forward_ios,
                              color: Color(0xFF2C5F2D),
                              size: 20,
                            ),
                          ],
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
