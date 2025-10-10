import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../screens/home_screen.dart';
import '../screens/auth/login_screen.dart';

/// Authentication wrapper that determines whether to show the main app or login screen
class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthService>(
      builder: (context, authService, child) {
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
        return const LoginScreen();
      },
    );
  }
}
