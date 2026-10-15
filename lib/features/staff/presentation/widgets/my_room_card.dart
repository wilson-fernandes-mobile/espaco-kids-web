import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/date_format.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../kids/domain/entities/classroom.dart';
import '../../../kids/presentation/providers/kids_providers.dart';

/// Faz o check-in da pessoa da equipe na sala (aparece para os pais como o
/// professor da sala). Entrar noutra sala sai da anterior automaticamente.
Future<void> enterRoom(
  BuildContext context,
  WidgetRef ref,
  Classroom room,
) async {
  final user = ref.read(sessionProvider).user!;
  try {
    await ref
        .read(kidsRepositoryProvider)
        .enterRoom(
          uid: user.uid,
          name: user.name,
          photoUrl: user.photoUrl,
          room: room,
        );
    if (context.mounted) showInfo(context, 'Você está na sala ${room.name}.');
  } catch (e) {
    if (context.mounted) showError(context, e);
  }
}

Future<void> leaveRoom(BuildContext context, WidgetRef ref) async {
  final uid = ref.read(sessionProvider).user!.uid;
  try {
    await ref.read(kidsRepositoryProvider).leaveRoom(uid);
    if (context.mounted) showInfo(context, 'Check-out da sala feito.');
  } catch (e) {
    if (context.mounted) showError(context, e);
  }
}

/// Escolher a sala (lista das turmas ativas).
Future<void> pickRoom(BuildContext context, WidgetRef ref) async {
  final classes =
      (ref.read(classesProvider).valueOrNull ?? const <Classroom>[])
          .where((c) => c.active)
          .toList();
  final current = ref.read(myRoomProvider);
  final room = await showModalBottomSheet<Classroom>(
    context: context,
    showDragHandle: true,
    isScrollControlled: true,
    builder:
        (ctx) => SafeArea(
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
                Text(
                  'Em qual sala você está?',
                  style: Theme.of(ctx).textTheme.titleLarge,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  current == null
                      ? 'Os pais veem você como a equipe desta sala.'
                      : 'Você sai de ${current.className} automaticamente.',
                  style: Theme.of(ctx).textTheme.bodyMedium,
                ),
                const SizedBox(height: AppSpacing.sm),
                if (classes.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(AppSpacing.md),
                    child: Text('Nenhuma turma cadastrada.'),
                  ),
                Flexible(
                  child: ListView(
                    shrinkWrap: true,
                    children: [
                      for (final c in classes)
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(Icons.meeting_room_outlined),
                          title: Text(c.name),
                          subtitle: c.room.isEmpty ? null : Text(c.room),
                          trailing:
                              c.id == current?.classId
                                  ? const Icon(
                                    Icons.check_circle,
                                    color: AppColors.success,
                                  )
                                  : null,
                          onTap: () => Navigator.pop(ctx, c),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
  );
  if (room != null && context.mounted) await enterRoom(context, ref, room);
}

/// Cartão "Minha sala" no início da equipe.
class MyRoomCard extends ConsumerWidget {
  const MyRoomCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mine = ref.watch(myRoomProvider);
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final inRoom = mine != null;
    final color = inRoom ? AppColors.success : scheme.primary;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.14),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    inRoom ? Icons.how_to_reg : Icons.meeting_room_outlined,
                    color: color,
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        inRoom
                            ? 'Você está na sala ${mine.className}'
                            : 'Check-in na sala',
                        style: text.titleMedium,
                      ),
                      Text(
                        inRoom
                            ? 'Desde ${hhmm(mine.since)} · os pais veem você '
                                'como a equipe desta sala.'
                            : 'Mostre aos pais quem está com as crianças.',
                        style: text.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () => pickRoom(context, ref),
                    icon: Icon(inRoom ? Icons.swap_horiz : Icons.login),
                    label: Text(inRoom ? 'Trocar de sala' : 'Entrar numa sala'),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                if (inRoom)
                  OutlinedButton.icon(
                    onPressed: () => leaveRoom(context, ref),
                    icon: const Icon(Icons.logout),
                    label: const Text('Sair'),
                  )
                else
                  OutlinedButton.icon(
                    onPressed: () => context.go('/ler'),
                    icon: const Icon(Icons.qr_code_scanner),
                    label: const Text('Etiqueta'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
