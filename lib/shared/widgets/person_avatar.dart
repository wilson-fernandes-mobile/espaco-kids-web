import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/utils/text_initials.dart';

/// Avatar com foto (data URL gravada pelo painel web, ou URL http) ou
/// iniciais coloridas de forma determinística.
class PersonAvatar extends StatelessWidget {
  const PersonAvatar({
    super.key,
    required this.name,
    this.photo,
    this.radius = 22,
    this.onGradient = false,
  });

  final String name;
  final String? photo;
  final double radius;

  /// Para uso sobre fundo colorido/gradiente: iniciais brancas num círculo
  /// branco translúcido, em vez da cor determinística por pessoa.
  final bool onGradient;

  ImageProvider? _image() {
    final p = photo;
    if (p == null || p.isEmpty) return null;
    if (p.startsWith('data:')) {
      final i = p.indexOf(',');
      if (i < 0) return null;
      try {
        final Uint8List bytes = base64Decode(p.substring(i + 1));
        return MemoryImage(bytes);
      } catch (_) {
        return null;
      }
    }
    return NetworkImage(p);
  }

  @override
  Widget build(BuildContext context) {
    final img = _image();
    final color =
        AppColors.avatarPalette[name.hashCode.abs() %
            AppColors.avatarPalette.length];
    return CircleAvatar(
      radius: radius,
      backgroundColor:
          onGradient
              ? Colors.white.withValues(alpha: 0.25)
              : color.withValues(alpha: 0.18),
      backgroundImage: img,
      child:
          img != null
              ? null
              : Text(
                initialsOf(name),
                style: TextStyle(
                  color: onGradient ? Colors.white : color,
                  fontWeight: FontWeight.w700,
                  fontSize: radius * 0.7,
                ),
              ),
    );
  }
}
