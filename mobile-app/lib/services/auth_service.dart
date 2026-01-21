/// =============================================================================
/// AUTH_SERVICE.DART - Firebase Authentication Service
/// =============================================================================
///
/// PURPOSE:
/// This service handles all user authentication for the mobile app. It wraps
/// Firebase Authentication and provides a clean API for sign up, sign in,
/// sign out, and password reset operations.
///
/// AUTHENTICATION FLOW:
/// ┌─────────────┐    Sign In/Up    ┌─────────────────────┐
/// │   User      │ ────────────────►│   AuthService       │
/// │   (App UI)  │                  │   (this file)       │
/// └─────────────┘                  └──────────┬──────────┘
///                                             │
///                                             ▼
///                                  ┌─────────────────────┐
///                                  │  Firebase Auth SDK  │
///                                  │  (cloud service)    │
///                                  └──────────┬──────────┘
///                                             │
///                                             ▼
///                                  ┌─────────────────────┐
///                                  │  Firebase Console   │
///                                  │  (user database)    │
///                                  └─────────────────────┘
///
/// KEY METHODS:
/// - signUp(): Create new user account
/// - signIn(): Authenticate existing user
/// - signOut(): End user session
/// - resetPassword(): Send password reset email
///
/// STATE MANAGEMENT:
/// - Extends ChangeNotifier for reactive updates
/// - isAuthenticated: Boolean for auth state
/// - isLoading: Boolean for loading state
/// - errorMessage: String for user-friendly errors
/// - currentUser: Firebase User object when logged in
///
/// ERROR HANDLING:
/// - Catches FirebaseAuthException for specific errors
/// - Converts error codes to user-friendly messages
/// - Examples: "wrong-password" → "Incorrect password"
///
/// WHY CHANGENOTIFIER:
/// - Provider pattern needs ChangeNotifier for reactive updates
/// - notifyListeners() triggers UI rebuilds when auth state changes
/// - AuthWrapper listens and switches between Login/Home
///
/// RELATED FILES:
/// - screens/auth_wrapper.dart: Reacts to isAuthenticated changes
/// - screens/auth/login_screen.dart: Uses signIn method
/// - screens/auth/register_screen.dart: Uses signUp method
/// - main.dart: Registers this as a Provider

import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';

