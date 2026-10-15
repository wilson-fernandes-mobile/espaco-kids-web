import 'dart:math';

import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/errors/failures.dart';
import '../../../core/utils/date_format.dart';
import '../../auth/domain/entities/app_user.dart';
import '../../kids/domain/entities/care_profile.dart';
import '../../kids/domain/entities/child.dart';
import '../../kids/domain/entities/person.dart';

/// Dados de uma criança digitados pela família.
class ChildDraft {
  const ChildDraft({
    required this.fullName,
    required this.nickname,
    required this.birthDate,
    this.health = '',
    this.notes = '',
    this.photoUrl,
  });

  /// Foto (data URL). Null mantém a atual; vazio remove.
  final String? photoUrl;
  final String fullName;
  final String nickname;

  /// Data ISO (aaaa-mm-dd).
  final String birthDate;
  final String health;
  final String notes;
}

/// Cadastro feito pela própria família: a pessoa entra com o código da igreja
/// e registra a família, as crianças e quem pode buscá-las.
class FamilyRepository {
  FamilyRepository(this._db);

  final FirebaseFirestore _db;
  final _rnd = Random.secure();

  DocumentReference<Map<String, dynamic>> _tenant(String churchId) =>
      _db.collection('tenants').doc(churchId);

  /// Cria a família (com o id do usuário), vincula a conta a ela, cadastra a
  /// própria pessoa como responsável e, se vier, a primeira criança.
  Future<void> registerFamily({
    required AppUser user,
    required String phone,
    required bool whatsapp,
    ChildDraft? child,
  }) async {
    final t = _tenant(user.churchId);
    final fid = user.uid;
    final parts = user.name.trim().split(RegExp(r'\s+'));
    final surname = parts.length > 1 ? parts.last : parts.first;

    try {
      await t.collection('families').doc(fid).set({
        'code': 'APP-${1000 + _rnd.nextInt(9000)}',
        'name': 'Família $surname',
        'phone': phone,
        'email': user.email,
        'ownerUid': user.uid,
      });
    } on FirebaseException catch (e) {
      // Repetição após uma falha no meio do caminho: a família já existe.
      if (e.code != 'permission-denied') rethrow;
    }
    try {
      await t.collection('members').doc(user.uid).update({'familyId': fid});
    } on FirebaseException catch (e) {
      if (e.code == 'permission-denied') {
        throw const Failure(
          'Não foi possível criar sua família. Tente de novo.',
        );
      }
      rethrow;
    }
    await _db
        .collection('users')
        .doc(user.uid)
        .collection('memberships')
        .doc(user.churchId)
        .update({'familyId': fid});

    final gref = t.collection('guardians').doc();
    await gref.set({
      'familyId': fid,
      'fullName': user.name,
      'phone': phone,
      'email': user.email,
      'relation': 'Responsável',
      'whatsapp': whatsapp,
      'contactPref': 'app',
      'active': true,
      'primary': true,
    });
    await t.collection('members').doc(user.uid).update({
      'personId': gref.id,
      'personKind': 'guardian',
    });
    if (child != null) {
      await addChild(
        churchId: user.churchId,
        uid: user.uid,
        familyId: fid,
        draft: child,
      );
    }
  }

  Future<void> addChild({
    required String churchId,
    required String uid,
    required String familyId,
    required ChildDraft draft,
  }) async {
    final t = _tenant(churchId);
    final guardians =
        await t
            .collection('guardians')
            .where('familyId', isEqualTo: familyId)
            .get();
    final ref = t.collection('children').doc();
    await ref.set({
      'code': 'CR-${10000 + _rnd.nextInt(90000)}',
      'fullName': draft.fullName.trim(),
      'nickname': draft.nickname.trim(),
      'birthDate': draft.birthDate,
      'classId': await _classFor(t, draft.birthDate),
      'familyId': familyId,
      'notes': draft.notes.trim(),
      'status': 'ativo',
      'guardianIds': guardians.docs.map((d) => d.id).toList(),
      // O responsável principal já pode buscar a criança (como no cadastro do painel).
      'authorizedIds':
          guardians.docs
              .where((d) => d.data()['primary'] == true)
              .map((d) => d.id)
              .toList(),
      'createdBy': uid,
      if (draft.photoUrl != null && draft.photoUrl!.isNotEmpty)
        'photoUrl': draft.photoUrl,
    });
    await t.collection('health').doc(ref.id).set({
      'text': draft.health.trim(),
    }, SetOptions(merge: true));
  }

  Future<void> updateChild({
    required String churchId,
    required String childId,
    required ChildDraft draft,
  }) async {
    final t = _tenant(churchId);
    await t.collection('children').doc(childId).update({
      'fullName': draft.fullName.trim(),
      'nickname': draft.nickname.trim(),
      'birthDate': draft.birthDate,
      'notes': draft.notes.trim(),
      if (draft.photoUrl != null)
        'photoUrl':
            draft.photoUrl!.isEmpty ? FieldValue.delete() : draft.photoUrl,
    });
    await t.collection('health').doc(childId).set({
      'text': draft.health.trim(),
    }, SetOptions(merge: true));
  }

