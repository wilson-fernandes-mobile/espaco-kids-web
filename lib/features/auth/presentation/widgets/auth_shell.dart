import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/app_spacing.dart';

/// Casca das telas de entrada: faixa de marca no topo (gradiente do tema,
/// logo e nome) e, por cima dela, uma folha arredondada com o conteúdo.
/// Rola junto com o teclado e limita a largura em telas grandes.
class AuthShell extends StatelessWidget {
  const AuthShell({super.key, required this.child, this.tagline});

  final Widget child;
  final String? tagline;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final top = MediaQuery.paddingOf(context).top;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: scheme.surface,
        body: LayoutBuilder(
          builder: (context, box) {
            return SingleChildScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: box.maxHeight),
                // IntrinsicHeight: dá altura finita ao Column para o
                // Expanded (a folha) ocupar o resto da tela.
                child: IntrinsicHeight(
                  child: Column(
                    children: [
                      // Faixa de marca.
                      Container(
                        width: double.infinity,
                        clipBehavior: Clip.antiAlias,
                        padding: EdgeInsets.fromLTRB(
                          AppSpacing.lg,
                          top + AppSpacing.xl,
                          AppSpacing.lg,
                          AppSpacing.xl + 16,
                        ),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [scheme.primary, scheme.secondary],
                          ),
                        ),
                        child: Stack(
                          alignment: Alignment.topCenter,
                          clipBehavior: Clip.none,
                          children: [
                            const Positioned(
                              right: -70,
                              top: -80,
                              child: _Bubble(size: 190, alpha: 0.10),
                            ),
                            const Positioned(
                              left: -50,
                              bottom: -60,
                              child: _Bubble(size: 130, alpha: 0.08),
                            ),
                            Column(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(26),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(
                                          alpha: 0.18,
                                        ),
                                        blurRadius: 18,
                                        offset: const Offset(0, 8),
                                      ),
                                    ],
                                  ),
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(22),
                                    child: Image.asset(
                                      'assets/icon/ic_app.png',
                                      width: 84,
                                      height: 84,
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: AppSpacing.md),
                                Text(
                                  'Espaço Kids',
                                  style: text.headlineMedium?.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -0.3,
                                  ),
                                ),
                                if (tagline != null) ...[
                                  const SizedBox(height: AppSpacing.xs),
                                  Text(
                                    tagline!,
                                    textAlign: TextAlign.center,
                                    style: text.bodyMedium?.copyWith(
                                      color: Colors.white.withValues(
                                        alpha: 0.9,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                      // Folha com o conteúdo, sobrepondo a faixa.
                      Expanded(
                        child: Transform.translate(
                          offset: const Offset(0, -24),
                          child: Container(
                            width: double.infinity,
                            decoration: BoxDecoration(
                              color: scheme.surface,
                              borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(28),
                              ),
                            ),
                            child: SafeArea(
                              top: false,
                              child: Align(
                                alignment: Alignment.topCenter,
                                child: ConstrainedBox(
                                  constraints: const BoxConstraints(
                                    maxWidth: 440,
                                  ),
                                  child: Padding(
                                    padding: const EdgeInsets.fromLTRB(
                                      AppSpacing.lg,
                                      AppSpacing.lg + 4,
                                      AppSpacing.lg,
                                      AppSpacing.lg,
                                    ),
                                    child: child,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.size, required this.alpha});

  final double size;
  final double alpha;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      color: Colors.white.withValues(alpha: alpha),
    ),
  );
}
