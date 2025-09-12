import 'package:flutter/material.dart';

/// Reusable wrapper for async data with loading, error, and empty states.
class AsyncContent<T> extends StatelessWidget {
  final AsyncSnapshot<T> snapshot;
  final Widget Function(T data) builder;
  final Widget? empty;
  final String? emptyMessage;
  final String retryLabel;
  final VoidCallback? onRetry;

  const AsyncContent({
    super.key,
    required this.snapshot,
    required this.builder,
    this.empty,
    this.emptyMessage,
    this.retryLabel = 'Retry',
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    if (snapshot.connectionState != ConnectionState.done) {
      return const Center(child: CircularProgressIndicator());
    }
    if (snapshot.hasError) {
      return _ErrorState(
          error: snapshot.error, onRetry: onRetry, retryLabel: retryLabel);
    }
    if (!snapshot.hasData) {
      return _EmptyState(message: emptyMessage ?? 'No data', child: empty);
    }
    final data = snapshot.data as T;
    if (data is Iterable && (data as Iterable).isEmpty) {
      return _EmptyState(
          message: emptyMessage ?? 'No items found', child: empty);
    }
    return builder(data);
  }
}

class _ErrorState extends StatelessWidget {
  final Object? error;
  final VoidCallback? onRetry;
  final String retryLabel;
  const _ErrorState({this.error, this.onRetry, required this.retryLabel});
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.all(12),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: Colors.red, size: 40),
            const SizedBox(height: 12),
            Text('Error: ${error ?? 'Unknown'}', textAlign: TextAlign.center),
            if (onRetry != null) ...[
              const SizedBox(height: 12),
              ElevatedButton(onPressed: onRetry, child: Text(retryLabel)),
            ]
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final String message;
  final Widget? child;
  const _EmptyState({required this.message, this.child});
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.all(12),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.inbox, size: 48, color: Colors.grey),
            const SizedBox(height: 12),
            Text(message, style: const TextStyle(fontSize: 16)),
            if (child != null) ...[
              const SizedBox(height: 12),
              child!,
            ]
          ],
        ),
      ),
    );
  }
}
