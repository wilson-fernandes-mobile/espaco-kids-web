import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/providers/auth_providers.dart';

/// Botão da barra superior para quem é da equipe e também tem família:
/// alterna entre o modo equipe e o modo família. Fica oculto para os demais.
class ModeSwitchAction extends ConsumerWidget {
  const ModeSwitchAction({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).user;
    if (user == null || !user.canSwitchMode) return const SizedBox.shrink();
    final family = user.asFamily;
    final scheme = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Tooltip(
        message: family ? 'Voltar ao modo equipe' : 'Ir para o modo família',
        child: ActionChip(
          avatar: Icon(
            family ? Icons.badge_outlined : Icons.family_restroom,
            size: 18,
            color: scheme.primary,
          ),
          label: Text(family ? 'Equipe' : 'Família'),
          labelStyle: Theme.of(context).textTheme.labelLarge?.copyWith(
            color: scheme.primary,
            fontWeight: FontWeight.w700,
          ),
          backgroundColor: scheme.primary.withValues(alpha: 0.10),
          side: BorderSide(color: scheme.primary.withValues(alpha: 0.35)),
          onPressed: () {
            ref.read(familyModeProvider.notifier).set(!family);
            context.go('/splash');
          },
        ),
      ),
    );
  }
}
