import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/date_format.dart';
import '../../../../shared/widgets/async_value_widget.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/mode_switch_action.dart';
import '../../../../shared/widgets/open_drawer_button.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../../kids/presentation/providers/kids_providers.dart';
import '../../domain/entities/incident.dart';
import '../providers/incidents_providers.dart';

/// Ocorrências que a equipe escolheu enviar aos pais.
class FamilyIncidentsScreen extends ConsumerWidget {
  const FamilyIncidentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final kids = ref.watch(childrenProvider).valueOrNull ?? const [];
    return Scaffold(
      appBar: AppBar(
        leading: const OpenDrawerButton(),
        title: const Text('Ocorrências'),
        actions: const [ModeSwitchAction()],
      ),
      body: AsyncValueWidget<List<Incident>>(
        value: ref.watch(incidentsProvider),
        data: (list) {
          // Abrir a tela apaga a bolinha da aba.
          WidgetsBinding.instance.addPostFrameCallback(
            (_) => ref.read(incidentsSeenProvider.notifier).markSeen(list),
          );
          if (list.isEmpty) {
            return const EmptyState(
              icon: Icons.assignment_outlined,
              title: 'Nenhuma ocorrência',
              message: 'Quando a equipe enviar um relato, ele aparece aqui.',
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.md),
            itemCount: list.length,
            separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (_, n) {
              final i = list[n];
              final name =
                  kids
                      .where((k) => k.id == i.childId)
                      .map((k) => k.displayName)
                      .firstOrNull ??
                  'Seu filho(a)';
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
                              name,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ),
                          StatusBadge(
                            label: i.kindLabel,
                            tone:
                                i.kind == 'outro'
                                    ? StatusTone.neutral
                                    : StatusTone.warning,
                            dense: true,
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(i.text),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        '${shortDateTime(i.createdAt)} · ${i.authorName}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
