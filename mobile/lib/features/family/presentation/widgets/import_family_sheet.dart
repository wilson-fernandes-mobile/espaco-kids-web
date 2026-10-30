import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/date_format.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../kids/domain/entities/child.dart';
import '../../../tenant/domain/church_membership.dart';
import '../../../tenant/presentation/providers/tenant_providers.dart';
import '../providers/family_providers.dart';

/// Outras igrejas em que a pessoa já tem família cadastrada.
List<ChurchMembership> importableChurches(
  List<ChurchMembership> all,
  String currentChurchId,
) =>
    all
        .where(
          (m) =>
              m.churchId != currentChurchId &&
              m.familyId != null &&
              m.familyId!.isNotEmpty,
        )
        .toList();

/// Leva os filhos (com responsáveis e autorizados) de outra igreja para esta.
Future<bool> showImportFamilySheet(BuildContext context) async {
  final r = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => const _ImportSheet(),
  );
  return r == true;
}

class _ImportSheet extends ConsumerStatefulWidget {
  const _ImportSheet();

  @override
  ConsumerState<_ImportSheet> createState() => _ImportSheetState();
}

class _ImportSheetState extends ConsumerState<_ImportSheet> {
  ChurchMembership? _from;
  List<Child>? _kids;
  final _picked = <String>{};
  bool _health = false;
  bool _busy = false;

  Future<void> _choose(ChurchMembership m) async {
    setState(() {
      _from = m;
      _kids = null;
      _picked.clear();
    });
    try {
      final kids = await ref
          .read(familyRepositoryProvider)
          .childrenIn(m.churchId, m.familyId!);
      if (!mounted) return;
      setState(() {
        _kids = kids;
        _picked.addAll(kids.map((c) => c.id));
      });
    } catch (e) {
      if (mounted) showError(context, e);
    }
  }

  Future<void> _import() async {
    final user = ref.read(sessionProvider).user!;
    setState(() => _busy = true);
    try {
      final n = await ref
          .read(familyRepositoryProvider)
          .importFamily(
            fromChurchId: _from!.churchId,
            toChurchId: user.churchId,
            childIds: _picked.toList(),
            includeHealth: _health,
          );
      if (!mounted) return;
      Navigator.pop(context, true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            n == 0
                ? 'Esses filhos já estavam aqui.'
                : '$n ${n == 1 ? 'filho importado' : 'filhos importados'}.',
          ),
        ),
      );
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionProvider).user!;
    final churches = importableChurches(
      ref.watch(membershipsProvider).valueOrNull ?? const [],
      user.churchId,
    );
    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.lg,
        AppSpacing.md,
        AppSpacing.lg,
        MediaQuery.of(context).viewInsets.bottom + AppSpacing.lg,
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Importar de outra igreja',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: AppSpacing.xs),
            const Text(
              'Copia seus filhos e as pessoas autorizadas a buscá-los. '
              'Quem é da sua família e usa o app entra sozinho, sem código.',
            ),
            const SizedBox(height: AppSpacing.md),
            if (churches.isEmpty)
              const Text('Você não tem família cadastrada em outra igreja.')
            else
              for (final m in churches)
                RadioListTile<String>(
                  contentPadding: EdgeInsets.zero,
                  value: m.churchId,
                  groupValue: _from?.churchId,
                  title: Text(m.churchName),
                  onChanged: _busy ? null : (_) => _choose(m),
                ),
            if (_from != null && _kids == null)
              const Padding(
                padding: EdgeInsets.all(AppSpacing.md),
                child: Center(child: CircularProgressIndicator()),
              ),
            if (_kids != null) ...[
              const Divider(),
              if (_kids!.isEmpty)
                const Text('Nenhum filho cadastrado lá.')
              else
                for (final c in _kids!)
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    value: _picked.contains(c.id),
                    title: Text(c.displayName),
                    subtitle: Text(ageLabel(c.birthDate)),
                    onChanged:
                        _busy
                            ? null
                            : (v) => setState(
                              () =>
                                  v == true
                                      ? _picked.add(c.id)
                                      : _picked.remove(c.id),
                            ),
                  ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Levar também saúde e cuidados'),
                subtitle: const Text(
                  'Alergias, medicação, TEA/TDAH etc. Dado sensível: '
                  'só ative se quiser que esta igreja veja.',
                ),
                value: _health,
                onChanged: _busy ? null : (v) => setState(() => _health = v),
              ),
              const SizedBox(height: AppSpacing.sm),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _busy || _picked.isEmpty ? null : _import,
                  child:
                      _busy
                          ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                          : const Text('Importar'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
