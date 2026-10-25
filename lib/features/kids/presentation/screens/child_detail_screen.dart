import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/date_format.dart';
import '../../../../core/utils/phone_br.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../../shared/widgets/form_section_header.dart';
import '../../../../shared/widgets/person_avatar.dart';
import '../../../../shared/widgets/status_badge.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../calls/domain/entities/guardian_call.dart';
import '../../../calls/presentation/providers/calls_providers.dart';
import '../../../checkin/presentation/providers/checkin_actions.dart';
import '../../../family/presentation/providers/family_providers.dart';
import '../../../incidents/presentation/providers/incidents_providers.dart';
import '../../../incidents/presentation/widgets/incident_sheet.dart';
import '../../../incidents/presentation/widgets/incident_tile.dart';
import '../../../tasks/presentation/widgets/task_list.dart';
import '../../domain/entities/care_profile.dart';
import '../../domain/entities/child.dart';
import '../../domain/entities/person.dart';
import '../providers/kids_providers.dart';
import '../widgets/person_picker_sheet.dart';

/// Ficha da criança: status, entrada/saída, chamada e contatos (equipe) e, para
/// a família e a equipe, os dados, as ocorrências e as tarefas da turma.
class ChildDetailScreen extends ConsumerWidget {
  const ChildDetailScreen({
    super.key,
    required this.childId,
    this.initialTab = 0,
  });

  final String childId;

  /// 0 = perfil, 1 = ocorrências, 2 = tarefas.
  final int initialTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final children = ref.watch(childrenProvider).valueOrNull ?? const [];
    Child? child;
    for (final c in children) {
      if (c.id == childId) child = c;
    }
    if (child == null) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    return _Body(child: child, initialTab: initialTab.clamp(0, 2));
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.child, required this.initialTab});

  final Child child;
  final int initialTab;

  Future<void> _entry(BuildContext context, WidgetRef ref) async {
    final p = await pickPerson(
      context,
      familyId: child.familyId,
      title: 'Quem está entregando ${child.displayName}?',
      allowedIds: child.authorizedIds,
    );
    if (p == null || !context.mounted) return;
    try {
      final r = await ref
          .read(checkinActionsProvider)
          .checkIn(child, p.fullName);
      if (context.mounted) {
        r.ok
            ? showInfo(context, 'Entrada registrada — ${child.displayName}')
            : showError(context, r.reason);
      }
    } catch (e) {
      if (context.mounted) showError(context, e);
    }
  }

  Future<void> _exit(BuildContext context, WidgetRef ref) async {
    final p = await pickPerson(
      context,
      familyId: child.familyId,
      title: 'Quem está retirando ${child.displayName}?',
      allowedIds: child.authorizedIds,
    );
    if (p == null || !context.mounted) return;
    try {
      final r = await ref.read(checkinActionsProvider).checkOut(child, p);
      if (context.mounted) {
        r.ok
            ? showInfo(context, 'Saída registrada — ${child.displayName}')
            : showError(context, r.reason);
      }
    } catch (e) {
      if (context.mounted) showError(context, e);
    }
  }

  Future<void> _call(BuildContext context, WidgetRef ref) async {
    final reason = await showModalBottomSheet<String>(
      context: context,
      builder:
          (c) => SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const ListTile(title: Text('Motivo da chamada')),
                for (final e in GuardianCall.reasons.entries)
                  ListTile(
                    title: Text(e.value),
                    onTap: () => Navigator.pop(c, e.key),
                  ),
              ],
            ),
          ),
    );
    if (reason == null || !context.mounted) return;
    try {
      final user = ref.read(sessionProvider).user!;
      await ref
          .read(callsRepositoryProvider)
          .open(
            child: child,
            reason: reason,
            note: '',
            staffName: user.name,
            staffId: user.uid,
          );
      if (context.mounted)
        showInfo(context, 'Chamada aberta para os responsáveis.');
    } catch (e) {
      if (context.mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).user!;
    final family = user.isFamily;
    // A família lê só a presença do próprio filho; a equipe, a de todos.
    final present =
        family
            ? ref.watch(childPresenceProvider(child.id)).valueOrNull != null
            : ref.watch(presentIdsProvider).contains(child.id);
    final people =
        ref.watch(familyPeopleProvider(child.familyId)).valueOrNull ?? const [];
    final classes = ref.watch(classesProvider).valueOrNull ?? const [];
    // A família não lê as turmas: o nome vem de quem está na sala.
    final roomStaff = ref.watch(roomStaffProvider).valueOrNull ?? const [];
    final className =
        classes
            .where((c) => c.id == child.classId)
            .map((c) => c.name)
            .firstOrNull ??
        roomStaff
            .where((s) => s.classId == child.classId)
            .map((s) => s.className)
            .firstOrNull ??
        '—';
    final guardians =
        people.where((p) => p.kind == PersonKind.guardian).toList();
    final authorized =
        people.where((p) => p.kind == PersonKind.authorized).toList();

    return DefaultTabController(
      length: 3,
      initialIndex: initialTab,
      child: Scaffold(
        appBar: AppBar(
          title: Text(child.displayName),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Perfil'),
              Tab(text: 'Ocorrências'),
              Tab(text: 'Tarefas'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            ListView(
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [
                Center(
                  child: PersonAvatar(
                    name: child.fullName,
                    photo: child.photoUrl,
                    radius: 52,
                    viewable: true,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  child.fullName,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  '${ageLabel(child.birthDate)} · $className · ${child.code}',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Center(
                  child: StatusBadge(
                    label: present ? 'Na sala' : 'Fora da sala',
                    tone: present ? StatusTone.success : StatusTone.neutral,
                  ),
                ),
                if (child.notes.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.md),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: Text(child.notes),
                    ),
                  ),
                ],
                _CareCard(child: child),
                const SizedBox(height: AppSpacing.lg),
                if (!family && user.role.canCheckInOut)
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.icon(
                          onPressed:
                              present || !child.active
                                  ? null
                                  : () => _entry(context, ref),
                          icon: const Icon(Icons.login),
                          label: const Text('Entrada'),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: present ? () => _exit(context, ref) : null,
                          icon: const Icon(Icons.logout),
                          label: const Text('Saída'),
                        ),
                      ),
                    ],
                  ),
                if (!family && user.role.canCall && present) ...[
                  const SizedBox(height: AppSpacing.sm),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => _call(context, ref),
                      icon: const Icon(Icons.campaign_outlined),
                      label: const Text('Chamar responsáveis'),
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.lg),
                const FormSectionHeader(
                  icon: Icons.family_restroom,
                  title: 'Responsáveis',
                ),
                for (final g in guardians)
                  _PersonRow(person: g, contact: !family),
                const SizedBox(height: AppSpacing.md),
                const FormSectionHeader(
                  icon: Icons.verified_user_outlined,
                  title: 'Autorizados a retirar',
                ),
                if (authorized.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(AppSpacing.sm),
                    child: Text('Nenhum autorizado cadastrado.'),
                  ),
                for (final a in authorized)
                  _PersonRow(person: a, contact: !family),
              ],
            ),
            ListView(
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [_IncidentsSection(child: child)],
            ),
            ListView(
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [TaskList(child: child, className: className)],
            ),
          ],
        ),
      ),
    );
  }
}

