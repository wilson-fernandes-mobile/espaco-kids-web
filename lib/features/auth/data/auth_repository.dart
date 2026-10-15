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
    final cred = await _googleCredential();
    if (cred == null) return false;
    try {
      await _auth.signInWithCredential(cred);
    } on FirebaseAuthException catch (e) {
      throw _friendly(e);
    }
    return true;
  }

  /// Credencial do Google (abre a escolha de conta); null se cancelou.
  Future<AuthCredential?> _googleCredential() async {
    final google = GoogleSignIn(
      scopes: const ['email'],
      serverClientId: _googleServerClientId,
      clientId:
          defaultTargetPlatform == TargetPlatform.iOS
              ? _googleIosClientId
              : null,
    );
    final account = await google.signIn();
    if (account == null) return null;
    final tokens = await account.authentication;
    return GoogleAuthProvider.credential(
      idToken: tokens.idToken,
      accessToken: tokens.accessToken,
    );
  }

  // ---- Contas vinculadas (Google, Apple e e-mail/senha na MESMA conta) ----

  /// Provedores de login da conta atual: `password`, `google.com`, `apple.com`.
  List<String> get linkedProviderIds =>
      _auth.currentUser?.providerData.map((i) => i.providerId).toList() ??
      const [];

  /// Emite a lista de provedores sempre que a conta muda (vincular/desvincular).
  Stream<List<String>> linkedProviders() => _auth.userChanges().map(
    (u) => u?.providerData.map((i) => i.providerId).toList() ?? const [],
  );

  /// Vincula o Google à conta logada (não cria outra conta). false = cancelou.
  Future<bool> linkGoogle() async {
    final user = _auth.currentUser;
    if (user == null) throw const Failure('Entre na sua conta primeiro.');
    final cred = await _googleCredential();
    if (cred == null) return false;
    try {
      await user.linkWithCredential(cred);
    } on FirebaseAuthException catch (e) {
      throw _friendly(e, linking: true);
    }
    return true;
  }

  /// Vincula a Apple à conta logada. false = cancelou.
  Future<bool> linkApple() async {
    final user = _auth.currentUser;
    if (user == null) throw const Failure('Entre na sua conta primeiro.');
    try {
      // Fluxo nativo do firebase_auth: cuida do nonce e evita o
      // `invalid-credential` conhecido ao vincular com credencial montada à mão.
      await user.linkWithProvider(
        OAuthProvider('apple.com')
          ..addScope('email')
          ..addScope('name'),
      );
    } on FirebaseAuthException catch (e) {
      if (e.code == 'canceled' || e.code == 'unknown') return false;
      throw _friendly(e, linking: true);
    }
    return true;
  }

  /// Adiciona e-mail e senha como forma de entrar na conta logada.
  Future<void> linkEmailPassword(String email, String password) async {
    final user = _auth.currentUser;
    if (user == null) throw const Failure('Entre na sua conta primeiro.');
    try {
      await user.linkWithCredential(
        EmailAuthProvider.credential(email: email.trim(), password: password),
      );
    } on FirebaseAuthException catch (e) {
      throw _friendly(e, linking: true);
    }
  }

  /// Remove uma forma de entrar (só deve ser chamada se sobrar outra).
  Future<void> unlinkProvider(String providerId) async {
    final user = _auth.currentUser;
    if (user == null) return;
    if (user.providerData.length < 2) {
      throw const Failure('Mantenha pelo menos uma forma de entrar na conta.');
    }
    try {
      await user.unlink(providerId);
    } on FirebaseAuthException catch (e) {
      throw _friendly(e);
    }
    // Sem isto o Google continuaria escolhendo a conta antiga automaticamente.
    if (providerId == 'google.com') {
      try {
        await GoogleSignIn().signOut();
      } catch (_) {}
    }
  }

  Failure _friendly(FirebaseAuthException e, {bool linking = false}) {
    switch (e.code) {
      case 'account-exists-with-different-credential':
        return const Failure(
          'Este e-mail já tem conta com outra forma de entrar. Entre com ela '
          'e vincule esta em Perfil → Contas vinculadas.',
        );
      case 'credential-already-in-use':
        return const Failure(
          'Esta conta já está vinculada a outro usuário. Entre nela direto, '
          'ou use outra.',
        );
      case 'provider-already-linked':
        return const Failure('Esta forma de entrar já está vinculada.');
      case 'email-already-in-use':
        return const Failure('Este e-mail já está em uso por outra conta.');
      case 'weak-password':
        return const Failure('Escolha uma senha com pelo menos 6 caracteres.');
      case 'requires-recent-login':
        return const Failure(
          'Por segurança, saia e entre de novo antes de repetir esta ação.',
        );
      case 'no-such-provider':
        return const Failure('Esta forma de entrar não está vinculada.');
      default:
        return Failure(
          linking
              ? 'Não foi possível vincular. Tente de novo.'
              : 'Não foi possível concluir. Tente de novo.',
        );
    }
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
    final UserCredential result;
    try {
      result = await _auth.signInWithCredential(cred);
    } on FirebaseAuthException catch (e) {
      throw _friendly(e);
    }
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
        // iOS sem token APNs (push não configurado): não há token para tirar.
        if (defaultTargetPlatform == TargetPlatform.iOS &&
            await FirebaseMessaging.instance.getAPNSToken() == null) {
          throw StateError('sem token APNs');
        }
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
