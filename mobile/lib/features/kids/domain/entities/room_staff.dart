import '../../../../core/utils/date_format.dart';

/// Membro da equipe que fez check-in numa sala (`tenants/{id}/roomStaff/{uid}`).
/// Há um documento por pessoa: entrar noutra sala sobrescreve o anterior, o
/// que faz o check-out da sala antiga automaticamente.
class RoomStaff {
  const RoomStaff({
    required this.uid,
    required this.name,
    required this.classId,
    required this.className,
    required this.since,
    this.photoUrl,
  });

  final String uid;
  final String name;
  final String classId;
  final String className;
  final String since;
  final String? photoUrl;

  /// O check-in vale só no dia em que foi feito (quem esquece de sair não
  /// aparece na sala nos dias seguintes).
  bool get today {
    final d = parseIso(since);
    if (d == null) return false;
    final n = DateTime.now();
    return d.year == n.year && d.month == n.month && d.day == n.day;
  }

  factory RoomStaff.fromMap(String id, Map<String, dynamic> m) => RoomStaff(
    uid: id,
    name: (m['name'] as String?) ?? 'Equipe',
    classId: (m['classId'] as String?) ?? '',
    className: (m['className'] as String?) ?? '',
    since: (m['since'] as String?) ?? '',
    photoUrl: m['photoUrl'] as String?,
  );
}
