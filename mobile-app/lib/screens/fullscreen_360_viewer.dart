import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../widgets/pannellum_360_viewer.dart';

class FullScreen360Viewer extends StatefulWidget {
  final List<Map<String, dynamic>> virtual360Images;
  final String churchName;

  const FullScreen360Viewer({
    super.key,
    required this.virtual360Images,
    required this.churchName,
  });

  @override
  State<FullScreen360Viewer> createState() => _FullScreen360ViewerState();
}

class _FullScreen360ViewerState extends State<FullScreen360Viewer> {
  int currentIndex = 0;
  PageController pageController = PageController();
  bool showControls = true;

  @override
  void initState() {
    super.initState();
    // Hide system UI for immersive experience
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
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
    if (currentIndex < widget.virtual360Images.length - 1) {
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

  @override
  Widget build(BuildContext context) {
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
              itemCount: widget.virtual360Images.length,
              itemBuilder: (context, index) {
                final virtual360Image = widget.virtual360Images[index];
                return Pannellum360Viewer(
                  imageUrl: virtual360Image['url'],
                  title: virtual360Image['description'] ??
                      '360° View ${index + 1}',
                  height: MediaQuery.of(context).size.height,
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
                            if (widget.virtual360Images[currentIndex]
                                    ['description'] !=
                                null)
                              Text(
                                widget.virtual360Images[currentIndex]
                                    ['description'],
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
                      if (widget.virtual360Images.length > 1) ...[
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List.generate(
                            widget.virtual360Images.length,
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
                      if (widget.virtual360Images.length > 1)
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
                                '${currentIndex + 1} / ${widget.virtual360Images.length}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                            IconButton(
                              onPressed: currentIndex <
                                      widget.virtual360Images.length - 1
                                  ? _nextImage
                                  : null,
                              icon: Icon(
                                Icons.skip_next,
                                color: currentIndex <
                                        widget.virtual360Images.length - 1
                                    ? Colors.white
                                    : Colors.white.withValues(alpha: 0.3),
                                size: 32,
                              ),
                            ),
                          ],
                        ),

                      // Instructions
                      if (widget.virtual360Images.length == 1 ||
                          currentIndex == 0)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            widget.virtual360Images.length > 1
                                ? 'Swipe to navigate • Tap to show/hide controls'
                                : 'Drag to explore • Tap to show/hide controls',
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
