// Configuração do Firebase (projeto espacokids-app). As chaves de app do
// Firebase são públicas por design; a proteção real são as Security Rules.
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show TargetPlatform, defaultTargetPlatform, kIsWeb;

class DefaultFirebaseOptions {
  const DefaultFirebaseOptions._();

  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError('Plataforma não suportada pelo Espaço Kids.');
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBRIXfSUcahhE0ew12psJ53fR4vUq6CQuM',
    appId: '1:479251880139:android:a274d44c87bbbe143e234e',
    messagingSenderId: '479251880139',
    projectId: 'espacokids-app',
    storageBucket: 'espacokids-app.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyAk-TVBZgjV_bXJ78nTSw7zQwkvjvVdyw8',
    appId: '1:479251880139:ios:28c46cfbc86efdd23e234e',
    messagingSenderId: '479251880139',
    projectId: 'espacokids-app',
    storageBucket: 'espacokids-app.firebasestorage.app',
    iosBundleId: 'com.mova.software.espaco.kids.espacoKids',
  );

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyAn7hENgMZuEf2u3pt5rm9LUQcwLq3Yyh0',
    appId: '1:479251880139:web:a012688609fa92673e234e',
    messagingSenderId: '479251880139',
    projectId: 'espacokids-app',
    authDomain: 'espacokids-app.firebaseapp.com',
    storageBucket: 'espacokids-app.firebasestorage.app',
  );
}
