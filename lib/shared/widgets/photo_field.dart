import 'package:flutter/material.dart';

import '../../core/utils/photo_picker.dart';
import 'feedback.dart';
import 'person_avatar.dart';

/// Avatar com botão de câmera: escolhe/troca a foto e permite remover.
/// `onChanged` recebe o data URL novo, ou null ao remover.
class PhotoField extends StatelessWidget {
  const PhotoField({
    super.key,
    required this.name,
    required this.photo,
    required this.onChanged,
    this.radius = 40,
  });

  final String name;
  final String? photo;
  final double radius;
  final ValueChanged<String?> onChanged;

  Future<void> _pick(BuildContext context) async {
    try {
      final p = await pickPhotoDataUrl(context);
      if (p != null) onChanged(p);
    } catch (e) {
      if (context.mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final has = photo != null && photo!.isNotEmpty;
    final scheme = Theme.of(context).colorScheme;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        GestureDetector(
          onTap: () => _pick(context),
          child: Stack(
            children: [
              PersonAvatar(name: name, photo: photo, radius: radius),
              Positioned(
                right: 0,
                bottom: 0,
                child: CircleAvatar(
                  radius: radius * 0.32,
                  backgroundColor: scheme.primary,
                  child: Icon(
                    Icons.photo_camera,
                    size: radius * 0.34,
                    color: scheme.onPrimary,
                  ),
                ),
              ),
            ],
          ),
        ),
        if (has)
          TextButton(
            onPressed: () => onChanged(null),
            child: const Text('Remover foto'),
          ),
      ],
    );
  }
}
