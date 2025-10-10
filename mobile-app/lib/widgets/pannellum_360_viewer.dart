import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

class Pannellum360Viewer extends StatefulWidget {
  final String imageUrl;
  final String? title;
  final String? description;
  final double height;
  final bool showControls;
  final Function(String)? onError;

  const Pannellum360Viewer({
    super.key,
    required this.imageUrl,
    this.title,
    this.description,
    this.height = 400.0,
    this.showControls = true,
    this.onError,
  });

  @override
  State<Pannellum360Viewer> createState() => _Pannellum360ViewerState();
}

class _Pannellum360ViewerState extends State<Pannellum360Viewer> {
  InAppWebViewController? _webViewController;
  bool _isLoading = true;
  String? _error;

  String get _htmlContent => '''
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>360° Virtual Tour</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css"/>
    <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js"></script>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #000;
        }
        #panorama {
            width: 100vw;
            height: 100vh;
        }
        .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            z-index: 1000;
        }
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #333;
            border-top: 3px solid #fff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .error-message {
            color: #ff6b6b;
            text-align: center;
            padding: 20px;
            background: rgba(255, 107, 107, 0.1);
            border-radius: 8px;
            margin: 20px;
        }
        .info-overlay {
            position: absolute;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 100;
        }
    </style>
</head>
<body>
    <div id="loading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <div>Loading Virtual Tour...</div>
    </div>
    
    <div id="error" class="error-message" style="display: none;">
        <h3>Unable to load virtual tour</h3>
        <p>Please check your internet connection and try again.</p>
    </div>
    
    <div id="panorama"></div>
    
    ${widget.showControls ? '''
    <div class="info-overlay">
        <div>Drag to explore • Pinch to zoom</div>
    </div>
    ''' : ''}

    <script>
        function initPannellum() {
            try {
                const viewer = pannellum.viewer('panorama', {
                    "type": "equirectangular",
                    "panorama": "${widget.imageUrl}",
                    "autoLoad": true,
                    "showControls": ${widget.showControls},
                    "showZoomCtrl": ${widget.showControls},
                    "showFullscreenCtrl": ${widget.showControls},
                    "mouseZoom": true,
                    "doubleClickZoom": true,
                    "keyboardZoom": true,
                    "draggable": true,
                    "friction": 0.15,
                    "hfov": 90,
                    "pitch": 0,
                    "yaw": 0,
                    "minHfov": 50,
                    "maxHfov": 120,
                    "compass": true,
                    "backgroundColor": [0, 0, 0],
                    "loadButtonLabel": "Click to Load Virtual Tour",
                    "loadingLabel": "Loading Church Virtual Tour...",
                    "bylineLabel": "VISITA Bohol Churches",
                    "noPanoramaError": "Failed to load virtual tour image.",
                    "fileAccessError": "Unable to access virtual tour file.",
                    "malformedURLError": "Invalid virtual tour URL."
                });

                viewer.on('load', function() {
                    document.getElementById('loading').style.display = 'none';
                    window.flutter_inappwebview.callHandler('onLoad');
                });

                viewer.on('error', function(error) {
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('error').style.display = 'block';
                    window.flutter_inappwebview.callHandler('onError', error);
                });

                // Mobile-specific optimizations
                viewer.on('mousedown', function() {
                    document.body.style.overflow = 'hidden';
                });

                viewer.on('mouseup', function() {
                    document.body.style.overflow = 'auto';
                });

            } catch (error) {
                document.getElementById('loading').style.display = 'none';
                document.getElementById('error').style.display = 'block';
                window.flutter_inappwebview.callHandler('onError', error.message);
            }
        }

        // Initialize when page loads
        window.addEventListener('load', initPannellum);
        
        // Fallback initialization
        setTimeout(initPannellum, 1000);
    </script>
</body>
</html>
''';

  @override
  Widget build(BuildContext context) {
    return Container(
      height: widget.height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Stack(
          children: [
            // Web View
            InAppWebView(
              initialData: InAppWebViewInitialData(
                data: _htmlContent,
                mimeType: "text/html",
                encoding: "utf8",
              ),
              initialSettings: InAppWebViewSettings(
                transparentBackground: true,
                supportZoom: true,
                builtInZoomControls: false,
                displayZoomControls: false,
                allowsInlineMediaPlayback: true,
                mediaPlaybackRequiresUserGesture: false,
                verticalScrollBarEnabled: false,
                horizontalScrollBarEnabled: false,
                disableDefaultErrorPage: true,
                allowsBackForwardNavigationGestures: false,
              ),
              onWebViewCreated: (controller) {
                _webViewController = controller;

                // Add handlers for JavaScript communication
                controller.addJavaScriptHandler(
                  handlerName: 'onLoad',
                  callback: (args) {
                    setState(() {
                      _isLoading = false;
                      _error = null;
                    });
                  },
                );

                controller.addJavaScriptHandler(
                  handlerName: 'onError',
                  callback: (args) {
                    final errorMessage =
                        args.isNotEmpty ? args[0].toString() : 'Unknown error';
                    setState(() {
                      _isLoading = false;
                      _error = errorMessage;
                    });
                    widget.onError?.call(errorMessage);
                  },
                );
              },
              onLoadStart: (controller, url) {
                setState(() {
                  _isLoading = true;
                  _error = null;
                });
              },
              onReceivedError: (controller, request, error) {
                setState(() {
                  _isLoading = false;
                  _error = 'Failed to load virtual tour: ${error.description}';
                });
                widget.onError?.call(error.description);
              },
            ),

            // Loading overlay
            if (_isLoading)
              Container(
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.8),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                      SizedBox(height: 16),
                      Text(
                        'Loading Virtual Tour...',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // Error overlay
            if (_error != null)
              Container(
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.8),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.error_outline,
                          color: Colors.red,
                          size: 48,
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Unable to load virtual tour',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _error!,
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.7),
                            fontSize: 12,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: () {
                            _webViewController?.reload();
                          },
                          icon: const Icon(Icons.refresh, size: 18),
                          label: const Text('Try Again'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue,
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

            // Title overlay
            if (widget.title != null && !_isLoading && _error == null)
              Positioned(
                top: 12,
                left: 12,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.7),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.view_in_ar,
                        color: Colors.white,
                        size: 16,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        widget.title!,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
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
}

// Usage example in church detail screen
class ChurchVirtualTourSection extends StatelessWidget {
  final List<Map<String, dynamic>> virtual360Images;

  const ChurchVirtualTourSection({
    super.key,
    required this.virtual360Images,
  });

  @override
  Widget build(BuildContext context) {
    if (virtual360Images.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.all(16),
          child: Text(
            '360° Virtual Tour',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        SizedBox(
          height: 250,
          child: PageView.builder(
            itemCount: virtual360Images.length,
            itemBuilder: (context, index) {
              final image = virtual360Images[index];
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Pannellum360Viewer(
                  imageUrl: image['url'],
                  title: image['description'] ?? '360° View ${index + 1}',
                  height: 250,
                  onError: (error) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Error loading virtual tour: $error'),
                        backgroundColor: Colors.red,
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ),
        if (virtual360Images.length > 1)
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                virtual360Images.length,
                (index) => Container(
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.grey.withValues(alpha: 0.5),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
