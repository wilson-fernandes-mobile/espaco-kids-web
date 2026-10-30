import 'package:flutter/material.dart';

import '../../core/theme/app_spacing.dart';
import '../../core/utils/date_format.dart';
import '../../features/kids/domain/entities/child.dart';
import 'pattern_card.dart';
import 'person_avatar.dart';
import 'status_badge.dart';

/// Linha de criança usada nas listas da equipe e da família.
class ChildTile extends StatelessWidget {
  const ChildTile({
    super.key,
    required this.child,
    required this.present,
    this.subtitle,
    this.trailing,
    this.onTap,
  });

  final Child child;
  final bool present;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return PatternCard(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Row(
            children: [
              PersonAvatar(
                name: child.fullName,
                photo: child.photoUrl,
                radius: 26,
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      child.displayName,
                      style: Theme.of(context).textTheme.titleMedium,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle ??
                          '${ageLabel(child.birthDate)} · ${child.code}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Wrap(
                      spacing: AppSpacing.xs,
                      children: [
                        StatusBadge(
                          label: present ? 'Na sala' : 'Fora',
                          tone:
                              present ? StatusTone.success : StatusTone.neutral,
                          dense: true,
                        ),
                        if (child.careAlert)
                          const StatusBadge(
                            label: 'Atenção',
                            tone: StatusTone.warning,
                            dense: true,
                          ),
                        if (child.hasMedication)
                          const StatusBadge(
                            label: 'Medicação',
                            tone: StatusTone.warning,
                            dense: true,
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              if (trailing != null) trailing!,
            ],
          ),
        ),
      ),
    );
  }
}
