import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/local_preferences_service.dart';
import 'theme_color_option.dart';

const themeColorPrefsKey = 'theme_color';

/// Cor de tema escolhida pelo usuário em Configurações > Aparência, lida do
/// dispositivo ao abrir o app. Quem grava a mudança de volta em
/// SharedPreferences é o `ref.listen` montado em `ChurchApp` — mesmo padrão
/// de `themeModeProvider`.
final themeColorProvider = StateProvider<ThemeColorOption>((ref) {
  final stored = ref
      .watch(sharedPreferencesProvider)
      .getString(themeColorPrefsKey);
  return ThemeColorOption.fromName(stored);
});
