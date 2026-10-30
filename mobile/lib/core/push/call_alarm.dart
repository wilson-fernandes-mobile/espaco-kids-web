import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Alarme da chamada dos responsáveis (Android).
///
/// A Cloud Function manda a chamada só com `data` (sem `notification`), então
/// quem desenha o aviso é o app: sirene + vibração que se repetem até a pessoa
/// tocar ou dispensar (flag FLAG_INSISTENT do Android). No iPhone o aviso vem
/// pronto do APNs e o servidor reenvia até a família confirmar.
class CallAlarm {
  CallAlarm._();

  static final _plugin = FlutterLocalNotificationsPlugin();
  static bool _ready = false;

  // v2: o padrão de vibração de um canal não muda depois de criado; um id novo
  // faz quem já instalou o app receber a vibração contínua.
  static const _channelId = 'chamada_alarme_v2';
  static const _insistent = 4; // Notification.FLAG_INSISTENT

  /// Chamado quando a pessoa toca no alarme (isolate principal).
  static void Function(String payload)? onTap;

  /// O payload do alarme é `tipo|igreja`; vira o mesmo mapa do `data` do FCM.
  static Map<String, dynamic> parse(String payload) {
    final p = payload.split('|');
    return {'type': p.first, 'churchId': p.length > 1 ? p[1] : null};
  }

  /// Payload do alarme que abriu o app (app fechado), se foi o caso.
  static Future<String?> launchPayload() async {
    if (defaultTargetPlatform != TargetPlatform.android) return null;
    final d = await _plugin.getNotificationAppLaunchDetails();
    return d?.didNotificationLaunchApp == true
        ? d?.notificationResponse?.payload
        : null;
  }

  static Future<void> init() async {
    if (_ready || defaultTargetPlatform != TargetPlatform.android) return;
    await _plugin.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('ic_stat_notification'),
      ),
      onDidReceiveNotificationResponse: (r) {
        final payload = r.payload;
        if (payload != null) onTap?.call(payload);
      },
    );
    final android =
        _plugin
            .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin
            >();
    await android?.createNotificationChannel(
      AndroidNotificationChannel(
        _channelId,
        'Chamada dos responsáveis',
        description: 'Alarme quando a sala precisa de você.',
        importance: Importance.max,
        playSound: true,
        sound: const RawResourceAndroidNotificationSound('sirene'),
        enableVibration: true,
        vibrationPattern: _vibration,
        audioAttributesUsage: AudioAttributesUsage.alarm,
      ),
    );
    _ready = true;
  }

  /// Vibra durante toda a sirene (~28 s): 800 ms ligado, 300 ms desligado. Com
  /// FLAG_INSISTENT o conjunto inteiro se repete junto com o som; ao tocar ou
  /// dispensar a notificação, o Android para tudo.
  static final _vibration = Int64List.fromList([
    0,
    for (var i = 0; i < 25; i++) ...[800, 300],
  ]);

  static int _idOf(String callId) => callId.hashCode & 0x7fffffff;

  /// Trata uma mensagem FCM; devolve `true` se era da chamada (alarme/cancelar).
  static Future<bool> handle(RemoteMessage message) async {
    final data = message.data;
    final type = data['type'];
    if (type != 'call' && type != 'call-stop') return false;
    if (defaultTargetPlatform != TargetPlatform.android) return true;
    await init();
    final id = _idOf(data['callId'] ?? '');
    if (type == 'call-stop') {
      await _plugin.cancel(id: id);
      return true;
    }
    await _plugin.show(
      id: id,
      title: data['title'],
      body: data['body'],
      payload: '$type|${data['churchId'] ?? ''}',
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          'Chamada dos responsáveis',
          channelDescription: 'Alarme quando a sala precisa de você.',
          icon: 'ic_stat_notification',
          importance: Importance.max,
          priority: Priority.max,
          category: AndroidNotificationCategory.alarm,
          sound: const RawResourceAndroidNotificationSound('sirene'),
          vibrationPattern: _vibration,
          audioAttributesUsage: AudioAttributesUsage.alarm,
          fullScreenIntent: true,
          additionalFlags: Int32List.fromList([_insistent]),
          autoCancel: true,
          // Não toca para sempre se a pessoa não estiver com o aparelho.
          timeoutAfter: 5 * 60 * 1000,
        ),
      ),
    );
    return true;
  }
}

/// Mensagens com o app fechado ou em segundo plano (isolate próprio).
@pragma('vm:entry-point')
Future<void> callAlarmBackgroundHandler(RemoteMessage message) async {
  await CallAlarm.handle(message);
}
