import 'package:flutter/material.dart';

/// Logo do app Espaço Kids (a casinha com as crianças, a mesma do ícone do
/// aplicativo): quadrado arredondado com uma sombra suave.
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
        borderRadius: BorderRadius.circular(size * 0.24),
        boxShadow: [
          BoxShadow(
            color: scheme.primary.withValues(alpha: 0.3),
            blurRadius: size * 0.2,
            offset: Offset(0, size * 0.08),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(size * 0.24),
        child: Image.asset('assets/icon/ic_app.png', fit: BoxFit.cover),
      ),
    );
  }
}
