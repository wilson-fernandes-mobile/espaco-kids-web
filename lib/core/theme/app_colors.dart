import 'package:flutter/material.dart';

import 'theme_color_option.dart';

/// Paleta oficial do app. Roxo/azul/verde são as cores de marca (usadas em
/// claro e escuro); os dois tons de navy compõem o tema escuro e o cinza
/// claro compõe o tema claro. Nenhuma outra cor deve ser usada nas telas —
/// tudo deriva daqui via [AppTheme] / `Theme.of(context).colorScheme`.
///
/// `primary`/`secondary` podem ser re-tingidos pelo usuário (Configurações >
/// Aparência, ver [ThemeColorOption]) — `success`/`warning`/`danger`
/// permanecem fixos por serem semânticos (status de escala etc.).
class AppColors {
  const AppColors._();

  static const Color primary = Color(0xFF7B4DFF);
  static const Color secondary = Color(0xFF3D7BFF);
  static const Color success = Color(0xFF00C884);

  static const Color warning = Color(0xFFF5A623);
  static const Color danger = Color(0xFFE5484D);

  /// Paleta usada para o círculo de iniciais de quem ainda não tem foto
  /// (ex.: [AvatarStack]) — determinística por pessoa (hash do id), só pra
  /// diferenciar visualmente, sem significado semântico.
  static const List<Color> avatarPalette = [
    primary,
    secondary,
    success,
    warning,
    Color(0xFFEC4899),
    Color(0xFF14B8A6),
  ];

  /// Azul de marca fixo do "G" do Google — exigido pela identidade visual
  /// do provedor de login, não deriva do tema. Só usar no botão de login
  /// com Google.
  static const Color googleBrand = Color(0xFF4285F4);

  static const Color darkSurfaceBackground = Color(0xFF14142B);
  static const Color darkCardSurface = Color(0xFF1E1E3A);

  static const Color lightSurfaceBackground = Color(0xFFF2F4F7);
  static const Color lightCardSurface = Color(0xFFFFFFFF);

  /// Preenchimento de campos de formulário no tema claro. Não pode vir do
  /// `surfaceContainerHighest` derivado do `ColorScheme.fromSeed` (como no
  /// escuro) porque, no claro, esse tom sai quase idêntico ao branco do
  /// [lightCardSurface] — os campos ficavam sem contraste dentro do card.
  static const Color lightInputFill = Color(0xFFE7EAF1);

  /// Cor neutra do label/hint de campo QUANDO NÃO FOCADO (`TextField` usa
  /// `colorScheme.onSurfaceVariant` pra isso por padrão). Precisa ser fixada
  /// pelo mesmo motivo do bloco abaixo: sem isso, `ColorScheme.fromSeed`
  /// deriva esse tom a partir do roxo da marca, e o cinza "contaminado"
  /// sai claramente violeta no tema escuro (mesmo com o campo sem foco).
  static const Color lightOnSurfaceVariant = Color(0xFF5A5F7A);
  static const Color darkOnSurfaceVariant = Color(0xFFA5A8C4);

  // `primary`/`secondary`/`tertiary` são fixados na marca (mesmo tom nos
  // dois temas), então `onPrimary`/`onSecondary`/`onTertiary` também
  // precisam ser fixados junto — sem isso, o `ColorScheme.fromSeed` calcula
  // esses tons "on*" a partir do seed do brightness (que não é mais o tom
  // realmente usado depois do copyWith), e no escuro isso rendia um texto
  // acinzentado sem contraste sobre o gradiente roxo/azul.
  static ColorScheme lightScheme([
    ThemeColorOption color = ThemeColorOption.original,
  ]) {
    final tintedPrimary = primaryColorFor(color);
    return ColorScheme.fromSeed(
      seedColor: tintedPrimary,
      brightness: Brightness.light,
    ).copyWith(
      primary: tintedPrimary,
      onPrimary: Colors.white,
      secondary: secondaryColorFor(color),
      onSecondary: Colors.white,
      tertiary: success,
      onTertiary: Colors.white,
      surface: lightSurfaceBackgroundFor(color),
      onSurfaceVariant: lightOnSurfaceVariant,
    );
  }

  static ColorScheme darkScheme([
    ThemeColorOption color = ThemeColorOption.original,
  ]) {
    final tintedPrimary = primaryColorFor(color);
    return ColorScheme.fromSeed(
      seedColor: tintedPrimary,
      brightness: Brightness.dark,
    ).copyWith(
      primary: tintedPrimary,
      onPrimary: Colors.white,
      secondary: secondaryColorFor(color),
      onSecondary: Colors.white,
      tertiary: success,
      onTertiary: Colors.white,
      surface: darkSurfaceBackgroundFor(color),
      onSurfaceVariant: darkOnSurfaceVariant,
    );
  }
}
