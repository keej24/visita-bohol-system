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
import '../screens/home_screen.dart';
import '../screens/auth/login_screen.dart';

/// Authentication wrapper that determines whether to show the main app or login screen
///
/// This widget listens to AuthService and renders:
/// - CircularProgressIndicator: While auth state is being determined
/// - HomeScreen: If user is authenticated
/// - LoginScreen: If user is not authenticated
class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthService>(
      builder: (context, authService, child) {
        assert(() {
          debugPrint(
              'AuthWrapper -> isLoading=${authService.isLoading}, isAuthenticated=${authService.isAuthenticated}, user=${authService.currentUser?.uid}');
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

        // Show main app if user is authenticated
        if (authService.isAuthenticated) {
          return const HomeScreen();
        }

        // Show login screen if user is not authenticated
        // Use a key to preserve the login screen state across rebuilds
        return const LoginScreen(key: ValueKey('login_screen'));
      },
    );
  }
}
