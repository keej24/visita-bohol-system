import 'package:flutter/material.dart';

/// Centralized header tint colors for each top-level screen.
/// Keeps page identity subtle while preserving a light, modern aesthetic.
class HeaderColors {
  const HeaderColors._();

  // Home (hero already provides imagery – keep it clean white)
  static const home = Colors.white;

  // Announcements – soft informative blue tint
  static const announcements = Color(0xFFEBF2FF);

  // Church detail – gentle warm cream evokes heritage parchment
  static const churchDetail = Color(0xFFFFF6E8);

  // Map – calm mint signifying exploration & environment
  static const map = Color(0xFFF1FBF6);

  // Profile – neutral light gray
  static const profile = Color(0xFFF5F5F5);

  // Standard thin divider under tinted headers
  static const divider = Color(0xFFE5E5E5);
}
