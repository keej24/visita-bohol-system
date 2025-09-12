/// Domain enums & helpers

enum Diocese { tagbilaran, talibon }

enum AnnouncementScope { diocese, parish }

enum HeritageClassification { none, icp, nct }

enum ArchitecturalStyle {
  baroque,
  neoGothic,
  romanesque,
  modernContemporary,
  filipino,
  colonial,
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
      case ArchitecturalStyle.neoGothic:
        return 'Neo-Gothic';
      case ArchitecturalStyle.romanesque:
        return 'Romanesque';
      case ArchitecturalStyle.modernContemporary:
        return 'Modern Contemporary';
      case ArchitecturalStyle.filipino:
        return 'Filipino';
      case ArchitecturalStyle.colonial:
        return 'Spanish Colonial';
      case ArchitecturalStyle.other:
        return 'Other';
    }
  }

  static ArchitecturalStyle fromLabel(String? value) {
    switch (value?.toLowerCase()) {
      case 'baroque':
        return ArchitecturalStyle.baroque;
      case 'neo-gothic':
      case 'neogothic':
        return ArchitecturalStyle.neoGothic;
      case 'romanesque':
        return ArchitecturalStyle.romanesque;
      case 'modern contemporary':
      case 'modern':
      case 'contemporary':
        return ArchitecturalStyle.modernContemporary;
      case 'filipino':
        return ArchitecturalStyle.filipino;
      case 'colonial':
      case 'spanish colonial':
        return ArchitecturalStyle.colonial;
      default:
        return ArchitecturalStyle.other;
    }
  }
}
