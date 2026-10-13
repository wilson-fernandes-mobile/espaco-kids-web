import 'package:flutter/material.dart';
import '../../../../shared/widgets/open_drawer_button.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/date_format.dart';
import '../../../../shared/widgets/async_value_widget.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/form_section_header.dart';
import '../../../../shared/widgets/person_avatar.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../kids/domain/entities/person.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../kids/domain/entities/child.dart';
import '../../../kids/presentation/providers/kids_providers.dart';
import '../providers/family_providers.dart';
import '../widgets/person_form.dart';

/// Responsáveis e pessoas autorizadas a buscar as crianças. A própria família
/// inclui e remove pessoas aqui.
class FamilyPeopleScreen extends ConsumerWidget {
  const FamilyPeopleScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).user!;
    final people = ref.watch(familyPeopleProvider(user.familyId ?? ''));
    final kids =
        ref.watch(familyChildrenProvider(user.familyId ?? '')).valueOrNull ??
        const <Child>[];
    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showPersonSheet(context, children: kids),
        icon: const Icon(Icons.person_add_alt),
        label: const Text('Adicionar pessoa'),
      ),
      appBar: AppBar(
        leading: const OpenDrawerButton(),
        title: const Text('Quem pode buscar'),
      ),
      body: AsyncValueWidget(
        value: people,
        data: (list) {
          if (list.isEmpty) {
            return const EmptyState(
              icon: Icons.verified_user_outlined,
              title: 'Nenhuma pessoa cadastrada',
              message: 'Toque em "Adicionar pessoa" para incluir quem pode buscar.',
            );
          }
          final guardians = list.where((p) => p.kind == PersonKind.guardian);
          final authorized = list.where((p) => p.kind == PersonKind.authorized);
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.md),
            children: [
              const FormSectionHeader(
                icon: Icons.family_restroom,
                title: 'Responsáveis',
              ),
              for (final p in guardians) _tile(context, ref, p, kids),
              const SizedBox(height: AppSpacing.md),
              const FormSectionHeader(
                icon: Icons.verified_user_outlined,
                title: 'Autorizados',
              ),
              for (final p in authorized) _tile(context, ref, p, kids),
              const SizedBox(height: 88),
            ],
          );
        },
      ),
    );
  }

  Widget _tile(
    BuildContext context,
    WidgetRef ref,
    Person p,
    List<Child> kids,
  ) => ListTile(
    contentPadding: EdgeInsets.zero,
    leading: PersonAvatar(name: p.fullName),
    title: Text(p.fullName),
    subtitle: Text(
      p.kind == PersonKind.authorized && p.validUntil != null
          ? '${p.relation} · até ${shortDate(p.validUntil)}'
          : p.relation,
    ),
    trailing: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        p.canPickUp
            ? const StatusBadge(
              label: 'Autorizado',
              tone: StatusTone.success,
              dense: true,
            )
            : const StatusBadge(
              label: 'Vencido',
              tone: StatusTone.danger,
              dense: true,
            ),
        IconButton(
          tooltip: 'Remover',
          icon: const Icon(Icons.delete_outline),
          onPressed: () async {
            final user = ref.read(sessionProvider).user!;
            final ok = await confirm(
              context,
              title: 'Remover ${p.fullName}?',
              message: 'Essa pessoa deixa de poder buscar seus filhos.',
              action: 'Remover',
            );
            if (!ok) return;
            try {
              await ref
                  .read(familyRepositoryProvider)
                  .removePerson(
                    churchId: user.churchId,
                    person: p,
                    children: kids,
                  );
            } catch (e) {
              if (context.mounted) showError(context, e);
            }
          },
        ),
      ],
    ),
  );
}
