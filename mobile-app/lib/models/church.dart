/// FILE PURPOSE: Church Data Model
///
/// This file defines the Church class, which represents a church entity in the
/// VISITA mobile application. It serves as the core data structure for all
/// church-related information displayed to users.
///
/// KEY RESPONSIBILITIES:
/// - Define church data structure with all properties
/// - Provide JSON serialization (toJson/fromJson)
/// - Calculate distance from user's location
/// - Parse complex nested data (mass schedules, virtual tours, images)
/// - Handle data format differences between admin and mobile
/// - Provide helper methods for common operations
///
/// INTEGRATION POINTS:
/// - Used by Firestore repository to deserialize database docs
/// - Displayed in ChurchCard widgets throughout the app
/// - Powers church detail screen with full information
/// - Enables map markers with coordinates
/// - Drives filtering and search functionality
///
/// TECHNICAL CONCEPTS:
/// - Data Model: Plain Old Dart Object (PODO) representing business entity
/// - Factory Constructor: fromJson creates Church from JSON
/// - Computed Properties: Derive values from existing data (hasVirtualTour, etc.)
/// - Haversine Formula: Geographic distance calculation
/// - Enum Parsing: Convert string values to type-safe enums
/// - Null Safety: Dart's null-safe type system (? and ?? operators)
///
/// DATA SOURCES:
/// - Primary: Firebase Firestore 'churches' collection
/// - Created by: Admin dashboard parish secretaries
/// - Reviewed by: Chancery Office and Museum Researchers
/// - Consumed by: Mobile app public users
///
/// WHY IMPORTANT:
/// - Single source of truth for church data structure
/// - Type safety prevents runtime errors
/// - Consistent data handling across app
/// - Easy to extend with new fields
/// - Supports both online and offline modes

import 'dart:math' as math; // Math library for distance calculations
import 'package:flutter/foundation.dart'; // Flutter utilities (debugPrint)
// Enum definitions for architectural styles, heritage classifications
import 'enums.dart';
// Church status helper functions
import 'church_status.dart';
// Virtual tour data model
import 'virtual_tour.dart';

