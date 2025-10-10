// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'offline_database.dart';

// ignore_for_file: type=lint
class $OfflineChurchesTable extends OfflineChurches
    with TableInfo<$OfflineChurchesTable, OfflineChurch> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflineChurchesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _nameMeta = const VerificationMeta('name');
  @override
  late final GeneratedColumn<String> name = GeneratedColumn<String>(
      'name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _fullNameMeta =
      const VerificationMeta('fullName');
  @override
  late final GeneratedColumn<String> fullName = GeneratedColumn<String>(
      'full_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _locationMeta =
      const VerificationMeta('location');
  @override
  late final GeneratedColumn<String> location = GeneratedColumn<String>(
      'location', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _municipalityMeta =
      const VerificationMeta('municipality');
  @override
  late final GeneratedColumn<String> municipality = GeneratedColumn<String>(
      'municipality', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _dioceseMeta =
      const VerificationMeta('diocese');
  @override
  late final GeneratedColumn<String> diocese = GeneratedColumn<String>(
      'diocese', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _foundingYearMeta =
      const VerificationMeta('foundingYear');
  @override
  late final GeneratedColumn<int> foundingYear = GeneratedColumn<int>(
      'founding_year', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _foundersJsonMeta =
      const VerificationMeta('foundersJson');
  @override
  late final GeneratedColumn<String> foundersJson = GeneratedColumn<String>(
      'founders_json', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _architecturalStyleMeta =
      const VerificationMeta('architecturalStyle');
  @override
  late final GeneratedColumn<String> architecturalStyle =
      GeneratedColumn<String>('architectural_style', aliasedName, true,
          type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _historyMeta =
      const VerificationMeta('history');
  @override
  late final GeneratedColumn<String> history = GeneratedColumn<String>(
      'history', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _descriptionMeta =
      const VerificationMeta('description');
  @override
  late final GeneratedColumn<String> description = GeneratedColumn<String>(
      'description', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _heritageClassificationMeta =
      const VerificationMeta('heritageClassification');
  @override
  late final GeneratedColumn<String> heritageClassification =
      GeneratedColumn<String>('heritage_classification', aliasedName, false,
          type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _assignedPriestMeta =
      const VerificationMeta('assignedPriest');
  @override
  late final GeneratedColumn<String> assignedPriest = GeneratedColumn<String>(
      'assigned_priest', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _massSchedulesJsonMeta =
      const VerificationMeta('massSchedulesJson');
  @override
  late final GeneratedColumn<String> massSchedulesJson =
      GeneratedColumn<String>('mass_schedules_json', aliasedName, true,
          type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _latitudeMeta =
      const VerificationMeta('latitude');
  @override
  late final GeneratedColumn<double> latitude = GeneratedColumn<double>(
      'latitude', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _longitudeMeta =
      const VerificationMeta('longitude');
  @override
  late final GeneratedColumn<double> longitude = GeneratedColumn<double>(
      'longitude', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _contactInfoJsonMeta =
      const VerificationMeta('contactInfoJson');
  @override
  late final GeneratedColumn<String> contactInfoJson = GeneratedColumn<String>(
      'contact_info_json', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _imagesJsonMeta =
      const VerificationMeta('imagesJson');
  @override
  late final GeneratedColumn<String> imagesJson = GeneratedColumn<String>(
      'images_json', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _isPublicVisibleMeta =
      const VerificationMeta('isPublicVisible');
  @override
  late final GeneratedColumn<bool> isPublicVisible = GeneratedColumn<bool>(
      'is_public_visible', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("is_public_visible" IN (0, 1))'),
      defaultValue: const Constant(true));
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('approved'));
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _lastSyncedAtMeta =
      const VerificationMeta('lastSyncedAt');
  @override
  late final GeneratedColumn<DateTime> lastSyncedAt = GeneratedColumn<DateTime>(
      'last_synced_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _needsSyncMeta =
      const VerificationMeta('needsSync');
  @override
  late final GeneratedColumn<bool> needsSync = GeneratedColumn<bool>(
      'needs_sync', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("needs_sync" IN (0, 1))'),
      defaultValue: const Constant(false));
  @override
  List<GeneratedColumn> get $columns => [
        id,
        name,
        fullName,
        location,
        municipality,
        diocese,
        foundingYear,
        foundersJson,
        architecturalStyle,
        history,
        description,
        heritageClassification,
        assignedPriest,
        massSchedulesJson,
        latitude,
        longitude,
        contactInfoJson,
        imagesJson,
        isPublicVisible,
        status,
        createdAt,
        updatedAt,
        lastSyncedAt,
        needsSync
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_churches';
  @override
  VerificationContext validateIntegrity(Insertable<OfflineChurch> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('name')) {
      context.handle(
          _nameMeta, name.isAcceptableOrUnknown(data['name']!, _nameMeta));
    } else if (isInserting) {
      context.missing(_nameMeta);
    }
    if (data.containsKey('full_name')) {
      context.handle(_fullNameMeta,
          fullName.isAcceptableOrUnknown(data['full_name']!, _fullNameMeta));
    }
    if (data.containsKey('location')) {
      context.handle(_locationMeta,
          location.isAcceptableOrUnknown(data['location']!, _locationMeta));
    } else if (isInserting) {
      context.missing(_locationMeta);
    }
    if (data.containsKey('municipality')) {
      context.handle(
          _municipalityMeta,
          municipality.isAcceptableOrUnknown(
              data['municipality']!, _municipalityMeta));
    } else if (isInserting) {
      context.missing(_municipalityMeta);
    }
    if (data.containsKey('diocese')) {
      context.handle(_dioceseMeta,
          diocese.isAcceptableOrUnknown(data['diocese']!, _dioceseMeta));
    } else if (isInserting) {
      context.missing(_dioceseMeta);
    }
    if (data.containsKey('founding_year')) {
      context.handle(
          _foundingYearMeta,
          foundingYear.isAcceptableOrUnknown(
              data['founding_year']!, _foundingYearMeta));
    }
    if (data.containsKey('founders_json')) {
      context.handle(
          _foundersJsonMeta,
          foundersJson.isAcceptableOrUnknown(
              data['founders_json']!, _foundersJsonMeta));
    }
    if (data.containsKey('architectural_style')) {
      context.handle(
          _architecturalStyleMeta,
          architecturalStyle.isAcceptableOrUnknown(
              data['architectural_style']!, _architecturalStyleMeta));
    }
    if (data.containsKey('history')) {
      context.handle(_historyMeta,
          history.isAcceptableOrUnknown(data['history']!, _historyMeta));
    }
    if (data.containsKey('description')) {
      context.handle(
          _descriptionMeta,
          description.isAcceptableOrUnknown(
              data['description']!, _descriptionMeta));
    }
    if (data.containsKey('heritage_classification')) {
      context.handle(
          _heritageClassificationMeta,
          heritageClassification.isAcceptableOrUnknown(
              data['heritage_classification']!, _heritageClassificationMeta));
    } else if (isInserting) {
      context.missing(_heritageClassificationMeta);
    }
    if (data.containsKey('assigned_priest')) {
      context.handle(
          _assignedPriestMeta,
          assignedPriest.isAcceptableOrUnknown(
              data['assigned_priest']!, _assignedPriestMeta));
    }
    if (data.containsKey('mass_schedules_json')) {
      context.handle(
          _massSchedulesJsonMeta,
          massSchedulesJson.isAcceptableOrUnknown(
              data['mass_schedules_json']!, _massSchedulesJsonMeta));
    }
    if (data.containsKey('latitude')) {
      context.handle(_latitudeMeta,
          latitude.isAcceptableOrUnknown(data['latitude']!, _latitudeMeta));
    }
    if (data.containsKey('longitude')) {
      context.handle(_longitudeMeta,
          longitude.isAcceptableOrUnknown(data['longitude']!, _longitudeMeta));
    }
    if (data.containsKey('contact_info_json')) {
      context.handle(
          _contactInfoJsonMeta,
          contactInfoJson.isAcceptableOrUnknown(
              data['contact_info_json']!, _contactInfoJsonMeta));
    }
    if (data.containsKey('images_json')) {
      context.handle(
          _imagesJsonMeta,
          imagesJson.isAcceptableOrUnknown(
              data['images_json']!, _imagesJsonMeta));
    }
    if (data.containsKey('is_public_visible')) {
      context.handle(
          _isPublicVisibleMeta,
          isPublicVisible.isAcceptableOrUnknown(
              data['is_public_visible']!, _isPublicVisibleMeta));
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    if (data.containsKey('last_synced_at')) {
      context.handle(
          _lastSyncedAtMeta,
          lastSyncedAt.isAcceptableOrUnknown(
              data['last_synced_at']!, _lastSyncedAtMeta));
    }
    if (data.containsKey('needs_sync')) {
      context.handle(_needsSyncMeta,
          needsSync.isAcceptableOrUnknown(data['needs_sync']!, _needsSyncMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  OfflineChurch map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflineChurch(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      name: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}name'])!,
      fullName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}full_name']),
      location: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}location'])!,
      municipality: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}municipality'])!,
      diocese: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}diocese'])!,
      foundingYear: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}founding_year']),
      foundersJson: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}founders_json']),
      architecturalStyle: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}architectural_style']),
      history: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}history']),
      description: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}description']),
      heritageClassification: attachedDatabase.typeMapping.read(
          DriftSqlType.string,
          data['${effectivePrefix}heritage_classification'])!,
      assignedPriest: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}assigned_priest']),
      massSchedulesJson: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}mass_schedules_json']),
      latitude: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}latitude']),
      longitude: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}longitude']),
      contactInfoJson: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}contact_info_json']),
      imagesJson: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}images_json']),
      isPublicVisible: attachedDatabase.typeMapping.read(
          DriftSqlType.bool, data['${effectivePrefix}is_public_visible'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at'])!,
      lastSyncedAt: attachedDatabase.typeMapping.read(
          DriftSqlType.dateTime, data['${effectivePrefix}last_synced_at']),
      needsSync: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}needs_sync'])!,
    );
  }

  @override
  $OfflineChurchesTable createAlias(String alias) {
    return $OfflineChurchesTable(attachedDatabase, alias);
  }
}

class OfflineChurch extends DataClass implements Insertable<OfflineChurch> {
  final String id;
  final String name;
  final String? fullName;
  final String location;
  final String municipality;
  final String diocese;
  final int? foundingYear;
  final String? foundersJson;
  final String? architecturalStyle;
  final String? history;
  final String? description;
  final String heritageClassification;
  final String? assignedPriest;
  final String? massSchedulesJson;
  final double? latitude;
  final double? longitude;
  final String? contactInfoJson;
  final String? imagesJson;
  final bool isPublicVisible;
  final String status;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? lastSyncedAt;
  final bool needsSync;
  const OfflineChurch(
      {required this.id,
      required this.name,
      this.fullName,
      required this.location,
      required this.municipality,
      required this.diocese,
      this.foundingYear,
      this.foundersJson,
      this.architecturalStyle,
      this.history,
      this.description,
      required this.heritageClassification,
      this.assignedPriest,
      this.massSchedulesJson,
      this.latitude,
      this.longitude,
      this.contactInfoJson,
      this.imagesJson,
      required this.isPublicVisible,
      required this.status,
      required this.createdAt,
      required this.updatedAt,
      this.lastSyncedAt,
      required this.needsSync});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['name'] = Variable<String>(name);
    if (!nullToAbsent || fullName != null) {
      map['full_name'] = Variable<String>(fullName);
    }
    map['location'] = Variable<String>(location);
    map['municipality'] = Variable<String>(municipality);
    map['diocese'] = Variable<String>(diocese);
    if (!nullToAbsent || foundingYear != null) {
      map['founding_year'] = Variable<int>(foundingYear);
    }
    if (!nullToAbsent || foundersJson != null) {
      map['founders_json'] = Variable<String>(foundersJson);
    }
    if (!nullToAbsent || architecturalStyle != null) {
      map['architectural_style'] = Variable<String>(architecturalStyle);
    }
    if (!nullToAbsent || history != null) {
      map['history'] = Variable<String>(history);
    }
    if (!nullToAbsent || description != null) {
      map['description'] = Variable<String>(description);
    }
    map['heritage_classification'] = Variable<String>(heritageClassification);
    if (!nullToAbsent || assignedPriest != null) {
      map['assigned_priest'] = Variable<String>(assignedPriest);
    }
    if (!nullToAbsent || massSchedulesJson != null) {
      map['mass_schedules_json'] = Variable<String>(massSchedulesJson);
    }
    if (!nullToAbsent || latitude != null) {
      map['latitude'] = Variable<double>(latitude);
    }
    if (!nullToAbsent || longitude != null) {
      map['longitude'] = Variable<double>(longitude);
    }
    if (!nullToAbsent || contactInfoJson != null) {
      map['contact_info_json'] = Variable<String>(contactInfoJson);
    }
    if (!nullToAbsent || imagesJson != null) {
      map['images_json'] = Variable<String>(imagesJson);
    }
    map['is_public_visible'] = Variable<bool>(isPublicVisible);
    map['status'] = Variable<String>(status);
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    if (!nullToAbsent || lastSyncedAt != null) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt);
    }
    map['needs_sync'] = Variable<bool>(needsSync);
    return map;
  }

  OfflineChurchesCompanion toCompanion(bool nullToAbsent) {
    return OfflineChurchesCompanion(
      id: Value(id),
      name: Value(name),
      fullName: fullName == null && nullToAbsent
          ? const Value.absent()
          : Value(fullName),
      location: Value(location),
      municipality: Value(municipality),
      diocese: Value(diocese),
      foundingYear: foundingYear == null && nullToAbsent
          ? const Value.absent()
          : Value(foundingYear),
      foundersJson: foundersJson == null && nullToAbsent
          ? const Value.absent()
          : Value(foundersJson),
      architecturalStyle: architecturalStyle == null && nullToAbsent
          ? const Value.absent()
          : Value(architecturalStyle),
      history: history == null && nullToAbsent
          ? const Value.absent()
          : Value(history),
      description: description == null && nullToAbsent
          ? const Value.absent()
          : Value(description),
      heritageClassification: Value(heritageClassification),
      assignedPriest: assignedPriest == null && nullToAbsent
          ? const Value.absent()
          : Value(assignedPriest),
      massSchedulesJson: massSchedulesJson == null && nullToAbsent
          ? const Value.absent()
          : Value(massSchedulesJson),
      latitude: latitude == null && nullToAbsent
          ? const Value.absent()
          : Value(latitude),
      longitude: longitude == null && nullToAbsent
          ? const Value.absent()
          : Value(longitude),
      contactInfoJson: contactInfoJson == null && nullToAbsent
          ? const Value.absent()
          : Value(contactInfoJson),
      imagesJson: imagesJson == null && nullToAbsent
          ? const Value.absent()
          : Value(imagesJson),
      isPublicVisible: Value(isPublicVisible),
      status: Value(status),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
      lastSyncedAt: lastSyncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncedAt),
      needsSync: Value(needsSync),
    );
  }

  factory OfflineChurch.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflineChurch(
      id: serializer.fromJson<String>(json['id']),
      name: serializer.fromJson<String>(json['name']),
      fullName: serializer.fromJson<String?>(json['fullName']),
      location: serializer.fromJson<String>(json['location']),
      municipality: serializer.fromJson<String>(json['municipality']),
      diocese: serializer.fromJson<String>(json['diocese']),
      foundingYear: serializer.fromJson<int?>(json['foundingYear']),
      foundersJson: serializer.fromJson<String?>(json['foundersJson']),
      architecturalStyle:
          serializer.fromJson<String?>(json['architecturalStyle']),
      history: serializer.fromJson<String?>(json['history']),
      description: serializer.fromJson<String?>(json['description']),
      heritageClassification:
          serializer.fromJson<String>(json['heritageClassification']),
      assignedPriest: serializer.fromJson<String?>(json['assignedPriest']),
      massSchedulesJson:
          serializer.fromJson<String?>(json['massSchedulesJson']),
      latitude: serializer.fromJson<double?>(json['latitude']),
      longitude: serializer.fromJson<double?>(json['longitude']),
      contactInfoJson: serializer.fromJson<String?>(json['contactInfoJson']),
      imagesJson: serializer.fromJson<String?>(json['imagesJson']),
      isPublicVisible: serializer.fromJson<bool>(json['isPublicVisible']),
      status: serializer.fromJson<String>(json['status']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
      lastSyncedAt: serializer.fromJson<DateTime?>(json['lastSyncedAt']),
      needsSync: serializer.fromJson<bool>(json['needsSync']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'name': serializer.toJson<String>(name),
      'fullName': serializer.toJson<String?>(fullName),
      'location': serializer.toJson<String>(location),
      'municipality': serializer.toJson<String>(municipality),
      'diocese': serializer.toJson<String>(diocese),
      'foundingYear': serializer.toJson<int?>(foundingYear),
      'foundersJson': serializer.toJson<String?>(foundersJson),
      'architecturalStyle': serializer.toJson<String?>(architecturalStyle),
      'history': serializer.toJson<String?>(history),
      'description': serializer.toJson<String?>(description),
      'heritageClassification':
          serializer.toJson<String>(heritageClassification),
      'assignedPriest': serializer.toJson<String?>(assignedPriest),
      'massSchedulesJson': serializer.toJson<String?>(massSchedulesJson),
      'latitude': serializer.toJson<double?>(latitude),
      'longitude': serializer.toJson<double?>(longitude),
      'contactInfoJson': serializer.toJson<String?>(contactInfoJson),
      'imagesJson': serializer.toJson<String?>(imagesJson),
      'isPublicVisible': serializer.toJson<bool>(isPublicVisible),
      'status': serializer.toJson<String>(status),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
      'lastSyncedAt': serializer.toJson<DateTime?>(lastSyncedAt),
      'needsSync': serializer.toJson<bool>(needsSync),
    };
  }

  OfflineChurch copyWith(
          {String? id,
          String? name,
          Value<String?> fullName = const Value.absent(),
          String? location,
          String? municipality,
          String? diocese,
          Value<int?> foundingYear = const Value.absent(),
          Value<String?> foundersJson = const Value.absent(),
          Value<String?> architecturalStyle = const Value.absent(),
          Value<String?> history = const Value.absent(),
          Value<String?> description = const Value.absent(),
          String? heritageClassification,
          Value<String?> assignedPriest = const Value.absent(),
          Value<String?> massSchedulesJson = const Value.absent(),
          Value<double?> latitude = const Value.absent(),
          Value<double?> longitude = const Value.absent(),
          Value<String?> contactInfoJson = const Value.absent(),
          Value<String?> imagesJson = const Value.absent(),
          bool? isPublicVisible,
          String? status,
          DateTime? createdAt,
          DateTime? updatedAt,
          Value<DateTime?> lastSyncedAt = const Value.absent(),
          bool? needsSync}) =>
      OfflineChurch(
        id: id ?? this.id,
        name: name ?? this.name,
        fullName: fullName.present ? fullName.value : this.fullName,
        location: location ?? this.location,
        municipality: municipality ?? this.municipality,
        diocese: diocese ?? this.diocese,
        foundingYear:
            foundingYear.present ? foundingYear.value : this.foundingYear,
        foundersJson:
            foundersJson.present ? foundersJson.value : this.foundersJson,
        architecturalStyle: architecturalStyle.present
            ? architecturalStyle.value
            : this.architecturalStyle,
        history: history.present ? history.value : this.history,
        description: description.present ? description.value : this.description,
        heritageClassification:
            heritageClassification ?? this.heritageClassification,
        assignedPriest:
            assignedPriest.present ? assignedPriest.value : this.assignedPriest,
        massSchedulesJson: massSchedulesJson.present
            ? massSchedulesJson.value
            : this.massSchedulesJson,
        latitude: latitude.present ? latitude.value : this.latitude,
        longitude: longitude.present ? longitude.value : this.longitude,
        contactInfoJson: contactInfoJson.present
            ? contactInfoJson.value
            : this.contactInfoJson,
        imagesJson: imagesJson.present ? imagesJson.value : this.imagesJson,
        isPublicVisible: isPublicVisible ?? this.isPublicVisible,
        status: status ?? this.status,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        lastSyncedAt:
            lastSyncedAt.present ? lastSyncedAt.value : this.lastSyncedAt,
        needsSync: needsSync ?? this.needsSync,
      );
  OfflineChurch copyWithCompanion(OfflineChurchesCompanion data) {
    return OfflineChurch(
      id: data.id.present ? data.id.value : this.id,
      name: data.name.present ? data.name.value : this.name,
      fullName: data.fullName.present ? data.fullName.value : this.fullName,
      location: data.location.present ? data.location.value : this.location,
      municipality: data.municipality.present
          ? data.municipality.value
          : this.municipality,
      diocese: data.diocese.present ? data.diocese.value : this.diocese,
      foundingYear: data.foundingYear.present
          ? data.foundingYear.value
          : this.foundingYear,
      foundersJson: data.foundersJson.present
          ? data.foundersJson.value
          : this.foundersJson,
      architecturalStyle: data.architecturalStyle.present
          ? data.architecturalStyle.value
          : this.architecturalStyle,
      history: data.history.present ? data.history.value : this.history,
      description:
          data.description.present ? data.description.value : this.description,
      heritageClassification: data.heritageClassification.present
          ? data.heritageClassification.value
          : this.heritageClassification,
      assignedPriest: data.assignedPriest.present
          ? data.assignedPriest.value
          : this.assignedPriest,
      massSchedulesJson: data.massSchedulesJson.present
          ? data.massSchedulesJson.value
          : this.massSchedulesJson,
      latitude: data.latitude.present ? data.latitude.value : this.latitude,
      longitude: data.longitude.present ? data.longitude.value : this.longitude,
      contactInfoJson: data.contactInfoJson.present
          ? data.contactInfoJson.value
          : this.contactInfoJson,
      imagesJson:
          data.imagesJson.present ? data.imagesJson.value : this.imagesJson,
      isPublicVisible: data.isPublicVisible.present
          ? data.isPublicVisible.value
          : this.isPublicVisible,
      status: data.status.present ? data.status.value : this.status,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      lastSyncedAt: data.lastSyncedAt.present
          ? data.lastSyncedAt.value
          : this.lastSyncedAt,
      needsSync: data.needsSync.present ? data.needsSync.value : this.needsSync,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflineChurch(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('fullName: $fullName, ')
          ..write('location: $location, ')
          ..write('municipality: $municipality, ')
          ..write('diocese: $diocese, ')
          ..write('foundingYear: $foundingYear, ')
          ..write('foundersJson: $foundersJson, ')
          ..write('architecturalStyle: $architecturalStyle, ')
          ..write('history: $history, ')
          ..write('description: $description, ')
          ..write('heritageClassification: $heritageClassification, ')
          ..write('assignedPriest: $assignedPriest, ')
          ..write('massSchedulesJson: $massSchedulesJson, ')
          ..write('latitude: $latitude, ')
          ..write('longitude: $longitude, ')
          ..write('contactInfoJson: $contactInfoJson, ')
          ..write('imagesJson: $imagesJson, ')
          ..write('isPublicVisible: $isPublicVisible, ')
          ..write('status: $status, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('lastSyncedAt: $lastSyncedAt, ')
          ..write('needsSync: $needsSync')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hashAll([
        id,
        name,
        fullName,
        location,
        municipality,
        diocese,
        foundingYear,
        foundersJson,
        architecturalStyle,
        history,
        description,
        heritageClassification,
        assignedPriest,
        massSchedulesJson,
        latitude,
        longitude,
        contactInfoJson,
        imagesJson,
        isPublicVisible,
        status,
        createdAt,
        updatedAt,
        lastSyncedAt,
        needsSync
      ]);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflineChurch &&
          other.id == this.id &&
          other.name == this.name &&
          other.fullName == this.fullName &&
          other.location == this.location &&
          other.municipality == this.municipality &&
          other.diocese == this.diocese &&
          other.foundingYear == this.foundingYear &&
          other.foundersJson == this.foundersJson &&
          other.architecturalStyle == this.architecturalStyle &&
          other.history == this.history &&
          other.description == this.description &&
          other.heritageClassification == this.heritageClassification &&
          other.assignedPriest == this.assignedPriest &&
          other.massSchedulesJson == this.massSchedulesJson &&
          other.latitude == this.latitude &&
          other.longitude == this.longitude &&
          other.contactInfoJson == this.contactInfoJson &&
          other.imagesJson == this.imagesJson &&
          other.isPublicVisible == this.isPublicVisible &&
          other.status == this.status &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.lastSyncedAt == this.lastSyncedAt &&
          other.needsSync == this.needsSync);
}

class OfflineChurchesCompanion extends UpdateCompanion<OfflineChurch> {
  final Value<String> id;
  final Value<String> name;
  final Value<String?> fullName;
  final Value<String> location;
  final Value<String> municipality;
  final Value<String> diocese;
  final Value<int?> foundingYear;
  final Value<String?> foundersJson;
  final Value<String?> architecturalStyle;
  final Value<String?> history;
  final Value<String?> description;
  final Value<String> heritageClassification;
  final Value<String?> assignedPriest;
  final Value<String?> massSchedulesJson;
  final Value<double?> latitude;
  final Value<double?> longitude;
  final Value<String?> contactInfoJson;
  final Value<String?> imagesJson;
  final Value<bool> isPublicVisible;
  final Value<String> status;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  final Value<DateTime?> lastSyncedAt;
  final Value<bool> needsSync;
  final Value<int> rowid;
  const OfflineChurchesCompanion({
    this.id = const Value.absent(),
    this.name = const Value.absent(),
    this.fullName = const Value.absent(),
    this.location = const Value.absent(),
    this.municipality = const Value.absent(),
    this.diocese = const Value.absent(),
    this.foundingYear = const Value.absent(),
    this.foundersJson = const Value.absent(),
    this.architecturalStyle = const Value.absent(),
    this.history = const Value.absent(),
    this.description = const Value.absent(),
    this.heritageClassification = const Value.absent(),
    this.assignedPriest = const Value.absent(),
    this.massSchedulesJson = const Value.absent(),
    this.latitude = const Value.absent(),
    this.longitude = const Value.absent(),
    this.contactInfoJson = const Value.absent(),
    this.imagesJson = const Value.absent(),
    this.isPublicVisible = const Value.absent(),
    this.status = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
    this.needsSync = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  OfflineChurchesCompanion.insert({
    required String id,
    required String name,
    this.fullName = const Value.absent(),
    required String location,
    required String municipality,
    required String diocese,
    this.foundingYear = const Value.absent(),
    this.foundersJson = const Value.absent(),
    this.architecturalStyle = const Value.absent(),
    this.history = const Value.absent(),
    this.description = const Value.absent(),
    required String heritageClassification,
    this.assignedPriest = const Value.absent(),
    this.massSchedulesJson = const Value.absent(),
    this.latitude = const Value.absent(),
    this.longitude = const Value.absent(),
    this.contactInfoJson = const Value.absent(),
    this.imagesJson = const Value.absent(),
    this.isPublicVisible = const Value.absent(),
    this.status = const Value.absent(),
    required DateTime createdAt,
    required DateTime updatedAt,
    this.lastSyncedAt = const Value.absent(),
    this.needsSync = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        name = Value(name),
        location = Value(location),
        municipality = Value(municipality),
        diocese = Value(diocese),
        heritageClassification = Value(heritageClassification),
        createdAt = Value(createdAt),
        updatedAt = Value(updatedAt);
  static Insertable<OfflineChurch> custom({
    Expression<String>? id,
    Expression<String>? name,
    Expression<String>? fullName,
    Expression<String>? location,
    Expression<String>? municipality,
    Expression<String>? diocese,
    Expression<int>? foundingYear,
    Expression<String>? foundersJson,
    Expression<String>? architecturalStyle,
    Expression<String>? history,
    Expression<String>? description,
    Expression<String>? heritageClassification,
    Expression<String>? assignedPriest,
    Expression<String>? massSchedulesJson,
    Expression<double>? latitude,
    Expression<double>? longitude,
    Expression<String>? contactInfoJson,
    Expression<String>? imagesJson,
    Expression<bool>? isPublicVisible,
    Expression<String>? status,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? lastSyncedAt,
    Expression<bool>? needsSync,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (name != null) 'name': name,
      if (fullName != null) 'full_name': fullName,
      if (location != null) 'location': location,
      if (municipality != null) 'municipality': municipality,
      if (diocese != null) 'diocese': diocese,
      if (foundingYear != null) 'founding_year': foundingYear,
      if (foundersJson != null) 'founders_json': foundersJson,
      if (architecturalStyle != null) 'architectural_style': architecturalStyle,
      if (history != null) 'history': history,
      if (description != null) 'description': description,
      if (heritageClassification != null)
        'heritage_classification': heritageClassification,
      if (assignedPriest != null) 'assigned_priest': assignedPriest,
      if (massSchedulesJson != null) 'mass_schedules_json': massSchedulesJson,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      if (contactInfoJson != null) 'contact_info_json': contactInfoJson,
      if (imagesJson != null) 'images_json': imagesJson,
      if (isPublicVisible != null) 'is_public_visible': isPublicVisible,
      if (status != null) 'status': status,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (lastSyncedAt != null) 'last_synced_at': lastSyncedAt,
      if (needsSync != null) 'needs_sync': needsSync,
      if (rowid != null) 'rowid': rowid,
    });
  }

  OfflineChurchesCompanion copyWith(
      {Value<String>? id,
      Value<String>? name,
      Value<String?>? fullName,
      Value<String>? location,
      Value<String>? municipality,
      Value<String>? diocese,
      Value<int?>? foundingYear,
      Value<String?>? foundersJson,
      Value<String?>? architecturalStyle,
      Value<String?>? history,
      Value<String?>? description,
      Value<String>? heritageClassification,
      Value<String?>? assignedPriest,
      Value<String?>? massSchedulesJson,
      Value<double?>? latitude,
      Value<double?>? longitude,
      Value<String?>? contactInfoJson,
      Value<String?>? imagesJson,
      Value<bool>? isPublicVisible,
      Value<String>? status,
      Value<DateTime>? createdAt,
      Value<DateTime>? updatedAt,
      Value<DateTime?>? lastSyncedAt,
      Value<bool>? needsSync,
      Value<int>? rowid}) {
    return OfflineChurchesCompanion(
      id: id ?? this.id,
      name: name ?? this.name,
      fullName: fullName ?? this.fullName,
      location: location ?? this.location,
      municipality: municipality ?? this.municipality,
      diocese: diocese ?? this.diocese,
      foundingYear: foundingYear ?? this.foundingYear,
      foundersJson: foundersJson ?? this.foundersJson,
      architecturalStyle: architecturalStyle ?? this.architecturalStyle,
      history: history ?? this.history,
      description: description ?? this.description,
      heritageClassification:
          heritageClassification ?? this.heritageClassification,
      assignedPriest: assignedPriest ?? this.assignedPriest,
      massSchedulesJson: massSchedulesJson ?? this.massSchedulesJson,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      contactInfoJson: contactInfoJson ?? this.contactInfoJson,
      imagesJson: imagesJson ?? this.imagesJson,
      isPublicVisible: isPublicVisible ?? this.isPublicVisible,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      needsSync: needsSync ?? this.needsSync,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (name.present) {
      map['name'] = Variable<String>(name.value);
    }
    if (fullName.present) {
      map['full_name'] = Variable<String>(fullName.value);
    }
    if (location.present) {
      map['location'] = Variable<String>(location.value);
    }
    if (municipality.present) {
      map['municipality'] = Variable<String>(municipality.value);
    }
    if (diocese.present) {
      map['diocese'] = Variable<String>(diocese.value);
    }
    if (foundingYear.present) {
      map['founding_year'] = Variable<int>(foundingYear.value);
    }
    if (foundersJson.present) {
      map['founders_json'] = Variable<String>(foundersJson.value);
    }
    if (architecturalStyle.present) {
      map['architectural_style'] = Variable<String>(architecturalStyle.value);
    }
    if (history.present) {
      map['history'] = Variable<String>(history.value);
    }
    if (description.present) {
      map['description'] = Variable<String>(description.value);
    }
    if (heritageClassification.present) {
      map['heritage_classification'] =
          Variable<String>(heritageClassification.value);
    }
    if (assignedPriest.present) {
      map['assigned_priest'] = Variable<String>(assignedPriest.value);
    }
    if (massSchedulesJson.present) {
      map['mass_schedules_json'] = Variable<String>(massSchedulesJson.value);
    }
    if (latitude.present) {
      map['latitude'] = Variable<double>(latitude.value);
    }
    if (longitude.present) {
      map['longitude'] = Variable<double>(longitude.value);
    }
    if (contactInfoJson.present) {
      map['contact_info_json'] = Variable<String>(contactInfoJson.value);
    }
    if (imagesJson.present) {
      map['images_json'] = Variable<String>(imagesJson.value);
    }
    if (isPublicVisible.present) {
      map['is_public_visible'] = Variable<bool>(isPublicVisible.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (lastSyncedAt.present) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt.value);
    }
    if (needsSync.present) {
      map['needs_sync'] = Variable<bool>(needsSync.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OfflineChurchesCompanion(')
          ..write('id: $id, ')
          ..write('name: $name, ')
          ..write('fullName: $fullName, ')
          ..write('location: $location, ')
          ..write('municipality: $municipality, ')
          ..write('diocese: $diocese, ')
          ..write('foundingYear: $foundingYear, ')
          ..write('foundersJson: $foundersJson, ')
          ..write('architecturalStyle: $architecturalStyle, ')
          ..write('history: $history, ')
          ..write('description: $description, ')
          ..write('heritageClassification: $heritageClassification, ')
          ..write('assignedPriest: $assignedPriest, ')
          ..write('massSchedulesJson: $massSchedulesJson, ')
          ..write('latitude: $latitude, ')
          ..write('longitude: $longitude, ')
          ..write('contactInfoJson: $contactInfoJson, ')
          ..write('imagesJson: $imagesJson, ')
          ..write('isPublicVisible: $isPublicVisible, ')
          ..write('status: $status, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('lastSyncedAt: $lastSyncedAt, ')
          ..write('needsSync: $needsSync, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $OfflineAnnouncementsTable extends OfflineAnnouncements
    with TableInfo<$OfflineAnnouncementsTable, OfflineAnnouncement> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflineAnnouncementsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _titleMeta = const VerificationMeta('title');
  @override
  late final GeneratedColumn<String> title = GeneratedColumn<String>(
      'title', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _contentMeta =
      const VerificationMeta('content');
  @override
  late final GeneratedColumn<String> content = GeneratedColumn<String>(
      'content', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _churchIdMeta =
      const VerificationMeta('churchId');
  @override
  late final GeneratedColumn<String> churchId = GeneratedColumn<String>(
      'church_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _dioceseMeta =
      const VerificationMeta('diocese');
  @override
  late final GeneratedColumn<String> diocese = GeneratedColumn<String>(
      'diocese', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _eventDateMeta =
      const VerificationMeta('eventDate');
  @override
  late final GeneratedColumn<DateTime> eventDate = GeneratedColumn<DateTime>(
      'event_date', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _venueMeta = const VerificationMeta('venue');
  @override
  late final GeneratedColumn<String> venue = GeneratedColumn<String>(
      'venue', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _imageUrlMeta =
      const VerificationMeta('imageUrl');
  @override
  late final GeneratedColumn<String> imageUrl = GeneratedColumn<String>(
      'image_url', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _priorityMeta =
      const VerificationMeta('priority');
  @override
  late final GeneratedColumn<String> priority = GeneratedColumn<String>(
      'priority', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('normal'));
  static const VerificationMeta _isActiveMeta =
      const VerificationMeta('isActive');
  @override
  late final GeneratedColumn<bool> isActive = GeneratedColumn<bool>(
      'is_active', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_active" IN (0, 1))'),
      defaultValue: const Constant(true));
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _lastSyncedAtMeta =
      const VerificationMeta('lastSyncedAt');
  @override
  late final GeneratedColumn<DateTime> lastSyncedAt = GeneratedColumn<DateTime>(
      'last_synced_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _needsSyncMeta =
      const VerificationMeta('needsSync');
  @override
  late final GeneratedColumn<bool> needsSync = GeneratedColumn<bool>(
      'needs_sync', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("needs_sync" IN (0, 1))'),
      defaultValue: const Constant(false));
  @override
  List<GeneratedColumn> get $columns => [
        id,
        title,
        content,
        churchId,
        diocese,
        eventDate,
        venue,
        imageUrl,
        priority,
        isActive,
        createdAt,
        updatedAt,
        lastSyncedAt,
        needsSync
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_announcements';
  @override
  VerificationContext validateIntegrity(
      Insertable<OfflineAnnouncement> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('title')) {
      context.handle(
          _titleMeta, title.isAcceptableOrUnknown(data['title']!, _titleMeta));
    } else if (isInserting) {
      context.missing(_titleMeta);
    }
    if (data.containsKey('content')) {
      context.handle(_contentMeta,
          content.isAcceptableOrUnknown(data['content']!, _contentMeta));
    } else if (isInserting) {
      context.missing(_contentMeta);
    }
    if (data.containsKey('church_id')) {
      context.handle(_churchIdMeta,
          churchId.isAcceptableOrUnknown(data['church_id']!, _churchIdMeta));
    }
    if (data.containsKey('diocese')) {
      context.handle(_dioceseMeta,
          diocese.isAcceptableOrUnknown(data['diocese']!, _dioceseMeta));
    } else if (isInserting) {
      context.missing(_dioceseMeta);
    }
    if (data.containsKey('event_date')) {
      context.handle(_eventDateMeta,
          eventDate.isAcceptableOrUnknown(data['event_date']!, _eventDateMeta));
    }
    if (data.containsKey('venue')) {
      context.handle(
          _venueMeta, venue.isAcceptableOrUnknown(data['venue']!, _venueMeta));
    }
    if (data.containsKey('image_url')) {
      context.handle(_imageUrlMeta,
          imageUrl.isAcceptableOrUnknown(data['image_url']!, _imageUrlMeta));
    }
    if (data.containsKey('priority')) {
      context.handle(_priorityMeta,
          priority.isAcceptableOrUnknown(data['priority']!, _priorityMeta));
    }
    if (data.containsKey('is_active')) {
      context.handle(_isActiveMeta,
          isActive.isAcceptableOrUnknown(data['is_active']!, _isActiveMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    if (data.containsKey('last_synced_at')) {
      context.handle(
          _lastSyncedAtMeta,
          lastSyncedAt.isAcceptableOrUnknown(
              data['last_synced_at']!, _lastSyncedAtMeta));
    }
    if (data.containsKey('needs_sync')) {
      context.handle(_needsSyncMeta,
          needsSync.isAcceptableOrUnknown(data['needs_sync']!, _needsSyncMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  OfflineAnnouncement map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflineAnnouncement(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      title: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}title'])!,
      content: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}content'])!,
      churchId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}church_id']),
      diocese: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}diocese'])!,
      eventDate: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}event_date']),
      venue: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}venue']),
      imageUrl: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}image_url']),
      priority: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}priority'])!,
      isActive: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_active'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at'])!,
      lastSyncedAt: attachedDatabase.typeMapping.read(
          DriftSqlType.dateTime, data['${effectivePrefix}last_synced_at']),
      needsSync: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}needs_sync'])!,
    );
  }

  @override
  $OfflineAnnouncementsTable createAlias(String alias) {
    return $OfflineAnnouncementsTable(attachedDatabase, alias);
  }
}

class OfflineAnnouncement extends DataClass
    implements Insertable<OfflineAnnouncement> {
  final String id;
  final String title;
  final String content;
  final String? churchId;
  final String diocese;
  final DateTime? eventDate;
  final String? venue;
  final String? imageUrl;
  final String priority;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? lastSyncedAt;
  final bool needsSync;
  const OfflineAnnouncement(
      {required this.id,
      required this.title,
      required this.content,
      this.churchId,
      required this.diocese,
      this.eventDate,
      this.venue,
      this.imageUrl,
      required this.priority,
      required this.isActive,
      required this.createdAt,
      required this.updatedAt,
      this.lastSyncedAt,
      required this.needsSync});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['title'] = Variable<String>(title);
    map['content'] = Variable<String>(content);
    if (!nullToAbsent || churchId != null) {
      map['church_id'] = Variable<String>(churchId);
    }
    map['diocese'] = Variable<String>(diocese);
    if (!nullToAbsent || eventDate != null) {
      map['event_date'] = Variable<DateTime>(eventDate);
    }
    if (!nullToAbsent || venue != null) {
      map['venue'] = Variable<String>(venue);
    }
    if (!nullToAbsent || imageUrl != null) {
      map['image_url'] = Variable<String>(imageUrl);
    }
    map['priority'] = Variable<String>(priority);
    map['is_active'] = Variable<bool>(isActive);
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    if (!nullToAbsent || lastSyncedAt != null) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt);
    }
    map['needs_sync'] = Variable<bool>(needsSync);
    return map;
  }

  OfflineAnnouncementsCompanion toCompanion(bool nullToAbsent) {
    return OfflineAnnouncementsCompanion(
      id: Value(id),
      title: Value(title),
      content: Value(content),
      churchId: churchId == null && nullToAbsent
          ? const Value.absent()
          : Value(churchId),
      diocese: Value(diocese),
      eventDate: eventDate == null && nullToAbsent
          ? const Value.absent()
          : Value(eventDate),
      venue:
          venue == null && nullToAbsent ? const Value.absent() : Value(venue),
      imageUrl: imageUrl == null && nullToAbsent
          ? const Value.absent()
          : Value(imageUrl),
      priority: Value(priority),
      isActive: Value(isActive),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
      lastSyncedAt: lastSyncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncedAt),
      needsSync: Value(needsSync),
    );
  }

  factory OfflineAnnouncement.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflineAnnouncement(
      id: serializer.fromJson<String>(json['id']),
      title: serializer.fromJson<String>(json['title']),
      content: serializer.fromJson<String>(json['content']),
      churchId: serializer.fromJson<String?>(json['churchId']),
      diocese: serializer.fromJson<String>(json['diocese']),
      eventDate: serializer.fromJson<DateTime?>(json['eventDate']),
      venue: serializer.fromJson<String?>(json['venue']),
      imageUrl: serializer.fromJson<String?>(json['imageUrl']),
      priority: serializer.fromJson<String>(json['priority']),
      isActive: serializer.fromJson<bool>(json['isActive']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
      lastSyncedAt: serializer.fromJson<DateTime?>(json['lastSyncedAt']),
      needsSync: serializer.fromJson<bool>(json['needsSync']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'title': serializer.toJson<String>(title),
      'content': serializer.toJson<String>(content),
      'churchId': serializer.toJson<String?>(churchId),
      'diocese': serializer.toJson<String>(diocese),
      'eventDate': serializer.toJson<DateTime?>(eventDate),
      'venue': serializer.toJson<String?>(venue),
      'imageUrl': serializer.toJson<String?>(imageUrl),
      'priority': serializer.toJson<String>(priority),
      'isActive': serializer.toJson<bool>(isActive),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
      'lastSyncedAt': serializer.toJson<DateTime?>(lastSyncedAt),
      'needsSync': serializer.toJson<bool>(needsSync),
    };
  }

  OfflineAnnouncement copyWith(
          {String? id,
          String? title,
          String? content,
          Value<String?> churchId = const Value.absent(),
          String? diocese,
          Value<DateTime?> eventDate = const Value.absent(),
          Value<String?> venue = const Value.absent(),
          Value<String?> imageUrl = const Value.absent(),
          String? priority,
          bool? isActive,
          DateTime? createdAt,
          DateTime? updatedAt,
          Value<DateTime?> lastSyncedAt = const Value.absent(),
          bool? needsSync}) =>
      OfflineAnnouncement(
        id: id ?? this.id,
        title: title ?? this.title,
        content: content ?? this.content,
        churchId: churchId.present ? churchId.value : this.churchId,
        diocese: diocese ?? this.diocese,
        eventDate: eventDate.present ? eventDate.value : this.eventDate,
        venue: venue.present ? venue.value : this.venue,
        imageUrl: imageUrl.present ? imageUrl.value : this.imageUrl,
        priority: priority ?? this.priority,
        isActive: isActive ?? this.isActive,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        lastSyncedAt:
            lastSyncedAt.present ? lastSyncedAt.value : this.lastSyncedAt,
        needsSync: needsSync ?? this.needsSync,
      );
  OfflineAnnouncement copyWithCompanion(OfflineAnnouncementsCompanion data) {
    return OfflineAnnouncement(
      id: data.id.present ? data.id.value : this.id,
      title: data.title.present ? data.title.value : this.title,
      content: data.content.present ? data.content.value : this.content,
      churchId: data.churchId.present ? data.churchId.value : this.churchId,
      diocese: data.diocese.present ? data.diocese.value : this.diocese,
      eventDate: data.eventDate.present ? data.eventDate.value : this.eventDate,
      venue: data.venue.present ? data.venue.value : this.venue,
      imageUrl: data.imageUrl.present ? data.imageUrl.value : this.imageUrl,
      priority: data.priority.present ? data.priority.value : this.priority,
      isActive: data.isActive.present ? data.isActive.value : this.isActive,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      lastSyncedAt: data.lastSyncedAt.present
          ? data.lastSyncedAt.value
          : this.lastSyncedAt,
      needsSync: data.needsSync.present ? data.needsSync.value : this.needsSync,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflineAnnouncement(')
          ..write('id: $id, ')
          ..write('title: $title, ')
          ..write('content: $content, ')
          ..write('churchId: $churchId, ')
          ..write('diocese: $diocese, ')
          ..write('eventDate: $eventDate, ')
          ..write('venue: $venue, ')
          ..write('imageUrl: $imageUrl, ')
          ..write('priority: $priority, ')
          ..write('isActive: $isActive, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('lastSyncedAt: $lastSyncedAt, ')
          ..write('needsSync: $needsSync')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      title,
      content,
      churchId,
      diocese,
      eventDate,
      venue,
      imageUrl,
      priority,
      isActive,
      createdAt,
      updatedAt,
      lastSyncedAt,
      needsSync);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflineAnnouncement &&
          other.id == this.id &&
          other.title == this.title &&
          other.content == this.content &&
          other.churchId == this.churchId &&
          other.diocese == this.diocese &&
          other.eventDate == this.eventDate &&
          other.venue == this.venue &&
          other.imageUrl == this.imageUrl &&
          other.priority == this.priority &&
          other.isActive == this.isActive &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.lastSyncedAt == this.lastSyncedAt &&
          other.needsSync == this.needsSync);
}

class OfflineAnnouncementsCompanion
    extends UpdateCompanion<OfflineAnnouncement> {
  final Value<String> id;
  final Value<String> title;
  final Value<String> content;
  final Value<String?> churchId;
  final Value<String> diocese;
  final Value<DateTime?> eventDate;
  final Value<String?> venue;
  final Value<String?> imageUrl;
  final Value<String> priority;
  final Value<bool> isActive;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  final Value<DateTime?> lastSyncedAt;
  final Value<bool> needsSync;
  final Value<int> rowid;
  const OfflineAnnouncementsCompanion({
    this.id = const Value.absent(),
    this.title = const Value.absent(),
    this.content = const Value.absent(),
    this.churchId = const Value.absent(),
    this.diocese = const Value.absent(),
    this.eventDate = const Value.absent(),
    this.venue = const Value.absent(),
    this.imageUrl = const Value.absent(),
    this.priority = const Value.absent(),
    this.isActive = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
    this.needsSync = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  OfflineAnnouncementsCompanion.insert({
    required String id,
    required String title,
    required String content,
    this.churchId = const Value.absent(),
    required String diocese,
    this.eventDate = const Value.absent(),
    this.venue = const Value.absent(),
    this.imageUrl = const Value.absent(),
    this.priority = const Value.absent(),
    this.isActive = const Value.absent(),
    required DateTime createdAt,
    required DateTime updatedAt,
    this.lastSyncedAt = const Value.absent(),
    this.needsSync = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        title = Value(title),
        content = Value(content),
        diocese = Value(diocese),
        createdAt = Value(createdAt),
        updatedAt = Value(updatedAt);
  static Insertable<OfflineAnnouncement> custom({
    Expression<String>? id,
    Expression<String>? title,
    Expression<String>? content,
    Expression<String>? churchId,
    Expression<String>? diocese,
    Expression<DateTime>? eventDate,
    Expression<String>? venue,
    Expression<String>? imageUrl,
    Expression<String>? priority,
    Expression<bool>? isActive,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? lastSyncedAt,
    Expression<bool>? needsSync,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (title != null) 'title': title,
      if (content != null) 'content': content,
      if (churchId != null) 'church_id': churchId,
      if (diocese != null) 'diocese': diocese,
      if (eventDate != null) 'event_date': eventDate,
      if (venue != null) 'venue': venue,
      if (imageUrl != null) 'image_url': imageUrl,
      if (priority != null) 'priority': priority,
      if (isActive != null) 'is_active': isActive,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (lastSyncedAt != null) 'last_synced_at': lastSyncedAt,
      if (needsSync != null) 'needs_sync': needsSync,
      if (rowid != null) 'rowid': rowid,
    });
  }

  OfflineAnnouncementsCompanion copyWith(
      {Value<String>? id,
      Value<String>? title,
      Value<String>? content,
      Value<String?>? churchId,
      Value<String>? diocese,
      Value<DateTime?>? eventDate,
      Value<String?>? venue,
      Value<String?>? imageUrl,
      Value<String>? priority,
      Value<bool>? isActive,
      Value<DateTime>? createdAt,
      Value<DateTime>? updatedAt,
      Value<DateTime?>? lastSyncedAt,
      Value<bool>? needsSync,
      Value<int>? rowid}) {
    return OfflineAnnouncementsCompanion(
      id: id ?? this.id,
      title: title ?? this.title,
      content: content ?? this.content,
      churchId: churchId ?? this.churchId,
      diocese: diocese ?? this.diocese,
      eventDate: eventDate ?? this.eventDate,
      venue: venue ?? this.venue,
      imageUrl: imageUrl ?? this.imageUrl,
      priority: priority ?? this.priority,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      needsSync: needsSync ?? this.needsSync,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (title.present) {
      map['title'] = Variable<String>(title.value);
    }
    if (content.present) {
      map['content'] = Variable<String>(content.value);
    }
    if (churchId.present) {
      map['church_id'] = Variable<String>(churchId.value);
    }
    if (diocese.present) {
      map['diocese'] = Variable<String>(diocese.value);
    }
    if (eventDate.present) {
      map['event_date'] = Variable<DateTime>(eventDate.value);
    }
    if (venue.present) {
      map['venue'] = Variable<String>(venue.value);
    }
    if (imageUrl.present) {
      map['image_url'] = Variable<String>(imageUrl.value);
    }
    if (priority.present) {
      map['priority'] = Variable<String>(priority.value);
    }
    if (isActive.present) {
      map['is_active'] = Variable<bool>(isActive.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (lastSyncedAt.present) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt.value);
    }
    if (needsSync.present) {
      map['needs_sync'] = Variable<bool>(needsSync.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OfflineAnnouncementsCompanion(')
          ..write('id: $id, ')
          ..write('title: $title, ')
          ..write('content: $content, ')
          ..write('churchId: $churchId, ')
          ..write('diocese: $diocese, ')
          ..write('eventDate: $eventDate, ')
          ..write('venue: $venue, ')
          ..write('imageUrl: $imageUrl, ')
          ..write('priority: $priority, ')
          ..write('isActive: $isActive, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('lastSyncedAt: $lastSyncedAt, ')
          ..write('needsSync: $needsSync, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $OfflineUserProfilesTable extends OfflineUserProfiles
    with TableInfo<$OfflineUserProfilesTable, OfflineUserData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflineUserProfilesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _emailMeta = const VerificationMeta('email');
  @override
  late final GeneratedColumn<String> email = GeneratedColumn<String>(
      'email', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _displayNameMeta =
      const VerificationMeta('displayName');
  @override
  late final GeneratedColumn<String> displayName = GeneratedColumn<String>(
      'display_name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _phoneNumberMeta =
      const VerificationMeta('phoneNumber');
  @override
  late final GeneratedColumn<String> phoneNumber = GeneratedColumn<String>(
      'phone_number', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _locationMeta =
      const VerificationMeta('location');
  @override
  late final GeneratedColumn<String> location = GeneratedColumn<String>(
      'location', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _bioMeta = const VerificationMeta('bio');
  @override
  late final GeneratedColumn<String> bio = GeneratedColumn<String>(
      'bio', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _accountTypeMeta =
      const VerificationMeta('accountType');
  @override
  late final GeneratedColumn<String> accountType = GeneratedColumn<String>(
      'account_type', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('public'));
  static const VerificationMeta _visitedChurchesJsonMeta =
      const VerificationMeta('visitedChurchesJson');
  @override
  late final GeneratedColumn<String> visitedChurchesJson =
      GeneratedColumn<String>('visited_churches_json', aliasedName, false,
          type: DriftSqlType.string,
          requiredDuringInsert: false,
          defaultValue: const Constant('[]'));
  static const VerificationMeta _favoriteChurchesJsonMeta =
      const VerificationMeta('favoriteChurchesJson');
  @override
  late final GeneratedColumn<String> favoriteChurchesJson =
      GeneratedColumn<String>('favorite_churches_json', aliasedName, false,
          type: DriftSqlType.string,
          requiredDuringInsert: false,
          defaultValue: const Constant('[]'));
  static const VerificationMeta _forVisitChurchesJsonMeta =
      const VerificationMeta('forVisitChurchesJson');
  @override
  late final GeneratedColumn<String> forVisitChurchesJson =
      GeneratedColumn<String>('for_visit_churches_json', aliasedName, false,
          type: DriftSqlType.string,
          requiredDuringInsert: false,
          defaultValue: const Constant('[]'));
  static const VerificationMeta _journalEntriesJsonMeta =
      const VerificationMeta('journalEntriesJson');
  @override
  late final GeneratedColumn<String> journalEntriesJson =
      GeneratedColumn<String>('journal_entries_json', aliasedName, false,
          type: DriftSqlType.string,
          requiredDuringInsert: false,
          defaultValue: const Constant('[]'));
  static const VerificationMeta _createdAtMeta =
      const VerificationMeta('createdAt');
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
      'created_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _updatedAtMeta =
      const VerificationMeta('updatedAt');
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
      'updated_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _lastSyncedAtMeta =
      const VerificationMeta('lastSyncedAt');
  @override
  late final GeneratedColumn<DateTime> lastSyncedAt = GeneratedColumn<DateTime>(
      'last_synced_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _needsSyncMeta =
      const VerificationMeta('needsSync');
  @override
  late final GeneratedColumn<bool> needsSync = GeneratedColumn<bool>(
      'needs_sync', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("needs_sync" IN (0, 1))'),
      defaultValue: const Constant(false));
  @override
  List<GeneratedColumn> get $columns => [
        id,
        email,
        displayName,
        phoneNumber,
        location,
        bio,
        accountType,
        visitedChurchesJson,
        favoriteChurchesJson,
        forVisitChurchesJson,
        journalEntriesJson,
        createdAt,
        updatedAt,
        lastSyncedAt,
        needsSync
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_user_profiles';
  @override
  VerificationContext validateIntegrity(Insertable<OfflineUserData> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('email')) {
      context.handle(
          _emailMeta, email.isAcceptableOrUnknown(data['email']!, _emailMeta));
    } else if (isInserting) {
      context.missing(_emailMeta);
    }
    if (data.containsKey('display_name')) {
      context.handle(
          _displayNameMeta,
          displayName.isAcceptableOrUnknown(
              data['display_name']!, _displayNameMeta));
    } else if (isInserting) {
      context.missing(_displayNameMeta);
    }
    if (data.containsKey('phone_number')) {
      context.handle(
          _phoneNumberMeta,
          phoneNumber.isAcceptableOrUnknown(
              data['phone_number']!, _phoneNumberMeta));
    }
    if (data.containsKey('location')) {
      context.handle(_locationMeta,
          location.isAcceptableOrUnknown(data['location']!, _locationMeta));
    }
    if (data.containsKey('bio')) {
      context.handle(
          _bioMeta, bio.isAcceptableOrUnknown(data['bio']!, _bioMeta));
    }
    if (data.containsKey('account_type')) {
      context.handle(
          _accountTypeMeta,
          accountType.isAcceptableOrUnknown(
              data['account_type']!, _accountTypeMeta));
    }
    if (data.containsKey('visited_churches_json')) {
      context.handle(
          _visitedChurchesJsonMeta,
          visitedChurchesJson.isAcceptableOrUnknown(
              data['visited_churches_json']!, _visitedChurchesJsonMeta));
    }
    if (data.containsKey('favorite_churches_json')) {
      context.handle(
          _favoriteChurchesJsonMeta,
          favoriteChurchesJson.isAcceptableOrUnknown(
              data['favorite_churches_json']!, _favoriteChurchesJsonMeta));
    }
    if (data.containsKey('for_visit_churches_json')) {
      context.handle(
          _forVisitChurchesJsonMeta,
          forVisitChurchesJson.isAcceptableOrUnknown(
              data['for_visit_churches_json']!, _forVisitChurchesJsonMeta));
    }
    if (data.containsKey('journal_entries_json')) {
      context.handle(
          _journalEntriesJsonMeta,
          journalEntriesJson.isAcceptableOrUnknown(
              data['journal_entries_json']!, _journalEntriesJsonMeta));
    }
    if (data.containsKey('created_at')) {
      context.handle(_createdAtMeta,
          createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta));
    } else if (isInserting) {
      context.missing(_createdAtMeta);
    }
    if (data.containsKey('updated_at')) {
      context.handle(_updatedAtMeta,
          updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta));
    } else if (isInserting) {
      context.missing(_updatedAtMeta);
    }
    if (data.containsKey('last_synced_at')) {
      context.handle(
          _lastSyncedAtMeta,
          lastSyncedAt.isAcceptableOrUnknown(
              data['last_synced_at']!, _lastSyncedAtMeta));
    }
    if (data.containsKey('needs_sync')) {
      context.handle(_needsSyncMeta,
          needsSync.isAcceptableOrUnknown(data['needs_sync']!, _needsSyncMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  OfflineUserData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflineUserData(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      email: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}email'])!,
      displayName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}display_name'])!,
      phoneNumber: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}phone_number']),
      location: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}location']),
      bio: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}bio']),
      accountType: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}account_type'])!,
      visitedChurchesJson: attachedDatabase.typeMapping.read(
          DriftSqlType.string,
          data['${effectivePrefix}visited_churches_json'])!,
      favoriteChurchesJson: attachedDatabase.typeMapping.read(
          DriftSqlType.string,
          data['${effectivePrefix}favorite_churches_json'])!,
      forVisitChurchesJson: attachedDatabase.typeMapping.read(
          DriftSqlType.string,
          data['${effectivePrefix}for_visit_churches_json'])!,
      journalEntriesJson: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}journal_entries_json'])!,
      createdAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}created_at'])!,
      updatedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}updated_at'])!,
      lastSyncedAt: attachedDatabase.typeMapping.read(
          DriftSqlType.dateTime, data['${effectivePrefix}last_synced_at']),
      needsSync: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}needs_sync'])!,
    );
  }

  @override
  $OfflineUserProfilesTable createAlias(String alias) {
    return $OfflineUserProfilesTable(attachedDatabase, alias);
  }
}

class OfflineUserData extends DataClass implements Insertable<OfflineUserData> {
  final String id;
  final String email;
  final String displayName;
  final String? phoneNumber;
  final String? location;
  final String? bio;
  final String accountType;
  final String visitedChurchesJson;
  final String favoriteChurchesJson;
  final String forVisitChurchesJson;
  final String journalEntriesJson;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? lastSyncedAt;
  final bool needsSync;
  const OfflineUserData(
      {required this.id,
      required this.email,
      required this.displayName,
      this.phoneNumber,
      this.location,
      this.bio,
      required this.accountType,
      required this.visitedChurchesJson,
      required this.favoriteChurchesJson,
      required this.forVisitChurchesJson,
      required this.journalEntriesJson,
      required this.createdAt,
      required this.updatedAt,
      this.lastSyncedAt,
      required this.needsSync});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['email'] = Variable<String>(email);
    map['display_name'] = Variable<String>(displayName);
    if (!nullToAbsent || phoneNumber != null) {
      map['phone_number'] = Variable<String>(phoneNumber);
    }
    if (!nullToAbsent || location != null) {
      map['location'] = Variable<String>(location);
    }
    if (!nullToAbsent || bio != null) {
      map['bio'] = Variable<String>(bio);
    }
    map['account_type'] = Variable<String>(accountType);
    map['visited_churches_json'] = Variable<String>(visitedChurchesJson);
    map['favorite_churches_json'] = Variable<String>(favoriteChurchesJson);
    map['for_visit_churches_json'] = Variable<String>(forVisitChurchesJson);
    map['journal_entries_json'] = Variable<String>(journalEntriesJson);
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    if (!nullToAbsent || lastSyncedAt != null) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt);
    }
    map['needs_sync'] = Variable<bool>(needsSync);
    return map;
  }

  OfflineUserProfilesCompanion toCompanion(bool nullToAbsent) {
    return OfflineUserProfilesCompanion(
      id: Value(id),
      email: Value(email),
      displayName: Value(displayName),
      phoneNumber: phoneNumber == null && nullToAbsent
          ? const Value.absent()
          : Value(phoneNumber),
      location: location == null && nullToAbsent
          ? const Value.absent()
          : Value(location),
      bio: bio == null && nullToAbsent ? const Value.absent() : Value(bio),
      accountType: Value(accountType),
      visitedChurchesJson: Value(visitedChurchesJson),
      favoriteChurchesJson: Value(favoriteChurchesJson),
      forVisitChurchesJson: Value(forVisitChurchesJson),
      journalEntriesJson: Value(journalEntriesJson),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
      lastSyncedAt: lastSyncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncedAt),
      needsSync: Value(needsSync),
    );
  }

  factory OfflineUserData.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflineUserData(
      id: serializer.fromJson<String>(json['id']),
      email: serializer.fromJson<String>(json['email']),
      displayName: serializer.fromJson<String>(json['displayName']),
      phoneNumber: serializer.fromJson<String?>(json['phoneNumber']),
      location: serializer.fromJson<String?>(json['location']),
      bio: serializer.fromJson<String?>(json['bio']),
      accountType: serializer.fromJson<String>(json['accountType']),
      visitedChurchesJson:
          serializer.fromJson<String>(json['visitedChurchesJson']),
      favoriteChurchesJson:
          serializer.fromJson<String>(json['favoriteChurchesJson']),
      forVisitChurchesJson:
          serializer.fromJson<String>(json['forVisitChurchesJson']),
      journalEntriesJson:
          serializer.fromJson<String>(json['journalEntriesJson']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
      lastSyncedAt: serializer.fromJson<DateTime?>(json['lastSyncedAt']),
      needsSync: serializer.fromJson<bool>(json['needsSync']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'email': serializer.toJson<String>(email),
      'displayName': serializer.toJson<String>(displayName),
      'phoneNumber': serializer.toJson<String?>(phoneNumber),
      'location': serializer.toJson<String?>(location),
      'bio': serializer.toJson<String?>(bio),
      'accountType': serializer.toJson<String>(accountType),
      'visitedChurchesJson': serializer.toJson<String>(visitedChurchesJson),
      'favoriteChurchesJson': serializer.toJson<String>(favoriteChurchesJson),
      'forVisitChurchesJson': serializer.toJson<String>(forVisitChurchesJson),
      'journalEntriesJson': serializer.toJson<String>(journalEntriesJson),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
      'lastSyncedAt': serializer.toJson<DateTime?>(lastSyncedAt),
      'needsSync': serializer.toJson<bool>(needsSync),
    };
  }

  OfflineUserData copyWith(
          {String? id,
          String? email,
          String? displayName,
          Value<String?> phoneNumber = const Value.absent(),
          Value<String?> location = const Value.absent(),
          Value<String?> bio = const Value.absent(),
          String? accountType,
          String? visitedChurchesJson,
          String? favoriteChurchesJson,
          String? forVisitChurchesJson,
          String? journalEntriesJson,
          DateTime? createdAt,
          DateTime? updatedAt,
          Value<DateTime?> lastSyncedAt = const Value.absent(),
          bool? needsSync}) =>
      OfflineUserData(
        id: id ?? this.id,
        email: email ?? this.email,
        displayName: displayName ?? this.displayName,
        phoneNumber: phoneNumber.present ? phoneNumber.value : this.phoneNumber,
        location: location.present ? location.value : this.location,
        bio: bio.present ? bio.value : this.bio,
        accountType: accountType ?? this.accountType,
        visitedChurchesJson: visitedChurchesJson ?? this.visitedChurchesJson,
        favoriteChurchesJson: favoriteChurchesJson ?? this.favoriteChurchesJson,
        forVisitChurchesJson: forVisitChurchesJson ?? this.forVisitChurchesJson,
        journalEntriesJson: journalEntriesJson ?? this.journalEntriesJson,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        lastSyncedAt:
            lastSyncedAt.present ? lastSyncedAt.value : this.lastSyncedAt,
        needsSync: needsSync ?? this.needsSync,
      );
  OfflineUserData copyWithCompanion(OfflineUserProfilesCompanion data) {
    return OfflineUserData(
      id: data.id.present ? data.id.value : this.id,
      email: data.email.present ? data.email.value : this.email,
      displayName:
          data.displayName.present ? data.displayName.value : this.displayName,
      phoneNumber:
          data.phoneNumber.present ? data.phoneNumber.value : this.phoneNumber,
      location: data.location.present ? data.location.value : this.location,
      bio: data.bio.present ? data.bio.value : this.bio,
      accountType:
          data.accountType.present ? data.accountType.value : this.accountType,
      visitedChurchesJson: data.visitedChurchesJson.present
          ? data.visitedChurchesJson.value
          : this.visitedChurchesJson,
      favoriteChurchesJson: data.favoriteChurchesJson.present
          ? data.favoriteChurchesJson.value
          : this.favoriteChurchesJson,
      forVisitChurchesJson: data.forVisitChurchesJson.present
          ? data.forVisitChurchesJson.value
          : this.forVisitChurchesJson,
      journalEntriesJson: data.journalEntriesJson.present
          ? data.journalEntriesJson.value
          : this.journalEntriesJson,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
      lastSyncedAt: data.lastSyncedAt.present
          ? data.lastSyncedAt.value
          : this.lastSyncedAt,
      needsSync: data.needsSync.present ? data.needsSync.value : this.needsSync,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflineUserData(')
          ..write('id: $id, ')
          ..write('email: $email, ')
          ..write('displayName: $displayName, ')
          ..write('phoneNumber: $phoneNumber, ')
          ..write('location: $location, ')
          ..write('bio: $bio, ')
          ..write('accountType: $accountType, ')
          ..write('visitedChurchesJson: $visitedChurchesJson, ')
          ..write('favoriteChurchesJson: $favoriteChurchesJson, ')
          ..write('forVisitChurchesJson: $forVisitChurchesJson, ')
          ..write('journalEntriesJson: $journalEntriesJson, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('lastSyncedAt: $lastSyncedAt, ')
          ..write('needsSync: $needsSync')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      email,
      displayName,
      phoneNumber,
      location,
      bio,
      accountType,
      visitedChurchesJson,
      favoriteChurchesJson,
      forVisitChurchesJson,
      journalEntriesJson,
      createdAt,
      updatedAt,
      lastSyncedAt,
      needsSync);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflineUserData &&
          other.id == this.id &&
          other.email == this.email &&
          other.displayName == this.displayName &&
          other.phoneNumber == this.phoneNumber &&
          other.location == this.location &&
          other.bio == this.bio &&
          other.accountType == this.accountType &&
          other.visitedChurchesJson == this.visitedChurchesJson &&
          other.favoriteChurchesJson == this.favoriteChurchesJson &&
          other.forVisitChurchesJson == this.forVisitChurchesJson &&
          other.journalEntriesJson == this.journalEntriesJson &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt &&
          other.lastSyncedAt == this.lastSyncedAt &&
          other.needsSync == this.needsSync);
}

class OfflineUserProfilesCompanion extends UpdateCompanion<OfflineUserData> {
  final Value<String> id;
  final Value<String> email;
  final Value<String> displayName;
  final Value<String?> phoneNumber;
  final Value<String?> location;
  final Value<String?> bio;
  final Value<String> accountType;
  final Value<String> visitedChurchesJson;
  final Value<String> favoriteChurchesJson;
  final Value<String> forVisitChurchesJson;
  final Value<String> journalEntriesJson;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  final Value<DateTime?> lastSyncedAt;
  final Value<bool> needsSync;
  final Value<int> rowid;
  const OfflineUserProfilesCompanion({
    this.id = const Value.absent(),
    this.email = const Value.absent(),
    this.displayName = const Value.absent(),
    this.phoneNumber = const Value.absent(),
    this.location = const Value.absent(),
    this.bio = const Value.absent(),
    this.accountType = const Value.absent(),
    this.visitedChurchesJson = const Value.absent(),
    this.favoriteChurchesJson = const Value.absent(),
    this.forVisitChurchesJson = const Value.absent(),
    this.journalEntriesJson = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
    this.needsSync = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  OfflineUserProfilesCompanion.insert({
    required String id,
    required String email,
    required String displayName,
    this.phoneNumber = const Value.absent(),
    this.location = const Value.absent(),
    this.bio = const Value.absent(),
    this.accountType = const Value.absent(),
    this.visitedChurchesJson = const Value.absent(),
    this.favoriteChurchesJson = const Value.absent(),
    this.forVisitChurchesJson = const Value.absent(),
    this.journalEntriesJson = const Value.absent(),
    required DateTime createdAt,
    required DateTime updatedAt,
    this.lastSyncedAt = const Value.absent(),
    this.needsSync = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        email = Value(email),
        displayName = Value(displayName),
        createdAt = Value(createdAt),
        updatedAt = Value(updatedAt);
  static Insertable<OfflineUserData> custom({
    Expression<String>? id,
    Expression<String>? email,
    Expression<String>? displayName,
    Expression<String>? phoneNumber,
    Expression<String>? location,
    Expression<String>? bio,
    Expression<String>? accountType,
    Expression<String>? visitedChurchesJson,
    Expression<String>? favoriteChurchesJson,
    Expression<String>? forVisitChurchesJson,
    Expression<String>? journalEntriesJson,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
    Expression<DateTime>? lastSyncedAt,
    Expression<bool>? needsSync,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (email != null) 'email': email,
      if (displayName != null) 'display_name': displayName,
      if (phoneNumber != null) 'phone_number': phoneNumber,
      if (location != null) 'location': location,
      if (bio != null) 'bio': bio,
      if (accountType != null) 'account_type': accountType,
      if (visitedChurchesJson != null)
        'visited_churches_json': visitedChurchesJson,
      if (favoriteChurchesJson != null)
        'favorite_churches_json': favoriteChurchesJson,
      if (forVisitChurchesJson != null)
        'for_visit_churches_json': forVisitChurchesJson,
      if (journalEntriesJson != null)
        'journal_entries_json': journalEntriesJson,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
      if (lastSyncedAt != null) 'last_synced_at': lastSyncedAt,
      if (needsSync != null) 'needs_sync': needsSync,
      if (rowid != null) 'rowid': rowid,
    });
  }

  OfflineUserProfilesCompanion copyWith(
      {Value<String>? id,
      Value<String>? email,
      Value<String>? displayName,
      Value<String?>? phoneNumber,
      Value<String?>? location,
      Value<String?>? bio,
      Value<String>? accountType,
      Value<String>? visitedChurchesJson,
      Value<String>? favoriteChurchesJson,
      Value<String>? forVisitChurchesJson,
      Value<String>? journalEntriesJson,
      Value<DateTime>? createdAt,
      Value<DateTime>? updatedAt,
      Value<DateTime?>? lastSyncedAt,
      Value<bool>? needsSync,
      Value<int>? rowid}) {
    return OfflineUserProfilesCompanion(
      id: id ?? this.id,
      email: email ?? this.email,
      displayName: displayName ?? this.displayName,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      location: location ?? this.location,
      bio: bio ?? this.bio,
      accountType: accountType ?? this.accountType,
      visitedChurchesJson: visitedChurchesJson ?? this.visitedChurchesJson,
      favoriteChurchesJson: favoriteChurchesJson ?? this.favoriteChurchesJson,
      forVisitChurchesJson: forVisitChurchesJson ?? this.forVisitChurchesJson,
      journalEntriesJson: journalEntriesJson ?? this.journalEntriesJson,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      needsSync: needsSync ?? this.needsSync,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (email.present) {
      map['email'] = Variable<String>(email.value);
    }
    if (displayName.present) {
      map['display_name'] = Variable<String>(displayName.value);
    }
    if (phoneNumber.present) {
      map['phone_number'] = Variable<String>(phoneNumber.value);
    }
    if (location.present) {
      map['location'] = Variable<String>(location.value);
    }
    if (bio.present) {
      map['bio'] = Variable<String>(bio.value);
    }
    if (accountType.present) {
      map['account_type'] = Variable<String>(accountType.value);
    }
    if (visitedChurchesJson.present) {
      map['visited_churches_json'] =
          Variable<String>(visitedChurchesJson.value);
    }
    if (favoriteChurchesJson.present) {
      map['favorite_churches_json'] =
          Variable<String>(favoriteChurchesJson.value);
    }
    if (forVisitChurchesJson.present) {
      map['for_visit_churches_json'] =
          Variable<String>(forVisitChurchesJson.value);
    }
    if (journalEntriesJson.present) {
      map['journal_entries_json'] = Variable<String>(journalEntriesJson.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    if (lastSyncedAt.present) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt.value);
    }
    if (needsSync.present) {
      map['needs_sync'] = Variable<bool>(needsSync.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OfflineUserProfilesCompanion(')
          ..write('id: $id, ')
          ..write('email: $email, ')
          ..write('displayName: $displayName, ')
          ..write('phoneNumber: $phoneNumber, ')
          ..write('location: $location, ')
          ..write('bio: $bio, ')
          ..write('accountType: $accountType, ')
          ..write('visitedChurchesJson: $visitedChurchesJson, ')
          ..write('favoriteChurchesJson: $favoriteChurchesJson, ')
          ..write('forVisitChurchesJson: $forVisitChurchesJson, ')
          ..write('journalEntriesJson: $journalEntriesJson, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt, ')
          ..write('lastSyncedAt: $lastSyncedAt, ')
          ..write('needsSync: $needsSync, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

class $OfflineSyncLogsTable extends OfflineSyncLogs
    with TableInfo<$OfflineSyncLogsTable, OfflineSyncLog> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflineSyncLogsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _entityTypeMeta =
      const VerificationMeta('entityType');
  @override
  late final GeneratedColumn<String> entityType = GeneratedColumn<String>(
      'entity_type', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _entityIdMeta =
      const VerificationMeta('entityId');
  @override
  late final GeneratedColumn<String> entityId = GeneratedColumn<String>(
      'entity_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _operationMeta =
      const VerificationMeta('operation');
  @override
  late final GeneratedColumn<String> operation = GeneratedColumn<String>(
      'operation', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _dataJsonMeta =
      const VerificationMeta('dataJson');
  @override
  late final GeneratedColumn<String> dataJson = GeneratedColumn<String>(
      'data_json', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _timestampMeta =
      const VerificationMeta('timestamp');
  @override
  late final GeneratedColumn<DateTime> timestamp = GeneratedColumn<DateTime>(
      'timestamp', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _syncedMeta = const VerificationMeta('synced');
  @override
  late final GeneratedColumn<bool> synced = GeneratedColumn<bool>(
      'synced', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("synced" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _errorMeta = const VerificationMeta('error');
  @override
  late final GeneratedColumn<String> error = GeneratedColumn<String>(
      'error', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _retryCountMeta =
      const VerificationMeta('retryCount');
  @override
  late final GeneratedColumn<int> retryCount = GeneratedColumn<int>(
      'retry_count', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  @override
  List<GeneratedColumn> get $columns => [
        id,
        entityType,
        entityId,
        operation,
        dataJson,
        timestamp,
        synced,
        error,
        retryCount
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_sync_logs';
  @override
  VerificationContext validateIntegrity(Insertable<OfflineSyncLog> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('entity_type')) {
      context.handle(
          _entityTypeMeta,
          entityType.isAcceptableOrUnknown(
              data['entity_type']!, _entityTypeMeta));
    } else if (isInserting) {
      context.missing(_entityTypeMeta);
    }
    if (data.containsKey('entity_id')) {
      context.handle(_entityIdMeta,
          entityId.isAcceptableOrUnknown(data['entity_id']!, _entityIdMeta));
    } else if (isInserting) {
      context.missing(_entityIdMeta);
    }
    if (data.containsKey('operation')) {
      context.handle(_operationMeta,
          operation.isAcceptableOrUnknown(data['operation']!, _operationMeta));
    } else if (isInserting) {
      context.missing(_operationMeta);
    }
    if (data.containsKey('data_json')) {
      context.handle(_dataJsonMeta,
          dataJson.isAcceptableOrUnknown(data['data_json']!, _dataJsonMeta));
    }
    if (data.containsKey('timestamp')) {
      context.handle(_timestampMeta,
          timestamp.isAcceptableOrUnknown(data['timestamp']!, _timestampMeta));
    } else if (isInserting) {
      context.missing(_timestampMeta);
    }
    if (data.containsKey('synced')) {
      context.handle(_syncedMeta,
          synced.isAcceptableOrUnknown(data['synced']!, _syncedMeta));
    }
    if (data.containsKey('error')) {
      context.handle(
          _errorMeta, error.isAcceptableOrUnknown(data['error']!, _errorMeta));
    }
    if (data.containsKey('retry_count')) {
      context.handle(
          _retryCountMeta,
          retryCount.isAcceptableOrUnknown(
              data['retry_count']!, _retryCountMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  OfflineSyncLog map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflineSyncLog(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      entityType: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}entity_type'])!,
      entityId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}entity_id'])!,
      operation: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}operation'])!,
      dataJson: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}data_json']),
      timestamp: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}timestamp'])!,
      synced: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}synced'])!,
      error: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}error']),
      retryCount: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}retry_count'])!,
    );
  }

  @override
  $OfflineSyncLogsTable createAlias(String alias) {
    return $OfflineSyncLogsTable(attachedDatabase, alias);
  }
}

class OfflineSyncLog extends DataClass implements Insertable<OfflineSyncLog> {
  final int id;
  final String entityType;
  final String entityId;
  final String operation;
  final String? dataJson;
  final DateTime timestamp;
  final bool synced;
  final String? error;
  final int retryCount;
  const OfflineSyncLog(
      {required this.id,
      required this.entityType,
      required this.entityId,
      required this.operation,
      this.dataJson,
      required this.timestamp,
      required this.synced,
      this.error,
      required this.retryCount});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['entity_type'] = Variable<String>(entityType);
    map['entity_id'] = Variable<String>(entityId);
    map['operation'] = Variable<String>(operation);
    if (!nullToAbsent || dataJson != null) {
      map['data_json'] = Variable<String>(dataJson);
    }
    map['timestamp'] = Variable<DateTime>(timestamp);
    map['synced'] = Variable<bool>(synced);
    if (!nullToAbsent || error != null) {
      map['error'] = Variable<String>(error);
    }
    map['retry_count'] = Variable<int>(retryCount);
    return map;
  }

  OfflineSyncLogsCompanion toCompanion(bool nullToAbsent) {
    return OfflineSyncLogsCompanion(
      id: Value(id),
      entityType: Value(entityType),
      entityId: Value(entityId),
      operation: Value(operation),
      dataJson: dataJson == null && nullToAbsent
          ? const Value.absent()
          : Value(dataJson),
      timestamp: Value(timestamp),
      synced: Value(synced),
      error:
          error == null && nullToAbsent ? const Value.absent() : Value(error),
      retryCount: Value(retryCount),
    );
  }

  factory OfflineSyncLog.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflineSyncLog(
      id: serializer.fromJson<int>(json['id']),
      entityType: serializer.fromJson<String>(json['entityType']),
      entityId: serializer.fromJson<String>(json['entityId']),
      operation: serializer.fromJson<String>(json['operation']),
      dataJson: serializer.fromJson<String?>(json['dataJson']),
      timestamp: serializer.fromJson<DateTime>(json['timestamp']),
      synced: serializer.fromJson<bool>(json['synced']),
      error: serializer.fromJson<String?>(json['error']),
      retryCount: serializer.fromJson<int>(json['retryCount']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'entityType': serializer.toJson<String>(entityType),
      'entityId': serializer.toJson<String>(entityId),
      'operation': serializer.toJson<String>(operation),
      'dataJson': serializer.toJson<String?>(dataJson),
      'timestamp': serializer.toJson<DateTime>(timestamp),
      'synced': serializer.toJson<bool>(synced),
      'error': serializer.toJson<String?>(error),
      'retryCount': serializer.toJson<int>(retryCount),
    };
  }

  OfflineSyncLog copyWith(
          {int? id,
          String? entityType,
          String? entityId,
          String? operation,
          Value<String?> dataJson = const Value.absent(),
          DateTime? timestamp,
          bool? synced,
          Value<String?> error = const Value.absent(),
          int? retryCount}) =>
      OfflineSyncLog(
        id: id ?? this.id,
        entityType: entityType ?? this.entityType,
        entityId: entityId ?? this.entityId,
        operation: operation ?? this.operation,
        dataJson: dataJson.present ? dataJson.value : this.dataJson,
        timestamp: timestamp ?? this.timestamp,
        synced: synced ?? this.synced,
        error: error.present ? error.value : this.error,
        retryCount: retryCount ?? this.retryCount,
      );
  OfflineSyncLog copyWithCompanion(OfflineSyncLogsCompanion data) {
    return OfflineSyncLog(
      id: data.id.present ? data.id.value : this.id,
      entityType:
          data.entityType.present ? data.entityType.value : this.entityType,
      entityId: data.entityId.present ? data.entityId.value : this.entityId,
      operation: data.operation.present ? data.operation.value : this.operation,
      dataJson: data.dataJson.present ? data.dataJson.value : this.dataJson,
      timestamp: data.timestamp.present ? data.timestamp.value : this.timestamp,
      synced: data.synced.present ? data.synced.value : this.synced,
      error: data.error.present ? data.error.value : this.error,
      retryCount:
          data.retryCount.present ? data.retryCount.value : this.retryCount,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflineSyncLog(')
          ..write('id: $id, ')
          ..write('entityType: $entityType, ')
          ..write('entityId: $entityId, ')
          ..write('operation: $operation, ')
          ..write('dataJson: $dataJson, ')
          ..write('timestamp: $timestamp, ')
          ..write('synced: $synced, ')
          ..write('error: $error, ')
          ..write('retryCount: $retryCount')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, entityType, entityId, operation, dataJson,
      timestamp, synced, error, retryCount);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflineSyncLog &&
          other.id == this.id &&
          other.entityType == this.entityType &&
          other.entityId == this.entityId &&
          other.operation == this.operation &&
          other.dataJson == this.dataJson &&
          other.timestamp == this.timestamp &&
          other.synced == this.synced &&
          other.error == this.error &&
          other.retryCount == this.retryCount);
}

class OfflineSyncLogsCompanion extends UpdateCompanion<OfflineSyncLog> {
  final Value<int> id;
  final Value<String> entityType;
  final Value<String> entityId;
  final Value<String> operation;
  final Value<String?> dataJson;
  final Value<DateTime> timestamp;
  final Value<bool> synced;
  final Value<String?> error;
  final Value<int> retryCount;
  const OfflineSyncLogsCompanion({
    this.id = const Value.absent(),
    this.entityType = const Value.absent(),
    this.entityId = const Value.absent(),
    this.operation = const Value.absent(),
    this.dataJson = const Value.absent(),
    this.timestamp = const Value.absent(),
    this.synced = const Value.absent(),
    this.error = const Value.absent(),
    this.retryCount = const Value.absent(),
  });
  OfflineSyncLogsCompanion.insert({
    this.id = const Value.absent(),
    required String entityType,
    required String entityId,
    required String operation,
    this.dataJson = const Value.absent(),
    required DateTime timestamp,
    this.synced = const Value.absent(),
    this.error = const Value.absent(),
    this.retryCount = const Value.absent(),
  })  : entityType = Value(entityType),
        entityId = Value(entityId),
        operation = Value(operation),
        timestamp = Value(timestamp);
  static Insertable<OfflineSyncLog> custom({
    Expression<int>? id,
    Expression<String>? entityType,
    Expression<String>? entityId,
    Expression<String>? operation,
    Expression<String>? dataJson,
    Expression<DateTime>? timestamp,
    Expression<bool>? synced,
    Expression<String>? error,
    Expression<int>? retryCount,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (entityType != null) 'entity_type': entityType,
      if (entityId != null) 'entity_id': entityId,
      if (operation != null) 'operation': operation,
      if (dataJson != null) 'data_json': dataJson,
      if (timestamp != null) 'timestamp': timestamp,
      if (synced != null) 'synced': synced,
      if (error != null) 'error': error,
      if (retryCount != null) 'retry_count': retryCount,
    });
  }

  OfflineSyncLogsCompanion copyWith(
      {Value<int>? id,
      Value<String>? entityType,
      Value<String>? entityId,
      Value<String>? operation,
      Value<String?>? dataJson,
      Value<DateTime>? timestamp,
      Value<bool>? synced,
      Value<String?>? error,
      Value<int>? retryCount}) {
    return OfflineSyncLogsCompanion(
      id: id ?? this.id,
      entityType: entityType ?? this.entityType,
      entityId: entityId ?? this.entityId,
      operation: operation ?? this.operation,
      dataJson: dataJson ?? this.dataJson,
      timestamp: timestamp ?? this.timestamp,
      synced: synced ?? this.synced,
      error: error ?? this.error,
      retryCount: retryCount ?? this.retryCount,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (entityType.present) {
      map['entity_type'] = Variable<String>(entityType.value);
    }
    if (entityId.present) {
      map['entity_id'] = Variable<String>(entityId.value);
    }
    if (operation.present) {
      map['operation'] = Variable<String>(operation.value);
    }
    if (dataJson.present) {
      map['data_json'] = Variable<String>(dataJson.value);
    }
    if (timestamp.present) {
      map['timestamp'] = Variable<DateTime>(timestamp.value);
    }
    if (synced.present) {
      map['synced'] = Variable<bool>(synced.value);
    }
    if (error.present) {
      map['error'] = Variable<String>(error.value);
    }
    if (retryCount.present) {
      map['retry_count'] = Variable<int>(retryCount.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OfflineSyncLogsCompanion(')
          ..write('id: $id, ')
          ..write('entityType: $entityType, ')
          ..write('entityId: $entityId, ')
          ..write('operation: $operation, ')
          ..write('dataJson: $dataJson, ')
          ..write('timestamp: $timestamp, ')
          ..write('synced: $synced, ')
          ..write('error: $error, ')
          ..write('retryCount: $retryCount')
          ..write(')'))
        .toString();
  }
}

class $OfflineImageCachesTable extends OfflineImageCaches
    with TableInfo<$OfflineImageCachesTable, OfflineImageCache> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OfflineImageCachesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<String> id = GeneratedColumn<String>(
      'id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _urlMeta = const VerificationMeta('url');
  @override
  late final GeneratedColumn<String> url = GeneratedColumn<String>(
      'url', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _localPathMeta =
      const VerificationMeta('localPath');
  @override
  late final GeneratedColumn<String> localPath = GeneratedColumn<String>(
      'local_path', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _sizeBytesMeta =
      const VerificationMeta('sizeBytes');
  @override
  late final GeneratedColumn<int> sizeBytes = GeneratedColumn<int>(
      'size_bytes', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: true);
  static const VerificationMeta _cachedAtMeta =
      const VerificationMeta('cachedAt');
  @override
  late final GeneratedColumn<DateTime> cachedAt = GeneratedColumn<DateTime>(
      'cached_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _lastAccessedAtMeta =
      const VerificationMeta('lastAccessedAt');
  @override
  late final GeneratedColumn<DateTime> lastAccessedAt =
      GeneratedColumn<DateTime>('last_accessed_at', aliasedName, false,
          type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _isPermanentMeta =
      const VerificationMeta('isPermanent');
  @override
  late final GeneratedColumn<bool> isPermanent = GeneratedColumn<bool>(
      'is_permanent', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints: GeneratedColumn.constraintIsAlways(
          'CHECK ("is_permanent" IN (0, 1))'),
      defaultValue: const Constant(false));
  @override
  List<GeneratedColumn> get $columns =>
      [id, url, localPath, sizeBytes, cachedAt, lastAccessedAt, isPermanent];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'offline_image_caches';
  @override
  VerificationContext validateIntegrity(Insertable<OfflineImageCache> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    } else if (isInserting) {
      context.missing(_idMeta);
    }
    if (data.containsKey('url')) {
      context.handle(
          _urlMeta, url.isAcceptableOrUnknown(data['url']!, _urlMeta));
    } else if (isInserting) {
      context.missing(_urlMeta);
    }
    if (data.containsKey('local_path')) {
      context.handle(_localPathMeta,
          localPath.isAcceptableOrUnknown(data['local_path']!, _localPathMeta));
    } else if (isInserting) {
      context.missing(_localPathMeta);
    }
    if (data.containsKey('size_bytes')) {
      context.handle(_sizeBytesMeta,
          sizeBytes.isAcceptableOrUnknown(data['size_bytes']!, _sizeBytesMeta));
    } else if (isInserting) {
      context.missing(_sizeBytesMeta);
    }
    if (data.containsKey('cached_at')) {
      context.handle(_cachedAtMeta,
          cachedAt.isAcceptableOrUnknown(data['cached_at']!, _cachedAtMeta));
    } else if (isInserting) {
      context.missing(_cachedAtMeta);
    }
    if (data.containsKey('last_accessed_at')) {
      context.handle(
          _lastAccessedAtMeta,
          lastAccessedAt.isAcceptableOrUnknown(
              data['last_accessed_at']!, _lastAccessedAtMeta));
    } else if (isInserting) {
      context.missing(_lastAccessedAtMeta);
    }
    if (data.containsKey('is_permanent')) {
      context.handle(
          _isPermanentMeta,
          isPermanent.isAcceptableOrUnknown(
              data['is_permanent']!, _isPermanentMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  OfflineImageCache map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OfflineImageCache(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}id'])!,
      url: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}url'])!,
      localPath: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}local_path'])!,
      sizeBytes: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}size_bytes'])!,
      cachedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}cached_at'])!,
      lastAccessedAt: attachedDatabase.typeMapping.read(
          DriftSqlType.dateTime, data['${effectivePrefix}last_accessed_at'])!,
      isPermanent: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_permanent'])!,
    );
  }

  @override
  $OfflineImageCachesTable createAlias(String alias) {
    return $OfflineImageCachesTable(attachedDatabase, alias);
  }
}

class OfflineImageCache extends DataClass
    implements Insertable<OfflineImageCache> {
  final String id;
  final String url;
  final String localPath;
  final int sizeBytes;
  final DateTime cachedAt;
  final DateTime lastAccessedAt;
  final bool isPermanent;
  const OfflineImageCache(
      {required this.id,
      required this.url,
      required this.localPath,
      required this.sizeBytes,
      required this.cachedAt,
      required this.lastAccessedAt,
      required this.isPermanent});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<String>(id);
    map['url'] = Variable<String>(url);
    map['local_path'] = Variable<String>(localPath);
    map['size_bytes'] = Variable<int>(sizeBytes);
    map['cached_at'] = Variable<DateTime>(cachedAt);
    map['last_accessed_at'] = Variable<DateTime>(lastAccessedAt);
    map['is_permanent'] = Variable<bool>(isPermanent);
    return map;
  }

  OfflineImageCachesCompanion toCompanion(bool nullToAbsent) {
    return OfflineImageCachesCompanion(
      id: Value(id),
      url: Value(url),
      localPath: Value(localPath),
      sizeBytes: Value(sizeBytes),
      cachedAt: Value(cachedAt),
      lastAccessedAt: Value(lastAccessedAt),
      isPermanent: Value(isPermanent),
    );
  }

  factory OfflineImageCache.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OfflineImageCache(
      id: serializer.fromJson<String>(json['id']),
      url: serializer.fromJson<String>(json['url']),
      localPath: serializer.fromJson<String>(json['localPath']),
      sizeBytes: serializer.fromJson<int>(json['sizeBytes']),
      cachedAt: serializer.fromJson<DateTime>(json['cachedAt']),
      lastAccessedAt: serializer.fromJson<DateTime>(json['lastAccessedAt']),
      isPermanent: serializer.fromJson<bool>(json['isPermanent']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<String>(id),
      'url': serializer.toJson<String>(url),
      'localPath': serializer.toJson<String>(localPath),
      'sizeBytes': serializer.toJson<int>(sizeBytes),
      'cachedAt': serializer.toJson<DateTime>(cachedAt),
      'lastAccessedAt': serializer.toJson<DateTime>(lastAccessedAt),
      'isPermanent': serializer.toJson<bool>(isPermanent),
    };
  }

  OfflineImageCache copyWith(
          {String? id,
          String? url,
          String? localPath,
          int? sizeBytes,
          DateTime? cachedAt,
          DateTime? lastAccessedAt,
          bool? isPermanent}) =>
      OfflineImageCache(
        id: id ?? this.id,
        url: url ?? this.url,
        localPath: localPath ?? this.localPath,
        sizeBytes: sizeBytes ?? this.sizeBytes,
        cachedAt: cachedAt ?? this.cachedAt,
        lastAccessedAt: lastAccessedAt ?? this.lastAccessedAt,
        isPermanent: isPermanent ?? this.isPermanent,
      );
  OfflineImageCache copyWithCompanion(OfflineImageCachesCompanion data) {
    return OfflineImageCache(
      id: data.id.present ? data.id.value : this.id,
      url: data.url.present ? data.url.value : this.url,
      localPath: data.localPath.present ? data.localPath.value : this.localPath,
      sizeBytes: data.sizeBytes.present ? data.sizeBytes.value : this.sizeBytes,
      cachedAt: data.cachedAt.present ? data.cachedAt.value : this.cachedAt,
      lastAccessedAt: data.lastAccessedAt.present
          ? data.lastAccessedAt.value
          : this.lastAccessedAt,
      isPermanent:
          data.isPermanent.present ? data.isPermanent.value : this.isPermanent,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OfflineImageCache(')
          ..write('id: $id, ')
          ..write('url: $url, ')
          ..write('localPath: $localPath, ')
          ..write('sizeBytes: $sizeBytes, ')
          ..write('cachedAt: $cachedAt, ')
          ..write('lastAccessedAt: $lastAccessedAt, ')
          ..write('isPermanent: $isPermanent')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id, url, localPath, sizeBytes, cachedAt, lastAccessedAt, isPermanent);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OfflineImageCache &&
          other.id == this.id &&
          other.url == this.url &&
          other.localPath == this.localPath &&
          other.sizeBytes == this.sizeBytes &&
          other.cachedAt == this.cachedAt &&
          other.lastAccessedAt == this.lastAccessedAt &&
          other.isPermanent == this.isPermanent);
}

class OfflineImageCachesCompanion extends UpdateCompanion<OfflineImageCache> {
  final Value<String> id;
  final Value<String> url;
  final Value<String> localPath;
  final Value<int> sizeBytes;
  final Value<DateTime> cachedAt;
  final Value<DateTime> lastAccessedAt;
  final Value<bool> isPermanent;
  final Value<int> rowid;
  const OfflineImageCachesCompanion({
    this.id = const Value.absent(),
    this.url = const Value.absent(),
    this.localPath = const Value.absent(),
    this.sizeBytes = const Value.absent(),
    this.cachedAt = const Value.absent(),
    this.lastAccessedAt = const Value.absent(),
    this.isPermanent = const Value.absent(),
    this.rowid = const Value.absent(),
  });
  OfflineImageCachesCompanion.insert({
    required String id,
    required String url,
    required String localPath,
    required int sizeBytes,
    required DateTime cachedAt,
    required DateTime lastAccessedAt,
    this.isPermanent = const Value.absent(),
    this.rowid = const Value.absent(),
  })  : id = Value(id),
        url = Value(url),
        localPath = Value(localPath),
        sizeBytes = Value(sizeBytes),
        cachedAt = Value(cachedAt),
        lastAccessedAt = Value(lastAccessedAt);
  static Insertable<OfflineImageCache> custom({
    Expression<String>? id,
    Expression<String>? url,
    Expression<String>? localPath,
    Expression<int>? sizeBytes,
    Expression<DateTime>? cachedAt,
    Expression<DateTime>? lastAccessedAt,
    Expression<bool>? isPermanent,
    Expression<int>? rowid,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (url != null) 'url': url,
      if (localPath != null) 'local_path': localPath,
      if (sizeBytes != null) 'size_bytes': sizeBytes,
      if (cachedAt != null) 'cached_at': cachedAt,
      if (lastAccessedAt != null) 'last_accessed_at': lastAccessedAt,
      if (isPermanent != null) 'is_permanent': isPermanent,
      if (rowid != null) 'rowid': rowid,
    });
  }

  OfflineImageCachesCompanion copyWith(
      {Value<String>? id,
      Value<String>? url,
      Value<String>? localPath,
      Value<int>? sizeBytes,
      Value<DateTime>? cachedAt,
      Value<DateTime>? lastAccessedAt,
      Value<bool>? isPermanent,
      Value<int>? rowid}) {
    return OfflineImageCachesCompanion(
      id: id ?? this.id,
      url: url ?? this.url,
      localPath: localPath ?? this.localPath,
      sizeBytes: sizeBytes ?? this.sizeBytes,
      cachedAt: cachedAt ?? this.cachedAt,
      lastAccessedAt: lastAccessedAt ?? this.lastAccessedAt,
      isPermanent: isPermanent ?? this.isPermanent,
      rowid: rowid ?? this.rowid,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<String>(id.value);
    }
    if (url.present) {
      map['url'] = Variable<String>(url.value);
    }
    if (localPath.present) {
      map['local_path'] = Variable<String>(localPath.value);
    }
    if (sizeBytes.present) {
      map['size_bytes'] = Variable<int>(sizeBytes.value);
    }
    if (cachedAt.present) {
      map['cached_at'] = Variable<DateTime>(cachedAt.value);
    }
    if (lastAccessedAt.present) {
      map['last_accessed_at'] = Variable<DateTime>(lastAccessedAt.value);
    }
    if (isPermanent.present) {
      map['is_permanent'] = Variable<bool>(isPermanent.value);
    }
    if (rowid.present) {
      map['rowid'] = Variable<int>(rowid.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OfflineImageCachesCompanion(')
          ..write('id: $id, ')
          ..write('url: $url, ')
          ..write('localPath: $localPath, ')
          ..write('sizeBytes: $sizeBytes, ')
          ..write('cachedAt: $cachedAt, ')
          ..write('lastAccessedAt: $lastAccessedAt, ')
          ..write('isPermanent: $isPermanent, ')
          ..write('rowid: $rowid')
          ..write(')'))
        .toString();
  }
}

abstract class _$OfflineDatabase extends GeneratedDatabase {
  _$OfflineDatabase(QueryExecutor e) : super(e);
  $OfflineDatabaseManager get managers => $OfflineDatabaseManager(this);
  late final $OfflineChurchesTable offlineChurches =
      $OfflineChurchesTable(this);
  late final $OfflineAnnouncementsTable offlineAnnouncements =
      $OfflineAnnouncementsTable(this);
  late final $OfflineUserProfilesTable offlineUserProfiles =
      $OfflineUserProfilesTable(this);
  late final $OfflineSyncLogsTable offlineSyncLogs =
      $OfflineSyncLogsTable(this);
  late final $OfflineImageCachesTable offlineImageCaches =
      $OfflineImageCachesTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
        offlineChurches,
        offlineAnnouncements,
        offlineUserProfiles,
        offlineSyncLogs,
        offlineImageCaches
      ];
}

typedef $$OfflineChurchesTableCreateCompanionBuilder = OfflineChurchesCompanion
    Function({
  required String id,
  required String name,
  Value<String?> fullName,
  required String location,
  required String municipality,
  required String diocese,
  Value<int?> foundingYear,
  Value<String?> foundersJson,
  Value<String?> architecturalStyle,
  Value<String?> history,
  Value<String?> description,
  required String heritageClassification,
  Value<String?> assignedPriest,
  Value<String?> massSchedulesJson,
  Value<double?> latitude,
  Value<double?> longitude,
  Value<String?> contactInfoJson,
  Value<String?> imagesJson,
  Value<bool> isPublicVisible,
  Value<String> status,
  required DateTime createdAt,
  required DateTime updatedAt,
  Value<DateTime?> lastSyncedAt,
  Value<bool> needsSync,
  Value<int> rowid,
});
typedef $$OfflineChurchesTableUpdateCompanionBuilder = OfflineChurchesCompanion
    Function({
  Value<String> id,
  Value<String> name,
  Value<String?> fullName,
  Value<String> location,
  Value<String> municipality,
  Value<String> diocese,
  Value<int?> foundingYear,
  Value<String?> foundersJson,
  Value<String?> architecturalStyle,
  Value<String?> history,
  Value<String?> description,
  Value<String> heritageClassification,
  Value<String?> assignedPriest,
  Value<String?> massSchedulesJson,
  Value<double?> latitude,
  Value<double?> longitude,
  Value<String?> contactInfoJson,
  Value<String?> imagesJson,
  Value<bool> isPublicVisible,
  Value<String> status,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
  Value<DateTime?> lastSyncedAt,
  Value<bool> needsSync,
  Value<int> rowid,
});

class $$OfflineChurchesTableFilterComposer
    extends Composer<_$OfflineDatabase, $OfflineChurchesTable> {
  $$OfflineChurchesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get fullName => $composableBuilder(
      column: $table.fullName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get location => $composableBuilder(
      column: $table.location, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get municipality => $composableBuilder(
      column: $table.municipality, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get diocese => $composableBuilder(
      column: $table.diocese, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get foundingYear => $composableBuilder(
      column: $table.foundingYear, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get foundersJson => $composableBuilder(
      column: $table.foundersJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get architecturalStyle => $composableBuilder(
      column: $table.architecturalStyle,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get history => $composableBuilder(
      column: $table.history, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get heritageClassification => $composableBuilder(
      column: $table.heritageClassification,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get assignedPriest => $composableBuilder(
      column: $table.assignedPriest,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get massSchedulesJson => $composableBuilder(
      column: $table.massSchedulesJson,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get latitude => $composableBuilder(
      column: $table.latitude, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get longitude => $composableBuilder(
      column: $table.longitude, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get contactInfoJson => $composableBuilder(
      column: $table.contactInfoJson,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get imagesJson => $composableBuilder(
      column: $table.imagesJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isPublicVisible => $composableBuilder(
      column: $table.isPublicVisible,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get needsSync => $composableBuilder(
      column: $table.needsSync, builder: (column) => ColumnFilters(column));
}

class $$OfflineChurchesTableOrderingComposer
    extends Composer<_$OfflineDatabase, $OfflineChurchesTable> {
  $$OfflineChurchesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get name => $composableBuilder(
      column: $table.name, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get fullName => $composableBuilder(
      column: $table.fullName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get location => $composableBuilder(
      column: $table.location, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get municipality => $composableBuilder(
      column: $table.municipality,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get diocese => $composableBuilder(
      column: $table.diocese, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get foundingYear => $composableBuilder(
      column: $table.foundingYear,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get foundersJson => $composableBuilder(
      column: $table.foundersJson,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get architecturalStyle => $composableBuilder(
      column: $table.architecturalStyle,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get history => $composableBuilder(
      column: $table.history, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get heritageClassification => $composableBuilder(
      column: $table.heritageClassification,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get assignedPriest => $composableBuilder(
      column: $table.assignedPriest,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get massSchedulesJson => $composableBuilder(
      column: $table.massSchedulesJson,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get latitude => $composableBuilder(
      column: $table.latitude, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get longitude => $composableBuilder(
      column: $table.longitude, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get contactInfoJson => $composableBuilder(
      column: $table.contactInfoJson,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get imagesJson => $composableBuilder(
      column: $table.imagesJson, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isPublicVisible => $composableBuilder(
      column: $table.isPublicVisible,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get needsSync => $composableBuilder(
      column: $table.needsSync, builder: (column) => ColumnOrderings(column));
}

class $$OfflineChurchesTableAnnotationComposer
    extends Composer<_$OfflineDatabase, $OfflineChurchesTable> {
  $$OfflineChurchesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get name =>
      $composableBuilder(column: $table.name, builder: (column) => column);

  GeneratedColumn<String> get fullName =>
      $composableBuilder(column: $table.fullName, builder: (column) => column);

  GeneratedColumn<String> get location =>
      $composableBuilder(column: $table.location, builder: (column) => column);

  GeneratedColumn<String> get municipality => $composableBuilder(
      column: $table.municipality, builder: (column) => column);

  GeneratedColumn<String> get diocese =>
      $composableBuilder(column: $table.diocese, builder: (column) => column);

  GeneratedColumn<int> get foundingYear => $composableBuilder(
      column: $table.foundingYear, builder: (column) => column);

  GeneratedColumn<String> get foundersJson => $composableBuilder(
      column: $table.foundersJson, builder: (column) => column);

  GeneratedColumn<String> get architecturalStyle => $composableBuilder(
      column: $table.architecturalStyle, builder: (column) => column);

  GeneratedColumn<String> get history =>
      $composableBuilder(column: $table.history, builder: (column) => column);

  GeneratedColumn<String> get description => $composableBuilder(
      column: $table.description, builder: (column) => column);

  GeneratedColumn<String> get heritageClassification => $composableBuilder(
      column: $table.heritageClassification, builder: (column) => column);

  GeneratedColumn<String> get assignedPriest => $composableBuilder(
      column: $table.assignedPriest, builder: (column) => column);

  GeneratedColumn<String> get massSchedulesJson => $composableBuilder(
      column: $table.massSchedulesJson, builder: (column) => column);

  GeneratedColumn<double> get latitude =>
      $composableBuilder(column: $table.latitude, builder: (column) => column);

  GeneratedColumn<double> get longitude =>
      $composableBuilder(column: $table.longitude, builder: (column) => column);

  GeneratedColumn<String> get contactInfoJson => $composableBuilder(
      column: $table.contactInfoJson, builder: (column) => column);

  GeneratedColumn<String> get imagesJson => $composableBuilder(
      column: $table.imagesJson, builder: (column) => column);

  GeneratedColumn<bool> get isPublicVisible => $composableBuilder(
      column: $table.isPublicVisible, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<DateTime> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt, builder: (column) => column);

  GeneratedColumn<bool> get needsSync =>
      $composableBuilder(column: $table.needsSync, builder: (column) => column);
}

class $$OfflineChurchesTableTableManager extends RootTableManager<
    _$OfflineDatabase,
    $OfflineChurchesTable,
    OfflineChurch,
    $$OfflineChurchesTableFilterComposer,
    $$OfflineChurchesTableOrderingComposer,
    $$OfflineChurchesTableAnnotationComposer,
    $$OfflineChurchesTableCreateCompanionBuilder,
    $$OfflineChurchesTableUpdateCompanionBuilder,
    (
      OfflineChurch,
      BaseReferences<_$OfflineDatabase, $OfflineChurchesTable, OfflineChurch>
    ),
    OfflineChurch,
    PrefetchHooks Function()> {
  $$OfflineChurchesTableTableManager(
      _$OfflineDatabase db, $OfflineChurchesTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OfflineChurchesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OfflineChurchesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OfflineChurchesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> name = const Value.absent(),
            Value<String?> fullName = const Value.absent(),
            Value<String> location = const Value.absent(),
            Value<String> municipality = const Value.absent(),
            Value<String> diocese = const Value.absent(),
            Value<int?> foundingYear = const Value.absent(),
            Value<String?> foundersJson = const Value.absent(),
            Value<String?> architecturalStyle = const Value.absent(),
            Value<String?> history = const Value.absent(),
            Value<String?> description = const Value.absent(),
            Value<String> heritageClassification = const Value.absent(),
            Value<String?> assignedPriest = const Value.absent(),
            Value<String?> massSchedulesJson = const Value.absent(),
            Value<double?> latitude = const Value.absent(),
            Value<double?> longitude = const Value.absent(),
            Value<String?> contactInfoJson = const Value.absent(),
            Value<String?> imagesJson = const Value.absent(),
            Value<bool> isPublicVisible = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
            Value<DateTime?> lastSyncedAt = const Value.absent(),
            Value<bool> needsSync = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineChurchesCompanion(
            id: id,
            name: name,
            fullName: fullName,
            location: location,
            municipality: municipality,
            diocese: diocese,
            foundingYear: foundingYear,
            foundersJson: foundersJson,
            architecturalStyle: architecturalStyle,
            history: history,
            description: description,
            heritageClassification: heritageClassification,
            assignedPriest: assignedPriest,
            massSchedulesJson: massSchedulesJson,
            latitude: latitude,
            longitude: longitude,
            contactInfoJson: contactInfoJson,
            imagesJson: imagesJson,
            isPublicVisible: isPublicVisible,
            status: status,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastSyncedAt: lastSyncedAt,
            needsSync: needsSync,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String name,
            Value<String?> fullName = const Value.absent(),
            required String location,
            required String municipality,
            required String diocese,
            Value<int?> foundingYear = const Value.absent(),
            Value<String?> foundersJson = const Value.absent(),
            Value<String?> architecturalStyle = const Value.absent(),
            Value<String?> history = const Value.absent(),
            Value<String?> description = const Value.absent(),
            required String heritageClassification,
            Value<String?> assignedPriest = const Value.absent(),
            Value<String?> massSchedulesJson = const Value.absent(),
            Value<double?> latitude = const Value.absent(),
            Value<double?> longitude = const Value.absent(),
            Value<String?> contactInfoJson = const Value.absent(),
            Value<String?> imagesJson = const Value.absent(),
            Value<bool> isPublicVisible = const Value.absent(),
            Value<String> status = const Value.absent(),
            required DateTime createdAt,
            required DateTime updatedAt,
            Value<DateTime?> lastSyncedAt = const Value.absent(),
            Value<bool> needsSync = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineChurchesCompanion.insert(
            id: id,
            name: name,
            fullName: fullName,
            location: location,
            municipality: municipality,
            diocese: diocese,
            foundingYear: foundingYear,
            foundersJson: foundersJson,
            architecturalStyle: architecturalStyle,
            history: history,
            description: description,
            heritageClassification: heritageClassification,
            assignedPriest: assignedPriest,
            massSchedulesJson: massSchedulesJson,
            latitude: latitude,
            longitude: longitude,
            contactInfoJson: contactInfoJson,
            imagesJson: imagesJson,
            isPublicVisible: isPublicVisible,
            status: status,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastSyncedAt: lastSyncedAt,
            needsSync: needsSync,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$OfflineChurchesTableProcessedTableManager = ProcessedTableManager<
    _$OfflineDatabase,
    $OfflineChurchesTable,
    OfflineChurch,
    $$OfflineChurchesTableFilterComposer,
    $$OfflineChurchesTableOrderingComposer,
    $$OfflineChurchesTableAnnotationComposer,
    $$OfflineChurchesTableCreateCompanionBuilder,
    $$OfflineChurchesTableUpdateCompanionBuilder,
    (
      OfflineChurch,
      BaseReferences<_$OfflineDatabase, $OfflineChurchesTable, OfflineChurch>
    ),
    OfflineChurch,
    PrefetchHooks Function()>;
typedef $$OfflineAnnouncementsTableCreateCompanionBuilder
    = OfflineAnnouncementsCompanion Function({
  required String id,
  required String title,
  required String content,
  Value<String?> churchId,
  required String diocese,
  Value<DateTime?> eventDate,
  Value<String?> venue,
  Value<String?> imageUrl,
  Value<String> priority,
  Value<bool> isActive,
  required DateTime createdAt,
  required DateTime updatedAt,
  Value<DateTime?> lastSyncedAt,
  Value<bool> needsSync,
  Value<int> rowid,
});
typedef $$OfflineAnnouncementsTableUpdateCompanionBuilder
    = OfflineAnnouncementsCompanion Function({
  Value<String> id,
  Value<String> title,
  Value<String> content,
  Value<String?> churchId,
  Value<String> diocese,
  Value<DateTime?> eventDate,
  Value<String?> venue,
  Value<String?> imageUrl,
  Value<String> priority,
  Value<bool> isActive,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
  Value<DateTime?> lastSyncedAt,
  Value<bool> needsSync,
  Value<int> rowid,
});

class $$OfflineAnnouncementsTableFilterComposer
    extends Composer<_$OfflineDatabase, $OfflineAnnouncementsTable> {
  $$OfflineAnnouncementsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get title => $composableBuilder(
      column: $table.title, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get content => $composableBuilder(
      column: $table.content, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get churchId => $composableBuilder(
      column: $table.churchId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get diocese => $composableBuilder(
      column: $table.diocese, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get eventDate => $composableBuilder(
      column: $table.eventDate, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get venue => $composableBuilder(
      column: $table.venue, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get imageUrl => $composableBuilder(
      column: $table.imageUrl, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get priority => $composableBuilder(
      column: $table.priority, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isActive => $composableBuilder(
      column: $table.isActive, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get needsSync => $composableBuilder(
      column: $table.needsSync, builder: (column) => ColumnFilters(column));
}

class $$OfflineAnnouncementsTableOrderingComposer
    extends Composer<_$OfflineDatabase, $OfflineAnnouncementsTable> {
  $$OfflineAnnouncementsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get title => $composableBuilder(
      column: $table.title, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get content => $composableBuilder(
      column: $table.content, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get churchId => $composableBuilder(
      column: $table.churchId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get diocese => $composableBuilder(
      column: $table.diocese, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get eventDate => $composableBuilder(
      column: $table.eventDate, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get venue => $composableBuilder(
      column: $table.venue, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get imageUrl => $composableBuilder(
      column: $table.imageUrl, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get priority => $composableBuilder(
      column: $table.priority, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isActive => $composableBuilder(
      column: $table.isActive, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get needsSync => $composableBuilder(
      column: $table.needsSync, builder: (column) => ColumnOrderings(column));
}

class $$OfflineAnnouncementsTableAnnotationComposer
    extends Composer<_$OfflineDatabase, $OfflineAnnouncementsTable> {
  $$OfflineAnnouncementsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get title =>
      $composableBuilder(column: $table.title, builder: (column) => column);

  GeneratedColumn<String> get content =>
      $composableBuilder(column: $table.content, builder: (column) => column);

  GeneratedColumn<String> get churchId =>
      $composableBuilder(column: $table.churchId, builder: (column) => column);

  GeneratedColumn<String> get diocese =>
      $composableBuilder(column: $table.diocese, builder: (column) => column);

  GeneratedColumn<DateTime> get eventDate =>
      $composableBuilder(column: $table.eventDate, builder: (column) => column);

  GeneratedColumn<String> get venue =>
      $composableBuilder(column: $table.venue, builder: (column) => column);

  GeneratedColumn<String> get imageUrl =>
      $composableBuilder(column: $table.imageUrl, builder: (column) => column);

  GeneratedColumn<String> get priority =>
      $composableBuilder(column: $table.priority, builder: (column) => column);

  GeneratedColumn<bool> get isActive =>
      $composableBuilder(column: $table.isActive, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<DateTime> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt, builder: (column) => column);

  GeneratedColumn<bool> get needsSync =>
      $composableBuilder(column: $table.needsSync, builder: (column) => column);
}

class $$OfflineAnnouncementsTableTableManager extends RootTableManager<
    _$OfflineDatabase,
    $OfflineAnnouncementsTable,
    OfflineAnnouncement,
    $$OfflineAnnouncementsTableFilterComposer,
    $$OfflineAnnouncementsTableOrderingComposer,
    $$OfflineAnnouncementsTableAnnotationComposer,
    $$OfflineAnnouncementsTableCreateCompanionBuilder,
    $$OfflineAnnouncementsTableUpdateCompanionBuilder,
    (
      OfflineAnnouncement,
      BaseReferences<_$OfflineDatabase, $OfflineAnnouncementsTable,
          OfflineAnnouncement>
    ),
    OfflineAnnouncement,
    PrefetchHooks Function()> {
  $$OfflineAnnouncementsTableTableManager(
      _$OfflineDatabase db, $OfflineAnnouncementsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OfflineAnnouncementsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OfflineAnnouncementsTableOrderingComposer(
                  $db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OfflineAnnouncementsTableAnnotationComposer(
                  $db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> title = const Value.absent(),
            Value<String> content = const Value.absent(),
            Value<String?> churchId = const Value.absent(),
            Value<String> diocese = const Value.absent(),
            Value<DateTime?> eventDate = const Value.absent(),
            Value<String?> venue = const Value.absent(),
            Value<String?> imageUrl = const Value.absent(),
            Value<String> priority = const Value.absent(),
            Value<bool> isActive = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
            Value<DateTime?> lastSyncedAt = const Value.absent(),
            Value<bool> needsSync = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineAnnouncementsCompanion(
            id: id,
            title: title,
            content: content,
            churchId: churchId,
            diocese: diocese,
            eventDate: eventDate,
            venue: venue,
            imageUrl: imageUrl,
            priority: priority,
            isActive: isActive,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastSyncedAt: lastSyncedAt,
            needsSync: needsSync,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String title,
            required String content,
            Value<String?> churchId = const Value.absent(),
            required String diocese,
            Value<DateTime?> eventDate = const Value.absent(),
            Value<String?> venue = const Value.absent(),
            Value<String?> imageUrl = const Value.absent(),
            Value<String> priority = const Value.absent(),
            Value<bool> isActive = const Value.absent(),
            required DateTime createdAt,
            required DateTime updatedAt,
            Value<DateTime?> lastSyncedAt = const Value.absent(),
            Value<bool> needsSync = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineAnnouncementsCompanion.insert(
            id: id,
            title: title,
            content: content,
            churchId: churchId,
            diocese: diocese,
            eventDate: eventDate,
            venue: venue,
            imageUrl: imageUrl,
            priority: priority,
            isActive: isActive,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastSyncedAt: lastSyncedAt,
            needsSync: needsSync,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$OfflineAnnouncementsTableProcessedTableManager
    = ProcessedTableManager<
        _$OfflineDatabase,
        $OfflineAnnouncementsTable,
        OfflineAnnouncement,
        $$OfflineAnnouncementsTableFilterComposer,
        $$OfflineAnnouncementsTableOrderingComposer,
        $$OfflineAnnouncementsTableAnnotationComposer,
        $$OfflineAnnouncementsTableCreateCompanionBuilder,
        $$OfflineAnnouncementsTableUpdateCompanionBuilder,
        (
          OfflineAnnouncement,
          BaseReferences<_$OfflineDatabase, $OfflineAnnouncementsTable,
              OfflineAnnouncement>
        ),
        OfflineAnnouncement,
        PrefetchHooks Function()>;
typedef $$OfflineUserProfilesTableCreateCompanionBuilder
    = OfflineUserProfilesCompanion Function({
  required String id,
  required String email,
  required String displayName,
  Value<String?> phoneNumber,
  Value<String?> location,
  Value<String?> bio,
  Value<String> accountType,
  Value<String> visitedChurchesJson,
  Value<String> favoriteChurchesJson,
  Value<String> forVisitChurchesJson,
  Value<String> journalEntriesJson,
  required DateTime createdAt,
  required DateTime updatedAt,
  Value<DateTime?> lastSyncedAt,
  Value<bool> needsSync,
  Value<int> rowid,
});
typedef $$OfflineUserProfilesTableUpdateCompanionBuilder
    = OfflineUserProfilesCompanion Function({
  Value<String> id,
  Value<String> email,
  Value<String> displayName,
  Value<String?> phoneNumber,
  Value<String?> location,
  Value<String?> bio,
  Value<String> accountType,
  Value<String> visitedChurchesJson,
  Value<String> favoriteChurchesJson,
  Value<String> forVisitChurchesJson,
  Value<String> journalEntriesJson,
  Value<DateTime> createdAt,
  Value<DateTime> updatedAt,
  Value<DateTime?> lastSyncedAt,
  Value<bool> needsSync,
  Value<int> rowid,
});

class $$OfflineUserProfilesTableFilterComposer
    extends Composer<_$OfflineDatabase, $OfflineUserProfilesTable> {
  $$OfflineUserProfilesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get email => $composableBuilder(
      column: $table.email, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get displayName => $composableBuilder(
      column: $table.displayName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get phoneNumber => $composableBuilder(
      column: $table.phoneNumber, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get location => $composableBuilder(
      column: $table.location, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get bio => $composableBuilder(
      column: $table.bio, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get accountType => $composableBuilder(
      column: $table.accountType, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get visitedChurchesJson => $composableBuilder(
      column: $table.visitedChurchesJson,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get favoriteChurchesJson => $composableBuilder(
      column: $table.favoriteChurchesJson,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get forVisitChurchesJson => $composableBuilder(
      column: $table.forVisitChurchesJson,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get journalEntriesJson => $composableBuilder(
      column: $table.journalEntriesJson,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get needsSync => $composableBuilder(
      column: $table.needsSync, builder: (column) => ColumnFilters(column));
}

class $$OfflineUserProfilesTableOrderingComposer
    extends Composer<_$OfflineDatabase, $OfflineUserProfilesTable> {
  $$OfflineUserProfilesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get email => $composableBuilder(
      column: $table.email, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get displayName => $composableBuilder(
      column: $table.displayName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get phoneNumber => $composableBuilder(
      column: $table.phoneNumber, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get location => $composableBuilder(
      column: $table.location, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get bio => $composableBuilder(
      column: $table.bio, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get accountType => $composableBuilder(
      column: $table.accountType, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get visitedChurchesJson => $composableBuilder(
      column: $table.visitedChurchesJson,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get favoriteChurchesJson => $composableBuilder(
      column: $table.favoriteChurchesJson,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get forVisitChurchesJson => $composableBuilder(
      column: $table.forVisitChurchesJson,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get journalEntriesJson => $composableBuilder(
      column: $table.journalEntriesJson,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
      column: $table.createdAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
      column: $table.updatedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get needsSync => $composableBuilder(
      column: $table.needsSync, builder: (column) => ColumnOrderings(column));
}

class $$OfflineUserProfilesTableAnnotationComposer
    extends Composer<_$OfflineDatabase, $OfflineUserProfilesTable> {
  $$OfflineUserProfilesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get email =>
      $composableBuilder(column: $table.email, builder: (column) => column);

  GeneratedColumn<String> get displayName => $composableBuilder(
      column: $table.displayName, builder: (column) => column);

  GeneratedColumn<String> get phoneNumber => $composableBuilder(
      column: $table.phoneNumber, builder: (column) => column);

  GeneratedColumn<String> get location =>
      $composableBuilder(column: $table.location, builder: (column) => column);

  GeneratedColumn<String> get bio =>
      $composableBuilder(column: $table.bio, builder: (column) => column);

  GeneratedColumn<String> get accountType => $composableBuilder(
      column: $table.accountType, builder: (column) => column);

  GeneratedColumn<String> get visitedChurchesJson => $composableBuilder(
      column: $table.visitedChurchesJson, builder: (column) => column);

  GeneratedColumn<String> get favoriteChurchesJson => $composableBuilder(
      column: $table.favoriteChurchesJson, builder: (column) => column);

  GeneratedColumn<String> get forVisitChurchesJson => $composableBuilder(
      column: $table.forVisitChurchesJson, builder: (column) => column);

  GeneratedColumn<String> get journalEntriesJson => $composableBuilder(
      column: $table.journalEntriesJson, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  GeneratedColumn<DateTime> get lastSyncedAt => $composableBuilder(
      column: $table.lastSyncedAt, builder: (column) => column);

  GeneratedColumn<bool> get needsSync =>
      $composableBuilder(column: $table.needsSync, builder: (column) => column);
}

class $$OfflineUserProfilesTableTableManager extends RootTableManager<
    _$OfflineDatabase,
    $OfflineUserProfilesTable,
    OfflineUserData,
    $$OfflineUserProfilesTableFilterComposer,
    $$OfflineUserProfilesTableOrderingComposer,
    $$OfflineUserProfilesTableAnnotationComposer,
    $$OfflineUserProfilesTableCreateCompanionBuilder,
    $$OfflineUserProfilesTableUpdateCompanionBuilder,
    (
      OfflineUserData,
      BaseReferences<_$OfflineDatabase, $OfflineUserProfilesTable,
          OfflineUserData>
    ),
    OfflineUserData,
    PrefetchHooks Function()> {
  $$OfflineUserProfilesTableTableManager(
      _$OfflineDatabase db, $OfflineUserProfilesTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OfflineUserProfilesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OfflineUserProfilesTableOrderingComposer(
                  $db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OfflineUserProfilesTableAnnotationComposer(
                  $db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> email = const Value.absent(),
            Value<String> displayName = const Value.absent(),
            Value<String?> phoneNumber = const Value.absent(),
            Value<String?> location = const Value.absent(),
            Value<String?> bio = const Value.absent(),
            Value<String> accountType = const Value.absent(),
            Value<String> visitedChurchesJson = const Value.absent(),
            Value<String> favoriteChurchesJson = const Value.absent(),
            Value<String> forVisitChurchesJson = const Value.absent(),
            Value<String> journalEntriesJson = const Value.absent(),
            Value<DateTime> createdAt = const Value.absent(),
            Value<DateTime> updatedAt = const Value.absent(),
            Value<DateTime?> lastSyncedAt = const Value.absent(),
            Value<bool> needsSync = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineUserProfilesCompanion(
            id: id,
            email: email,
            displayName: displayName,
            phoneNumber: phoneNumber,
            location: location,
            bio: bio,
            accountType: accountType,
            visitedChurchesJson: visitedChurchesJson,
            favoriteChurchesJson: favoriteChurchesJson,
            forVisitChurchesJson: forVisitChurchesJson,
            journalEntriesJson: journalEntriesJson,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastSyncedAt: lastSyncedAt,
            needsSync: needsSync,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String email,
            required String displayName,
            Value<String?> phoneNumber = const Value.absent(),
            Value<String?> location = const Value.absent(),
            Value<String?> bio = const Value.absent(),
            Value<String> accountType = const Value.absent(),
            Value<String> visitedChurchesJson = const Value.absent(),
            Value<String> favoriteChurchesJson = const Value.absent(),
            Value<String> forVisitChurchesJson = const Value.absent(),
            Value<String> journalEntriesJson = const Value.absent(),
            required DateTime createdAt,
            required DateTime updatedAt,
            Value<DateTime?> lastSyncedAt = const Value.absent(),
            Value<bool> needsSync = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineUserProfilesCompanion.insert(
            id: id,
            email: email,
            displayName: displayName,
            phoneNumber: phoneNumber,
            location: location,
            bio: bio,
            accountType: accountType,
            visitedChurchesJson: visitedChurchesJson,
            favoriteChurchesJson: favoriteChurchesJson,
            forVisitChurchesJson: forVisitChurchesJson,
            journalEntriesJson: journalEntriesJson,
            createdAt: createdAt,
            updatedAt: updatedAt,
            lastSyncedAt: lastSyncedAt,
            needsSync: needsSync,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$OfflineUserProfilesTableProcessedTableManager = ProcessedTableManager<
    _$OfflineDatabase,
    $OfflineUserProfilesTable,
    OfflineUserData,
    $$OfflineUserProfilesTableFilterComposer,
    $$OfflineUserProfilesTableOrderingComposer,
    $$OfflineUserProfilesTableAnnotationComposer,
    $$OfflineUserProfilesTableCreateCompanionBuilder,
    $$OfflineUserProfilesTableUpdateCompanionBuilder,
    (
      OfflineUserData,
      BaseReferences<_$OfflineDatabase, $OfflineUserProfilesTable,
          OfflineUserData>
    ),
    OfflineUserData,
    PrefetchHooks Function()>;
typedef $$OfflineSyncLogsTableCreateCompanionBuilder = OfflineSyncLogsCompanion
    Function({
  Value<int> id,
  required String entityType,
  required String entityId,
  required String operation,
  Value<String?> dataJson,
  required DateTime timestamp,
  Value<bool> synced,
  Value<String?> error,
  Value<int> retryCount,
});
typedef $$OfflineSyncLogsTableUpdateCompanionBuilder = OfflineSyncLogsCompanion
    Function({
  Value<int> id,
  Value<String> entityType,
  Value<String> entityId,
  Value<String> operation,
  Value<String?> dataJson,
  Value<DateTime> timestamp,
  Value<bool> synced,
  Value<String?> error,
  Value<int> retryCount,
});

class $$OfflineSyncLogsTableFilterComposer
    extends Composer<_$OfflineDatabase, $OfflineSyncLogsTable> {
  $$OfflineSyncLogsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get entityType => $composableBuilder(
      column: $table.entityType, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get entityId => $composableBuilder(
      column: $table.entityId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get operation => $composableBuilder(
      column: $table.operation, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get dataJson => $composableBuilder(
      column: $table.dataJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get timestamp => $composableBuilder(
      column: $table.timestamp, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get synced => $composableBuilder(
      column: $table.synced, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get error => $composableBuilder(
      column: $table.error, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => ColumnFilters(column));
}

class $$OfflineSyncLogsTableOrderingComposer
    extends Composer<_$OfflineDatabase, $OfflineSyncLogsTable> {
  $$OfflineSyncLogsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get entityType => $composableBuilder(
      column: $table.entityType, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get entityId => $composableBuilder(
      column: $table.entityId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get operation => $composableBuilder(
      column: $table.operation, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get dataJson => $composableBuilder(
      column: $table.dataJson, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get timestamp => $composableBuilder(
      column: $table.timestamp, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get synced => $composableBuilder(
      column: $table.synced, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get error => $composableBuilder(
      column: $table.error, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => ColumnOrderings(column));
}

class $$OfflineSyncLogsTableAnnotationComposer
    extends Composer<_$OfflineDatabase, $OfflineSyncLogsTable> {
  $$OfflineSyncLogsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get entityType => $composableBuilder(
      column: $table.entityType, builder: (column) => column);

  GeneratedColumn<String> get entityId =>
      $composableBuilder(column: $table.entityId, builder: (column) => column);

  GeneratedColumn<String> get operation =>
      $composableBuilder(column: $table.operation, builder: (column) => column);

  GeneratedColumn<String> get dataJson =>
      $composableBuilder(column: $table.dataJson, builder: (column) => column);

  GeneratedColumn<DateTime> get timestamp =>
      $composableBuilder(column: $table.timestamp, builder: (column) => column);

  GeneratedColumn<bool> get synced =>
      $composableBuilder(column: $table.synced, builder: (column) => column);

  GeneratedColumn<String> get error =>
      $composableBuilder(column: $table.error, builder: (column) => column);

  GeneratedColumn<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => column);
}

class $$OfflineSyncLogsTableTableManager extends RootTableManager<
    _$OfflineDatabase,
    $OfflineSyncLogsTable,
    OfflineSyncLog,
    $$OfflineSyncLogsTableFilterComposer,
    $$OfflineSyncLogsTableOrderingComposer,
    $$OfflineSyncLogsTableAnnotationComposer,
    $$OfflineSyncLogsTableCreateCompanionBuilder,
    $$OfflineSyncLogsTableUpdateCompanionBuilder,
    (
      OfflineSyncLog,
      BaseReferences<_$OfflineDatabase, $OfflineSyncLogsTable, OfflineSyncLog>
    ),
    OfflineSyncLog,
    PrefetchHooks Function()> {
  $$OfflineSyncLogsTableTableManager(
      _$OfflineDatabase db, $OfflineSyncLogsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OfflineSyncLogsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OfflineSyncLogsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OfflineSyncLogsTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> entityType = const Value.absent(),
            Value<String> entityId = const Value.absent(),
            Value<String> operation = const Value.absent(),
            Value<String?> dataJson = const Value.absent(),
            Value<DateTime> timestamp = const Value.absent(),
            Value<bool> synced = const Value.absent(),
            Value<String?> error = const Value.absent(),
            Value<int> retryCount = const Value.absent(),
          }) =>
              OfflineSyncLogsCompanion(
            id: id,
            entityType: entityType,
            entityId: entityId,
            operation: operation,
            dataJson: dataJson,
            timestamp: timestamp,
            synced: synced,
            error: error,
            retryCount: retryCount,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String entityType,
            required String entityId,
            required String operation,
            Value<String?> dataJson = const Value.absent(),
            required DateTime timestamp,
            Value<bool> synced = const Value.absent(),
            Value<String?> error = const Value.absent(),
            Value<int> retryCount = const Value.absent(),
          }) =>
              OfflineSyncLogsCompanion.insert(
            id: id,
            entityType: entityType,
            entityId: entityId,
            operation: operation,
            dataJson: dataJson,
            timestamp: timestamp,
            synced: synced,
            error: error,
            retryCount: retryCount,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$OfflineSyncLogsTableProcessedTableManager = ProcessedTableManager<
    _$OfflineDatabase,
    $OfflineSyncLogsTable,
    OfflineSyncLog,
    $$OfflineSyncLogsTableFilterComposer,
    $$OfflineSyncLogsTableOrderingComposer,
    $$OfflineSyncLogsTableAnnotationComposer,
    $$OfflineSyncLogsTableCreateCompanionBuilder,
    $$OfflineSyncLogsTableUpdateCompanionBuilder,
    (
      OfflineSyncLog,
      BaseReferences<_$OfflineDatabase, $OfflineSyncLogsTable, OfflineSyncLog>
    ),
    OfflineSyncLog,
    PrefetchHooks Function()>;
typedef $$OfflineImageCachesTableCreateCompanionBuilder
    = OfflineImageCachesCompanion Function({
  required String id,
  required String url,
  required String localPath,
  required int sizeBytes,
  required DateTime cachedAt,
  required DateTime lastAccessedAt,
  Value<bool> isPermanent,
  Value<int> rowid,
});
typedef $$OfflineImageCachesTableUpdateCompanionBuilder
    = OfflineImageCachesCompanion Function({
  Value<String> id,
  Value<String> url,
  Value<String> localPath,
  Value<int> sizeBytes,
  Value<DateTime> cachedAt,
  Value<DateTime> lastAccessedAt,
  Value<bool> isPermanent,
  Value<int> rowid,
});

class $$OfflineImageCachesTableFilterComposer
    extends Composer<_$OfflineDatabase, $OfflineImageCachesTable> {
  $$OfflineImageCachesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get url => $composableBuilder(
      column: $table.url, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get localPath => $composableBuilder(
      column: $table.localPath, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get sizeBytes => $composableBuilder(
      column: $table.sizeBytes, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get cachedAt => $composableBuilder(
      column: $table.cachedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get lastAccessedAt => $composableBuilder(
      column: $table.lastAccessedAt,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isPermanent => $composableBuilder(
      column: $table.isPermanent, builder: (column) => ColumnFilters(column));
}

class $$OfflineImageCachesTableOrderingComposer
    extends Composer<_$OfflineDatabase, $OfflineImageCachesTable> {
  $$OfflineImageCachesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<String> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get url => $composableBuilder(
      column: $table.url, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get localPath => $composableBuilder(
      column: $table.localPath, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get sizeBytes => $composableBuilder(
      column: $table.sizeBytes, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get cachedAt => $composableBuilder(
      column: $table.cachedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get lastAccessedAt => $composableBuilder(
      column: $table.lastAccessedAt,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isPermanent => $composableBuilder(
      column: $table.isPermanent, builder: (column) => ColumnOrderings(column));
}

class $$OfflineImageCachesTableAnnotationComposer
    extends Composer<_$OfflineDatabase, $OfflineImageCachesTable> {
  $$OfflineImageCachesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<String> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get url =>
      $composableBuilder(column: $table.url, builder: (column) => column);

  GeneratedColumn<String> get localPath =>
      $composableBuilder(column: $table.localPath, builder: (column) => column);

  GeneratedColumn<int> get sizeBytes =>
      $composableBuilder(column: $table.sizeBytes, builder: (column) => column);

  GeneratedColumn<DateTime> get cachedAt =>
      $composableBuilder(column: $table.cachedAt, builder: (column) => column);

  GeneratedColumn<DateTime> get lastAccessedAt => $composableBuilder(
      column: $table.lastAccessedAt, builder: (column) => column);

  GeneratedColumn<bool> get isPermanent => $composableBuilder(
      column: $table.isPermanent, builder: (column) => column);
}

class $$OfflineImageCachesTableTableManager extends RootTableManager<
    _$OfflineDatabase,
    $OfflineImageCachesTable,
    OfflineImageCache,
    $$OfflineImageCachesTableFilterComposer,
    $$OfflineImageCachesTableOrderingComposer,
    $$OfflineImageCachesTableAnnotationComposer,
    $$OfflineImageCachesTableCreateCompanionBuilder,
    $$OfflineImageCachesTableUpdateCompanionBuilder,
    (
      OfflineImageCache,
      BaseReferences<_$OfflineDatabase, $OfflineImageCachesTable,
          OfflineImageCache>
    ),
    OfflineImageCache,
    PrefetchHooks Function()> {
  $$OfflineImageCachesTableTableManager(
      _$OfflineDatabase db, $OfflineImageCachesTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OfflineImageCachesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OfflineImageCachesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OfflineImageCachesTableAnnotationComposer(
                  $db: db, $table: table),
          updateCompanionCallback: ({
            Value<String> id = const Value.absent(),
            Value<String> url = const Value.absent(),
            Value<String> localPath = const Value.absent(),
            Value<int> sizeBytes = const Value.absent(),
            Value<DateTime> cachedAt = const Value.absent(),
            Value<DateTime> lastAccessedAt = const Value.absent(),
            Value<bool> isPermanent = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineImageCachesCompanion(
            id: id,
            url: url,
            localPath: localPath,
            sizeBytes: sizeBytes,
            cachedAt: cachedAt,
            lastAccessedAt: lastAccessedAt,
            isPermanent: isPermanent,
            rowid: rowid,
          ),
          createCompanionCallback: ({
            required String id,
            required String url,
            required String localPath,
            required int sizeBytes,
            required DateTime cachedAt,
            required DateTime lastAccessedAt,
            Value<bool> isPermanent = const Value.absent(),
            Value<int> rowid = const Value.absent(),
          }) =>
              OfflineImageCachesCompanion.insert(
            id: id,
            url: url,
            localPath: localPath,
            sizeBytes: sizeBytes,
            cachedAt: cachedAt,
            lastAccessedAt: lastAccessedAt,
            isPermanent: isPermanent,
            rowid: rowid,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$OfflineImageCachesTableProcessedTableManager = ProcessedTableManager<
    _$OfflineDatabase,
    $OfflineImageCachesTable,
    OfflineImageCache,
    $$OfflineImageCachesTableFilterComposer,
    $$OfflineImageCachesTableOrderingComposer,
    $$OfflineImageCachesTableAnnotationComposer,
    $$OfflineImageCachesTableCreateCompanionBuilder,
    $$OfflineImageCachesTableUpdateCompanionBuilder,
    (
      OfflineImageCache,
      BaseReferences<_$OfflineDatabase, $OfflineImageCachesTable,
          OfflineImageCache>
    ),
    OfflineImageCache,
    PrefetchHooks Function()>;

class $OfflineDatabaseManager {
  final _$OfflineDatabase _db;
  $OfflineDatabaseManager(this._db);
  $$OfflineChurchesTableTableManager get offlineChurches =>
      $$OfflineChurchesTableTableManager(_db, _db.offlineChurches);
  $$OfflineAnnouncementsTableTableManager get offlineAnnouncements =>
      $$OfflineAnnouncementsTableTableManager(_db, _db.offlineAnnouncements);
  $$OfflineUserProfilesTableTableManager get offlineUserProfiles =>
      $$OfflineUserProfilesTableTableManager(_db, _db.offlineUserProfiles);
  $$OfflineSyncLogsTableTableManager get offlineSyncLogs =>
      $$OfflineSyncLogsTableTableManager(_db, _db.offlineSyncLogs);
  $$OfflineImageCachesTableTableManager get offlineImageCaches =>
      $$OfflineImageCachesTableTableManager(_db, _db.offlineImageCaches);
}
