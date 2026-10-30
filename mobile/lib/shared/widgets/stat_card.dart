import 'package:flutter/material.dart';

import '../../core/theme/app_spacing.dart';
import 'pattern_card.dart';

/// Card compacto de indicador numérico, usado no Dashboard
/// (quantidade de membros, visitantes do mês, batismos, etc.).
class StatCard extends StatelessWidget {
  const StatCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    this.color,
    this.onTap,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color? color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final tint = color ?? scheme.primary;

    return PatternCard(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: tint.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppSpacing.sm + 4),
                ),
                child: Icon(icon, color: tint, size: 20),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                value,
                style: Theme.of(context).textTheme.headlineSmall,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                label,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
