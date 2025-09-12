class VisitaUser {
  final String id;
  final String name;
  final String? email;
  final String? phone;

  VisitaUser({required this.id, required this.name, this.email, this.phone});

  factory VisitaUser.fromJson(Map<String, dynamic> j) => VisitaUser(
        id: j['id'] ?? '',
        name: j['name'] ?? '',
        email: j['email'],
        phone: j['phone'],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'phone': phone,
      };
}
