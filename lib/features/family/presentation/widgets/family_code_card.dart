import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../providers/family_providers.dart';

/// Código da família: quem o digita ao criar a conta (ou em "Vincular minha
/// família") entra nesta mesma família, com os mesmos filhos.
class FamilyCodeCard extends ConsumerStatefulWidget {
  const FamilyCodeCard({super.key});

  @override
  ConsumerState<FamilyCodeCard> createState() => _FamilyCodeCardState();
}

class _FamilyCodeCardState extends ConsumerState<FamilyCodeCard> {
  bool _busy = false;

  Future<void> _generate() async {
    final user = ref.read(sessionProvider).user!;
    setState(() => _busy = true);
    try {
      await ref
          .read(familyRepositoryProvider)
          .createFamilyCode(
            churchId: user.churchId,
            churchName: user.churchName,
            uid: user.uid,
            familyId: user.familyId!,
          );
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _whatsapp(String code) async {
    final user = ref.read(sessionProvider).user!;
    final text =
        'Entre na nossa família no app Espaço Kids (${user.churchName}): '
        'crie sua conta em "Sou da família" e digite o código $code';
    final ok = await launchUrl(
      Uri.https('wa.me', '/', {'text': text}),
      mode: LaunchMode.externalApplication,
    );
    if (!ok && mounted) showInfo(context, 'Não foi possível abrir o WhatsApp.');
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider).user!;
    final scheme = Theme.of(context).colorScheme;
    final code =
        ref.watch(familyCodeProvider((user.churchId, user.familyId ?? ''))).valueOrNull;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.group_add_outlined, color: scheme.primary),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    'Convidar outro responsável',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Quem digitar este código ao criar a conta entra na sua '
              'família e já vê seus filhos.',
              style: TextStyle(color: scheme.onSurfaceVariant),
            ),
            const SizedBox(height: AppSpacing.md),
            if (code == null)
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _busy ? null : _generate,
                  icon: const Icon(Icons.key_outlined),
                  label: const Text('Gerar código da família'),
                ),
              )
            else ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                decoration: BoxDecoration(
                  color: scheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
                ),
                child: SelectableText(
                  code,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    letterSpacing: 3,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        await Clipboard.setData(ClipboardData(text: code));
                        if (context.mounted) showInfo(context, 'Código copiado.');
                      },
                      icon: const Icon(Icons.copy),
                      label: const Text('Copiar'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () => _whatsapp(code),
                      icon: const Icon(Icons.send),
                      label: const Text('WhatsApp'),
                    ),
                  ),
                ],
              ),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: _busy ? null : _generate,
                  child: const Text('Gerar outro (o atual deixa de valer)'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