/// Church Class - Core Data Model
///
/// Represents a church with complete information including:
/// - Basic info (name, location, description)
/// - Historical data (founding year, heritage status)
/// - Operational info (mass schedules, assigned priest)
/// - Media (images, documents, virtual tours)
/// - Geolocation (coordinates for mapping)
/// - Administrative (status, diocese, approval workflow)
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
  final ReligiousClassification religiousClassification;
  final String? history; // Historical background
  final String? description; // Church description
  final String? assignedPriest; // Current priest
  final List<Map<String, String>>? massSchedules; // Mass schedule
  final Map<String, String>?
      contactInfo; // Contact information (phone, email, address)
  final List<String> images;
  final List<String>? documents; // PDF documents
  final bool isHeritage;
  final String diocese; // Diocese of Tagbilaran or Diocese of Talibon
  final VirtualTour? virtualTour; // 360° virtual tour with scenes and hotspots
  final String status; // Status: pending, approved, revisions, heritage_review

  // Heritage specific fields
  final String? heritageDeclaration; // Museum declaration document URL
  final String? culturalSignificance;
  final String? preservationHistory;
  final String? restorationHistory;

  // Architectural and Heritage Information
  final String? architecturalFeatures; // Detailed architectural description
  final String? heritageInformation; // Heritage significance and preservation

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
    this.religiousClassification = ReligiousClassification.none,
    this.history,
    this.description,
    this.assignedPriest,
    this.massSchedules,
    this.contactInfo,
    this.images = const [],
    this.documents,
    this.isHeritage = false,
    this.diocese = 'Diocese of Tagbilaran', // Default to Diocese of Tagbilaran
    this.virtualTour,
    this.status = 'approved', // Default to approved for backward compatibility
    this.heritageDeclaration,
    this.culturalSignificance,
    this.preservationHistory,
    this.restorationHistory,
    this.architecturalFeatures,
    this.heritageInformation,
    this.tags,
    this.category,
  });

  /// =============================================================================
  /// FACTORY CONSTRUCTOR - fromJson
  /// =============================================================================
  ///
  /// Creates a Church object from JSON data (typically from Firestore).
  ///
  /// WHY FACTORY CONSTRUCTOR:
  /// - Can return existing instance (caching)
  /// - Can perform validation before construction
  /// - Can call named constructors conditionally
  ///
  /// DATA PARSING CHALLENGES:
  /// - Admin dashboard and mobile use slightly different field names
  /// - Need to handle both 'location' and 'municipality' fields
  /// - Images can be strings or objects with 'url' property
  /// - Coordinates can be at root or nested in 'coordinates' object
  /// - Diocese names need format conversion (lowercase vs full name)
  ///
  /// DEFENSIVE PROGRAMMING:
  /// - Uses null coalescing (??) to provide fallback values
  /// - Validates data types before casting
  /// - Logs parsing errors for debugging
  /// - Handles missing or malformed data gracefully
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
        keyFigures:
            j['keyFigures'] != null ? List<String>.from(j['keyFigures']) : null,
        architecturalStyle:
            ArchitecturalStyleX.fromLabel(j['architecturalStyle']),
        heritageClassification: (() {
          // Admin dashboard saves to 'classification' field, but some may use 'heritageClassification'
          final classificationValue =
              j['heritageClassification'] ?? j['classification'];
          debugPrint(
              '🏛️ [${j['name']}] Raw heritageClassification: "${j['heritageClassification']}"');
          debugPrint(
              '🏛️ [${j['name']}] Raw classification: "${j['classification']}"');
          debugPrint('🏛️ [${j['name']}] Using value: "$classificationValue"');

          if (classificationValue != null) {
            final result =
                HeritageClassificationX.fromLabel(classificationValue);
            debugPrint('🏛️ [${j['name']}] Parsed to: $result');
            return result;
          }
          debugPrint(
              '🏛️ [${j['name']}] No classification found, isHeritage: ${j['isHeritage']}');
          return j['isHeritage'] == true
              ? HeritageClassification.icp
              : HeritageClassification.none;
        })(),
        religiousClassification:
            ReligiousClassificationX.fromLabel(j['religiousClassification']),
        history: j['history'] ?? j['historicalBackground'],
        description: j['description'],
        assignedPriest: j['assignedPriest'],
        massSchedules: _parseMassSchedules(j['massSchedules']),
        contactInfo: j['contactInfo'] != null
            ? Map<String, String>.from(j['contactInfo'])
            : null,
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
          debugPrint(
              '📄 [${j['name']}] Raw documents field: ${j['documents']}');
          if (j['documents'] == null) return null;

          final docs = _parseDocuments(j['documents']);
          debugPrint('📄 [${j['name']}] Parsed ${docs.length} documents');
          if (docs.isNotEmpty) {
            debugPrint('📄 [${j['name']}] First document: ${docs.first}');
          }
          return docs;
        })(),
        isHeritage: (() {
          // Auto-derive isHeritage from heritageClassification if not explicitly set
          if (j['isHeritage'] != null) return j['isHeritage'] as bool;

          // Check if church has a valid heritage classification
          final classificationValue = j['heritageClassification'] ?? j['classification'];
          if (classificationValue != null) {
            final classification = HeritageClassificationX.fromLabel(classificationValue);
            // Heritage sites are ICP or NCT (not 'none' or 'nonHeritage')
            return classification == HeritageClassification.icp ||
                   classification == HeritageClassification.nct;
          }

          return false;
        })(),
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
        virtualTour: (() {
          final tourData = j['virtualTour'];
          if (tourData != null && tourData is Map<String, dynamic>) {
            try {
              final tour = VirtualTour.fromMap(tourData);
              debugPrint(
                  '🌐 [${j['name']}] virtualTour loaded: ${tour.scenes.length} scenes');

              // Log hotspot statistics
              int totalHotspots = 0;
              int navigationHotspots = 0;
              int infoHotspots = 0;
              for (final scene in tour.scenes) {
                totalHotspots += scene.hotspots.length;
                navigationHotspots +=
                    scene.hotspots.where((h) => h.isNavigation).length;
                infoHotspots += scene.hotspots.where((h) => h.isInfo).length;
              }
              debugPrint(
                  '   📍 Total hotspots: $totalHotspots ($navigationHotspots navigation, $infoHotspots info)');

              // Validate tour
              final errors = tour.validate();
              if (errors.isNotEmpty) {
                debugPrint('⚠️ [${j['name']}] Tour validation errors:');
                for (final error in errors) {
                  debugPrint('   - $error');
                }
              }

              return tour;
            } catch (e, stackTrace) {
              debugPrint('❌ [${j['name']}] Failed to parse virtualTour: $e');
              debugPrint('   Stack trace: $stackTrace');
              return null;
            }
          }
          return null;
        })(),
        status: j['status'] ??
            'approved', // Default to approved for backward compatibility
        heritageDeclaration: j['heritageDeclaration'],
        culturalSignificance: j['culturalSignificance'],
        preservationHistory: j['preservationHistory'],
        restorationHistory: j['restorationHistory'],
        architecturalFeatures: (() {
          // Check both direct field and nested in historicalDetails
          if (j['architecturalFeatures'] != null) {
            return j['architecturalFeatures'] as String;
          }
          if (j['historicalDetails'] != null &&
              j['historicalDetails']['architecturalFeatures'] != null) {
            return j['historicalDetails']['architecturalFeatures'] as String;
          }
          return null;
        })(),
        heritageInformation: (() {
          // Check both direct field and nested in historicalDetails
          if (j['heritageInformation'] != null) {
            return j['heritageInformation'] as String;
          }
          if (j['historicalDetails'] != null &&
              j['historicalDetails']['heritageInformation'] != null) {
            return j['historicalDetails']['heritageInformation'] as String;
          }
          return null;
        })(),
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
        'virtualTour': virtualTour?.toMap(),
        'status': status,
        'heritageDeclaration': heritageDeclaration,
        'culturalSignificance': culturalSignificance,
        'preservationHistory': preservationHistory,
        'restorationHistory': restorationHistory,
        'architecturalFeatures': architecturalFeatures,
        'heritageInformation': heritageInformation,
        'tags': tags,
        'category': category,
      };

  /// =============================================================================
  /// DISTANCE CALCULATION METHOD
  /// =============================================================================
  ///
  /// Calculates distance between this church and a given location in kilometers.
  ///
  /// ALGORITHM: Haversine Formula
  /// - Standard algorithm for calculating great-circle distance
  /// - Accounts for Earth's curvature (not just straight line)
  /// - Returns distance in kilometers
  ///
  /// USAGE:
  /// - "Churches near me" feature
  /// - Sort churches by distance
  /// - Show "X km away" on church cards
  ///
  /// PARAMETERS:
  /// - lat: User's current latitude
  /// - lng: User's current longitude
  ///
  /// RETURNS:
  /// - double: Distance in kilometers
  /// - null: If church has no coordinates
  double? distanceFrom(double lat, double lng) {
    if (latitude == null || longitude == null) return null;

    // Using Haversine formula for distance calculation
    // Earth radius in kilometers (mean radius)
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

  /// Check if this church has a virtual tour
  bool get hasVirtualTour {
    return virtualTour != null && virtualTour!.hasScenes;
  }

  /// Get total number of scenes in virtual tour
  int get virtualTourSceneCount {
    return virtualTour?.scenes.length ?? 0;
  }

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

    debugPrint(
        '🔍 [PARSE MASS] Raw schedulesData type: ${schedulesData.runtimeType}');
    debugPrint('🔍 [PARSE MASS] Raw schedulesData: $schedulesData');

    if (schedulesData is List) {
      final List<Map<String, String>> result = [];
      for (var item in schedulesData) {
        debugPrint('🔍 [PARSE MASS] Processing item: $item');
        if (item is Map) {
          final parsed = <String, String>{};
          item.forEach((key, value) {
            debugPrint(
                '   - Field: $key = $value (type: ${value.runtimeType})');
            if (key == 'isFbLive') {
              // Accept both bool and string
              if (value is bool) {
                parsed['isFbLive'] = value ? 'true' : 'false';
                debugPrint(
                    '   ✓ Parsed isFbLive (bool): ${parsed['isFbLive']}');
              } else if (value is String) {
                parsed['isFbLive'] =
                    (value.toLowerCase() == 'true') ? 'true' : 'false';
                debugPrint(
                    '   ✓ Parsed isFbLive (string): ${parsed['isFbLive']}');
              } else {
                debugPrint(
                    '   ⚠️ isFbLive has unexpected type: ${value.runtimeType}');
              }
            } else if (key == 'language') {
              parsed['language'] = value?.toString() ?? '';
              debugPrint('   ✓ Parsed language: "${parsed['language']}"');
            } else {
              parsed[key.toString()] = value?.toString() ?? '';
            }
          });
          result.add(parsed);
        }
      }
      return result.isEmpty ? null : result;
    }

    return null;
  }

  // Helper method to parse virtual360Images field
}
