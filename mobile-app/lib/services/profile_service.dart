import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'dart:convert';
import 'dart:io';
import '../models/user_profile.dart';

class ProfileService extends ChangeNotifier {
  UserProfile? _userProfile;
  final ImagePicker _imagePicker = ImagePicker();
  // Make Firebase dependencies optional/lazy so tests can run without Firebase initialization
  FirebaseFirestore? _firestore;
  FirebaseAuth? _auth;
  bool _isLoading = false;
  String? _errorMessage;

  ProfileService({FirebaseFirestore? firestore, FirebaseAuth? auth}) {
    _firestore = firestore ?? _tryGetFirestore();
    _auth = auth ?? _tryGetAuth();
  }

  FirebaseFirestore? _tryGetFirestore() {
    try {
      return FirebaseFirestore.instance;
    } catch (_) {
      return null;
    }
  }

  FirebaseAuth? _tryGetAuth() {
    try {
      return FirebaseAuth.instance;
    } catch (_) {
      return null;
    }
  }

  UserProfile? get userProfile => _userProfile;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  /// Load user profile from Firebase or create a new one
  Future<void> loadUserProfile() async {
    _setLoading(true);
    _setError(null);

    try {
      // Add null safety check for web platform
      User? currentUser;
      try {
        currentUser = _auth?.currentUser;
        debugPrint(
            '🔍 [PROFILE SERVICE] Firebase Auth current user: ${currentUser?.uid}');
        debugPrint('🔍 [PROFILE SERVICE] User email: ${currentUser?.email}');
        debugPrint(
            '🔍 [PROFILE SERVICE] User displayName: ${currentUser?.displayName}');
      } catch (e) {
        debugPrint('⚠️ [PROFILE SERVICE] Error accessing Firebase Auth: $e');
        _userProfile = null;
        _setLoading(false);
        notifyListeners();
        return;
      }

      if (currentUser == null) {
        debugPrint('⚠️ [PROFILE SERVICE] No authenticated user found');
        debugPrint('⚠️ [PROFILE SERVICE] User needs to log in first!');
        _userProfile = null;
        _setError('Please log in to view your profile');
        _setLoading(false);
        notifyListeners();
        return;
      }

      debugPrint(
          '🔄 [PROFILE SERVICE] Loading profile for user: ${currentUser.uid}');
      debugPrint('🔄 [PROFILE SERVICE] Email: ${currentUser.email}');

      // Try to load from Firestore first
      if (_firestore == null) {
        debugPrint(
            '⚠️ [PROFILE SERVICE] Firestore unavailable (not initialized)');
        _userProfile = null;
        _setError('Please log in (Firestore unavailable)');
        _setLoading(false);
        notifyListeners();
        return;
      }
      final userDoc =
          await _firestore!.collection('users').doc(currentUser.uid).get();

      if (userDoc.exists && userDoc.data() != null) {
        debugPrint('✅ [PROFILE SERVICE] Found user profile in Firestore');
        final userData = userDoc.data()!;
        userData['id'] = currentUser.uid; // Ensure ID is set
        _userProfile = UserProfile.fromJson(userData);
        debugPrint(
            '✅ [PROFILE SERVICE] Loaded profile: ${_userProfile?.displayName ?? ""} (${_userProfile?.email ?? ""})');
      } else {
        debugPrint(
            '🆕 [PROFILE SERVICE] Creating new user profile from Firebase Auth data');
        // Create a new profile from Firebase Auth data
        _userProfile = await _createProfileFromAuthUser(currentUser);
        debugPrint(
            '🆕 [PROFILE SERVICE] Created profile: ${_userProfile?.displayName ?? ""} (${_userProfile?.email ?? ""})');
        // Save the new profile to Firestore
        await _saveProfileToFirestore();
        debugPrint('💾 [PROFILE SERVICE] Saved new profile to Firestore');
      }

      // Also try to load from SharedPreferences as backup
      await _loadFromSharedPreferences();

      debugPrint('✅ [PROFILE SERVICE] Profile load complete!');
      debugPrint(
          '✅ [PROFILE SERVICE] Final profile: ${_userProfile?.id ?? ""} - ${_userProfile?.displayName ?? ""}');
    } catch (e) {
      debugPrint('❌ [PROFILE SERVICE] Error loading profile: $e');
      _setError('Failed to load profile: $e');
      // Don't fallback to demo data - keep the error state
    }

    _setLoading(false);
    notifyListeners();
  }