/// Ocorrências da criança (inclui as em que aparece como envolvida).
class _IncidentsSection extends ConsumerWidget {
  const _IncidentsSection({required this.child});

  final Child child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final list =
        (ref.watch(incidentsProvider).valueOrNull ?? const [])
            .where(
              (i) =>
                  i.childId == child.id ||
                  i.involvedChildIds.contains(child.id),
            )
            .toList();
    final family = ref.watch(sessionProvider).user!.isFamily;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!family) ...[
          FilledButton.icon(
            onPressed: () => showIncidentSheet(context, fixedChild: child),
            icon: const Icon(Icons.add),
            label: const Text('Registrar ocorrência'),
          ),
          const SizedBox(height: AppSpacing.sm),
        ],
        if (list.isEmpty)
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Text(
              family
                  ? 'Nenhuma ocorrência enviada pela equipe.'
                  : 'Nenhuma ocorrência registrada.',
              textAlign: TextAlign.center,
            ),
          ),
        for (final i in list)
          IncidentTile(incident: i, showChild: i.childId != child.id),
      ],
    );
  }
}

class _PersonRow extends StatelessWidget {
  const _PersonRow({required this.person, this.contact = true});

  final Person person;

  /// Botões de WhatsApp e ligar: só para a equipe falar com a família.
  final bool contact;

