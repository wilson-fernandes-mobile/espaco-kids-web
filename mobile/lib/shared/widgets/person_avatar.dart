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
    this.viewable = false,
  });

  final String name;
  final String? photo;
  final double radius;

  /// Para uso sobre fundo colorido/gradiente: iniciais brancas num círculo
  /// branco translúcido, em vez da cor determinística por pessoa.
  final bool onGradient;

  /// Com foto, tocar abre a imagem em tela cheia (zoom por pinça).
  final bool viewable;

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
    final avatar = CircleAvatar(
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
    if (!viewable || img == null) return avatar;
    return Semantics(
      button: true,
      label: 'Ver foto de $name',
      child: GestureDetector(
        onTap: () => showPhotoViewer(context, name: name, image: img),
        child: avatar,
      ),
    );
  }
}

/// Foto em tela cheia: fundo escuro, zoom e arrastar; toque fora ou no X fecha.
Future<void> showPhotoViewer(
  BuildContext context, {
  required String name,
  required ImageProvider image,
}) {
  return showDialog<void>(
    context: context,
    barrierColor: Colors.black87,
    builder:
        (ctx) => Dialog.fullscreen(
          backgroundColor: Colors.transparent,
          child: Stack(
            children: [
              Positioned.fill(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => Navigator.of(ctx).pop(),
                  child: SafeArea(
                    child: Center(
                      child: InteractiveViewer(
                        maxScale: 5,
                        child: Image(image: image, fit: BoxFit.contain),
                      ),
                    ),
                  ),
                ),
              ),
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(8),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(ctx).textTheme.titleMedium?.copyWith(
                            color: Colors.white,
                          ),
                        ),
                      ),
                      IconButton(
                        tooltip: 'Fechar',
                        color: Colors.white,
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.of(ctx).pop(),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
  );
}
