/// Pedido feito pelo app da família ("estou chegando" / "vou buscar").
/// A equipe confirma na recepção; só então vira entrada/saída oficial.
class CheckinRequest {
  const CheckinRequest({
    required this.id,
    required this.childId,
    required this.familyId,
    required this.kind,
    required this.status,
    required this.requesterUid,
    required this.requesterName,
    required this.createdAt,
    this.personId,
    this.personKind,
  });

  final String id;
  final String childId;
  final String familyId;

  /// 'entrada' | 'saida'
  final String kind;

  /// 'pendente' | 'confirmado' | 'recusado' | 'cancelado'
  final String status;
  final String requesterUid;
  final String requesterName;
  final String createdAt;
  final String? personId;
  final String? personKind;

  bool get pending => status == 'pendente';
  bool get isEntry => kind == 'entrada';

  factory CheckinRequest.fromMap(String id, Map<String, dynamic> m) =>
      CheckinRequest(
        id: id,
        childId: (m['childId'] as String?) ?? '',
        familyId: (m['familyId'] as String?) ?? '',
        kind: (m['kind'] as String?) ?? 'entrada',
        status: (m['status'] as String?) ?? 'pendente',
        requesterUid: (m['requesterUid'] as String?) ?? '',
        requesterName: (m['requesterName'] as String?) ?? '',
        createdAt: (m['createdAt'] as String?) ?? '',
        personId: m['personId'] as String?,
        personKind: m['personKind'] as String?,
      );
}
