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
    _setLoading(true);
    errorMessage = null;
    try {
      final UserCredential result = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      notifyListeners();
      return result.user;
    } on FirebaseAuthException catch (e) {
      errorMessage = e.message;
      debugPrint('Sign in error: $e');
      return null;
    } catch (e) {
      errorMessage = 'Unexpected error during sign in';
      debugPrint('Sign in error: $e');
      return null;
    } finally {
      _setLoading(false);
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
      await _auth.sendPasswordResetEmail(email: email);
    } catch (e) {
      debugPrint('Password reset error: $e');
    }
  }

  /// Update user password with re-authentication
  Future<void> updatePassword(String currentPassword, String newPassword) async {
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
}
