import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../providers/auth_providers.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) =>
      const Scaffold(body: Center(child: CircularProgressIndicator()));
}

/// Conta sem perfil ou desativada.
class BlockedScreen extends ConsumerWidget {
  const BlockedScreen({super.key, required this.inactive});

  final bool inactive;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: EmptyState(
                icon: Icons.lock_outline,
                title: inactive ? 'Acesso desativado' : 'Conta sem perfil',
                message:
                    inactive
                        ? 'Sua conta foi desativada. Fale com a coordenação.'
                        : 'Sua conta ainda não está vinculada a um perfil. '
                            'Use um código de convite ou fale com a coordenação.',
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: OutlinedButton(
                onPressed: () => ref.read(authRepositoryProvider).signOut(),
                child: const Text('Sair'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
