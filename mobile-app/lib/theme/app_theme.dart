import 'package:flutter/material.dart';

class AppColors {
  // Modern clean UI palette - focused on white space and intuitive design
  static const pureWhite = Color(0xFFFFFFFF); // primary background
  static const offWhite = Color(0xFFFAFAFA); // secondary background
  static const lightGray = Color(0xFFF5F5F5); // card backgrounds
  static const mediumGray = Color(0xFFE0E0E0); // borders and dividers
  static const textPrimary = Color(0xFF1A1A1A); // main text
  static const textSecondary = Color(0xFF6B6B6B); // secondary text
  static const textMuted = Color(0xFF9E9E9E); // muted text
  static const accent = Color(0xFF2563EB); // modern blue accent
  static const accentLight = Color(0xFFEBF2FF); // light accent background
  static const success = Color(0xFF10B981); // modern green
  static const warning = Color(0xFFF59E0B); // modern amber
  static const error = Color(0xFFEF4444); // modern red
  static const heritage = Color(0xFFD97706); // warm heritage accent
}

ThemeData buildAppTheme(Brightness brightness) {
  final isDark = brightness == Brightness.dark;
  const heritage = AppColors.heritage;

  final surface = isDark ? const Color(0xFF121212) : AppColors.pureWhite;
  final onSurface = isDark ? AppColors.pureWhite : AppColors.textPrimary;

  // brightness-dependent, cannot be const
  final colorScheme = ColorScheme(
    brightness: brightness,
    primary: AppColors.accent,
    onPrimary: AppColors.pureWhite,
    secondary: AppColors.heritage,
    onSecondary: AppColors.pureWhite,
    error: AppColors.error,
    onError: AppColors.pureWhite,
    surface: surface,
    onSurface: onSurface,
    tertiary: heritage,
    onTertiary: AppColors.pureWhite,
    outline: AppColors.mediumGray,
    secondaryContainer: AppColors.accentLight,
    onSecondaryContainer: AppColors.accent,
    primaryContainer: AppColors.accentLight,
    onPrimaryContainer: AppColors.accent,
  );

  final textTheme = Typography.englishLike2018
      .apply(
        fontFamily: 'Inter',
        bodyColor: onSurface,
        displayColor: onSurface,
      )
      .copyWith(
        displayLarge: const TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
            color: AppColors.textPrimary),
        titleLarge: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary),
        titleMedium: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w500,
            color: AppColors.textPrimary),
        bodyMedium: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w400,
            color: AppColors.textSecondary),
        bodyLarge: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w400,
            color: AppColors.textPrimary),
        bodySmall: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w400,
            color: AppColors.textMuted),
        labelSmall: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            letterSpacing: .5,
            color: AppColors.textMuted),
      );

  return ThemeData(
    brightness: brightness,
    colorScheme: colorScheme,
    textTheme: textTheme,
    useMaterial3: true,
    scaffoldBackgroundColor: surface,
    appBarTheme: AppBarTheme(
      backgroundColor: surface,
      foregroundColor: onSurface,
      elevation: 0,
      scrolledUnderElevation: 1,
    ),
    chipTheme: ChipThemeData(
      backgroundColor: AppColors.lightGray,
      selectedColor: AppColors.accentLight,
      labelStyle: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: AppColors.textPrimary),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      side: BorderSide.none,
    ),
    cardTheme: const CardThemeData(
      elevation: 0,
      margin: EdgeInsets.zero,
      color: Colors.white,
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(16))),
      clipBehavior: Clip.antiAlias,
      surfaceTintColor: Colors.white,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.accent,
        foregroundColor: AppColors.pureWhite,
        textStyle: const TextStyle(fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 0,
        shadowColor: Colors.transparent,
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.accent,
        foregroundColor: AppColors.pureWhite,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 0,
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.lightGray,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.accent, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: AppColors.pureWhite,
      elevation: 8,
      selectedItemColor: AppColors.accent,
      unselectedItemColor: AppColors.textMuted,
      selectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
      unselectedLabelStyle:
          TextStyle(fontSize: 11, fontWeight: FontWeight.w500),
      showUnselectedLabels: true,
      type: BottomNavigationBarType.fixed,
    ),
    dividerColor: AppColors.mediumGray,
    splashFactory: InkRipple.splashFactory,
    iconTheme: IconThemeData(color: onSurface.withValues(alpha: .72)),
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: FadeUpwardsPageTransitionsBuilder(),
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
      },
    ),
    extensions: const [
      AppPalette(
        statBgNeutral: AppColors.lightGray,
        statBgHeritage: AppColors.accentLight,
        statBgLocation: AppColors.offWhite,
        headerGradientStart: AppColors.pureWhite,
        headerGradientEnd: AppColors.offWhite,
        softDivider: AppColors.mediumGray,
      ),
    ],
  );
}

class AppPalette extends ThemeExtension<AppPalette> {
  final Color statBgNeutral;
  final Color statBgHeritage;
  final Color statBgLocation;
  final Color headerGradientStart;
  final Color headerGradientEnd;
  final Color softDivider;
  const AppPalette({
    required this.statBgNeutral,
    required this.statBgHeritage,
    required this.statBgLocation,
    required this.headerGradientStart,
    required this.headerGradientEnd,
    required this.softDivider,
  });
  @override
  AppPalette copyWith({
    Color? statBgNeutral,
    Color? statBgHeritage,
    Color? statBgLocation,
    Color? headerGradientStart,
    Color? headerGradientEnd,
    Color? softDivider,
  }) =>
      AppPalette(
        statBgNeutral: statBgNeutral ?? this.statBgNeutral,
        statBgHeritage: statBgHeritage ?? this.statBgHeritage,
        statBgLocation: statBgLocation ?? this.statBgLocation,
        headerGradientStart: headerGradientStart ?? this.headerGradientStart,
        headerGradientEnd: headerGradientEnd ?? this.headerGradientEnd,
        softDivider: softDivider ?? this.softDivider,
      );
  @override
  ThemeExtension<AppPalette> lerp(ThemeExtension<AppPalette>? other, double t) {
    if (other is! AppPalette) return this;
    return AppPalette(
      statBgNeutral: Color.lerp(statBgNeutral, other.statBgNeutral, t)!,
      statBgHeritage: Color.lerp(statBgHeritage, other.statBgHeritage, t)!,
      statBgLocation: Color.lerp(statBgLocation, other.statBgLocation, t)!,
      headerGradientStart:
          Color.lerp(headerGradientStart, other.headerGradientStart, t)!,
      headerGradientEnd:
          Color.lerp(headerGradientEnd, other.headerGradientEnd, t)!,
      softDivider: Color.lerp(softDivider, other.softDivider, t)!,
    );
  }
}
