import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/async_value_widget.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/mode_switch_action.dart';
import '../../../../shared/widgets/open_drawer_button.dart';
import '../../domain/entities/incident.dart';
import '../providers/incidents_providers.dart';
import '../widgets/incident_sheet.dart';
import '../widgets/incident_tile.dart';

/// Histórico de ocorrências da sala, visível só para a equipe.
class IncidentsScreen extends ConsumerStatefulWidget {
  const IncidentsScreen({super.key});

  @override
  ConsumerState<IncidentsScreen> createState() => _IncidentsScreenState();
}

class _IncidentsScreenState extends ConsumerState<IncidentsScreen> {
  String? _kind;

  @override
  Widget build(BuildContext context) {
    final all = ref.watch(incidentsProvider);
    return Scaffold(
      appBar: AppBar(
        leading: const OpenDrawerButton(),
        title: const Text('Ocorrências'),
        actions: const [ModeSwitchAction()],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showIncidentSheet(context),
        icon: const Icon(Icons.add),
        label: const Text('Registrar'),
      ),
      body: Column(
        children: [
          SizedBox(
            height: 52,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.xs,
              ),
              children: [
                Padding(
                  padding: const EdgeInsets.only(right: AppSpacing.xs),
                  child: ChoiceChip(
                    label: const Text('Todas'),
                    selected: _kind == null,
                    onSelected: (_) => setState(() => _kind = null),
                  ),
                ),
                for (final e in Incident.kinds.entries)
                  Padding(
                    padding: const EdgeInsets.only(right: AppSpacing.xs),
                    child: ChoiceChip(
                      label: Text(e.value),
                      selected: _kind == e.key,
                      onSelected: (_) => setState(() => _kind = e.key),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: AsyncValueWidget<List<Incident>>(
              value: all,
              data: (list) {
                final shown =
                    list
                        .where((i) => _kind == null || i.kind == _kind)
                        .toList();
                if (shown.isEmpty) {
                  return const EmptyState(
                    icon: Icons.assignment_outlined,
                    title: 'Nenhuma ocorrência',
                    message:
                        'Registre o que acontece na sala. A família só vê as que você enviar aos pais.',
                  );
                }
                return ListView.builder(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.md,
                    AppSpacing.xs,
                    AppSpacing.md,
                    96,
                  ),
                  itemCount: shown.length,
                  itemBuilder: (_, n) => IncidentTile(incident: shown[n]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
