import 'package:espaco_kids/core/utils/phone_br.dart';
import 'package:espaco_kids/features/checkin/domain/checkin_rules.dart';
import 'package:espaco_kids/features/kids/domain/entities/child.dart';
import 'package:espaco_kids/features/kids/domain/entities/person.dart';
import 'package:flutter_test/flutter_test.dart';

Child _child({
  String status = 'ativo',
  List<String> authorized = const ['p1'],
}) => Child(
  id: 'c1',
  code: 'CR-1001',
  fullName: 'Criança Teste',
  nickname: 'Teste',
  birthDate: '2021-01-01',
  classId: 't1',
  familyId: 'f1',
  status: status,
  authorizedIds: authorized,
);

Person _person({String id = 'p1', bool active = true, String? validUntil}) =>
    Person(
      id: id,
      familyId: 'f1',
      fullName: 'Pessoa Teste',
      phone: '11999990000',
      relation: 'Mãe',
      kind: PersonKind.authorized,
      active: active,
      validUntil: validUntil,
    );

void main() {
  group('validateCheckIn', () {
    test('libera criança ativa que ainda não entrou', () {
      expect(validateCheckIn(_child(), alreadyPresent: false).ok, isTrue);
    });

    test('bloqueia entrada duplicada', () {
      expect(validateCheckIn(_child(), alreadyPresent: true).ok, isFalse);
    });

    test('bloqueia cadastro inativo', () {
      expect(
        validateCheckIn(_child(status: 'inativo'), alreadyPresent: false).ok,
        isFalse,
      );
    });
  });

  group('validateCheckOut', () {
    test('libera pessoa autorizada e vigente', () {
      expect(
        validateCheckOut(_child(), person: _person(), present: true).ok,
        isTrue,
      );
    });

    test('bloqueia quem não está na lista de autorizados', () {
      final r = validateCheckOut(
        _child(),
        person: _person(id: 'x9'),
        present: true,
      );
      expect(r.ok, isFalse);
    });

    test('bloqueia autorização vencida ou revogada', () {
      expect(
        validateCheckOut(
          _child(),
          person: _person(validUntil: '2000-01-01'),
          present: true,
        ).ok,
        isFalse,
      );
      expect(
        validateCheckOut(
          _child(),
          person: _person(active: false),
          present: true,
        ).ok,
        isFalse,
      );
    });

    test('bloqueia saída de criança que não está presente', () {
      expect(
        validateCheckOut(_child(), person: _person(), present: false).ok,
        isFalse,
      );
    });
  });

  group('telefone', () {
    test('normaliza para 55 + DDD + número', () {
      expect(normalizePhoneBR('(11) 99999-0000'), '5511999990000');
      expect(normalizePhoneBR('123'), isNull);
    });
  });
}
