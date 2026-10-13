import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';

enum StatusTone { neutral, success, warning, danger }

/// Pequeno indicador de status (ex.: confirmado/pendente/recusado em uma
/// escala), reutilizado em várias listas do app.
class StatusBadge extends StatelessWidget {
  const StatusBadge({
    super.key,
    required this.label,
    this.tone = StatusTone.neutral,
    this.dense = false,
  });

  final String label;
  final StatusTone tone;

  /// Versão compacta (texto menor, menos padding) — para contextos com
  /// pouco espaço, como o cabeçalho do menu lateral.
  final bool dense;

  Color _color(BuildContext context) {
    switch (tone) {
      case StatusTone.success:
        return AppColors.success;
      case StatusTone.warning:
        return AppColors.warning;
      case StatusTone.danger:
        return AppColors.danger;
      case StatusTone.neutral:
        return Theme.of(context).colorScheme.onSurfaceVariant;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _color(context);
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: dense ? 2 : 4,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: (dense
                ? Theme.of(context).textTheme.labelSmall
                : Theme.of(context).textTheme.labelMedium)
            ?.copyWith(color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}
