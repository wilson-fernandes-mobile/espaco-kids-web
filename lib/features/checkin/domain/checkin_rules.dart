import '../../kids/domain/entities/child.dart';
import '../../kids/domain/entities/person.dart';

/// Resultado de uma regra de negócio: ok ou motivo pronto para exibir.
class RuleResult {
  const RuleResult.ok() : ok = true, reason = null;
  const RuleResult.fail(this.reason) : ok = false;

  final bool ok;
  final String? reason;
}

/// Espelha `validateCheckIn` do painel web.
RuleResult validateCheckIn(Child child, {required bool alreadyPresent}) {
  if (!child.active) {
    return const RuleResult.fail(
      'Cadastro não está ativo. Procure a coordenação.',
    );
  }
  if (alreadyPresent) {
    return const RuleResult.fail(
      'Esta criança já possui entrada registrada e ainda não saiu.',
    );
  }
  return const RuleResult.ok();
}

/// Espelha `validateCheckOut`: só sai com pessoa autorizada e vigente.
RuleResult validateCheckOut(
  Child child, {
  required Person? person,
  required bool present,
}) {
  if (!present) {
    return const RuleResult.fail(
      'Não há entrada registrada para esta criança.',
    );
  }
  if (person == null || !child.authorizedIds.contains(person.id)) {
    return const RuleResult.fail(
      'Pessoa NÃO autorizada a retirar esta criança. Contate a coordenação.',
    );
  }
  if (!person.canPickUp) {
    return const RuleResult.fail(
      'Autorização vencida ou revogada. Contate a coordenação.',
    );
  }
  return const RuleResult.ok();
}
