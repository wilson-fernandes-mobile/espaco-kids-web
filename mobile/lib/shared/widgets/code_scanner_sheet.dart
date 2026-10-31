import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../core/theme/app_spacing.dart';

final _codePattern = RegExp(r'(?:IG|KIDS|LK)-[A-Z0-9]{4,}');

/// Extrai o código de entrada de um QR da igreja (`EKC:IG-XXXXXX`) ou de um
/// texto qualquer que o contenha. Null = não é um QR de entrada.
String? parseChurchCode(String raw) =>
    _codePattern.firstMatch(raw.toUpperCase())?.group(0);

/// Abre a câmera e devolve o código lido do QR da igreja (ou null se cancelar).
Future<String?> scanChurchCode(BuildContext context) =>
    showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _ScannerSheet(),
    );

class _ScannerSheet extends StatefulWidget {
  const _ScannerSheet();

  @override
  State<_ScannerSheet> createState() => _ScannerSheetState();
}

class _ScannerSheetState extends State<_ScannerSheet> {
  final _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    formats: const [BarcodeFormat.qrCode],
  );
  bool _done = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_done) return;
    final raw = capture.barcodes.firstOrNull?.rawValue;
    final code = raw == null ? null : parseChurchCode(raw);
    if (code == null) return; // QR de outra coisa: segue procurando
    _done = true;
    Navigator.of(context).pop(code);
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.6,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Text(
                'Aponte para o QR Code da igreja',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
                child: MobileScanner(
                  controller: _controller,
                  onDetect: _onDetect,
                  errorBuilder:
                      (_, _, _) => const Center(
                        child: Text('Não foi possível acessar a câmera.'),
                      ),
                ),
              ),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Digitar o código'),
            ),
          ],
        ),
      ),
    );
  }
}
