import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_profile.dart';

/// Enhanced AuthService with Firebase Authentication and User Profile Management
class AuthService extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  User? get currentUser => _auth.currentUser;
  bool get isAuthenticated => _auth.currentUser != null;

  UserProfile? _userProfile;
  UserProfile? get userProfile => _userProfile;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  AuthService() {
    // Listen to auth state changes
    _auth.authStateChanges().listen((User? user) async {
      if (user != null) {
        debugPrint('🔄 User signed in: ${user.uid}');
        await _loadUserProfile(user.uid);
      } else {
        debugPrint('👋 User signed out');
        _userProfile = null;
      }
      notifyListeners();
    });
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String? error) {
    _errorMessage = error;
    notifyListeners();
  }

  Future<void> _loadUserProfile(String uid) async {
    try {
      final doc = await _firestore.collection('users').doc(uid).get();
      if (doc.exists) {
        _userProfile = UserProfile.fromJson({...doc.data()!, 'id': uid});
      }
    } catch (e) {
      debugPrint('Error loading user profile: $e');
    }
  }

  Future<User?> signUp(String email, String password, String displayName, {String? phoneNumber, String? location, String? nationality}) async {
    _setLoading(true);
    _setError(null);

    try {
      final UserCredential result = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      // Update display name
      await result.user?.updateDisplayName(displayName);
      await result.user?.reload();

      // Create user profile in Firestore
      if (result.user != null) {
        final userProfile = UserProfile(
          id: result.user!.uid,
          email: email,
          displayName: displayName,
          phoneNumber: phoneNumber,
          location: location,
          nationality: nationality,
          createdAt: DateTime.now(),
          visitedChurches: [],
          favoriteChurches: [],
          forVisitChurches: [],
          accountType: 'public',
        );

        await _firestore.collection('users').doc(result.user!.uid).set(userProfile.toJson());
        _userProfile = userProfile;
      }

      _setLoading(false);
      return _auth.currentUser;
    } on FirebaseAuthException catch (e) {
      _setLoading(false);
      final errorMsg = _getAuthErrorMessage(e.code);
      _setError(errorMsg);
      debugPrint('Firebase Auth Error [${e.code}]: ${e.message}');
      return null;
    } catch (e) {
      _setLoading(false);
      _setError('Registration error: ${e.toString()}');
      debugPrint('Sign up error: $e');
      return null;
    }
  }

  Future<User?> signIn(String email, String password) async {
    _setLoading(true);
    _setError(null);

    try {
      final UserCredential result = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );

      _setLoading(false);
      return result.user;
    } on FirebaseAuthException catch (e) {
      _setLoading(false);
      _setError(_getAuthErrorMessage(e.code));
      debugPrint('Sign in error: ${e.message}');
      return null;
    } catch (e) {
      _setLoading(false);
      _setError('An unexpected error occurred. Please try again.');
      debugPrint('Sign in error: $e');
      return null;
    }
  }

  String _getAuthErrorMessage(String code) {
    switch (code) {
      case 'operation-not-allowed':
        return 'Email/Password authentication is disabled. Please contact administrator to enable it in Firebase Console.';
      case 'user-not-found':
        return 'No user found with this email address.';
      case 'wrong-password':
        return 'Incorrect password. Please try again.';
      case 'email-already-in-use':
        return 'This email address is already registered.';
      case 'weak-password':
        return 'Password is too weak. Please choose a stronger password.';
      case 'invalid-email':
        return 'Invalid email address format.';
      case 'too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return 'Authentication failed. Please try again.';
    }
  }

  Future<bool> signOut() async {
    _setLoading(true);
    _setError(null);

    try {
      await _auth.signOut();
      _userProfile = null;
      
      // Note: ProfileService will automatically reset when auth state changes
      debugPrint('✅ User signed out successfully');
      
      _setLoading(false);
      notifyListeners();
      return true;
    } catch (e) {
      _setLoading(false);
      _setError('Failed to sign out. Please try again.');
      debugPrint('❌ Sign out error: $e');
      return false;
    }
  }

  Future<void> updateProfile(String? displayName) async {
    _setLoading(true);
    _setError(null);

    try {
      await _auth.currentUser?.updateDisplayName(displayName);
      await _auth.currentUser?.reload();

      // Also update the user profile in Firestore if it exists
      if (_userProfile != null && displayName != null) {
        await updateUserProfile(displayName: displayName);
      }

      _setLoading(false);
      notifyListeners();
    } catch (e) {
      _setLoading(false);
      _setError('Failed to update profile. Please try again.');
      debugPrint('Profile update error: $e');
    }
  }

  Future<bool> sendPasswordResetEmail(String email) async {
    _setLoading(true);
    _setError(null);

    try {
      await _auth.sendPasswordResetEmail(email: email);
      _setLoading(false);
      return true;
    } on FirebaseAuthException catch (e) {
      _setLoading(false);
      _setError(_getAuthErrorMessage(e.code));
      debugPrint('Password reset error: ${e.message}');
      return false;
    } catch (e) {
      _setLoading(false);
      _setError('Failed to send password reset email. Please try again.');
      debugPrint('Password reset error: $e');
      return false;
    }
  }

  Future<bool> deleteAccount() async {
    _setLoading(true);
    _setError(null);

    try {
      final uid = _auth.currentUser?.uid;
      if (uid != null) {
        // Delete user profile from Firestore
        await _firestore.collection('users').doc(uid).delete();
        // Delete Firebase Auth account
        await _auth.currentUser?.delete();
      }
      _userProfile = null;
      _setLoading(false);
      return true;
    } catch (e) {
      _setLoading(false);
      _setError('Failed to delete account. Please try again.');
      debugPrint('Delete account error: $e');
      return false;
    }
  }

  // User Profile Management Methods
  Future<bool> updateUserProfile({
    String? displayName,
    String? phoneNumber,
    String? location,
    String? bio,
    String? nationality,
  }) async {
    if (_userProfile == null || _auth.currentUser == null) return false;

    _setLoading(true);
    _setError(null);

    try {
      // Update Firebase Auth display name if provided
      if (displayName != null && displayName != _auth.currentUser!.displayName) {
        await _auth.currentUser!.updateDisplayName(displayName);
        await _auth.currentUser!.reload();
      }

      // Update Firestore user profile
      final updates = <String, dynamic>{};
      if (displayName != null) updates['displayName'] = displayName;
      if (phoneNumber != null) updates['phoneNumber'] = phoneNumber;
      if (location != null) updates['location'] = location;
      if (bio != null) updates['bio'] = bio;
      if (nationality != null) updates['nationality'] = nationality;
      updates['updatedAt'] = FieldValue.serverTimestamp();

      await _firestore.collection('users').doc(_userProfile!.id).update(updates);

      // Update local profile
      _userProfile = _userProfile!.copyWith(
        displayName: displayName ?? _userProfile!.displayName,
        phoneNumber: phoneNumber ?? _userProfile!.phoneNumber,
        location: location ?? _userProfile!.location,
        bio: bio ?? _userProfile!.bio,
        nationality: nationality ?? _userProfile!.nationality,
      );

      _setLoading(false);
      notifyListeners();
      return true;
    } catch (e) {
      _setLoading(false);
      _setError('Failed to update profile. Please try again.');
      debugPrint('Profile update error: $e');
      return false;
    }
  }

  Future<bool> addVisitedChurch(String churchId) async {
    if (_userProfile == null) {
      _setError('User profile not loaded');
      return false;
    }

    if (churchId.isEmpty) {
      _setError('Invalid church ID');
      return false;
    }

    // Check if already visited
    if (_userProfile!.visitedChurches.contains(churchId)) {
      return true; // Already visited
    }

    try {
      await _firestore.collection('users').doc(_userProfile!.id).update({
        'visitedChurches': FieldValue.arrayUnion([churchId]),
        'forVisitChurches': FieldValue.arrayRemove([churchId]), // Remove from for visit if exists
      });

      _userProfile = _userProfile!.copyWith(
        visitedChurches: [..._userProfile!.visitedChurches, churchId],
        forVisitChurches: _userProfile!.forVisitChurches.where((id) => id != churchId).toList(),
      );
      notifyListeners();
      return true;
    } catch (e) {
      _setError('Failed to mark church as visited');
      debugPrint('Error adding visited church: $e');
      return false;
    }
  }

  Future<bool> addFavoriteChurch(String churchId) async {
    if (_userProfile == null) {
      _setError('User profile not loaded');
      return false;
    }

    if (churchId.isEmpty) {
      _setError('Invalid church ID');
      return false;
    }

    // Check if already favorited
    if (_userProfile!.favoriteChurches.contains(churchId)) {
      return true; // Already favorited
    }

    try {
      await _firestore.collection('users').doc(_userProfile!.id).update({
        'favoriteChurches': FieldValue.arrayUnion([churchId]),
      });

      _userProfile = _userProfile!.copyWith(
        favoriteChurches: [..._userProfile!.favoriteChurches, churchId],
      );
      notifyListeners();
      return true;
    } catch (e) {
      _setError('Failed to add church to favorites');
      debugPrint('Error adding favorite church: $e');
      return false;
    }
  }

  Future<bool> removeFavoriteChurch(String churchId) async {
    if (_userProfile == null) return false;

    try {
      await _firestore.collection('users').doc(_userProfile!.id).update({
        'favoriteChurches': FieldValue.arrayRemove([churchId]),
      });

      _userProfile = _userProfile!.copyWith(
        favoriteChurches: _userProfile!.favoriteChurches.where((id) => id != churchId).toList(),
      );
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Error removing favorite church: $e');
      return false;
    }
  }

  Future<bool> addForVisitChurch(String churchId) async {
    if (_userProfile == null) return false;

    try {
      await _firestore.collection('users').doc(_userProfile!.id).update({
        'forVisitChurches': FieldValue.arrayUnion([churchId]),
      });

      _userProfile = _userProfile!.copyWith(
        forVisitChurches: [..._userProfile!.forVisitChurches, churchId],
      );
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Error adding for visit church: $e');
      return false;
    }
  }

  Future<bool> removeForVisitChurch(String churchId) async {
    if (_userProfile == null) return false;

    try {
      await _firestore.collection('users').doc(_userProfile!.id).update({
        'forVisitChurches': FieldValue.arrayRemove([churchId]),
      });

      _userProfile = _userProfile!.copyWith(
        forVisitChurches: _userProfile!.forVisitChurches.where((id) => id != churchId).toList(),
      );
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Error removing for visit church: $e');
      return false;
    }
  }

  // Helper methods for checking user interactions with churches
  bool hasVisitedChurch(String churchId) {
    return _userProfile?.visitedChurches.contains(churchId) ?? false;
  }

  bool hasFavoriteChurch(String churchId) {
    return _userProfile?.favoriteChurches.contains(churchId) ?? false;
  }

  bool hasForVisitChurch(String churchId) {
    return _userProfile?.forVisitChurches.contains(churchId) ?? false;
  }

  void clearError() {
    _setError(null);
  }

  // Get user statistics
  Map<String, int> getUserStats() {
    if (_userProfile == null) {
      return {
        'visitedChurches': 0,
        'favoriteChurches': 0,
        'forVisitChurches': 0,
        'journalEntries': 0,
      };
    }

    return {
      'visitedChurches': _userProfile!.visitedChurches.length,
      'favoriteChurches': _userProfile!.favoriteChurches.length,
      'forVisitChurches': _userProfile!.forVisitChurches.length,
      'journalEntries': _userProfile!.journalEntries.length,
    };
  }

  // Get progress percentage for visited churches
  double getVisitProgress() {
    if (_userProfile == null) return 0.0;
    return _userProfile!.progressPercentage;
  }

  // Get motivational message
  String getMotivationalMessage() {
    if (_userProfile == null) return 'Start your spiritual journey today!';
    return _userProfile!.motivationalMessage;
  }

  // Check if user has completed profile setup
  bool get isProfileComplete {
    if (_userProfile == null) return false;
    return _userProfile!.displayName.isNotEmpty &&
           _userProfile!.email.isNotEmpty;
  }

  // Refresh user profile from Firestore
  Future<bool> refreshUserProfile() async {
    if (!isAuthenticated) return false;

    _setLoading(true);
    try {
      await _loadUserProfile(_auth.currentUser!.uid);
      _setLoading(false);
      return true;
    } catch (e) {
      _setLoading(false);
      _setError('Failed to refresh profile');
      debugPrint('Error refreshing profile: $e');
      return false;
    }
  }

  // Update password
  Future<void> updatePassword(String currentPassword, String newPassword) async {
    if (!isAuthenticated) {
      throw Exception('User not authenticated');
    }

    final user = _auth.currentUser!;

    // Re-authenticate user with current password
    final credential = EmailAuthProvider.credential(
      email: user.email!,
      password: currentPassword,
    );

    try {
      // Re-authenticate
      await user.reauthenticateWithCredential(credential);

      // Update password
      await user.updatePassword(newPassword);

      debugPrint('✅ Password updated successfully');
    } on FirebaseAuthException catch (e) {
      debugPrint('❌ Password update error: ${e.code} - ${e.message}');
      if (e.code == 'wrong-password') {
        throw Exception('Current password is incorrect');
      } else if (e.code == 'weak-password') {
        throw Exception('New password is too weak');
      } else if (e.code == 'requires-recent-login') {
        throw Exception('Please logout and login again to change password');
      } else {
        throw Exception(e.message ?? 'Failed to update password');
      }
    }
  }
}
