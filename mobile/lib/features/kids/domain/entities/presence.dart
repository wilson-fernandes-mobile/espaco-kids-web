/// Marcador `presence/{childId}`: existe enquanto a criança está na sala.
class Presence {
  const Presence({
    required this.childId,
    required this.attendanceId,
    required this.at,
  });

  final String childId;
  final String attendanceId;
  final String at;

  factory Presence.fromMap(String childId, Map<String, dynamic> m) => Presence(
    childId: childId,
    attendanceId: (m['attendanceId'] as String?) ?? '',
    at: (m['at'] as String?) ?? '',
  );
}
