class Classroom {
  const Classroom({
    required this.id,
    required this.name,
    required this.room,
    required this.capacity,
    required this.ageMin,
    required this.ageMax,
    required this.active,
  });

  final String id;
  final String name;
  final String room;
  final int capacity;
  final int ageMin;
  final int ageMax;
  final bool active;

  factory Classroom.fromMap(String id, Map<String, dynamic> m) => Classroom(
    id: id,
    name: (m['name'] as String?) ?? '',
    room: (m['room'] as String?) ?? '',
    capacity: (m['capacity'] as num?)?.toInt() ?? 0,
    ageMin: (m['ageMin'] as num?)?.toInt() ?? 0,
    ageMax: (m['ageMax'] as num?)?.toInt() ?? 0,
    active: m['active'] != false,
  );
}
