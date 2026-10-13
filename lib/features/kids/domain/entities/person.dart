/// Pessoa ligada à família: responsável legal (`guardians`) ou pessoa
/// autorizada a retirar (`authorized`).
class Person {
  const Person({
    required this.id,
    required this.familyId,
    required this.fullName,
    required this.phone,
    required this.relation,
    required this.kind,
    required this.active,
    this.whatsapp = false,
    this.validUntil,
  });

  final String id;
  final String familyId;
  final String fullName;
  final String phone;
  final String relation;
  final PersonKind kind;
  final bool active;
  final bool whatsapp;

  /// Só para autorizados: data limite (ISO).
  final String? validUntil;

  bool get expired {
    final v = validUntil == null ? null : DateTime.tryParse(validUntil!);
    if (v == null) return false;
    final end = DateTime(v.year, v.month, v.day, 23, 59, 59);
    return DateTime.now().isAfter(end);
  }

  /// Pode retirar crianças hoje?
  bool get canPickUp => active && !expired;

  factory Person.fromMap(String id, Map<String, dynamic> m, PersonKind kind) =>
      Person(
        id: id,
        familyId: (m['familyId'] as String?) ?? '',
        fullName: (m['fullName'] as String?) ?? '',
        phone: (m['phone'] as String?) ?? '',
        relation: (m['relation'] as String?) ?? '',
        kind: kind,
        active: m['active'] != false,
        whatsapp: m['whatsapp'] == true,
        validUntil: m['validUntil'] as String?,
      );
}

enum PersonKind {
  guardian('guardian', 'guardians'),
  authorized('authorized', 'authorized');

  const PersonKind(this.id, this.collection);
  final String id;
  final String collection;
}
