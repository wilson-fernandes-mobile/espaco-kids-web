import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/date_format.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../../shared/widgets/form_section_header.dart';
import '../../../../shared/widgets/greeting_header.dart';
import '../../../../shared/widgets/open_drawer_button.dart';
import '../../../../shared/widgets/mode_switch_action.dart';
import '../../../../shared/widgets/pattern_card.dart';
import '../../../../shared/widgets/person_avatar.dart';
import '../../../../shared/widgets/stat_card.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../calls/presentation/providers/calls_providers.dart';
import '../../../checkin/domain/entities/checkin_request.dart';
import '../../../checkin/presentation/providers/checkin_actions.dart';
import '../../../checkin/presentation/providers/checkin_providers.dart';
import '../../../kids/domain/entities/child.dart';
import '../../../kids/presentation/providers/kids_providers.dart';
import '../widgets/my_room_card.dart';
import '../widgets/team_by_room.dart';

/// Painel da equipe: ocupação, chamadas abertas e pedidos das famílias.
class StaffHomeScreen extends ConsumerWidget {
  const StaffHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).user!;
    final room = ref.watch(myRoomProvider);
    final allChildren = ref.watch(childrenProvider).valueOrNull ?? const [];
    final classes = ref.watch(classesProvider).valueOrNull ?? const [];
    final calls = ref.watch(callsProvider).valueOrNull ?? const [];
    final roomStaff = ref.watch(roomStaffProvider).valueOrNull ?? const [];

    // Com check-in numa sala, o painel mostra só as crianças dela; sem check-in,
    // mostra todas.
    final children =
        room == null
            ? allChildren
            : allChildren.where((c) => c.classId == room.classId).toList();
    final ids = {for (final c in children) c.id};
    final present = ref.watch(presentIdsProvider).where(ids.contains).toSet();
    final requests =
        (ref.watch(pendingRequestsProvider).valueOrNull ?? const [])
            .where((r) => room == null || ids.contains(r.childId))
            .toList();
    final openCalls =
        calls
            .where((c) => c.open && (room == null || c.classId == room.classId))
            .length;

    // Na sala: só a turma do check-in. Sem sala, o professor vê primeiro as
    // suas turmas.
    final mine = user.classIds.toSet();
    final shown =
        room != null
            ? classes.where((c) => c.id == room.classId).toList()
            : mine.isEmpty
            ? classes
            : classes.where((c) => mine.contains(c.id)).toList();

    return Scaffold(
      appBar: AppBar(
        leading: const OpenDrawerButton(),
        actions: const [ModeSwitchAction()],
        title: const Text('Início'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          GreetingHeader(
            name: user.name,
            badge: user.role.label,
            summary:
                requests.isNotEmpty
                    ? '${requests.length} ${requests.length == 1 ? 'pedido aguardando' : 'pedidos aguardando'} '
                        'a equipe · ${present.length} na sala'
                    : present.isEmpty
                    ? 'Nenhuma criança na sala agora.'
                    : '${present.length} ${present.length == 1 ? 'criança na sala' : 'crianças na sala'} agora.',
          ),
          const SizedBox(height: AppSpacing.md),
          const MyRoomCard(),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: _QuickAction(
                  icon: Icons.qr_code_scanner,
                  label: 'Ler crachá',
                  onTap: () => context.go('/ler'),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: _QuickAction(
                  icon: Icons.child_care,
                  label: 'Crianças',
                  onTap: () => context.go('/criancas'),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: _QuickAction(
                  icon: Icons.campaign,
                  label: 'Chamadas',
                  onTap: () => context.go('/chamadas'),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          // Duas linhas com altura do próprio conteúdo (e cards da mesma
          // linha iguais), sem altura fixa sobrando nem estourando.
          _StatRow(
            left: StatCard(
              label: 'Na sala agora',
              value: '${present.length}',
              icon: Icons.child_care,
              color: AppColors.success,
              onTap: () => context.go('/criancas'),
            ),
            right: StatCard(
              label: room == null ? 'Crianças ativas' : 'Crianças da turma',
              value: '${children.where((c) => c.active).length}',
              icon: Icons.groups_outlined,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          _StatRow(
            left: StatCard(
              label: 'Chamadas abertas',
              value: '$openCalls',
              icon: Icons.campaign_outlined,
              color: AppColors.warning,
              onTap: () => context.go('/chamadas'),
            ),
            right: StatCard(
              label: 'Pedidos das famílias',
              value: '${requests.length}',
              icon: Icons.notifications_active_outlined,
              color: AppColors.secondary,
            ),
          ),
          if (children.any(
            (c) => present.contains(c.id) && c.hasMedication,
          )) ...[
            const SizedBox(height: AppSpacing.lg),
            const FormSectionHeader(
              icon: Icons.medication_outlined,
              title: 'Medicações de hoje',
              description:
                  'Crianças na sala que tomam remédio. Toque para ver horários.',
            ),
            for (final c in children.where(
              (c) => present.contains(c.id) && c.hasMedication,
            ))
              Card(
                child: ListTile(
                  leading: PersonAvatar(name: c.fullName, photo: c.photoUrl),
                  title: Text(c.displayName),
                  subtitle: const Text('Toma medicação'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/crianca/${c.id}'),
                ),
              ),
          ],
          if (requests.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.lg),
            const FormSectionHeader(
              icon: Icons.how_to_reg_outlined,
              title: 'Pedidos das famílias',
            ),
            for (final r in requests)
              _RequestCard(
                request: r,
                children: children,
                canConfirm: user.role.canCheckInOut,
              ),
          ],
          const SizedBox(height: AppSpacing.lg),
          const TeamByRoom(),
          const SizedBox(height: AppSpacing.lg),
          const FormSectionHeader(
            icon: Icons.meeting_room_outlined,
            title: 'Turmas',
          ),
          const SizedBox(height: AppSpacing.md),
          if (shown.isEmpty)
            const SizedBox(
              height: 160,
              child: EmptyState(
                icon: Icons.meeting_room_outlined,
                title: 'Nenhuma turma',
                message:
                    'Peça ao administrador para atribuir turmas ao seu usuário.',
              ),
            ),
          for (final c in shown)
            Builder(
              builder: (_) {
                final inRoom =
                    children
                        .where(
                          (k) => k.classId == c.id && present.contains(k.id),
                        )
                        .length;
                final pct =
                    c.capacity == 0
                        ? 0.0
                        : (inRoom / c.capacity).clamp(0.0, 1.0);
                return Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: PatternCard(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  c.name,
                                  style:
                                      Theme.of(context).textTheme.titleMedium,
                                ),
                              ),
                              Text('$inRoom / ${c.capacity}'),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          LinearProgressIndicator(
                            value: pct,
                            minHeight: 8,
                            borderRadius: BorderRadius.circular(8),
                            color:
                                pct >= 0.9
                                    ? AppColors.danger
                                    : AppColors.primary,
                          ),
                          if (roomStaff.any((s) => s.classId == c.id)) ...[
                            const SizedBox(height: AppSpacing.sm),
                            Row(
                              children: [
                                const Icon(Icons.how_to_reg, size: 16),
                                const SizedBox(width: AppSpacing.xs),
                                Expanded(
                                  child: Text(
                                    roomStaff
                                        .where((s) => s.classId == c.id)
                                        .map((s) => s.name)
                                        .join(', '),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style:
                                        Theme.of(context).textTheme.bodySmall,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}

/// Dois cards lado a lado com a mesma altura (a do maior).
class _StatRow extends StatelessWidget {
  const _StatRow({required this.left, required this.right});

  final Widget left;
  final Widget right;

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(child: left),
          const SizedBox(width: AppSpacing.md),
          Expanded(child: right),
        ],
      ),
    );
  }
}

/// Atalho grande para as ações mais usadas pela equipe.
class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: scheme.primary.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: scheme.primary),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                label,
                style: Theme.of(context).textTheme.labelLarge,
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RequestCard extends ConsumerWidget {
  const _RequestCard({
    required this.request,
    required this.children,
    required this.canConfirm,
  });

  final CheckinRequest request;
  final List<Child> children;
  final bool canConfirm;

  Future<void> _confirm(
    BuildContext context,
    WidgetRef ref,
    Child child,
  ) async {
    final actions = ref.read(checkinActionsProvider);
    final repo = ref.read(checkinRepositoryProvider);
    final uid = ref.read(sessionProvider).user!.uid;
    try {
      if (request.isEntry) {
        final r = await actions.checkIn(child, request.requesterName);
        if (!r.ok) throw r.reason!;
      } else {
        final people = await ref
            .read(kidsRepositoryProvider)
            .getPeople(child.familyId);
        final person =
            people.where((p) => p.id == request.personId).firstOrNull;
        if (person == null) {
          if (context.mounted) {
            showInfo(
              context,
              'Abra a ficha da criança e escolha quem está retirando.',
            );
            context.push('/crianca/${child.id}');
          }
          return;
        }
        final r = await actions.checkOut(child, person);
        if (!r.ok) throw r.reason!;
      }
      await repo.resolveRequest(request.id, 'confirmado', uid);
      if (context.mounted) showInfo(context, 'Pedido confirmado.');
    } catch (e) {
      if (context.mounted) showError(context, e is String ? Exception(e) : e);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final child = children.where((c) => c.id == request.childId).firstOrNull;
    if (child == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  PersonAvatar(name: child.fullName, photo: child.photoUrl),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${request.isEntry ? 'Entrada' : 'Saída'} — ${child.displayName}',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        Text(
                          '${request.requesterName} · ${hhmm(request.createdAt)}',
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (canConfirm) ...[
                const SizedBox(height: AppSpacing.sm),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed:
                          () => ref
                              .read(checkinRepositoryProvider)
                              .resolveRequest(
                                request.id,
                                'recusado',
                                ref.read(sessionProvider).user!.uid,
                              ),
                      child: const Text('Recusar'),
                    ),
                    FilledButton(
                      onPressed: () => _confirm(context, ref, child),
                      child: const Text('Confirmar'),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
