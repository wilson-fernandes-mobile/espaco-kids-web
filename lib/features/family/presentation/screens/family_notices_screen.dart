import 'package:flutter/material.dart';
import '../../../../shared/widgets/open_drawer_button.dart';
import '../../../../shared/widgets/mode_switch_action.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/date_format.dart';
import '../../../../shared/widgets/async_value_widget.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../../shared/widgets/pattern_card.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../../calls/presentation/providers/calls_providers.dart';
import '../../../kids/presentation/providers/kids_providers.dart';

/// Chamadas da equipe para a família. "Estou indo" avisa que foi visto.
class FamilyNoticesScreen extends ConsumerWidget {
  const FamilyNoticesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final calls = ref.watch(callsProvider);
    final kids = ref.watch(childrenProvider).valueOrNull ?? const [];
    return Scaffold(
      appBar: AppBar(
        leading: const OpenDrawerButton(),
        actions: const [ModeSwitchAction()],
        title: const Text('Avisos'),
      ),
      body: AsyncValueWidget(
        value: calls,
        data: (list) {
          if (list.isEmpty) {
            return const EmptyState(
              icon: Icons.notifications_none,
              title: 'Nenhum aviso',
              message: 'Quando a equipe precisar de você, aparecerá aqui.',
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.md),
            itemCount: list.length,
            separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (_, i) {
              final c = list[i];
              final kid = kids.where((k) => k.id == c.childId).firstOrNull;
              return PatternCard(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Chamada — ${kid?.displayName ?? 'seu filho(a)'}',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ),
                          StatusBadge(
                            label: c.open ? 'Aberta' : 'Encerrada',
                            tone:
                                c.open ? StatusTone.danger : StatusTone.neutral,
                            dense: true,
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text('${c.reasonLabel} · ${shortDateTime(c.createdAt)}'),
                      if (c.open && c.status != 'visualizada') ...[
                        const SizedBox(height: AppSpacing.sm),
                        Align(
                          alignment: Alignment.centerRight,
                          child: FilledButton(
                            onPressed: () async {
                              try {
                                await ref
                                    .read(callsRepositoryProvider)
                                    .setStatus(c.id, 'visualizada');
                              } catch (e) {
                                if (context.mounted) showError(context, e);
                              }
                            },
                            child: const Text('Estou indo'),
                          ),
                        ),
                      ],
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
