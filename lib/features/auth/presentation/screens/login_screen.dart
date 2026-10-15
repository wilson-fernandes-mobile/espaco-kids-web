import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/services/local_preferences_service.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/feedback.dart';
import '../providers/auth_providers.dart';
import '../widgets/auth_background.dart';
import '../widgets/logo_header.dart';
import '../widgets/social_buttons.dart';

const _lastEmailKey = 'last_login_email';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  bool _obscure = true;

  @override
  void initState() {
    super.initState();
    // Lembra o último e-mail usado no login com e-mail e senha.
    _email.text =
        ref.read(sharedPreferencesProvider).getString(_lastEmailKey) ?? '';
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    final prefs = ref.read(sharedPreferencesProvider);
    final email = _email.text.trim();
    try {
      await ref.read(authRepositoryProvider).signIn(email, _password.text);
      await prefs.setString(_lastEmailKey, email);
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _forgot() async {
    final email = _email.text.trim();
    if (email.isEmpty) {
      showInfo(context, 'Digite seu e-mail para receber o link.');
      return;
    }
    try {
      await ref.read(authRepositoryProvider).resetPassword(email);
      if (mounted)
        showInfo(context, 'Enviamos um link de recuperação para $email.');
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
                        subtitle: 'Entrada e saída seguras das crianças',
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      TextFormField(
                        controller: _email,
                        keyboardType: TextInputType.emailAddress,
                        autofillHints: const [AutofillHints.email],
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
                        obscureText: _obscure,
                        autofillHints: const [AutofillHints.password],
                        decoration: InputDecoration(
                          labelText: 'Senha',
                          suffixIcon: IconButton(
                            icon: Icon(
                              _obscure
                                  ? Icons.visibility
                                  : Icons.visibility_off,
                            ),
                            onPressed:
                                () => setState(() => _obscure = !_obscure),
                          ),
                        ),
                        validator:
                            (v) => (v ?? '').isEmpty ? 'Informe a senha' : null,
                        onFieldSubmitted: (_) => _submit(),
                      ),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: _forgot,
                          child: const Text('Esqueci a senha'),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
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
                                  : const Text('Entrar'),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: () => context.push('/signup'),
                          child: const Text('Criar conta com código'),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      const SocialButtons(),
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
