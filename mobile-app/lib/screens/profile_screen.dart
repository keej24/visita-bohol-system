import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:io';
import '../models/user_profile.dart';
import '../models/church.dart';
import '../services/profile_service.dart';
import '../services/auth_service.dart';
import '../repositories/church_repository.dart';
import '../theme/header_palette.dart';
import '../widgets/home/church_card.dart';
import 'church_detail_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  @override
  void initState() {
    super.initState();

    // Load profile data
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProfileService>().loadUserProfile();
    });
  }

  @override
  void dispose() {
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
          final profile = profileService.userProfile ??
              UserProfile(
                id: '',
                displayName: 'VISITA User',
                email: '',
                profileImageUrl: null,
                phoneNumber: null,
                parish: 'Not specified',
                affiliation: 'Public User',
                accountType: 'public',
                createdAt: DateTime.now(),
                visitedChurches: [],
                favoriteChurches: [],
                forVisitChurches: [],
                journalEntries: [],
                preferences: UserPreferences.defaultPreferences(),
              );
          final isDark = Theme.of(context).brightness == Brightness.dark;

          // Show loading indicator
          if (profileService.isLoading) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(
                    color: Color(0xFF8B5E3C),
                  ),
                  SizedBox(height: 16),
                  Text(
                    'Loading your profile...',
                    style: TextStyle(
                      fontSize: 16,
                      color: Color(0xFF6B6B6B),
                    ),
                  ),
                ],
              ),
            );
          }

          // Show error message if any
          if (profileService.errorMessage != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Colors.red[400],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Error loading profile',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : const Color(0xFF1A1A1A),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    profileService.errorMessage!,
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? Colors.white70 : const Color(0xFF6B6B6B),
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => profileService.loadUserProfile(),
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

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
                      _buildToolsSection(profile, isDark),
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
                  top: 80, left: 20, right: 20, bottom: 20),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  _buildProfilePicture(profile),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          profile.displayName,
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            color:
                                isDark ? Colors.white : const Color(0xFF1A1A1A),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          profile.email,
                          style: TextStyle(
                            fontSize: 14,
                            color: isDark
                                ? Colors.white70
                                : const Color(0xFF6B6B6B),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Member since ${_formatJoinDate(profile.createdAt)}',
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark
                                ? Colors.white60
                                : const Color(0xFF8B8B8B),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      actions: [
        IconButton(
          icon: Icon(
            Icons.edit_rounded,
            color: isDark ? Colors.white : const Color(0xFF1A1A1A),
          ),
          onPressed: () => _showEditProfileDialog(profile),
          tooltip: 'Edit Profile',
        ),
        IconButton(
          icon: Icon(
            Icons.logout_rounded,
            color: isDark ? Colors.white : const Color(0xFF1A1A1A),
          ),
          onPressed: () => _showLogoutDialog(),
          tooltip: 'Logout',
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
          child: _StatCard(
            icon: Icons.church_outlined,
            label: 'Visited',
            value: profile.visitedChurches.length.toString(),
            color: const Color(0xFF10B981),
            isDark: isDark,
            onTap: () => _showVisitedChurches(profile),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: _StatCard(
            icon: Icons.bookmark_outline,
            label: 'For Visit',
            value: profile.forVisitChurches.length.toString(),
            color: const Color(0xFFD97706),
            isDark: isDark,
            onTap: () => _showForVisitChurches(profile),
          ),
        ),
      ],
    );
  }

  Widget _buildToolsSection(UserProfile profile, bool isDark) {
    return const _TipsSection();
  }

  // Event handlers
  void _showVisitedChurches(UserProfile profile) async {
    if (profile.visitedChurches.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'You haven\'t visited any churches yet. Start your journey!'),
          backgroundColor: Color(0xFF10B981),
        ),
      );
      return;
    }

    // Get all churches and filter by visited IDs
    final churchRepo = context.read<ChurchRepository>();
    final allChurches = await churchRepo.getAll();
    final visitedChurches = allChurches
        .where((church) => profile.visitedChurches.contains(church.id))
        .toList();

    if (!mounted) return;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => _ChurchListScreen(
          title: 'Visited Churches',
          churches: visitedChurches,
          emptyMessage: 'No visited churches found',
          color: const Color(0xFF10B981),
        ),
      ),
    );
  }

  void _showForVisitChurches(UserProfile profile) async {
    debugPrint('🔍 For Visit Churches IDs: ${profile.forVisitChurches}');
    debugPrint(
        '🔍 For Visit Churches count: ${profile.forVisitChurches.length}');

    if (profile.forVisitChurches.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content:
                Text('Your wishlist is empty. Add churches you want to visit!'),
            backgroundColor: Color(0xFFD97706),
          ),
        );
      }
      return;
    }

    // Get all churches and filter by for visit IDs
    final churchRepo = context.read<ChurchRepository>();
    final allChurches = await churchRepo.getAll();
    debugPrint('🔍 Total churches from repo: ${allChurches.length}');

    final forVisitChurches = allChurches
        .where((church) => profile.forVisitChurches.contains(church.id))
        .toList();

    debugPrint('🔍 Filtered for visit churches: ${forVisitChurches.length}');

    if (!mounted) return;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => _ChurchListScreen(
          title: 'Churches to Visit',
          churches: forVisitChurches,
          emptyMessage: 'No churches in your wishlist',
          color: const Color(0xFFD97706),
          onRemove: (church) async {
            // Remove from wishlist
            final profileService = context.read<ProfileService>();
            await profileService.toggleForVisitChurch(church.id);

            // Show confirmation
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('${church.name} removed from wishlist'),
                  backgroundColor: Colors.orange,
                  duration: const Duration(seconds: 2),
                ),
              );
              // Refresh the list by popping and showing again
              Navigator.pop(context);
              if (profileService.userProfile != null) {
                _showForVisitChurches(profileService.userProfile!);
              }
            }
          },
        ),
      ),
    );
  }

  void _showEditProfileDialog(UserProfile profile) {
    final nameController = TextEditingController(text: profile.displayName);
    final emailController = TextEditingController(text: profile.email);
    final currentPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    bool showPasswordFields = false;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Edit Profile'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    labelText: 'Name',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: emailController,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 20),
                InkWell(
                  onTap: () =>
                      setState(() => showPasswordFields = !showPasswordFields),
                  child: Row(
                    children: [
                      Icon(
                        showPasswordFields
                            ? Icons.lock_open
                            : Icons.lock_outline,
                        size: 20,
                        color: const Color(0xFF2563EB),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        showPasswordFields
                            ? 'Hide Password Change'
                            : 'Change Password',
                        style: const TextStyle(
                          color: Color(0xFF2563EB),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                if (showPasswordFields) ...[
                  const SizedBox(height: 16),
                  TextField(
                    controller: currentPasswordController,
                    decoration: const InputDecoration(
                      labelText: 'Current Password',
                      border: OutlineInputBorder(),
                    ),
                    obscureText: true,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: newPasswordController,
                    decoration: const InputDecoration(
                      labelText: 'New Password',
                      border: OutlineInputBorder(),
                      helperText: 'At least 6 characters',
                    ),
                    obscureText: true,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: confirmPasswordController,
                    decoration: const InputDecoration(
                      labelText: 'Confirm New Password',
                      border: OutlineInputBorder(),
                    ),
                    obscureText: true,
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                // Validate password change if fields are shown
                if (showPasswordFields) {
                  if (currentPasswordController.text.isEmpty ||
                      newPasswordController.text.isEmpty ||
                      confirmPasswordController.text.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Please fill in all password fields'),
                        backgroundColor: Colors.red,
                      ),
                    );
                    return;
                  }

                  if (newPasswordController.text !=
                      confirmPasswordController.text) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('New passwords do not match'),
                        backgroundColor: Colors.red,
                      ),
                    );
                    return;
                  }

                  if (newPasswordController.text.length < 6) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Password must be at least 6 characters'),
                        backgroundColor: Colors.red,
                      ),
                    );
                    return;
                  }
                }

                final service = context.read<ProfileService>();
                final authService = context.read<AuthService>();
                final navigator = Navigator.of(context);

                // Update profile
                await service.updateProfile(
                  displayName: nameController.text.trim(),
                  email: emailController.text.trim(),
                );

                // Update password if requested
                if (showPasswordFields) {
                  try {
                    await authService.updatePassword(
                      currentPasswordController.text,
                      newPasswordController.text,
                    );
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Password updated successfully'),
                          backgroundColor: Colors.green,
                        ),
                      );
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Password update failed: $e'),
                          backgroundColor: Colors.red,
                        ),
                      );
                    }
                  }
                }

                if (!mounted) return;
                navigator.pop();
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  void _showLogoutDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final authService = context.read<AuthService>();
              final navigator = Navigator.of(context);

              await authService.signOut();

              if (!mounted) return;
              navigator.pop(); // Close dialog

              // Show success message
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Logged out successfully'),
                  backgroundColor: Colors.green,
                ),
              );
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }

  String _formatJoinDate(DateTime date) {
    final months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];
    return '${months[date.month - 1]} ${date.year}';
  }
}

