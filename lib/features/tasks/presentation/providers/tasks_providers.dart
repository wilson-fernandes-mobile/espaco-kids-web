import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../tenant/presentation/providers/tenant_providers.dart';
import '../../data/tasks_repository.dart';
import '../../domain/entities/class_task.dart';

final tasksRepositoryProvider = Provider<TasksRepository>(
  (ref) => TasksRepository(ref.watch(tenantRefProvider)),
);

/// Tarefas de uma turma (equipe e famílias leem).
final classTasksProvider = StreamProvider.family<List<ClassTask>, String>(
  (ref, classId) =>
      classId.isEmpty
          ? Stream.value(const [])
          : ref.watch(tasksRepositoryProvider).watchClass(classId),
);
