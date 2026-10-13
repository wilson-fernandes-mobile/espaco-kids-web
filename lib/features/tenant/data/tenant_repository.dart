import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../../../core/constants/app_role.dart';
import '../../../core/errors/failures.dart';
import '../../../core/utils/date_format.dart';
import '../../auth/domain/entities/app_user.dart';
import '../domain/church_membership.dart';

/// Tipo do código digitado: `join` (código da igreja para os pais, `IG-XXXXXX`:
/// a pessoa cadastra a própria família), `family` (vínculo de uma família já
/// cadastrada pela equipe, `LK-XXXXXX`) ou `invite` (equipe, `KIDS-XXXXXX`).
enum CodeKind { family, invite, join }

class CodeInfo {
  const CodeInfo(this.code, this.churchId, this.churchName, this.kind);

  final String code;
  final String churchId;
  final String churchName;
  final CodeKind kind;
}

/// Modelo multi-igreja (mesmo desenho do MovaChurch):
/// * `tenants/{churchId}/members/{uid}` — papel da pessoa NESTA igreja;
/// * `users/{uid}/memberships/{churchId}` — cópia para listar "minhas igrejas";
/// * `codes/{código}` — aponta o código para a igreja (equipe ou família).
class TenantRepository {
  TenantRepository(this._db, this._auth);

  final FirebaseFirestore _db;
  final FirebaseAuth _auth;

  Stream<List<ChurchMembership>> watchMemberships(String uid) => _db
      .collection('users')
      .doc(uid)
      .collection('memberships')
      .where('active', isEqualTo: true)
      .snapshots()
      .map(
        (s) =>
            s.docs
                .map((d) => ChurchMembership.fromMap(d.id, d.data()))
                .whereType<ChurchMembership>()
                .toList()
              ..sort((a, b) => a.churchName.compareTo(b.churchName)),
      );

  /// Papel/estado da pessoa na igreja (null = sem vínculo).
  Stream<AppUser?> watchMember(ChurchMembership church, String uid) => _db
      .collection('tenants')
      .doc(church.churchId)
      .collection('members')
      .doc(uid)
      .snapshots()
      .map(
        (s) => AppUser.fromMap(
          uid,
          s.data(),
          churchId: church.churchId,
          churchName: church.churchName,
        ),
      );

  /// Descobre a igreja e o tipo de um código sem entrar nela.
  Future<CodeInfo> peekCode(String raw) async {
    final code = raw.trim().toUpperCase();
    final snap = await _db.collection('codes').doc(code).get();
    final d = snap.data();
    if (d == null) {
      throw const Failure('Código inválido. Confira com a igreja.');
    }
    return CodeInfo(
      code,
      d['churchId'] as String,
      (d['churchName'] as String?) ?? 'Igreja',
      switch (d['kind']) {
        'family' => CodeKind.family,
        'join' => CodeKind.join,
        _ => CodeKind.invite,
      },
    );
  }

