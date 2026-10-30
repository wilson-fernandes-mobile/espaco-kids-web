import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

/// Escolhe uma foto (câmera ou galeria) e devolve como data URL JPEG pequena
/// (lado máx. 320px, ~15 KB), o mesmo formato gravado pelo painel web.
/// Null se o usuário cancelar.
Future<String?> pickPhotoDataUrl(BuildContext context) async {
  final source = await showModalBottomSheet<ImageSource>(
    context: context,
    builder:
        (_) => SafeArea(
          child: Wrap(
            children: [
              ListTile(
                leading: const Icon(Icons.photo_camera_outlined),
                title: const Text('Tirar foto'),
                onTap: () => Navigator.pop(context, ImageSource.camera),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined),
                title: const Text('Escolher da galeria'),
                onTap: () => Navigator.pop(context, ImageSource.gallery),
              ),
            ],
          ),
        ),
  );
  if (source == null) return null;
  final file = await ImagePicker().pickImage(
    source: source,
    maxWidth: 320,
    maxHeight: 320,
    imageQuality: 80,
  );
  if (file == null) return null;
  final bytes = await file.readAsBytes();
  return 'data:image/jpeg;base64,${base64Encode(bytes)}';
}
