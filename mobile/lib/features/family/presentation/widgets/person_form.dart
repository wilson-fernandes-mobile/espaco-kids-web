import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../kids/domain/entities/child.dart';
import '../../../kids/domain/entities/person.dart';
import '../providers/family_providers.dart';

/// Inclui um responsável ou uma pessoa autorizada a buscar as crianças.
Future<bool> showPersonSheet(
  BuildContext context, {
  required List<Child> children,
}) async {
  final r = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _PersonSheet(children: children),
  );
  return r == true;
}

class _PersonSheet extends ConsumerStatefulWidget {
  const _PersonSheet({required this.children});

  final List<Child> children;

  @override
  ConsumerState<_PersonSheet> createState() => _PersonSheetState();
}

class _PersonSheetState extends ConsumerState<_PersonSheet> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _relation = TextEditingController();
  PersonKind _kind = PersonKind.authorized;
  bool _whatsapp = true;
  DateTime? _until;
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _relation.dispose();
    super.dispose();
  }

  Future<void> _pickUntil() async {
    final now = DateTime.now();
    final d = await showDatePicker(
      context: context,
      initialDate: _until ?? now.add(const Duration(days: 30)),
      firstDate: now,
      lastDate: DateTime(now.year + 5),
      helpText: 'Autorizado até',
    );
    if (d != null) setState(() => _until = d);
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    final user = ref.read(sessionProvider).user!;
    setState(() => _busy = true);
    try {
      await ref
          .read(familyRepositoryProvider)
          .addPerson(
            churchId: user.churchId,
            familyId: user.familyId!,
            kind: _kind,
            fullName: _name.text,
            phone: _phone.text.trim(),
            relation: _relation.text,
            whatsapp: _whatsapp,
            validUntil: _until?.toIso8601String().substring(0, 10),
            children: widget.children,
          );
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final guardian = _kind == PersonKind.guardian;
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
                'Adicionar pessoa',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: AppSpacing.md),
              SegmentedButton<PersonKind>(
                segments: const [
                  ButtonSegment(
                    value: PersonKind.authorized,
                    label: Text('Pode buscar'),
                  ),
                  ButtonSegment(
                    value: PersonKind.guardian,
                    label: Text('Responsável'),
                  ),
                ],
                selected: {_kind},
                onSelectionChanged: (s) => setState(() => _kind = s.first),
              ),
              const SizedBox(height: AppSpacing.md),
              TextFormField(
                controller: _name,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(labelText: 'Nome completo'),
                validator:
                    (v) =>
                        (v ?? '').trim().length < 3 ? 'Informe o nome' : null,
              ),
              const SizedBox(height: AppSpacing.md),
              TextFormField(
                controller: _relation,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  labelText: 'Parentesco',
                  hintText: guardian ? 'Pai, mãe, avó…' : 'Tio, vizinha, avô…',
                ),
                validator:
                    (v) =>
                        (v ?? '').trim().isEmpty
                            ? 'Informe o parentesco'
                            : null,
              ),
              const SizedBox(height: AppSpacing.md),
              TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Telefone'),
                validator:
                    (v) =>
                        (v ?? '').replaceAll(RegExp(r'\D'), '').length < 10
                            ? 'Informe o telefone com DDD'
                            : null,
              ),
              if (guardian)
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Tem WhatsApp neste número'),
                  value: _whatsapp,
                  onChanged: (v) => setState(() => _whatsapp = v),
                )
              else ...[
                const SizedBox(height: AppSpacing.md),
                InkWell(
                  onTap: _pickUntil,
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'Autorizado até (opcional)',
                      suffixIcon: Icon(Icons.calendar_today_outlined),
                    ),
                    child: Text(
                      _until == null
                          ? 'Sem data limite'
                          : '${_until!.day.toString().padLeft(2, '0')}/'
                              '${_until!.month.toString().padLeft(2, '0')}/${_until!.year}',
                    ),
                  ),
                ),
              ],
              const SizedBox(height: AppSpacing.sm),
              Text(
                widget.children.isEmpty
                    ? 'Cadastre uma criança para liberar a retirada.'
                    : 'Vale para todos os seus filhos.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
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