  /// Create a new UserProfile from Firebase Auth user data
  Future<UserProfile> _createProfileFromAuthUser(User user) async {
    return UserProfile(
      id: user.uid,
      displayName: user.displayName ?? 'VISITA User',
      email: user.email ?? '',
      profileImageUrl: user.photoURL,
      phoneNumber: user.phoneNumber,
      parish: 'Not specified',
      affiliation: 'Public User',
      accountType: 'public',
      createdAt: user.metadata.creationTime ?? DateTime.now(),
      visitedChurches: [],
      favoriteChurches: [],
      forVisitChurches: [],
      journalEntries: [],
      preferences: UserPreferences.defaultPreferences(),
    );
  }

  /// Load profile from SharedPreferences as backup
  Future<void> _loadFromSharedPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final profileJson =
          prefs.getString('user_profile_${_userProfile?.id ?? ""}');

      if (profileJson != null) {
        final Map<String, dynamic> localData = jsonDecode(profileJson);
        // Merge local data with Firestore data (local data takes precedence for certain fields)
        if (_userProfile != null) {
          _userProfile = _userProfile!.copyWith(
            visitedChurches: List<String>.from(
                localData['visitedChurches'] ?? _userProfile!.visitedChurches),
            favoriteChurches: List<String>.from(localData['favoriteChurches'] ??
                _userProfile!.favoriteChurches),
            forVisitChurches: List<String>.from(localData['forVisitChurches'] ??
                _userProfile!.forVisitChurches),
            journalEntries: (localData['journalEntries'] as List<dynamic>?)
                    ?.map((e) => JournalEntry.fromJson(e))
                    .toList() ??
                _userProfile!.journalEntries,
            preferences: localData['preferences'] != null
                ? UserPreferences.fromJson(localData['preferences'])
                : _userProfile!.preferences,
          );
        }
        debugPrint('📱 Merged local profile data with Firestore data');
      }
    } catch (e) {
      debugPrint('⚠️ Error loading from SharedPreferences: $e');
    }
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    if (!loading) notifyListeners();
  }

  void _setError(String? error) {
    _errorMessage = error;
    notifyListeners();
  }

  Future<void> updateProfile({
    String? displayName,
    String? email,
    String? parish,
    String? affiliation,
    String? phoneNumber,
    String? location,
    String? bio,
    String? nationality,
  }) async {
    _setLoading(true);
    _setError(null);

    try {
      if (_userProfile != null) {
        _userProfile = _userProfile!.copyWith(
          displayName: displayName,
          email: email,
          parish: parish,
          affiliation: affiliation,
          phoneNumber: phoneNumber,
          location: location,
          bio: bio,
          nationality: nationality,
        );
      }

      // Save to both Firestore and SharedPreferences
      await _saveProfileToFirestore();
      await _saveProfile();

      // Also update Firebase Auth profile if displayName changed
      if (displayName != null && _auth?.currentUser != null) {
        await _auth!.currentUser!.updateDisplayName(displayName);
      }

      debugPrint('✅ Profile updated successfully');
    } catch (e) {
      debugPrint('❌ Error updating profile: $e');
      _setError('Failed to update profile: $e');
    }

    _setLoading(false);
    notifyListeners();
  }

  /// Save profile to Firestore
  Future<void> _saveProfileToFirestore() async {
    try {
      User? currentUser;
      try {
        currentUser = _auth?.currentUser;
      } catch (e) {
        debugPrint('⚠️ Error accessing Firebase Auth for save: $e');
        return;
      }

      if (currentUser == null) {
        debugPrint('⚠️ No authenticated user, cannot save to Firestore');
        return;
      }

      if (_firestore == null) {
        debugPrint('⚠️ Firestore not available, skipping save');
        return;
      }
      if (_userProfile != null) {
        final profileData = _userProfile!.toJson();
        await _firestore!.collection('users').doc(currentUser.uid).set(
              profileData,
              SetOptions(merge: true), // Merge with existing data
            );
        debugPrint('✅ Profile saved to Firestore');
      }
    } catch (e) {
      debugPrint('❌ Error saving to Firestore: $e');
      rethrow;
    }
  }

  Future<void> updateProfileImage() async {
    _setLoading(true);
    _setError(null);

    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 85,
      );

      if (image != null && _userProfile != null) {
        debugPrint('📤 Uploading profile image to Firebase Storage...');

        // Upload to Firebase Storage
        final storage = FirebaseStorage.instance;
        final userId = _userProfile!.id;
        final fileName = 'profile_$userId.jpg';
        final ref = storage.ref().child('profile_images/$fileName');

        // Upload file with metadata
        final metadata = SettableMetadata(
          contentType: 'image/jpeg',
          cacheControl: 'public, max-age=31536000',
          customMetadata: {
            'uploadedBy': 'mobile-app',
            'userId': userId,
          },
        );

        final uploadTask = await ref.putFile(File(image.path), metadata);
        debugPrint('✅ Upload complete, getting download URL...');

        // Get download URL
        final downloadUrl = await uploadTask.ref.getDownloadURL();
        debugPrint('✅ Download URL obtained: $downloadUrl');

        // Update profile with new image URL
        _userProfile = _userProfile!.copyWith(
          profileImageUrl: downloadUrl,
        );

        await _saveProfileToFirestore();
        await _saveProfile();
        debugPrint('✅ Profile image updated successfully');
      }
    } catch (e) {
      debugPrint('❌ Error updating profile image: $e');
      _setError('Failed to update profile image: $e');
    }

    _setLoading(false);
    notifyListeners();
  }

  /// Delete profile image and revert to initials
  Future<void> deleteProfileImage() async {
    if (_userProfile == null || _userProfile!.profileImageUrl == null) {
      return;
    }

    _setLoading(true);
    _setError(null);

    try {
      debugPrint('🗑️ Deleting profile image...');

      // Try to delete from Firebase Storage
      final imageUrl = _userProfile!.profileImageUrl!;
      if (imageUrl.contains('firebase')) {
        try {
          final storage = FirebaseStorage.instance;
          final ref = storage.refFromURL(imageUrl);
          await ref.delete();
          debugPrint('✅ Image deleted from Firebase Storage');
        } catch (e) {
          debugPrint('⚠️ Could not delete image from storage: $e');
          // Continue anyway to remove the URL from profile
        }
      }

      // Update profile to remove image URL
      _userProfile = _userProfile!.copyWith(
        profileImageUrl: null,
      );

      await _saveProfileToFirestore();
      await _saveProfile();
      debugPrint('✅ Profile image removed successfully');
    } catch (e) {
      debugPrint('❌ Error deleting profile image: $e');
      _setError('Failed to delete profile image: $e');
    }

    _setLoading(false);
    notifyListeners();
  }

  Future<void> addJournalEntry(JournalEntry entry) async {
    _setLoading(true);
    _setError(null);

    try {
      if (_userProfile != null) {
        final updatedEntries =
            List<JournalEntry>.from(_userProfile!.journalEntries);
        updatedEntries.add(entry);
        _userProfile = _userProfile!.copyWith(journalEntries: updatedEntries);
      }
      await _saveProfileToFirestore();
      await _saveProfile();
      debugPrint('✅ Journal entry added');
    } catch (e) {
      debugPrint('❌ Error adding journal entry: $e');
      _setError('Failed to add journal entry: $e');
    }

    _setLoading(false);
    notifyListeners();
  }

  Future<void> toggleFavoriteChurch(String churchId) async {
    try {
      if (_userProfile != null) {
        final updatedFavorites =
            List<String>.from(_userProfile!.favoriteChurches);

        if (updatedFavorites.contains(churchId)) {
          updatedFavorites.remove(churchId);
        } else {
          updatedFavorites.add(churchId);
        }

        _userProfile =
            _userProfile!.copyWith(favoriteChurches: updatedFavorites);
      }
      await _saveProfileToFirestore();
      await _saveProfile();
      debugPrint('✅ Favorite church toggled for: $churchId');
    } catch (e) {
      debugPrint('❌ Error toggling favorite: $e');
      _setError('Failed to update favorites: $e');
    }

    notifyListeners();
  }

  Future<void> markChurchAsVisited(String churchId) async {
    try {
      if (_userProfile != null) {
        final updatedVisited = List<String>.from(_userProfile!.visitedChurches);
        final updatedForVisit =
            List<String>.from(_userProfile!.forVisitChurches);

        if (!updatedVisited.contains(churchId)) {
          updatedVisited.add(churchId);
          // Remove from for visit list if it was there
          updatedForVisit.remove(churchId);

          _userProfile = _userProfile!.copyWith(
            visitedChurches: updatedVisited,
            forVisitChurches: updatedForVisit,
          );
          await _saveProfileToFirestore();
          await _saveProfile();
          debugPrint('✅ Church marked as visited: $churchId');
          debugPrint('📊 Current visited churches: $updatedVisited');
        } else {
          debugPrint('ℹ️ Church $churchId already in visited list');
        }
      } else {
        debugPrint('⚠️ Cannot mark as visited: userProfile is null');
      }
    } catch (e) {
      debugPrint('❌ Error marking church as visited: $e');
      _setError('Failed to mark church as visited: $e');
    }

    notifyListeners();
  }

  /// Remove invalid/deleted church IDs from the visited churches list
  /// This is called when churches are detected as missing from Firestore
  Future<void> removeInvalidVisitedChurches(List<String> invalidIds) async {
    try {
      if (_userProfile != null && invalidIds.isNotEmpty) {
        final updatedVisited = List<String>.from(_userProfile!.visitedChurches);

        for (String invalidId in invalidIds) {
          updatedVisited.remove(invalidId);
          debugPrint('🧹 Removed invalid church ID from visited: $invalidId');
        }

        _userProfile = _userProfile!.copyWith(visitedChurches: updatedVisited);
        await _saveProfileToFirestore();
        await _saveProfile();
        debugPrint(
            '✅ Cleaned up ${invalidIds.length} invalid visited church IDs');
      }
    } catch (e) {
      debugPrint('❌ Error removing invalid visited churches: $e');
    }

    notifyListeners();
  }

  /// Remove invalid/deleted church IDs from the for visit churches list
  /// This is called when churches are detected as missing from Firestore
  Future<void> removeInvalidForVisitChurches(List<String> invalidIds) async {
    try {
      if (_userProfile != null && invalidIds.isNotEmpty) {
        final updatedForVisit =
            List<String>.from(_userProfile!.forVisitChurches);

        for (String invalidId in invalidIds) {
          updatedForVisit.remove(invalidId);
          debugPrint('🧹 Removed invalid church ID from for visit: $invalidId');
        }

        _userProfile =
            _userProfile!.copyWith(forVisitChurches: updatedForVisit);
        await _saveProfileToFirestore();
        await _saveProfile();
        debugPrint(
            '✅ Cleaned up ${invalidIds.length} invalid for visit church IDs');
      }
    } catch (e) {
      debugPrint('❌ Error removing invalid for visit churches: $e');
    }

    notifyListeners();
  }

  Future<void> toggleForVisitChurch(String churchId) async {
    try {
      if (_userProfile != null) {
        final updatedForVisit =
            List<String>.from(_userProfile!.forVisitChurches);
        final visitedChurches = _userProfile!.visitedChurches;

        if (updatedForVisit.contains(churchId)) {
          updatedForVisit.remove(churchId);
          debugPrint('📤 Removing church $churchId from For Visit list');
        } else {
          // Don't add to For Visit if already visited
          if (visitedChurches.contains(churchId)) {
            debugPrint(
                'ℹ️ Church $churchId is already visited, not adding to For Visit');
            return;
          }
          updatedForVisit.add(churchId);
          debugPrint('📥 Adding church $churchId to For Visit list');
        }

        _userProfile =
            _userProfile!.copyWith(forVisitChurches: updatedForVisit);

        await _saveProfileToFirestore();
        await _saveProfile();
        debugPrint('✅ Church toggled for visit: $churchId');
        debugPrint('📊 Current For Visit churches: $updatedForVisit');
      } else {
        debugPrint('⚠️ Cannot toggle For Visit: userProfile is null');
      }
    } catch (e) {
      debugPrint('❌ Error toggling for visit: $e');
      _setError('Failed to update visit list: $e');
    }

    notifyListeners();
  }

  Future<void> updatePreferences(UserPreferences preferences) async {
    try {
      if (_userProfile != null) {
        _userProfile = _userProfile!.copyWith(preferences: preferences);
      }
      await _saveProfileToFirestore();
      await _saveProfile();
      debugPrint('✅ Preferences updated');
    } catch (e) {
      debugPrint('❌ Error updating preferences: $e');
      _setError('Failed to update preferences: $e');
    }

    notifyListeners();
  }

  /// Create a new profile (for registration)
  Future<void> createProfile({
    required String displayName,
    required String email,
    String? parish,
    String? affiliation,
    String? phoneNumber,
    String? location,
    String? nationality,
  }) async {
    _setLoading(true);
    _setError(null);

    try {
      User? currentUser;
      try {
        currentUser = _auth?.currentUser;
      } catch (e) {
        debugPrint('⚠️ Error accessing Firebase Auth for create: $e');
        // Create profile with generated ID instead
        currentUser = null;
      }

      final userId =
          currentUser?.uid ?? DateTime.now().millisecondsSinceEpoch.toString();

      _userProfile = UserProfile(
        id: userId,
        displayName: displayName,
        email: email,
        parish: parish ?? 'Not specified',
        affiliation: affiliation ?? 'Public User',
        phoneNumber: phoneNumber,
        location: location,
        nationality: nationality,
        accountType: 'public',
        createdAt: DateTime.now(),
        visitedChurches: [],
        favoriteChurches: [],
        forVisitChurches: [],
        journalEntries: [],
        preferences: UserPreferences.defaultPreferences(),
      );

      if (currentUser != null) {
        await _saveProfileToFirestore();
      }
      await _saveProfile();
      debugPrint('✅ New profile created');
    } catch (e) {
      debugPrint('❌ Error creating profile: $e');
      _setError('Failed to create profile: $e');
    }

    _setLoading(false);
    notifyListeners();
  }

  /// Save profile to SharedPreferences (local backup)
  Future<void> _saveProfile() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (_userProfile != null) {
        final profileJson = jsonEncode(_userProfile!.toJson());
        await prefs.setString('user_profile_${_userProfile!.id}', profileJson);
        debugPrint('✅ Profile saved to SharedPreferences');
      }
    } catch (e) {
      debugPrint('⚠️ Error saving to SharedPreferences: $e');
      // Don't throw error for SharedPreferences failure
    }
  }

  String getRecommendedNextChurch() {
    // This would typically use location data and user preferences
    // For demo purposes, return a static recommendation
    final unvisitedChurches = [
      'Buenavista Church',
      'Talibon Church',
      'Loon Church',
      'Maribojoc Church',
      'Antequera Church',
    ];

    for (final church in unvisitedChurches) {
      if (_userProfile == null ||
          !_userProfile!.visitedChurches
              .contains(church.toLowerCase().replaceAll(' ', '_'))) {
        return church;
      }
    }

    return 'Baclayon Church'; // Fallback
  }

  List<String> getVisitHistory() {
    // Return a list of visited churches with dates
    // For demo purposes, return the visited churches list
    return _userProfile?.visitedChurches ?? [];
  }

  Future<String> shareProgress() async {
    final visited = _userProfile?.visitedChurches.length ?? 0;
    const total = 25; // Total heritage churches
    final percentage = total > 0 ? (visited / total * 100).round() : 0;

    return '''
🏛️ My VISITA Bohol Heritage Journey 🏛️

👤 ${_userProfile?.displayName ?? "VISITA User"}
🌟 Progress: $visited/$total churches visited ($percentage%)
❤️ Favorites: ${_userProfile?.favoriteChurches.length ?? 0} churches
📔 Journal entries: ${_userProfile?.journalEntries.length ?? 0}
⛪ Parish: ${_userProfile?.parish ?? "Not specified"}

${_userProfile?.motivationalMessage ?? "Let's explore Bohol's heritage together!"}

Join me in exploring Bohol's beautiful heritage churches! 
Download VISITA app and start your spiritual journey.

#VisitaBohol #HeritageChurches #PilgrimagePH
''';
  }

  /// Clear profile data (for sign out)
  void clearProfile() {
    _userProfile = null;
    _isLoading = false;
    _errorMessage = null;
    notifyListeners();
  }

  /// Sync with latest Firebase data
  Future<void> syncWithFirebase() async {
    try {
      final currentUser = _auth?.currentUser;
      if (currentUser != null) {
        await loadUserProfile();
      } else {
        debugPrint('⚠️ No authenticated user for sync');
      }
    } catch (e) {
      debugPrint('⚠️ Error syncing with Firebase: $e');
      // Don't throw error, just log it
    }
  }
}
