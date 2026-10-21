import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/firebase/firebase_providers.dart';
import '../../../../core/services/local_preferences_service.dart';
import '../../../tenant/presentation/providers/tenant_providers.dart';
import '../../data/auth_repository.dart';
import '../../domain/entities/app_user.dart';

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(
    ref.watch(firebaseAuthProvider),
    ref.watch(firestoreProvider),
    ref.watch(functionsProvider),
  ),
);

final authStateProvider = StreamProvider<User?>(
  (ref) => ref.watch(authRepositoryProvider).authChanges(),
);

/// Formas de entrar vinculadas à conta atual (`password`, `google.com`,
/// `apple.com`); atualiza ao vincular/desvincular.
final linkedProvidersProvider = StreamProvider<List<String>>(
  (ref) => ref.watch(authRepositoryProvider).linkedProviders(),
);

/// Perfil (papel, turmas, família) da pessoa NA igreja ativa.
final profileProvider = StreamProvider<AppUser?>((ref) {
  final user = ref.watch(authStateProvider).valueOrNull;
  final church = ref.watch(currentMembershipProvider);
  if (user == null || church == null) return Stream.value(null);
  return ref.watch(tenantRepositoryProvider).watchMember(church, user.uid);
});

/// Estado de sessão consumido pelo roteador.
///
/// * `needsChurch`: logado, mas sem igreja ativa (nenhuma, ou várias e
///   nenhuma escolhida) — vai para a tela de escolher/entrar numa igreja.
enum SessionStatus {
  loading,
  signedOut,
  needsChurch,
  noProfile,
  inactive,
  ready,
}

class Session {
  const Session(this.status, [this.user]);
  final SessionStatus status;
  final AppUser? user;
}

final sessionProvider = Provider<Session>((ref) {
  final auth = ref.watch(authStateProvider);
  if (auth.isLoading) return const Session(SessionStatus.loading);
  if (auth.valueOrNull == null) return const Session(SessionStatus.signedOut);
  final memberships = ref.watch(membershipsProvider);
  if (memberships.isLoading) return const Session(SessionStatus.loading);
  if (ref.watch(currentMembershipProvider) == null) {
    return const Session(SessionStatus.needsChurch);
  }
  final profile = ref.watch(profileProvider);
  if (profile.isLoading) return const Session(SessionStatus.loading);
  final user = profile.valueOrNull;
  if (user == null) return const Session(SessionStatus.noProfile);
  if (!user.active) return const Session(SessionStatus.inactive, null);
  // Voluntário que também é pai/mãe: alterna entre equipe e família.
  final family = user.canSwitchMode && ref.watch(familyModeProvider);
  return Session(SessionStatus.ready, family ? user.withFamilyMode() : user);
});

/// `true` = equipe usando o app como família (só vale se tiver família vinculada).
/// Fica salvo por igreja neste aparelho: ao reabrir, volta ao último modo usado.
class FamilyModeNotifier extends Notifier<bool> {
  String? get _key {
    final id = ref.read(currentMembershipProvider)?.churchId;
    return id == null ? null : 'family_mode_$id';
  }

  @override
  bool build() {
    final id = ref.watch(currentMembershipProvider.select((m) => m?.churchId));
    if (id == null) return false;
    return ref.read(sharedPreferencesProvider).getBool('family_mode_$id') ??
        false;
  }

  void set(bool family) {
    state = family;
    final key = _key;
    if (key != null) {
      ref.read(sharedPreferencesProvider).setBool(key, family);
    }
  }
}

final familyModeProvider = NotifierProvider<FamilyModeNotifier, bool>(
  FamilyModeNotifier.new,
);
