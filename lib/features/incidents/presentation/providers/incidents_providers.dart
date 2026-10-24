import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/services/local_preferences_service.dart';
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

/// Momento da última ocorrência que a família já viu (por igreja e conta, neste
/// aparelho). Null = ainda não abriu a tela: tudo conta como novo.
class IncidentsSeenNotifier extends Notifier<String?> {
  String? get _key {
    final uid = ref.read(sessionProvider).user?.uid;
    final church = ref.read(tenantRefProvider).id;
    return uid == null ? null : 'incidents_seen_${church}_$uid';
  }

  @override
  String? build() {
    ref.watch(tenantRefProvider);
    ref.watch(sessionProvider.select((s) => s.user?.uid));
    final key = _key;
    return key == null ? null : ref.read(sharedPreferencesProvider).getString(key);
  }

  void markSeen(List<Incident> list) {
    if (list.isEmpty) return;
    final latest = list.map((i) => i.createdAt).reduce(
      (a, b) => a.compareTo(b) >= 0 ? a : b,
    );
    if (state != null && state!.compareTo(latest) >= 0) return;
    state = latest;
    final key = _key;
    if (key != null) ref.read(sharedPreferencesProvider).setString(key, latest);
  }
}

final incidentsSeenProvider =
    NotifierProvider<IncidentsSeenNotifier, String?>(IncidentsSeenNotifier.new);

/// Ocorrências enviadas aos pais que a família ainda não abriu (bolinha da aba).
final unseenIncidentsProvider = Provider<int>((ref) {
  final user = ref.watch(sessionProvider).user;
  if (user == null || !user.isFamily) return 0;
  final seen = ref.watch(incidentsSeenProvider);
  final list = ref.watch(incidentsProvider).valueOrNull ?? const <Incident>[];
  return list.where((i) => seen == null || i.createdAt.compareTo(seen) > 0).length;
});
