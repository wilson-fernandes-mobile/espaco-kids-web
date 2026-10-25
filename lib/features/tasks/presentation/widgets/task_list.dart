import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/constants/app_role.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/date_format.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../kids/domain/entities/child.dart';
import '../../domain/entities/class_task.dart';
import '../providers/tasks_providers.dart';
import 'task_sheet.dart';

/// Tarefas da turma da criança. A família só lê; quem cria/edita é a
/// coordenação/admin (qualquer turma) ou o professor da turma.
class TaskList extends ConsumerWidget {
  const TaskList({super.key, required this.child, required this.className});

  final Child child;
  final String className;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).user!;
    final tasks = ref.watch(classTasksProvider(child.classId));
    final canManage =
        !user.isFamily &&
        (user.role == AppRole.admin ||
            user.role == AppRole.coordenacao ||
            (user.role == AppRole.professor &&
                user.classIds.contains(child.classId)));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (canManage && child.classId.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: FilledButton.icon(
              onPressed:
                  () => showTaskSheet(
                    context,
                    classId: child.classId,
                    className: className,
                  ),
              icon: const Icon(Icons.add),
              label: const Text('Nova tarefa'),
            ),
          ),
        tasks.when(
          loading:
              () => const Padding(
                padding: EdgeInsets.all(AppSpacing.lg),
                child: Center(child: CircularProgressIndicator()),
              ),
          error:
              (e, _) => const Padding(
                padding: EdgeInsets.all(AppSpacing.md),
                child: Text(
                  'Não foi possível carregar as tarefas.',
                  textAlign: TextAlign.center,
                ),
              ),
          data:
              (list) =>
                  list.isEmpty
                      ? Padding(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        child: Text(
                          child.classId.isEmpty
                              ? 'A criança ainda não está em uma turma.'
                              : 'Nenhuma tarefa para a turma.',
                          textAlign: TextAlign.center,
                        ),
                      )
                      : Column(
                        children: [
                          for (final t in list)
                            _TaskCard(task: t, canManage: canManage),
                        ],
                      ),
        ),
      ],
    );
  }
}

class _TaskCard extends ConsumerWidget {
  const _TaskCard({required this.task, required this.canManage});

  final ClassTask task;
  final bool canManage;

  Future<void> _open(BuildContext context, String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null ||
        !await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (context.mounted) showInfo(context, 'Não foi possível abrir o link.');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final due = DateTime.tryParse(task.dueDate);
    final today = DateTime.now();
    final late =
        due != null &&
        due.isBefore(DateTime(today.year, today.month, today.day));

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    task.title,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                if (canManage)
                  PopupMenuButton<String>(
                    onSelected: (v) async {
                      if (v == 'edit') {
                        await showTaskSheet(
                          context,
                          classId: task.classId,
                          className: '',
                          editing: task,
                        );
                        return;
                      }
                      final ok = await confirm(
                        context,
                        title: 'Remover tarefa?',
                        message: 'As famílias deixam de vê-la.',
                        action: 'Remover',
                      );
                      if (!ok || !context.mounted) return;
                      final user = ref.read(sessionProvider).user!;
                      try {
                        await ref
                            .read(tasksRepositoryProvider)
                            .delete(task, uid: user.uid, userName: user.name);
                      } catch (e) {
                        if (context.mounted) showError(context, e);
                      }
                    },
                    itemBuilder:
                        (_) => const [
                          PopupMenuItem(value: 'edit', child: Text('Editar')),
                          PopupMenuItem(value: 'del', child: Text('Remover')),
                        ],
                  ),
              ],
            ),
            if (due != null) ...[
              const SizedBox(height: AppSpacing.xs),
              StatusBadge(
                label: 'Entrega ${DateFormat('dd/MM/yyyy').format(due)}',
                tone: late ? StatusTone.danger : StatusTone.neutral,
                dense: true,
              ),
            ],
            if (task.description.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(task.description),
            ],
            if (task.links.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.sm),
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.xs,
                children: [
                  for (final l in task.links)
                    ActionChip(
                      avatar: const Icon(Icons.download_outlined, size: 18),
                      label: Text(l.label.isEmpty ? 'Abrir arquivo' : l.label),
                      onPressed: () => _open(context, l.url),
                    ),
                ],
              ),
            ],
            const SizedBox(height: AppSpacing.sm),
            Text(
              '${shortDateTime(task.createdAt)} · ${task.authorName}'
              '${task.edited ? ' · editada' : ''}',
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}
