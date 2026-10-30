import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Cor de tema selecionável pelo usuário em Configurações > Aparência. Tinge
/// `primary`/`secondary` do `ColorScheme` nos dois brightness — `success`/
/// `warning`/`danger` (semânticos, ex. status de escala) nunca mudam.
enum ThemeColorOption {
  original,
  verde,
  azul,
  laranja,
  vermelho,
  lilas,
  roxo,
  rosa,
  ciano,
  turquesa,
  dourado,
  grafite,
  indigo,
  marrom,
  bordo,
  coral,
  limao,
  menta,
  ceu,
  magenta,
  oliva,
  petroleo;

  static ThemeColorOption get fallback => original;

  static ThemeColorOption fromName(String? name) {
    return ThemeColorOption.values.firstWhere(
      (c) => c.name == name,
      orElse: () => fallback,
    );
  }
}

class _HueConfig {
  final String label;
  final double hue;
  final double chromaScale;
  final double lightnessShift;

  const _HueConfig({
    required this.label,
    required this.hue,
    this.chromaScale = 1,
    this.lightnessShift = 0,
  });
}

const Map<ThemeColorOption, _HueConfig> _hues = {
  ThemeColorOption.verde: _HueConfig(label: 'Verde', hue: 155),
  ThemeColorOption.azul: _HueConfig(label: 'Azul', hue: 235),
  ThemeColorOption.laranja: _HueConfig(
    label: 'Laranja',
    hue: 45,
    chromaScale: 0.9,
  ),
  ThemeColorOption.vermelho: _HueConfig(
    label: 'Vermelho',
    hue: 18,
    chromaScale: 0.72,
  ),
  ThemeColorOption.lilas: _HueConfig(
    label: 'Lilás',
    hue: 300,
    chromaScale: 0.8,
  ),
  ThemeColorOption.roxo: _HueConfig(label: 'Roxo', hue: 275),
  ThemeColorOption.rosa: _HueConfig(label: 'Rosa', hue: 340, chromaScale: 0.85),
  ThemeColorOption.ciano: _HueConfig(label: 'Ciano', hue: 195),
  ThemeColorOption.turquesa: _HueConfig(
    label: 'Turquesa',
    hue: 175,
    chromaScale: 0.95,
  ),
  ThemeColorOption.dourado: _HueConfig(
    label: 'Dourado',
    hue: 85,
    chromaScale: 0.75,
    lightnessShift: -0.03,
  ),
  ThemeColorOption.grafite: _HueConfig(
    label: 'Grafite',
    hue: 240,
    chromaScale: 0.25,
  ),
  ThemeColorOption.indigo: _HueConfig(label: 'Índigo', hue: 260),
  ThemeColorOption.marrom: _HueConfig(
    label: 'Marrom',
    hue: 55,
    chromaScale: 0.5,
    lightnessShift: -0.12,
  ),
  ThemeColorOption.bordo: _HueConfig(
    label: 'Bordô',
    hue: 5,
    chromaScale: 0.85,
    lightnessShift: -0.08,
  ),
  // Laranja-coral do mixbot (#FF723A) e outras — mesmas do painel web.
  ThemeColorOption.coral: _HueConfig(
    label: 'Coral',
    hue: 38,
    chromaScale: 1.05,
  ),
  ThemeColorOption.limao: _HueConfig(
    label: 'Limão',
    hue: 125,
    chromaScale: 0.9,
  ),
  ThemeColorOption.menta: _HueConfig(
    label: 'Menta',
    hue: 165,
    chromaScale: 0.7,
  ),
  ThemeColorOption.ceu: _HueConfig(label: 'Céu', hue: 220, chromaScale: 0.85),
  ThemeColorOption.magenta: _HueConfig(label: 'Magenta', hue: 325),
  ThemeColorOption.oliva: _HueConfig(
    label: 'Oliva',
    hue: 115,
    chromaScale: 0.55,
    lightnessShift: -0.08,
  ),
  ThemeColorOption.petroleo: _HueConfig(
    label: 'Petróleo',
    hue: 205,
    chromaScale: 0.6,
    lightnessShift: -0.1,
  ),
};

extension ThemeColorOptionLabel on ThemeColorOption {
  String get label =>
      this == ThemeColorOption.original ? 'Original' : _hues[this]!.label;
}

/// Roxo/azul/navy da marca (ver `AppColors`) — preservados como opção
/// "Original".
class _OriginalColors {
  static const primary = Color(0xFF7B4DFF);
  static const secondary = Color(0xFF3D7BFF);
  static const darkSurfaceBackground = Color(0xFF14142B);
  static const darkCardSurface = Color(0xFF1E1E3A);
  static const lightSurfaceBackground = Color(0xFFF2F4F7);
  static const lightCardSurface = Color(0xFFFFFFFF);
}

