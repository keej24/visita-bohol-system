import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';

/// Error boundary widget that catches and handles errors in its child widgets
class ErrorBoundary extends StatefulWidget {
  final Widget child;
  final Widget Function(
      BuildContext context, Object error, StackTrace? stackTrace)? errorBuilder;
  final void Function(Object error, StackTrace? stackTrace)? onError;
  final String? errorId;

  const ErrorBoundary({
    super.key,
    required this.child,
    this.errorBuilder,
    this.onError,
    this.errorId,
  });

  @override
  State<ErrorBoundary> createState() => _ErrorBoundaryState();
}

class _ErrorBoundaryState extends State<ErrorBoundary> {
  Object? _error;
  StackTrace? _stackTrace;
  String? _errorId;

  @override
  void initState() {
    super.initState();
    _errorId = widget.errorId ?? _generateErrorId();
  }

  String _generateErrorId() {
    return 'error_${DateTime.now().millisecondsSinceEpoch}_${_generateRandomString(6)}';
  }

  String _generateRandomString(int length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return List.generate(
        length,
        (index) => chars[(DateTime.now().millisecondsSinceEpoch + index) %
            chars.length]).join();
  }

  void _logError(Object error, StackTrace? stackTrace) {
    debugPrint('🚨 ErrorBoundary caught error ($_errorId):');
    debugPrint('Error: $error');
    if (stackTrace != null) {
      debugPrint('Stack trace: $stackTrace');
    }

    // In production, you would send this to your error tracking service
    widget.onError?.call(error, stackTrace);
  }

  void _resetError() {
    setState(() {
      _error = null;
      _stackTrace = null;
      _errorId = _generateErrorId();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      // Use custom error builder if provided
      if (widget.errorBuilder != null) {
        return widget.errorBuilder!(context, _error!, _stackTrace);
      }

      // Default error UI
      return _DefaultErrorWidget(
        error: _error!,
        stackTrace: _stackTrace,
        errorId: _errorId!,
        onRetry: _resetError,
      );
    }

    // Wrap child with error handling
    return _ErrorCatcher(
      onError: (error, stackTrace) {
        _logError(error, stackTrace);
        setState(() {
          _error = error;
          _stackTrace = stackTrace;
        });
      },
      child: widget.child,
    );
  }
}

/// Widget that catches errors from its child
class _ErrorCatcher extends StatelessWidget {
  final Widget child;
  final void Function(Object error, StackTrace? stackTrace) onError;

  const _ErrorCatcher({
    required this.child,
    required this.onError,
  });

  @override
  Widget build(BuildContext context) {
    return Builder(
      builder: (context) {
        try {
          return child;
        } catch (error, stackTrace) {
          onError(error, stackTrace);
          return const SizedBox.shrink();
        }
      },
    );
  }
}

/// Default error widget displayed when an error occurs
class _DefaultErrorWidget extends StatelessWidget {
  final Object error;
  final StackTrace? stackTrace;
  final String errorId;
  final VoidCallback onRetry;

  const _DefaultErrorWidget({
    required this.error,
    required this.stackTrace,
    required this.errorId,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    const isDebugMode = !kReleaseMode;

    return Container(
      padding: const EdgeInsets.all(16),
      child: Card(
        elevation: 4,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Error icon
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: theme.colorScheme.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(32),
                ),
                child: Icon(
                  Icons.error_outline,
                  size: 32,
                  color: theme.colorScheme.error,
                ),
              ),

              const SizedBox(height: 16),

              // Error title
              Text(
                'Something went wrong',
                style: theme.textTheme.headlineSmall?.copyWith(
                  color: theme.colorScheme.error,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 8),

              // Error description
              Text(
                'An unexpected error occurred. Please try again or contact support if the problem persists.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
                ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 16),

              // Error details (debug mode only)
              if (isDebugMode) ...[
                ExpansionTile(
                  title: const Text(
                    'Technical Details (Debug)',
                    style: TextStyle(fontSize: 14),
                  ),
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Error ID: $errorId',
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Error: ${error.toString()}',
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontSize: 12,
                            ),
                          ),
                          if (stackTrace != null) ...[
                            const SizedBox(height: 8),
                            const Text(
                              'Stack trace:',
                              style: TextStyle(
                                fontFamily: 'monospace',
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              stackTrace.toString(),
                              style: const TextStyle(
                                fontFamily: 'monospace',
                                fontSize: 10,
                              ),
                              maxLines: 10,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
              ],

              // Action buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  OutlinedButton.icon(
                    onPressed: onRetry,
                    icon: const Icon(Icons.refresh, size: 18),
                    label: const Text('Try Again'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    onPressed: () {
                      // Navigate to home or previous screen
                      if (Navigator.of(context).canPop()) {
                        Navigator.of(context).pop();
                      } else {
                        // Reset to home screen
                        Navigator.of(context).pushNamedAndRemoveUntil(
                          '/',
                          (route) => false,
                        );
                      }
                    },
                    icon: const Icon(Icons.home, size: 18),
                    label: const Text('Go Home'),
                  ),
                ],
              ),

              // Error ID display
              const SizedBox(height: 12),
              Text(
                'Error ID: $errorId',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                  fontFamily: 'monospace',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Error boundary for specific use cases
class PageErrorBoundary extends StatelessWidget {
  final Widget child;

  const PageErrorBoundary({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return ErrorBoundary(
      onError: (error, stackTrace) {
        // Log page-level errors
        debugPrint('Page Error: $error');
      },
      child: child,
    );
  }
}

/// Error boundary for components
class ComponentErrorBoundary extends StatelessWidget {
  final Widget child;
  final String? componentName;

  const ComponentErrorBoundary({
    super.key,
    required this.child,
    this.componentName,
  });

  @override
  Widget build(BuildContext context) {
    return ErrorBoundary(
      onError: (error, stackTrace) {
        debugPrint(
            'Component Error${componentName != null ? ' ($componentName)' : ''}: $error');
      },
      errorBuilder: (context, error, stackTrace) {
        return Container(
          padding: const EdgeInsets.all(16),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.warning_amber,
                    size: 32,
                    color: Theme.of(context).colorScheme.error,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Component Error',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Theme.of(context).colorScheme.error,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'This component failed to load.',
                    style: Theme.of(context).textTheme.bodySmall,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        );
      },
      child: child,
    );
  }
}

/// Error boundary for async operations
class AsyncErrorBoundary extends StatelessWidget {
  final Widget child;
  final String? operationName;

  const AsyncErrorBoundary({
    super.key,
    required this.child,
    this.operationName,
  });

  @override
  Widget build(BuildContext context) {
    return ErrorBoundary(
      onError: (error, stackTrace) {
        debugPrint(
            'Async Error${operationName != null ? ' ($operationName)' : ''}: $error');
      },
      errorBuilder: (context, error, stackTrace) {
        return Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.cloud_off,
                size: 48,
                color: Theme.of(context).colorScheme.error,
              ),
              const SizedBox(height: 16),
              Text(
                'Loading Error',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text(
                'Failed to load data. Please check your connection and try again.',
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () {
                  // Trigger retry - this would be handled by the parent widget
                },
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        );
      },
      child: child,
    );
  }
}
