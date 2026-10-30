import 'package:flutter/material.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/kids_logo.dart';

class LogoHeader extends StatelessWidget {
  const LogoHeader({super.key, required this.subtitle});

  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const KidsLogo(size: 88),
        const SizedBox(height: AppSpacing.md),
        Text('Espaço Kids', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: AppSpacing.xs),
        Text(
          subtitle,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ],
    );
  }
}
