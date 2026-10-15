import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/date_format.dart';
import '../../../../shared/widgets/photo_field.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../kids/domain/entities/child.dart';
import '../../data/family_repository.dart';
import '../providers/family_providers.dart';

/// Controladores e validação dos campos de uma criança.
class ChildFormController {
  ChildFormController({Child? child, String health = ''})
    : name = TextEditingController(text: child?.fullName),
      nickname = TextEditingController(text: child?.nickname),
      health = TextEditingController(text: health),
      notes = TextEditingController(text: child?.notes),
      birth = child?.birthDate.isNotEmpty == true ? child!.birthDate : null,
      photo = child?.photoUrl;

  final TextEditingController name;
  final TextEditingController nickname;
  final TextEditingController health;
  final TextEditingController notes;

  /// Data ISO (aaaa-mm-dd).
  String? birth;

  /// Foto (data URL); vazio = removida.
  String? photo;

  bool get hasName => name.text.trim().length >= 2;

  ChildDraft? draft() =>
      !hasName || birth == null
          ? null
          : ChildDraft(
            fullName: name.text,
            nickname: nickname.text,
            birthDate: birth!,
            health: health.text,
            notes: notes.text,
            photoUrl: photo,
          );

  void dispose() {
    name.dispose();
    nickname.dispose();
    health.dispose();
    notes.dispose();
  }
}

/// Campos de cadastro de uma criança (nome, apelido, nascimento, saúde, observações).
class ChildFormFields extends StatefulWidget {
  const ChildFormFields({super.key, required this.controller});

  final ChildFormController controller;

  @override
  State<ChildFormFields> createState() => _ChildFormFieldsState();
}

class _ChildFormFieldsState extends State<ChildFormFields> {
  Future<void> _pickDate() async {
    final now = DateTime.now();
    final current = DateTime.tryParse(widget.controller.birth ?? '');
    final d = await showDatePicker(
      context: context,
      initialDate: current ?? DateTime(now.year - 5, now.month, now.day),
      firstDate: DateTime(now.year - 18),
      lastDate: now,
      helpText: 'Data de nascimento',
    );
    if (d != null) {
      setState(
        () => widget.controller.birth = d.toIso8601String().substring(0, 10),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.controller;
    return Column(
      children: [
        Center(
          child: PhotoField(
            name: c.name.text,
            photo: c.photo,
            radius: 44,
            onChanged: (p) => setState(() => c.photo = p ?? ''),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        TextFormField(
          controller: c.name,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(labelText: 'Nome da criança'),
          validator:
              (v) => (v ?? '').trim().length < 2 ? 'Informe o nome' : null,
        ),
        const SizedBox(height: AppSpacing.md),
        TextFormField(
          controller: c.nickname,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(
            labelText: 'Como ela é chamada (opcional)',
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        FormField<String>(
          validator:
              (_) => c.birth == null ? 'Informe a data de nascimento' : null,
          builder:
              (state) => InkWell(
                onTap: () async {
                  await _pickDate();
                  state.didChange(c.birth);
                },
                child: InputDecorator(
                  decoration: InputDecoration(
                    labelText: 'Data de nascimento',
                    errorText: state.errorText,
                    suffixIcon: const Icon(Icons.calendar_today_outlined),
                  ),
                  child: Text(
                    c.birth == null
                        ? 'Toque para escolher'
                        : '${shortDate(c.birth)} · ${ageLabel(c.birth)}',
                  ),
                ),
              ),
        ),
        const SizedBox(height: AppSpacing.md),
        TextFormField(
          controller: c.health,
          maxLines: 2,
          decoration: const InputDecoration(
            labelText: 'Alergias ou cuidados de saúde (opcional)',
            helperText: 'Só a coordenação do ministério infantil vê',
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        TextFormField(
          controller: c.notes,
          maxLines: 2,
          decoration: const InputDecoration(
            labelText: 'Observações (opcional)',
          ),
        ),
      ],
    );
  }
}

/// Adiciona ou edita uma criança da própria família. Devolve `true` se salvou.
Future<bool> showChildSheet(BuildContext context, {Child? child}) async {
  final r = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _ChildSheet(child: child),
  );
  return r == true;
}

class _ChildSheet extends ConsumerStatefulWidget {
  const _ChildSheet({this.child});

  final Child? child;

  @override
  ConsumerState<_ChildSheet> createState() => _ChildSheetState();
}

class _ChildSheetState extends ConsumerState<_ChildSheet> {
  final _form = GlobalKey<FormState>();
  late final ChildFormController _c = ChildFormController(child: widget.child);
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final child = widget.child;
    if (child != null) {
      final user = ref.read(sessionProvider).user!;
      ref.read(familyRepositoryProvider).healthOf(user.churchId, child.id).then(
        (h) {
          if (mounted && _c.health.text.isEmpty) _c.health.text = h;
        },
      );
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    final draft = _c.draft();
    if (draft == null) return;
    final user = ref.read(sessionProvider).user!;
    final repo = ref.read(familyRepositoryProvider);
    setState(() => _busy = true);
    try {
      if (widget.child == null) {
        await repo.addChild(
          churchId: user.churchId,
          uid: user.uid,
          familyId: user.familyId!,
          draft: draft,
        );
      } else {
        await repo.updateChild(
          churchId: user.churchId,
          childId: widget.child!.id,
          draft: draft,
        );
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.md,
        AppSpacing.lg,
        MediaQuery.viewInsetsOf(context).bottom + AppSpacing.lg,
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _form,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                widget.child == null ? 'Adicionar criança' : 'Editar criança',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: AppSpacing.md),
              ChildFormFields(controller: _c),
              const SizedBox(height: AppSpacing.lg),
              FilledButton(
                onPressed: _busy ? null : _save,
                child:
                    _busy
                        ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                        : const Text('Salvar'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
