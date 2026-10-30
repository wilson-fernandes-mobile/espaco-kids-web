import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/presentation/providers/auth_providers.dart';
import '../../features/kids/presentation/providers/kids_providers.dart';
import '../../features/tenant/presentation/providers/tenant_providers.dart';
import '../router/app_router.dart';
import 'call_alarm.dart';

/// Para onde levar a pessoa quando ela toca numa notificação.
class PushTarget {
  const PushTarget(this.type, this.churchId, {this.childId, this.classId});

  /// `call`, `incident`, `task` (família) ou `request`, `call-ack` (equipe).
  final String type;
  final String? churchId;

  /// Ocorrência: a criança. Tarefa: a turma (a família abre o filho dela).
  final String? childId;
  final String? classId;

  /// Avisos da família; o resto da equipe usa o modo equipe.
  bool get forFamily => const {'call', 'incident', 'task'}.contains(type);

  /// Telas de abertura. Ocorrência e tarefa abrem o perfil do filho (aba
  /// Ocorrências ou Tarefas); [kidClassIds] liga a turma da tarefa ao filho.
  String? pathFor(Map<String, String> kidClassIds) => switch (type) {
    'call' => '/avisos',
    'incident' => _kid(childId, 1),
    'task' => _kid(
      kidClassIds.entries
          .where((e) => e.value == classId)
          .map((e) => e.key)
          .firstOrNull,
      2,
    ),
    'request' => '/inicio',
    'call-ack' => '/chamadas',
    _ => null,
  };

  static String _kid(String? id, int tab) =>
      id == null || id.isEmpty ? '/familia' : '/crianca/$id?tab=$tab';

  bool get known =>
      const {'call', 'incident', 'task', 'request', 'call-ack'}.contains(type);

  static PushTarget? fromData(Map<String, dynamic> data) {
    final type = data['type'];
    if (type is! String) return null;
    final target = PushTarget(
      type,
      data['churchId'] as String?,
      childId: data['childId'] as String?,
      classId: data['classId'] as String?,
    );
    return target.known ? target : null;
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
    final kids = ref.read(childrenProvider).valueOrNull ?? const [];
    final path = t.pathFor({for (final k in kids) k.id: k.classId});
    if (path == null) return;
    final router = ref.read(routerProvider);
    if (path.startsWith('/crianca/')) {
      // Abre o perfil por cima da tela inicial: "voltar" não fecha o app.
      router.go(user.isFamily ? '/familia' : '/inicio');
      router.push(path);
    } else {
      router.go(path);
    }
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
  CallAlarm.onTap =
      (payload) => open(PushTarget.fromData(CallAlarm.parse(payload)));
  CallAlarm.init().then((_) async {
    final launch = await CallAlarm.launchPayload();
    if (launch != null) open(PushTarget.fromData(CallAlarm.parse(launch)));
  });

  ref.listen(pushTargetProvider, (_, _) => apply());
  ref.listen(sessionProvider, (_, _) => apply());
  ref.listen(membershipsProvider, (_, _) => apply());
});
