
import 'package:flutter/material.dart';
import '../../models/church.dart';
import '../../models/enums.dart';
import '../optimized_image_widget.dart';

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
          // Basic Information Card
          buildCard(
            icon: Icons.info_outline,
            title: 'Basic Information',
            child: Column(
              children: [
                if (church.fullName != null)
                  buildInfoRow('Full Name', church.fullName!),
                buildInfoRow('Location', church.location),
                if (church.municipality != null)
                  buildInfoRow('Municipality', church.municipality!),
                buildInfoRow('Diocese', church.diocese),
                if (church.foundingYear != null)
                  buildInfoRow(
                      'Founded', church.foundingYear!.toString()),
              ],
            ),
          ),

          // Colorful Info Cards Row (inspired by reference design)
          const SizedBox(height: 16),
          Row(
            children: [
              // Founded Card (Purple)
              if (church.foundingYear != null)
                Flexible(
                  child: buildColorfulInfoCard(
                    icon: Icons.calendar_today,
                    value: church.foundingYear!.toString(),
                    label: 'Founded',
                    backgroundColor: const Color(0xFF8B5CF6), // Purple
                  ),
                ),
              if (church.foundingYear != null) const SizedBox(width: 12),
              // Architecture Style Card (Orange)
              Flexible(
                flex: 2,
                child: buildColorfulInfoCard(
                  icon: Icons.architecture,
                  value: church.architecturalStyle.label,
                  label: 'Style',
                  backgroundColor: const Color(0xFFF97316), // Orange
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Location Card (Cyan - Full Width)
          buildColorfulInfoCard(
            icon: Icons.location_city,
            value: church.municipality ?? church.location,
            label: 'Location',
            backgroundColor: const Color(0xFF06B6D4), // Cyan
          ),

          const SizedBox(height: 16),

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

          // Description Card
          if (church.description != null &&
              church.description!.isNotEmpty)
            buildCard(
              icon: Icons.description,
              title: 'Description',
              child: Text(
                church.description!,
                style: const TextStyle(
                  height: 1.6,
                  color: Color(0xFF333333),
                  fontSize: 14,
                ),
                textAlign: TextAlign.justify,
              ),
            ),

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

          // Heritage Information (for heritage sites)
          if (church.heritageClassification !=
              HeritageClassification.none)
            buildCard(
              icon: Icons.account_balance,
              title: 'Heritage Information',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (church.culturalSignificance != null) ...[
                    const Text(
                      'Cultural Significance',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF8B5E3C),
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      church.culturalSignificance!,
                      style: const TextStyle(
                        height: 1.6,
                        color: Color(0xFF333333),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  if (church.preservationHistory != null) ...[
                    const Text(
                      'Preservation History',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF8B5E3C),
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      church.preservationHistory!,
                      style: const TextStyle(
                        height: 1.6,
                        color: Color(0xFF333333),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  if (church.restorationHistory != null) ...[
                    const Text(
                      'Restoration History',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF8B5E3C),
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      church.restorationHistory!,
                      style: const TextStyle(
                        height: 1.6,
                        color: Color(0xFF333333),
                      ),
                    ),
                  ],
                ],
              ),
            ),

          // Photo Gallery
          if (church.images.length > 1)
            buildCard(
              icon: Icons.photo_library,
              title: 'Photo Gallery',
              child: GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                ),
                itemCount: church.images.length,
                itemBuilder: (context, index) {
                  return ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: OptimizedChurchImage(
                      imageUrl: church.images[index],
                      fit: BoxFit.cover,
                      isNetworkImage:
                          church.images[index].startsWith('http'),
                    ),
                  );
                },
              ),
            ),
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
            color: Colors.black.withOpacity(0.04),
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
            color: Colors.black.withOpacity(0.1),
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
              color: Colors.white.withOpacity(0.9),
            ),
          ),
        ],
      ),
    );
  }
}
