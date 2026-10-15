import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../../../../core/constants/app_role.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/date_format.dart';
import '../../../../shared/widgets/form_section_header.dart';
import '../../../../shared/widgets/person_avatar.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../kids/presentation/providers/kids_providers.dart';

/// QR da sala (`EKT:<igreja>:<turma>`) na tela, para a equipe ler no app.
/// Para imprimir a etiqueta, use o painel web (Turmas e salas).
void _showTag(
  BuildContext context,
  String churchId,
  String classId,
  String name,
  String room,
) {
  showDialog<void>(
    context: context,
    builder:
        (ctx) => AlertDialog(
          title: Text(name, textAlign: TextAlign.center),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (room.isNotEmpty) Text(room),
              const SizedBox(height: AppSpacing.md),
              Container(
                color: Colors.white,
                padding: const EdgeInsets.all(AppSpacing.sm),
                child: QrImageView(
                  data: 'EKT:$churchId:$classId',
                  size: 240,
                  backgroundColor: Colors.white,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'A equipe lê este QR em "Ler crachá ou sala" para entrar na '
                'sala. Para imprimir a etiqueta, use o painel web '
                '(Turmas e salas).',
                textAlign: TextAlign.center,
                style: Theme.of(ctx).textTheme.bodySmall,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Fechar'),
            ),
          ],
        ),
  );
}

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
    final user = ref.watch(sessionProvider).user;
    final me = user?.uid;
    final canShowTag =
        user?.role == AppRole.admin || user?.role == AppRole.coordenacao;
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
                              // Administração/coordenação: ver o QR da sala.
                              if (canShowTag)
                                IconButton(
                                  tooltip: 'QR Code da sala',
                                  visualDensity: VisualDensity.compact,
                                  icon: const Icon(Icons.qr_code_2),
                                  onPressed:
                                      () => _showTag(
                                        context,
                                        user!.churchId,
                                        c.id,
                                        c.name,
                                        c.room,
                                      ),
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
