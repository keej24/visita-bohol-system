import 'package:flutter/material.dart';

/// Reusable section header widget for consistent styling across tabs
class SectionHeader extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final Color? color;

  const SectionHeader({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.trailing,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final accentColor = color ?? const Color(0xFF8B5E3C);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              icon,
              color: accentColor,
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: accentColor,
                  ),
                ),
                if (subtitle != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitle!,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Colors.grey,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

/// Simple divider with icon for separating sections
class SectionDivider extends StatelessWidget {
  final IconData? icon;
  final Color? color;

  const SectionDivider({
    super.key,
    this.icon,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(
        children: [
          Expanded(
            child: Divider(
              color: color?.withValues(alpha: 0.3) ?? Colors.grey.withValues(alpha: 0.3),
              thickness: 1,
            ),
          ),
          if (icon != null) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Icon(
                icon,
                size: 16,
                color: color ?? Colors.grey,
              ),
            ),
            Expanded(
              child: Divider(
                color: color?.withValues(alpha: 0.3) ?? Colors.grey.withValues(alpha: 0.3),
                thickness: 1,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
