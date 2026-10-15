import 'dart:convert';
import 'dart:math';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:crypto/crypto.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import '../../../core/errors/failures.dart';

/// Client ID "Web" do projeto (necessário no Android para obter o idToken).
const _googleServerClientId =
    '479251880139-6cj3n8jfu7buiqt2h67tddmida6qt222.apps.googleusercontent.com';

/// Client ID do app iOS (o app não embute GoogleService-Info.plist).
const _googleIosClientId =
    '479251880139-tfsfm3oubfp8i0a72rv5hnpt4113d66d.apps.googleusercontent.com';

/// Acesso ao Firebase Auth. O papel da pessoa vive em cada igreja
/// (`tenants/{churchId}/members/{uid}`, ver `TenantRepository`); o cadastro
/// por código também é feito lá.
class AuthRepository {
  AuthRepository(this._auth, this._db);

  final FirebaseAuth _auth;
  final FirebaseFirestore _db;

  Stream<User?> authChanges() => _auth.authStateChanges();

  Future<void> signIn(String email, String password) =>
      _auth.signInWithEmailAndPassword(email: email.trim(), password: password);

  /// Entra (ou cria a conta) com Google. Retorna false se a pessoa cancelou.
  Future<bool> signInWithGoogle() async {
    final google = GoogleSignIn(
      scopes: const ['email'],
      serverClientId: _googleServerClientId,
      clientId: defaultTargetPlatform == TargetPlatform.iOS
          ? _googleIosClientId
          : null,
    );
    final account = await google.signIn();
    if (account == null) return false;
    final tokens = await account.authentication;
    final cred = GoogleAuthProvider.credential(
      idToken: tokens.idToken,
      accessToken: tokens.accessToken,
    );
    await _auth.signInWithCredential(cred);
    return true;
  }

  /// Entra (ou cria a conta) com Apple. Retorna false se a pessoa cancelou.
  Future<bool> signInWithApple() async {
    final rawNonce = _randomNonce();
    final nonce = sha256.convert(utf8.encode(rawNonce)).toString();
    final AuthorizationCredentialAppleID apple;
    try {
      apple = await SignInWithApple.getAppleIDCredential(
        scopes: const [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
        nonce: nonce,
      );
    } on SignInWithAppleAuthorizationException catch (e) {
      if (e.code == AuthorizationErrorCode.canceled) return false;
      throw const Failure('Não foi possível entrar com a Apple.');
    }
    final cred = OAuthProvider('apple.com').credential(
      idToken: apple.identityToken,
      rawNonce: rawNonce,
      accessToken: apple.authorizationCode,
    );
    final result = await _auth.signInWithCredential(cred);
    // A Apple só envia o nome na primeira vez: guarda no perfil do Auth.
    final given = apple.givenName ?? '';
    final family = apple.familyName ?? '';
    final full = '$given $family'.trim();
    if (full.isNotEmpty && (result.user?.displayName ?? '').isEmpty) {
      await result.user?.updateDisplayName(full);
    }
    return true;
  }

  String _randomNonce([int length = 32]) {
    const chars =
        '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
    final r = Random.secure();
    return List.generate(length, (_) => chars[r.nextInt(chars.length)]).join();
  }

  Future<void> resetPassword(String email) =>
      _auth.sendPasswordResetEmail(email: email.trim());

  /// Sai da conta. Antes, tira o token de push deste aparelho da conta (para
  /// não receber avisos de quem saiu) e encerra a sessão do Google, para a
  /// próxima entrada poder escolher outra conta. Nada disso trava a saída.
  Future<void> signOut() async {
    final uid = _auth.currentUser?.uid;
    if (uid != null) {
      try {
        final token = await FirebaseMessaging.instance.getToken().timeout(
          const Duration(seconds: 3),
        );
        if (token != null) {
          await _db
              .doc('users/$uid')
              .update({
                'fcmTokens': FieldValue.arrayRemove([token]),
              })
              .timeout(const Duration(seconds: 3));
        }
      } catch (e) {
        debugPrint('signOut push: $e');
      }
    }
    try {
      await GoogleSignIn().signOut().timeout(const Duration(seconds: 3));
    } catch (e) {
      debugPrint('signOut google: $e');
    }
    await _auth.signOut();
  }

  /// Define quem o usuário é dentro da família (primeiro acesso), na igreja
  /// em que está.
  Future<void> setPerson(
    String churchId,
    String uid,
    String personId,
    String personKind,
  ) => _db
      .collection('tenants')
      .doc(churchId)
      .collection('members')
      .doc(uid)
      .update({'personId': personId, 'personKind': personKind});

  /// Foto de perfil da pessoa na igreja (data URL; null remove).
  Future<void> setPhoto(String churchId, String uid, String? photo) => _db
      .collection('tenants')
      .doc(churchId)
      .collection('members')
      .doc(uid)
      .update({'photoUrl': photo ?? FieldValue.delete()});
}
