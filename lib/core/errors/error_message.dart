import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart' as fb;

import 'failures.dart';

/// Ponto único de tradução de erro para texto de usuário. Todo SnackBar de
/// erro passa por aqui — nunca `error.toString()`.
String errorMessage(Object? error) {
  if (error is Failure) return error.message;
  if (error is fb.FirebaseAuthException) return authErrorMessage(error.code);
  if (error is FirebaseException) return _firestoreMessage(error.code);
  return 'Não foi possível concluir a ação. Verifique sua conexão e tente novamente.';
}

String authErrorMessage(String code) {
  switch (code) {
    case 'user-not-found':
    case 'wrong-password':
    case 'invalid-credential':
      return 'Não foi possível entrar. Verifique seu e-mail e senha.';
    case 'invalid-email':
      return 'Este e-mail não é válido.';
    case 'user-disabled':
      return 'Esta conta foi desativada. Fale com a coordenação.';
    case 'email-already-in-use':
      return 'Já existe uma conta com este e-mail. Tente entrar.';
    case 'weak-password':
      return 'Escolha uma senha com pelo menos 6 caracteres.';
    case 'too-many-requests':
      return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
    case 'network-request-failed':
      return 'Sem conexão com a internet.';
    case 'operation-not-allowed':
      return 'Login por e-mail/senha não está habilitado no Firebase.';
    default:
      return 'Não foi possível concluir o login. Tente novamente.';
  }
}

String _firestoreMessage(String code) {
  switch (code) {
    case 'permission-denied':
      return 'Você não tem permissão para fazer isso.';
    case 'not-found':
      return 'Não encontramos o que você procurava.';
    case 'unavailable':
    case 'deadline-exceeded':
      return 'Sem conexão no momento. Tente novamente em instantes.';
    case 'unauthenticated':
      return 'Sua sessão expirou. Saia e entre novamente.';
    default:
      return 'Não foi possível concluir a ação. Tente novamente.';
  }
}
