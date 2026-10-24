import 'package:flutter/material.dart';
import '../../../../shared/widgets/open_drawer_button.dart';
import '../../../../shared/widgets/mode_switch_action.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/text_search.dart';
import '../../../../shared/widgets/async_value_widget.dart';
import '../../../../shared/widgets/child_tile.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../kids/domain/entities/child.dart';
import '../../../kids/presentation/providers/kids_providers.dart';

enum _Filter { mine, absent }

/// Lista de crianças com busca. Com check-in numa sala, mostra só "Minha sala"
/// (da turma e com check-in) e "Ausentes" (da turma, sem check-in). Sem check-in
/// numa sala, mostra todas as crianças (útil para a recepção buscar).
class ChildrenScreen extends ConsumerStatefulWidget {
  const ChildrenScreen({super.key});

  @override
  ConsumerState<ChildrenScreen> createState() => _ChildrenScreenState();
}

class _ChildrenScreenState extends ConsumerState<ChildrenScreen> {
  String _query = '';
  _Filter _filter = _Filter.mine;

  List<Child> _apply(
    List<Child> all,
    Set<String> present,
    String? roomId,
    Map<String, List<String>> guardians,
  ) {
    final q = foldText(_query.trim());
    return all.where((c) {
      if (!c.active) return false;
      if (roomId != null) {
        if (c.classId != roomId) return false;
        final isPresent = present.contains(c.id);
        if (_filter == _Filter.mine && !isPresent) return false;
        if (_filter == _Filter.absent && isPresent) return false;
      }
      if (q.isEmpty) return true;
      return foldText(c.fullName).contains(q) ||
          foldText(c.nickname).contains(q) ||
          foldText(c.code).contains(q) ||
          (guardians[c.familyId] ?? const []).any(
            (g) => foldText(g).contains(q),
          );
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final present = ref.watch(presentIdsProvider);
    final children = ref.watch(childrenProvider);
    final room = ref.watch(myRoomProvider);
    final guardians = ref.watch(guardianNamesProvider).valueOrNull ?? const {};

    return Scaffold(
      appBar: AppBar(
        leading: const OpenDrawerButton(),
        actions: const [ModeSwitchAction()],
        title: const Text('Crianças'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.md,
              0,
              AppSpacing.md,
              AppSpacing.sm,
            ),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Buscar por criança, responsável ou código',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (v) => setState(() => _query = v),
            ),
          ),
          if (room != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              child: Row(
                children: [
                  for (final e
                      in {
                        _Filter.mine: 'Minha sala',
                        _Filter.absent: 'Ausentes',
                      }.entries)
                    Padding(
                      padding: const EdgeInsets.only(right: AppSpacing.sm),
                      child: ChoiceChip(
                        label: Text(e.value),
                        selected: _filter == e.key,
                        onSelected: (_) => setState(() => _filter = e.key),
                      ),
                    ),
                ],
              ),
            ),
          Expanded(
            child: AsyncValueWidget(
              value: children,
              data: (all) {
                final list = _apply(all, present, room?.classId, guardians);
                if (list.isEmpty) {
                  return const EmptyState(
                    icon: Icons.child_care,
                    title: 'Nenhuma criança encontrada',
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  itemCount: list.length,
                  separatorBuilder:
                      (_, _) => const SizedBox(height: AppSpacing.sm),
                  itemBuilder: (_, i) {
                    final c = list[i];
                    return ChildTile(
                      child: c,
                      present: present.contains(c.id),
                      onTap: () => context.push('/crianca/${c.id}'),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
