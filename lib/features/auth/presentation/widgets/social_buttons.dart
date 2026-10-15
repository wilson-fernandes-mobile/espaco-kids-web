import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/services/local_preferences_service.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/feedback.dart';
import '../providers/auth_providers.dart';
import 'last_used_badge.dart';

/// Entrar com Google (Android e iOS) e com Apple (só iOS/macOS, onde a
/// Apple exige a opção quando há outro login social).
class SocialButtons extends ConsumerStatefulWidget {
  const SocialButtons({super.key});

  @override
  ConsumerState<SocialButtons> createState() => _SocialButtonsState();
}

class _SocialButtonsState extends ConsumerState<SocialButtons> {
  bool _busy = false;

  Future<void> _run(String method, Future<bool> Function() action) async {
    setState(() => _busy = true);
    final prefs = ref.read(sharedPreferencesProvider);
    try {
      if (await action()) await prefs.setString(lastLoginMethodKey, method);
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final repo = ref.read(authRepositoryProvider);
    final last = ref
        .read(sharedPreferencesProvider)
        .getString(lastLoginMethodKey);
    final apple =
        defaultTargetPlatform == TargetPlatform.iOS ||
        defaultTargetPlatform == TargetPlatform.macOS;
    return Column(
      children: [
        Row(
          children: [
            const Expanded(child: Divider()),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
              child: Text('ou', style: Theme.of(context).textTheme.bodySmall),
            ),
            const Expanded(child: Divider()),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        LastUsedBadge(
          show: last == 'google',
          child: SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed:
                  _busy ? null : () => _run('google', repo.signInWithGoogle),
              icon: const Text(
                'G',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
              ),
              label: const Text('Continuar com Google'),
            ),
          ),
        ),
        if (apple) ...[
          const SizedBox(height: AppSpacing.md),
          LastUsedBadge(
            show: last == 'apple',
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed:
                    _busy ? null : () => _run('apple', repo.signInWithApple),
                icon: const Icon(Icons.apple),
                label: const Text('Continuar com Apple'),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
