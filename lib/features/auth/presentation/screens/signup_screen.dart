import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/constants/app_role.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../tenant/data/tenant_repository.dart';
import '../../../tenant/presentation/providers/tenant_providers.dart';
import '../widgets/auth_background.dart';
import '../widgets/logo_header.dart';

enum _Mode { family, staff }

/// Cadastro sem aprovação, por código:
/// * Família → código da igreja (`IG-XXXXXX`, cadastra a própria família) ou
///   código da família (`LK-XXXXXX`, entra numa família já cadastrada).
/// * Equipe → código de convite (`KIDS-XXXXXX`) do administrador.
class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _form = GlobalKey<FormState>();
  final _code = TextEditingController();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  _Mode _mode = _Mode.family;
  AppRole _staffRole = AppRole.professor;
  bool _busy = false;

  @override
  void dispose() {
    _code.dispose();
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    final repo = ref.read(tenantRepositoryProvider);
    try {
      await repo.signUpWithCode(
        code: _code.text,
        name: _name.text,
        email: _email.text,
        password: _password.text,
        expected: _mode == _Mode.family ? CodeKind.family : CodeKind.invite,
        staffRole: _mode == _Mode.family ? null : _staffRole,
      );
      // O roteador leva a pessoa para a igreja do código assim que o vínculo
      // aparece; se a tela de cadastro foi empilhada, volta para a raiz.
      if (mounted) Navigator.of(context).popUntil((r) => r.isFirst);
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final family = _mode == _Mode.family;
    return Scaffold(
      appBar: AppBar(backgroundColor: Colors.transparent),
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
                      const LogoHeader(
                        subtitle: 'Crie sua conta com um código',
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
                      const SizedBox(height: AppSpacing.md),
                      TextFormField(
                        controller: _email,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(labelText: 'E-mail'),
                        validator:
                            (v) =>
                                (v ?? '').contains('@')
                                    ? null
                                    : 'Informe um e-mail válido',
                      ),
                      const SizedBox(height: AppSpacing.md),
                      TextFormField(
                        controller: _password,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: 'Senha (mín. 6)',
                        ),
                        validator:
                            (v) =>
                                (v ?? '').length < 6
                                    ? 'Mínimo de 6 caracteres'
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
                                  : const Text('Criar conta'),
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
