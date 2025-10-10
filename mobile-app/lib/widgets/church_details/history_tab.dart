
import 'package:flutter/material.dart';
import '../../models/church.dart';
import '../../models/enums.dart';
import '../../services/parish_document_service.dart';
import 'package:url_launcher/url_launcher.dart';

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
              (church.keyFigures != null &&
                  church.keyFigures!.isNotEmpty))
            buildCard(
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
                        color: Color(0xFF8B5E3C),
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      church.founders!,
                      style: const TextStyle(
                        height: 1.5,
                        color: Color(0xFF333333),
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
                        color: Color(0xFF8B5E3C),
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
                                  style: TextStyle(color: Color(0xFF8B5E3C))),
                              Expanded(
                                child: Text(
                                  figure,
                                  style: const TextStyle(
                                    height: 1.5,
                                    color: Color(0xFF333333),
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
          if (church.history != null &&
              church.history!.isNotEmpty)
            buildCard(
              icon: Icons.history_edu,
              title: 'Historical Background',
              child: Text(
                church.history!,
                style: const TextStyle(
                  height: 1.6,
                  color: Color(0xFF333333),
                  fontSize: 14,
                ),
                textAlign: TextAlign.justify,
              ),
            ),

          // Description removed as requested

          // Architectural Style Card
          buildCard(
            icon: Icons.architecture,
            title: 'Architectural Details',
            child: Column(
              children: [
                buildInfoRow('Style', church.architecturalStyle.label),
                if (church.heritageClassification !=
                    HeritageClassification.none)
                  buildInfoRow('Heritage Classification',
                      church.heritageClassification.label),
              ],
            ),
          ),

          const SizedBox(height: 24),

          // Parish Documents Section
          ParishDocumentsButton(churchId: church.id),
        ],
      ),
    );
  }


  Widget buildCard({
    required IconData icon,
    required String title,
    required Widget child,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
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
                Icon(icon, color: const Color(0xFF8B5E3C), size: 20),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF8B5E3C),
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

  Widget buildInfoRow(String label, String value) {
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
                color: Color(0xFF666666),
                fontSize: 14,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: Color(0xFF333333),
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget buildColorfulInfoCard({
    required IconData icon,
    required String value,
    required String label,
    required Color backgroundColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 28),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: Colors.white.withValues(alpha: 0.9),
            ),
          ),
        ],
      ),
    );
  }
}

class ParishDocumentsButton extends StatelessWidget {
  final String churchId;

  const ParishDocumentsButton({super.key, required this.churchId});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        icon: const Icon(Icons.folder_copy),
        label: const Text('View Parish Documents'),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF8B5E3C),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 2,
        ),
        onPressed: () {
          _showDocumentsModal(context, churchId);
        },
      ),
    );
  }

  void _showDocumentsModal(BuildContext context, String churchId) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ParishDocumentsModal(churchId: churchId),
    );
  }
}

class ParishDocumentsModal extends StatelessWidget {
  final String churchId;
  final ParishDocumentService _service = ParishDocumentService();

  ParishDocumentsModal({super.key, required this.churchId});

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Handle bar
              Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                child: Row(
                  children: [
                    const Icon(
                      Icons.folder_copy,
                      color: Color(0xFF8B5E3C),
                      size: 28,
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Parish Documents',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1A1A1A),
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              // Documents list
              Expanded(
                child: StreamBuilder(
                  stream: _service.streamDocuments(churchId),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(
                        child: CircularProgressIndicator(
                          color: Color(0xFF8B5E3C),
                        ),
                      );
                    }
                    final docs = snapshot.data ?? const [];
                    if (docs.isEmpty) {
                      return Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.folder_open,
                                size: 80,
                                color: Colors.grey[300],
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'No documents available',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.grey[600],
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'The parish hasn\'t uploaded any documents yet.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey[500],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }
                    return ListView.separated(
                      controller: scrollController,
                      padding: const EdgeInsets.all(16),
                      itemCount: docs.length,
                      separatorBuilder: (context, index) => const Divider(),
                      itemBuilder: (context, index) {
                        final doc = docs[index];
                        return _docTile(context, doc.name, doc.url, doc.uploadedAt);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _docTile(BuildContext context, String name, String url, DateTime? uploadedAt) {
    final ext = name.toLowerCase();
    IconData icon = Icons.insert_drive_file;
    Color iconColor = const Color(0xFF8B5E3C);
    
    if (ext.endsWith('.pdf')) {
      icon = Icons.picture_as_pdf;
      iconColor = const Color(0xFFD32F2F);
    } else if (ext.endsWith('.doc') || ext.endsWith('.docx')) {
      icon = Icons.description;
      iconColor = const Color(0xFF1976D2);
    } else if (ext.endsWith('.xls') || ext.endsWith('.xlsx')) {
      icon = Icons.grid_on;
      iconColor = const Color(0xFF388E3C);
    }

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: iconColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: iconColor, size: 28),
      ),
      title: Text(
        name,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          fontWeight: FontWeight.w500,
          fontSize: 15,
        ),
      ),
      subtitle: uploadedAt != null
          ? Text(
              'Uploaded ${_formatDate(uploadedAt)}',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
              ),
            )
          : null,
      trailing: IconButton(
        icon: const Icon(Icons.open_in_new),
        color: const Color(0xFF8B5E3C),
        tooltip: 'Open document',
        onPressed: () async {
          final uri = Uri.parse(url);
          if (await canLaunchUrl(uri)) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
          }
        },
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    
    if (diff.inDays == 0) {
      return 'today';
    } else if (diff.inDays == 1) {
      return 'yesterday';
    } else if (diff.inDays < 7) {
      return '${diff.inDays} days ago';
    } else if (diff.inDays < 30) {
      final weeks = (diff.inDays / 7).floor();
      return weeks == 1 ? '1 week ago' : '$weeks weeks ago';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }
}
