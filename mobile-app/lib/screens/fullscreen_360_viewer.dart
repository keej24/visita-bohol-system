import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../widgets/pannellum_360_viewer.dart';

class FullScreen360Viewer extends StatefulWidget {
  final List<Map<String, dynamic>>? virtual360Images; // Legacy format
  final Map<String, dynamic>?
      virtualTourData; // New format with scenes and hotspots
  final String churchName;

  const FullScreen360Viewer({
    super.key,
    this.virtual360Images,
    this.virtualTourData,
    required this.churchName,
  }) : assert(virtual360Images != null || virtualTourData != null,
            'Either virtual360Images or virtualTourData must be provided');

  @override
  State<FullScreen360Viewer> createState() => _FullScreen360ViewerState();
}

class _FullScreen360ViewerState extends State<FullScreen360Viewer> {
  int currentIndex = 0;
  PageController pageController = PageController();
  bool showControls = true;
  List<Map<String, dynamic>> scenes = [];

  @override
  void initState() {
    super.initState();
    // Hide system UI for immersive experience
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

    // Parse scenes from either virtualTourData or legacy virtual360Images
    if (widget.virtualTourData != null &&
        widget.virtualTourData!['scenes'] != null) {
      final scenesList = widget.virtualTourData!['scenes'] as List;
      scenes =
          scenesList.map((scene) => scene as Map<String, dynamic>).toList();
      debugPrint(
          '🌐 Loaded ${scenes.length} scenes with hotspots from virtualTourData');
    } else if (widget.virtual360Images != null) {
      scenes = widget.virtual360Images!;
      debugPrint(
          '🌐 Loaded ${scenes.length} scenes from legacy virtual360Images');
    }
  }

  @override
  void dispose() {
    // Restore system UI
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    pageController.dispose();
    super.dispose();
  }

  void _toggleControls() {
    setState(() {
      showControls = !showControls;
    });
  }

  void _nextImage() {
    if (currentIndex < scenes.length - 1) {
      pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  void _previousImage() {
    if (currentIndex > 0) {
      pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  void _navigateToScene(String sceneId) {
    final sceneIndex = scenes.indexWhere((scene) => scene['id'] == sceneId);
    if (sceneIndex != -1) {
      pageController.animateToPage(
        sceneIndex,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
      );
    } else {
      // Fallback: load first scene and show message
      pageController.animateToPage(
        0,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
      );
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content:
              Text('Requested scene not found. Showing first available scene.'),
          backgroundColor: Colors.orange,
        ),
      );
      debugPrint('⚠️ Scene ID "$sceneId" not found. Defaulted to first scene.');
    }
  }

  void _handleHotspotClick(Map<String, dynamic> hotspot) {
    // Show hotspot info or navigate to scene
    if (hotspot['type'] == 'scene' && hotspot['targetSceneId'] != null) {
      // Navigate to another scene
      _navigateToScene(hotspot['targetSceneId']);
    } else {
      // Show info hotspot dialog
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(hotspot['label'] ?? 'Information'),
          content: Text(hotspot['description'] ?? 'No description available'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (scenes.isEmpty) {
      debugPrint(
          '❌ [FullScreen360Viewer] No 360° scenes available for "${widget.churchName}".');
      // TODO: Add analytics event here if needed
      return Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: Colors.white, size: 64),
              const SizedBox(height: 16),
              const Text(
                'No 360° scenes available',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              const Text(
                'If you believe this is an error, please report it to the admin.',
                style: TextStyle(color: Colors.white70, fontSize: 14),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white12,
                  foregroundColor: Colors.white,
                ),
                onPressed: () {
                  setState(() {});
                },
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        onTap: _toggleControls,
        child: Stack(
          children: [
            // 360° Image Viewer
            PageView.builder(
              controller: pageController,
              onPageChanged: (index) {
                setState(() {
                  currentIndex = index;
                });
              },
              itemCount: scenes.length,
              itemBuilder: (context, index) {
                final scene = scenes[index];
                final imageUrl = scene['imageUrl'] ?? scene['url'];
                final title = scene['title'] ??
                    scene['description'] ??
                    '360° View ${index + 1}';
                final hotspots = scene['hotspots'] as List<dynamic>?;

                return Pannellum360Viewer(
                  imageUrl: imageUrl,
                  title: title,
                  height: MediaQuery.of(context).size.height,
                  hotspots:
                      hotspots?.map((h) => h as Map<String, dynamic>).toList(),
                  onHotspotClick: _handleHotspotClick,
                  onError: (error) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Error loading 360° image: $error'),
                        backgroundColor: Colors.red,
                      ),
                    );
                  },
                );
              },
            ),

            // Controls Overlay
            if (showControls) ...[
              // Top Bar
              Positioned(
                top: 0,
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
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(
                          Icons.arrow_back,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              widget.churchName,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (scenes[currentIndex]['title'] != null ||
                                scenes[currentIndex]['description'] != null)
                              Text(
                                scenes[currentIndex]['title'] ??
                                    scenes[currentIndex]['description'],
                                style: const TextStyle(
                                  color: Colors.white70,
                                  fontSize: 14,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () {
                          // Share functionality could be added here
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Share feature coming soon!'),
                            ),
                          );
                        },
                        icon: const Icon(
                          Icons.share,
                          color: Colors.white,
                          size: 24,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Bottom Controls
              Positioned(
                bottom: 0,
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
                      // Progress Indicator
                      if (scenes.length > 1) ...[
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List.generate(
                            scenes.length,
                            (index) => Container(
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              width: index == currentIndex ? 32 : 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: index == currentIndex
                                    ? Colors.white
                                    : Colors.white.withValues(alpha: 0.4),
                                borderRadius: BorderRadius.circular(4),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Navigation Controls
                      if (scenes.length > 1)
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            IconButton(
                              onPressed:
                                  currentIndex > 0 ? _previousImage : null,
                              icon: Icon(
                                Icons.skip_previous,
                                color: currentIndex > 0
                                    ? Colors.white
                                    : Colors.white.withValues(alpha: 0.3),
                                size: 32,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 8,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.5),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                '${currentIndex + 1} / ${scenes.length}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                            IconButton(
                              onPressed: currentIndex < scenes.length - 1
                                  ? _nextImage
                                  : null,
                              icon: Icon(
                                Icons.skip_next,
                                color: currentIndex < scenes.length - 1
                                    ? Colors.white
                                    : Colors.white.withValues(alpha: 0.3),
                                size: 32,
                              ),
                            ),
                          ],
                        ),

                      // Instructions
                      if (scenes.length == 1 || currentIndex == 0)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            scenes.length > 1
                                ? 'Swipe to navigate • Tap hotspots for info • Tap to show/hide controls'
                                : 'Drag to explore • Tap hotspots for info • Tap to show/hide controls',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.7),
                              fontSize: 12,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
