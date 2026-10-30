import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/date_format.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../../shared/widgets/person_avatar.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../kids/domain/entities/child.dart';
import '../../../kids/domain/entities/person.dart';
import '../../../kids/presentation/providers/kids_providers.dart';
import '../providers/family_providers.dart';
import '../widgets/child_form.dart';
import '../../../tenant/presentation/providers/tenant_providers.dart';
import '../widgets/family_code_card.dart';
import '../widgets/import_family_sheet.dart';
import '../widgets/person_form.dart';

/// Primeiro acesso da família, em 4 passos curtos:
/// 1. seus dados · 2. seus filhos · 3. quem pode buscar · 4. código da família.
/// Tudo pode ser editado depois nas telas "Meus filhos" e "Autorizados".
class FamilySetupScreen extends ConsumerStatefulWidget {
  const FamilySetupScreen({super.key});

  @override
  ConsumerState<FamilySetupScreen> createState() => _FamilySetupScreenState();
}

class _FamilySetupScreenState extends ConsumerState<FamilySetupScreen> {
  static const _titles = [
    'Seus dados',
    'Seus filhos',
    'Quem pode buscar',
    'Código da família',
  ];

  final _form = GlobalKey<FormState>();
  final _phone = TextEditingController();
  bool _whatsapp = true;
  bool _busy = false;
  int _step = 0;

  @override
  void initState() {
    super.initState();
    // Se a família já foi criada (cadastro interrompido), segue do passo 2.
    final user = ref.read(sessionProvider).user;
    if (user != null && user.hasFamily) {
      _step = 1;
    } else if (user != null) {
      _claimLink(user.churchId);
    }
  }

