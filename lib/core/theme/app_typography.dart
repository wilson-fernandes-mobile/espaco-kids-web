import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Tipografia baseada em Inter — sans-serif neutra e altamente legível,
/// mesma linha do que Notion/Linear usam para UI densa em informação.
class AppTypography {
  const AppTypography._();

  static TextTheme textTheme(Brightness brightness) {
    final base = GoogleFonts.interTextTheme(
      brightness == Brightness.dark
          ? ThemeData.dark().textTheme
          : ThemeData.light().textTheme,
    );

    return base.copyWith(
      headlineSmall: base.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
      titleLarge: base.titleLarge?.copyWith(fontWeight: FontWeight.w600),
      titleMedium: base.titleMedium?.copyWith(fontWeight: FontWeight.w600),
      labelLarge: base.labelLarge?.copyWith(fontWeight: FontWeight.w600),
    );
  }
}
