import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Instância de [SharedPreferences], inicializada em `main.dart` antes do
/// `runApp` e sobrescrita via [ProviderScope.overrides]. Nenhum outro lugar
/// do app deve chamar `SharedPreferences.getInstance()` diretamente.
final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError(
    'sharedPreferencesProvider must be overridden in main.dart',
  );
});
