import 'package:flutter/material.dart';

import '../../core/theme/app_spacing.dart';
import 'icon_badge.dart';

/// Cabeçalho de seção pra formulários longos (ícone + título + descrição
/// opcional) — agrupa visualmente blocos de campos relacionados em vez de
/// uma lista plana de campos sem hierarquia. Ver `[[ui-visual-quality]]`.
class FormSectionHeader extends StatelessWidget {
  const FormSectionHeader({
    super.key,
    required this.icon,
    required this.title,
    this.description,
  });

  final IconData icon;
  final String title;
  final String? description;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            IconBadge(
              icon: icon,
              color: scheme.primary,
              size: 32,
              iconSize: 18,
            ),
            const SizedBox(width: AppSpacing.sm),
            Text(
              title,
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
          ],
        ),
        if (description != null) ...[
          const SizedBox(height: AppSpacing.xs),
          Text(
            description!,
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
          ),
        ],
      ],
    );
  }
}
