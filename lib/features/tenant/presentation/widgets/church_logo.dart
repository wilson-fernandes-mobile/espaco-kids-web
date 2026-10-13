import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/tenant_providers.dart';

/// Logo da igreja (campo `logoUrl` do doc da igreja, enviado pelo painel web)
/// ou o ícone padrão, num quadrado arredondado — mesmo formato do painel.
class ChurchLogo extends ConsumerWidget {
  const ChurchLogo({super.key, required this.churchId, this.size = 44});

  final String churchId;
  final double size;

  ImageProvider? _image(String? url) {
    if (url == null || url.isEmpty) return null;
    if (url.startsWith('data:')) {
      final i = url.indexOf(',');
      if (i < 0) return null;
      try {
        return MemoryImage(base64Decode(url.substring(i + 1)));
      } catch (_) {
        return null;
      }
    }
    return NetworkImage(url);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final image = _image(ref.watch(churchLogoProvider(churchId)).valueOrNull);
    final radius = BorderRadius.circular(size * 0.28);

    if (image != null) {
      return ClipRRect(
        borderRadius: radius,
        child: Image(
          image: image,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => _fallback(scheme, radius),
        ),
      );
    }
    return _fallback(scheme, radius);
  }

  Widget _fallback(ColorScheme scheme, BorderRadius radius) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(color: scheme.primary, borderRadius: radius),
    child: Icon(
      Icons.church_outlined,
      color: scheme.onPrimary,
      size: size * 0.5,
    ),
  );
}
