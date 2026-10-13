import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

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

  Future<void> resetPassword(String email) =>
      _auth.sendPasswordResetEmail(email: email.trim());

  Future<void> signOut() => _auth.signOut();

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
}
