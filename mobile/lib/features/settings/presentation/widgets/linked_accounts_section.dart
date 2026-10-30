import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../../shared/widgets/form_section_header.dart';
import '../../../auth/presentation/providers/auth_providers.dart';

const _labels = {
  'password': 'E-mail e senha',
  'google.com': 'Google',
  'apple.com': 'Apple',
};

const _icons = {
  'password': Icons.mail_outline,
  'google.com': Icons.g_mobiledata,
  'apple.com': Icons.apple,
};

/// "Contas vinculadas": várias formas de entrar na MESMA conta (e-mail e
/// senha, Google, Apple). Vincular aqui, já logado, evita que entrar por um
/// jeito crie outra conta ou desfaça o outro.
class LinkedAccountsSection extends ConsumerStatefulWidget {
  const LinkedAccountsSection({super.key});

  @override
  ConsumerState<LinkedAccountsSection> createState() =>
      _LinkedAccountsSectionState();
}

class _LinkedAccountsSectionState extends ConsumerState<LinkedAccountsSection> {
  bool _busy = false;

  Future<void> _run(Future<Object?> Function() action, String ok) async {
    setState(() => _busy = true);
    try {
      final r = await action();
      if (mounted && r != false) showInfo(context, ok);
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _unlink(String id) async {
    final label = _labels[id] ?? id;
    final yes = await confirm(
      context,
      title: 'Desvincular $label?',
      message:
          'Você não poderá mais entrar com $label nesta conta. Confirme que '
          'tem outra forma de entrar.',
      action: 'Desvincular',
    );
    if (!yes) return;
    await _run(() async {
      await ref.read(authRepositoryProvider).unlinkProvider(id);
      return true;
    }, '$label desvinculado.');
  }

  Future<void> _addPassword() async {
    final email = ref.read(authStateProvider).valueOrNull?.email ?? '';
    final form = GlobalKey<FormState>();
    final mail = TextEditingController(text: email);
    final pass = TextEditingController();
    final conf = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder:
          (ctx) => AlertDialog(
            title: const Text('Adicionar e-mail e senha'),
            content: Form(
              key: form,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    controller: mail,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(labelText: 'E-mail'),
                    validator:
                        (v) =>
                            (v ?? '').contains('@')
                                ? null
                                : 'Informe um e-mail válido',
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  TextFormField(
                    controller: pass,
                    obscureText: true,
                    decoration: const InputDecoration(labelText: 'Senha'),
                    validator:
                        (v) =>
                            (v ?? '').length < 6
                                ? 'Mínimo de 6 caracteres'
                                : null,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  TextFormField(
                    controller: conf,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Confirmar senha',
                    ),
                    validator:
                        (v) =>
                            v != pass.text ? 'As senhas não coincidem' : null,
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Cancelar'),
              ),
              FilledButton(
                onPressed: () {
                  if (form.currentState!.validate()) Navigator.pop(ctx, true);
                },
                child: const Text('Adicionar'),
              ),
            ],
          ),
    );
    final e = mail.text;
    final p = pass.text;
    mail.dispose();
    pass.dispose();
    conf.dispose();
    if (ok != true) return;
    await _run(() async {
      await ref.read(authRepositoryProvider).linkEmailPassword(e, p);
      return true;
    }, 'E-mail e senha adicionados.');
  }

  @override
  Widget build(BuildContext context) {
    final linked = ref.watch(linkedProvidersProvider).valueOrNull ?? const [];
    final repo = ref.read(authRepositoryProvider);
    final scheme = Theme.of(context).colorScheme;
    final apple =
        defaultTargetPlatform == TargetPlatform.iOS ||
        defaultTargetPlatform == TargetPlatform.macOS;

    Widget add({
      required IconData icon,
      required String title,
      String? subtitle,
      required VoidCallback onTap,
    }) => ListTile(
      leading: Icon(icon, color: scheme.secondary),
      title: Text(title),
      subtitle: subtitle == null ? null : Text(subtitle),
      trailing: const Icon(Icons.add),
      enabled: !_busy,
      onTap: onTap,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const FormSectionHeader(
          icon: Icons.link,
          title: 'Contas vinculadas',
          description: 'Formas de entrar nesta mesma conta.',
        ),
        const SizedBox(height: AppSpacing.md),
        Card(
          child: Column(
            children: [
              for (final id in linked)
                ListTile(
                  leading: Icon(
                    _icons[id] ?? Icons.link,
                    color: scheme.primary,
                  ),
                  title: Text(_labels[id] ?? id),
                  subtitle: const Text('Vinculado'),
                  trailing:
                      linked.length > 1
                          ? IconButton(
                            tooltip: 'Desvincular',
                            icon: Icon(Icons.link_off, color: scheme.error),
                            onPressed: _busy ? null : () => _unlink(id),
                          )
                          : null,
                ),
              if (!linked.contains('password'))
                add(
                  icon: Icons.password_outlined,
                  title: 'Adicionar e-mail e senha',
                  subtitle: 'Para entrar também sem Google ou Apple',
                  onTap: _addPassword,
                ),
              if (!linked.contains('google.com'))
                add(
                  icon: Icons.g_mobiledata,
                  title: 'Vincular com Google',
                  onTap: () => _run(repo.linkGoogle, 'Google vinculado.'),
                ),
              if (apple && !linked.contains('apple.com'))
                add(
                  icon: Icons.apple,
                  title: 'Vincular com Apple',
                  onTap: () => _run(repo.linkApple, 'Apple vinculado.'),
                ),
            ],
          ),
        ),
      ],
    );
  }
}
