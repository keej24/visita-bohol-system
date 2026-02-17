/// FILE PURPOSE: Church Data Model
///
/// This file defines the Church class, which represents a church entity in the
/// VISITA mobile application. It serves as the core data structure for all
/// church-related information displayed to users.

import 'dart:math' as math; // Math library for distance calculations
import 'package:flutter/foundation.dart'; // Flutter utilities (debugPrint)
// Enum definitions for architectural styles, heritage classifications
import 'enums.dart';
// Church status helper functions
import 'church_status.dart';
// Virtual tour data model
import 'virtual_tour.dart';

/// Represents a document attached to a church (PDF, etc.)
/// Stores both the URL and original filename for display purposes.
class ChurchDocument {
  final String url;
  final String name;

  const ChurchDocument({required this.url, required this.name});

  factory ChurchDocument.fromMap(Map<String, dynamic> map) {
    return ChurchDocument(
      url: map['url']?.toString() ?? '',
      name: map['name']?.toString() ?? 'Document',
    );
  }

  Map<String, dynamic> toMap() => {'url': url, 'name': name};

  @override
  String toString() => 'ChurchDocument(name: $name, url: $url)';
}

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

/// Represents a parish priest assignment record for historical tracking.
/// When a priest is reassigned, the old record gets an endDate
/// and a new record is created with isCurrent: true.
class PriestAssignment {
  final String name;
  final String? startDate;
  final String? endDate;
  final bool isCurrent;
  final String? notes;

  const PriestAssignment({
    required this.name,
    this.startDate,
    this.endDate,
    this.isCurrent = false,
    this.notes,
  });

  factory PriestAssignment.fromMap(Map<String, dynamic> map) {
    return PriestAssignment(
      name: map['name']?.toString() ?? '',
      startDate: map['startDate']?.toString(),
      endDate: map['endDate']?.toString(),
      isCurrent: map['isCurrent'] == true,
      notes: map['notes']?.toString(),
    );
  }

  Map<String, dynamic> toMap() => {
        'name': name,
        'startDate': startDate,
        'endDate': endDate,
        'isCurrent': isCurrent,
        if (notes != null) 'notes': notes,
      };

