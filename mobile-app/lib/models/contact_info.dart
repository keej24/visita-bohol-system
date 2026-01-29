class ContactInfo {
  final String? phone;
  final String? email;
  final String? facebookPage;

  const ContactInfo({
    this.phone,
    this.email,
    this.facebookPage,
  });

  factory ContactInfo.fromJson(Map<String, dynamic> json) => ContactInfo(
        phone: json['phone'] as String?,
        email: json['email'] as String?,
        facebookPage: json['facebookPage'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'phone': phone,
        'email': email,
        'facebookPage': facebookPage,
      };

  bool get hasAnyContact =>
      phone?.isNotEmpty == true ||
      email?.isNotEmpty == true ||
      facebookPage?.isNotEmpty == true;

  @override
  String toString() =>
      'ContactInfo(phone: $phone, email: $email, facebookPage: $facebookPage)';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ContactInfo &&
          runtimeType == other.runtimeType &&
          phone == other.phone &&
          email == other.email &&
          facebookPage == other.facebookPage;

  @override
  int get hashCode => phone.hashCode ^ email.hashCode ^ facebookPage.hashCode;
}
