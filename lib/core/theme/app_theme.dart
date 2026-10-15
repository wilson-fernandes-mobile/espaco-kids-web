import 'package:flutter/cupertino.dart' show CupertinoPageTransitionsBuilder;
import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'app_spacing.dart';
import 'app_typography.dart';
import 'theme_color_option.dart';

/// Tema completo do app (claro e escuro), Material 3, com componentes
/// pré-estilizados para manter consistência visual em todas as telas.
class AppTheme {
  const AppTheme._();

  static ThemeData light([
    ThemeColorOption color = ThemeColorOption.original,
  ]) => _build(AppColors.lightScheme(color), color);

  static ThemeData dark([ThemeColorOption color = ThemeColorOption.original]) =>
      _build(AppColors.darkScheme(color), color);

  static ThemeData _build(ColorScheme scheme, ThemeColorOption color) {
    final textTheme = AppTypography.textTheme(scheme.brightness);

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: scheme.surface,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        elevation: 0,
        scrolledUnderElevation: 1,
        centerTitle: false,
        titleTextStyle: textTheme.titleLarge,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color:
            scheme.brightness == Brightness.dark
                ? darkCardSurfaceFor(color)
                : lightCardSurfaceFor(color),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
          side: BorderSide(color: scheme.outlineVariant.withValues(alpha: 0.4)),
        ),
        margin: EdgeInsets.zero,
      ),
      drawerTheme: DrawerThemeData(backgroundColor: scheme.surface),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
        ),
        side: BorderSide.none,
        // `surfaceContainerHighest` não é fixado na paleta (vem cru do
        // `ColorScheme.fromSeed`) — em 100% de opacidade rendia um bloco
        // forte (lido como "azul escuro"). Com alfa fica um tom leve,
        // igual ao resto do app (ver `StatusBadge`).
        backgroundColor: scheme.surfaceContainerHighest.withValues(alpha: 0.4),
        // Mesma lógica pro selecionado: sem isso cai no `secondaryContainer`
        // puro do Material 3, também cru/saturado.
        selectedColor: scheme.primary.withValues(alpha: 0.16),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: scheme.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(AppSpacing.cardRadius),
          ),
        ),
        // Barrinha de "puxar para baixo" no topo — vale para todo
        // `showModalBottomSheet` do app automaticamente, sem precisar
        // passar `showDragHandle: true` em cada chamada.
        showDragHandle: true,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.sm + 4,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
          ),
          textStyle: textTheme.labelLarge,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.sm + 4,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
          ),
          textStyle: textTheme.labelLarge,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor:
            scheme.brightness == Brightness.dark
                ? scheme.surfaceContainerHighest.withValues(alpha: 0.4)
                : AppColors.lightInputFill,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.md,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
          borderSide: BorderSide.none,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: scheme.surface,
        indicatorColor: scheme.primaryContainer,
        elevation: 0,
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: scheme.surface,
        indicatorColor: scheme.primaryContainer,
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: ZoomPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.windows: ZoomPageTransitionsBuilder(),
          TargetPlatform.linux: ZoomPageTransitionsBuilder(),
        },
      ),
    );
  }
}
