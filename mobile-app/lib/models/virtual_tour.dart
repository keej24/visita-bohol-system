import 'package:flutter/foundation.dart';

/// Hotspot on a 360° scene (navigation or info)
class TourHotspot {
  final String id;
  final String type; // 'navigation' or 'info'
  final double yaw; // -180 to 180
  final double pitch; // -90 to 90
  final String? targetSceneId; // Required for navigation, null for info
  final String? description; // Required for info, null for navigation
  final String label;

  TourHotspot({
    required this.id,
    required this.type,
    required this.yaw,
    required this.pitch,
    this.targetSceneId,
    this.description,
    required this.label,
  });

  factory TourHotspot.fromMap(Map<String, dynamic> map) {
    return TourHotspot(
      id: map['id'] as String,
      type: map['type'] as String? ?? 'navigation',
      yaw: (map['yaw'] as num).toDouble(),
      pitch: (map['pitch'] as num).toDouble(),
      targetSceneId: map['targetSceneId'] as String?,
      description: map['description'] as String?,
      label: map['label'] as String? ?? 'Navigate',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'type': type,
      'yaw': yaw,
      'pitch': pitch,
      if (targetSceneId != null) 'targetSceneId': targetSceneId,
      if (description != null) 'description': description,
      'label': label,
    };
  }

  /// Check if this is a navigation hotspot
  bool get isNavigation => type == 'navigation';

  /// Check if this is an info hotspot
  bool get isInfo => type == 'info';
}

/// A single 360° scene in a virtual tour
class TourScene {
  final String id;
  final String title;
  final String imageUrl;
  final bool isStartScene;
  final List<TourHotspot> hotspots;

  TourScene({
    required this.id,
    required this.title,
    required this.imageUrl,
    required this.isStartScene,
    required this.hotspots,
  });

  factory TourScene.fromMap(Map<String, dynamic> map) {
    final hotspotsList = map['hotspots'] as List<dynamic>? ?? [];
    final hotspots = hotspotsList
        .map((h) {
          try {
            return TourHotspot.fromMap(h as Map<String, dynamic>);
          } catch (e) {
            debugPrint(
                '⚠️ [TourScene] Skipping invalid hotspot in scene "${map['title']}": $e');
            debugPrint('   Hotspot data: $h');
            return null; // Skip this hotspot
          }
        })
        .whereType<TourHotspot>() // Filter out nulls
        .toList();

    return TourScene(
      id: map['id'] as String,
      title: map['title'] as String,
      imageUrl: map['imageUrl'] as String,
      isStartScene: map['isStartScene'] as bool? ?? false,
      hotspots: hotspots,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'imageUrl': imageUrl,
      'isStartScene': isStartScene,
      'hotspots': hotspots.map((h) => h.toMap()).toList(),
    };
  }
}

/// Complete virtual tour for a church
class VirtualTour {
  final List<TourScene> scenes;

  VirtualTour({required this.scenes});

  /// Get the starting scene (first scene with isStartScene=true, or first scene)
  TourScene get startScene {
    final start = scenes.firstWhere(
      (scene) => scene.isStartScene,
      orElse: () => scenes.first,
    );
    return start;
  }

  /// Find a scene by ID
  TourScene? getSceneById(String id) {
    try {
      return scenes.firstWhere((scene) => scene.id == id);
    } catch (e) {
      return null;
    }
  }

  factory VirtualTour.fromMap(Map<String, dynamic> map) {
    final scenesList = map['scenes'] as List<dynamic>? ?? [];
    final scenes = scenesList
        .map((s) => TourScene.fromMap(s as Map<String, dynamic>))
        .toList();

    return VirtualTour(scenes: scenes);
  }

  Map<String, dynamic> toMap() {
    return {
      'scenes': scenes.map((s) => s.toMap()).toList(),
    };
  }

  /// Check if tour has any scenes
  bool get hasScenes => scenes.isNotEmpty;

  /// Validate tour
  List<String> validate() {
    final errors = <String>[];

    if (scenes.isEmpty) {
      errors.add('Tour has no scenes');
      return errors;
    }

    // Check each scene
    for (final scene in scenes) {
      if (scene.imageUrl.isEmpty) {
        errors.add('Scene "${scene.title}" has no image URL');
      }

      // Check hotspots are valid
      for (final hotspot in scene.hotspots) {
        if (hotspot.isNavigation) {
          // Navigation hotspots must have a valid targetSceneId
          if (hotspot.targetSceneId == null || hotspot.targetSceneId!.isEmpty) {
            errors.add(
                'Navigation hotspot "${hotspot.label}" in scene "${scene.title}" has no target scene');
          } else if (getSceneById(hotspot.targetSceneId!) == null) {
            errors.add(
                'Navigation hotspot "${hotspot.label}" in scene "${scene.title}" points to non-existent scene "${hotspot.targetSceneId}"');
          }
        } else if (hotspot.isInfo) {
          // Info hotspots should have a description
          if (hotspot.description == null || hotspot.description!.isEmpty) {
            errors.add(
                'Info hotspot "${hotspot.label}" in scene "${scene.title}" has no description');
          }
        }
      }
    }

    return errors;
  }
}
