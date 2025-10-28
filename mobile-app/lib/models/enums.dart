/// Domain enums & helpers
library;

enum Diocese { tagbilaran, talibon }

enum AnnouncementScope { diocese, parish }

enum HeritageClassification {
  none,
  icp,
  nct,
  nonHeritage,
  parishChurch,
  pilgrimageSite,
  historicalShrine
}

enum ArchitecturalStyle {
  baroque,
  gothic,
  romanesque,
  neoclassical,
  modern,
  mixed,
  colonial,
  neoGothic,
  modernContemporary,
  other
}

extension DioceseX on Diocese {
  String get label {
    switch (this) {
      case Diocese.tagbilaran:
        return 'Diocese of Tagbilaran';
      case Diocese.talibon:
        return 'Diocese of Talibon';
    }
  }

  static Diocese fromLabel(String? value) {
    if (value == 'Diocese of Talibon') return Diocese.talibon;
    return Diocese.tagbilaran; // default
  }
}

extension AnnouncementScopeX on AnnouncementScope {
  String get label {
    switch (this) {
      case AnnouncementScope.diocese:
        return 'diocese';
      case AnnouncementScope.parish:
        return 'parish';
    }
  }

  static AnnouncementScope fromLabel(String? value) {
    if (value == 'parish') return AnnouncementScope.parish;
    return AnnouncementScope.diocese;
  }
}

extension HeritageClassificationX on HeritageClassification {
  String get label {
    switch (this) {
      case HeritageClassification.none:
        return 'None';
      case HeritageClassification.icp:
        return 'Important Cultural Property (ICP)';
      case HeritageClassification.nct:
        return 'National Cultural Treasure (NCT)';
      case HeritageClassification.nonHeritage:
        return 'Non-Heritage';
      case HeritageClassification.parishChurch:
        return 'Parish Church';
      case HeritageClassification.pilgrimageSite:
        return 'Pilgrimage Site';
      case HeritageClassification.historicalShrine:
        return 'Historical Shrine';
    }
  }

  String get shortLabel {
    switch (this) {
      case HeritageClassification.none:
        return 'Regular';
      case HeritageClassification.icp:
        return 'ICP';
      case HeritageClassification.nct:
        return 'NCT';
      case HeritageClassification.nonHeritage:
        return 'Non-Heritage';
      case HeritageClassification.parishChurch:
        return 'Parish';
      case HeritageClassification.pilgrimageSite:
        return 'Pilgrimage';
      case HeritageClassification.historicalShrine:
        return 'Shrine';
    }
  }

  static HeritageClassification fromLabel(String? value) {
    switch (value?.toLowerCase()) {
      case 'icp':
      case 'important cultural property':
        return HeritageClassification.icp;
      case 'nct':
      case 'national cultural treasure':
        return HeritageClassification.nct;
      case 'non_heritage':
      case 'non-heritage':
        return HeritageClassification.nonHeritage;
      case 'parish_church':
      case 'parish church':
        return HeritageClassification.parishChurch;
      case 'pilgrimage_site':
      case 'pilgrimage site':
        return HeritageClassification.pilgrimageSite;
      case 'historical_shrine':
      case 'historical shrine':
        return HeritageClassification.historicalShrine;
      default:
        return HeritageClassification.none;
    }
  }
}

extension ArchitecturalStyleX on ArchitecturalStyle {
  String get label {
    switch (this) {
      case ArchitecturalStyle.baroque:
        return 'Baroque';
      case ArchitecturalStyle.gothic:
        return 'Gothic';
      case ArchitecturalStyle.romanesque:
        return 'Romanesque';
      case ArchitecturalStyle.neoclassical:
        return 'Neoclassical';
      case ArchitecturalStyle.modern:
        return 'Modern';
      case ArchitecturalStyle.mixed:
        return 'Mixed';
      case ArchitecturalStyle.colonial:
        return 'Colonial';
      case ArchitecturalStyle.neoGothic:
        return 'Neo-Gothic';
      case ArchitecturalStyle.modernContemporary:
        return 'Modern Contemporary';
      case ArchitecturalStyle.other:
        return 'Other';
    }
  }

  static ArchitecturalStyle fromLabel(String? value) {
    switch (value?.toLowerCase()) {
      case 'baroque':
        return ArchitecturalStyle.baroque;
      case 'gothic':
        return ArchitecturalStyle.gothic;
      case 'neo-gothic':
        return ArchitecturalStyle.neoGothic;
      case 'romanesque':
        return ArchitecturalStyle.romanesque;
      case 'neoclassical':
      case 'neo-classical':
        return ArchitecturalStyle.neoclassical;
      case 'modern':
      case 'contemporary':
        return ArchitecturalStyle.modern;
      case 'mixed':
        return ArchitecturalStyle.mixed;
      case 'modern contemporary':
      case 'moderncontemporary':
        return ArchitecturalStyle.modernContemporary;
      default:
        return ArchitecturalStyle.other;
    }
  }
}
