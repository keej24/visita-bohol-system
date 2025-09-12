import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../models/user_profile.dart';

class ProfileService extends ChangeNotifier {
  UserProfile _userProfile = UserProfile.demo();
  final ImagePicker _imagePicker = ImagePicker();

  UserProfile get userProfile => _userProfile;

  Future<void> loadUserProfile() async {
    // In a real app, this would load from an API or local storage
    // For now, we'll use the demo data
    _userProfile = UserProfile.demo();
    notifyListeners();
  }

  Future<void> updateProfile({
    String? name,
    String? email,
    String? parish,
    String? affiliation,
  }) async {
    _userProfile = _userProfile.copyWith(
      name: name,
      email: email,
      parish: parish,
      affiliation: affiliation,
    );
    await _saveProfile();
    notifyListeners();
  }

  Future<void> updateProfileImage() async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 300,
        maxHeight: 300,
        imageQuality: 80,
      );

      if (image != null) {
        // In a real app, you would upload this to a server
        // For demo purposes, we'll just store the local path
        _userProfile = _userProfile.copyWith(
          profileImageUrl: image.path,
        );
        await _saveProfile();
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error picking image: $e');
    }
  }

  Future<void> addJournalEntry(JournalEntry entry) async {
    final updatedEntries = List<JournalEntry>.from(_userProfile.journalEntries);
    updatedEntries.add(entry);

    _userProfile = _userProfile.copyWith(journalEntries: updatedEntries);
    await _saveProfile();
    notifyListeners();
  }

  Future<void> toggleFavoriteChurch(String churchId) async {
    final updatedFavorites = List<String>.from(_userProfile.favoriteChurches);

    if (updatedFavorites.contains(churchId)) {
      updatedFavorites.remove(churchId);
    } else {
      updatedFavorites.add(churchId);
    }

    _userProfile = _userProfile.copyWith(favoriteChurches: updatedFavorites);
    await _saveProfile();
    notifyListeners();
  }

  Future<void> markChurchAsVisited(String churchId) async {
    final updatedVisited = List<String>.from(_userProfile.visitedChurches);

    if (!updatedVisited.contains(churchId)) {
      updatedVisited.add(churchId);

      _userProfile = _userProfile.copyWith(visitedChurches: updatedVisited);
      await _saveProfile();
      notifyListeners();
    }
  }

  Future<void> updatePreferences(UserPreferences preferences) async {
    _userProfile = _userProfile.copyWith(preferences: preferences);
    await _saveProfile();
    notifyListeners();
  }

  Future<void> _saveProfile() async {
    // In a real app, this would save to secure storage or API
    // For demo purposes, we'll use SharedPreferences
    try {
      final prefs = await SharedPreferences.getInstance();
      final profileJson = jsonEncode(_userProfile.name); // Simplified for demo
      await prefs.setString('user_profile', profileJson);
    } catch (e) {
      debugPrint('Error saving profile: $e');
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
      if (!_userProfile.visitedChurches
          .contains(church.toLowerCase().replaceAll(' ', '_'))) {
        return church;
      }
    }

    return 'Baclayon Church'; // Fallback
  }

  List<String> getVisitHistory() {
    // Return a list of visited churches with dates
    // For demo purposes, return the visited churches list
    return _userProfile.visitedChurches;
  }

  Future<String> shareProgress() async {
    final visitedCount = _userProfile.visitedChurches.length;
    final percentage = (_userProfile.progressPercentage * 100).round();

    return "🏛️ I've visited $visitedCount heritage churches in Bohol! "
        "That's $percentage% of my pilgrimage journey complete. "
        "Join me in exploring these beautiful sacred spaces! #VisitaBohol #HeritagePilgrimage";
  }
}
