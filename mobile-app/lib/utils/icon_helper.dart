import 'package:flutter/material.dart';

/// Icon consistency helper - provides outlined icons for inactive states
/// and filled icons for active states
///
/// Usage:
/// ```dart
/// IconHelper.home(isActive: true) // Returns filled home icon
/// IconHelper.home(isActive: false) // Returns outlined home icon
/// ```

class IconHelper {
  // Navigation icons
  static IconData home({required bool isActive}) {
    return isActive ? Icons.home : Icons.home_outlined;
  }

  static IconData explore({required bool isActive}) {
    return isActive ? Icons.explore : Icons.explore_outlined;
  }

  static IconData church({required bool isActive}) {
    return isActive ? Icons.church : Icons.church_outlined;
  }

  static IconData map({required bool isActive}) {
    return isActive ? Icons.map : Icons.map_outlined;
  }

  static IconData list({required bool isActive}) {
    return isActive ? Icons.list_alt : Icons.list_alt_outlined;
  }

  static IconData announcement({required bool isActive}) {
    return isActive ? Icons.campaign : Icons.campaign_outlined;
  }

  static IconData profile({required bool isActive}) {
    return isActive ? Icons.person : Icons.person_outlined;
  }

  static IconData settings({required bool isActive}) {
    return isActive ? Icons.settings : Icons.settings_outlined;
  }

  // Action icons
  static IconData favorite({required bool isActive}) {
    return isActive ? Icons.favorite : Icons.favorite_border;
  }

  static IconData bookmark({required bool isActive}) {
    return isActive ? Icons.bookmark : Icons.bookmark_border;
  }

  static IconData star({required bool isActive}) {
    return isActive ? Icons.star : Icons.star_border;
  }

  static IconData notifications({required bool isActive}) {
    return isActive ? Icons.notifications : Icons.notifications_outlined;
  }

  // Content icons
  static IconData calendar({required bool isActive}) {
    return isActive ? Icons.calendar_today : Icons.calendar_today_outlined;
  }

  static IconData schedule({required bool isActive}) {
    return isActive ? Icons.schedule : Icons.schedule_outlined;
  }

  static IconData location({required bool isActive}) {
    return isActive ? Icons.location_on : Icons.location_on_outlined;
  }

  static IconData photo({required bool isActive}) {
    return isActive ? Icons.photo : Icons.photo_outlined;
  }

  static IconData info({required bool isActive}) {
    return isActive ? Icons.info : Icons.info_outlined;
  }

  static IconData history({required bool isActive}) {
    return isActive ? Icons.history : Icons.history_outlined;
  }

  // Filter/sort icons
  static IconData filter({required bool isActive}) {
    return isActive ? Icons.filter_alt : Icons.filter_alt_outlined;
  }

  static IconData sort({required bool isActive}) {
    return isActive ? Icons.sort : Icons.sort_outlined;
  }

  static IconData search({required bool isActive}) {
    return isActive ? Icons.search : Icons.search_outlined;
  }

  // Heritage and special icons
  static IconData museum({required bool isActive}) {
    return isActive ? Icons.museum : Icons.museum_outlined;
  }

  static IconData badge({required bool isActive}) {
    return isActive ? Icons.verified : Icons.verified_outlined;
  }

  static IconData tour({required bool isActive}) {
    return isActive ? Icons.panorama_photosphere : Icons.panorama_photosphere_outlined;
  }

  // Helper to get icon with size and color
  static Widget icon(
    IconData iconData, {
    double? size,
    Color? color,
  }) {
    return Icon(
      iconData,
      size: size,
      color: color,
    );
  }
}

/// Adaptive icon widget that changes between outlined and filled based on state
class AdaptiveIcon extends StatelessWidget {
  final IconData activeIcon;
  final IconData inactiveIcon;
  final bool isActive;
  final double? size;
  final Color? activeColor;
  final Color? inactiveColor;

  const AdaptiveIcon({
    super.key,
    required this.activeIcon,
    required this.inactiveIcon,
    required this.isActive,
    this.size,
    this.activeColor,
    this.inactiveColor,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 200),
      transitionBuilder: (child, animation) {
        return ScaleTransition(
          scale: animation,
          child: child,
        );
      },
      child: Icon(
        isActive ? activeIcon : inactiveIcon,
        key: ValueKey(isActive),
        size: size,
        color: isActive
            ? (activeColor ?? Theme.of(context).primaryColor)
            : (inactiveColor ?? Theme.of(context).iconTheme.color),
      ),
    );
  }
}

/// Badge widget for heritage sites and special designations
class HeritageBadge extends StatelessWidget {
  final String label;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? textColor;

  const HeritageBadge({
    super.key,
    required this.label,
    this.icon,
    this.backgroundColor,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = backgroundColor ?? const Color(0xFFD4AF37); // Gold
    final fgColor = textColor ?? Colors.white;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            bgColor,
            bgColor.withValues(alpha: 0.8),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: bgColor.withValues(alpha: 0.3),
            offset: const Offset(0, 2),
            blurRadius: 4,
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: fgColor),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              color: fgColor,
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}