  Future<void> _open(BuildContext context, Uri? uri) async {
    if (uri == null ||
        !await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      if (context.mounted)
        showInfo(context, 'Não foi possível abrir o contato.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final msg =
        'Olá! Aqui é do ministério infantil. Podemos falar sobre seu(sua) filho(a)?';
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: PersonAvatar(name: person.fullName),
      title: Text(person.fullName),
      subtitle: Text(
        person.expired
            ? '${person.relation} · autorização vencida'
            : person.relation,
      ),
      trailing:
          !contact
              ? null
              : Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (person.whatsapp)
                    IconButton(
                      tooltip: 'WhatsApp',
                      icon: const Icon(Icons.chat_outlined),
                      onPressed:
                          () => _open(context, whatsappUri(person.phone, msg)),
                    ),
                  IconButton(
                    tooltip: 'Ligar',
                    icon: const Icon(Icons.call_outlined),
                    onPressed:
                        () => _open(
                          context,
                          Uri(scheme: 'tel', path: person.phone),
                        ),
                  ),
                ],
              ),
    );
  }
}

/// Saúde e cuidados: o selo vale para toda a equipe; o detalhe só aparece
/// para quem as regras permitem (coordenação e professor da turma).
class _CareCard extends ConsumerWidget {
  const _CareCard({required this.child});

  final Child child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).user!;
    final care =
        ref.watch(_careProvider((user.churchId, child.id))).valueOrNull;
    if (!child.careAlert && care == null) return const SizedBox.shrink();
    final scheme = Theme.of(context).colorScheme;
    final c = care;

    Widget line(IconData icon, String text) => Padding(
      padding: const EdgeInsets.only(top: AppSpacing.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: scheme.onTertiaryContainer),
          const SizedBox(width: AppSpacing.sm),
          Expanded(child: Text(text)),
        ],
      ),
    );

    return Card(
      color: scheme.tertiaryContainer,
      margin: const EdgeInsets.only(top: AppSpacing.md),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: DefaultTextStyle.merge(
          style: TextStyle(color: scheme.onTertiaryContainer),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.favorite, color: scheme.onTertiaryContainer),
                  const SizedBox(width: AppSpacing.sm),
                  Text(
                    'Atenção — saúde e cuidados',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      color: scheme.onTertiaryContainer,
                    ),
                  ),
                ],
              ),
              if (c == null) ...[
                line(
                  Icons.lock_outline,
                  child.hasMedication
                      ? 'Esta criança tem cuidados especiais e toma medicação. '
                          'Detalhes com a coordenação.'
                      : 'Esta criança tem cuidados especiais. Detalhes com a coordenação.',
                ),
              ] else ...[
                for (final t in c.summary) line(Icons.info_outline, t),
                if (c.communication.isNotEmpty)
                  line(
                    Icons.record_voice_over_outlined,
                    CareProfile.communicationLabels[c.communication] ??
                        c.communication,
                  ),
                if (c.sensitivities.isNotEmpty)
                  line(
                    Icons.hearing_disabled_outlined,
                    'Sensível a: ${c.sensitivities.map((x) => CareProfile.sensitivityLabels[x] ?? x).join(', ')}',
                  ),
                if (c.calming.isNotEmpty)
                  line(Icons.self_improvement, 'Acalma: ${c.calming}'),
                if (c.triggers.isNotEmpty)
                  line(Icons.bolt_outlined, 'Crise: ${c.triggers}'),
                if (c.diet.isNotEmpty) line(Icons.restaurant_outlined, c.diet),
                for (final m in c.medications.where((m) => m.name.isNotEmpty))
                  line(
                    Icons.medication_outlined,
                    '${m.name}${m.dose.isNotEmpty ? ' ${m.dose}' : ''}'
                    '${m.times.isNotEmpty ? ' · ${m.times.join(', ')}' : ''}'
                    '${m.note.isNotEmpty ? ' · ${m.note}' : ''}'
                    ' (${m.staffGives ? 'a equipe dá' : 'só avisar'})',
                  ),
                if (c.emergencyName.isNotEmpty || c.emergencyPhone.isNotEmpty)
                  line(
                    Icons.emergency_outlined,
                    'Emergência: ${[c.emergencyName, c.emergencyPhone].where((x) => x.isNotEmpty).join(' · ')}',
                  ),
                if (c.text.isNotEmpty) line(Icons.notes, c.text),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

final _careProvider = StreamProvider.family<CareProfile?, (String, String)>(
  (ref, key) => ref.watch(familyRepositoryProvider).watchCare(key.$1, key.$2),
);