  /// Cria a conta (Auth + perfil global) e já entra na igreja do código.
  /// Se o código não servir, desfaz a conta para não deixar usuário solto.
  Future<void> signUpWithCode({
    required String code,
    required String name,
    required String email,
    required String password,
    required CodeKind expected,
    AppRole? staffRole,
  }) async {
    final cred = await _auth.createUserWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );
    final user = cred.user!;
    try {
      // O código só pode ser lido por quem está logado, então a conta é criada
      // antes de validá-lo (e desfeita abaixo se o código não servir).
      final info = await peekCode(code);
      _checkKind(info, expected);
      await _db.collection('users').doc(user.uid).set({
        'name': name.trim(),
        'email': user.email,
        'createdAt': nowIso(),
      });
      await joinChurch(
        info: info,
        uid: user.uid,
        name: name.trim(),
        email: user.email!,
        staffRole: staffRole,
      );
    } catch (_) {
      try {
        await _db.collection('users').doc(user.uid).delete();
      } catch (_) {}
      await user.delete();
      rethrow;
    }
  }

  /// Quem já tem conta entra noutra igreja com um código (ex.: um admin
  /// visitando outra igreja como família).
  Future<String> joinWithCode({
    required String code,
    AppRole? staffRole,
  }) async {
    final user = _auth.currentUser;
    if (user == null) throw const Failure('Entre na sua conta primeiro.');
    final info = await peekCode(code);
    final profile = await _db.collection('users').doc(user.uid).get();
    final name =
        (profile.data()?['name'] as String?) ?? user.displayName ?? 'Sem nome';
    await joinChurch(
      info: info,
      uid: user.uid,
      name: name,
      email: user.email ?? '',
      staffRole: staffRole,
    );
    return info.churchId;
  }

  Future<void> joinChurch({
    required CodeInfo info,
    required String uid,
    required String name,
    required String email,
    AppRole? staffRole,
  }) async {
    final tenant = _db.collection('tenants').doc(info.churchId);
    final memberRef = tenant.collection('members').doc(uid);
    final copyRef = _db
        .collection('users')
        .doc(uid)
        .collection('memberships')
        .doc(info.churchId);

    final existing = await memberRef.get();
    if (existing.exists) {
      final m = existing.data()!;
      var familyId = m['familyId'] as String?;
      // Voluntário que também é pai/mãe: o código da família vincula os
      // filhos à conta que ele já tem nesta igreja (sem mudar o papel).
      if (info.kind == CodeKind.family) {
        if (familyId != null && familyId.isNotEmpty) {
          throw const Failure(
            'Você já tem uma família vinculada nesta igreja.',
          );
        }
        final link =
            await tenant.collection('familyLinks').doc(info.code).get();
        final l = link.data();
        if (l == null || l['active'] != true) {
          throw const Failure('Código da família inválido ou desativado.');
        }
        familyId = l['familyId'] as String;
        try {
          await memberRef.update({'familyId': familyId, 'linkCode': info.code});
        } on FirebaseException catch (e) {
          if (e.code == 'permission-denied') {
            throw const Failure('Não foi possível vincular esta família.');
          }
          rethrow;
        }
      }
      if (info.kind == CodeKind.join) {
        throw const Failure(
          'Você já faz parte desta igreja. Para cadastrar seus filhos, '
          'use "Cadastrar minha família" no menu.',
        );
      }
      var role = m['role'] as String?;
      // Quem entrou como família vira voluntário com o convite da equipe,
      // sem perder a família (passa a acumular os dois acessos).
      if (info.kind == CodeKind.invite && role == AppRole.responsavel.id) {
        final newRole = staffRole ?? AppRole.professor;
        if (newRole != AppRole.professor && newRole != AppRole.recepcao) {
          throw const Failure('Escolha Professor(a) ou Recepção.');
        }
        try {
          await memberRef.update({'role': newRole.id, 'inviteCode': info.code});
        } on FirebaseException catch (e) {
          if (e.code == 'permission-denied') {
            throw const Failure('Código de convite inválido ou desativado.');
          }
          rethrow;
        }
        role = newRole.id;
      }
      // Garante a cópia na lista de igrejas.
      await copyRef.set({
        'churchName': info.churchName,
        'role': role,
        'familyId': familyId,
        'active': m['active'] != false,
      });
      return;
    }

    final Map<String, dynamic> member;
    final AppRole role;
    String? familyId;
    try {
      if (info.kind == CodeKind.join) {
        // Código da igreja: entra como família, sem filhos; o cadastro da
        // família e das crianças é feito pela própria pessoa no app.
        role = AppRole.responsavel;
        member = {
          'name': name,
          'email': email,
          'role': role.id,
          'classIds': <String>[],
          'active': true,
          'createdAt': nowIso(),
          'joinCode': info.code,
        };
      } else if (info.kind == CodeKind.family) {
        final link =
            await tenant.collection('familyLinks').doc(info.code).get();
        final l = link.data();
        if (l == null || l['active'] != true) {
          throw const Failure('Código da família inválido ou desativado.');
        }
        role = AppRole.responsavel;
        familyId = l['familyId'] as String;
        member = {
          'name': name,
          'email': email,
          'role': role.id,
          'familyId': familyId,
          'linkCode': info.code,
          'classIds': <String>[],
          'active': true,
          'createdAt': nowIso(),
        };
      } else {
        role = staffRole ?? AppRole.professor;
        if (role != AppRole.professor && role != AppRole.recepcao) {
          throw const Failure('Escolha Professor(a) ou Recepção.');
        }
        member = {
          'name': name,
          'email': email,
          'role': role.id,
          'classIds': <String>[],
          'active': true,
          'createdAt': nowIso(),
          'inviteCode': info.code,
        };
      }
      final batch = _db.batch();
      batch.set(memberRef, member);
      batch.set(copyRef, {
        'churchName': info.churchName,
        'role': role.id,
        'familyId': familyId,
        'active': true,
        'joinedAt': nowIso(),
      });
      await batch.commit();
    } on FirebaseException catch (e) {
      if (e.code == 'permission-denied') {
        throw Failure(
          info.kind == CodeKind.invite
              ? 'Código de convite inválido ou desativado.'
              : 'Código inválido ou desativado.',
        );
      }
      rethrow;
    }
  }

  /// A própria pessoa deixa a igreja.
  Future<void> leave(String churchId, String uid) async {
    final batch = _db.batch();
    batch.delete(
      _db.collection('tenants').doc(churchId).collection('members').doc(uid),
    );
    batch.delete(
      _db.collection('users').doc(uid).collection('memberships').doc(churchId),
    );
    await batch.commit();
  }

  void _checkKind(CodeInfo info, CodeKind expected) {
    if (info.kind == expected) return;
    // "Sou da família" aceita o código da igreja (IG-) e o da família (LK-).
    if (expected == CodeKind.family && info.kind == CodeKind.join) return;
    throw Failure(
      expected == CodeKind.family
          ? 'Esse é um código de equipe. Escolha "Sou da equipe".'
          : 'Esse é um código de família. Escolha "Sou da família".',
    );
  }
}
