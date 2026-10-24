import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/utils/date_format.dart';
import '../../kids/domain/entities/child.dart';
import '../domain/entities/incident.dart';

class IncidentsRepository {
  IncidentsRepository(this._t);

  /// Raiz da igreja ativa: `tenants/{churchId}`.
  final DocumentReference<Map<String, dynamic>> _t;

  Stream<List<Incident>> watchAll() => _t
      .collection('incidents')
      .orderBy('createdAt', descending: true)
      .limit(500)
      .snapshots()
      .map((s) => s.docs.map((d) => Incident.fromMap(d.id, d.data())).toList());

  /// Só as enviadas aos pais, dos filhos da família (as regras exigem o filtro).
  Stream<List<Incident>> watchShared(String familyId) => _t
      .collection('incidents')
      .where('familyId', isEqualTo: familyId)
      .where('sharedWithFamily', isEqualTo: true)
      .snapshots()
      .map(
        (s) =>
            s.docs.map((d) => Incident.fromMap(d.id, d.data())).toList()
              ..sort((a, b) => b.createdAt.compareTo(a.createdAt)),
      );

  Future<void> create({
    required Child child,
    required String kind,
    required String text,
    required bool sharedWithFamily,
    required List<String> involvedChildIds,
    required String authorId,
    required String authorName,
  }) async {
    await _t.collection('incidents').add({
      'childId': child.id,
      'classId': child.classId,
      'kind': kind,
      'text': text.trim(),
      'involvedChildIds': involvedChildIds.where((x) => x != child.id).toList(),
      'familyId': child.familyId,
      'sharedWithFamily': sharedWithFamily,
      'authorId': authorId,
      'authorName': authorName,
      'createdAt': nowIso(),
    });
    // Sem o texto na auditoria: pode conter detalhe sensível.
    await _audit(
      authorId,
      authorName,
      'Ocorrência registrada — ${child.fullName}',
    );
  }

  Future<void> update(
    Incident i, {
    required Child child,
    required String kind,
    required String text,
    required bool sharedWithFamily,
    required List<String> involvedChildIds,
    required String uid,
    required String userName,
  }) async {
    await _t.collection('incidents').doc(i.id).update({
      'kind': kind,
      'text': text.trim(),
      'involvedChildIds': involvedChildIds.where((x) => x != child.id).toList(),
      'sharedWithFamily': sharedWithFamily,
      'updatedAt': nowIso(),
    });
    await _audit(uid, userName, 'Ocorrência editada — ${child.fullName}');
  }

  Future<void> delete(
    Incident i, {
    required String uid,
    required String userName,
  }) async {
    await _t.collection('incidents').doc(i.id).delete();
    await _audit(uid, userName, 'Ocorrência removida');
  }

  Future<void> _audit(String uid, String user, String action) async {
    try {
      await _t.collection('audit').add({
        'at': nowIso(),
        'uid': uid,
        'user': user,
        'action': action,
      });
    } catch (_) {}
  }
}
