import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import '../models/virtual_tour.dart';

/// Pannellum-based 360° viewer with multi-scene navigation
class TourViewer extends StatefulWidget {
  final VirtualTour tour;
  final TourScene initialScene;
  final Function(String sceneId) onNavigate;

  const TourViewer({
    super.key,
    required this.tour,
    required this.initialScene,
    required this.onNavigate,
  });

  @override
  State<TourViewer> createState() => _TourViewerState();
}

class _TourViewerState extends State<TourViewer> {
  InAppWebViewController? _webViewController;
  late TourScene _currentScene;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _currentScene = widget.initialScene;
  }

  @override
  void didUpdateWidget(TourViewer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialScene.id != _currentScene.id) {
      debugPrint('🔄 [TourViewer] Scene change detected via didUpdateWidget');
      debugPrint('   - Old scene: ${_currentScene.title}');
      debugPrint('   - New scene: ${widget.initialScene.title}');

      // Immediately show loading indicator
      setState(() {
        _isLoading = true;
        _currentScene = widget.initialScene;
      });

      // Load the new scene
      _loadScene(_currentScene.id);
    }
  }

  /// Load a new scene in the viewer
  Future<void> _loadScene(String sceneId) async {
    if (_webViewController == null) return;

    final scene = widget.tour.getSceneById(sceneId);
    if (scene == null) {
      debugPrint('⚠️ [TourViewer] Scene not found: $sceneId');
      return;
    }

    debugPrint('📍 [TourViewer] Loading scene: ${scene.title}');

    // Ensure loading indicator is visible
    if (!_isLoading) {
      setState(() {
        _isLoading = true;
        _currentScene = scene;
      });
    }

    // Use Pannellum's built-in loadScene method
    await _webViewController!.evaluateJavascript(source: '''
      loadScene('$sceneId');
    ''');

    // Wait for scene transition (500ms to ensure loading indicator is visible)
    await Future.delayed(const Duration(milliseconds: 500));

    if (mounted) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  /// Build a single pulsing dot for the loading indicator
  Widget _buildPulsingDot(int index) {
    return TweenAnimationBuilder<double>(
      duration: const Duration(milliseconds: 600),
      tween: Tween(begin: 0.3, end: 1.0),
      curve: Curves.easeInOut,
      builder: (context, value, child) {
        // Delay each dot's animation based on its index
        final delay = index * 0.15;
        final adjustedValue = (value - delay).clamp(0.3, 1.0);

        return Opacity(
          opacity: adjustedValue,
          child: Container(
            width: 6,
            height: 6,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
          ),
        );
      },
      onEnd: () {
        // Restart animation by rebuilding
        if (mounted && _isLoading) {
          setState(() {});
        }
      },
    );
  }

  String _buildHtmlContent() {
    return '''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css"/>
  <script src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"></script>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
    #panorama {
      width: 100%;
      height: 100%;
    }

    /* Style Pannellum's default scene link arrows - these are BUILT-IN and always work */
    .pnlm-scene {
      /* Pannellum's built-in scene hotspots already have arrow icons */
      /* We just enhance the styling */
    }

    /* Override Pannellum's info hotspot styling */
    .pnlm-info-hotspot {
      /* Pannellum's built-in info hotspots - just style them nicely */
    }

    /* Completely hide all Pannellum loading indicators */
    .pnlm-load-box {
      display: none !important;
    }

    .pnlm-load-box p,
    .pnlm-lmsg {
      display: none !important;
    }

    .pnlm-load-bar,
    .pnlm-load-bar-fill {
      display: none !important;
    }

    .pnlm-lbar {
      display: none !important;
    }

    /* Black background during transitions */
    .pnlm-container {
      background: #000000 !important;
    }
  </style>
</head>
<body>
  <div id="panorama"></div>

  <script>
    var viewer;
    var allScenes = {}; // Store all scenes for multi-scene navigation

    // Initialize Pannellum viewer with multi-scene configuration
    function initViewer(config) {
      console.log('[Pannellum] Initializing multi-scene viewer');
      console.log('[Pannellum] Total scenes:', config.scenes.length);
      console.log('[Pannellum] Starting scene:', config.startSceneId);

      // Build scenes configuration
      var scenes = {};
      config.scenes.forEach(function(scene) {
        console.log('[Pannellum] Configuring scene:', scene.id, '(' + scene.title + ') with', scene.hotspots.length, 'hotspots');

        var hotSpots = scene.hotspots.map(function(h) {
          console.log('  - Hotspot:', h.label, 'type=' + h.hotspotType, 'at pitch=' + h.pitch + ', yaw=' + h.yaw);

          if (h.hotspotType === 'navigation') {
            // Use Pannellum's BUILT-IN scene type for navigation - this shows arrows automatically
            return {
              id: h.id,
              pitch: h.pitch,
              yaw: h.yaw,
              type: 'scene',
              text: h.label,
              sceneId: h.targetSceneId,
              targetYaw: h.targetYaw || undefined,
              targetPitch: h.targetPitch || undefined
            };
          } else {
            // Use Pannellum's BUILT-IN info type for information hotspots
            return {
              id: h.id,
              pitch: h.pitch,
              yaw: h.yaw,
              type: 'info',
              text: h.label + (h.description ? '<br><br>' + h.description : '')
            };
          }
        });

        scenes[scene.id] = {
          type: 'equirectangular',
          panorama: scene.imageUrl,
          hotSpots: hotSpots,
          title: scene.title
        };
      });

      allScenes = scenes;

      // Initialize viewer with multi-scene configuration
      viewer = pannellum.viewer('panorama', {
        default: {
          firstScene: config.startSceneId,
          sceneFadeDuration: 1000,
          autoLoad: true,
          showControls: true,
          showFullscreenCtrl: false,
          showZoomCtrl: true,
          mouseZoom: true,
          draggable: true,
          doubleClickZoom: false,
          friction: 0.15,
          autoRotate: 0
        },
        scenes: scenes
      });

      // Listen for scene changes to notify Flutter
      viewer.on('scenechange', function(sceneId) {
        console.log('[Pannellum] Scene changed to:', sceneId);
        window.flutter_inappwebview.callHandler('onSceneChange', sceneId);
      });

      viewer.on('error', function(error) {
        console.error('[Pannellum] Error:', error);
        window.flutter_inappwebview.callHandler('onError', error.toString());
      });

      console.log('[Pannellum] Multi-scene viewer initialized successfully');
      console.log('[Pannellum] Scenes configured:', Object.keys(scenes).length);
    }

    // Load a specific scene (for external navigation control)
    function loadScene(sceneId) {
      console.log('[Pannellum] Loading scene:', sceneId);
      if (viewer) {
        viewer.loadScene(sceneId);
      }
    }

    // Initial load from Flutter
    window.addEventListener('flutterInAppWebViewPlatformReady', function() {
      window.flutter_inappwebview.callHandler('getMultiSceneConfig').then(function(config) {
        console.log('[Pannellum] Received multi-scene config from Flutter');
        initViewer(config);
      });
    });
  </script>
</body>
</html>
    ''';
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        InAppWebView(
          initialData: InAppWebViewInitialData(data: _buildHtmlContent()),
          gestureRecognizers: <Factory<OneSequenceGestureRecognizer>>{
            Factory<EagerGestureRecognizer>(
              () => EagerGestureRecognizer(),
            ),
          },
          initialSettings: InAppWebViewSettings(
            transparentBackground: true,
            supportZoom: false,
            disableHorizontalScroll: false,
            disableVerticalScroll: false,
            javaScriptEnabled: true,
            mediaPlaybackRequiresUserGesture: false,
            allowFileAccessFromFileURLs: true,
            allowUniversalAccessFromFileURLs: true,
          ),
          onWebViewCreated: (controller) {
            _webViewController = controller;

            // Register handler to provide multi-scene configuration
            controller.addJavaScriptHandler(
              handlerName: 'getMultiSceneConfig',
              callback: (args) {
                debugPrint('🎬 [TourViewer] Providing multi-scene config');
                debugPrint('   - Total scenes: ${widget.tour.scenes.length}');
                debugPrint('   - Start scene: ${_currentScene.title}');

                // Build scene configurations
                final scenes = widget.tour.scenes.map((scene) {
                  debugPrint('   - Scene: ${scene.title} (${scene.hotspots.length} hotspots)');

                  return {
                    'id': scene.id,
                    'title': scene.title,
                    'imageUrl': scene.imageUrl,
                    'hotspots': scene.hotspots.map((h) {
                      debugPrint('     • Hotspot: ${h.label} (${h.type}) at (${h.pitch}, ${h.yaw})');

                      return {
                        'id': h.id,
                        'pitch': h.pitch,
                        'yaw': h.yaw,
                        'hotspotType': h.type,
                        'label': h.label,
                        'description': h.description ?? '',
                        'targetSceneId': h.targetSceneId ?? '',
                      };
                    }).toList(),
                  };
                }).toList();

                return {
                  'scenes': scenes,
                  'startSceneId': _currentScene.id,
                };
              },
            );

            // Register scene change handler (for when Pannellum navigates internally)
            controller.addJavaScriptHandler(
              handlerName: 'onSceneChange',
              callback: (args) {
                final sceneId = args[0] as String;
                debugPrint('🔄 [TourViewer] Scene changed to: $sceneId');

                // Update current scene and notify parent
                final scene = widget.tour.getSceneById(sceneId);
                if (scene != null) {
                  setState(() {
                    _currentScene = scene;
                  });
                  widget.onNavigate(sceneId);
                }
              },
            );

            // Register error handler
            controller.addJavaScriptHandler(
              handlerName: 'onError',
              callback: (args) {
                final error = args[0] as String;
                debugPrint('❌ [TourViewer] Error: $error');
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Failed to load 360° image: $error'),
                    backgroundColor: Colors.red,
                  ),
                );
              },
            );
          },
          onLoadStop: (controller, url) {
            debugPrint('✅ [TourViewer] WebView loaded');
            setState(() {
              _isLoading = false;
            });
          },
        ),
        // Progress bar for scene transitions
        if (_isLoading)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: AnimatedOpacity(
              opacity: _isLoading ? 1.0 : 0.0,
              duration: const Duration(milliseconds: 150),
              child: TweenAnimationBuilder<double>(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOut,
                tween: Tween<double>(
                  begin: 0.0,
                  end: _isLoading ? 1.0 : 0.0,
                ),
                builder: (context, value, _) => LinearProgressIndicator(
                  value: value,
                  backgroundColor: Colors.transparent,
                  valueColor: const AlwaysStoppedAnimation<Color>(
                    Color(0xFF2C5F2D),
                  ),
                  minHeight: 3,
                ),
              ),
            ),
          ),
        // Scene name display during transitions (not on initial load)
        if (_isLoading && _webViewController != null)
          Positioned(
            top: 60,
            left: 0,
            right: 0,
            child: AnimatedOpacity(
              opacity: _isLoading ? 1.0 : 0.0,
              duration: const Duration(milliseconds: 200),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.7),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.2),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Three pulsing dots indicator
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _buildPulsingDot(0),
                          const SizedBox(width: 4),
                          _buildPulsingDot(1),
                          const SizedBox(width: 4),
                          _buildPulsingDot(2),
                        ],
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'Loading ${_currentScene.title}...',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        // Minimal center loading indicator (only for initial load)
        if (_isLoading && _webViewController == null)
          AnimatedOpacity(
            opacity: _isLoading ? 1.0 : 0.0,
            duration: const Duration(milliseconds: 300),
            child: Container(
              color: Colors.black87,
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.7),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: const Color(0xFF2C5F2D).withValues(alpha: 0.3),
                          width: 1,
                        ),
                      ),
                      child: const Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            width: 28,
                            height: 28,
                            child: CircularProgressIndicator(
                              color: Color(0xFF2C5F2D),
                              strokeWidth: 2.5,
                            ),
                          ),
                          SizedBox(height: 16),
                          Text(
                            'Initializing tour...',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 13,
                              fontWeight: FontWeight.w400,
                              letterSpacing: 0.3,
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
      ],
    );
  }
}
