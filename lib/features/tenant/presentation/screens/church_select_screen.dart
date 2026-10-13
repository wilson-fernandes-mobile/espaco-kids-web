import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/constants/app_role.dart';
import '../../../../core/errors/failures.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/tenant_repository.dart';
import '../../domain/church_membership.dart';
import '../providers/tenant_providers.dart';
import '../widgets/church_logo.dart';

/// Escolher a igreja ativa ou entrar noutra com um código. A mesma conta pode
/// ter papéis diferentes em cada igreja (ex.: admin na sua e família numa
/// igreja que está visitando).
class ChurchSelectScreen extends ConsumerWidget {
  const ChurchSelectScreen({super.key});

  Future<void> _pick(BuildContext context, WidgetRef ref, String id) async {
    ref.read(selectedChurchIdProvider.notifier).select(id);
    // O roteador leva para o início do papel nesta igreja.
    if (context.mounted) context.go('/splash');
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final memberships = ref.watch(membershipsProvider).valueOrNull ?? const [];
    final current = ref.watch(currentMembershipProvider)?.churchId;
    final canGoBack = current != null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Minhas igrejas'),
        automaticallyImplyLeading: false,
        leading:
            canGoBack
                ? IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => context.go('/splash'),
                )
                : null,
        actions: [
          IconButton(
            tooltip: 'Sair da conta',
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authRepositoryProvider).signOut(),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          if (memberships.isEmpty)
            const SizedBox(
              height: 260,
              child: EmptyState(
                icon: Icons.church_outlined,
                title: 'Você ainda não está em nenhuma igreja',
                message:
                    'Entre com o código que a igreja te passou: o de família '
                    'ou o de convite da equipe.',
              ),
            ),
          for (final m in memberships)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: Card(
                clipBehavior: Clip.antiAlias,
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.md,
                    vertical: AppSpacing.sm,
                  ),
                  leading: ChurchLogo(churchId: m.churchId),

                  title: Text(m.churchName),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        StatusBadge(label: m.role.label, dense: true),
                        // Quem entrou como família pode virar voluntário com
                        // o código da equipe (e mantém os filhos vinculados).
                        if (m.role.isStaff && (m.familyId ?? '').isEmpty)
                          TextButton.icon(
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: const Size(0, 32),
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            onPressed:
                                () => _asVolunteer(
                                  context,
                                  ref,
                                  m,
                                  volunteer: false,
                                ),
                            icon: const Icon(Icons.family_restroom, size: 18),
                            label: const Text('Vincular minha família'),
                          ),
                        if (m.role == AppRole.responsavel)
                          TextButton.icon(
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: const Size(0, 32),
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            onPressed: () => _asVolunteer(context, ref, m),
                            icon: const Icon(
                              Icons.volunteer_activism,
                              size: 18,
                            ),
                            label: const Text('Entrar como voluntário'),
                          ),
                      ],
                    ),
                  ),
                  trailing:
                      m.churchId == current
                          ? Icon(
                            Icons.check_circle,
                            color: Theme.of(context).colorScheme.primary,
                          )
                          : const Icon(Icons.chevron_right),
                  onTap: () => _pick(context, ref, m.churchId),
                ),
              ),
            ),
          const SizedBox(height: AppSpacing.md),
          FilledButton.icon(
            onPressed: () => _joinWithCode(context, ref),
            icon: const Icon(Icons.vpn_key_outlined),
            label: const Text('Entrar com um código'),
          ),
        ],
      ),
    );
  }

  Future<void> _asVolunteer(
    BuildContext context,
    WidgetRef ref,
    ChurchMembership church, {
    bool volunteer = true,
  }) async {
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _CodeSheet(church: church, volunteer: volunteer),
    );
    if (ok == true && context.mounted) {
      showInfo(
        context,
        volunteer
            ? 'Pronto! Você agora também é da equipe.'
            : 'Pronto! Seus filhos foram vinculados.',
      );
      await _pick(context, ref, church.churchId);
    }
  }

  Future<void> _joinWithCode(BuildContext context, WidgetRef ref) async {
    final churchId = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => const _JoinSheet(),
    );
    if (churchId != null && context.mounted) {
      await _pick(context, ref, churchId);
    }
  }
}

class _JoinSheet extends ConsumerStatefulWidget {
  const _JoinSheet();

  @override
  ConsumerState<_JoinSheet> createState() => _JoinSheetState();
}

