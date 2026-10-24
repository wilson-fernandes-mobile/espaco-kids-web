import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../kids/domain/entities/child.dart';
import '../../../kids/presentation/providers/kids_providers.dart';
import '../../domain/entities/incident.dart';
import '../providers/incidents_providers.dart';

/// Abre o formulário de ocorrência (nova ou edição). Com [fixedChild], a
/// criança já vem escolhida.
Future<void> showIncidentSheet(
  BuildContext context, {
  Child? fixedChild,
  Incident? editing,
}) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  builder: (_) => _IncidentForm(fixedChild: fixedChild, editing: editing),
);

class _IncidentForm extends ConsumerStatefulWidget {
  const _IncidentForm({this.fixedChild, this.editing});

  final Child? fixedChild;
  final Incident? editing;

  @override
  ConsumerState<_IncidentForm> createState() => _IncidentFormState();
}

class _IncidentFormState extends ConsumerState<_IncidentForm> {
  late final _text = TextEditingController(text: widget.editing?.text ?? '');
  late String _kind = widget.editing?.kind ?? 'comportamento';
  late String? _childId = widget.editing?.childId ?? widget.fixedChild?.id;
  late final Set<String> _others = {...?widget.editing?.involvedChildIds};
  late bool _shared = widget.editing?.sharedWithFamily ?? false;
  bool _busy = false;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _pickOthers(List<Child> kids) async {
    final chosen = {..._others};
    // Só quem está na sala com a criança agora (mesma turma e presente);
    // mantém as já marcadas, para não perder ao editar.
    final classId = kids.where((k) => k.id == _childId).firstOrNull?.classId;
    final present = ref.read(presentIdsProvider);
    final options =
        kids
            .where(
              (k) =>
                  k.id != _childId &&
                  (_others.contains(k.id) ||
                      (k.classId == classId && present.contains(k.id))),
            )
            .toList();
    final ok = await showDialog<bool>(
      context: context,
      builder:
          (c) => StatefulBuilder(
            builder:
                (c, setS) => AlertDialog(
                  title: const Text('Outras crianças envolvidas'),
                  content: SizedBox(
                    width: double.maxFinite,
                    child: ListView(
                      shrinkWrap: true,
                      children: [
                        if (options.isEmpty)
                          const Padding(
                            padding: EdgeInsets.all(AppSpacing.sm),
                            child: Text(
                              'Nenhuma outra criança na sala com ela agora.',
                            ),
                          ),
                        for (final k in options)
                          CheckboxListTile(
                            dense: true,
                            value: chosen.contains(k.id),
                            title: Text(k.fullName),
                            onChanged:
                                (v) => setS(() {
                                  if (v == true) {
                                    chosen.add(k.id);
                                  } else {
                                    chosen.remove(k.id);
                                  }
                                }),
                          ),
                      ],
                    ),
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(c, false),
                      child: const Text('Cancelar'),
                    ),
                    FilledButton(
                      onPressed: () => Navigator.pop(c, true),
                      child: const Text('Pronto'),
                    ),
                  ],
                ),
          ),
    );
    if (ok == true) {
      setState(() {
        _others
          ..clear()
          ..addAll(chosen);
      });
    }
  }

  Future<void> _save(List<Child> kids) async {
    final child = kids.where((k) => k.id == _childId).firstOrNull;
    if (child == null || _text.text.trim().length < 3) return;
    final user = ref.read(sessionProvider).user!;
    final repo = ref.read(incidentsRepositoryProvider);
    setState(() => _busy = true);
    try {
      final e = widget.editing;
      if (e == null) {
        await repo.create(
          child: child,
          kind: _kind,
          text: _text.text,
          sharedWithFamily: _shared,
          involvedChildIds: _others.toList(),
          authorId: user.uid,
          authorName: user.name,
        );
      } else {
        await repo.update(
          e,
          child: child,
          kind: _kind,
          text: _text.text,
          sharedWithFamily: _shared,
          involvedChildIds: _others.toList(),
          uid: user.uid,
          userName: user.name,
        );
      }
      if (mounted) {
        Navigator.pop(context);
        showInfo(context, 'Ocorrência salva.');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _busy = false);
        showError(context, e);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final kids =
        (ref.watch(childrenProvider).valueOrNull ?? const <Child>[])
            .where((k) => k.status != 'inativo')
            .toList()
          ..sort((a, b) => a.fullName.compareTo(b.fullName));
    final names = {for (final k in kids) k.id: k.displayName};
    final locked = widget.fixedChild != null || widget.editing != null;

    return Padding(
      padding: EdgeInsets.only(
        left: AppSpacing.md,
        right: AppSpacing.md,
        top: AppSpacing.md,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.md,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              widget.editing == null
                  ? 'Registrar ocorrência'
                  : 'Editar ocorrência',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Por padrão, só a equipe vê.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: AppSpacing.md),
            DropdownButtonFormField<String>(
              value: kids.any((k) => k.id == _childId) ? _childId : null,
              decoration: const InputDecoration(labelText: 'Criança'),
              isExpanded: true,
              items: [
                for (final k in kids)
                  DropdownMenuItem(value: k.id, child: Text(k.fullName)),
              ],
              onChanged:
                  locked
                      ? null
                      : (v) => setState(() {
                        _childId = v;
                        _others.clear();
                      }),
            ),
            const SizedBox(height: AppSpacing.sm),
            DropdownButtonFormField<String>(
              value: _kind,
              decoration: const InputDecoration(labelText: 'Tipo'),
              items: [
                for (final e in Incident.kinds.entries)
                  DropdownMenuItem(value: e.key, child: Text(e.value)),
              ],
              onChanged: (v) => setState(() => _kind = v ?? _kind),
            ),
            const SizedBox(height: AppSpacing.sm),
            OutlinedButton.icon(
              onPressed: _childId == null ? null : () => _pickOthers(kids),
              icon: const Icon(Icons.group_add_outlined),
              label: Text(
                _others.isEmpty
                    ? 'Outras crianças envolvidas (opcional)'
                    : _others.map((id) => names[id] ?? '—').join(', '),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            TextField(
              controller: _text,
              maxLines: 4,
              maxLength: 1000,
              textCapitalization: TextCapitalization.sentences,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                labelText: 'O que aconteceu',
                alignLabelWithHint: true,
              ),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Enviar aos pais'),
              subtitle: const Text(
                'A família vê o tipo e o texto no app e recebe um aviso. '
                'Não cite outras crianças no texto.',
              ),
              value: _shared,
              onChanged: (v) => setState(() => _shared = v),
            ),
            const SizedBox(height: AppSpacing.sm),
            FilledButton(
              onPressed:
                  _busy || _childId == null || _text.text.trim().length < 3
                      ? null
                      : () => _save(kids),
              child: const Text('Salvar'),
            ),
          ],
        ),
      ),
    );
  }
}
