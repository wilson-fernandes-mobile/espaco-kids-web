import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_role.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/date_format.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../kids/presentation/providers/kids_providers.dart';
import '../../domain/entities/incident.dart';
import '../providers/incidents_providers.dart';
import 'incident_sheet.dart';

/// Cartão de uma ocorrência. Edita/remove quem registrou ou a coordenação.
class IncidentTile extends ConsumerWidget {
  const IncidentTile({
    super.key,
    required this.incident,
    this.showChild = true,
  });

  final Incident incident;

  /// Na ficha da criança o nome dela é redundante.
  final bool showChild;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).user!;
    final kids = ref.watch(childrenProvider).valueOrNull ?? const [];
    String name(String id) =>
        kids.where((k) => k.id == id).map((k) => k.displayName).firstOrNull ??
        'Criança removida';
    final i = incident;
    final canTouch =
        user.role == AppRole.admin ||
        user.role == AppRole.coordenacao ||
        i.authorId == user.uid;
    final who = [
      if (showChild) name(i.childId),
      ...i.involvedChildIds.map(name),
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                StatusBadge(
                  label: i.kindLabel,
                  tone:
                      i.kind == 'outro'
                          ? StatusTone.neutral
                          : StatusTone.danger,
                ),
                if (i.sharedWithFamily) ...[
                  const SizedBox(width: AppSpacing.xs),
                  const StatusBadge(
                    label: 'Enviada aos pais',
                    tone: StatusTone.success,
                    dense: true,
                  ),
                ],
                const Spacer(),
                if (canTouch)
                  PopupMenuButton<String>(
                    onSelected: (v) async {
                      if (v == 'edit') {
                        await showIncidentSheet(context, editing: i);
                        return;
                      }
                      final ok = await confirm(
                        context,
                        title: 'Remover ocorrência?',
                        message: 'Esta ação não pode ser desfeita.',
                        action: 'Remover',
                      );
                      if (!ok || !context.mounted) return;
                      try {
                        await ref
                            .read(incidentsRepositoryProvider)
                            .delete(i, uid: user.uid, userName: user.name);
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
            if (who.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: AppSpacing.xs),
                child: Text(
                  who.join(' · '),
                  style: Theme.of(context).textTheme.titleSmall,
                ),
              ),
            const SizedBox(height: AppSpacing.xs),
            Text(i.text),
            const SizedBox(height: AppSpacing.xs),
            Text(
              '${shortDateTime(i.createdAt)} · ${i.authorName}'
              '${i.edited ? ' · editada' : ''}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}
