import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/date_format.dart';
import '../../../../shared/widgets/form_section_header.dart';
import '../../../../shared/widgets/person_avatar.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../kids/presentation/providers/kids_providers.dart';

/// "Quem está em cada sala": a equipe com check-in hoje, por turma (todas as
/// turmas, mesmo as que a pessoa não leciona).
class TeamByRoom extends ConsumerWidget {
  const TeamByRoom({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final classes =
        (ref.watch(classesProvider).valueOrNull ?? const [])
            .where((c) => c.active)
            .toList();
    final staff = ref.watch(roomStaffProvider).valueOrNull ?? const [];
    final me = ref.watch(sessionProvider).user?.uid;
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    if (classes.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        FormSectionHeader(
          icon: Icons.groups_2_outlined,
          title: 'Equipe nas salas',
          description:
              '${staff.length} ${staff.length == 1 ? 'pessoa' : 'pessoas'} com check-in hoje.',
        ),
        const SizedBox(height: AppSpacing.sm),
        Card(
          margin: EdgeInsets.zero,
          child: Column(
            children: [
              for (var i = 0; i < classes.length; i++) ...[
                if (i > 0) const Divider(height: 1),
                Builder(
                  builder: (_) {
                    final c = classes[i];
                    final team = staff.where((s) => s.classId == c.id).toList();
                    return Padding(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(c.name, style: text.titleSmall),
                              ),
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color:
                                      team.isEmpty
                                          ? scheme.outline
                                          : AppColors.success,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                team.isEmpty
                                    ? 'Sem equipe'
                                    : '${team.length} na sala',
                                style: text.labelSmall?.copyWith(
                                  color: scheme.onSurfaceVariant,
                                ),
                              ),
                            ],
                          ),
                          if (team.isNotEmpty) ...[
                            const SizedBox(height: AppSpacing.sm),
                            Wrap(
                              spacing: AppSpacing.md,
                              runSpacing: AppSpacing.sm,
                              children: [
                                for (final s in team)
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      PersonAvatar(
                                        name: s.name,
                                        photo: s.photoUrl,
                                        radius: 16,
                                      ),
                                      const SizedBox(width: AppSpacing.sm),
                                      Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            s.uid == me
                                                ? '${s.name.split(' ').first} (você)'
                                                : s.name
                                                    .split(' ')
                                                    .take(2)
                                                    .join(' '),
                                            style: text.bodyMedium,
                                          ),
                                          Text(
                                            'desde ${hhmm(s.since)}',
                                            style: text.labelSmall?.copyWith(
                                              color: scheme.onSurfaceVariant,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    );
                  },
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