  @override
  String toString() =>
      'PriestAssignment(name: $name, $startDate–${endDate ?? "present"}, current: $isCurrent)';
}

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
  final ReligiousClassification religiousClassification; // Legacy single value
  final List<ReligiousClassification>
      religiousClassifications; // Multiple classifications
  final String? history; // Historical background
  final String? description; // Church description
  final String? assignedPriest; // Current priest
  final List<PriestAssignment>?
      priestHistory; // Historical record of priest assignments
  final List<String>?
      assistantPriests; // Assistant parish priest(s) - optional, supports multiple
  final List<Map<String, String>>? massSchedules; // Mass schedule
  final Map<String, dynamic>?
      contactInfo; // Contact information (phone, email, address, phones[], emails[])
  final List<String> images;
  final List<ChurchDocument>? documents; // PDF documents with name and URL
  final bool isHeritage;
  final String diocese; // Diocese of Tagbilaran or Diocese of Talibon
  final String? feastDay; // Feast day of the parish patron saint
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
    this.heritageClassification = HeritageClassification.nonHeritage,
    this.religiousClassification = ReligiousClassification.none,
    this.religiousClassifications = const [],
    this.history,
    this.description,
    this.assignedPriest,
    this.priestHistory,
    this.assistantPriests,
    this.massSchedules,
    this.contactInfo,
    this.images = const [],
    this.documents,
    this.isHeritage = false,
    this.diocese = 'Diocese of Tagbilaran', // Default to Diocese of Tagbilaran
    this.feastDay,
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

  /// Helper to check if church has any religious classification
  bool get hasReligiousClassification =>
      religiousClassifications.isNotEmpty ||
      religiousClassification != ReligiousClassification.none;

  /// Get all religious classifications (combining legacy single + new list)
  List<ReligiousClassification> get allReligiousClassifications {
    if (religiousClassifications.isNotEmpty) {
      return religiousClassifications;
    }
    // Fallback to legacy single value
    if (religiousClassification != ReligiousClassification.none) {
      return [religiousClassification];
    }
    return [];
  }

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
              : HeritageClassification.nonHeritage;
        })(),
        religiousClassification:
            ReligiousClassificationX.fromLabel(j['religiousClassification']),
        // Parse religiousClassifications array from historicalDetails
        religiousClassifications: (() {
          // First try historicalDetails.religiousClassifications (new format from admin)
          final historicalDetails = j['historicalDetails'];
          if (historicalDetails != null && historicalDetails is Map) {
            final classifications =
                historicalDetails['religiousClassifications'];
            if (classifications != null && classifications is List) {
              return ReligiousClassificationX.fromLabelList(classifications);
            }
          }
          // Fallback: use legacy single religiousClassification
          final legacyClassification =
              ReligiousClassificationX.fromLabel(j['religiousClassification']);
          if (legacyClassification != ReligiousClassification.none) {
            return [legacyClassification];
          }
          return <ReligiousClassification>[];
        })(),
        history: j['history'] ?? j['historicalBackground'],
        description: j['description'],
        assignedPriest: j['assignedPriest'],
        priestHistory: (() {
          if (j['priestHistory'] == null) return null;
          if (j['priestHistory'] is! List) return null;
          return (j['priestHistory'] as List)
              .where((e) => e is Map<String, dynamic>)
              .map((e) => PriestAssignment.fromMap(e as Map<String, dynamic>))
              .toList();
        })(),
        assistantPriests: (() {
          if (j['assistantPriests'] == null) return null;
          if (j['assistantPriests'] is! List) return null;
          return (j['assistantPriests'] as List)
              .map((e) => e.toString())
              .where((e) => e.isNotEmpty)
              .toList();
        })(),
        massSchedules: _parseMassSchedules(j['massSchedules']),
        contactInfo: (() {
          if (j['contactInfo'] == null) return null;
          final rawContactInfo = j['contactInfo'] as Map<String, dynamic>;
          final result = <String, dynamic>{};

          // Handle legacy single phone/email
          if (rawContactInfo['phone'] != null) {
            result['phone'] = rawContactInfo['phone'].toString();
          }
          if (rawContactInfo['email'] != null) {
            result['email'] = rawContactInfo['email'].toString();
          }
          if (rawContactInfo['address'] != null) {
            result['address'] = rawContactInfo['address'].toString();
          }

          // Handle multiple phones array
          if (rawContactInfo['phones'] != null) {
            final phones = (rawContactInfo['phones'] as List)
                .map((p) => p.toString())
                .where((p) => p.isNotEmpty && p != '+63' && p != '+63 ')
                .toList();
            if (phones.isNotEmpty) {
              result['phones'] = phones;
              // Set primary phone from first in array if not set
              if (result['phone'] == null || result['phone'] == '') {
                result['phone'] = phones.first;
              }
            }
          }

          // Handle multiple emails array
          if (rawContactInfo['emails'] != null) {
            final emails = (rawContactInfo['emails'] as List)
                .map((e) => e.toString())
                .where((e) => e.isNotEmpty)
                .toList();
            if (emails.isNotEmpty) {
              result['emails'] = emails;
              // Set primary email from first in array if not set
              if (result['email'] == null || result['email'] == '') {
                result['email'] = emails.first;
              }
            }
          }

          return result.isEmpty ? null : result;
        })(),
        images: (() {
          // Try 'photos' first (newer format), then fall back to 'images' (legacy)
          final imagesData = j['photos'] ?? j['images'];
          return _parseImages(imagesData);
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
          final classificationValue =
              j['heritageClassification'] ?? j['classification'];
          if (classificationValue != null) {
            final classification =
                HeritageClassificationX.fromLabel(classificationValue);
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
        feastDay: (() {
          final feast = j['feastDay'];
          debugPrint('🎉 [${j['name']}] feastDay from Firestore: "$feast"');
          return feast as String?;
        })(),
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
        'priestHistory': priestHistory?.map((p) => p.toMap()).toList(),
        'assistantPriests': assistantPriests,
        'massSchedules': massSchedules,
        'contactInfo': contactInfo,
        'images': images,
        'documents': documents?.map((d) => d.toMap()).toList(),
        'isHeritage': isHeritage,
        'latitude': latitude,
        'longitude': longitude,
        'diocese': diocese,
        'feastDay': feastDay,
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
  // All photos are now treated as public
  static List<String> _parseImages(dynamic imagesData) {
    if (imagesData == null) return [];

    if (imagesData is List) {
      final List<String> result = [];
      for (var item in imagesData) {
        if (item is String) {
          // Direct string URL - legacy format
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
  // All documents are now treated as public
  // Returns ChurchDocument objects with both URL and name preserved
  static List<ChurchDocument> _parseDocuments(dynamic documentsData) {
    if (documentsData == null) return [];

    if (documentsData is List) {
      final List<ChurchDocument> result = [];
      for (var item in documentsData) {
        if (item is String) {
          // Direct string URL - legacy format
          // Extract filename from URL for display
          final name = _extractFilenameFromUrl(item);
          result.add(ChurchDocument(url: item, name: name));
        } else if (item is Map) {
          // Object with 'url' and 'name' properties (from admin dashboard)
          final url = item['url'];
          if (url != null && url is String) {
            // Use name if it's a real filename, otherwise extract from URL
            // Generic names like "Document 1", "Document 2" should be replaced
            final storedName = item['name']?.toString() ?? '';
            final isGenericName = storedName.isEmpty ||
                RegExp(r'^Document\s*\d*$', caseSensitive: false)
                    .hasMatch(storedName);
            final name =
                isGenericName ? _extractFilenameFromUrl(url) : storedName;
            result.add(ChurchDocument(url: url, name: name));
          }
        }
      }
      return result;
    }

    return [];
  }

  // Helper to extract the original readable filename from a URL
  // Strips timestamp and document type prefixes added during upload
  static String _extractFilenameFromUrl(String url) {
    try {
      // Firebase Storage URLs have paths like:
      // .../o/churches%2FchurchId%2Fdocuments%2Fdocument-timestamp-filename.pdf?alt=media...
      // We need to decode the path and extract just the filename

      // First, get the path part (before query string)
      String path = url.split('?').first;

      // Decode URL encoding (%2F -> /)
      path = Uri.decodeComponent(path);

      // Get the last segment (the actual filename)
      final segments = path.split('/');
      String filename = segments.isNotEmpty ? segments.last : 'Document';

      // Strip timestamp and document type prefixes
      // Pattern: {type}-{timestamp}-{originalname} or {type}_{timestamp}_{index}_{originalname}
      // Examples: "document-1704067200000-myfile.pdf" -> "myfile.pdf"
      //           "heritage-doc_1704067200000_0_myfile.pdf" -> "myfile.pdf"
      final prefixPattern = RegExp(
          r'^(?:document|heritage-doc|historical_document)[_-]\d+[_-](?:\d+[_-])?',
          caseSensitive: false);
      filename = filename.replaceFirst(prefixPattern, '');

      return filename.isNotEmpty ? filename : 'Document';
    } catch (e) {
      return 'Document';
    }
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

  // ─────────────────────────────────────────────────────────────────────────
  // EQUALITY OPERATORS
  // ─────────────────────────────────────────────────────────────────────────
  // CRITICAL: These operators ensure Church objects are compared by ID,
  // not by object reference. This fixes bugs where:
  // - _visited.contains(church) fails because church is a different object
  // - _forVisit.remove(church) doesn't find the church to remove
  // - List operations work correctly even after data refresh

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Church && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}
