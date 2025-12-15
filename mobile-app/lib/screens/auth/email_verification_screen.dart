import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';

/// Screen shown when user has signed up but hasn't verified their email yet.
///
/// This screen:
/// - Displays instructions to check their email
/// - Provides a button to resend verification email
/// - Auto-checks verification status every few seconds
/// - Allows user to continue once verified
class EmailVerificationScreen extends StatefulWidget {
  const EmailVerificationScreen({super.key});

  @override
  State<EmailVerificationScreen> createState() =>
      _EmailVerificationScreenState();
}

class _EmailVerificationScreenState extends State<EmailVerificationScreen> {
  bool _isResending = false;
  bool _isChecking = false;
  Timer? _autoCheckTimer;
  String? _message;
  bool _isSuccess = false;

  @override
  void initState() {
    super.initState();
    // Auto-check verification status every 3 seconds
    _autoCheckTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      _checkVerification(showFeedback: false);
    });
  }

  @override
  void dispose() {
    _autoCheckTimer?.cancel();
    super.dispose();
  }

  Future<void> _resendVerificationEmail() async {
    if (_isResending) return;

    setState(() {
      _isResending = true;
      _message = null;
    });

    final authService = context.read<AuthService>();
    final success = await authService.sendEmailVerification();

    if (mounted) {
      setState(() {
        _isResending = false;
        _isSuccess = success;
        _message = success
            ? 'Verification email sent! Check your inbox.'
            : authService.errorMessage ??
                'Failed to send email. Please try again.';
      });
    }
  }

  Future<void> _checkVerification({bool showFeedback = true}) async {
    if (_isChecking) return;

    setState(() {
      _isChecking = true;
      if (showFeedback) _message = null;
    });

    final authService = context.read<AuthService>();
    final isVerified = await authService.checkEmailVerified();

    if (mounted) {
      setState(() {
        _isChecking = false;
        if (showFeedback && !isVerified) {
          _isSuccess = false;
          _message =
              'Email not verified yet. Please check your inbox and click the verification link.';
        }
      });

      // If verified, AuthWrapper will automatically navigate to home
      if (isVerified) {
        authService.notifyListeners();
      }
    }
  }

  Future<void> _signOut() async {
    final authService = context.read<AuthService>();
    await authService.signOut();
  }

  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();
    final userEmail = authService.currentUser?.email ?? 'your email';

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Email icon
              Icon(
                Icons.mark_email_unread_outlined,
                size: 80,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 24),

              // Title
              Text(
                'Verify Your Email',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),

              // Instructions
              Text(
                'We\'ve sent a verification link to:',
                style: Theme.of(context).textTheme.bodyLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                userEmail,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                'Please check your email and click the verification link to activate your account.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withValues(alpha: 0.7),
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),

              // Message feedback
              if (_message != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _isSuccess
                        ? Colors.green.withValues(alpha: 0.1)
                        : Colors.orange.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: _isSuccess ? Colors.green : Colors.orange,
                      width: 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _isSuccess ? Icons.check_circle : Icons.info_outline,
                        color: _isSuccess ? Colors.green : Colors.orange,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _message!,
                          style: TextStyle(
                            color: _isSuccess
                                ? Colors.green.shade700
                                : Colors.orange.shade700,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ],

              // Check verification button
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _isChecking ? null : () => _checkVerification(),
                  icon: _isChecking
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor:
                                AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Icon(Icons.refresh),
                  label: const Text('I\'ve Verified My Email'),
                ),
              ),
              const SizedBox(height: 12),

              // Resend email button
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _isResending ? null : _resendVerificationEmail,
                  icon: _isResending
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.email_outlined),
                  label: const Text('Resend Verification Email'),
                ),
              ),
              const SizedBox(height: 24),

              // Divider
              Row(
                children: [
                  const Expanded(child: Divider()),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      'or',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Theme.of(context)
                                .colorScheme
                                .onSurface
                                .withValues(alpha: 0.5),
                          ),
                    ),
                  ),
                  const Expanded(child: Divider()),
                ],
              ),
              const SizedBox(height: 24),

              // Sign out / use different email button
              TextButton.icon(
                onPressed: _signOut,
                icon: const Icon(Icons.arrow_back),
                label: const Text('Use a Different Email'),
              ),

              const SizedBox(height: 16),

              // Help text
              Text(
                'Didn\'t receive the email? Check your spam folder or try resending.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withValues(alpha: 0.5),
                    ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
