import 'package:flutter/material.dart';

/// Selo quadrado arredondado com um ícone colorido dentro — usado como
/// `leading` de linhas de menu/opção (ex.: Configurações, informações do
/// ministério). Fundo é [color] com baixa opacidade, ícone na cor cheia.
class IconBadge extends StatelessWidget {
  const IconBadge({
    super.key,
    required this.icon,
    required this.color,
    this.size = 36,
    this.iconSize = 20,
  });

  final IconData icon;
  final Color color;
  final double size;
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, color: color, size: iconSize),
    );
  }
}
