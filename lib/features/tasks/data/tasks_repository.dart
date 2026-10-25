import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../core/utils/date_format.dart';
import '../domain/entities/class_task.dart';

class TasksRepository {
  TasksRepository(this._t);

  /// Raiz da igreja ativa: `tenants/{churchId}`.
  final DocumentReference<Map<String, dynamic>> _t;

  /// Tarefas de uma turma, da mais recente para a mais antiga.
  Stream<List<ClassTask>> watchClass(String classId) => _t
      .collection('tasks')
      .where('classId', isEqualTo: classId)
      .snapshots()
      .map(
        (s) =>
            s.docs.map((d) => ClassTask.fromMap(d.id, d.data())).toList()
              ..sort((a, b) => b.createdAt.compareTo(a.createdAt)),
      );

  Map<String, dynamic> _body({
    required String classId,
    required String title,
    required String description,
    required String dueDate,
    required List<TaskLink> links,
  }) => {
    'classId': classId,
    'title': title.trim(),
    'description': description.trim(),
    'dueDate': dueDate,
    'links': [for (final l in links) l.toMap()],
  };

  /// A Cloud Function `onTaskCreated` avisa as famílias da turma por push.
  Future<void> create({
    required String classId,
    required String className,
    required String title,
    required String description,
    required String dueDate,
    required List<TaskLink> links,
    required String authorId,
    required String authorName,
  }) async {
    await _t.collection('tasks').add({
      ..._body(
        classId: classId,
        title: title,
        description: description,
        dueDate: dueDate,
        links: links,
      ),
      'authorId': authorId,
      'authorName': authorName,
      'createdAt': nowIso(),
    });
    await _audit(
      authorId,
      authorName,
      'Tarefa criada — $className: ${title.trim()}',
    );
  }

  Future<void> update(
    ClassTask t, {
    required String title,
    required String description,
    required String dueDate,
    required List<TaskLink> links,
    required String uid,
    required String userName,
  }) async {
    await _t.collection('tasks').doc(t.id).update({
      ..._body(
        classId: t.classId,
        title: title,
        description: description,
        dueDate: dueDate,
        links: links,
      ),
      'updatedAt': nowIso(),
    });
    await _audit(uid, userName, 'Tarefa editada — ${title.trim()}');
  }

  Future<void> delete(
    ClassTask t, {
    required String uid,
    required String userName,
  }) async {
    await _t.collection('tasks').doc(t.id).delete();
    await _audit(uid, userName, 'Tarefa removida — ${t.title}');
  }

  /// Auditoria é da equipe: a família só lê tarefas.
  Future<void> _audit(String uid, String user, String action) async {
    try {
      await _t.collection('audit').add({
        'at': nowIso(),
        'uid': uid,
        'user': user,
        'action': action,
      });
    } catch (_) {}
  }
}
