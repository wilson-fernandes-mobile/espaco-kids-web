import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../../shared/widgets/form_section_header.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../kids/domain/entities/care_profile.dart';
import '../../../kids/domain/entities/child.dart';
import '../../../kids/presentation/providers/kids_providers.dart';
import '../providers/family_providers.dart';

/// Saúde e cuidados especiais de um filho, preenchido pela família.
/// Tudo é opcional; a informação é vista só pela coordenação e pelo
/// professor da turma, e serve para cuidar melhor da criança.
class CareFormScreen extends ConsumerStatefulWidget {
  const CareFormScreen({super.key, required this.childId});

  final String childId;

  @override
  ConsumerState<CareFormScreen> createState() => _CareFormScreenState();
}

class _CareFormScreenState extends ConsumerState<CareFormScreen> {
  bool _loaded = false;
  bool _busy = false;

  var _conditions = <String>[];
  int _level = 0;
  bool _report = false;
  String _communication = '';
  var _sens = <String>[];
  bool _companion = false;
  bool? _image;
  var _meds = <Medication>[];

  final _other = TextEditingController();
  final _calming = TextEditingController();
  final _triggers = TextEditingController();
  final _allergies = TextEditingController();
  final _diet = TextEditingController();
  final _emName = TextEditingController();
  final _emPhone = TextEditingController();
  final _plan = TextEditingController();
  final _text = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = ref.read(sessionProvider).user!;
    final p =
        await ref
            .read(familyRepositoryProvider)
            .watchCare(user.churchId, widget.childId)
            .first;
    if (!mounted) return;
    final c = p ?? const CareProfile();
    setState(() {
      _conditions = [...c.conditions];
      _level = c.autismLevel;
      _report = c.hasReport;
      _communication = c.communication;
      _sens = [...c.sensitivities];
      _companion = c.needsCompanion;
      _image = c.imageConsent;
      _meds = [...c.medications];
      _other.text = c.otherCondition;
      _calming.text = c.calming;
      _triggers.text = c.triggers;
      _allergies.text = c.allergies;
      _diet.text = c.diet;
      _emName.text = c.emergencyName;
      _emPhone.text = c.emergencyPhone;
      _plan.text = c.healthPlan;
      _text.text = c.text;
      _loaded = true;
    });
  }

  @override
  void dispose() {
    for (final c in [
      _other,
      _calming,
      _triggers,
      _allergies,
      _diet,
      _emName,
      _emPhone,
      _plan,
      _text,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    final user = ref.read(sessionProvider).user!;
    setState(() => _busy = true);
    try {
      await ref
          .read(familyRepositoryProvider)
          .saveCare(
            churchId: user.churchId,
            uid: user.uid,
            childId: widget.childId,
            profile: CareProfile(
              conditions: _conditions,
              autismLevel: _conditions.contains('tea') ? _level : 0,
              otherCondition: _other.text,
              hasReport: _report,
              communication: _communication,
              sensitivities: _sens,
              calming: _calming.text,
              triggers: _triggers.text,
              needsCompanion: _companion,
              allergies: _allergies.text,
              diet: _diet.text,
              medications: _meds,
              emergencyName: _emName.text,
              emergencyPhone: _emPhone.text,
              healthPlan: _plan.text,
              imageConsent: _image,
              text: _text.text,
            ),
          );
      if (mounted) {
        showInfo(context, 'Saúde e cuidados salvos.');
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _chips(
    Map<String, String> options,
    List<String> value,
    void Function(List<String>) onChanged,
  ) => Wrap(
    spacing: AppSpacing.sm,
    runSpacing: AppSpacing.xs,
    children: [
      for (final e in options.entries)
        FilterChip(
          label: Text(e.value),
          selected: value.contains(e.key),
          onSelected:
              (on) => setState(
                () => onChanged(
                  on ? [...value, e.key] : value.where((x) => x != e.key).toList(),
                ),
              ),
        ),
    ],
  );

  Widget _field(
    TextEditingController c,
    String label, {
    String? hint,
    int lines = 1,
    TextInputType? type,
  }) => Padding(
    padding: const EdgeInsets.only(top: AppSpacing.md),
    child: TextField(
      controller: c,
      maxLines: lines,
      keyboardType: type,
      textCapitalization: TextCapitalization.sentences,
      decoration: InputDecoration(labelText: label, hintText: hint),
    ),
  );

  Future<void> _addTime(int i) async {
    final t = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 12, minute: 0),
      helpText: 'Horário do medicamento',
    );
    if (t == null) return;
    final hh = '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
    final m = _meds[i];
    if (m.times.contains(hh)) return;
    setState(() {
      _meds[i] = m.copyWith(times: [...m.times, hh]..sort());
    });
  }

  @override
  Widget build(BuildContext context) {
    Child? child;
    final user = ref.watch(sessionProvider).user!;
    for (final c
        in ref.watch(familyChildrenProvider(user.familyId ?? '')).valueOrNull ??
            const <Child>[]) {
      if (c.id == widget.childId) child = c;
    }
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text('Saúde de ${child?.displayName ?? 'seu filho'}'),
      ),
      body:
          !_loaded
              ? const Center(child: CircularProgressIndicator())
              : ListView(
                padding: const EdgeInsets.all(AppSpacing.md),
                children: [
                  Card(
                    color: scheme.primaryContainer,
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: Text(
                        'Tudo é opcional. Essas informações ajudam a equipe a '
                        'cuidar melhor e só são vistas pela coordenação e pelo '
                        'professor da turma.',
                        style: TextStyle(color: scheme.onPrimaryContainer),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  const FormSectionHeader(
                    icon: Icons.psychology_outlined,
                    title: 'Condições e necessidades',
                  ),
                  _chips(
                    CareProfile.conditionLabels,
                    _conditions,
                    (v) => _conditions = v,
                  ),
                  if (_conditions.contains('tea'))
                    Padding(
                      padding: const EdgeInsets.only(top: AppSpacing.md),
                      child: DropdownButtonFormField<int>(
                        initialValue: _level,
                        decoration: const InputDecoration(
                          labelText: 'Grau de suporte (TEA)',
                        ),
                        items: [
                          for (final e in CareProfile.autismLevels.entries)
                            DropdownMenuItem(value: e.key, child: Text(e.value)),
                        ],
                        onChanged: (v) => setState(() => _level = v ?? 0),
                      ),
                    ),
                  if (_conditions.contains('outra'))
                    _field(_other, 'Qual condição?'),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Tem laudo'),
                    value: _report,
                    onChanged: (v) => setState(() => _report = v),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  const FormSectionHeader(
                    icon: Icons.volunteer_activism_outlined,
                    title: 'Como ajudar no dia a dia',
                  ),
                  Text(
                    'Comunicação',
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Wrap(
                    spacing: AppSpacing.sm,
                    children: [
                      for (final e in CareProfile.communicationLabels.entries)
                        ChoiceChip(
                          label: Text(e.value),
                          selected: _communication == e.key,
                          onSelected:
                              (on) => setState(
                                () => _communication = on ? e.key : '',
                              ),
                        ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    'Sensibilidades',
                    style: Theme.of(context).textTheme.labelLarge,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  _chips(
                    CareProfile.sensitivityLabels,
                    _sens,
                    (v) => _sens = v,
                  ),
                  _field(
                    _calming,
                    'O que acalma',
                    hint: 'Ex.: abraço firme, fone de ouvido, brinquedo favorito',
                    lines: 2,
                  ),
                  _field(
                    _triggers,
                    'O que costuma desencadear crise',
                    hint: 'Ex.: barulho alto, mudança de rotina',
                    lines: 2,
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Precisa de acompanhante'),
                    value: _companion,
                    onChanged: (v) => setState(() => _companion = v),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  const FormSectionHeader(
                    icon: Icons.warning_amber_outlined,
                    title: 'Alergias e alimentação',
                  ),
                  _field(
                    _allergies,
                    'Alergias',
                    hint: 'Alimentar, medicamento, picada…',
                    lines: 2,
                  ),
                  _field(_diet, 'Restrição alimentar'),
                  const SizedBox(height: AppSpacing.lg),
                  const FormSectionHeader(
                    icon: Icons.medication_outlined,
                    title: 'Medicamentos',
                    description:
                        'Se toma remédio no horário do culto, informe aqui.',
                  ),
                  for (var i = 0; i < _meds.length; i++) _medCard(i),
                  OutlinedButton.icon(
                    onPressed:
                        () => setState(() => _meds = [..._meds, const Medication()]),
                    icon: const Icon(Icons.add),
                    label: const Text('Adicionar medicamento'),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  const FormSectionHeader(
                    icon: Icons.local_hospital_outlined,
                    title: 'Emergência e outros',
                  ),
                  _field(_emName, 'Contato de emergência'),
                  _field(_emPhone, 'Telefone do contato', type: TextInputType.phone),
                  _field(_plan, 'Plano de saúde (opcional)'),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Autorizo o uso de imagem'),
                    subtitle: const Text('Fotos e vídeos das atividades'),
                    value: _image ?? false,
                    onChanged: (v) => setState(() => _image = v),
                  ),
                  _field(_text, 'Outras observações de saúde', lines: 2),
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
                  const SizedBox(height: AppSpacing.lg),
                ],
              ),
    );
  }

  Widget _medCard(int i) {
    final m = _meds[i];
    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextFormField(
              key: ValueKey('mn$i${_meds.length}'),
              initialValue: m.name,
              decoration: const InputDecoration(labelText: 'Nome do remédio'),
              onChanged: (v) => _meds[i] = _meds[i].copyWith(name: v),
            ),
            const SizedBox(height: AppSpacing.sm),
            TextFormField(
              key: ValueKey('md$i${_meds.length}'),
              initialValue: m.dose,
              decoration: const InputDecoration(
                labelText: 'Dose',
                hintText: 'Ex.: 10 mg, 5 ml',
              ),
              onChanged: (v) => _meds[i] = _meds[i].copyWith(dose: v),
            ),
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: AppSpacing.sm,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                for (final t in m.times)
                  InputChip(
                    label: Text(t),
                    onDeleted:
                        () => setState(
                          () =>
                              _meds[i] = _meds[i].copyWith(
                                times:
                                    _meds[i].times
                                        .where((x) => x != t)
                                        .toList(),
                              ),
                        ),
                  ),
                ActionChip(
                  avatar: const Icon(Icons.access_time, size: 18),
                  label: const Text('Horário'),
                  onPressed: () => _addTime(i),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            TextFormField(
              key: ValueKey('mo$i${_meds.length}'),
              initialValue: m.note,
              decoration: const InputDecoration(
                labelText: 'Observação',
                hintText: 'Ex.: junto com o lanche',
              ),
              onChanged: (v) => _meds[i] = _meds[i].copyWith(note: v),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('A equipe precisa dar o remédio'),
              subtitle: const Text('Desligado: só avisar a equipe'),
              value: m.staffGives,
              onChanged:
                  (v) => setState(
                    () => _meds[i] = _meds[i].copyWith(staffGives: v),
                  ),
            ),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed:
                    () => setState(
                      () => _meds = [..._meds]..removeAt(i),
                    ),
                icon: const Icon(Icons.delete_outline),
                label: const Text('Remover'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
