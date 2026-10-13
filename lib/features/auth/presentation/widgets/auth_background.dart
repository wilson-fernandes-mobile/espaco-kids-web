import 'package:flutter/material.dart';

/// Fundo das telas de autenticação: gradiente suave nas cores de marca
/// (mesma identidade do MoveScheduler).
class AuthBackground extends StatelessWidget {
  const AuthBackground({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          stops: const [0.0, 0.35, 0.6, 0.85],
          colors: [
            scheme.primary.withValues(alpha: 0.18),
            scheme.secondary.withValues(alpha: 0.12),
            scheme.tertiary.withValues(alpha: 0.06),
            scheme.surface,
          ],
        ),
      ),
      child: child,
    );
  }
}
