import 'package:flutter/material.dart';
import '../../models/church.dart';
import '../../models/enums.dart';
import '../../utils/design_system.dart';
import '../../utils/animations.dart';
import '../optimized_image_widget.dart';
import '../../screens/virtual_tour_screen.dart';

class ChurchCard extends StatefulWidget {
  final Church church;
  final VoidCallback? onTap;
  final bool showDistance;
  final double? distance;

  const ChurchCard({
    super.key,
    required this.church,
    this.onTap,
    this.showDistance = false,
    this.distance,
  });

  @override
  State<ChurchCard> createState() => _ChurchCardState();
}

class _ChurchCardState extends State<ChurchCard> {
  IconData _getReligiousClassificationIcon(ReligiousClassification classification) {
    switch (classification) {
      case ReligiousClassification.diocesanShrine:
        return Icons.church;
      case ReligiousClassification.jubileeChurch:
        return Icons.celebration;
      case ReligiousClassification.papalBasilicaAffinity:
        return Icons.account_balance;
      default:
        return Icons.info;
    }
  }

  Color _getReligiousClassificationColor(ReligiousClassification classification) {
    switch (classification) {
      case ReligiousClassification.diocesanShrine:
        return const Color(0xFFE11D48); // Red
      case ReligiousClassification.jubileeChurch:
        return const Color(0xFF0891B2); // Cyan
      case ReligiousClassification.papalBasilicaAffinity:
        return const Color(0xFFFB923C); // Orange
      default:
        return const Color(0xFF6B7280); // Gray
    }
  }

