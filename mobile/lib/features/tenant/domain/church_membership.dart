import '../../../core/constants/app_role.dart';

/// Vínculo da pessoa com uma igreja (cópia em `users/{uid}/memberships/{id}`).
/// O papel vale só dentro desta igreja: a mesma conta pode ser admin numa e
/// família noutra.
class ChurchMembership {
  const ChurchMembership({
    required this.churchId,
    required this.churchName,
    required this.role,
    this.familyId,
  });

  final String churchId;
  final String churchName;
  final AppRole role;
  final String? familyId;

  static ChurchMembership? fromMap(String churchId, Map<String, dynamic> m) {
    final role = AppRole.fromId(m['role'] as String?);
    if (role == null) return null;
    return ChurchMembership(
      churchId: churchId,
      churchName: (m['churchName'] as String?) ?? 'Igreja',
      role: role,
      familyId: m['familyId'] as String?,
    );
  }
}
