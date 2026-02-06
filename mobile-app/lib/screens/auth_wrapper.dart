/// =============================================================================
/// AUTH_WRAPPER.DART - Authentication State Handler
/// =============================================================================
///
/// PURPOSE:
/// This widget is the "gatekeeper" of the app. It checks if a user is logged in
/// and decides which screen to show:
/// - Loading: Show spinner while checking auth state
/// - Logged in: Show HomeScreen (church browsing, visit tracking)
/// - Not logged in: Show LoginScreen
///
/// WHY THIS PATTERN:
/// Instead of checking auth state in every screen, we centralize it here.
/// This widget sits at the top of the widget tree (in main.dart) and
/// automatically switches screens when auth state changes.
///
/// TECHNICAL CONCEPTS:
/// - Consumer<AuthService>: Listens to AuthService for changes
/// - Reactive UI: Automatically rebuilds when isAuthenticated changes
/// - StatelessWidget: No internal state, purely reactive to AuthService
/// - ValueKey: Preserves LoginScreen state across rebuilds
///
/// AUTH STATE FLOW:
/// ┌─────────────┐     Firebase Auth     ┌─────────────────────┐
/// │             │ ◄───────────────────► │                     │
/// │  AuthService│                       │  Firebase Auth SDK  │
/// │  (Provider) │                       │  (Persistent state) │
/// └──────┬──────┘                       └─────────────────────┘
///        │
///        │ isAuthenticated?
///        ▼
/// ┌──────────────────┐
/// │   AuthWrapper    │
/// │   (this widget)  │
/// └────────┬─────────┘
///          │
///    ┌─────┴─────┐
///    ▼           ▼
/// HomeScreen   LoginScreen
///
/// RELATED FILES:
/// - services/auth_service.dart: Manages auth state and Firebase Auth
/// - screens/home_screen.dart: Main app after login
/// - screens/auth/login_screen.dart: Login/register UI
/// - main.dart: Registers AuthService provider and sets this as home

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/profile_service.dart';
import '../models/app_state.dart';
import '../screens/home_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/email_verification_screen.dart';

/// Authentication wrapper that determines whether to show the main app or login screen
///
/// This widget listens to AuthService and renders:
/// - CircularProgressIndicator: While auth state is being determined
/// - HomeScreen: If user is authenticated, verified and not blocked
/// - EmailVerificationScreen: If user is authenticated but email not verified
/// - LoginScreen: If user is not authenticated
/// - BlockedScreen: If user is authenticated but blocked
class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> with WidgetsBindingObserver {
  bool _isCheckingBlockStatus = false;
  bool _isBlocked = false;
  String? _blockReason;
  String? _lastCheckedUserId;
  bool _checkFailed = false; // Track if block check failed

