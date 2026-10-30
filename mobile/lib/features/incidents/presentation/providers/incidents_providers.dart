import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../tenant/presentation/providers/tenant_providers.dart';
import '../../data/incidents_repository.dart';
import '../../domain/entities/incident.dart';

final incidentsRepositoryProvider = Provider<IncidentsRepository>(
  (ref) => IncidentsRepository(ref.watch(tenantRefProvider)),
);

/// Ocorrências: a equipe lê todas; a família, só as enviadas aos pais.
final incidentsProvider = StreamProvider<List<Incident>>((ref) {
  final user = ref.watch(sessionProvider).user;
  if (user == null) return Stream.value(const []);
  final repo = ref.watch(incidentsRepositoryProvider);
  if (user.isFamily) {
    final fid = user.familyId;
    if (fid == null || fid.isEmpty) return Stream.value(const []);
    return repo.watchShared(fid);
  }
  return repo.watchAll();
});
