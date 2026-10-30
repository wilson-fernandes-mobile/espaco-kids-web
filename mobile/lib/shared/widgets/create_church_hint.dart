import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/theme/app_spacing.dart';
import 'feedback.dart';

/// Endereço do painel web, onde a igreja é cadastrada.
final Uri kPanelUri = Uri.https('espacokids-app.web.app', '/registrar');

/// Aviso para quem quer cadastrar a igreja: isso é feito pelo painel (web),
/// não pelo aplicativo.
class CreateChurchHint extends StatelessWidget {
  const CreateChurchHint({super.key});

  Future<void> _open(BuildContext context) async {
    final ok = await launchUrl(kPanelUri, mode: LaunchMode.externalApplication);
    if (!ok && context.mounted) {
      showInfo(context, 'Não foi possível abrir o painel.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: scheme.primaryContainer.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Icon(Icons.church_outlined, color: scheme.primary),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Quer usar na sua igreja?',
                  style: text.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 2),
                Text(
                  'Cadastre sua igreja pelo painel, no computador ou no '
                  'navegador do celular.',
                  style: text.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
                ),
                TextButton(
                  style: TextButton.styleFrom(
                    padding: EdgeInsets.zero,
                    minimumSize: const Size(0, 32),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  onPressed: () => _open(context),
                  child: const Text('Abrir o painel'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
