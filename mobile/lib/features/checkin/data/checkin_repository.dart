import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/errors/failures.dart';
import '../../../core/utils/date_format.dart';
import '../../kids/domain/entities/child.dart';
import '../../kids/domain/entities/person.dart';
import '../domain/entities/checkin_request.dart';

/// Entrada/saída oficiais e pedidos da família.
///
/// Usa o mesmo desenho do painel web: `presence/{childId}` + transação
/// garantem que não exista entrada duplicada, mesmo com dois aparelhos.
class CheckinRepository {
  CheckinRepository(this._t);

  /// Raiz da igreja ativa: `tenants/{churchId}`.
  final DocumentReference<Map<String, dynamic>> _t;

  Future<void> checkIn({
    required Child child,
    required String droppedBy,
    required String staffUid,
    required String staffName,
  }) async {
    final att = _t.collection('attendance').doc();
    final pref = _t.collection('presence').doc(child.id);
    final dup = await _t.firestore.runTransaction((tx) async {
      if ((await tx.get(pref)).exists) return true;
      final at = nowIso();
      tx.set(pref, {'attendanceId': att.id, 'at': at});
      tx.set(att, {
        'childId': child.id,
        'checkInAt': at,
        'droppedBy': droppedBy,
        'by': staffUid,
      });
      return false;
    });
    if (dup) {
      throw const Failure(
        'Esta criança já possui entrada registrada e ainda não saiu.',
      );
    }
    await _audit(
      staffUid,
      staffName,
      'Check-in de ${child.fullName} (entregue por $droppedBy)',
    );
  }

  Future<void> checkOut({
    required Child child,
    required Person person,
    required String staffUid,
    required String staffName,
  }) async {
    final pref = _t.collection('presence').doc(child.id);
    final ok = await _t.firestore.runTransaction((tx) async {
      final p = await tx.get(pref);
      if (!p.exists) return false;
      tx.update(_t.collection('attendance').doc(p.data()!['attendanceId']), {
        'checkOutAt': nowIso(),
        'pickedUpBy': person.fullName,
        'pickedUpById': person.id,
      });
      tx.delete(pref);
      return true;
    });
    if (!ok)
      throw const Failure('Não há entrada registrada para esta criança.');

    // Encerra chamadas abertas dessa criança.
    final calls =
        await _t
            .collection('calls')
            .where('childId', isEqualTo: child.id)
            .get();
    for (final c in calls.docs) {
      final status = c.data()['status'];
      if (status == 'atendida' || status == 'cancelada') continue;
      await c.reference.update({
        'status': 'atendida',
        'history': FieldValue.arrayUnion([
          {'status': 'atendida', 'at': nowIso()},
        ]),
      });
    }
    await _audit(
      staffUid,
      staffName,
      'Check-out de ${child.fullName} por ${person.fullName}',
    );
  }

  /// Registra tentativa bloqueada (auditoria + alerta para a coordenação).
  Future<void> logBlocked({
    required Child child,
    required String personName,
    required String reason,
    required String staffUid,
    required String staffName,
  }) async {
    await _audit(
      staffUid,
      staffName,
      'Retirada BLOQUEADA de ${child.fullName} por $personName: $reason',
    );
    await _t.collection('notifications').add({
      'category': 'alerta',
      'title': 'Tentativa de retirada não autorizada — ${child.displayName}',
      'recipient': 'Coordenação',
      'createdAt': nowIso(),
      'delivery': 'pendente',
      'read': false,
    });
  }

  // ---- pedidos da família --------------------------------------------------

  Stream<List<CheckinRequest>> watchPending() => _t
      .collection('checkinRequests')
      .where('status', isEqualTo: 'pendente')
      .snapshots()
      .map(
        (s) =>
            s.docs.map((d) => CheckinRequest.fromMap(d.id, d.data())).toList()
              ..sort((a, b) => a.createdAt.compareTo(b.createdAt)),
      );

  Stream<List<CheckinRequest>> watchFamilyRequests(String familyId) => _t
      .collection('checkinRequests')
      .where('familyId', isEqualTo: familyId)
      .snapshots()
      .map(
        (s) =>
            s.docs.map((d) => CheckinRequest.fromMap(d.id, d.data())).toList()
              ..sort((a, b) => b.createdAt.compareTo(a.createdAt)),
      );

  Future<void> createRequest({
    required Child child,
    required String kind,
    required String requesterUid,
    required String requesterName,
    String? personId,
    String? personKind,
  }) => _t.collection('checkinRequests').add({
    'childId': child.id,
    'familyId': child.familyId,
    'kind': kind,
    'status': 'pendente',
    'requesterUid': requesterUid,
    'requesterName': requesterName,
    'personId': personId,
    'personKind': personKind,
    'createdAt': nowIso(),
  });

  Future<void> resolveRequest(String id, String status, String staffUid) =>
      _t.collection('checkinRequests').doc(id).update({
        'status': status,
        'resolvedBy': staffUid,
        'resolvedAt': nowIso(),
      });

  Future<void> cancelRequest(String id) => _t
      .collection('checkinRequests')
      .doc(id)
      .update({'status': 'cancelado', 'resolvedAt': nowIso()});

  Future<void> _audit(String uid, String user, String action) => _t
      .collection('audit')
      .add({'at': nowIso(), 'uid': uid, 'user': user, 'action': action});
}
