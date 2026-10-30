import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/date_format.dart';
import '../../../../shared/widgets/async_value_widget.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../../shared/widgets/mode_switch_action.dart';
import '../../../../shared/widgets/open_drawer_button.dart';
import '../../../../shared/widgets/pattern_card.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../../kids/presentation/providers/kids_providers.dart';
import '../../domain/entities/guardian_call.dart';
import '../providers/calls_providers.dart';

/// Atalhos de período da lista de chamadas.
enum _Period { today, week, month, lastMonth, custom }

/// Central de chamadas da equipe: acompanha e encerra chamadas. Mostra quem
/// chamou e filtra por período (abre no mês atual).
class CallsScreen extends ConsumerStatefulWidget {
  const CallsScreen({super.key});

  @override
  ConsumerState<CallsScreen> createState() => _CallsScreenState();
}

class _CallsScreenState extends ConsumerState<CallsScreen> {
  _Period _period = _Period.month;
  DateTimeRange? _custom;

  static DateTime _day(DateTime d) => DateTime(d.year, d.month, d.day);

  /// Intervalo [início, fim) do período escolhido.
  DateTimeRange get _range {
    final today = _day(DateTime.now());
    switch (_period) {
      case _Period.today:
        return DateTimeRange(
          start: today,
          end: today.add(const Duration(days: 1)),
        );
      case _Period.week:
        return DateTimeRange(
          start: today.subtract(const Duration(days: 6)),
          end: today.add(const Duration(days: 1)),
        );
      case _Period.month:
        return DateTimeRange(
          start: DateTime(today.year, today.month),
          end: DateTime(today.year, today.month + 1),
        );
      case _Period.lastMonth:
        return DateTimeRange(
          start: DateTime(today.year, today.month - 1),
          end: DateTime(today.year, today.month),
        );
      case _Period.custom:
        final c = _custom!;
        return DateTimeRange(
          start: _day(c.start),
          end: _day(c.end).add(const Duration(days: 1)),
        );
    }
  }

  String get _label {
    final f = DateFormat('dd/MM/yyyy');
    final r = _range;
    final last = r.end.subtract(const Duration(days: 1));
    return _day(r.start) == _day(last)
        ? f.format(r.start)
        : '${f.format(r.start)} a ${f.format(last)}';
  }

  Future<void> _pickCustom() async {
    final now = DateTime.now();
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year - 3),
      lastDate: _day(now),
      initialDateRange: _custom,
      helpText: 'Período das chamadas',
      saveText: 'Aplicar',
    );
    if (picked != null) {
      setState(() {
        _custom = picked;
        _period = _Period.custom;
      });
    }
  }

  StatusTone _tone(String s) => switch (s) {
    'atendida' => StatusTone.success,
    'cancelada' => StatusTone.neutral,
    'visualizada' || 'recebida' => StatusTone.warning,
    _ => StatusTone.danger,
  };

  @override
  Widget build(BuildContext context) {
    final calls = ref.watch(callsProvider);
    final children = ref.watch(childrenProvider).valueOrNull ?? const [];
    final scheme = Theme.of(context).colorScheme;

    List<GuardianCall> inRange(List<GuardianCall> all) {
      final r = _range;
      return all.where((c) {
        final d = parseIso(c.createdAt);
        return d != null && !d.isBefore(r.start) && d.isBefore(r.end);
      }).toList();
    }

    return Scaffold(
      appBar: AppBar(
        leading: const OpenDrawerButton(),
        actions: const [ModeSwitchAction()],
        title: const Text('Chamadas'),
      ),
      body: AsyncValueWidget(
        value: calls,
        data: (all) {
          final list = inRange(all);
          return Column(
            children: [
              // Filtro de período.
              SizedBox(
                height: 52,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.md,
                    AppSpacing.sm,
                    AppSpacing.md,
                    0,
                  ),
                  children: [
                    for (final (p, label) in const [
                      (_Period.today, 'Hoje'),
                      (_Period.week, '7 dias'),
                      (_Period.month, 'Este mês'),
                      (_Period.lastMonth, 'Mês anterior'),
                    ])
                      Padding(
                        padding: const EdgeInsets.only(right: AppSpacing.sm),
                        child: ChoiceChip(
                          label: Text(label),
                          selected: _period == p,
                          onSelected: (_) => setState(() => _period = p),
                        ),
                      ),
                    ChoiceChip(
                      avatar: const Icon(Icons.date_range, size: 18),
                      label: const Text('Escolher período'),
                      selected: _period == _Period.custom,
                      onSelected: (_) => _pickCustom(),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.md,
                  AppSpacing.sm,
                  AppSpacing.md,
                  0,
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.calendar_month_outlined,
                      size: 16,
                      color: scheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        '$_label · ${list.length} ${list.length == 1 ? 'chamada' : 'chamadas'}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child:
                    list.isEmpty
                        ? EmptyState(
                          icon: Icons.campaign_outlined,
                          title: 'Nenhuma chamada no período',
                          message:
                              all.isEmpty
                                  ? 'Chame os responsáveis pela ficha da criança.'
                                  : 'Tente outro período.',
                        )
                        : ListView.separated(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          itemCount: list.length,
                          separatorBuilder:
                              (_, _) => const SizedBox(height: AppSpacing.sm),
                          itemBuilder:
                              (_, i) => _CallCard(
                                call: list[i],
                                childName:
                                    children
                                        .where((k) => k.id == list[i].childId)
                                        .firstOrNull
                                        ?.displayName ??
                                    'Criança',
                                tone: _tone(list[i].status),
                                onSet: (status) => _set(list[i].id, status),
                              ),
                        ),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _set(String id, String status) async {
    try {
      await ref.read(callsRepositoryProvider).setStatus(id, status);
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }
}

class _CallCard extends StatelessWidget {
  const _CallCard({
    required this.call,
    required this.childName,
    required this.tone,
    required this.onSet,
  });

  final GuardianCall call;
  final String childName;
  final StatusTone tone;
  final ValueChanged<String> onSet;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
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
                    childName,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                StatusBadge(label: call.status, tone: tone, dense: true),
              ],
            ),
            const SizedBox(height: AppSpacing.xs),
            Text('${call.reasonLabel} · ${shortDateTime(call.createdAt)}'),
            if (call.requestedBy.isNotEmpty) ...[
              const SizedBox(height: 2),
              Row(
                children: [
                  Icon(
                    Icons.person_outline,
                    size: 16,
                    color: scheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      'Chamado por ${call.requestedBy}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                ],
              ),
            ],
            if (call.open) ...[
              const SizedBox(height: AppSpacing.sm),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => onSet('cancelada'),
                    child: const Text('Cancelar'),
                  ),
                  FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.success,
                    ),
                    onPressed: () => onSet('atendida'),
                    child: const Text('Atendida'),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
