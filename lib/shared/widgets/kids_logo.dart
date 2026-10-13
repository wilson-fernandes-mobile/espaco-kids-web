import 'package:flutter/material.dart';

/// Marca do Espaço Kids desenhada em código (sem imagem): quadrado
/// arredondado com o gradiente do tema e o ícone de criança.
class KidsLogo extends StatelessWidget {
  const KidsLogo({super.key, this.size = 88});

  final double size;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(size * 0.28),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [scheme.primary, scheme.secondary],
        ),
        boxShadow: [
          BoxShadow(
            color: scheme.primary.withValues(alpha: 0.3),
            blurRadius: size * 0.2,
            offset: Offset(0, size * 0.08),
          ),
        ],
      ),
      child: Icon(Icons.child_care, size: size * 0.56, color: Colors.white),
    );
  }
}
