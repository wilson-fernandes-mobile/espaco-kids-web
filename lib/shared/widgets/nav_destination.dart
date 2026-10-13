import 'package:flutter/material.dart';

/// Item de navegação usado tanto na [NavigationBar] (mobile) quanto na
/// [NavigationRail] (web/desktop) do [AppScaffold].
class AppNavDestination {
  const AppNavDestination({
    required this.icon,
    required this.selectedIcon,
    required this.label,
    required this.path,
  });

  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final String path;
}
