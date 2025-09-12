import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import '../../models/church.dart';
import '../../models/enums.dart';
import '../../models/app_state.dart';
import 'package:url_launcher/url_launcher.dart';

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

class _ChurchCardState extends State<ChurchCard> with TickerProviderStateMixin {
  late AnimationController _favoriteController;
  late AnimationController _visitedController;
  late Animation<double> _favoriteScale;
  late Animation<double> _visitedScale;

  @override
  void initState() {
    super.initState();
    _favoriteController = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );
    _visitedController = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );

    _favoriteScale = Tween<double>(begin: 1.0, end: 1.2).animate(
      CurvedAnimation(parent: _favoriteController, curve: Curves.elasticOut),
    );
    _visitedScale = Tween<double>(begin: 1.0, end: 1.2).animate(
      CurvedAnimation(parent: _visitedController, curve: Curves.elasticOut),
    );
  }

  @override
  void dispose() {
    _favoriteController.dispose();
    _visitedController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final visited = appState.isVisited(widget.church);
    final wishlist = appState.isForVisit(widget.church);
    final heritageLabel = widget.church.isHeritage ? ', heritage site' : '';

    return Semantics(
      label:
          'Church ${widget.church.name}, ${widget.church.location}$heritageLabel',
      button: true,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFFE5E7EB), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(24),
            onTap: widget.onTap,
            child: Padding(
              padding: const EdgeInsets.all(20),
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
                                                  fontWeight: FontWeight.w500),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Column(
                              children: [
                                AnimatedBuilder(
                                  animation: _visitedScale,
                                  builder: (context, child) => Transform.scale(
                                    scale: _visitedScale.value,
                                    child: _ModernIconToggle(
                                      label: visited
                                          ? 'Mark unvisited'
                                          : 'Mark visited',
                                      icon: visited
                                          ? Icons.check_circle
                                          : Icons.check_circle_outline,
                                      color: visited
                                          ? const Color(0xFF10B981)
                                          : const Color(0xFF9CA3AF),
                                      onTap: () {
                                        _visitedController.forward().then((_) {
                                          _visitedController.reverse();
                                        });
                                        visited
                                            ? appState
                                                .unmarkVisited(widget.church)
                                            : appState
                                                .markVisited(widget.church);
                                      },
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 12),
                                AnimatedBuilder(
                                  animation: _favoriteScale,
                                  builder: (context, child) => Transform.scale(
                                    scale: _favoriteScale.value,
                                    child: _ModernIconToggle(
                                      label: wishlist
                                          ? 'Remove from wishlist'
                                          : 'Add to wishlist',
                                      icon: wishlist
                                          ? Icons.favorite
                                          : Icons.favorite_outline,
                                      color: wishlist
                                          ? const Color(0xFFDC2626)
                                          : const Color(0xFF9CA3AF),
                                      onTap: () {
                                        _favoriteController.forward().then((_) {
                                          _favoriteController.reverse();
                                        });
                                        wishlist
                                            ? appState
                                                .unmarkForVisit(widget.church)
                                            : appState
                                                .markForVisit(widget.church);
                                      },
                                    ),
                                  ),
                                ),
                              ],
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
                              color: const Color(0xFF2563EB),
                            ),
                            _ModernChip(
                              icon: Icons.architecture,
                              text: widget.church.architecturalStyle.label,
                              color: const Color(0xFF059669),
                            ),
                            if (widget.church.isHeritage) const _HeritageChip(),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const Icon(Icons.schedule_outlined,
                                size: 14, color: Color(0xFF6B7280)),
                            const SizedBox(width: 4),
                            Text('Founded ${widget.church.foundingYear}',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(
                                        color: const Color(0xFF6B7280),
                                        fontWeight: FontWeight.w500)),
                            if (widget.showDistance &&
                                widget.distance != null) ...[
                              const SizedBox(width: 12),
                              const Icon(Icons.location_on,
                                  size: 14, color: Color(0xFF2563EB)),
                              const SizedBox(width: 4),
                              Text('${widget.distance!.toStringAsFixed(1)} km',
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(
                                          color: const Color(0xFF2563EB),
                                          fontWeight: FontWeight.w600)),
                            ],
                            const Spacer(),
                            if (widget.church.virtualTourUrl != null)
                              _TourButton(url: widget.church.virtualTourUrl!),
                            const SizedBox(width: 8),
                            const _ViewDetailsButton(),
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
        ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: Container(
            width: 100,
            height: 100,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  const Color(0xFF2563EB).withValues(alpha: .12),
                  const Color(0xFF2563EB).withValues(alpha: .06),
                ],
              ),
            ),
            child: imagePath == null
                ? const Icon(Icons.church, size: 48, color: Color(0xFF2563EB))
                : _buildImage(imagePath!),
          ),
        ),
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

  Widget _buildImage(String path) {
    if (path.toLowerCase().endsWith('.svg')) {
      return SvgPicture.asset(path, fit: BoxFit.cover);
    }
    return Image.asset(path,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) =>
            const Icon(Icons.church, size: 48, color: Color(0xFF2563EB)));
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
  const _HeritageChip();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFD4AF37), Color(0xFFB8941F)],
        ),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFD4AF37).withValues(alpha: 0.3),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.auto_awesome, size: 12, color: Colors.white),
          SizedBox(width: 4),
          Text('HERITAGE',
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                  color: Colors.white)),
        ],
      ),
    );
  }
}

class _ModernIconToggle extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _ModernIconToggle({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: label,
      button: true,
      child: InkResponse(
        onTap: onTap,
        radius: 24,
        child: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, size: 20, color: color),
        ),
      ),
    );
  }
}

class _TourButton extends StatelessWidget {
  final String url;
  const _TourButton({required this.url});

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
      onPressed: () async {
        final uri = Uri.parse(url);
        if (await canLaunchUrl(uri)) {
          await launchUrl(uri, mode: LaunchMode.inAppBrowserView);
        }
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
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF2563EB), Color(0xFF1E40AF)],
        ),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2563EB).withValues(alpha: 0.3),
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
