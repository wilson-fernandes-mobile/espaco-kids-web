import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/firebase/firebase_providers.dart';
import '../../data/family_repository.dart';

final familyRepositoryProvider = Provider<FamilyRepository>(
  (ref) => FamilyRepository(
    ref.watch(firestoreProvider),
    ref.watch(functionsProvider),
  ),
);

/// Código ativo da família (`LK-…`), se já foi gerado. Chave: (igreja, família).
final familyCodeProvider = StreamProvider.family<String?, (String, String)>(
  (ref, key) =>
      ref.watch(familyRepositoryProvider).watchFamilyCode(key.$1, key.$2),
);