  @override
  void initState() {
    super.initState();
    // Listen to app lifecycle to refresh email verification when app resumes
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // When app resumes from background, refresh email verification status
    // This catches the case where user verified email in browser
    if (state == AppLifecycleState.resumed) {
      final authService = context.read<AuthService>();
      if (authService.isAuthenticated && !authService.isEmailVerified) {
        debugPrint('📧 App resumed - checking email verification status...');
        authService.checkEmailVerified();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthService>(
      builder: (context, authService, child) {
        assert(() {
          debugPrint(
              'AuthWrapper -> isLoading=${authService.isLoading}, isAuthenticated=${authService.isAuthenticated}, isGuestMode=${authService.isGuestMode}, user=${authService.currentUser?.uid}');
          return true;
        }());
        // Show loading spinner while checking auth state
        if (authService.isLoading) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(),
            ),
          );
        }

        // GUEST MODE: Allow browsing without authentication
        // Guest users can view churches but cannot use registered-only features
        if (authService.isGuestMode && !authService.isAuthenticated) {
          debugPrint('👤 AuthWrapper: Guest mode active, showing HomeScreen');
          return const HomeScreen();
        }

        // Show main app if user is authenticated
        if (authService.isAuthenticated) {
          final currentUserId = authService.currentUser?.uid;

          // Check block status if we haven't checked for this user yet
          if (currentUserId != null &&
              currentUserId != _lastCheckedUserId &&
              !_isCheckingBlockStatus &&
              !_checkFailed) {
            // Use addPostFrameCallback to avoid calling setState during build
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _checkBlockStatus(authService, currentUserId);
            });
          }

          // Show loading while checking block status (with timeout protection)
          if (_isCheckingBlockStatus) {
            return const Scaffold(
              body: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 16),
                    Text('Verifying account status...'),
                  ],
                ),
              ),
            );
          }

          // Show blocked screen if user is blocked
          if (_isBlocked) {
            return _BlockedScreen(
              reason: _blockReason ?? 'No reason provided',
              onSignOut: () async {
                // CRITICAL: Clear all user state before signing out
                debugPrint(
                    '🧹 Clearing user state before logout (blocked user)...');
                context.read<ProfileService>().clearProfile();
                context.read<AppState>().clearUserState();

                await authService.signOut();
                setState(() {
                  _isBlocked = false;
                  _blockReason = null;
                  _lastCheckedUserId = null;
                  _checkFailed = false;
                });
              },
            );
          }

          // Check if email is verified before allowing access
          debugPrint(
              '📧 AuthWrapper: Checking isEmailVerified = ${authService.isEmailVerified}');
          if (!authService.isEmailVerified) {
            debugPrint(
                '📧 AuthWrapper: Email not verified, showing verification screen');
            return const EmailVerificationScreen();
          }

          debugPrint('✅ AuthWrapper: Email verified, showing HomeScreen');
          return const HomeScreen();
        }

        // Reset block status when user logs out
        if (_isBlocked || _lastCheckedUserId != null || _checkFailed) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            setState(() {
              _isBlocked = false;
              _blockReason = null;
              _lastCheckedUserId = null;
              _checkFailed = false;
            });
          });
        }

        // Show login screen if user is not authenticated
        // Use a key to preserve the login screen state across rebuilds
        return const LoginScreen(key: ValueKey('login_screen'));
      },
    );
  }

  Future<void> _checkBlockStatus(AuthService authService, String userId) async {
    if (!mounted) return;

    setState(() {
      _isCheckingBlockStatus = true;
      _checkFailed = false;
    });

    try {
      // Add a timeout to prevent infinite loading
      final blockInfo = await authService.checkIfUserBlocked(userId).timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          debugPrint('⏱️ Block status check timed out');
          return null; // Treat timeout as not blocked
        },
      );

      if (mounted) {
        setState(() {
          _isCheckingBlockStatus = false;
          _lastCheckedUserId = userId;
          if (blockInfo != null && blockInfo['isBlocked'] == true) {
            _isBlocked = true;
            _blockReason = blockInfo['blockReason'];
          } else {
            _isBlocked = false;
            _blockReason = null;
          }
        });
      }
    } catch (e) {
      debugPrint('Error checking block status: $e');
      if (mounted) {
        setState(() {
          _isCheckingBlockStatus = false;
          _lastCheckedUserId = userId;
          _isBlocked = false;
          _checkFailed = true; // Mark as failed so we don't retry infinitely
        });
      }
    }
  }
}

/// Screen shown when a user's account is blocked
class _BlockedScreen extends StatelessWidget {
  final String reason;
  final VoidCallback onSignOut;

  const _BlockedScreen({
    required this.reason,
    required this.onSignOut,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Blocked icon
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(50),
                ),
                child: const Icon(
                  Icons.block,
                  size: 60,
                  color: Colors.red,
                ),
              ),
              const SizedBox(height: 32),

              // Title
              const Text(
                'Account Blocked',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.red,
                ),
              ),
              const SizedBox(height: 16),

              // Description
              const Text(
                'Your account has been blocked by an administrator.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(height: 24),

              // Reason card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.info_outline, color: Colors.red, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Reason for blocking:',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.red,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      reason,
                      style: TextStyle(
                        color: Colors.red.shade700,
                        fontSize: 15,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Contact info
              Text(
                'If you believe this is an error, please contact the Chancery Office for assistance.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey.shade600,
                  fontStyle: FontStyle.italic,
                ),
              ),
              const SizedBox(height: 32),

              // Sign out button
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onSignOut,
                  icon: const Icon(Icons.logout),
                  label: const Text('Sign Out'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red,
                    side: const BorderSide(color: Colors.red),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
