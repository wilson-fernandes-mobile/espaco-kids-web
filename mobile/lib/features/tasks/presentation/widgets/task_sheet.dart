import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../domain/entities/class_task.dart';
import '../providers/tasks_providers.dart';

const _maxLinks = 5;
final _urlRe = RegExp(r'^https?://\S+\.\S+', caseSensitive: false);

/// Formulário de tarefa (nova ou edição) para uma turma.
Future<void> showTaskSheet(
  BuildContext context, {
  required String classId,
  required String className,
  ClassTask? editing,
}) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  builder:
      (_) =>
          _TaskForm(classId: classId, className: className, editing: editing),
);

typedef _LinkFields =
    ({TextEditingController label, TextEditingController url});

class _TaskForm extends ConsumerStatefulWidget {
  const _TaskForm({
    required this.classId,
    required this.className,
    this.editing,
  });

  final String classId;
  final String className;
  final ClassTask? editing;

  @override
  ConsumerState<_TaskForm> createState() => _TaskFormState();
}

class _TaskFormState extends ConsumerState<_TaskForm> {
  late final _title = TextEditingController(text: widget.editing?.title ?? '');
  late final _desc = TextEditingController(
    text: widget.editing?.description ?? '',
  );
  late String _due = widget.editing?.dueDate ?? '';
  late final List<_LinkFields> _links = [
    for (final l in widget.editing?.links ?? const <TaskLink>[])
      (
        label: TextEditingController(text: l.label),
        url: TextEditingController(text: l.url),
      ),
  ];
  bool _busy = false;
  bool _tried = false;

  @override
  void dispose() {
    _title.dispose();
    _desc.dispose();
    for (final l in _links) {
      l.label.dispose();
      l.url.dispose();
    }
    super.dispose();
  }

  /// Linhas em branco são ignoradas.
  List<TaskLink> get _filled => [
    for (final l in _links)
      if (l.url.text.trim().isNotEmpty || l.label.text.trim().isNotEmpty)
        TaskLink(label: l.label.text.trim(), url: l.url.text.trim()),
  ];

  bool get _linksOk => _filled.every((l) => _urlRe.hasMatch(l.url));

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: DateTime.tryParse(_due) ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 2),
    );
    if (d != null) setState(() => _due = DateFormat('yyyy-MM-dd').format(d));
  }

  Future<void> _save() async {
    setState(() => _tried = true);
    if (_title.text.trim().length < 3 || !_linksOk) return;
    final user = ref.read(sessionProvider).user!;
    final repo = ref.read(tasksRepositoryProvider);
    setState(() => _busy = true);
    try {
      final e = widget.editing;
      if (e == null) {
        await repo.create(
          classId: widget.classId,
          className: widget.className,
          title: _title.text,
          description: _desc.text,
          dueDate: _due,
          links: _filled,
          authorId: user.uid,
          authorName: user.name,
        );
      } else {
        await repo.update(
          e,
          title: _title.text,
          description: _desc.text,
          dueDate: _due,
          links: _filled,
          uid: user.uid,
          userName: user.name,
        );
      }
      if (mounted) {
        Navigator.pop(context);
        showInfo(
          context,
          e == null
              ? 'Tarefa criada. As famílias foram avisadas.'
              : 'Tarefa salva.',
        );
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
    final scheme = Theme.of(context).colorScheme;
    final editing = widget.editing != null;
    final due = DateTime.tryParse(_due);
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        shrinkWrap: true,
        children: [
          Text(
            editing ? 'Editar tarefa' : 'Nova tarefa',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            editing
                ? 'As famílias veem a versão atualizada.'
                : 'As famílias da turma recebem um aviso.',
            style: TextStyle(color: scheme.onSurfaceVariant),
          ),
          const SizedBox(height: AppSpacing.md),
          TextField(
            controller: _title,
            maxLength: 100,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: 'Título',
              errorText:
                  _tried && _title.text.trim().length < 3
                      ? 'Informe o título'
                      : null,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          TextField(
            controller: _desc,
            maxLength: 2000,
            minLines: 3,
            maxLines: 6,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(
              labelText: 'O que fazer (opcional)',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _pickDate,
                  icon: const Icon(Icons.event_outlined),
                  label: Text(
                    due == null
                        ? 'Data de entrega (opcional)'
                        : 'Entrega ${DateFormat('dd/MM/yyyy').format(due)}',
                  ),
                ),
              ),
              if (due != null)
                IconButton(
                  tooltip: 'Tirar a data',
                  icon: const Icon(Icons.close),
                  onPressed: () => setState(() => _due = ''),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'Links para baixar documento ou imagem (opcional)',
            style: Theme.of(context).textTheme.titleSmall,
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            'Cole o link do arquivo (Drive, Dropbox, site). Deixe o '
            'compartilhamento como "qualquer pessoa com o link".',
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
          ),
          const SizedBox(height: AppSpacing.sm),
          for (var i = 0; i < _links.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 2,
                    child: TextField(
                      controller: _links[i].label,
                      maxLength: 60,
                      decoration: const InputDecoration(
                        labelText: 'Nome',
                        counterText: '',
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    flex: 3,
                    child: TextField(
                      controller: _links[i].url,
                      keyboardType: TextInputType.url,
                      autocorrect: false,
                      decoration: const InputDecoration(labelText: 'https://…'),
                    ),
                  ),
                  IconButton(
                    tooltip: 'Remover link',
                    icon: const Icon(Icons.close),
                    onPressed:
                        () => setState(() {
                          final l = _links.removeAt(i);
                          l.label.dispose();
                          l.url.dispose();
                        }),
                  ),
                ],
              ),
            ),
          if (_tried && !_linksOk)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.sm),
              child: Text(
                'Use links completos, começando com https://',
                style: TextStyle(color: scheme.error),
              ),
            ),
          if (_links.length < _maxLinks)
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed:
                    () => setState(
                      () => _links.add((
                        label: TextEditingController(),
                        url: TextEditingController(),
                      )),
                    ),
                icon: const Icon(Icons.add),
                label: const Text('Adicionar link'),
              ),
            ),
          const SizedBox(height: AppSpacing.md),
          FilledButton(
            onPressed: _busy ? null : _save,
            child: Text(editing ? 'Salvar' : 'Criar e avisar famílias'),
          ),
        ],
      ),
    );
  }
}
