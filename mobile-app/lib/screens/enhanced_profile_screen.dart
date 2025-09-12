import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'dart:io';
import '../models/user_profile.dart';
import '../services/profile_service.dart';
import '../theme/header_palette.dart';

class EnhancedProfileScreen extends StatefulWidget {
  const EnhancedProfileScreen({super.key});

  @override
  State<EnhancedProfileScreen> createState() => _EnhancedProfileScreenState();
}

class _EnhancedProfileScreenState extends State<EnhancedProfileScreen>
    with TickerProviderStateMixin {
  late AnimationController _progressController;
  late Animation<double> _progressAnimation;

  @override
  void initState() {
    super.initState();
    _progressController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _progressAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _progressController, curve: Curves.easeOutCubic),
    );

    // Start animations
    Future.delayed(const Duration(milliseconds: 300), () {
      if (mounted) _progressController.forward();
    });

    // Load profile data
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProfileService>().loadUserProfile();
    });
  }

  @override
  void dispose() {
    _progressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).brightness == Brightness.dark
          ? const Color(0xFF121212)
          : const Color(0xFFF8FAFC),
      body: Consumer<ProfileService>(
        builder: (context, profileService, child) {
          final profile = profileService.userProfile;
          final isDark = Theme.of(context).brightness == Brightness.dark;

          return CustomScrollView(
            slivers: [
              _buildSliverAppBar(profile, isDark),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildStatsSection(profile, isDark),
                      const SizedBox(height: 20),
                      _buildProgressSection(profile, isDark),
                      const SizedBox(height: 20),
                      _buildHeritageExplorerSection(profile, isDark),
                      const SizedBox(height: 20),
                      _buildToolsSection(profile, isDark),
                      const SizedBox(height: 20),
                      _buildSettingsSection(profile, isDark),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSliverAppBar(UserProfile profile, bool isDark) {
    return SliverAppBar(
      expandedHeight: 180,
      pinned: true,
      backgroundColor: isDark ? const Color(0xFF1F1F1F) : HeaderColors.profile,
      elevation: 0,
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: isDark
                  ? [const Color(0xFF1F1F1F), const Color(0xFF2A2A2A)]
                  : [
                      HeaderColors.profile,
                      HeaderColors.profile.withValues(alpha: 0.8)
                    ],
            ),
          ),
          child: SafeArea(
            child: Container(
              padding: const EdgeInsets.only(
                  top: 60, left: 20, right: 20, bottom: 20),
              child: Row(
                children: [
                  _buildProfilePicture(profile),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          profile.name,
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            color:
                                isDark ? Colors.white : const Color(0xFF1A1A1A),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          profile.parish,
                          style: TextStyle(
                            fontSize: 14,
                            color: isDark
                                ? Colors.white70
                                : const Color(0xFF6B6B6B),
                          ),
                        ),
                        Text(
                          profile.affiliation,
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark
                                ? Colors.white60
                                : const Color(0xFF8B8B8B),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        title: Text(
          'Profile',
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 18,
            color: isDark ? Colors.white : const Color(0xFF1A1A1A),
          ),
        ),
      ),
      actions: [
        IconButton(
          icon: Icon(
            Icons.share_rounded,
            color: isDark ? Colors.white : const Color(0xFF1A1A1A),
          ),
          onPressed: () => _shareProgress(profile),
        ),
        const SizedBox(width: 8),
      ],
    );
  }

  Widget _buildProfilePicture(UserProfile profile) {
    return GestureDetector(
      onTap: () => context.read<ProfileService>().updateProfileImage(),
      child: Container(
        width: 70,
        height: 70,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Stack(
          children: [
            Container(
              width: 70,
              height: 70,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white,
                image: profile.profileImageUrl != null
                    ? DecorationImage(
                        image: FileImage(File(profile.profileImageUrl!)),
                        fit: BoxFit.cover,
                      )
                    : null,
              ),
              child: profile.profileImageUrl == null
                  ? Icon(
                      Icons.person_rounded,
                      size: 35,
                      color: Colors.grey[400],
                    )
                  : null,
            ),
            Positioned(
              bottom: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: const BoxDecoration(
                  color: Color(0xFF2563EB),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.camera_alt_rounded,
                  size: 12,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsSection(UserProfile profile, bool isDark) {
    return Row(
      children: [
        Expanded(
          child: StatCard(
            icon: Icons.church_outlined,
            label: 'Visited',
            value: profile.visitedChurches.length.toString(),
            color: const Color(0xFF10B981),
            isDark: isDark,
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: StatCard(
            icon: Icons.favorite_outline,
            label: 'Favorites',
            value: profile.favoriteChurches.length.toString(),
            color: const Color(0xFFD97706),
            isDark: isDark,
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: StatCard(
            icon: Icons.book_outlined,
            label: 'Journal',
            value: profile.journalEntries.length.toString(),
            color: const Color(0xFF2563EB),
            isDark: isDark,
          ),
        ),
      ],
    );
  }

  Widget _buildProgressSection(UserProfile profile, bool isDark) {
    return AnimatedBuilder(
      animation: _progressAnimation,
      builder: (context, child) {
        return GestureDetector(
          onTap: () => _showProgressDetails(profile),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1F1F1F) : Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color:
                    isDark ? const Color(0xFF2A2A2A) : const Color(0xFFE5E7EB),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.04),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)],
                        ),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(Icons.trending_up,
                          color: Colors.white, size: 24),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Journey Progress',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: isDark
                                  ? Colors.white
                                  : const Color(0xFF1A1A1A),
                            ),
                          ),
                          Text(
                            profile.motivationalMessage,
                            style: TextStyle(
                              fontSize: 13,
                              color: isDark
                                  ? Colors.white70
                                  : const Color(0xFF6B6B6B),
                            ),
                          ),
                        ],
                      ),
                    ),
                    CircularProgress(
                      progress:
                          profile.progressPercentage * _progressAnimation.value,
                      size: 60,
                      strokeWidth: 6,
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: LinearProgressIndicator(
                    minHeight: 12,
                    value:
                        profile.progressPercentage * _progressAnimation.value,
                    backgroundColor: isDark
                        ? const Color(0xFF2A2A2A)
                        : const Color(0xFF2563EB).withValues(alpha: 0.1),
                    valueColor: const AlwaysStoppedAnimation(Color(0xFF2563EB)),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  '${profile.visitedChurches.length} of 25 heritage churches explored',
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? Colors.white70 : const Color(0xFF6B6B6B),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildHeritageExplorerSection(UserProfile profile, bool isDark) {
    final lastVisited = profile.lastVisitedChurch;
    final recommendedNext =
        context.read<ProfileService>().getRecommendedNextChurch();

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFFD4AF37).withValues(alpha: 0.15),
            const Color(0xFFD4AF37).withValues(alpha: 0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFFD4AF37).withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFD4AF37),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFD4AF37).withValues(alpha: 0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: const Icon(Icons.auto_awesome,
                    color: Colors.white, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Heritage Explorer',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFFD4AF37),
                      ),
                    ),
                    Text(
                      'Your spiritual journey continues',
                      style: TextStyle(
                        fontSize: 14,
                        color:
                            isDark ? Colors.white70 : const Color(0xFF6B6B6B),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          if (lastVisited != null) ...[
            ExplorerCard(
              title: 'Last Explored',
              subtitle: lastVisited.replaceAll('_', ' ').toUpperCase(),
              icon: Icons.church_outlined,
              color: const Color(0xFF10B981),
              onTap: () => _showChurchDetails(lastVisited),
            ),
            const SizedBox(height: 12),
          ],
          ExplorerCard(
            title: 'Recommended Next',
            subtitle: recommendedNext,
            icon: Icons.location_on_outlined,
            color: const Color(0xFF2563EB),
            onTap: () => _showRecommendedChurch(recommendedNext),
          ),
        ],
      ),
    );
  }

  Widget _buildToolsSection(UserProfile profile, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Tools & Features',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: isDark ? Colors.white : const Color(0xFF1A1A1A),
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: ToolCard(
                title: 'Pilgrimage Journal',
                subtitle: '${profile.journalEntries.length} entries',
                icon: Icons.book_outlined,
                color: const Color(0xFF8B5CF6),
                isDark: isDark,
                onTap: () => _showJournal(profile),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ToolCard(
                title: 'Favorites',
                subtitle: '${profile.favoriteChurches.length} saved',
                icon: Icons.favorite_outline,
                color: const Color(0xFFEF4444),
                isDark: isDark,
                onTap: () => _showFavorites(profile),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ToolCard(
          title: 'Visit History',
          subtitle: 'Timeline of your spiritual journey',
          icon: Icons.history_outlined,
          color: const Color(0xFF10B981),
          isDark: isDark,
          isFullWidth: true,
          onTap: () => _showVisitHistory(profile),
        ),
      ],
    );
  }

  Widget _buildSettingsSection(UserProfile profile, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1F1F1F) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? const Color(0xFF2A2A2A) : const Color(0xFFE5E7EB),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.04),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.settings_outlined,
                color: isDark ? Colors.white70 : const Color(0xFF6B6B6B),
                size: 24,
              ),
              const SizedBox(width: 12),
              Text(
                'Preferences',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: isDark ? Colors.white : const Color(0xFF1A1A1A),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SettingsTile(
            title: 'Notifications',
            subtitle: 'Event reminders and updates',
            icon: Icons.notifications_outlined,
            value: profile.preferences.enableNotifications,
            isDark: isDark,
            onChanged: (value) => _updateNotificationSettings(profile, value),
          ),
          SettingsTile(
            title: 'Feast Day Reminders',
            subtitle: 'Church feast day notifications',
            icon: Icons.event_outlined,
            value: profile.preferences.enableFeastDayReminders,
            isDark: isDark,
            onChanged: (value) => _updateFeastDaySettings(profile, value),
          ),
          SettingsTile(
            title: 'Location Reminders',
            subtitle: 'Nearby church notifications',
            icon: Icons.location_on_outlined,
            value: profile.preferences.enableLocationReminders,
            isDark: isDark,
            onChanged: (value) => _updateLocationSettings(profile, value),
          ),
          SettingsTile(
            title: 'Share Progress',
            subtitle: 'Allow sharing with friends',
            icon: Icons.share_outlined,
            value: profile.preferences.shareProgressPublically,
            isDark: isDark,
            onChanged: (value) => _updateSharingSettings(profile, value),
          ),
        ],
      ),
    );
  }

  // Event handlers
  void _shareProgress(UserProfile profile) async {
    final text = await context.read<ProfileService>().shareProgress();
    Share.share(text);
  }

  void _showProgressDetails(UserProfile profile) {
    _showDetailsModal('Progress Details', profile.motivationalMessage);
  }

  void _showChurchDetails(String churchId) {
    _showDetailsModal('Church Details', 'Details for $churchId');
  }

  void _showRecommendedChurch(String churchName) {
    _showDetailsModal('Recommended Church', 'Explore $churchName next!');
  }

  void _showJournal(UserProfile profile) {
    _showDetailsModal('Pilgrimage Journal',
        '${profile.journalEntries.length} journal entries');
  }

  void _showFavorites(UserProfile profile) {
    _showDetailsModal('Favorite Churches',
        '${profile.favoriteChurches.length} favorite churches');
  }

  void _showVisitHistory(UserProfile profile) {
    _showDetailsModal('Visit History', 'Your spiritual journey timeline');
  }

  void _showDetailsModal(String title, String content) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.6,
        decoration: BoxDecoration(
          color: Theme.of(context).brightness == Brightness.dark
              ? const Color(0xFF1F1F1F)
              : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              content,
              style: const TextStyle(fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }

  void _updateNotificationSettings(UserProfile profile, bool value) {
    final updatedPreferences =
        profile.preferences.copyWith(enableNotifications: value);
    context.read<ProfileService>().updatePreferences(updatedPreferences);
  }

  void _updateFeastDaySettings(UserProfile profile, bool value) {
    final updatedPreferences =
        profile.preferences.copyWith(enableFeastDayReminders: value);
    context.read<ProfileService>().updatePreferences(updatedPreferences);
  }

  void _updateLocationSettings(UserProfile profile, bool value) {
    final updatedPreferences =
        profile.preferences.copyWith(enableLocationReminders: value);
    context.read<ProfileService>().updatePreferences(updatedPreferences);
  }

  void _updateSharingSettings(UserProfile profile, bool value) {
    final updatedPreferences =
        profile.preferences.copyWith(shareProgressPublically: value);
    context.read<ProfileService>().updatePreferences(updatedPreferences);
  }
}

