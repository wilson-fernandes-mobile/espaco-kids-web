import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../tenant/presentation/providers/tenant_providers.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/calls_repository.dart';
import '../../domain/entities/guardian_call.dart';

final callsRepositoryProvider = Provider<CallsRepository>(
  (ref) => CallsRepository(ref.watch(tenantRefProvider)),
);

/// Chamadas: equipe vê todas; família, só dos seus filhos.
final callsProvider = StreamProvider<List<GuardianCall>>((ref) {
  final user = ref.watch(sessionProvider).user;
  if (user == null) return Stream.value(const []);
  final repo = ref.watch(callsRepositoryProvider);
  return user.isFamily
      ? repo.watchFamily(user.familyId ?? '')
      : repo.watchAll();
});
