import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../kids/domain/entities/child.dart';
import '../../../kids/domain/entities/person.dart';
import '../../../kids/presentation/providers/kids_providers.dart';
import '../../domain/checkin_rules.dart';
import 'checkin_providers.dart';

/// Casos de uso de entrada/saída: valida as regras, grava e registra
/// tentativas bloqueadas. A UI só chama estes métodos.
class CheckinActions {
  CheckinActions(this._ref);

  final Ref _ref;

  Future<RuleResult> checkIn(Child child, String droppedBy) async {
    final user = _ref.read(sessionProvider).user!;
    final present = _ref.read(presentIdsProvider).contains(child.id);
    final r = validateCheckIn(child, alreadyPresent: present);
    if (!r.ok) return r;
    await _ref
        .read(checkinRepositoryProvider)
        .checkIn(
          child: child,
          droppedBy: droppedBy,
          staffUid: user.uid,
          staffName: user.name,
        );
    return r;
  }

  Future<RuleResult> checkOut(Child child, Person person) async {
    final user = _ref.read(sessionProvider).user!;
    final present = _ref.read(presentIdsProvider).contains(child.id);
    final r = validateCheckOut(child, person: person, present: present);
    final repo = _ref.read(checkinRepositoryProvider);
    if (!r.ok) {
      if (present) {
        await repo.logBlocked(
          child: child,
          personName: person.fullName,
          reason: r.reason!,
          staffUid: user.uid,
          staffName: user.name,
        );
      }
      return r;
    }
    await repo.checkOut(
      child: child,
      person: person,
      staffUid: user.uid,
      staffName: user.name,
    );
    return r;
  }
}

final checkinActionsProvider = Provider<CheckinActions>(CheckinActions.new);
