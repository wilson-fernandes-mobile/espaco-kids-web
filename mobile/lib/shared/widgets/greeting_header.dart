import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_spacing.dart';

/// Cabeçalho de boas-vindas das telas iniciais: saudação conforme o horário,
/// data de hoje e uma linha de resumo, sobre o gradiente do tema.
class GreetingHeader extends StatelessWidget {
  const GreetingHeader({
    super.key,
    required this.name,
    required this.summary,
    this.badge,
  });

  final String name;
  final String summary;
  final String? badge;

  static String _greeting(int hour) {
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final now = DateTime.now();
    final date = DateFormat("EEEE, d 'de' MMMM", 'pt_BR').format(now);
    final firstName = name.trim().split(' ').first;
    final text = Theme.of(context).textTheme;

    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius + 8),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [scheme.primary, scheme.secondary],
        ),
      ),
      child: Stack(
        children: [
          // Círculos posicionados no card inteiro (a margem do texto fica só
          // no `Padding` abaixo), recortados pela borda arredondada.
          Positioned(
            right: -40,
            top: -50,
            child: _Bubble(size: 140, alpha: 0.12),
          ),
          Positioned(
            right: 36,
            bottom: -46,
            child: _Bubble(size: 90, alpha: 0.10),
          ),
          Positioned(
            left: -30,
            bottom: -40,
            child: _Bubble(size: 80, alpha: 0.08),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${date[0].toUpperCase()}${date.substring(1)}',
                  style: text.labelLarge?.copyWith(
                    color: Colors.white.withValues(alpha: 0.85),
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  '${_greeting(now.hour)}, $firstName!',
                  style: text.headlineSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  summary,
                  style: text.bodyMedium?.copyWith(
                    color: Colors.white.withValues(alpha: 0.92),
                  ),
                ),
                if (badge != null) ...[
                  const SizedBox(height: AppSpacing.md),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm + 4,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(
                        AppSpacing.buttonRadius,
                      ),
                    ),
                    child: Text(
                      badge!,
                      style: text.labelMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.size, required this.alpha});

  final double size;
  final double alpha;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withValues(alpha: alpha),
      ),
    );
  }
}
