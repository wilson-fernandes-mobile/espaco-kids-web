import 'dart:async';

import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/presentation/providers/auth_providers.dart';
import '../../features/calls/presentation/providers/calls_providers.dart';

/// Com o app aberto, mantém o aparelho vibrando enquanto houver chamada da
/// sala sem resposta ("Estou indo"). O iPhone não deixa um app vibrar em
/// segundo plano, então aqui só vale com o app na tela; fora dele a vibração
/// vem do aviso (Android: padrão contínuo; iPhone: reenvios do servidor).
final callHapticsProvider = Provider<void>((ref) {
  final waiting = ref.watch(
    callsProvider.select(
      (v) => (v.valueOrNull ?? const []).any(
        (c) => c.open && c.status != 'visualizada',
      ),
    ),
  );
  final family = ref.watch(sessionProvider.select((s) => s.user?.isFamily));
  if (!waiting || family != true) return;
  final timer = Timer.periodic(const Duration(milliseconds: 1500), (_) {
    if (SchedulerBinding.instance.lifecycleState == AppLifecycleState.resumed) {
      HapticFeedback.vibrate();
    }
  });
  ref.onDispose(timer.cancel);
});