// Widget Components
class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  final bool isDark;
  final VoidCallback? onTap;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
    required this.isDark,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
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
      ),
    );
  }
}

class _TipsSection extends StatelessWidget {
  const _TipsSection();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1F1F1F) : Colors.white,
        borderRadius: BorderRadius.circular(24),
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
              const Icon(
                Icons.lightbulb_outline,
                color: Color(0xFF2563EB),
                size: 24,
              ),
              const SizedBox(width: 12),
              Text(
                'Pilgrimage Tips',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: isDark ? Colors.white : const Color(0xFF1A1A1A),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _TipItem(
            icon: Icons.map_outlined,
            text:
                'Use the interactive map to discover nearby heritage churches',
            color: const Color(0xFF2563EB),
            isDark: isDark,
          ),
          _TipItem(
            icon: Icons.bookmark_add_outlined,
            text:
                'Save interesting churches to your wishlist for future visits',
            color: const Color(0xFFD97706),
            isDark: isDark,
          ),
        ],
      ),
    );
  }
}

class _TipItem extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color color;
  final bool isDark;

  const _TipItem({
    required this.icon,
    required this.text,
    required this.color,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.white70 : const Color(0xFF6B6B6B),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// Church List Screen for displaying visited or wishlist churches
class _ChurchListScreen extends StatelessWidget {
  final String title;
  final List<Church> churches;
  final String emptyMessage;
  final Color color;
  final Function(Church)? onRemove;

  const _ChurchListScreen({
    required this.title,
    required this.churches,
    required this.emptyMessage,
    required this.color,
    this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor:
          isDark ? const Color(0xFF121212) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(title),
        backgroundColor: isDark ? const Color(0xFF1F1F1F) : Colors.white,
        foregroundColor: isDark ? Colors.white : const Color(0xFF1A1A1A),
        elevation: 0,
      ),
      body: churches.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.church_outlined,
                    size: 64,
                    color: isDark ? Colors.white24 : const Color(0xFFE0E0E0),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    emptyMessage,
                    style: TextStyle(
                      fontSize: 16,
                      color: isDark ? Colors.white54 : const Color(0xFF6B6B6B),
                    ),
                  ),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: churches.length,
              itemBuilder: (context, index) {
                final church = churches[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Stack(
                    children: [
                      ChurchCard(
                        church: church,
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) =>
                                  ChurchDetailScreen(church: church),
                            ),
                          );
                        },
                      ),
                      if (onRemove != null)
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () => onRemove!(church),
                              borderRadius: BorderRadius.circular(20),
                              child: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Colors.red.withValues(alpha: 0.9),
                                  borderRadius: BorderRadius.circular(20),
                                  boxShadow: [
                                    BoxShadow(
                                      color:
                                          Colors.black.withValues(alpha: 0.2),
                                      blurRadius: 4,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: const Icon(
                                  Icons.delete_outline,
                                  color: Colors.white,
                                  size: 20,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}
