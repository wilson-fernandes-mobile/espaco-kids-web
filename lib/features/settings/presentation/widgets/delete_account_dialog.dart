import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/widgets/feedback.dart';
import '../../../auth/presentation/providers/auth_providers.dart';

/// Exclusão da própria conta (exigida pelas lojas): explica o que será
/// apagado, pede a identidade de novo e chama o servidor.
Future<void> showDeleteAccountDialog(
  BuildContext context, {
  required bool hasFamily,
}) {
  return showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (_) => _DeleteAccountDialog(hasFamily: hasFamily),
  );
}

class _DeleteAccountDialog extends ConsumerStatefulWidget {
  const _DeleteAccountDialog({required this.hasFamily});

  final bool hasFamily;

  @override
  ConsumerState<_DeleteAccountDialog> createState() =>
      _DeleteAccountDialogState();
}

class _DeleteAccountDialogState extends ConsumerState<_DeleteAccountDialog> {
  final _password = TextEditingController();
  bool _deleteFamily = false;
  bool _busy = false;

  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final repo = ref.read(authRepositoryProvider);
    final usesPassword =
        !repo.linkedProviderIds.contains('google.com') &&
        !repo.linkedProviderIds.contains('apple.com');
    setState(() => _busy = true);
    try {
      final ok = await repo.reauthenticate(
        password: usesPassword ? _password.text : null,
      );
      if (!ok) {
        if (mounted) setState(() => _busy = false);
        return;
      }
      await repo.deleteAccount(deleteFamily: _deleteFamily);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        setState(() => _busy = false);
        showError(context, e);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final repo = ref.read(authRepositoryProvider);
    final usesPassword =
        !repo.linkedProviderIds.contains('google.com') &&
        !repo.linkedProviderIds.contains('apple.com');
    return AlertDialog(
      title: const Text('Excluir minha conta'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Sua conta, seu perfil e seu acesso a todas as igrejas serão '
              'apagados. Esta ação não pode ser desfeita.',
            ),
            if (widget.hasFamily) ...[
              const SizedBox(height: 12),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                value: _deleteFamily,
                onChanged:
                    _busy ? null : (v) => setState(() => _deleteFamily = v!),
                title: const Text('Apagar também minha família'),
                subtitle: const Text(
                  'Remove os filhos, responsáveis, autorizados e as fichas de '
                  'saúde. Se outra pessoa usa esta família, ela é mantida.',
                ),
              ),
            ],
            if (usesPassword) ...[
              const SizedBox(height: 12),
              TextField(
                controller: _password,
                obscureText: true,
                enabled: !_busy,
                decoration: const InputDecoration(
                  labelText: 'Digite sua senha para confirmar',
                ),
              ),
            ] else ...[
              const SizedBox(height: 12),
              const Text(
                'Vamos pedir para você entrar de novo, só para confirmar que '
                'é você.',
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _busy ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: Theme.of(context).colorScheme.error,
            foregroundColor: Theme.of(context).colorScheme.onError,
          ),
          onPressed: _busy ? null : _submit,
          child:
              _busy
                  ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                  : const Text('Excluir conta'),
        ),
      ],
    );
  }
}
