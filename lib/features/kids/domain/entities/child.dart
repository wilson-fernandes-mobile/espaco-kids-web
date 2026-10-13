class Child {
  const Child({
    required this.id,
    required this.code,
    required this.fullName,
    required this.nickname,
    required this.birthDate,
    required this.classId,
    required this.familyId,
    required this.status,
    this.photoUrl,
    this.notes = '',
    this.guardianIds = const [],
    this.authorizedIds = const [],
    this.careAlert = false,
    this.hasMedication = false,
  });

  final String id;
  final String code;
  final String fullName;
  final String nickname;
  final String birthDate;
  final String classId;
  final String familyId;
  final String status;
  final String? photoUrl;
  final String notes;
  final List<String> guardianIds;
  final List<String> authorizedIds;

  /// Selos para a equipe: saúde/cuidados especiais e medicação (sem detalhe).
  final bool careAlert;
  final bool hasMedication;

  bool get active => status == 'ativo';
  String get displayName => nickname.isNotEmpty ? nickname : fullName;

  factory Child.fromMap(String id, Map<String, dynamic> m) => Child(
    id: id,
    code: (m['code'] as String?) ?? '',
    fullName: (m['fullName'] as String?) ?? '',
    nickname: (m['nickname'] as String?) ?? '',
    birthDate: (m['birthDate'] as String?) ?? '',
    classId: (m['classId'] as String?) ?? '',
    familyId: (m['familyId'] as String?) ?? '',
    status: (m['status'] as String?) ?? 'ativo',
    photoUrl: m['photoUrl'] as String?,
    notes: (m['notes'] as String?) ?? '',
    guardianIds: List<String>.from(m['guardianIds'] as List? ?? const []),
    authorizedIds: List<String>.from(m['authorizedIds'] as List? ?? const []),
    careAlert: m['careAlert'] == true,
    hasMedication: m['hasMedication'] == true,
  );
}
