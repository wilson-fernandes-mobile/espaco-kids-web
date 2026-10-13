import 'package:flutter/material.dart';
import '../../../../shared/widgets/open_drawer_button.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/widgets/feedback.dart';
import '../../../kids/presentation/providers/kids_providers.dart';

/// Lê o QR do crachá (`EK:<token>`) e abre a ficha da criança.
/// O QR só *localiza* o cadastro: a liberação da saída sempre passa pela
/// validação de pessoa autorizada.
class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  final _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    formats: const [BarcodeFormat.qrCode],
  );
  final _manual = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _controller.dispose();
    _manual.dispose();
    super.dispose();
  }

  Future<void> _handle(String raw) async {
    if (_busy) return;
    final value = raw.trim();
    if (!value.startsWith('EK:')) {
      showInfo(context, 'QR Code não reconhecido.');
      return;
    }
    setState(() => _busy = true);
    try {
      final id = await ref
          .read(kidsRepositoryProvider)
          .childIdFromBadgeToken(value.substring(3));
      if (!mounted) return;
      if (id == null) {
        showInfo(context, 'Crachá inválido, cancelado ou substituído.');
      } else {
        await context.push('/crianca/$id');
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: const OpenDrawerButton(),
        title: const Text('Ler crachá'),
      ),
      body: Column(
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
              child: MobileScanner(
                controller: _controller,
                onDetect: (capture) {
                  final code = capture.barcodes.firstOrNull?.rawValue;
                  if (code != null) _handle(code);
                },
                errorBuilder:
                    (_, _, _) => const Center(
                      child: Text('Não foi possível acessar a câmera.'),
                    ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _manual,
                    decoration: const InputDecoration(
                      hintText: 'Ou digite o código do crachá',
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                IconButton.filled(
                  onPressed:
                      () => _handle(
                        _manual.text.startsWith('EK:')
                            ? _manual.text
                            : 'EK:${_manual.text}',
                      ),
                  icon: const Icon(Icons.search),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
