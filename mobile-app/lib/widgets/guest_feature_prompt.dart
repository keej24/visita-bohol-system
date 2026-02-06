/// =============================================================================
/// GUEST_FEATURE_PROMPT.DART - Login Prompt for Guest Users
/// =============================================================================
///
/// PURPOSE:
/// Provides a reusable widget and utility methods to show login prompts
/// when guest users try to access registered-only features.
///
/// FEATURES REQUIRING LOGIN:
/// - Mark as Visited (visit tracking)
/// - For Visit list (wishlist/bookmarks)
/// - Submit reviews/feedback
/// - Profile access
/// - Sync across devices
///
/// USAGE:
/// ```dart
/// if (!authService.isRegisteredUser) {
///   GuestFeaturePrompt.show(
///     context,
///     feature: 'visit tracking',
///     description: 'Track your church visits across devices',
///   );
///   return;
/// }
/// ```

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';

/// Utility class for showing login prompts to guest users
class GuestFeaturePrompt {
  /// Check if user is a guest and should be prompted to login
  static bool isGuest(BuildContext context) {
    final authService = context.read<AuthService>();
    return !authService.isRegisteredUser;
  }

  /// Show a bottom sheet prompting the guest to sign in/register
  /// Returns true if user chose to sign in/register
  static Future<bool> show(
    BuildContext context, {
    required String feature,
    required String description,
    IconData icon = Icons.lock_outline,
  }) async {
    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _GuestPromptBottomSheet(
        feature: feature,
        description: description,
        icon: icon,
      ),
    );
    return result ?? false;
  }

  /// Show a simple snackbar prompt for minor features
  static void showSnackbar(
    BuildContext context, {
    required String feature,
  }) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.lock_outline, color: Colors.white, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text('Sign in to $feature'),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF2563EB),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
        duration: const Duration(seconds: 4),
        action: SnackBarAction(
          label: 'Sign In',
          textColor: Colors.white,
          onPressed: () {
            final authService = context.read<AuthService>();
            authService.exitGuestMode();
          },
        ),
      ),
    );
  }
}

/// Bottom sheet widget for login prompts
class _GuestPromptBottomSheet extends StatelessWidget {
  final String feature;
  final String description;
  final IconData icon;

  const _GuestPromptBottomSheet({
    required this.feature,
    required this.description,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle indicator
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 24),

          // Icon
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: const Color(0xFF2563EB).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(40),
            ),
            child: Icon(
              icon,
              size: 40,
              color: const Color(0xFF2563EB),
            ),
          ),
          const SizedBox(height: 20),

          // Title
          Text(
            'Sign In Required',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF1F2937),
                ),
          ),
          const SizedBox(height: 12),

          // Description
          Text(
            'Create an account or sign in to use $feature.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: const Color(0xFF6B7280),
                ),
          ),
          const SizedBox(height: 8),
          Text(
            description,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: const Color(0xFF9CA3AF),
                ),
          ),
          const SizedBox(height: 24),

          // Feature benefits
          _buildBenefitItem(
            Icons.sync,
            'Sync across devices',
            'Your data is saved and accessible everywhere',
          ),
          _buildBenefitItem(
            Icons.bookmark_outline,
            'Personal lists',
            'Save churches to visit later',
          ),
          _buildBenefitItem(
            Icons.rate_review_outlined,
            'Leave reviews',
            'Share your experience with others',
          ),
          const SizedBox(height: 24),

          // Action buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    Navigator.pop(context, true);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const LoginScreen()),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    side: const BorderSide(color: Color(0xFF2563EB)),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Sign In',
                    style: TextStyle(
                      color: Color(0xFF2563EB),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context, true);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const RegisterScreen()),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                  ),
                  child: const Text(
                    'Register',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Continue as guest
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              'Continue as Guest',
              style: TextStyle(
                color: Colors.grey[600],
                fontWeight: FontWeight.w500,
              ),
            ),
          ),

          // Bottom safe area
          SizedBox(height: MediaQuery.of(context).padding.bottom),
        ],
      ),
    );
  }

  Widget _buildBenefitItem(IconData icon, String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFF2563EB).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: const Color(0xFF2563EB), size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    color: Color(0xFF1F2937),
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF9CA3AF),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
