import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/date_format.dart';
import '../../../../shared/widgets/async_value_widget.dart';
import '../../../../shared/widgets/avatar_stack.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../../shared/widgets/greeting_header.dart';
import '../../../../shared/widgets/open_drawer_button.dart';
import '../../../../shared/widgets/mode_switch_action.dart';
import '../../../../shared/widgets/pattern_card.dart';
import '../../../../shared/widgets/person_avatar.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../checkin/domain/entities/checkin_request.dart';
import '../../../checkin/presentation/providers/checkin_providers.dart';
import '../../../kids/domain/entities/child.dart';
import '../../../kids/presentation/providers/kids_providers.dart';
import '../../../kids/domain/entities/person.dart';
import '../../../kids/domain/entities/room_staff.dart';
import '../providers/family_providers.dart';
import '../widgets/child_form.dart';
import '../widgets/family_code_card.dart';

/// Início da família: filhos, se estão na sala e pedidos de entrada/saída.
class FamilyHomeScreen extends ConsumerWidget {
  const FamilyHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).user!;
    final children = ref.watch(childrenProvider);
    final requests = ref.watch(familyRequestsProvider).valueOrNull ?? const [];

    return Scaffold(
      appBar: AppBar(
        leading: const OpenDrawerButton(),
        actions: const [ModeSwitchAction()],
        title: const Text('Meus filhos'),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showChildSheet(context),
        icon: const Icon(Icons.add),
        label: const Text('Adicionar filho'),
      ),
      body: AsyncValueWidget(
        value: children,
        data: (list) {
          final kids = list.where((c) => c.active).toList();
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.md),
            children: [
              GreetingHeader(
                name: user.name,
                badge: user.role.label,
                summary:
                    kids.isEmpty
                        ? 'Seus filhos aparecerão aqui.'
                        : kids.length == 1
                        ? 'Acompanhe ${kids.first.displayName} no ministério infantil.'
                        : 'Acompanhe seus ${kids.length} filhos no ministério infantil.',
              ),
              const SizedBox(height: AppSpacing.md),
              if (user.personId == null) const _WhoAreYouCard(),
              if (kids.isEmpty)
                const SizedBox(
                  height: 280,
                  child: EmptyState(
                    icon: Icons.child_care,
                    title: 'Nenhum filho cadastrado',
                    message: 'Toque em "Adicionar filho" para cadastrar.',
                  ),
                ),
              for (final c in kids)
                Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.md),
                  child: _KidCard(
                    child: c,
                    request:
                        requests
                            .where((r) => r.childId == c.id && r.pending)
                            .firstOrNull,
                  ),
                ),
              const FamilyCodeCard(),
              const SizedBox(height: 88),
            ],
          );
        },
      ),
    );
  }
}

/// Primeiro acesso de quem entrou pelo código da família: confirma o telefone
/// e vira responsável na lista automaticamente (ou escolhe o nome, se a
/// família já o tinha cadastrado).
class _WhoAreYouCard extends ConsumerStatefulWidget {
  const _WhoAreYouCard();

  @override
  ConsumerState<_WhoAreYouCard> createState() => _WhoAreYouCardState();
}

class _WhoAreYouCardState extends ConsumerState<_WhoAreYouCard> {
  final _phone = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  Future<void> _join() async {
    final user = ref.read(sessionProvider).user!;
    if (_phone.text.replaceAll(RegExp(r'\D'), '').length < 10) {
      showInfo(context, 'Informe o telefone com DDD.');
      return;
    }
    setState(() => _busy = true);
    try {
      final kids =
          ref.read(familyChildrenProvider(user.familyId ?? '')).valueOrNull ??
          const <Child>[];
      final id = await ref
          .read(familyRepositoryProvider)
          .addPerson(
            churchId: user.churchId,
            familyId: user.familyId!,
            kind: PersonKind.guardian,
            fullName: user.name,
            phone: _phone.text.trim(),
            relation: 'Responsável',
            whatsapp: true,
            children: kids,
          );
      await ref
          .read(authRepositoryProvider)
          .setPerson(user.churchId, user.uid, id, PersonKind.guardian.id);
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider).user!;
    final people =
        ref.watch(familyPeopleProvider(user.familyId ?? '')).valueOrNull ??
        const <Person>[];
    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Confirme seus dados',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: AppSpacing.xs),
            const Text(
              'Assim a equipe sabe quem está entregando ou retirando as '
              'crianças. Você entra na lista de responsáveis da família.',
            ),
            const SizedBox(height: AppSpacing.md),
            TextField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Seu telefone com DDD',
                prefixIcon: Icon(Icons.phone_outlined),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _busy ? null : _join,
                child: const Text('Confirmar'),
              ),
            ),
            if (people.isNotEmpty) ...[
              const Divider(height: AppSpacing.lg),
              Text(
                'Já estou na lista? Escolha seu nome:',
                style: Theme.of(context).textTheme.labelLarge,
              ),
              for (final p in people)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: PersonAvatar(name: p.fullName),
                  title: Text(p.fullName),
                  subtitle: Text(p.relation),
                  onTap: () async {
                    try {
                      await ref
                          .read(authRepositoryProvider)
                          .setPerson(user.churchId, user.uid, p.id, p.kind.id);
                    } catch (e) {
                      if (context.mounted) showError(context, e);
                    }
                  },
                ),
            ],
          ],
        ),
      ),
    );
  }
}

/// "Equipe na sala": só as bolinhas (avatares sobrepostos); ao tocar, abre a
/// lista de quem está na sala.
class _RoomTeam extends StatelessWidget {
  const _RoomTeam({required this.team});

  final List<RoomStaff> team;