class _JoinSheetState extends ConsumerState<_JoinSheet> {
  final _code = TextEditingController();
  CodeInfo? _info;
  AppRole _role = AppRole.professor;
  bool _busy = false;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_code.text.trim().length < 6) return;
    setState(() => _busy = true);
    final repo = ref.read(tenantRepositoryProvider);
    try {
      // 1º passo: descobre a igreja e o tipo; convite de equipe ainda pergunta o papel.
      _info ??= await repo.peekCode(_code.text);
      if (_info!.kind == CodeKind.invite && !_roleConfirmed) {
        setState(() => _roleConfirmed = true);
        return;
      }
      final id = await repo.joinWithCode(
        code: _code.text,
        staffRole: _info!.kind == CodeKind.invite ? _role : null,
      );
      if (mounted) Navigator.pop(context, id);
    } catch (e) {
      _info = null;
      _roleConfirmed = false;
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  bool _roleConfirmed = false;

  @override
  Widget build(BuildContext context) {
    final asksRole = _info?.kind == CodeKind.invite && _roleConfirmed;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.lg,
        0,
        AppSpacing.lg,
        MediaQuery.viewInsetsOf(context).bottom + AppSpacing.lg,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Entrar numa igreja',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: AppSpacing.md),
          TextField(
            controller: _code,
            enabled: !asksRole,
            textCapitalization: TextCapitalization.characters,
            decoration: const InputDecoration(
              labelText: 'Código',
              hintText: 'LK-XXXXXX ou KIDS-XXXXXX',
              helperText: 'Família: código de vínculo. Equipe: convite.',
            ),
            onSubmitted: (_) => _submit(),
          ),
          if (asksRole) ...[
            const SizedBox(height: AppSpacing.md),
            Text(
              'Em ${_info!.churchName} você será:',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.sm),
            SegmentedButton<AppRole>(
              segments: const [
                ButtonSegment(
                  value: AppRole.professor,
                  label: Text('Professor(a)'),
                ),
                ButtonSegment(value: AppRole.recepcao, label: Text('Recepção')),
              ],
              selected: {_role},
              onSelectionChanged: (s) => setState(() => _role = s.first),
            ),
          ],
          const SizedBox(height: AppSpacing.lg),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child:
                _busy
                    ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                    : Text(asksRole ? 'Entrar' : 'Continuar'),
          ),
        ],
      ),
    );
  }
}

/// Código para quem já está na igreja: da equipe (família -> voluntário) ou da
/// família (voluntário -> vincular os filhos).
class _CodeSheet extends ConsumerStatefulWidget {
  const _CodeSheet({required this.church, required this.volunteer});

  final ChurchMembership church;

  /// 	rue: família -> voluntário (código KIDS-…). alse: voluntário ->
  /// vincular a própria família (código LK-…).
  final bool volunteer;

  @override
  ConsumerState<_CodeSheet> createState() => _CodeSheetState();
}

class _CodeSheetState extends ConsumerState<_CodeSheet> {
  final _code = TextEditingController();
  AppRole _role = AppRole.professor;
  bool _busy = false;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_code.text.trim().length < 6) return;
    setState(() => _busy = true);
    final repo = ref.read(tenantRepositoryProvider);
    try {
      final info = await repo.peekCode(_code.text);
      final want = widget.volunteer ? CodeKind.invite : CodeKind.family;
      if (info.kind != want) {
        throw Failure(
          widget.volunteer
              ? 'Esse é um código de família. Use o código de convite da equipe.'
              : 'Esse não é um código de família (LK-…).',
        );
      }
      if (info.churchId != widget.church.churchId) {
        throw Failure(
          'Esse código é de outra igreja. Use o código de ${widget.church.churchName}.',
        );
      }
      await repo.joinWithCode(
        code: _code.text,
        staffRole: widget.volunteer ? _role : null,
      );
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.lg,
        0,
        AppSpacing.lg,
        MediaQuery.viewInsetsOf(context).bottom + AppSpacing.lg,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            widget.volunteer
                ? 'Entrar como voluntário'
                : 'Vincular minha família',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            widget.volunteer
                ? 'Em ${widget.church.churchName} você continua com o acesso da '
                    'família e ganha o da equipe.'
                : 'Em ${widget.church.churchName} você continua na equipe e '
                    'ganha o acesso aos seus filhos.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: AppSpacing.md),
          TextField(
            controller: _code,
            textCapitalization: TextCapitalization.characters,
            decoration: InputDecoration(
              labelText:
                  widget.volunteer ? 'Código da equipe' : 'Código da família',
              hintText: widget.volunteer ? 'KIDS-XXXXXX' : 'LK-XXXXXX',
              helperText:
                  widget.volunteer
                      ? 'Peça ao administrador da igreja'
                      : 'Peça à recepção do ministério infantil',
            ),
            onSubmitted: (_) => _submit(),
          ),
          if (widget.volunteer) ...[
            const SizedBox(height: AppSpacing.md),
            SegmentedButton<AppRole>(
              segments: const [
                ButtonSegment(
                  value: AppRole.professor,
                  label: Text('Professor(a)'),
                ),
                ButtonSegment(value: AppRole.recepcao, label: Text('Recepção')),
              ],
              selected: {_role},
              onSelectionChanged: (s) => setState(() => _role = s.first),
            ),
          ],
          const SizedBox(height: AppSpacing.lg),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child:
                _busy
                    ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                    : Text(
                      widget.volunteer ? 'Entrar como voluntário' : 'Vincular',
                    ),
          ),
        ],
      ),
    );
  }
}
