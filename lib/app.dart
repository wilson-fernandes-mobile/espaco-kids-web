import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/push/push_service.dart';
import 'core/router/app_router.dart';
import 'core/services/local_preferences_service.dart';
import 'features/tenant/presentation/providers/tenant_providers.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_color_option.dart';
import 'core/theme/theme_color_provider.dart';
import 'core/theme/theme_mode_provider.dart';

class EspacoKidsApp extends ConsumerWidget {
  const EspacoKidsApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeProvider);
    // A pessoa pode escolher a própria cor (Perfil); com "Original" vale a cor da igreja.
    final own = ref.watch(themeColorProvider);
    final church = ref.watch(churchThemeColorProvider).valueOrNull;
    final color =
        own != ThemeColorOption.original
            ? own
            : (church ?? ThemeColorOption.original);
    ref.watch(pushRegistrationProvider);

    // Persiste as escolhas de aparência no aparelho.
    ref.listen(themeModeProvider, (_, next) {
      ref
          .read(sharedPreferencesProvider)
          .setString(themeModePrefsKey, next.name);
    });
    ref.listen(themeColorProvider, (_, next) {
      ref
          .read(sharedPreferencesProvider)
          .setString(themeColorPrefsKey, next.name);
    });

    return MaterialApp.router(
      title: 'Espaço Kids',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(color),
      darkTheme: AppTheme.dark(color),
      themeMode: mode,
      routerConfig: ref.watch(routerProvider),
      locale: const Locale('pt', 'BR'),
      supportedLocales: const [Locale('pt', 'BR')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}