// Widget Components
class StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  final bool isDark;

  const StatCard({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            color.withValues(alpha: 0.12),
            color.withValues(alpha: 0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.2)),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.1),
            blurRadius: 15,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              boxShadow: [
                BoxShadow(
                  color: color.withValues(alpha: 0.2),
                  blurRadius: 6,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color.withValues(alpha: 0.8),
            ),
          ),
        ],
      ),
    );
  }
}

class CircularProgress extends StatelessWidget {
  final double progress;
  final double size;
  final double strokeWidth;

  const CircularProgress({
    super.key,
    required this.progress,
    required this.size,
    required this.strokeWidth,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        children: [
          CircularProgressIndicator(
            value: 1.0,
            strokeWidth: strokeWidth,
            valueColor: AlwaysStoppedAnimation(
              const Color(0xFF2563EB).withValues(alpha: 0.1),
            ),
          ),
          CircularProgressIndicator(
            value: progress,
            strokeWidth: strokeWidth,
            valueColor: const AlwaysStoppedAnimation(Color(0xFF2563EB)),
          ),
          Center(
            child: Text(
              '${(progress * 100).round()}%',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: Color(0xFF2563EB),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class ExplorerCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const ExplorerCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.9),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF6B6B6B),
                    ),
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF1A1A1A),
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.arrow_forward_ios,
              size: 16,
              color: Colors.grey[400],
            ),
          ],
        ),
      ),
    );
  }
}

class ToolCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final bool isDark;
  final bool isFullWidth;
  final VoidCallback onTap;

  const ToolCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.isDark,
    this.isFullWidth = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1F1F1F) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark ? const Color(0xFF2A2A2A) : const Color(0xFFE5E7EB),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.04),
              blurRadius: 15,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: isFullWidth
            ? Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(icon, color: color, size: 24),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color:
                                isDark ? Colors.white : const Color(0xFF1A1A1A),
                          ),
                        ),
                        Text(
                          subtitle,
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark
                                ? Colors.white70
                                : const Color(0xFF6B6B6B),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    Icons.arrow_forward_ios,
                    size: 16,
                    color: isDark ? Colors.white30 : Colors.grey[400],
                  ),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(icon, color: color, size: 24),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: isDark ? Colors.white : const Color(0xFF1A1A1A),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.white70 : const Color(0xFF6B6B6B),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

class SettingsTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final bool value;
  final bool isDark;
  final ValueChanged<bool> onChanged;

  const SettingsTile({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.value,
    required this.isDark,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Icon(
            icon,
            size: 20,
            color: isDark ? Colors.white70 : const Color(0xFF6B6B6B),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: isDark ? Colors.white : const Color(0xFF1A1A1A),
                  ),
                ),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? Colors.white60 : const Color(0xFF8B8B8B),
                  ),
                ),
              ],
            ),
          ),
          Switch.adaptive(
            value: value,
            onChanged: onChanged,
            activeColor: const Color(0xFF2563EB),
          ),
        ],
      ),
    );
  }
}
