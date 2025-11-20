import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// Simple AuthService with Firebase Authentication
class AuthService extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;

  User? get currentUser => _auth.currentUser;
  bool get isAuthenticated => _auth.currentUser != null;
  bool get isLoading => _isLoading;
  String? errorMessage;

  bool _isLoading = false;

  AuthService() {
    // Listen to auth state changes
    _auth.authStateChanges().listen((User? user) {
      notifyListeners();
    });
  }

  Future<User?> signUp(String email, String password, String displayName,
      {String? nationality}) async {
    _setLoading(true);
    errorMessage = null;
    try {
      final UserCredential result = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      // Update display name (we could also store nationality in Firestore later)
      await result.user?.updateDisplayName(displayName);
      await result.user?.reload();

      notifyListeners();
      return _auth.currentUser;
    } on FirebaseAuthException catch (e) {
      errorMessage = e.message;
      debugPrint('Sign up error: $e');
      return null;
    } catch (e) {
      errorMessage = 'Unexpected error during sign up';
      debugPrint('Sign up error: $e');
      return null;
    } finally {
      _setLoading(false);
    }
  }

  Future<User?> signIn(String email, String password) async {
    // Set loading without notifying to avoid AuthWrapper rebuild
    _isLoading = true;
    errorMessage = null;
    debugPrint('🔑 AuthService: Starting sign in for $email');

    try {
      final UserCredential result = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      debugPrint('✅ AuthService: Sign in successful for ${result.user?.email}');
      _isLoading = false;
      notifyListeners(); // Only notify on success (user state changed)
      return result.user;
    } on FirebaseAuthException catch (e) {
      errorMessage = _getFriendlyErrorMessage(e.code);
      debugPrint(
          '❌ AuthService: FirebaseAuthException - Code: ${e.code}, Message: ${e.message}');
      debugPrint('❌ AuthService: Setting errorMessage to: $errorMessage');
      _isLoading = false;
      // Don't call notifyListeners() here to prevent AuthWrapper rebuild
      return null;
    } catch (e) {
      errorMessage = 'An unexpected error occurred. Please try again.';
      debugPrint('❌ AuthService: Unexpected error: $e');
      debugPrint('❌ AuthService: Setting errorMessage to: $errorMessage');
      _isLoading = false;
      // Don't call notifyListeners() here to prevent AuthWrapper rebuild
      return null;
    } finally {
      debugPrint(
          '🔑 AuthService: Sign in completed. errorMessage: $errorMessage');
    }
  }

  Future<void> signOut() async {
    try {
      await _auth.signOut();
      notifyListeners();
    } catch (e) {
      debugPrint('Sign out error: $e');
    }
  }

  Future<void> updateProfile(String? displayName) async {
    try {
      await _auth.currentUser?.updateDisplayName(displayName);
      await _auth.currentUser?.reload();
      notifyListeners();
    } catch (e) {
      debugPrint('Profile update error: $e');
    }
  }

  Future<void> sendPasswordResetEmail(String email) async {
    try {
      debugPrint('📧 Sending password reset email to: $email');
      debugPrint('   Project: visitaproject-5cd9f');
      debugPrint('   Auth Domain: visitaproject-5cd9f.firebaseapp.com');

      // Configure ActionCodeSettings to handle password reset properly
      // This helps with mobile deep linking and better user experience
      final actionCodeSettings = ActionCodeSettings(
        // Use the default Firebase domain which is always authorized
        url: 'https://visitaproject-5cd9f.firebaseapp.com',
        // Don't try to handle in app - let it open in browser
        // This is more reliable for password reset
        handleCodeInApp: false,
        // Include iOS bundle ID for better deep link support
        iOSBundleId: 'com.example.visitaMobile',
        // Include Android package name
        androidPackageName: 'com.example.visita_mobile',
        // Don't force app installation
        androidInstallApp: false,
        // Minimum version (optional)
        androidMinimumVersion: '1.0.0',
      );

      await _auth.sendPasswordResetEmail(
        email: email,
        actionCodeSettings: actionCodeSettings,
      );

      debugPrint('✅ Password reset email sent successfully');
      debugPrint('   Link will open in browser for reliable password reset');
      debugPrint('');
      debugPrint('⚠️  IMPORTANT FOR USER:');
      debugPrint('   1. Check your email (including spam folder)');
      debugPrint('   2. Use incognito/private browsing to open the link');
      debugPrint('   3. Click the link ONCE only');
      debugPrint('   4. Complete password reset immediately');
      debugPrint('   5. Link expires in 1 hour');
      debugPrint('');
    } catch (e) {
      debugPrint('❌ Password reset error: $e');

      // Provide user-friendly error messages
      String errorMessage = 'Failed to send password reset email.';

      if (e.toString().contains('user-not-found')) {
        errorMessage = 'No account found with this email address.';
      } else if (e.toString().contains('invalid-email')) {
        errorMessage = 'Invalid email address.';
      } else if (e.toString().contains('too-many-requests')) {
        errorMessage = 'Too many requests. Please try again in a few minutes.';
        debugPrint('⚠️  Too many password reset attempts detected.');
        debugPrint('   This is a security measure. Please wait 5-10 minutes.');
      } else if (e.toString().contains('network-request-failed')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (e.toString().contains('unauthorized-domain') ||
          e.toString().contains('invalid-continue-uri')) {
        errorMessage = 'Configuration error. Using default settings instead.';
        debugPrint('⚠️  Domain authorization issue detected.');
        debugPrint('   Falling back to default Firebase configuration.');

        // Retry without custom ActionCodeSettings
        try {
          await _auth.sendPasswordResetEmail(email: email);
          debugPrint('✅ Retry successful with default configuration');
          return; // Success on retry
        } catch (retryError) {
          debugPrint('❌ Retry also failed: $retryError');
          errorMessage =
              'Failed to send password reset email. Please try again later.';
        }
      }

      throw Exception(errorMessage);
    }
  }

  /// Update user password with re-authentication
  Future<void> updatePassword(
      String currentPassword, String newPassword) async {
    try {
      final user = _auth.currentUser;
      if (user == null || user.email == null) {
        throw Exception('No user logged in');
      }

      // Re-authenticate user with current password
      final credential = EmailAuthProvider.credential(
        email: user.email!,
        password: currentPassword,
      );

      await user.reauthenticateWithCredential(credential);

      // Update to new password
      await user.updatePassword(newPassword);

      notifyListeners();
    } on FirebaseAuthException catch (e) {
      if (e.code == 'wrong-password') {
        throw Exception('Current password is incorrect');
      } else if (e.code == 'weak-password') {
        throw Exception('New password is too weak');
      } else {
        throw Exception(e.message ?? 'Failed to update password');
      }
    } catch (e) {
      debugPrint('Password update error: $e');
      rethrow;
    }
  }

  Future<bool> deleteAccount() async {
    try {
      await _auth.currentUser?.delete();
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Delete account error: $e');
      return false;
    }
  }

  void _setLoading(bool value) {
    if (_isLoading == value) return;
    _isLoading = value;
    notifyListeners();
  }

  /// Clear the error message
  /// Note: Does not call notifyListeners() to avoid triggering AuthWrapper rebuild
  void clearError() {
    errorMessage = null;
  }

  /// Map Firebase error codes to user-friendly messages
  String _getFriendlyErrorMessage(String code) {
    switch (code) {
      case 'user-not-found':
      case 'wrong-password':
      case 'invalid-credential':
        // Generic message to prevent account enumeration
        return 'Invalid email or password. Please check your credentials.';
      case 'invalid-email':
        return 'Invalid email address format.';
      case 'user-disabled':
        return 'This account has been disabled.';
      case 'too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'network-request-failed':
        return 'Network error. Please check your internet connection.';
      case 'operation-not-allowed':
        return 'This sign-in method is not enabled.';
      default:
        return 'Login failed. Please check your credentials and try again.';
    }
  }
}
