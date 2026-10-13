/// Falha de negócio com mensagem já pronta para o usuário (pt-BR).
class Failure implements Exception {
  const Failure(this.message);

  final String message;

  @override
  String toString() => message;
}
