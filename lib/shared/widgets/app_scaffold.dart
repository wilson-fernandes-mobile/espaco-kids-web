import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'nav_destination.dart';

/// Chave do [Scaffold] mais externo do app (o que tem a barra de navegação
/// inferior/lateral), para que qualquer tela consiga abrir o drawer dele
/// (ver [AppScaffold]) sem depender de `Scaffold.of(context)` — que
/// encontraria o `Scaffold` da própria tela, não este.
final appScaffoldKeyProvider = Provider<GlobalKey<ScaffoldState>>(
  (ref) => GlobalKey<ScaffoldState>(),
);

/// Shell principal do app com navegação adaptativa: [NavigationBar] na parte
/// inferior em telas estreitas (mobile) e [NavigationRail] lateral em telas
/// largas (web/desktop) — mesmo conjunto de destinos, layout que se adapta.
/// O `drawer` fica neste Scaffold (não no de cada tela) para poder cobrir a
/// barra de navegação quando aberto.
class AppScaffold extends ConsumerWidget {
  const AppScaffold({
    super.key,
    required this.child,
    required this.destinations,
    required this.currentIndex,
    required this.onDestinationSelected,
    this.title,
    this.actions,
    this.floatingActionButton,
    this.drawer,
  });

  final Widget child;
  final List<AppNavDestination> destinations;
  final int currentIndex;
  final ValueChanged<int> onDestinationSelected;
  final String? title;
  final List<Widget>? actions;
  final Widget? floatingActionButton;
  final Widget? drawer;

  static const double _wideBreakpoint = 840;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isWide = MediaQuery.sizeOf(context).width >= _wideBreakpoint;
    final scaffoldKey = ref.watch(appScaffoldKeyProvider);

    if (isWide) {
      return Scaffold(
        key: scaffoldKey,
        drawer: drawer,
        appBar:
            title != null
                ? AppBar(title: Text(title!), actions: actions)
                : null,
        floatingActionButton: floatingActionButton,
        body: Row(
          children: [
            NavigationRail(
              selectedIndex: currentIndex,
              onDestinationSelected: onDestinationSelected,
              labelType: NavigationRailLabelType.all,
              destinations: [
                for (final d in destinations)
                  NavigationRailDestination(
                    icon: Icon(d.icon),
                    selectedIcon: Icon(d.selectedIcon),
                    label: Text(d.label),
                  ),
              ],
            ),
            const VerticalDivider(width: 1),
            Expanded(child: child),
          ],
        ),
      );
    }

    return Scaffold(
      key: scaffoldKey,
      drawer: drawer,
      appBar:
          title != null ? AppBar(title: Text(title!), actions: actions) : null,
      body: child,
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: onDestinationSelected,
        destinations: [
          for (final d in destinations)
            NavigationDestination(
              icon: Icon(d.icon),
              selectedIcon: Icon(d.selectedIcon),
              label: d.label,
            ),
        ],
      ),
    );
  }
}
