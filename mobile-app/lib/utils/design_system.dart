import 'package:flutter/material.dart';

/// Design system constants for consistent spacing, elevation, and styling
/// across the mobile app

/// Spacing constants - increased from 16px to 20px for better breathing room
class AppSpacing {
  // Base spacing units
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 20.0; // Increased from 16px
  static const double xxl = 24.0;
  static const double xxxl = 32.0;

  // Section spacing - more breathing room between sections
  static const double sectionSmall = 20.0; // Increased from 16px
  static const double sectionMedium = 28.0; // Increased from 24px
  static const double sectionLarge = 36.0; // Increased from 32px
  static const double sectionXLarge = 48.0;

  // Card and component padding
  static const double cardPadding = 20.0; // Increased from 16px
  static const double cardMargin = 12.0;
  static const double buttonPadding = 16.0;
  static const double inputPadding = 16.0;

  // List item spacing
  static const double listItemVertical = 16.0; // Increased from 12px
  static const double listItemHorizontal = 20.0; // Increased from 16px

  // Edge insets helpers
  static const EdgeInsets screenPadding = EdgeInsets.all(xl);
  static const EdgeInsets cardInsets = EdgeInsets.all(cardPadding);
  static const EdgeInsets sectionInsets = EdgeInsets.symmetric(vertical: sectionMedium);
  static const EdgeInsets listItemInsets = EdgeInsets.symmetric(
    horizontal: listItemHorizontal,
    vertical: listItemVertical,
  );
}

/// Elevation and shadow system - consistent Material Design elevations
/// Uses 2dp, 4dp, 8dp, 16dp, 24dp
class AppElevation {
  // Elevation levels
  static const double none = 0;
  static const double subtle = 2; // Cards at rest
  static const double low = 4; // Raised buttons, chips
  static const double medium = 8; // FAB, selected cards
  static const double high = 16; // Navigation drawer, modal dialogs
  static const double highest = 24; // Modal sheets

  // Box shadow definitions - softer, more realistic shadows
  static List<BoxShadow> getShadow(double elevation, {Color? color}) {
    final shadowColor = color ?? Colors.black;

    switch (elevation) {
      case subtle:
        return [
          BoxShadow(
            color: shadowColor.withValues(alpha: 0.05),
            offset: const Offset(0, 1),
            blurRadius: 3,
            spreadRadius: 0,
          ),
          BoxShadow(
            color: shadowColor.withValues(alpha: 0.03),
            offset: const Offset(0, 1),
            blurRadius: 2,
            spreadRadius: 0,
          ),
        ];
      case low:
        return [
          BoxShadow(
            color: shadowColor.withValues(alpha: 0.08),
            offset: const Offset(0, 2),
            blurRadius: 4,
            spreadRadius: 0,
          ),
          BoxShadow(
            color: shadowColor.withValues(alpha: 0.04),
            offset: const Offset(0, 1),
            blurRadius: 3,
            spreadRadius: 0,
          ),
        ];
      case medium:
        return [
          BoxShadow(
            color: shadowColor.withValues(alpha: 0.10),
            offset: const Offset(0, 4),
            blurRadius: 8,
            spreadRadius: 0,
          ),
          BoxShadow(
            color: shadowColor.withValues(alpha: 0.06),
            offset: const Offset(0, 2),
            blurRadius: 4,
            spreadRadius: 0,
          ),
        ];
      case high:
        return [
          BoxShadow(
            color: shadowColor.withValues(alpha: 0.12),
            offset: const Offset(0, 8),
            blurRadius: 16,
            spreadRadius: 0,
          ),
          BoxShadow(
            color: shadowColor.withValues(alpha: 0.08),
            offset: const Offset(0, 4),
            blurRadius: 8,
            spreadRadius: 0,
          ),
        ];
      case highest:
        return [
          BoxShadow(
            color: shadowColor.withValues(alpha: 0.15),
            offset: const Offset(0, 12),
            blurRadius: 24,
            spreadRadius: 0,
          ),
          BoxShadow(
            color: shadowColor.withValues(alpha: 0.10),
            offset: const Offset(0, 6),
            blurRadius: 12,
            spreadRadius: 0,
          ),
        ];
      default:
        return [];
    }
  }

  // Convenience getters
  static List<BoxShadow> get subtleShadow => getShadow(subtle);
  static List<BoxShadow> get lowShadow => getShadow(low);
  static List<BoxShadow> get mediumShadow => getShadow(medium);
  static List<BoxShadow> get highShadow => getShadow(high);
  static List<BoxShadow> get highestShadow => getShadow(highest);
}

/// Border radius constants
class AppRadius {
  static const double sm = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 20.0;
  static const double xxl = 24.0;
  static const double round = 999.0; // Fully rounded

  // Convenience getters
  static BorderRadius get smallRadius => BorderRadius.circular(sm);
  static BorderRadius get mediumRadius => BorderRadius.circular(md);
  static BorderRadius get largeRadius => BorderRadius.circular(lg);
  static BorderRadius get extraLargeRadius => BorderRadius.circular(xl);
  static BorderRadius get roundRadius => BorderRadius.circular(round);
}

/// Icon sizes
class AppIconSize {
  static const double xs = 16.0;
  static const double sm = 20.0;
  static const double md = 24.0;
  static const double lg = 28.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;
  static const double xxxl = 64.0;
}

/// Duration constants for animations
class AppDuration {
  static const Duration instant = Duration(milliseconds: 100);
  static const Duration fast = Duration(milliseconds: 200);
  static const Duration normal = Duration(milliseconds: 300);
  static const Duration slow = Duration(milliseconds: 500);
  static const Duration verySlow = Duration(milliseconds: 800);
}

/// Gradient presets
class AppGradients {
  // Hero image gradient overlay
  static const LinearGradient heroOverlay = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [
      Color(0x00000000), // Transparent at top
      Color(0x66000000), // Semi-transparent black at bottom
    ],
    stops: [0.3, 1.0],
  );

  // Sacred green gradient
  static const LinearGradient sacredGreen = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF2C5F2D), // Deep green
      Color(0xFF1B3A1C), // Darker green
    ],
  );

  // Gold gradient for badges
  static const LinearGradient goldGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFFD4AF37), // Gold
      Color(0xFFB8941F), // Darker gold
    ],
  );

  // Subtle card gradient
  static const LinearGradient subtleCard = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFFFFFFFF), // White
      Color(0xFFFAFAFA), // Off-white
    ],
  );
}
