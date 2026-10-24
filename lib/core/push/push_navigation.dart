import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/presentation/providers/auth_providers.dart';
import '../../features/tenant/presentation/providers/tenant_providers.dart';
import '../router/app_router.dart';
import 'call_alarm.dart';

/// Para onde levar a pessoa quando ela toca numa notificação.
class PushTarget {
  const PushTarget(this.type, this.churchId);

  /// `call`, `incident`, `task` (família) ou `request`, `call-ack` (equipe).
  final String type;
  final String? churchId;

  /// Avisos da família; o resto da equipe usa o modo equipe.
  bool get forFamily => const {'call', 'incident', 'task'}.contains(type);

  String? get path => switch (type) {
    'call' => '/avisos',
    'incident' => '/relatos',
    // Ainda não há tela de tarefas no app: abre a tela inicial da família.
    'task' => '/familia',
    'request' => '/inicio',
    'call-ack' => '/chamadas',
    _ => null,
  };

  static PushTarget? fromData(Map<String, dynamic> data) {
    final type = data['type'];
    if (type is! String) return null;
    final target = PushTarget(type, data['churchId'] as String?);
    return target.path == null ? null : target;
  }
}

final pushTargetProvider = StateProvider<PushTarget?>((_) => null);

/// Abre a tela certa ao tocar numa notificação (app em segundo plano, fechado
/// ou alarme da chamada): troca para a igreja da notificação e, se a pessoa é
/// da equipe e também tem família, para o modo (família/equipe) que combina.
final pushNavigationProvider = Provider<void>((ref) {
  void open(PushTarget? t) {
    if (t != null) ref.read(pushTargetProvider.notifier).state = t;
  }

  void apply() {
    final t = ref.read(pushTargetProvider);
    if (t == null) return;
    void drop() => ref.read(pushTargetProvider.notifier).state = null;

    final session = ref.read(sessionProvider);
    if (session.status == SessionStatus.loading) return;
    if (session.status == SessionStatus.signedOut) return drop();

    final churchId = t.churchId;
    if (churchId != null && churchId.isNotEmpty) {
      final memberships = ref.read(membershipsProvider).valueOrNull;
      if (memberships == null) return;
      if (!memberships.any((m) => m.churchId == churchId)) return drop();
      if (ref.read(currentMembershipProvider)?.churchId != churchId) {
        ref.read(selectedChurchIdProvider.notifier).select(churchId);
        return; // a sessão recarrega e este método roda de novo
      }
    }
    if (session.status != SessionStatus.ready) return drop();

    final user = session.user!;
    if (user.isFamily != t.forFamily) {
      if (!user.canSwitchMode) return drop();
      ref.read(familyModeProvider.notifier).set(t.forFamily);
      return; // idem
    }
    drop();
    ref.read(routerProvider).go(t.path!);
  }

  final tap = FirebaseMessaging.onMessageOpenedApp.listen(
    (m) => open(PushTarget.fromData(m.data)),
  );
  ref.onDispose(tap.cancel);
  // App que estava fechado e foi aberto pela notificação.
  FirebaseMessaging.instance.getInitialMessage().then((m) {
    if (m != null) open(PushTarget.fromData(m.data));
  });
  // Alarme da chamada (notificação local desenhada pelo app).
  CallAlarm.onTap = (payload) => open(PushTarget.fromData(CallAlarm.parse(payload)));
  CallAlarm.init().then((_) async {
    final launch = await CallAlarm.launchPayload();
    if (launch != null) open(PushTarget.fromData(CallAlarm.parse(launch)));
  });

  ref.listen(pushTargetProvider, (_, _) => apply());
  ref.listen(sessionProvider, (_, _) => apply());
  ref.listen(membershipsProvider, (_, _) => apply());
});
