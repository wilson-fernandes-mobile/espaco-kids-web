import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../tenant/presentation/providers/tenant_providers.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/checkin_repository.dart';
import '../../domain/entities/checkin_request.dart';

final checkinRepositoryProvider = Provider<CheckinRepository>(
  (ref) => CheckinRepository(ref.watch(tenantRefProvider)),
);

/// Pedidos pendentes vindos do app das famílias (equipe da recepção).
final pendingRequestsProvider = StreamProvider<List<CheckinRequest>>((ref) {
  final user = ref.watch(sessionProvider).user;
  if (user == null || user.isFamily) return Stream.value(const []);
  return ref.watch(checkinRepositoryProvider).watchPending();
});

/// Pedidos da própria família.
final familyRequestsProvider = StreamProvider<List<CheckinRequest>>((ref) {
  final user = ref.watch(sessionProvider).user;
  if (user == null || !user.isFamily) return Stream.value(const []);
  return ref
      .watch(checkinRepositoryProvider)
      .watchFamilyRequests(user.familyId ?? '');
});
