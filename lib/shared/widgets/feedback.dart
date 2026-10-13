import 'package:flutter/material.dart';

import '../../core/errors/error_message.dart';
import '../../core/theme/app_colors.dart';

void showInfo(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}

void showError(BuildContext context, Object? error) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Text(errorMessage(error)),
        backgroundColor: AppColors.danger,
      ),
    );
}

Future<bool> confirm(
  BuildContext context, {
  required String title,
  required String message,
  String action = 'Confirmar',
}) async {
  final r = await showDialog<bool>(
    context: context,
    builder:
        (c) => AlertDialog(
          title: Text(title),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(c, false),
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(c, true),
              child: Text(action),
            ),
          ],
        ),
  );
  return r ?? false;
}
