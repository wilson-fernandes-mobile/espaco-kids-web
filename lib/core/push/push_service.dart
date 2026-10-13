import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/presentation/providers/auth_providers.dart';
import '../firebase/firebase_providers.dart';

/// Registra o token de push (FCM) do aparelho em `users/{uid}.fcmTokens`.
/// As Cloud Functions (`functions/index.js`) usam esses tokens para avisar
/// a família das chamadas e a equipe dos pedidos de entrada/saída.
class PushService {
  PushService(this._db);

  final FirebaseFirestore _db;
  String? _uid;

  Future<void> register(String uid) async {
    try {
      final messaging = FirebaseMessaging.instance;
      final settings = await messaging.requestPermission();
      if (settings.authorizationStatus == AuthorizationStatus.denied) return;
      final token = await messaging.getToken();
      if (token == null) return;
      _uid = uid;
      await _save(uid, token);
      messaging.onTokenRefresh.listen((t) {
        final u = _uid;
        if (u != null) _save(u, t);
      });
    } catch (e) {
      // Push é opcional: nunca derruba o app (ex.: sem Play Services).
      debugPrint('push: $e');
    }
  }

  Future<void> unregister(String uid) async {
    _uid = null;
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token == null) return;
      await _db.doc('users/$uid').update({
        'fcmTokens': FieldValue.arrayRemove([token]),
      });
    } catch (e) {
      debugPrint('push: $e');
    }
  }

  Future<void> _save(String uid, String token) => _db.doc('users/$uid').update({
    'fcmTokens': FieldValue.arrayUnion([token]),
  });
}

final pushServiceProvider = Provider<PushService>(
  (ref) => PushService(ref.watch(firestoreProvider)),
);

/// Mantém o token registrado enquanto houver sessão pronta.
final pushRegistrationProvider = Provider<void>((ref) {
  // select: só reage a login/logout, não a cada atualização do perfil
  // (gravar o token altera o próprio documento do usuário).
  final uid = ref.watch(
    sessionProvider.select(
      (s) => s.status == SessionStatus.ready ? s.user?.uid : null,
    ),
  );
  if (uid == null) return;
  final push = ref.read(pushServiceProvider);
  push.register(uid);
  ref.onDispose(() => push.unregister(uid));
});
