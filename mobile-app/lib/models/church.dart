import 'dart:math' as math;
import 'enums.dart';
import 'church_status.dart';

class Church {
  final String id;
  final String name;
  final String location;
  final double? latitude;
  final double? longitude;
  final int? foundingYear;
  final ArchitecturalStyle architecturalStyle;
  final HeritageClassification heritageClassification;
  final String? history;
  final List<String> images;
  final bool isHeritage;
  final String diocese; // Diocese of Tagbilaran or Diocese of Talibon
  final String? virtualTourUrl; // 360° virtual tour URL
  final String status; // Status: pending, approved, revisions, heritage_review

  Church({
    required this.id,
    required this.name,
    required this.location,
    this.latitude,
    this.longitude,
    this.foundingYear,
    this.architecturalStyle = ArchitecturalStyle.other,
    this.heritageClassification = HeritageClassification.none,
    this.history,
    this.images = const [],
    this.isHeritage = false,
    this.diocese = 'Diocese of Tagbilaran', // Default to Diocese of Tagbilaran
    this.virtualTourUrl,
    this.status = 'approved', // Default to approved for backward compatibility
  });

  factory Church.fromJson(Map<String, dynamic> j) => Church(
        id: j['id'] ?? '',
        name: j['name'] ?? '',
        location: j['location'] ?? '',
        foundingYear:
            j['foundingYear'] != null ? j['foundingYear'] as int : null,
        architecturalStyle:
            ArchitecturalStyleX.fromLabel(j['architecturalStyle']),
        heritageClassification: j['heritageClassification'] != null
            ? HeritageClassificationX.fromLabel(j['heritageClassification'])
            : (j['isHeritage'] == true
                ? HeritageClassification.icp
                : HeritageClassification.none),
        history: j['history'],
        images: _parseImages(j['images']),
        isHeritage: j['isHeritage'] ?? false,
        latitude:
            j['latitude'] != null ? (j['latitude'] as num).toDouble() : null,
        longitude:
            j['longitude'] != null ? (j['longitude'] as num).toDouble() : null,
        diocese: j['diocese'] ?? 'Diocese of Tagbilaran',
        virtualTourUrl: j['virtualTourUrl'],
        status: j['status'] ??
            'approved', // Default to approved for backward compatibility
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'location': location,
        'foundingYear': foundingYear,
        'architecturalStyle': architecturalStyle.label,
        'heritageClassification': heritageClassification.label,
        'history': history,
        'images': images,
        'isHeritage': isHeritage,
        'latitude': latitude,
        'longitude': longitude,
        'diocese': diocese,
        'virtualTourUrl': virtualTourUrl,
        'status': status,
      };

  // Calculate distance from a given location
  double? distanceFrom(double lat, double lng) {
    if (latitude == null || longitude == null) return null;

    // Using Haversine formula for distance calculation
    const double earthRadius = 6371; // km

    final double dLat = _toRadians(latitude! - lat);
    final double dLng = _toRadians(longitude! - lng);

    final double a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_toRadians(lat)) *
            math.cos(_toRadians(latitude!)) *
            math.sin(dLng / 2) *
            math.sin(dLng / 2);

    final double c = 2 * math.asin(math.sqrt(a));
    return earthRadius * c;
  }

  static double _toRadians(double degrees) {
    return degrees * (math.pi / 180);
  }

  /// Check if this church is visible to public users
  bool get isPublicVisible => ChurchStatus.isPublicVisible(status);

  /// Check if this church requires admin action
  bool get requiresAdminAction => ChurchStatus.requiresAdminAction(status);

  /// Check if this church is under researcher review
  bool get isUnderResearcherReview =>
      ChurchStatus.isUnderResearcherReview(status);

  /// Get human-readable status description
  String get statusDescription =>
      ChurchStatus.statusDescriptions[status] ?? 'Unknown Status';

  /// Get status color for UI display
  int get statusColor => ChurchStatus.statusColors[status] ?? 0xFF9E9E9E;

  // Helper method to parse images field which might be nested arrays
  static List<String> _parseImages(dynamic imagesData) {
    if (imagesData == null) return [];

    if (imagesData is List) {
      final List<String> result = [];
      for (var item in imagesData) {
        if (item is String) {
          result.add(item);
        } else if (item is List) {
          // Handle nested arrays like [["image.jpg"]]
          for (var nestedItem in item) {
            if (nestedItem is String) {
              result.add(nestedItem);
            }
          }
        }
      }
      return result;
    }

    return [];
  }
}
