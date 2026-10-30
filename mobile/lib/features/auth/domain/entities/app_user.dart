import '../../../../core/constants/app_role.dart';

/// Perfil do usuário logado (`users/{uid}`).
class AppUser {
  const AppUser({
    required this.uid,
    required this.name,
    required this.email,
    required this.role,
    required this.active,
    this.classIds = const [],
    this.familyId,
    this.personId,
    this.personKind,
    this.churchId = '',
    this.churchName = '',
    this.asFamily = false,
    this.photoUrl,
  });

  final String uid;

  /// Voluntário (equipe) que também é pai/mãe usando o app como família.
  final bool asFamily;

  /// Igreja ativa a que este perfil (papel, turmas, família) se refere.
  final String churchId;
  final String churchName;
  final String name;
  final String email;

  /// Foto de perfil (data URL) gravada em `members/{uid}`.
  final String? photoUrl;
  final AppRole role;
  final bool active;
  final List<String> classIds;

  /// Família à qual a conta está vinculada nesta igreja. Todo `responsavel`
  /// tem; professor/recepção/admin só se também forem pai ou mãe.
  final String? familyId;

  /// Quem este usuário é dentro da família (`guardians` ou `authorized`).
  final String? personId;
  final String? personKind; // 'guardian' | 'authorized'

  bool get hasFamily => familyId != null && familyId!.isNotEmpty;

  /// Está usando o app como família (conta de família, ou equipe em "modo família").
  bool get isFamily => role == AppRole.responsavel || asFamily;

  /// Equipe com família vinculada: pode alternar entre os dois modos.
  bool get canSwitchMode => role.isStaff && hasFamily;

  AppUser withFamilyMode() => AppUser(
    uid: uid,
    name: name,
    email: email,
    role: role,
    active: active,
    classIds: classIds,
    familyId: familyId,
    personId: personId,
    personKind: personKind,
    churchId: churchId,
    churchName: churchName,
    asFamily: true,
    photoUrl: photoUrl,
  );

  /// Lê o vínculo `tenants/{churchId}/members/{uid}`.
  static AppUser? fromMap(
    String uid,
    Map<String, dynamic>? m, {
    String churchId = '',
    String churchName = '',
  }) {
    if (m == null) return null;
    final role = AppRole.fromId(m['role'] as String?);
    if (role == null) return null;
    return AppUser(
      uid: uid,
      name: (m['name'] as String?) ?? '',
      email: (m['email'] as String?) ?? '',
      role: role,
      active: m['active'] != false,
      classIds: List<String>.from(m['classIds'] as List? ?? const []),
      familyId: m['familyId'] as String?,
      personId: m['personId'] as String?,
      personKind: m['personKind'] as String?,
      churchId: churchId,
      churchName: churchName,
      photoUrl: m['photoUrl'] as String?,
    );
  }
}