  void _openList(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
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
                    'Equipe na sala ${team.first.className}',
                    style: Theme.of(ctx).textTheme.titleLarge,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Quem está com as crianças agora.',
                    style: Theme.of(ctx).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Flexible(
                    child: ListView(
                      shrinkWrap: true,
                      children: [
                        for (final s in team)
                          ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: PersonAvatar(
                              name: s.name,
                              photo: s.photoUrl,
                              radius: 22,
                            ),
                            title: Text(s.name),
                            subtitle: Text('Na sala desde ${hhmm(s.since)}'),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: 'Equipe na sala ${team.first.className}',
      child: InkWell(
        borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
        onTap: () => _openList(context),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xs),
          child: AvatarStack(
            size: 30,
            overlap: 10,
            maxVisible: 3,
            people: [
              for (final s in team)
                (id: s.uid, name: s.name, photoUrl: s.photoUrl),
            ],
          ),
        ),
      ),
    );
  }
}

class _KidCard extends ConsumerWidget {
  const _KidCard({required this.child, required this.request});

  final Child child;
  final CheckinRequest? request;

  Future<void> _ask(BuildContext context, WidgetRef ref, String kind) async {
    final user = ref.read(sessionProvider).user!;
    try {
      await ref
          .read(checkinRepositoryProvider)
          .createRequest(
            child: child,
            kind: kind,
            requesterUid: user.uid,
            requesterName: user.name,
            personId: user.personId,
            personKind: user.personKind,
          );
      if (context.mounted) {
        showInfo(
          context,
          kind == 'entrada'
              ? 'Aviso enviado. A recepção vai confirmar a entrada.'
              : 'Aviso enviado. A equipe está preparando a saída.',
        );
      }
    } catch (e) {
      if (context.mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final presence = ref.watch(childPresenceProvider(child.id)).valueOrNull;
    final present = presence != null;
    final scheme = Theme.of(context).colorScheme;
    // Equipe que fez check-in na sala do filho hoje.
    final team =
        (ref.watch(roomStaffProvider).valueOrNull ?? const <RoomStaff>[])
            .where(
              (s) => child.classId.isNotEmpty && s.classId == child.classId,
            )
            .toList();

    final text = Theme.of(context).textTheme;
    final statusColor = present ? AppColors.success : scheme.onSurfaceVariant;
    final age = ageLabel(child.birthDate);

    return PatternCard(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Quem é: foto, nome e idade (turma quando a equipe está na sala).
            Row(
              children: [
                PersonAvatar(
                  name: child.fullName,
                  photo: child.photoUrl,
                  radius: 28,
                  viewable: true,
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        child.displayName,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: text.titleLarge,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        [
                          if (team.isNotEmpty) team.first.className,
                          age,
                        ].where((e) => e.isNotEmpty).join(' · '),
                        style: text.bodyMedium?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            // Onde está: um selo de status e, ao lado, a equipe da sala.
            // Altura fixa: com ou sem equipe na sala, o selo não muda de lugar.
            SizedBox(
              height: 40,
              child: Row(
                children: [
                  Expanded(
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.sm + 4,
                          vertical: AppSpacing.xs + 2,
                        ),
                        decoration: BoxDecoration(
                          color:
                              present
                                  ? AppColors.success.withValues(alpha: 0.12)
                                  : scheme.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              present
                                  ? Icons.check_circle
                                  : Icons.meeting_room_outlined,
                              size: 16,
                              color: statusColor,
                            ),
                            const SizedBox(width: AppSpacing.xs + 2),
                            Flexible(
                              child: Text(
                                present
                                    ? 'Na sala desde ${hhmm(presence.at)}'
                                    : 'Fora da sala',
                                overflow: TextOverflow.ellipsis,
                                style: text.labelLarge?.copyWith(
                                  color: statusColor,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  if (team.isNotEmpty) _RoomTeam(team: team),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            // Ação principal (ou o pedido em andamento).
            if (request != null)
              Container(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.md,
                  AppSpacing.xs,
                  AppSpacing.xs,
                  AppSpacing.xs,
                ),
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.hourglass_top, size: 20),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        request!.isEntry
                            ? 'Aguardando a recepção confirmar a entrada…'
                            : 'Aguardando a equipe liberar a saída…',
                      ),
                    ),
                    TextButton(
                      onPressed:
                          () => ref
                              .read(checkinRepositoryProvider)
                              .cancelRequest(request!.id),
                      child: const Text('Cancelar'),
                    ),
                  ],
                ),
              )
            else
              SizedBox(
                width: double.infinity,
                height: 48,
                child:
                    present
                        ? FilledButton.icon(
                          onPressed: () => _ask(context, ref, 'saida'),
                          icon: const Icon(Icons.logout),
                          label: const Text('Vou buscar'),
                        )
                        : FilledButton.icon(
                          onPressed: () => _ask(context, ref, 'entrada'),
                          icon: const Icon(Icons.login),
                          label: const Text('Estou chegando'),
                        ),
              ),
            const SizedBox(height: AppSpacing.xs),
            // Ações secundárias, discretas: saúde e cadastro.
            Row(
              children: [
                Expanded(
                  child: TextButton.icon(
                    onPressed: () => context.push('/saude/${child.id}'),
                    icon: Icon(
                      child.careAlert ? Icons.favorite : Icons.favorite_border,
                      size: 18,
                      color: child.careAlert ? AppColors.danger : null,
                    ),
                    label: Text(
                      child.careAlert ? 'Saúde · preenchida' : 'Saúde',
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
                SizedBox(
                  height: 20,
                  child: VerticalDivider(
                    width: 1,
                    color: scheme.outlineVariant,
                  ),
                ),
                Expanded(
                  child: TextButton.icon(
                    onPressed: () => showChildSheet(context, child: child),
                    icon: const Icon(Icons.edit_outlined, size: 18),
                    label: const Text('Editar'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
