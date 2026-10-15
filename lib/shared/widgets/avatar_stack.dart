import 'package:flutter/material.dart';

import 'person_avatar.dart';

typedef AvatarStackPerson = ({String id, String name, String? photoUrl});

/// Fileira de avatares sobrepostos (preview rápido de várias pessoas), com
/// iniciais coloridas quando não há foto e "+N" quando passa do limite.
/// Mesmo desenho das escalas do MovaChurch.
class AvatarStack extends StatelessWidget {
  const AvatarStack({
    super.key,
    required this.people,
    this.size = 36,
    this.overlap = 12,
    this.maxVisible = 5,
  });

  final List<AvatarStackPerson> people;
  final double size;
  final double overlap;
  final int maxVisible;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final visible = people.take(maxVisible).toList();
    final overflow = people.length - visible.length;
    final step = size - overlap;
    final slots = visible.length + (overflow > 0 ? 1 : 0);
    final width = slots == 0 ? 0.0 : size + (slots - 1) * step;

    Widget ring(Widget child) => Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: scheme.surface, width: 2),
      ),
      child: ClipOval(child: child),
    );

    return SizedBox(
      width: width,
      height: size,
      child: Stack(
        children: [
          for (var i = 0; i < visible.length; i++)
            Positioned(
              left: i * step,
              child: ring(
                PersonAvatar(
                  name: visible[i].name,
                  photo: visible[i].photoUrl,
                  radius: size / 2,
                ),
              ),
            ),
          if (overflow > 0)
            Positioned(
              left: visible.length * step,
              child: ring(
                ColoredBox(
                  color: scheme.surfaceContainerHighest,
                  child: Center(
                    child: Text(
                      '+$overflow',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
