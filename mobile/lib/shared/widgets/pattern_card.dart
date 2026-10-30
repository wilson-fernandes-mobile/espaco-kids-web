import 'package:flutter/material.dart';

/// [Card] com um detalhe decorativo (círculos suaves) no canto inferior
/// direito, usado nos cards do app para dar identidade visual sem depender
/// de imagens.
class PatternCard extends StatelessWidget {
  const PatternCard({super.key, required this.child, this.margin});

  final Widget child;
  final EdgeInsetsGeometry? margin;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = scheme.brightness == Brightness.dark;

    return Card(
      margin: margin,
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          Positioned.fill(
            child: IgnorePointer(
              child: CustomPaint(
                painter: _CirclesPainter(
                  primary: scheme.primary,
                  secondary: scheme.secondary,
                  opacity: isDark ? 0.10 : 0.12,
                ),
              ),
            ),
          ),
          // Força o filho a usar toda a largura do card (sem isso o `Stack`
          // o encolhe e some a área clicável fora do texto).
          SizedBox(width: double.infinity, child: child),
        ],
      ),
    );
  }
}

class _CirclesPainter extends CustomPainter {
  const _CirclesPainter({
    required this.primary,
    required this.secondary,
    required this.opacity,
  });

  final Color primary;
  final Color secondary;
  final double opacity;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawCircle(
      Offset(size.width - 8, size.height - 4),
      44,
      Paint()..color = primary.withValues(alpha: opacity),
    );
    canvas.drawCircle(
      Offset(size.width - 62, size.height + 6),
      28,
      Paint()..color = secondary.withValues(alpha: opacity),
    );
  }

  @override
  bool shouldRepaint(_CirclesPainter old) =>
      old.primary != primary ||
      old.secondary != secondary ||
      old.opacity != opacity;
}
