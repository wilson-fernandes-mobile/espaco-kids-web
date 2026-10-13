import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/local_preferences_service.dart';

const themeModePrefsKey = 'theme_mode';

/// Preferência de tema do usuário (claro/escuro/sistema), lida do
/// dispositivo ao abrir o app. Quem grava a mudança de volta em
/// SharedPreferences é o `ref.listen` montado em `ChurchApp` — este
/// provider só cuida do estado em memória.
final themeModeProvider = StateProvider<ThemeMode>((ref) {
  final stored = ref
      .watch(sharedPreferencesProvider)
      .getString(themeModePrefsKey);
  return ThemeMode.values.firstWhere(
    (mode) => mode.name == stored,
    orElse: () => ThemeMode.system,
  );
});
