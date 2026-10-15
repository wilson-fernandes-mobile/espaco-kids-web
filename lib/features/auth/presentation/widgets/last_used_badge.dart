import 'package:flutter/material.dart';

/// Chave (SharedPreferences) do último jeito de entrar: `email`, `google`
/// ou `apple`.
const lastLoginMethodKey = 'last_login_method';

/// Coloca o selo "Último uso" no canto do botão usado no último login.
class LastUsedBadge extends StatelessWidget {
  const LastUsedBadge({super.key, required this.show, required this.child});

  final bool show;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (!show) return child;
    final scheme = Theme.of(context).colorScheme;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        child,
        Positioned(
          top: -9,
          right: 14,
          child: IgnorePointer(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: scheme.tertiary,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.15),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.history, size: 12, color: scheme.onTertiary),
                  const SizedBox(width: 4),
                  Text(
                    'Último uso',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: scheme.onTertiary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