  /// Saúde e cuidados da criança (null se ainda não há ou sem permissão).
  Stream<CareProfile?> watchCare(String churchId, String childId) =>
      _tenant(churchId)
          .collection('health')
          .doc(childId)
          .snapshots()
          .map((s) => s.exists ? CareProfile.fromMap(s.data()) : null)
          .handleError((_) {});

  Future<void> saveCare({
    required String churchId,
    required String uid,
    required String childId,
    required CareProfile profile,
  }) async {
    final t = _tenant(churchId);
    await t
        .collection('health')
        .doc(childId)
        .set(profile.toMap(nowIso(), uid), SetOptions(merge: true));
    await t.collection('children').doc(childId).update({
      'careAlert': profile.alert,
      'hasMedication': profile.hasMedication,
    });
  }

  Future<String> healthOf(String churchId, String childId) async {
    try {
      final s = await _tenant(churchId).collection('health').doc(childId).get();
      return (s.data()?['text'] as String?) ?? '';
    } on FirebaseException {
      return '';
    }
  }

  /// Turma pela idade (a equipe pode ajustar depois). Vazio se nenhuma serve.
  Future<String> _classFor(
    DocumentReference<Map<String, dynamic>> t,
    String birthIso,
  ) async {
    final b = parseIso(birthIso);
    if (b == null) return '';
    final now = DateTime.now();
    var age = now.year - b.year;
    if (now.month < b.month || (now.month == b.month && now.day < b.day)) age--;
    try {
      final s = await t.collection('classes').get();
      for (final d in s.docs) {
        final m = d.data();
        if (m['active'] == false) continue;
        final min = (m['ageMin'] as num?)?.toInt() ?? 0;
        final max = (m['ageMax'] as num?)?.toInt() ?? 0;
        if (age >= min && age <= max) return d.id;
      }
    } on FirebaseException {
      // Sem turma automática; a equipe define.
    }
    return '';
  }

  /// Inclui um responsável ou pessoa autorizada à família.
  Future<String> addPerson({
    required String churchId,
    required String familyId,
    required PersonKind kind,
    required String fullName,
    required String phone,
    required String relation,
    required bool whatsapp,
    String? validUntil,
    List<Child> children = const [],
  }) async {
    final t = _tenant(churchId);
    final ref = t.collection(kind.collection).doc();
    final isGuardian = kind == PersonKind.guardian;
    await ref.set({
      'familyId': familyId,
      'fullName': fullName.trim(),
      'phone': phone,
      'relation': relation.trim(),
      'active': true,
      if (isGuardian) ...{
        'whatsapp': whatsapp,
        'contactPref': whatsapp ? 'whatsapp' : 'telefone',
        'primary': false,
      } else
        'validUntil': validUntil ?? '',
    });
    for (final c in children) {
      // Responsável também já pode retirar a criança; a pessoa autorizada só
      // entra na lista de retirada.
      await t.collection('children').doc(c.id).update({
        if (isGuardian) 'guardianIds': FieldValue.arrayUnion([ref.id]),
        'authorizedIds': FieldValue.arrayUnion([ref.id]),
      });
    }
    return ref.id;
  }

  Future<void> removePerson({
    required String churchId,
    required Person person,
    required List<Child> children,
  }) async {
    final t = _tenant(churchId);
    final field =
        person.kind == PersonKind.guardian ? 'guardianIds' : 'authorizedIds';
    for (final c in children) {
      await t.collection('children').doc(c.id).update({
        field: FieldValue.arrayRemove([person.id]),
      });
    }
    await t.collection(person.kind.collection).doc(person.id).delete();
  }

  /// Código ativo da família (`LK-…`) para o outro responsável entrar nela.
  Stream<String?> watchFamilyCode(String churchId, String familyId) =>
      _tenant(churchId)
          .collection('familyLinks')
          .where('familyId', isEqualTo: familyId)
          .snapshots()
          .map((s) {
            for (final d in s.docs) {
              if (d.data()['active'] == true) return d.id;
            }
            return null;
          });

  /// Gera um novo código e invalida o anterior.
  Future<String> createFamilyCode({
    required String churchId,
    required String churchName,
    required String uid,
    required String familyId,
  }) async {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    final code =
        'LK-${List.generate(6, (_) => alphabet[_rnd.nextInt(alphabet.length)]).join()}';
    final t = _tenant(churchId);
    final old =
        await t
            .collection('familyLinks')
            .where('familyId', isEqualTo: familyId)
            .get();
    final batch = _db.batch();
    for (final d in old.docs) {
      batch.delete(d.reference);
      batch.delete(_db.collection('codes').doc(d.id));
    }
    batch.set(t.collection('familyLinks').doc(code), {
      'familyId': familyId,
      'active': true,
      'createdAt': nowIso(),
      'createdBy': uid,
    });
    batch.set(_db.collection('codes').doc(code), {
      'churchId': churchId,
      'churchName': churchName,
      'kind': 'family',
    });
    await batch.commit();
    return code;
  }
}
