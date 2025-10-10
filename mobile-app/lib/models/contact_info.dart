class ContactInfo {
  final String? phone;
  final String? email;
  final String? website;
  final String? facebookPage;

  const ContactInfo({
    this.phone,
    this.email,
    this.website,
    this.facebookPage,
  });

  factory ContactInfo.fromJson(Map<String, dynamic> json) => ContactInfo(
        phone: json['phone'] as String?,
        email: json['email'] as String?,
        website: json['website'] as String?,
        facebookPage: json['facebookPage'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'phone': phone,
        'email': email,
        'website': website,
        'facebookPage': facebookPage,
      };

  bool get hasAnyContact =>
      phone?.isNotEmpty == true ||
      email?.isNotEmpty == true ||
      website?.isNotEmpty == true ||
      facebookPage?.isNotEmpty == true;

  @override
  String toString() =>
      'ContactInfo(phone: $phone, email: $email, website: $website, facebookPage: $facebookPage)';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ContactInfo &&
          runtimeType == other.runtimeType &&
          phone == other.phone &&
          email == other.email &&
          website == other.website &&
          facebookPage == other.facebookPage;

  @override
  int get hashCode =>
      phone.hashCode ^
      email.hashCode ^
      website.hashCode ^
      facebookPage.hashCode;
}