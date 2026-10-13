class GuardianCall {
  const GuardianCall({
    required this.id,
    required this.childId,
    required this.classId,
    required this.reason,
    required this.status,
    required this.createdAt,
    required this.requestedBy,
    this.note = '',
    this.familyId,
  });

  final String id;
  final String childId;
  final String classId;
  final String reason;
  final String status;
  final String createdAt;
  final String requestedBy;
  final String note;
  final String? familyId;

  bool get open => status != 'atendida' && status != 'cancelada';

  static const reasons = {
    'atendimento': 'Precisa de atendimento',
    'desconforto': 'Está desconfortável',
    'cuidados': 'Precisa de cuidados',
    'outro': 'Outro motivo',
  };

  String get reasonLabel => reasons[reason] ?? 'Chamada';

  factory GuardianCall.fromMap(String id, Map<String, dynamic> m) =>
      GuardianCall(
        id: id,
        childId: (m['childId'] as String?) ?? '',
        classId: (m['classId'] as String?) ?? '',
        reason: (m['reason'] as String?) ?? 'outro',
        status: (m['status'] as String?) ?? 'pendente',
        createdAt: (m['createdAt'] as String?) ?? '',
        requestedBy: (m['requestedBy'] as String?) ?? '',
        note: (m['note'] as String?) ?? '',
        familyId: m['familyId'] as String?,
      );
}