  /// Se outro responsável já importou a família para esta igreja, entra nela
  /// direto, sem precisar do código da família.
  Future<void> _claimLink(String churchId) async {
    final linked = await ref
        .read(familyRepositoryProvider)
        .claimFamilyLink(churchId);
    if (!linked) return;
    for (var i = 0; i < 30; i++) {
      if (ref.read(sessionProvider).user?.hasFamily == true) break;
      await Future<void>.delayed(const Duration(milliseconds: 100));
    }
    if (mounted) setState(() => _step = 1);
  }

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  Future<void> _saveYou() async {
    if (!_form.currentState!.validate()) return;
    final user = ref.read(sessionProvider).user!;
    setState(() => _busy = true);
    try {
      await ref
          .read(familyRepositoryProvider)
          .registerFamily(
            user: user,
            phone: _phone.text.trim(),
            whatsapp: _whatsapp,
          );
      // Espera a conta refletir o vínculo com a família (assinatura do Firestore).
      for (var i = 0; i < 30; i++) {
        if (ref.read(sessionProvider).user?.hasFamily == true) break;
        await Future<void>.delayed(const Duration(milliseconds: 100));
      }
      if (mounted) setState(() => _step = 1);
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _next() => setState(() => _step++);
  void _back() => setState(() => _step--);

  void _finish() {
    final u = ref.read(sessionProvider).user;
    if (u != null && u.role.isStaff) {
      ref.read(familyModeProvider.notifier).set(true);
    }
    context.go('/familia');
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final user = ref.watch(sessionProvider).user;
    if (user == null) return const SizedBox.shrink();
    final children =
        user.hasFamily
            ? (ref.watch(familyChildrenProvider(user.familyId!)).valueOrNull ??
                const <Child>[])
            : const <Child>[];

    return Scaffold(
      appBar: AppBar(
        title: Text(user.churchName),
        automaticallyImplyLeading: false,
        actions: [
          TextButton(
            onPressed: () => context.go('/igrejas'),
            child: const Text('Trocar de igreja'),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.lg,
                AppSpacing.sm,
                AppSpacing.lg,
                AppSpacing.md,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Passo ${_step + 1} de ${_titles.length}',
                    style: Theme.of(
                      context,
                    ).textTheme.labelLarge?.copyWith(color: scheme.primary),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    _titles[_step],
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: (_step + 1) / _titles.length,
                      minHeight: 8,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                child: switch (_step) {
                  0 => _stepYou(user.name),
                  1 => _stepChildren(children),
                  2 => _stepPeople(children),
                  _ => _stepCode(),
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: _buttons(children),
            ),
          ],
        ),
      ),
    );
  }

  Widget _stepYou(String name) => Form(
    key: _form,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Olá, ${name.split(' ').first}! Vamos cadastrar sua família. '
          'Leva só um minuto e você pode mudar tudo depois.',
        ),
        const SizedBox(height: AppSpacing.lg),
        TextFormField(
          controller: _phone,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(
            labelText: 'Seu telefone com DDD',
            prefixIcon: Icon(Icons.phone_outlined),
          ),
          validator:
              (v) =>
                  (v ?? '').replaceAll(RegExp(r'\D'), '').length < 10
                      ? 'Informe o telefone com DDD'
                      : null,
        ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Tenho WhatsApp neste número'),
          value: _whatsapp,
          onChanged: (v) => setState(() => _whatsapp = v),
        ),
      ],
    ),
  );

  Widget _stepChildren(List<Child> kids) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text(
        'Adicione cada filho que vai ao ministério infantil. A turma é '
        'definida pela idade.',
      ),
      const SizedBox(height: AppSpacing.md),
      for (final c in kids)
        Card(
          child: ListTile(
            leading: PersonAvatar(name: c.fullName, photo: c.photoUrl),
            title: Text(c.displayName),
            subtitle: Text(ageLabel(c.birthDate)),
            trailing: TextButton(
              onPressed: () => context.push('/saude/${c.id}'),
              child: Text(c.careAlert ? 'Saúde ✓' : 'Saúde'),
            ),
            onTap: () => showChildSheet(context, child: c),
          ),
        ),
      const SizedBox(height: AppSpacing.sm),
      if (importableChurches(
        ref.watch(membershipsProvider).valueOrNull ?? const [],
        ref.watch(sessionProvider).user?.churchId ?? '',
      ).isNotEmpty) ...[
        FilledButton.tonalIcon(
          onPressed: () => showImportFamilySheet(context),
          icon: const Icon(Icons.download_outlined),
          label: const Text('Importar de outra igreja'),
        ),
        const SizedBox(height: AppSpacing.sm),
      ],
      OutlinedButton.icon(
        onPressed: () => showChildSheet(context),
        icon: const Icon(Icons.add),
        label: Text(kids.isEmpty ? 'Adicionar filho' : 'Adicionar outro filho'),
      ),
    ],
  );

  Widget _stepPeople(List<Child> kids) {
    final user = ref.watch(sessionProvider).user!;
    final people =
        ref.watch(familyPeopleProvider(user.familyId ?? '')).valueOrNull ??
        const <Person>[];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Quem, além de você, pode deixar ou buscar seus filhos? A recepção '
          'só entrega a criança para as pessoas desta lista. '
          'Pode pular e fazer depois.',
        ),
        const SizedBox(height: AppSpacing.md),
        for (final p in people)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: PersonAvatar(name: p.fullName),
            title: Text(p.fullName),
            subtitle: Text(p.relation),
          ),
        OutlinedButton.icon(
          onPressed: () => showPersonSheet(context, children: kids),
          icon: const Icon(Icons.person_add_alt),
          label: const Text('Adicionar pessoa'),
        ),
      ],
    );
  }

  Widget _stepCode() => const Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        'Pronto, sua família está cadastrada! Se o pai, a mãe ou outro '
        'responsável também vai usar o app, passe o código abaixo: ele entra '
        'na mesma família. Dá para fazer isso depois pelo menu.',
      ),
      SizedBox(height: AppSpacing.md),
      FamilyCodeCard(),
    ],
  );

  Widget _buttons(List<Child> kids) {
    switch (_step) {
      case 0:
        return SizedBox(
          width: double.infinity,
          child: FilledButton(
            onPressed: _busy ? null : _saveYou,
            child:
                _busy
                    ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                    : const Text('Continuar'),
          ),
        );
      case 1:
        return Row(
          children: [
            Expanded(
              child: FilledButton(
                onPressed: kids.isEmpty ? null : _next,
                child: const Text('Continuar'),
              ),
            ),
          ],
        );
      case 2:
        return Row(
          children: [
            OutlinedButton(onPressed: _back, child: const Text('Voltar')),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: FilledButton(
                onPressed: _next,
                child: const Text('Continuar'),
              ),
            ),
          ],
        );
      default:
        return Row(
          children: [
            OutlinedButton(onPressed: _back, child: const Text('Voltar')),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: FilledButton(
                onPressed: _finish,
                child: const Text('Concluir'),
              ),
            ),
          ],
        );
    }
  }
}
