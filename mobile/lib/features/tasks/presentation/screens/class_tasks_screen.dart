import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../kids/presentation/providers/kids_providers.dart';
import '../widgets/task_list.dart';

/// Tarefas de uma turma (equipe): o professor cria, edita e apaga por aqui.
class ClassTasksScreen extends ConsumerWidget {
  const ClassTasksScreen({super.key, required this.classId});

  final String classId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final classes = ref.watch(classesProvider).valueOrNull ?? const [];
    final name =
        classes.where((c) => c.id == classId).map((c) => c.name).firstOrNull ??
        'Turma';
    return Scaffold(
      appBar: AppBar(title: Text('Tarefas — $name')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [TaskList(classId: classId, className: name)],
      ),
    );
  }
}
