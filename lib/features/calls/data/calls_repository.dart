import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/utils/date_format.dart';
import '../../kids/domain/entities/child.dart';
import '../domain/entities/guardian_call.dart';

class CallsRepository {
  CallsRepository(this._t);

  /// Raiz da igreja ativa: `tenants/{churchId}`.
  final DocumentReference<Map<String, dynamic>> _t;

  /// Chamadas recentes (equipe).
  Stream<List<GuardianCall>> watchAll() => _t
      .collection('calls')
      .orderBy('createdAt', descending: true)
      .limit(100)
      .snapshots()
      .map(
        (s) => s.docs.map((d) => GuardianCall.fromMap(d.id, d.data())).toList(),
      );

  /// Chamadas dos filhos de uma família.
  Stream<List<GuardianCall>> watchFamily(String familyId) => _t
      .collection('calls')
      .where('familyId', isEqualTo: familyId)
      .snapshots()
      .map(
        (s) =>
            s.docs.map((d) => GuardianCall.fromMap(d.id, d.data())).toList()
              ..sort((a, b) => b.createdAt.compareTo(a.createdAt)),
      );

  Future<void> open({
    required Child child,
    required String reason,
    required String note,
    required String staffName,
  }) async {
    final at = nowIso();
    await _t.collection('calls').add({
      'childId': child.id,
      'classId': child.classId,
      'familyId': child.familyId,
      'reason': reason,
      'note': note,
      'requestedBy': staffName,
      'createdAt': at,
      'status': 'pendente',
      'history': [
        {'status': 'pendente', 'at': at},
      ],
    });
    // Título genérico: nada sensível na notificação.
    await _t.collection('notifications').add({
      'category': 'chamada',
      'title': 'Chamada solicitada — ${child.fullName}',
      'recipient': 'Responsáveis',
      'createdAt': at,
      'delivery': 'pendente',
      'read': false,
    });
  }

  Future<void> setStatus(String id, String status) =>
      _t.collection('calls').doc(id).update({
        'status': status,
        'history': FieldValue.arrayUnion([
          {'status': status, 'at': nowIso()},
        ]),
      });
}
