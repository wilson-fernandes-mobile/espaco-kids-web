import 'package:flutter/material.dart';
import '../../../../shared/widgets/open_drawer_button.dart';
import '../../../../shared/widgets/mode_switch_action.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/theme_color_option.dart';
import '../../../../core/theme/theme_color_provider.dart';
import '../../../../core/theme/theme_mode_provider.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../../shared/widgets/photo_field.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../widgets/linked_accounts_section.dart';

/// Perfil, aparência (tema/cor) e sair — compartilhado por todos os papéis.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).user!;
    final mode = ref.watch(themeModeProvider);
    final color = ref.watch(themeColorProvider);

    return Scaffold(
      appBar: AppBar(
        leading: const OpenDrawerButton(),
        actions: const [ModeSwitchAction()],
        title: const Text('Perfil'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Center(
            child: PhotoField(
              name: user.name,
              photo: user.photoUrl,
              radius: 48,
              onChanged:
                  (p) => ref
                      .read(authRepositoryProvider)
                      .setPhoto(user.churchId, user.uid, p),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            user.name,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          Text(user.email, textAlign: TextAlign.center),
          const SizedBox(height: AppSpacing.xs),
          Center(child: Chip(label: Text(user.role.label))),
          const SizedBox(height: AppSpacing.lg),
          Text('Aparência', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'A primeira cor segue a cor escolhida pela sua igreja.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          SegmentedButton<ThemeMode>(
            segments: const [
              ButtonSegment(value: ThemeMode.system, label: Text('Sistema')),
              ButtonSegment(value: ThemeMode.light, label: Text('Claro')),
              ButtonSegment(value: ThemeMode.dark, label: Text('Escuro')),
            ],
            selected: {mode},
            onSelectionChanged:
                (s) => ref.read(themeModeProvider.notifier).state = s.first,
          ),
          const SizedBox(height: AppSpacing.md),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              for (final o in ThemeColorOption.values)
                GestureDetector(
                  onTap: () => ref.read(themeColorProvider.notifier).state = o,
                  child: CircleAvatar(
                    radius: 18,
                    backgroundColor: primaryColorFor(o),
                    child:
                        o == color
                            ? const Icon(
                              Icons.check,
                              color: Colors.white,
                              size: 18,
                            )
                            : null,
                  ),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.xl),
          const LinkedAccountsSection(),
          const SizedBox(height: AppSpacing.xl),
          OutlinedButton.icon(
            onPressed: () async {
              if (await confirm(
                context,
                title: 'Sair',
                message: 'Deseja sair da sua conta?',
                action: 'Sair',
              )) {
                await ref.read(authRepositoryProvider).signOut();
              }
            },
            icon: const Icon(Icons.logout),
            label: const Text('Sair'),
          ),
        ],
      ),
    );
  }
}
