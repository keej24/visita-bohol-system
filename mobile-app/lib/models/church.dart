import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'enums.dart';
import 'church_status.dart';

class Church {
  final String id;
  final String name;
  final String? fullName; // Full official name
  final String location;
  final String? municipality;
  final double? latitude;
  final double? longitude;
  final int? foundingYear;
  final String? founders; // Who founded the church
  final List<String>? keyFigures; // Important historical figures
  final ArchitecturalStyle architecturalStyle;
  final HeritageClassification heritageClassification;
  final String? history; // Historical background
  final String? description; // Church description
  final String? assignedPriest; // Current priest
  final List<Map<String, String>>? massSchedules; // Mass schedule
  final Map<String, String>? contactInfo; // Contact information (phone, email, address)
  final List<String> images;
  final List<String>? documents; // PDF documents
  final bool isHeritage;
  final String diocese; // Diocese of Tagbilaran or Diocese of Talibon
  final String? virtualTourUrl; // 360° virtual tour URL
  final List<Map<String, dynamic>>? virtual360Images; // 360° panoramic images
  final String status; // Status: pending, approved, revisions, heritage_review

  // Heritage specific fields
  final String? heritageDeclaration; // Museum declaration document URL
  final String? culturalSignificance;
  final String? preservationHistory;
  final String? restorationHistory;

  // Tags and categories
  final List<String>? tags;
  final String? category;

  Church({
    required this.id,
    required this.name,
    this.fullName,
    required this.location,
    this.municipality,
    this.latitude,
    this.longitude,
    this.foundingYear,
    this.founders,
    this.keyFigures,
    this.architecturalStyle = ArchitecturalStyle.other,
    this.heritageClassification = HeritageClassification.none,
    this.history,
    this.description,
    this.assignedPriest,
    this.massSchedules,
    this.contactInfo,
    this.images = const [],
    this.documents,
    this.isHeritage = false,
    this.diocese = 'Diocese of Tagbilaran', // Default to Diocese of Tagbilaran
    this.virtualTourUrl,
    this.virtual360Images,
    this.status = 'approved', // Default to approved for backward compatibility
    this.heritageDeclaration,
    this.culturalSignificance,
    this.preservationHistory,
    this.restorationHistory,
    this.tags,
    this.category,
  });

