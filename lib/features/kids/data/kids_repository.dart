import 'package:cloud_firestore/cloud_firestore.dart';

import '../domain/entities/child.dart';
import '../domain/entities/classroom.dart';
import '../domain/entities/person.dart';
import '../domain/entities/presence.dart';

/// Leitura dos cadastros (crianças, turmas, pessoas, presença).
/// Somente leitura: o cadastro é feito no painel web.
class KidsRepository {
  KidsRepository(this._t);

  /// Raiz da igreja ativa: `tenants/{churchId}`.
  final DocumentReference<Map<String, dynamic>> _t;

  Stream<List<Child>> watchChildren() => _t
      .collection('children')
      .snapshots()
      .map(
        (s) =>
            s.docs.map((d) => Child.fromMap(d.id, d.data())).toList()
              ..sort((a, b) => a.fullName.compareTo(b.fullName)),
      );

  Stream<List<Child>> watchFamilyChildren(String familyId) => _t
      .collection('children')
      .where('familyId', isEqualTo: familyId)
      .snapshots()
      .map((s) => s.docs.map((d) => Child.fromMap(d.id, d.data())).toList());

  Stream<List<Classroom>> watchClasses() => _t
      .collection('classes')
      .snapshots()
      .map(
        (s) =>
            s.docs.map((d) => Classroom.fromMap(d.id, d.data())).toList()
              ..sort((a, b) => a.name.compareTo(b.name)),
      );

  /// Quem está na sala agora (equipe).
  Stream<List<Presence>> watchPresence() => _t
      .collection('presence')
      .snapshots()
      .map((s) => s.docs.map((d) => Presence.fromMap(d.id, d.data())).toList());

  /// Presença de uma criança (família: leitura por documento).
  Stream<Presence?> watchChildPresence(String childId) => _t
      .collection('presence')
      .doc(childId)
      .snapshots()
      .map((s) => s.exists ? Presence.fromMap(childId, s.data()!) : null);

  /// Responsáveis + autorizados de uma família.
  Stream<List<Person>> watchPeople(String familyId) {
    Stream<List<Person>> of(PersonKind k) => _t
        .collection(k.collection)
        .where('familyId', isEqualTo: familyId)
        .snapshots()
        .map(
          (s) => s.docs.map((d) => Person.fromMap(d.id, d.data(), k)).toList(),
        );
    return _combine(of(PersonKind.guardian), of(PersonKind.authorized));
  }

  Future<List<Person>> getPeople(String familyId) async {
    Future<List<Person>> of(PersonKind k) async {
      final s =
          await _t
              .collection(k.collection)
              .where('familyId', isEqualTo: familyId)
              .get();
      return s.docs.map((d) => Person.fromMap(d.id, d.data(), k)).toList();
    }

    return [
      ...await of(PersonKind.guardian),
      ...await of(PersonKind.authorized),
    ];
  }

  /// Localiza o crachá pelo token do QR (`EK:<token>`).
  Future<String?> childIdFromBadgeToken(String token) async {
    final s =
        await _t
            .collection('badges')
            .where('token', isEqualTo: token)
            .where('status', isEqualTo: 'ativo')
            .limit(1)
            .get();
    if (s.docs.isEmpty) return null;
    return s.docs.first.data()['childId'] as String?;
  }

  Stream<List<Person>> _combine(
    Stream<List<Person>> a,
    Stream<List<Person>> b,
  ) async* {
    var la = <Person>[];
    var lb = <Person>[];
    var hasA = false;
    var hasB = false;
    await for (final e in _merge(a.map((v) => (0, v)), b.map((v) => (1, v)))) {
      if (e.$1 == 0) {
        la = e.$2;
        hasA = true;
      } else {
        lb = e.$2;
        hasB = true;
      }
      if (hasA && hasB) yield [...la, ...lb];
    }
  }

  Stream<T> _merge<T>(Stream<T> a, Stream<T> b) {
    late final Stream<T> merged;
    merged = Stream<T>.multi((c) {
      final subs = [
        a.listen(c.addSync, onError: c.addErrorSync),
        b.listen(c.addSync, onError: c.addErrorSync),
      ];
      c.onCancel = () {
        for (final s in subs) {
          s.cancel();
        }
      };
    });
    return merged;
  }
}
