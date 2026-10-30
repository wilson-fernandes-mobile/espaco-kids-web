import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/error_message.dart';
import 'empty_state.dart';

/// Renderiza um [AsyncValue] do Riverpod com os três estados padrão
/// (carregando / erro / dados), evitando repetir esse switch em cada tela.
class AsyncValueWidget<T> extends StatelessWidget {
  const AsyncValueWidget({
    super.key,
    required this.value,
    required this.data,
    this.emptyBuilder,
    this.isEmpty,
  });

  final AsyncValue<T> value;
  final Widget Function(T data) data;
  final Widget Function()? emptyBuilder;
  final bool Function(T data)? isEmpty;

  @override
  Widget build(BuildContext context) {
    return value.when(
      data: (d) {
        if (isEmpty != null && emptyBuilder != null && isEmpty!(d)) {
          return emptyBuilder!();
        }
        return data(d);
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error:
          (error, stackTrace) => EmptyState(
            icon: Icons.error_outline,
            title: 'Algo deu errado',
            message: errorMessage(error),
          ),
    );
  }
}