/// Simple AuthService with Firebase Authentication
///
/// This service is registered as a ChangeNotifierProvider in main.dart,
/// making it accessible throughout the app via Provider.of<AuthService>()
/// or context.watch<AuthService>() for reactive updates.
class AuthService extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Public getters for auth state
  User? get currentUser => _auth.currentUser;
  bool get isAuthenticated => _auth.currentUser != null;
  bool get isEmailVerified => _auth.currentUser?.emailVerified ?? false;
  bool get isLoading => _isLoading;
  String? errorMessage;

  // Block status info (populated after login check)
  final bool _isBlocked = false;
  String? _blockReason;
  bool get isBlocked => _isBlocked;
  String? get blockReason => _blockReason;

  bool _isLoading = false;

  /// Constructor - Sets up auth state listener
  ///
  /// Firebase Auth persists login state, so on app restart this listener
  /// will fire with the previously logged in user (if any).
  AuthService() {
    // Listen to auth state changes
    _auth.authStateChanges().listen((User? user) {
      notifyListeners();
    });
  }

  /// Check if user is blocked in Firestore
  /// Returns a map with 'isBlocked' and 'blockReason' if blocked
  /// Returns null if user is not blocked or if user document doesn't exist
  Future<Map<String, dynamic>?> checkIfUserBlocked(String uid) async {
    try {
      debugPrint('🔍 Checking if user $uid is blocked...');
      final userDoc = await _firestore.collection('users').doc(uid).get();

      if (!userDoc.exists) {
        // User document doesn't exist - this is normal for users who signed up
        // before we started creating Firestore documents
        debugPrint(
            'ℹ️ User document not found in Firestore (new or legacy user)');

        // Try to create a basic user document for them
        try {
          final currentUser = _auth.currentUser;
          if (currentUser != null) {
            await _firestore.collection('users').doc(uid).set({
              'uid': uid,
              'email': currentUser.email,
              'displayName': currentUser.displayName ?? 'User',
              'accountType': 'public',
              'isActive': true,
              'isBlocked': false,
              'createdAt': FieldValue.serverTimestamp(),
              'lastLoginAt': FieldValue.serverTimestamp(),
            });
            debugPrint('✅ Created missing user document in Firestore');
          }
        } catch (createError) {
          // Don't fail if we can't create the document
          debugPrint('⚠️ Could not create user document: $createError');
        }

        return null; // Not blocked
      }

      final data = userDoc.data();
      final isBlocked = data?['isBlocked'] == true;
      final blockReason = data?['blockReason'] as String?;

      // Update last login time
      try {
        await _firestore.collection('users').doc(uid).update({
          'lastLoginAt': FieldValue.serverTimestamp(),
        });
      } catch (updateError) {
        // Don't fail if we can't update last login
        debugPrint('⚠️ Could not update lastLoginAt: $updateError');
      }

      if (isBlocked) {
        debugPrint('🚫 User is BLOCKED. Reason: $blockReason');
        return {
          'isBlocked': true,
          'blockReason': blockReason ?? 'No reason provided',
        };
      }

      debugPrint('✅ User is not blocked');
      return null;
    } catch (e) {
      debugPrint('⚠️ Error checking block status: $e');
      // Don't block login on error - let them through
      return null;
    }
  }

  Future<User?> signUp(String email, String password, String displayName,
      {String? nationality}) async {
    _setLoading(true);
    errorMessage = null;

    // CRITICAL: Sign out any existing user first to prevent stale profile data
    // This fixes the bug where previous user's profile was saved for new users
    if (_auth.currentUser != null) {
      debugPrint('⚠️ AuthService: Signing out existing user before new signup');
      await _auth.signOut();
    }

    try {
      debugPrint(
          '🔐 AuthService: Creating new account for $email with name: $displayName');
      final UserCredential result = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      // Update display name
      await result.user?.updateDisplayName(displayName);
      await result.user?.reload();

      // Create COMPLETE user document in Firestore matching UserProfile structure
      if (result.user != null) {
        try {
          final now = DateTime.now();
          await _firestore.collection('users').doc(result.user!.uid).set({
            'id': result.user!.uid,
            'uid': result.user!.uid,
            'email': email,
            'displayName': displayName,
            'profileImageUrl': null,
            'phoneNumber': null,
            'location': null,
            'bio': null,
            'nationality': nationality,
            'parish': 'Not specified',
            'affiliation': 'Public User',
            'accountType': 'public',
            'isActive': true,
            'isBlocked': false,
            'visitedChurches': [],
            'favoriteChurches': [],
            'forVisitChurches': [],
            'journalEntries': [],
            'preferences': {
              'enableNotifications': true,
              'enableFeastDayReminders': true,
              'enableLocationReminders': true,
              'shareProgressPublically': false,
              'preferredLanguage': 'en',
              'darkMode': false,
            },
            'createdAt': now.millisecondsSinceEpoch,
            'lastLoginAt': FieldValue.serverTimestamp(),
          });
          debugPrint('✅ Complete user profile document created in Firestore');
        } catch (firestoreError) {
          // Don't fail signup if Firestore write fails
          debugPrint(
              '⚠️ Failed to create user document in Firestore: $firestoreError');
        }

        // Send email verification using Cloud Function for branded email
        try {
          final functions = FirebaseFunctions.instance;
          final callable = functions.httpsCallable('sendEmailVerification');
          await callable.call({'email': email, 'source': 'mobile'});
          debugPrint('📧 Custom branded verification email sent to $email');
        } catch (cloudFunctionError) {
          // Fallback to Firebase default if Cloud Function fails
          debugPrint(
              '⚠️ Cloud Function failed, using Firebase default: $cloudFunctionError');
          try {
            await result.user!.sendEmailVerification();
            debugPrint('📧 Firebase default verification email sent to $email');
          } catch (e) {
            debugPrint('⚠️ Failed to send verification email: $e');
            // Don't fail signup if verification email fails
          }
        }
      }

      notifyListeners();
      return _auth.currentUser;
    } on FirebaseAuthException catch (e) {
      // Provide user-friendly error messages for common signup errors
      switch (e.code) {
        case 'email-already-in-use':
          errorMessage =
              'This email is already registered. Please sign in or use a different email.';
          break;
        case 'invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'weak-password':
          errorMessage =
              'Password is too weak. Please use at least 6 characters.';
          break;
        case 'operation-not-allowed':
          errorMessage =
              'Email/password accounts are not enabled. Please contact support.';
          break;
        default:
          errorMessage = e.message ?? 'Sign up failed. Please try again.';
      }
      debugPrint('Sign up error: ${e.code} - ${e.message}');
      return null;
    } catch (e) {
      errorMessage = 'Unexpected error during sign up. Please try again.';
      debugPrint('Sign up error: $e');
      return null;
    } finally {
      _setLoading(false);
    }
  }

  /// Send email verification to the current user
  Future<bool> sendEmailVerification() async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        errorMessage = 'No user logged in';
        debugPrint('❌ Cannot send verification email: No user logged in');
        return false;
      }

      if (user.emailVerified) {
        errorMessage = 'Email is already verified';
        debugPrint('ℹ️ Email already verified for ${user.email}');
        return true;
      }

      debugPrint(
          '📧 Attempting to send verification email to ${user.email}...');

      // Use Cloud Function for custom branded email
      // Falls back to Firebase default if Cloud Function fails
      try {
        final functions = FirebaseFunctions.instance;
        final callable = functions.httpsCallable('sendEmailVerification');
        await callable.call({'email': user.email, 'source': 'mobile'});
        debugPrint('✅ Custom branded verification email sent to ${user.email}');
      } catch (cloudFunctionError) {
        // Fallback to Firebase default email if Cloud Function fails
        debugPrint(
            '⚠️ Cloud Function failed, using Firebase default: $cloudFunctionError');
        await user.sendEmailVerification();
        debugPrint(
            '✅ Firebase default verification email sent to ${user.email}');
      }

      return true;
    } on FirebaseAuthException catch (e) {
      debugPrint(
          '❌ FirebaseAuthException sending verification email: ${e.code} - ${e.message}');
      switch (e.code) {
        case 'too-many-requests':
          errorMessage =
              'Too many requests. Please wait a minute before trying again.';
          break;
        case 'user-not-found':
          errorMessage = 'User session expired. Please sign in again.';
          break;
        case 'user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        default:
          errorMessage = e.message ??
              'Failed to send verification email. Please try again.';
      }
      return false;
    } catch (e) {
      debugPrint('❌ Error sending verification email: $e');
      // Check for rate limiting in the error message
      final errorStr = e.toString().toLowerCase();
      if (errorStr.contains('too-many-requests') ||
          errorStr.contains('rate') ||
          errorStr.contains('limit')) {
        errorMessage =
            'Too many requests. Please wait a minute before trying again.';
      } else if (errorStr.contains('network') ||
          errorStr.contains('connection')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else {
        errorMessage = 'Failed to send verification email. Please try again.';
      }
      return false;
    }
  }

  /// Reload the current user and check email verification status
  Future<bool> checkEmailVerified() async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        debugPrint('❌ checkEmailVerified: No current user');
        return false;
      }

      debugPrint('🔄 Reloading user ${user.email} from Firebase...');
      await user.reload();

      // IMPORTANT: Get fresh reference after reload
      final freshUser = _auth.currentUser;
      final isVerified = freshUser?.emailVerified ?? false;

      debugPrint('📧 After reload - emailVerified: $isVerified');

      if (isVerified) {
        debugPrint('✅ Email is verified! Calling notifyListeners...');
      }

      notifyListeners();
      return isVerified;
    } catch (e) {
      debugPrint('❌ Failed to check email verification: $e');
      return false;
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
      debugPrint('🔐 AuthService: Signing out user...');
      await _auth.signOut();
      debugPrint('✅ AuthService: User signed out from Firebase');
      notifyListeners();
    } catch (e) {
      debugPrint('❌ Sign out error: $e');
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

  /// Update user email with verification
  ///
  /// This method uses Firebase's verifyBeforeUpdateEmail which:
  /// 1. Sends a verification email to the NEW email address
  /// 2. Only updates the email after user clicks the verification link
  /// 3. Requires re-authentication first for security
  Future<void> updateEmailWithVerification(
      String newEmail, String currentPassword) async {
    try {
      final user = _auth.currentUser;
      if (user == null || user.email == null) {
        throw Exception('No user logged in');
      }

      // Re-authenticate user with current password (required for sensitive operations)
      final credential = EmailAuthProvider.credential(
        email: user.email!,
        password: currentPassword,
      );
      await user.reauthenticateWithCredential(credential);

      // Send verification to new email - Firebase will update email after verification
      await user.verifyBeforeUpdateEmail(newEmail);

      debugPrint('📧 Verification email sent to new address: $newEmail');
    } on FirebaseAuthException catch (e) {
      debugPrint(
          'FirebaseAuthException during email update: ${e.code} - ${e.message}');
      if (e.code == 'wrong-password' || e.code == 'invalid-credential') {
        throw Exception('Current password is incorrect');
      } else if (e.code == 'email-already-in-use') {
        throw Exception('This email is already registered to another account');
      } else if (e.code == 'invalid-email') {
        throw Exception('Please enter a valid email address');
      } else {
        throw Exception(e.message ?? 'Failed to update email');
      }
    } catch (e) {
      debugPrint('Email update error: $e');
      final errorStr = e.toString().toLowerCase();
      if (errorStr.contains('incorrect') ||
          errorStr.contains('wrong-password') ||
          errorStr.contains('invalid') ||
          errorStr.contains('malformed') ||
          errorStr.contains('expired')) {
        throw Exception('Current password is incorrect');
      }
      rethrow;
    }
  }

  Future<void> sendPasswordResetEmail(String email) async {
    try {
      debugPrint('📧 Sending password reset email to: $email');

      // Use Cloud Function for custom branded email
      // Falls back to Firebase default if Cloud Function fails
      try {
        final functions = FirebaseFunctions.instance;
        final callable = functions.httpsCallable('sendPasswordResetEmail');
        await callable.call({'email': email});
        debugPrint('✅ Custom branded password reset email sent');
      } catch (cloudFunctionError) {
        // Fallback to Firebase default email if Cloud Function fails
        debugPrint(
            '⚠️ Cloud Function failed, using Firebase default: $cloudFunctionError');
        await _auth.sendPasswordResetEmail(email: email);
        debugPrint('✅ Firebase default password reset email sent');
      }

      debugPrint('✅ Password reset email sent successfully');
    } catch (e) {
      debugPrint('❌ Password reset error: $e');
      throw Exception('Failed to send password reset email.');
    }
  }

  /// Update user password with re-authentication
  ///
  /// This method requires the user to provide their current password for
  /// security verification before allowing a password change.
  ///
  /// Common Firebase Auth error codes:
  /// - `invalid-credential`: Wrong password or expired credential (Firebase v5+)
  /// - `wrong-password`: Legacy code for incorrect password
  /// - `weak-password`: New password doesn't meet requirements
  /// - `requires-recent-login`: Session expired, user needs to re-login
  /// - `too-many-requests`: Too many failed attempts
  Future<void> updatePassword(
      String currentPassword, String newPassword) async {
    final user = _auth.currentUser;
    if (user == null || user.email == null) {
      throw Exception('No user logged in');
    }

    try {
      // Re-authenticate user with current password
      final credential = EmailAuthProvider.credential(
        email: user.email!,
        password: currentPassword,
      );

      debugPrint('🔐 Attempting re-authentication for password change...');
      await user.reauthenticateWithCredential(credential);
      debugPrint('✅ Re-authentication successful');

      // Update to new password
      debugPrint('🔄 Updating password...');
      await user.updatePassword(newPassword);
      debugPrint('✅ Password updated successfully');

      notifyListeners();
    } on FirebaseAuthException catch (e) {
      debugPrint(
          '❌ FirebaseAuthException during password update: ${e.code} - ${e.message}');

      // Handle specific Firebase Auth error codes
      // Note: Firebase v5+ uses 'invalid-credential' instead of 'wrong-password'
      switch (e.code) {
        case 'wrong-password':
        case 'invalid-credential':
        case 'INVALID_LOGIN_CREDENTIALS':
          throw Exception('Current password is incorrect');
        case 'weak-password':
          throw Exception(
              'New password is too weak. Please use at least 6 characters.');
        case 'requires-recent-login':
          throw Exception(
              'Session expired. Please log out and log back in, then try again.');
        case 'too-many-requests':
          throw Exception('Too many failed attempts. Please try again later.');
        case 'network-request-failed':
          throw Exception(
              'Network error. Please check your internet connection.');
        default:
          throw Exception(e.message ?? 'Failed to update password');
      }
    } catch (e) {
      debugPrint('❌ Password update error: $e');

      // If it's already an Exception we threw, rethrow it
      if (e is Exception) {
        final errorStr = e.toString();
        if (errorStr.contains('Current password is incorrect') ||
            errorStr.contains('too weak') ||
            errorStr.contains('Session expired') ||
            errorStr.contains('Too many failed') ||
            errorStr.contains('Network error')) {
          rethrow;
        }
      }

      // Check if error message indicates wrong password (fallback handling)
      final errorStr = e.toString().toLowerCase();
      if (errorStr.contains('incorrect') ||
          errorStr.contains('wrong-password') ||
          errorStr.contains('invalid-credential') ||
          errorStr.contains('invalid_login_credentials') ||
          errorStr.contains('malformed') ||
          errorStr.contains('expired')) {
        throw Exception('Current password is incorrect');
      }

      // Unknown error - provide generic message
      throw Exception('Failed to update password. Please try again.');
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
