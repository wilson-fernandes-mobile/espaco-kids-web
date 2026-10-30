/// Link para documento ou imagem que o professor anexa à tarefa.
class TaskLink {
  const TaskLink({required this.label, required this.url});

  final String label;
  final String url;

  Map<String, String> toMap() => {'label': label, 'url': url};

  static TaskLink? fromMap(Object? m) {
    if (m is! Map) return null;
    final url = (m['url'] as String?) ?? '';
    if (url.isEmpty) return null;
    return TaskLink(label: (m['label'] as String?) ?? '', url: url);
  }
}

/// Tarefa da turma (`tenants/{id}/tasks`), criada pelo professor ou pela
/// coordenação; as famílias da turma veem e recebem um aviso.
class ClassTask {
  const ClassTask({
    required this.id,
    required this.classId,
    required this.title,
    required this.description,
    required this.authorId,
    required this.authorName,
    required this.createdAt,
    this.dueDate = '',
    this.links = const [],
    this.edited = false,
  });

  final String id;
  final String classId;
  final String title;
  final String description;

  /// Data de entrega (AAAA-MM-DD); vazio = sem prazo.
  final String dueDate;
  final List<TaskLink> links;
  final String authorId;
  final String authorName;
  final String createdAt;
  final bool edited;

  factory ClassTask.fromMap(String id, Map<String, dynamic> m) => ClassTask(
    id: id,
    classId: (m['classId'] as String?) ?? '',
    title: (m['title'] as String?) ?? '',
    description: (m['description'] as String?) ?? '',
    dueDate: (m['dueDate'] as String?) ?? '',
    links: [
      for (final l in (m['links'] as List?) ?? const [])
        if (TaskLink.fromMap(l) case final link?) link,
    ],
    authorId: (m['authorId'] as String?) ?? '',
    authorName: (m['authorName'] as String?) ?? '',
    createdAt: (m['createdAt'] as String?) ?? '',
    edited: m['updatedAt'] != null,
  );
}