  factory Church.fromJson(Map<String, dynamic> j) => Church(
        id: j['id'] ?? '',
        name: j['name'] ?? '',
        fullName: j['fullName'],
        // Support both 'location' and 'municipality' fields (admin uses municipality)
        location: j['location'] ?? j['municipality'] ?? j['address'] ?? '',
        municipality: j['municipality'],
        foundingYear:
            j['foundingYear'] != null ? j['foundingYear'] as int : null,
        founders: j['founders'],
        keyFigures: j['keyFigures'] != null ? List<String>.from(j['keyFigures']) : null,
        architecturalStyle:
            ArchitecturalStyleX.fromLabel(j['architecturalStyle']),
        heritageClassification: (() {
          // Admin dashboard saves to 'classification' field, but some may use 'heritageClassification'
          final classificationValue = j['heritageClassification'] ?? j['classification'];
          debugPrint('🏛️ [${j['name']}] Raw heritageClassification: "${j['heritageClassification']}"');
          debugPrint('🏛️ [${j['name']}] Raw classification: "${j['classification']}"');
          debugPrint('🏛️ [${j['name']}] Using value: "$classificationValue"');

          if (classificationValue != null) {
            final result = HeritageClassificationX.fromLabel(classificationValue);
            debugPrint('🏛️ [${j['name']}] Parsed to: $result');
            return result;
          }
          debugPrint('🏛️ [${j['name']}] No classification found, isHeritage: ${j['isHeritage']}');
          return j['isHeritage'] == true
              ? HeritageClassification.icp
              : HeritageClassification.none;
        })(),
        history: j['history'] ?? j['historicalBackground'],
        description: j['description'],
        assignedPriest: j['assignedPriest'],
        massSchedules: _parseMassSchedules(j['massSchedules']),
        contactInfo: j['contactInfo'] != null ? Map<String, String>.from(j['contactInfo']) : null,
        images: (() {
          debugPrint('📸 [${j['name']}] Raw images field: ${j['images']}');
          debugPrint('📸 [${j['name']}] Raw photos field: ${j['photos']}');

          // Try 'images' first, then 'photos' (admin dashboard uses 'photos')
          final imagesData = j['images'] ?? j['photos'];
          debugPrint('📸 [${j['name']}] Using data: $imagesData');

          final imgs = _parseImages(imagesData);
          debugPrint('📸 [${j['name']}] Parsed ${imgs.length} images');
          if (imgs.isNotEmpty) {
            debugPrint('📸 [${j['name']}] First image: ${imgs.first}');
          }
          return imgs;
        })(),
        documents: (() {
          debugPrint('📄 [${j['name']}] Raw documents field: ${j['documents']}');
          if (j['documents'] == null) return null;

          final docs = _parseDocuments(j['documents']);
          debugPrint('📄 [${j['name']}] Parsed ${docs.length} documents');
          if (docs.isNotEmpty) {
            debugPrint('📄 [${j['name']}] First document: ${docs.first}');
          }
          return docs;
        })(),
        isHeritage: j['isHeritage'] ?? false,
        latitude: j['latitude'] != null
            ? (j['latitude'] as num).toDouble()
            : (j['coordinates'] != null && j['coordinates']['latitude'] != null
                ? (j['coordinates']['latitude'] as num).toDouble()
                : null),
        longitude: j['longitude'] != null
            ? (j['longitude'] as num).toDouble()
            : (j['coordinates'] != null && j['coordinates']['longitude'] != null
                ? (j['coordinates']['longitude'] as num).toDouble()
                : null),
        // Convert diocese format: admin stores lowercase, mobile needs full name
        diocese: _convertDiocese(j['diocese']),
        virtualTourUrl: (() {
          final url = j['virtualTourUrl'] ??
              (j['virtualTour360'] is List && (j['virtualTour360'] as List).isNotEmpty
                ? (j['virtualTour360'] as List).first
                : null);
          if (url != null) {
            debugPrint('🌐 [${j['name']}] virtualTourUrl: $url');
          }
          return url;
        })(),
        virtual360Images: (() {
          final images = _parseVirtual360Images(j['virtual360Images'] ?? j['virtualTour360']);
          debugPrint('🌐 [${j['name']}] virtual360Images count: ${images?.length ?? 0}');
          if (images != null && images.isNotEmpty) {
            debugPrint('🌐 [${j['name']}] First 360° image: ${images.first}');
          }
          return images;
        })(),
        status: j['status'] ??
            'approved', // Default to approved for backward compatibility
        heritageDeclaration: j['heritageDeclaration'],
        culturalSignificance: j['culturalSignificance'],
        preservationHistory: j['preservationHistory'],
        restorationHistory: j['restorationHistory'],
        tags: j['tags'] != null ? List<String>.from(j['tags']) : null,
        category: j['category'],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'fullName': fullName,
        'location': location,
        'municipality': municipality,
        'foundingYear': foundingYear,
        'founders': founders,
        'keyFigures': keyFigures,
        'architecturalStyle': architecturalStyle.label,
        'heritageClassification': heritageClassification.label,
        'history': history,
        'description': description,
        'assignedPriest': assignedPriest,
        'massSchedules': massSchedules,
        'contactInfo': contactInfo,
        'images': images,
        'documents': documents,
        'isHeritage': isHeritage,
        'latitude': latitude,
        'longitude': longitude,
        'diocese': diocese,
        'virtualTourUrl': virtualTourUrl,
        'virtual360Images': virtual360Images,
        'status': status,
        'heritageDeclaration': heritageDeclaration,
        'culturalSignificance': culturalSignificance,
        'preservationHistory': preservationHistory,
        'restorationHistory': restorationHistory,
        'tags': tags,
        'category': category,
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

  // Helper method to convert diocese format
  // Admin stores: 'tagbilaran' | 'talibon' (lowercase)
  // Mobile needs: 'Diocese of Tagbilaran' | 'Diocese of Talibon' (full name)
  static String _convertDiocese(dynamic diocese) {
    if (diocese == null) return 'Diocese of Tagbilaran';

    final dioceseStr = diocese.toString().toLowerCase();

    if (dioceseStr == 'tagbilaran') {
      return 'Diocese of Tagbilaran';
    } else if (dioceseStr == 'talibon') {
      return 'Diocese of Talibon';
    }

    // Already in full format or unknown
    return diocese.toString();
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
          // Direct string URL
          result.add(item);
        } else if (item is Map) {
          // Object with 'url' property (from admin dashboard)
          final url = item['url'];
          if (url != null && url is String) {
            result.add(url);
          }
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

  // Helper method to parse documents field which might be objects or strings
  static List<String> _parseDocuments(dynamic documentsData) {
    if (documentsData == null) return [];

    if (documentsData is List) {
      final List<String> result = [];
      for (var item in documentsData) {
        if (item is String) {
          // Direct string URL
          result.add(item);
        } else if (item is Map) {
          // Object with 'url' property (from admin dashboard)
          final url = item['url'];
          if (url != null && url is String) {
            result.add(url);
          }
        }
      }
      return result;
    }

    return [];
  }

  // Helper method to parse mass schedules
  static List<Map<String, String>>? _parseMassSchedules(dynamic schedulesData) {
    if (schedulesData == null) return null;

    if (schedulesData is List) {
      final List<Map<String, String>> result = [];
      for (var item in schedulesData) {
        if (item is Map) {
          result.add(Map<String, String>.from(item.map(
            (key, value) => MapEntry(key.toString(), value.toString()),
          )));
        }
      }
      return result.isEmpty ? null : result;
    }

    return null;
  }

  // Helper method to parse virtual360Images field
  static List<Map<String, dynamic>>? _parseVirtual360Images(
      dynamic virtual360Data) {
    if (virtual360Data == null) return null;

    if (virtual360Data is List) {
      final List<Map<String, dynamic>> result = [];
      for (var item in virtual360Data) {
        if (item is Map<String, dynamic>) {
          result.add(item);
        } else if (item is Map) {
          // Convert Map<dynamic, dynamic> to Map<String, dynamic>
          result.add(Map<String, dynamic>.from(item));
        }
      }
      return result.isEmpty ? null : result;
    }

    return null;
  }
}
