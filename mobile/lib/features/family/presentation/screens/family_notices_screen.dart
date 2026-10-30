import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/date_format.dart';
import '../../../../shared/widgets/async_value_widget.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../../shared/widgets/mode_switch_action.dart';
import '../../../../shared/widgets/open_drawer_button.dart';
import '../../../../shared/widgets/pattern_card.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../../calls/domain/entities/guardian_call.dart';
import '../../../calls/presentation/providers/calls_providers.dart';
import '../../../kids/presentation/providers/kids_providers.dart';

/// Atalhos de período da lista de avisos.
enum _Period { today, week, month, lastMonth, custom }

/// Chamadas da equipe para a família, no mesmo formato da central da equipe:
/// filtro de período (abre no mês atual), por filho e só abertas, com quem
/// chamou. "Estou indo" avisa quem chamou que foi visto.
class FamilyNoticesScreen extends ConsumerStatefulWidget {
  const FamilyNoticesScreen({super.key});

  @override
  ConsumerState<FamilyNoticesScreen> createState() =>
      _FamilyNoticesScreenState();
}

class _FamilyNoticesScreenState extends ConsumerState<FamilyNoticesScreen> {
  _Period _period = _Period.month;
  DateTimeRange? _custom;
  String? _childId;
  bool _onlyOpen = false;

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
      helpText: 'Período dos avisos',
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

  String _statusLabel(GuardianCall c) => switch (c.status) {
    'atendida' => 'Atendida',
    'cancelada' => 'Cancelada',
    'visualizada' => 'Você está indo',
    _ => 'Aberta',
  };

  Future<void> _going(String id) async {
    try {
      await ref.read(callsRepositoryProvider).setStatus(id, 'visualizada');
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final calls = ref.watch(callsProvider);
    final kids = ref.watch(childrenProvider).valueOrNull ?? const [];
    final scheme = Theme.of(context).colorScheme;

    List<GuardianCall> filtered(List<GuardianCall> all) {
      final r = _range;
      return all.where((c) {
        final d = parseIso(c.createdAt);
        if (d == null || d.isBefore(r.start) || !d.isBefore(r.end)) {
          return false;
        }
        if (_childId != null && c.childId != _childId) return false;
        if (_onlyOpen && !c.open) return false;
        return true;
      }).toList();
    }

    return Scaffold(
      appBar: AppBar(
        leading: const OpenDrawerButton(),
        actions: const [ModeSwitchAction()],
        title: const Text('Avisos'),
      ),
      body: AsyncValueWidget(
        value: calls,
        data: (all) {
          final list = filtered(all);
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
              // Filtro por filho e só abertas.
              SizedBox(
                height: 48,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.md,
                    AppSpacing.xs,
                    AppSpacing.md,
                    0,
                  ),
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(right: AppSpacing.sm),
                      child: FilterChip(
                        label: const Text('Só abertas'),
                        selected: _onlyOpen,
                        onSelected: (v) => setState(() => _onlyOpen = v),
                      ),
                    ),
                    if (kids.length > 1)
                      for (final k in kids)
                        Padding(
                          padding: const EdgeInsets.only(right: AppSpacing.sm),
                          child: ChoiceChip(
                            label: Text(k.displayName),
                            selected: _childId == k.id,
                            onSelected:
                                (v) => setState(() => _childId = v ? k.id : null),
                          ),
                        ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.md,
                  AppSpacing.xs,
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
                        '$_label · ${list.length} ${list.length == 1 ? 'aviso' : 'avisos'}',
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
                          icon: Icons.notifications_none,
                          title: 'Nenhum aviso no período',
                          message:
                              all.isEmpty
                                  ? 'Quando a equipe precisar de você, aparecerá aqui.'
                                  : 'Tente outro período ou filtro.',
                        )
                        : ListView.separated(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          itemCount: list.length,
                          separatorBuilder:
                              (_, _) => const SizedBox(height: AppSpacing.sm),
                          itemBuilder: (_, i) {
                            final c = list[i];
                            final kid =
                                kids.where((k) => k.id == c.childId).firstOrNull;
                            return _NoticeCard(
                              call: c,
                              childName: kid?.displayName ?? 'seu filho(a)',
                              status: _statusLabel(c),
                              tone: _tone(c.status),
                              onGoing:
                                  c.open && c.status != 'visualizada'
                                      ? () => _going(c.id)
                                      : null,
                            );
                          },
                        ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _NoticeCard extends StatelessWidget {
  const _NoticeCard({
    required this.call,
    required this.childName,
    required this.status,
    required this.tone,
    required this.onGoing,
  });

  final GuardianCall call;
  final String childName;
  final String status;
  final StatusTone tone;
  final VoidCallback? onGoing;

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
                    'Chamada — $childName',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                StatusBadge(label: status, tone: tone, dense: true),
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
            if (onGoing != null) ...[
              const SizedBox(height: AppSpacing.sm),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton(
                  onPressed: onGoing,
                  child: const Text('Estou indo'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
