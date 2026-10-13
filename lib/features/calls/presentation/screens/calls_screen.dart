import 'package:flutter/material.dart';
import '../../../../shared/widgets/open_drawer_button.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/date_format.dart';
import '../../../../shared/widgets/async_value_widget.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../../shared/widgets/pattern_card.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../../kids/presentation/providers/kids_providers.dart';
import '../providers/calls_providers.dart';

/// Central de chamadas da equipe: acompanha e encerra chamadas.
class CallsScreen extends ConsumerWidget {
  const CallsScreen({super.key});

  StatusTone _tone(String s) => switch (s) {
    'atendida' => StatusTone.success,
    'cancelada' => StatusTone.neutral,
    'visualizada' || 'recebida' => StatusTone.warning,
    _ => StatusTone.danger,
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final calls = ref.watch(callsProvider);
    final children = ref.watch(childrenProvider).valueOrNull ?? const [];
    return Scaffold(
      appBar: AppBar(
        leading: const OpenDrawerButton(),
        title: const Text('Chamadas'),
      ),
      body: AsyncValueWidget(
        value: calls,
        data: (list) {
          if (list.isEmpty) {
            return const EmptyState(
              icon: Icons.campaign_outlined,
              title: 'Nenhuma chamada',
              message: 'Chame os responsáveis pela ficha da criança.',
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.md),
            itemCount: list.length,
            separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (_, i) {
              final c = list[i];
              final kid = children.where((k) => k.id == c.childId).firstOrNull;
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
                              kid?.displayName ?? 'Criança',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ),
                          StatusBadge(
                            label: c.status,
                            tone: _tone(c.status),
                            dense: true,
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text('${c.reasonLabel} · ${shortDateTime(c.createdAt)}'),
                      if (c.open) ...[
                        const SizedBox(height: AppSpacing.sm),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            TextButton(
                              onPressed:
                                  () => _set(context, ref, c.id, 'cancelada'),
                              child: const Text('Cancelar'),
                            ),
                            FilledButton(
                              style: FilledButton.styleFrom(
                                backgroundColor: AppColors.success,
                              ),
                              onPressed:
                                  () => _set(context, ref, c.id, 'atendida'),
                              child: const Text('Atendida'),
                            ),
                          ],
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

  Future<void> _set(
    BuildContext context,
    WidgetRef ref,
    String id,
    String status,
  ) async {
    try {
      await ref.read(callsRepositoryProvider).setStatus(id, status);
    } catch (e) {
      if (context.mounted) showError(context, e);
    }
  }
}
