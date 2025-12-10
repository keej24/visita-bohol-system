import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/user_profile.dart';
import '../models/church.dart';
import '../models/app_state.dart';
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

    // Load profile data and sync with AppState
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadAndSyncProfile();
    });
  }

  /// Load profile data and sync with AppState to ensure consistency
  Future<void> _loadAndSyncProfile() async {
    final profileService = context.read<ProfileService>();
    final appState = context.read<AppState>();
    final churchRepo = context.read<ChurchRepository>();

    // Only load from Firebase if profile is not already loaded
    // This prevents overwriting recent local changes with stale Firestore data
    if (profileService.userProfile == null) {
      debugPrint('📥 Profile not loaded, fetching from Firebase...');
      await profileService.loadUserProfile();
    } else {
      debugPrint('✅ Profile already loaded, using cached data');
    }

    // Sync ProfileService data with AppState
    if (profileService.userProfile != null) {
      final profile = profileService.userProfile!;
      debugPrint('🔄 Syncing profile with AppState...');
      debugPrint('   Visited: ${profile.visitedChurches.length}');
      debugPrint('   For Visit: ${profile.forVisitChurches.length}');

      // Get all churches to map IDs to Church objects
      try {
        final allChurches = await churchRepo.getAll();

        // Sync visited churches FROM ProfileService TO AppState
        for (String churchId in profile.visitedChurches) {
          final church = allChurches.where((c) => c.id == churchId).firstOrNull;
          if (church != null && !appState.isVisited(church)) {
            appState.markVisited(church);
            debugPrint('   ✅ Synced visited: ${church.name}');
          }
        }

        // Sync for visit churches FROM ProfileService TO AppState
        for (String churchId in profile.forVisitChurches) {
          final church = allChurches.where((c) => c.id == churchId).firstOrNull;
          if (church != null && !appState.isForVisit(church)) {
            appState.markForVisit(church);
            debugPrint('   ✅ Synced for visit: ${church.name}');
          }
        }

        // Also sync FROM AppState TO ProfileService (for any changes made via AppState)
        for (final church in appState.visited) {
          if (!profile.visitedChurches.contains(church.id)) {
            await profileService.markChurchAsVisited(church.id);
            debugPrint('   ✅ Synced to profile (visited): ${church.name}');
          }
        }

        for (final church in appState.forVisit) {
          if (!profile.forVisitChurches.contains(church.id)) {
            await profileService.toggleForVisitChurch(church.id);
            debugPrint('   ✅ Synced to profile (for visit): ${church.name}');
          }
        }

        debugPrint('✅ Profile sync complete');
      } catch (e) {
        debugPrint('⚠️ Error syncing profile with AppState: $e');
      }
    }
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
      expandedHeight: 200,
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
      ],
    );
  }

  Widget _buildProfilePicture(UserProfile profile) {
    final hasImage =
        profile.profileImageUrl != null && profile.profileImageUrl!.isNotEmpty;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        GestureDetector(
          onTap: () => context.read<ProfileService>().updateProfileImage(),
          onLongPress: hasImage
              ? () {
                  // Show delete confirmation dialog
                  showDialog(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text('Delete Profile Picture?'),
                      content: const Text(
                          'Are you sure you want to remove your profile picture?'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Cancel'),
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.pop(context);
                            context.read<ProfileService>().deleteProfileImage();
                          },
                          style: TextButton.styleFrom(
                            foregroundColor: Colors.red,
                          ),
                          child: const Text('Delete'),
                        ),
                      ],
                    ),
                  );
                }
              : null,
          child: Padding(
            padding: const EdgeInsets.only(bottom: 8, right: 8),
            child: SizedBox(
              width: 70,
              height: 70,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 70,
                    height: 70,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: hasImage
                        ? ClipOval(
                            child: CachedNetworkImage(
                              imageUrl: profile.profileImageUrl!,
                              width: 70,
                              height: 70,
                              fit: BoxFit.cover,
                              placeholder: (context, url) => const Center(
                                child:
                                    CircularProgressIndicator(strokeWidth: 2),
                              ),
                              errorWidget: (context, url, error) => Icon(
                                Icons.person_rounded,
                                size: 35,
                                color: Colors.grey[400],
                              ),
                            ),
                          )
                        : Icon(
                            Icons.person_rounded,
                            size: 35,
                            color: Colors.grey[400],
                          ),
                  ),
                  Positioned(
                    bottom: -2,
                    right: -2,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: hasImage ? Colors.red : const Color(0xFF2563EB),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Colors.white,
                          width: 2,
                        ),
                      ),
                      child: Icon(
                        hasImage
                            ? Icons.delete_outline
                            : Icons.camera_alt_rounded,
                        size: 12,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (hasImage) ...[
          const SizedBox(height: 4),
          Text(
            'Long press to delete',
            style: TextStyle(
              fontSize: 10,
              color: Colors.white.withValues(alpha: 0.8),
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ],
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

    // Debug: Find missing church IDs (churches that were deleted from Firestore)
    if (visitedChurches.length < profile.visitedChurches.length) {
      final foundIds = visitedChurches.map((c) => c.id).toSet();
      final missingIds = profile.visitedChurches
          .where((id) => !foundIds.contains(id))
          .toList();
      debugPrint('⚠️ Missing churches from Visited list: $missingIds');
      debugPrint(
          '   These churches may have been deleted or are no longer available.');

      // Clean up missing IDs from profile
      if (missingIds.isNotEmpty && mounted) {
        debugPrint(
            '🧹 Cleaning up ${missingIds.length} invalid church IDs from visited list...');
        final profileService = context.read<ProfileService>();

        // Remove invalid IDs by updating the profile
        await profileService.removeInvalidVisitedChurches(missingIds);

        // Show notification to user
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                  'Removed ${missingIds.length} unavailable church${missingIds.length > 1 ? 'es' : ''} from your visited list'),
              backgroundColor: Colors.orange,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      }
    }

    if (!mounted) return;

    // Show empty message if no valid churches found
    if (visitedChurches.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'No available churches in your visited list. Previously visited churches may have been removed.'),
          backgroundColor: Color(0xFF10B981),
          duration: Duration(seconds: 3),
        ),
      );
      return;
    }

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

    // Debug: Find missing church IDs
    if (forVisitChurches.length < profile.forVisitChurches.length) {
      final foundIds = forVisitChurches.map((c) => c.id).toSet();
      final missingIds = profile.forVisitChurches
          .where((id) => !foundIds.contains(id))
          .toList();
      debugPrint('⚠️ Missing churches from For Visit list: $missingIds');
      debugPrint(
          '   These churches may be pending approval, deleted, or have a different status.');

      // Clean up missing IDs from profile
      if (missingIds.isNotEmpty) {
        debugPrint(
            '🧹 Cleaning up ${missingIds.length} invalid church IDs from profile...');
        final profileService = context.read<ProfileService>();

        // Remove invalid IDs using the dedicated cleanup method
        await profileService.removeInvalidForVisitChurches(missingIds);

        // Show notification to user
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                  'Removed ${missingIds.length} unavailable church${missingIds.length > 1 ? 'es' : ''} from your list'),
              backgroundColor: Colors.orange,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      }
    }

    if (!mounted) return;

    // Show empty message if no valid churches found
    if (forVisitChurches.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'No available churches in your wishlist. Previously saved churches may be pending approval.'),
          backgroundColor: Color(0xFFD97706),
          duration: Duration(seconds: 3),
        ),
      );
      return;
    }

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
            final scaffoldMessenger = ScaffoldMessenger.of(context);
            final navigator = Navigator.of(context);

            await profileService.toggleForVisitChurch(church.id);

            // Show confirmation
            if (mounted) {
              scaffoldMessenger.showSnackBar(
                SnackBar(
                  content: Text('${church.name} removed from wishlist'),
                  backgroundColor: Colors.orange,
                  duration: const Duration(seconds: 2),
                ),
              );
              // Refresh the list by popping and showing again
              navigator.pop();
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
    final formKey = GlobalKey<FormState>();
    bool showPasswordFields = false;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Edit Profile'),
          content: SingleChildScrollView(
            child: Form(
              key: formKey,
              autovalidateMode: AutovalidateMode.onUserInteraction,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextFormField(
                    controller: nameController,
                    textInputAction: TextInputAction.next,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(
                      labelText: 'Username',
                      border: OutlineInputBorder(),
                    ),
                    maxLength: 50,
                    validator: (value) {
                      final v = value?.trim() ?? '';
                      if (v.isEmpty) return 'Please enter a username';
                      if (v.length < 2) {
                        return 'Username must be at least 2 characters';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: emailController,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.emailAddress,
                    validator: (value) {
                      final v = value?.trim() ?? '';
                      if (v.isEmpty) return 'Please enter your email';
                      final emailRegex =
                          RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4} ?$');
                      // Fallback if regex above mishandles due to escape: use a simpler check
                      final simpleEmail = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
                      if (!(emailRegex.hasMatch(v) ||
                          simpleEmail.hasMatch(v))) {
                        return 'Please enter a valid email address';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  InkWell(
                    onTap: () => setState(
                        () => showPasswordFields = !showPasswordFields),
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
                    TextFormField(
                      controller: currentPasswordController,
                      decoration: const InputDecoration(
                        labelText: 'Current Password',
                        border: OutlineInputBorder(),
                      ),
                      obscureText: true,
                      validator: (value) {
                        // Only require when changing password
                        if (!showPasswordFields) return null;
                        if (value == null || value.isEmpty) {
                          return 'Please enter your current password';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: newPasswordController,
                      decoration: const InputDecoration(
                        labelText: 'New Password',
                        border: OutlineInputBorder(),
                        helperText:
                            'At least 8 chars with uppercase, lowercase, and number',
                      ),
                      obscureText: true,
                      validator: (value) {
                        if (!showPasswordFields) return null;
                        final v = value ?? '';
                        if (v.isEmpty) return 'Please enter a new password';
                        if (v.length < 8) {
                          return 'Password must be at least 8 characters';
                        }
                        if (!RegExp(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)')
                            .hasMatch(v)) {
                          return 'Must include uppercase, lowercase, and number';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: confirmPasswordController,
                      decoration: const InputDecoration(
                        labelText: 'Confirm New Password',
                        border: OutlineInputBorder(),
                      ),
                      obscureText: true,
                      validator: (value) {
                        if (!showPasswordFields) return null;
                        if (value == null || value.isEmpty) {
                          return 'Please confirm your new password';
                        }
                        if (value != newPasswordController.text) {
                          return 'Passwords do not match';
                        }
                        return null;
                      },
                    ),
                  ],
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                // Run validators first
                if (!(formKey.currentState?.validate() ?? false)) {
                  return;
                }

                final service = context.read<ProfileService>();
                final authService = context.read<AuthService>();
                final navigator = Navigator.of(context);

                // If nothing changed and not changing password, avoid unnecessary update
                final newName = nameController.text.trim();
                final newEmail = emailController.text.trim();
                final nameChanged = newName != (profile.displayName);
                final emailChanged = newEmail != (profile.email);

                // Update profile
                if (nameChanged || emailChanged) {
                  await service.updateProfile(
                    displayName: newName,
                    email: newEmail,
                  );
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Profile updated successfully'),
                        backgroundColor: Colors.green,
                        duration: Duration(seconds: 2),
                      ),
                    );
                  }
                }

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
      builder: (context) => _LogoutDialog(),
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

// Logout Dialog Widget
class _LogoutDialog extends StatefulWidget {
  @override
  State<_LogoutDialog> createState() => _LogoutDialogState();
}

class _LogoutDialogState extends State<_LogoutDialog> {
  bool _isLoggingOut = false;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Logout'),
      content: _isLoggingOut
          ? const Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Logging out...'),
              ],
            )
          : const Text('Are you sure you want to logout?'),
      actions: _isLoggingOut
          ? []
          : [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () async {
                  setState(() {
                    _isLoggingOut = true;
                  });

                  final authService = context.read<AuthService>();
                  final profileService = context.read<ProfileService>();
                  final appState = context.read<AppState>();
                  final navigator = Navigator.of(context);

                  // Add a small delay to ensure the user sees the loading indicator
                  await Future.delayed(const Duration(milliseconds: 500));

                  // CRITICAL: Clear all user state before signing out
                  // This prevents stale data from appearing for the next user
                  debugPrint('🧹 Clearing user state before logout...');
                  profileService.clearProfile();
                  appState.clearUserState();

                  await authService.signOut();

                  if (!mounted) return;

                  // Close dialog and navigate to login by popping all routes
                  navigator.pop(); // Close dialog

                  // Pop all routes to get back to auth wrapper which will show login
                  navigator.popUntil((route) => route.isFirst);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Logout'),
              ),
            ],
    );
  }
}
