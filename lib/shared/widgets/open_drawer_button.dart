import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_scaffold.dart';

/// Botão de menu (hambúrguer) que abre o drawer do [AppScaffold] externo.
/// As telas o usam como `leading` do próprio `AppBar`, já que o drawer vive
/// no Scaffold que também tem a barra de navegação.
class OpenDrawerButton extends ConsumerWidget {
  const OpenDrawerButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return IconButton(
      icon: const Icon(Icons.menu),
      tooltip: 'Menu',
      onPressed:
          () => ref.read(appScaffoldKeyProvider).currentState?.openDrawer(),
    );
  }
}