  @override
  Widget build(BuildContext context) {
    // Debug logging for heritage churches
    if (widget.church.heritageClassification == HeritageClassification.icp ||
        widget.church.heritageClassification == HeritageClassification.nct) {
      debugPrint('🎨 Building church card for: ${widget.church.name}');
      debugPrint('   - isHeritage: ${widget.church.isHeritage}');
      debugPrint(
          '   - classification: ${widget.church.heritageClassification}');
    }

    final heritageLabel = widget.church.isHeritage ? ', heritage site' : '';

    return Semantics(
      label:
          'Church ${widget.church.name}, ${widget.church.location}$heritageLabel',
      button: true,
      child: AnimatedCard(
        onTap: widget.onTap,
        borderRadius: AppRadius.largeRadius,
        child: Container(
          margin: const EdgeInsets.only(bottom: AppSpacing.cardMargin),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: AppRadius.largeRadius,
            border: Border.all(
              color: const Color(0xFFE5E7EB),
              width: 1.5,
            ),
            boxShadow: AppElevation.getShadow(AppElevation.low),
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: AppRadius.largeRadius,
              onTap: widget.onTap,
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.cardPadding),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _EnhancedThumbnail(
                      imagePath: widget.church.images.isNotEmpty
                          ? widget.church.images.first
                          : null,
                      isHeritage: widget.church.isHeritage,
                    ),
                    const SizedBox(width: 18),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      widget.church.name,
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.copyWith(
                                              fontWeight: FontWeight.w800,
                                              height: 1.15,
                                              color: const Color(0xFF1F2937)),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        const Icon(Icons.location_on_outlined,
                                            size: 14, color: Color(0xFF6B7280)),
                                        const SizedBox(width: 4),
                                        Expanded(
                                          child: Text(
                                            widget.church.location,
                                            style: Theme.of(context)
                                                .textTheme
                                                .bodySmall
                                                ?.copyWith(
                                                    color:
                                                        const Color(0xFF6B7280),
                                                    fontWeight:
                                                        FontWeight.w500),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Wrap(
                            spacing: 8,
                            runSpacing: 6,
                            children: [
                              _ModernChip(
                                icon: Icons.account_balance_wallet,
                                text: widget.church.diocese,
                                color: const Color(0xFF2C5F2D), // Sacred green
                              ),
                              _ModernChip(
                                icon: Icons.architecture,
                                text: widget.church.architecturalStyle.label,
                                color: const Color(0xFFD4AF37), // Gold
                              ),
                              if (widget.church.heritageClassification ==
                                      HeritageClassification.icp ||
                                  widget.church.heritageClassification ==
                                      HeritageClassification.nct)
                                Builder(
                                  builder: (context) {
                                    debugPrint(
                                        '🏛️ Heritage Church: ${widget.church.name} - ${widget.church.heritageClassification}');
                                    return _HeritageChip(
                                      classification:
                                          widget.church.heritageClassification,
                                    );
                                  },
                                ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.schedule_outlined,
                                            size: 14, color: Color(0xFF6B7280)),
                                        const SizedBox(width: 4),
                                        Flexible(
                                          child: Text(
                                              'Founded ${widget.church.foundingYear}',
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .bodySmall
                                                  ?.copyWith(
                                                      color: const Color(0xFF6B7280),
                                                      fontWeight: FontWeight.w500),
                                              overflow: TextOverflow.ellipsis),
                                        ),
                                        if (widget.showDistance &&
                                            widget.distance != null) ...[
                                          const SizedBox(width: 12),
                                          const Icon(Icons.location_on,
                                              size: 14, color: Color(0xFF2563EB)),
                                          const SizedBox(width: 4),
                                          Text(
                                              '${widget.distance!.toStringAsFixed(1)} km',
                                              style: Theme.of(context)
                                                  .textTheme
                                                  .bodySmall
                                                  ?.copyWith(
                                                      color: const Color(0xFF2563EB),
                                                      fontWeight: FontWeight.w600)),
                                        ],
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              if (widget.church.religiousClassification != ReligiousClassification.none) ...[
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    Icon(
                                      _getReligiousClassificationIcon(widget.church.religiousClassification),
                                      size: 14,
                                      color: _getReligiousClassificationColor(widget.church.religiousClassification),
                                    ),
                                    const SizedBox(width: 4),
                                    Flexible(
                                      child: Text(
                                        widget.church.religiousClassification.label,
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall
                                            ?.copyWith(
                                                color: _getReligiousClassificationColor(widget.church.religiousClassification),
                                                fontWeight: FontWeight.w600),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _EnhancedThumbnail extends StatelessWidget {
  final String? imagePath;
  final bool isHeritage;
  const _EnhancedThumbnail({this.imagePath, required this.isHeritage});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Use OptimizedChurchThumbnail for better performance
        if (imagePath != null)
          OptimizedChurchThumbnail(
            imageUrl: imagePath!,
            size: 110,
            isNetworkImage: imagePath!.startsWith('http://') ||
                imagePath!.startsWith('https://'),
          )
        else
          // Fallback for no image
          Container(
            width: 110,
            height: 110,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  const Color(0xFF2C5F2D).withValues(alpha: 0.10),
                  const Color(0xFFD4AF37).withValues(alpha: 0.05),
                ],
              ),
            ),
            child: const Icon(Icons.church, size: 48, color: Color(0xFF2C5F2D)),
          ),
        // Heritage badge overlay
        if (isHeritage)
          Positioned(
            top: 4,
            right: 4,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFFD4AF37),
                borderRadius: BorderRadius.circular(8),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFD4AF37).withValues(alpha: 0.4),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child:
                  const Icon(Icons.auto_awesome, size: 12, color: Colors.white),
            ),
          ),
      ],
    );
  }
}

class _ModernChip extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color color;
  const _ModernChip(
      {required this.icon, required this.text, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(text,
              style: TextStyle(
                  fontSize: 11, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
    );
  }
}

class _HeritageChip extends StatelessWidget {
  final HeritageClassification classification;

  const _HeritageChip({required this.classification});

  @override
  Widget build(BuildContext context) {
    final isICP = classification == HeritageClassification.icp;
    final colors = isICP
        ? [const Color(0xFFD4AF37), const Color(0xFFB8941F)] // Gold for ICP
        : [const Color(0xFF7C3AED), const Color(0xFF5B21B6)]; // Purple for NCT

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: colors),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: colors[0].withValues(alpha: 0.3),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isICP ? Icons.stars : Icons.diamond,
            size: 12,
            color: Colors.white,
          ),
          const SizedBox(width: 4),
          Text(
            classification.shortLabel,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

class _TourButton extends StatelessWidget {
  final Church church;
  const _TourButton({required this.church});

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        minimumSize: const Size(0, 0),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        side: BorderSide(color: const Color(0xFF2563EB).withValues(alpha: 0.3)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      onPressed: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => VirtualTourScreen(
              tour: church.virtualTour!,
              churchName: church.name,
            ),
          ),
        );
      },
      icon:
          const Icon(Icons.threed_rotation, size: 14, color: Color(0xFF2563EB)),
      label: const Text('Tour',
          style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: Color(0xFF2563EB))),
    );
  }
}

class _ViewDetailsButton extends StatelessWidget {
  const _ViewDetailsButton();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm - 2,
      ),
      decoration: BoxDecoration(
        gradient: AppGradients.sacredGreen,
        borderRadius: AppRadius.mediumRadius,
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2C5F2D).withValues(alpha: 0.3),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: const Text(
        'Details',
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
      ),
    );
  }
}
