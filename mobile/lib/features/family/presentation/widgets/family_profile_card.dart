import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../../shared/widgets/person_avatar.dart';
import '../../../../shared/widgets/photo_field.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../providers/family_providers.dart';

/// Cartão "Minha família": mostra o nome e a foto e deixa a família trocar os
/// dois (a foto é opcional).
class FamilyProfileCard extends ConsumerWidget {
  const FamilyProfileCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(sessionProvider).user!;
    if (user.familyId == null) return const SizedBox.shrink();
    final profile =
        ref
            .watch(familyProfileProvider((user.churchId, user.familyId!)))
            .valueOrNull;
    final name = profile?.name ?? 'Minha família';
    final scheme = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.xs,
        ),
        leading: PersonAvatar(
          name: name,
          photo: profile?.photoUrl,
          radius: 24,
          viewable: true,
        ),
        title: Text(name, style: Theme.of(context).textTheme.titleMedium),
        subtitle: Text(
          'Toque no lápis para mudar o nome ou a foto',
          style: TextStyle(color: scheme.onSurfaceVariant),
        ),
        trailing: IconButton(
          tooltip: 'Editar família',
          icon: const Icon(Icons.edit_outlined),
          onPressed:
              () => _edit(context, ref, name, profile?.photoUrl, user.churchId,
                  user.familyId!),
        ),
      ),
    );
  }

  Future<void> _edit(
    BuildContext context,
    WidgetRef ref,
    String name,
    String? photo,
    String churchId,
    String familyId,
  ) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder:
          (ctx) => _EditSheet(
            name: name,
            photo: photo,
            onSave: (n, p) => ref
                .read(familyRepositoryProvider)
                .updateFamilyProfile(
                  churchId: churchId,
                  familyId: familyId,
                  name: n,
                  photoUrl: p,
                ),
          ),
    );
  }
}

class _EditSheet extends StatefulWidget {
  const _EditSheet({
    required this.name,
    required this.photo,
    required this.onSave,
  });

  final String name;
  final String? photo;

  /// `photo`: null mantém, vazio remove, senão é a foto nova (data URL).
  final Future<void> Function(String name, String? photo) onSave;

  @override
  State<_EditSheet> createState() => _EditSheetState();
}

class _EditSheetState extends State<_EditSheet> {
  late final _name = TextEditingController(text: widget.name);
  late String? _photo = widget.photo;
  bool _photoChanged = false;
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _busy = true);
    try {
      await widget.onSave(
        _name.text,
        _photoChanged ? (_photo ?? '') : null,
      );
      if (mounted) Navigator.pop(context);
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
        AppSpacing.md,
        0,
        AppSpacing.md,
        MediaQuery.of(context).viewInsets.bottom + AppSpacing.md,
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Minha família',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: AppSpacing.md),
            Center(
              child: PhotoField(
                name: _name.text.isEmpty ? widget.name : _name.text,
                photo: _photo,
                radius: 44,
                onChanged:
                    (p) => setState(() {
                      _photo = p;
                      _photoChanged = true;
                    }),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            TextField(
              controller: _name,
              textCapitalization: TextCapitalization.words,
              maxLength: 60,
              decoration: const InputDecoration(
                labelText: 'Nome da família',
                prefixIcon: Icon(Icons.family_restroom_outlined),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            FilledButton(
              onPressed: _busy ? null : _save,
              child: const Text('Salvar'),
            ),
          ],
        ),
      ),
    );
  }
}
