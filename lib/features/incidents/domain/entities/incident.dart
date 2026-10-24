/// Ocorrência na sala registrada pela equipe (`tenants/{id}/incidents`).
/// Nunca é visível à família.
class Incident {
  const Incident({
    required this.id,
    required this.childId,
    required this.classId,
    required this.kind,
    required this.text,
    required this.authorId,
    required this.authorName,
    required this.createdAt,
    this.involvedChildIds = const [],
    this.edited = false,
    this.familyId,
    this.sharedWithFamily = false,
  });

  final String id;
  final String childId;
  final String classId;
  final String kind;
  final String text;
  final String authorId;
  final String authorName;
  final String createdAt;
  final List<String> involvedChildIds;
  final bool edited;
  final String? familyId;

  /// Enviada aos pais: só então a família enxerga a ocorrência.
  final bool sharedWithFamily;

  static const kinds = {
    'briga': 'Briga ou conflito',
    'mordida': 'Mordida',
    'comportamento': 'Mau comportamento',
    'machucado': 'Machucado ou queda',
    'outro': 'Outro',
  };

  String get kindLabel => kinds[kind] ?? 'Ocorrência';

  factory Incident.fromMap(String id, Map<String, dynamic> m) => Incident(
    id: id,
    childId: (m['childId'] as String?) ?? '',
    classId: (m['classId'] as String?) ?? '',
    kind: (m['kind'] as String?) ?? 'outro',
    text: (m['text'] as String?) ?? '',
    authorId: (m['authorId'] as String?) ?? '',
    authorName: (m['authorName'] as String?) ?? '',
    createdAt: (m['createdAt'] as String?) ?? '',
    involvedChildIds: List<String>.from(
      m['involvedChildIds'] as List? ?? const [],
    ),
    edited: m['updatedAt'] != null,
    familyId: m['familyId'] as String?,
    sharedWithFamily: m['sharedWithFamily'] == true,
  );
}
