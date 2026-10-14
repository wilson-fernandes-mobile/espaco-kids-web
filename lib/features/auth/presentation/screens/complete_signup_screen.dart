import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_role.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../tenant/data/tenant_repository.dart';
import '../../../tenant/presentation/providers/tenant_providers.dart';
import '../providers/auth_providers.dart';
import '../widgets/auth_background.dart';
import '../widgets/logo_header.dart';

enum _Mode { family, staff }

/// Primeiro acesso com Google/Apple: a conta já existe, falta confirmar o nome
/// e informar o código da igreja (família `IG-`/`LK-` ou equipe `KIDS-`).
class CompleteSignupScreen extends ConsumerStatefulWidget {
  const CompleteSignupScreen({super.key});

  @override
  ConsumerState<CompleteSignupScreen> createState() =>
      _CompleteSignupScreenState();
}

class _CompleteSignupScreenState extends ConsumerState<CompleteSignupScreen> {
  final _form = GlobalKey<FormState>();
  final _code = TextEditingController();
  late final TextEditingController _name;
  _Mode _mode = _Mode.family;
  AppRole _staffRole = AppRole.professor;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authStateProvider).valueOrNull;
    _name = TextEditingController(text: user?.displayName ?? '');
  }

  @override
  void dispose() {
    _code.dispose();
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      final churchId = await ref
          .read(tenantRepositoryProvider)
          .completeSocialSignUp(
            code: _code.text,
            name: _name.text,
            expected: _mode == _Mode.family ? CodeKind.family : CodeKind.invite,
            staffRole: _mode == _Mode.family ? null : _staffRole,
          );
      // O roteador leva para o início assim que o vínculo aparece.
      ref.read(selectedChurchIdProvider.notifier).select(churchId);
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final family = _mode == _Mode.family;
    final email = ref.watch(authStateProvider).valueOrNull?.email ?? '';
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        actions: [
          TextButton(
            onPressed: () => ref.read(authRepositoryProvider).signOut(),
            child: const Text('Sair'),
          ),
        ],
      ),
      extendBodyBehindAppBar: true,
      body: AuthBackground(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Form(
                  key: _form,
                  child: Column(
                    children: [
                      LogoHeader(
                        subtitle:
                            'Falta pouco! Conclua o cadastro de $email com o código da igreja',
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      SegmentedButton<_Mode>(
                        segments: const [
                          ButtonSegment(
                            value: _Mode.family,
                            icon: Icon(Icons.family_restroom),
                            label: Text('Sou da família'),
                          ),
                          ButtonSegment(
                            value: _Mode.staff,
                            icon: Icon(Icons.badge_outlined),
                            label: Text('Sou da equipe'),
                          ),
                        ],
                        selected: {_mode},
                        onSelectionChanged:
                            (s) => setState(() => _mode = s.first),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      TextFormField(
                        controller: _code,
                        textCapitalization: TextCapitalization.characters,
                        decoration: InputDecoration(
                          labelText:
                              family
                                  ? 'Código da igreja ou da família'
                                  : 'Código de convite',
                          hintText: family ? 'IG-XXXXXX' : 'KIDS-XXXXXX',
                          helperText:
                              family
                                  ? 'IG-… com a equipe da igreja, ou LK-… de quem já cadastrou a família'
                                  : 'Peça ao administrador da igreja',
                        ),
                        validator:
                            (v) =>
                                (v ?? '').trim().length < 6
                                    ? 'Informe o código'
                                    : null,
                      ),
                      if (!family) ...[
                        const SizedBox(height: AppSpacing.md),
                        SegmentedButton<AppRole>(
                          segments: const [
                            ButtonSegment(
                              value: AppRole.professor,
                              label: Text('Professor(a)'),
                            ),
                            ButtonSegment(
                              value: AppRole.recepcao,
                              label: Text('Recepção'),
                            ),
                          ],
                          selected: {_staffRole},
                          onSelectionChanged:
                              (s) => setState(() => _staffRole = s.first),
                        ),
                      ],
                      const SizedBox(height: AppSpacing.md),
                      TextFormField(
                        controller: _name,
                        textCapitalization: TextCapitalization.words,
                        decoration: const InputDecoration(
                          labelText: 'Seu nome completo',
                        ),
                        validator:
                            (v) =>
                                (v ?? '').trim().length < 3
                                    ? 'Informe seu nome'
                                    : null,
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: _busy ? null : _submit,
                          child:
                              _busy
                                  ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                  : const Text('Concluir cadastro'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
