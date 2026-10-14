import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/date_format.dart';
import '../../../../shared/widgets/async_value_widget.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../../shared/widgets/greeting_header.dart';
import '../../../../shared/widgets/open_drawer_button.dart';
import '../../../../shared/widgets/pattern_card.dart';
import '../../../../shared/widgets/person_avatar.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../checkin/domain/entities/checkin_request.dart';
import '../../../checkin/presentation/providers/checkin_providers.dart';
import '../../../kids/domain/entities/child.dart';
import '../../../kids/presentation/providers/kids_providers.dart';
import '../../../kids/domain/entities/person.dart';
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

    return PatternCard(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                PersonAvatar(
                  name: child.fullName,
                  photo: child.photoUrl,
                  radius: 32,
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
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      Text(
                        ageLabel(child.birthDate),
                        style: TextStyle(color: scheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Editar cadastro',
                  icon: const Icon(Icons.edit_outlined),
                  onPressed: () => showChildSheet(context, child: child),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.md,
                vertical: AppSpacing.sm + 2,
              ),
              decoration: BoxDecoration(
                color:
                    present
                        ? AppColors.success.withValues(alpha: 0.12)
                        : scheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
              ),
              child: Row(
                children: [
                  Icon(
                    present ? Icons.check_circle : Icons.meeting_room_outlined,
                    size: 20,
                    color:
                        present ? AppColors.success : scheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      present
                          ? 'Na sala desde ${hhmm(presence.at)}'
                          : 'Fora da sala',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color:
                            present
                                ? AppColors.success
                                : scheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
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
            const SizedBox(height: AppSpacing.sm),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => context.push('/saude/${child.id}'),
                icon: Icon(
                  child.careAlert ? Icons.favorite : Icons.favorite_border,
                  size: 18,
                  color: child.careAlert ? AppColors.danger : null,
                ),
                label: Text(
                  child.careAlert
                      ? 'Saúde e cuidados · preenchido'
                      : 'Saúde e cuidados',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
