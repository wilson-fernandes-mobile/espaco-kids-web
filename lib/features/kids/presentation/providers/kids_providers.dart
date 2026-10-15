import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../tenant/presentation/providers/tenant_providers.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/kids_repository.dart';
import '../../domain/entities/child.dart';
import '../../domain/entities/classroom.dart';
import '../../domain/entities/person.dart';
import '../../domain/entities/presence.dart';
import '../../domain/entities/room_staff.dart';

final kidsRepositoryProvider = Provider<KidsRepository>(
  (ref) => KidsRepository(ref.watch(tenantRefProvider)),
);

/// Crianças visíveis para o usuário: equipe vê todas; família, só as suas.
final childrenProvider = StreamProvider<List<Child>>((ref) {
  final user = ref.watch(sessionProvider).user;
  if (user == null) return Stream.value(const []);
  final repo = ref.watch(kidsRepositoryProvider);
  if (user.isFamily) {
    return repo.watchFamilyChildren(user.familyId ?? '');
  }
  return repo.watchChildren();
});

/// Filhos de uma família específica (cadastro feito pela própria família).
final familyChildrenProvider = StreamProvider.family<List<Child>, String>(
  (ref, familyId) =>
      ref.watch(kidsRepositoryProvider).watchFamilyChildren(familyId),
);

final classesProvider = StreamProvider<List<Classroom>>((ref) {
  final user = ref.watch(sessionProvider).user;
  if (user == null || user.isFamily) return Stream.value(const []);
  return ref.watch(kidsRepositoryProvider).watchClasses();
});

/// Presença em tempo real (equipe).
final presenceProvider = StreamProvider<List<Presence>>((ref) {
  final user = ref.watch(sessionProvider).user;
  if (user == null || user.isFamily) return Stream.value(const []);
  return ref.watch(kidsRepositoryProvider).watchPresence();
});

/// Presença de uma criança específica (família).
final childPresenceProvider = StreamProvider.family<Presence?, String>(
  (ref, childId) =>
      ref.watch(kidsRepositoryProvider).watchChildPresence(childId),
);

/// Responsáveis e autorizados de uma família.
final familyPeopleProvider = StreamProvider.family<List<Person>, String>(
  (ref, familyId) => ref.watch(kidsRepositoryProvider).watchPeople(familyId),
);

/// Equipe com check-in em salas hoje (equipe e famílias leem).
final roomStaffProvider = StreamProvider<List<RoomStaff>>((ref) {
  final user = ref.watch(sessionProvider).user;
  if (user == null) return Stream.value(const []);
  return ref
      .watch(kidsRepositoryProvider)
      .watchRoomStaff()
      .map((l) => l.where((s) => s.today).toList());
});

/// Em qual sala a pessoa logada está (null = sem check-in).
final myRoomProvider = Provider<RoomStaff?>((ref) {
  final uid = ref.watch(sessionProvider).user?.uid;
  final list = ref.watch(roomStaffProvider).valueOrNull ?? const [];
  return list.where((s) => s.uid == uid).firstOrNull;
});

/// Ids das crianças presentes agora (equipe).
final presentIdsProvider = Provider<Set<String>>((ref) {
  final list = ref.watch(presenceProvider).valueOrNull ?? const [];
  return {for (final p in list) p.childId};
});
