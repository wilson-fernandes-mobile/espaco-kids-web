import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/person_avatar.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../domain/entities/person.dart';
import '../providers/kids_providers.dart';

/// Escolhe quem está entregando/retirando (responsáveis e autorizados).
Future<Person?> pickPerson(
  BuildContext context, {
  required String familyId,
  required String title,
  required List<String> allowedIds,
}) {
  return showModalBottomSheet<Person>(
    context: context,
    isScrollControlled: true,
    builder:
        (_) => _PersonPicker(
          familyId: familyId,
          title: title,
          allowedIds: allowedIds,
        ),
  );
}

class _PersonPicker extends ConsumerWidget {
  const _PersonPicker({
    required this.familyId,
    required this.title,
    required this.allowedIds,
  });

  final String familyId;
  final String title;
  final List<String> allowedIds;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final people = ref.watch(familyPeopleProvider(familyId));
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.md,
          0,
          AppSpacing.md,
          AppSpacing.md,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: AppSpacing.sm),
            people.when(
              loading:
                  () => const Padding(
                    padding: EdgeInsets.all(AppSpacing.lg),
                    child: Center(child: CircularProgressIndicator()),
                  ),
              error:
                  (_, _) => const Text('Não foi possível carregar as pessoas.'),
              data: (list) {
                if (list.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.all(AppSpacing.md),
                    child: Text('Nenhuma pessoa cadastrada nesta família.'),
                  );
                }
                return Flexible(
                  child: ListView(
                    shrinkWrap: true,
                    children: [
                      for (final p in list)
                        ListTile(
                          leading: PersonAvatar(name: p.fullName),
                          title: Text(p.fullName),
                          subtitle: Text(p.relation),
                          trailing: _tag(p),
                          onTap: () => Navigator.pop(context, p),
                        ),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget? _tag(Person p) {
    if (!allowedIds.contains(p.id)) {
      return const StatusBadge(
        label: 'Não autorizado',
        tone: StatusTone.danger,
        dense: true,
      );
    }
    if (!p.canPickUp) {
      return const StatusBadge(
        label: 'Vencido',
        tone: StatusTone.warning,
        dense: true,
      );
    }
    return null;
  }
}
