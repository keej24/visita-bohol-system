import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/virtual_tour.dart';
import '../widgets/tour_viewer.dart';

/// Full-screen virtual tour screen with scene navigation
class VirtualTourScreen extends StatefulWidget {
  final VirtualTour tour;
  final String churchName;

  const VirtualTourScreen({
    super.key,
    required this.tour,
    required this.churchName,
  });

  @override
  State<VirtualTourScreen> createState() => _VirtualTourScreenState();
}

class _VirtualTourScreenState extends State<VirtualTourScreen> {
  late TourScene _currentScene;
  bool _showControls = true;

  @override
  void initState() {
    super.initState();

    // Validate tour
    final errors = widget.tour.validate();
    if (errors.isNotEmpty) {
      debugPrint('⚠️ [VirtualTour] Tour validation errors:');
      for (final error in errors) {
        debugPrint('   - $error');
      }
    }

    // Start with the designated start scene
    _currentScene = widget.tour.startScene;

    debugPrint('🎬 [VirtualTour] Starting tour: ${widget.churchName}');
    debugPrint('   - Total scenes: ${widget.tour.scenes.length}');
    debugPrint('   - Start scene: ${_currentScene.title}');

    // Hide system UI for immersive experience
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void dispose() {
    // Restore system UI
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  /// Navigate to a different scene
  void _navigateToScene(String sceneId) {
    final nextScene = widget.tour.getSceneById(sceneId);

    if (nextScene != null) {
      debugPrint('📍 [VirtualTour] Navigating to: ${nextScene.title}');
      setState(() {
        _currentScene = nextScene;
      });
    } else {
      debugPrint('❌ [VirtualTour] Scene not found: $sceneId');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Scene not found'),
          backgroundColor: Colors.red,
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  /// Toggle control visibility
  void _toggleControls() {
    setState(() {
      _showControls = !_showControls;
    });
  }

  /// Get total number of hotspots across all scenes
  int _getTotalHotspots() {
    return widget.tour.scenes.fold<int>(
      0,
      (total, scene) => total + scene.hotspots.length,
    );
  }

  /// Get total number of navigation hotspots
  int _getNavigationHotspotCount() {
    return widget.tour.scenes.fold<int>(
      0,
      (total, scene) =>
          total + scene.hotspots.where((h) => h.isNavigation).length,
    );
  }

  /// Get total number of info hotspots
  int _getInfoHotspotCount() {
    return widget.tour.scenes.fold<int>(
      0,
      (total, scene) => total + scene.hotspots.where((h) => h.isInfo).length,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        onTap: _toggleControls,
        child: Stack(
          children: [
            // Main 360° viewer
            TourViewer(
              tour: widget.tour,
              initialScene: _currentScene,
              onNavigate: _navigateToScene,
            ),

            // Top control bar
            AnimatedPositioned(
              duration: const Duration(milliseconds: 300),
              top: _showControls ? 0 : -100,
              left: 0,
              right: 0,
              child: Container(
                padding: EdgeInsets.only(
                  top: MediaQuery.of(context).padding.top + 8,
                  left: 16,
                  right: 16,
                  bottom: 16,
                ),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withValues(alpha: 0.7),
                      Colors.transparent,
                    ],
                  ),
                ),
                child: Row(
                  children: [
                    // Back button
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                      onPressed: () => Navigator.pop(context),
                    ),
                    const SizedBox(width: 8),

                    // Church name and scene title
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            widget.churchName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            _currentScene.title,
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.8),
                              fontSize: 13,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),

                    // Info button
                    IconButton(
                      icon: const Icon(Icons.info_outline, color: Colors.white),
                      onPressed: _showTourInfo,
                    ),
                  ],
                ),
              ),
            ),

            // Hotspot diagnostic overlay (top-right)
            if (_showControls && _currentScene.hotspots.isEmpty)
              Positioned(
                top: MediaQuery.of(context).padding.top + 60,
                right: 16,
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.orange.withValues(alpha: 0.9),
                    borderRadius: BorderRadius.circular(8),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.warning_amber_rounded,
                              color: Colors.white, size: 20),
                          SizedBox(width: 8),
                          Text(
                            'No navigation hotspots',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Look for the green TEST hotspot at center\nor add hotspots via admin dashboard',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // Hotspot count indicator (top-right)
            if (_showControls && _currentScene.hotspots.isNotEmpty)
              Positioned(
                top: MediaQuery.of(context).padding.top + 60,
                right: 16,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2C5F2D).withValues(alpha: 0.9),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.location_on,
                          color: Colors.white, size: 18),
                      const SizedBox(width: 6),
                      Text(
                        '${_currentScene.hotspots.length} hotspot${_currentScene.hotspots.length == 1 ? '' : 's'}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // Bottom scene navigator
            AnimatedPositioned(
              duration: const Duration(milliseconds: 300),
              bottom: _showControls ? 0 : -120,
              left: 0,
              right: 0,
              child: Container(
                padding: EdgeInsets.only(
                  left: 16,
                  right: 16,
                  bottom: MediaQuery.of(context).padding.bottom + 16,
                  top: 16,
                ),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [
                      Colors.black.withValues(alpha: 0.7),
                      Colors.transparent,
                    ],
                  ),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Scene thumbnails
                    SizedBox(
                      height: 80,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: widget.tour.scenes.length,
                        itemBuilder: (context, index) {
                          final scene = widget.tour.scenes[index];
                          final isActive = scene.id == _currentScene.id;

                          return GestureDetector(
                            onTap: () => _navigateToScene(scene.id),
                            child: Container(
                              width: 100,
                              margin: const EdgeInsets.only(right: 12),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isActive
                                      ? const Color(0xFF2C5F2D)
                                      : Colors.white.withValues(alpha: 0.3),
                                  width: isActive ? 3 : 1.5,
                                ),
                                boxShadow: isActive
                                    ? [
                                        BoxShadow(
                                          color: const Color(0xFF2C5F2D)
                                              .withValues(alpha: 0.5),
                                          blurRadius: 8,
                                          spreadRadius: 2,
                                        )
                                      ]
                                    : null,
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(7),
                                child: Stack(
                                  fit: StackFit.expand,
                                  children: [
                                    // Display actual 360° image as thumbnail
                                    Image.network(
                                      scene.imageUrl,
                                      fit: BoxFit.cover,
                                      loadingBuilder: (context, child, loadingProgress) {
                                        if (loadingProgress == null) return child;
                                        return Container(
                                          color: Colors.grey[800],
                                          child: const Center(
                                            child: SizedBox(
                                              width: 20,
                                              height: 20,
                                              child: CircularProgressIndicator(
                                                color: Color(0xFF2C5F2D),
                                                strokeWidth: 2,
                                              ),
                                            ),
                                          ),
                                        );
                                      },
                                      errorBuilder: (context, error, stackTrace) {
                                        // Fallback to icon if image fails to load
                                        return Container(
                                          color: Colors.grey[800],
                                          child: const Icon(
                                            Icons.panorama,
                                            color: Colors.white54,
                                            size: 32,
                                          ),
                                        );
                                      },
                                    ),

                                    // Scene number/title overlay
                                    Positioned(
                                      bottom: 0,
                                      left: 0,
                                      right: 0,
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 4,
                                        ),
                                        decoration: BoxDecoration(
                                          gradient: LinearGradient(
                                            begin: Alignment.bottomCenter,
                                            end: Alignment.topCenter,
                                            colors: [
                                              Colors.black
                                                  .withValues(alpha: 0.8),
                                              Colors.transparent,
                                            ],
                                          ),
                                        ),
                                        child: Text(
                                          scene.title,
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 10,
                                            fontWeight: FontWeight.w600,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                          maxLines: 2,
                                          textAlign: TextAlign.center,
                                        ),
                                      ),
                                    ),

                                    // Start scene indicator
                                    if (scene.isStartScene)
                                      Positioned(
                                        top: 4,
                                        right: 4,
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 4,
                                            vertical: 2,
                                          ),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF2C5F2D),
                                            borderRadius:
                                                BorderRadius.circular(4),
                                          ),
                                          child: const Text(
                                            'START',
                                            style: TextStyle(
                                              color: Colors.white,
                                              fontSize: 8,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Show tour information dialog
  void _showTourInfo() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Virtual Tour Guide'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'How to navigate:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            _buildInfoItem(
              Icons.touch_app,
              'Drag to look around the 360° scene',
            ),
            _buildInfoItem(
              Icons.navigation,
              'Tap green arrows (→) to move to another scene',
            ),
            _buildInfoItem(
              Icons.info,
              'Tap blue circles (i) to see information',
            ),
            _buildInfoItem(
              Icons.view_carousel,
              'Use the scene thumbnails below to jump directly',
            ),
            _buildInfoItem(
              Icons.touch_app,
              'Tap anywhere to show/hide controls',
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF2C5F2D).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: const Color(0xFF2C5F2D).withValues(alpha: 0.3),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.info,
                        color: Color(0xFF2C5F2D),
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${widget.tour.scenes.length} scenes • ${_getTotalHotspots()} hotspots',
                        style: const TextStyle(
                          color: Color(0xFF2C5F2D),
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  if (_getTotalHotspots() > 0) ...[
                    const SizedBox(height: 4),
                    Text(
                      '${_getNavigationHotspotCount()} navigation • ${_getInfoHotspotCount()} info',
                      style: TextStyle(
                        color: const Color(0xFF2C5F2D).withValues(alpha: 0.7),
                        fontSize: 12,
                      ),
                    ),
                  ],
                  if (_getTotalHotspots() == 0) ...[
                    const SizedBox(height: 8),
                    const Text(
                      'Note: Hotspots need to be added in the admin dashboard to enable navigation within scenes.',
                      style: TextStyle(
                        color: Color(0xFF6B7280),
                        fontSize: 11,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoItem(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: Colors.grey[700]),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}
