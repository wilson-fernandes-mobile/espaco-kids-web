import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_spacing.dart';
import '../../core/theme/theme_mode_provider.dart';
import '../../features/auth/presentation/providers/auth_providers.dart';
import 'feedback.dart';
import 'nav_destination.dart';
import 'person_avatar.dart';

/// Menu lateral: dados de quem está logado no topo, as mesmas seções da
/// barra de navegação, alternância de tema e sair.
class AppDrawer extends ConsumerWidget {
  const AppDrawer({super.key, required this.destinations});

  final List<AppNavDestination> destinations;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).user;
    final mode = ref.watch(themeModeProvider);
    final path = GoRouterState.of(context).uri.path;
    final scheme = Theme.of(context).colorScheme;
    final dark =
        mode == ThemeMode.dark ||
        (mode == ThemeMode.system &&
            MediaQuery.platformBrightnessOf(context) == Brightness.dark);

    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            _Header(
              name: user?.name ?? '',
              email: user?.email ?? '',
              role: user?.role.label,
              church: user?.churchName,
              onTap: () {
                Navigator.of(context).pop();
                context.go('/perfil');
              },
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                children: [
                  for (final d in destinations)
                    _Item(
                      icon: path.startsWith(d.path) ? d.selectedIcon : d.icon,
                      label: d.label,
                      selected: path.startsWith(d.path),
                      onTap: () {
                        Navigator.of(context).pop();
                        context.go(d.path);
                      },
                    ),
                ],
              ),
            ),
            const Divider(height: 1),
            // Voluntário que também é pai/mãe: alterna entre equipe e família.
            if (user != null && user.canSwitchMode)
              _Item(
                icon:
                    user.asFamily
                        ? Icons.badge_outlined
                        : Icons.family_restroom,
                label:
                    user.asFamily
                        ? 'Voltar ao modo equipe'
                        : 'Modo família (meus filhos)',
                onTap: () {
                  Navigator.of(context).pop();
                  ref.read(familyModeProvider.notifier).set(!user.asFamily);
                  context.go('/splash');
                },
              )
            else if (user != null && user.role.isStaff)
              _Item(
                icon: Icons.child_friendly_outlined,
                label: 'Cadastrar minha família',
                onTap: () {
                  Navigator.of(context).pop();
                  context.go('/cadastro-familia');
                },
              ),
            _Item(
              icon: Icons.swap_horiz,
              label: 'Trocar de igreja',
              onTap: () {
                Navigator.of(context).pop();
                context.go('/igrejas');
              },
            ),
            SwitchListTile(
              secondary: Icon(
                dark ? Icons.dark_mode_outlined : Icons.light_mode_outlined,
                color: scheme.onSurfaceVariant,
              ),
              title: const Text('Tema escuro'),
              value: dark,
              onChanged:
                  (v) =>
                      ref.read(themeModeProvider.notifier).state =
                          v ? ThemeMode.dark : ThemeMode.light,
            ),
            _Item(
              icon: Icons.logout,
              label: 'Sair',
              color: scheme.error,
              onTap: () async {
                // Confirma com o menu ainda aberto: se ele fechasse antes, o
                // contexto e o `ref` já estariam descartados e nada acontecia.
                final repo = ref.read(authRepositoryProvider);
                if (await confirm(
                  context,
                  title: 'Sair',
                  message: 'Deseja sair da sua conta?',
                  action: 'Sair',
                )) {
                  if (context.mounted) Navigator.of(context).pop();
                  await repo.signOut();
                }
              },
            ),
            const SizedBox(height: AppSpacing.sm),
          ],
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.name,
    required this.email,
    required this.role,
    required this.church,
    required this.onTap,
  });

  final String name;
  final String email;
  final String? role;
  final String? church;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.all(AppSpacing.sm),
      child: Material(
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        clipBehavior: Clip.antiAlias,
        child: Ink(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [scheme.primary, scheme.secondary],
            ),
          ),
          child: InkWell(
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  PersonAvatar(
                    name: name.isEmpty ? '?' : name,
                    radius: 26,
                    onGradient: true,
                  ),
                  const SizedBox(height: AppSpacing.sm + 4),
                  Text(
                    name.isEmpty ? '—' : name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: text.titleMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  if (email.isNotEmpty)
                    Text(
                      email,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: text.bodySmall?.copyWith(
                        color: Colors.white.withValues(alpha: 0.85),
                      ),
                    ),
                  if (role != null) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(
                          AppSpacing.buttonRadius,
                        ),
                      ),
                      child: Text(
                        (church == null || church!.isEmpty)
                            ? role!
                            : '${role!} · $church',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: text.labelSmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Item extends StatelessWidget {
  const _Item({
    required this.icon,
    required this.label,
    required this.onTap,
    this.selected = false,
    this.color,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool selected;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final tint = color ?? (selected ? scheme.primary : scheme.onSurfaceVariant);

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 2,
      ),
      child: Material(
        color:
            selected
                ? scheme.primaryContainer.withValues(alpha: 0.4)
                : Colors.transparent,
        borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
        child: ListTile(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
          ),
          leading: Icon(icon, color: tint),
          title: Text(
            label,
            style: TextStyle(
              color: color ?? (selected ? scheme.primary : scheme.onSurface),
              fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
          onTap: onTap,
        ),
      ),
    );
  }
}
