import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/firebase/firebase_providers.dart';
import '../../../../core/services/local_preferences_service.dart';
import '../../../../core/theme/theme_color_option.dart';
import '../../data/tenant_repository.dart';
import '../../domain/church_membership.dart';

const _selectedChurchKey = 'selected_church_id';

final tenantRepositoryProvider = Provider<TenantRepository>(
  (ref) => TenantRepository(
    ref.watch(firestoreProvider),
    ref.watch(firebaseAuthProvider),
  ),
);

/// Usuário do Firebase Auth (separado de `authStateProvider` para este
/// módulo não depender do módulo de autenticação).
final _firebaseUserProvider = StreamProvider<User?>(
  (ref) => ref.watch(firebaseAuthProvider).authStateChanges(),
);

/// Igrejas às quais a pessoa logada pertence.
final membershipsProvider = StreamProvider<List<ChurchMembership>>((ref) {
  final user = ref.watch(_firebaseUserProvider).valueOrNull;
  if (user == null) return Stream.value(const []);
  return ref.watch(tenantRepositoryProvider).watchMemberships(user.uid);
});

/// Última igreja escolhida neste aparelho.
class SelectedChurchNotifier extends Notifier<String?> {
  @override
  String? build() =>
      ref.watch(sharedPreferencesProvider).getString(_selectedChurchKey);

  void select(String churchId) {
    state = churchId;
    ref.read(sharedPreferencesProvider).setString(_selectedChurchKey, churchId);
  }
}

final selectedChurchIdProvider =
    NotifierProvider<SelectedChurchNotifier, String?>(
      SelectedChurchNotifier.new,
    );

/// Igreja ativa: a escolhida (se a pessoa ainda pertence a ela) ou, se há só
/// uma, essa. Null = precisa escolher/entrar numa igreja.
final currentMembershipProvider = Provider<ChurchMembership?>((ref) {
  final list = ref.watch(membershipsProvider).valueOrNull;
  if (list == null || list.isEmpty) return null;
  final saved = ref.watch(selectedChurchIdProvider);
  for (final m in list) {
    if (m.churchId == saved) return m;
  }
  return list.length == 1 ? list.first : null;
});

/// Documento `tenants/{churchId}` da igreja ativa — raiz de todos os dados.
final tenantRefProvider = Provider<DocumentReference<Map<String, dynamic>>>((
  ref,
) {
  final id = ref.watch(currentMembershipProvider.select((m) => m?.churchId));
  return ref
      .watch(firestoreProvider)
      .collection('tenants')
      .doc(id ?? '_sem_igreja');
});

/// Cor escolhida pela igreja em Configurações (campo 	hemeColor do doc da
/// igreja, escrito pelo painel web). Null = sem cor definida ou sem leitura.
final churchThemeColorProvider = StreamProvider<ThemeColorOption?>((ref) {
  final church = ref.watch(currentMembershipProvider);
  if (church == null) return Stream.value(null);
  return ref
      .watch(tenantRefProvider)
      .snapshots()
      .map((s) => ThemeColorOption.fromName(s.data()?['themeColor'] as String?))
      .handleError((_) {});
});

/// Logo (logoUrl) do doc de uma igreja — qualquer membro ativo lê.
final churchLogoProvider = StreamProvider.family<String?, String>(
  (ref, churchId) => ref
      .watch(firestoreProvider)
      .collection('tenants')
      .doc(churchId)
      .snapshots()
      .map((s) => s.data()?['logoUrl'] as String?)
      .handleError((_) {}),
);