/// Converte OKLCH (L 0-1, C croma, H graus) para [Color] (matriz OKLab de
/// Björn Ottosson, mesma usada pelo `oklch()` do CSS).
Color _oklchToColor(double l, double c, double hDeg) {
  final h = hDeg * math.pi / 180.0;
  final a = c * math.cos(h);
  final b = c * math.sin(h);

  final lp = l + 0.3963377774 * a + 0.2158037573 * b;
  final mp = l - 0.1055613458 * a - 0.0638541728 * b;
  final sp = l - 0.0894841775 * a - 1.2914855480 * b;

  final ll = lp * lp * lp;
  final mm = mp * mp * mp;
  final ss = sp * sp * sp;

  final rLin = 4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss;
  final gLin = -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss;
  final bLin = -0.0041960863 * ll - 0.7034186147 * mm + 1.7076147010 * ss;

  double toSrgb(double x) {
    x = x.clamp(0.0, 1.0);
    return x <= 0.0031308 ? 12.92 * x : 1.055 * math.pow(x, 1 / 2.4) - 0.055;
  }

  int to255(double x) => (toSrgb(x) * 255).round().clamp(0, 255);

  return Color.fromARGB(255, to255(rLin), to255(gLin), to255(bLin));
}

_HueConfig _configFor(ThemeColorOption color) => _hues[color]!;

/// Cor predominante (`primary`) — mesma nos dois brightness (marca fixa).
Color primaryColorFor(ThemeColorOption color) {
  if (color == ThemeColorOption.original) return _OriginalColors.primary;
  final cfg = _configFor(color);
  final l = 0.58 + cfg.lightnessShift;
  final c = 0.16 * cfg.chromaScale;
  return _oklchToColor(l, c, cfg.hue);
}

/// Cor secundária (`secondary`) — matiz deslocado do `primary`, igual à
/// relação roxo/azul da paleta original.
Color secondaryColorFor(ThemeColorOption color) {
  if (color == ThemeColorOption.original) return _OriginalColors.secondary;
  final cfg = _configFor(color);
  final l = 0.62 + cfg.lightnessShift;
  final c = 0.14 * cfg.chromaScale;
  return _oklchToColor(l, c, cfg.hue - 35);
}

/// Fundo principal do tema escuro — no "Original" é o navy fixo da marca;
/// nas demais cores, tingido bem escuro com o matiz escolhido, pra combinar
/// com o `primary`/`secondary` re-tingidos (o navy fixo destoava).
Color darkSurfaceBackgroundFor(ThemeColorOption color) {
  if (color == ThemeColorOption.original) {
    return _OriginalColors.darkSurfaceBackground;
  }
  final cfg = _configFor(color);
  return _oklchToColor(0.17, 0.035 * cfg.chromaScale, cfg.hue);
}

/// Fundo de card do tema escuro — mesma lógica de [darkSurfaceBackgroundFor],
/// um pouco mais claro pra manter a hierarquia fundo/card.
Color darkCardSurfaceFor(ThemeColorOption color) {
  if (color == ThemeColorOption.original) {
    return _OriginalColors.darkCardSurface;
  }
  final cfg = _configFor(color);
  return _oklchToColor(0.23, 0.04 * cfg.chromaScale, cfg.hue);
}

/// Fundo principal do tema claro — tingido bem sutilmente (quase cinza) pra
/// não perder legibilidade.
Color lightSurfaceBackgroundFor(ThemeColorOption color) {
  if (color == ThemeColorOption.original) {
    return _OriginalColors.lightSurfaceBackground;
  }
  final cfg = _configFor(color);
  return _oklchToColor(0.96, 0.010 * cfg.chromaScale, cfg.hue);
}

/// Fundo de card do tema claro — quase branco, tingido sutilmente.
Color lightCardSurfaceFor(ThemeColorOption color) {
  if (color == ThemeColorOption.original) {
    return _OriginalColors.lightCardSurface;
  }
  final cfg = _configFor(color);
  return _oklchToColor(0.995, 0.004 * cfg.chromaScale, cfg.hue);
}

/// Gradiente de prévia (bolinhas de seleção em Configurações > Aparência).
List<Color> previewGradientFor(ThemeColorOption color) {
  if (color == ThemeColorOption.original) {
    return [_OriginalColors.primary, _OriginalColors.secondary];
  }
  return [primaryColorFor(color), secondaryColorFor(color)];
}
