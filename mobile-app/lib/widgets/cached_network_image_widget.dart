import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/offline_image_cache_service.dart';

class CachedNetworkImageWidget extends StatefulWidget {
  final String imageUrl;
  final double? width;
  final double? height;
  final BoxFit fit;
  final Widget? placeholder;
  final Widget? errorWidget;
  final bool fadeInDuration;
  final Duration fadeInAnimationDuration;
  final bool cacheImage;

  const CachedNetworkImageWidget({
    super.key,
    required this.imageUrl,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.placeholder,
    this.errorWidget,
    this.fadeInDuration = true,
    this.fadeInAnimationDuration = const Duration(milliseconds: 300),
    this.cacheImage = true,
  });

  @override
  State<CachedNetworkImageWidget> createState() =>
      _CachedNetworkImageWidgetState();
}

class _CachedNetworkImageWidgetState extends State<CachedNetworkImageWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _animation;

  bool _isLoading = true;
  bool _hasError = false;
  Widget? _imageWidget;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: widget.fadeInAnimationDuration,
      vsync: this,
    );
    _animation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeIn),
    );
    _loadImage();
  }

  @override
  void didUpdateWidget(CachedNetworkImageWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.imageUrl != widget.imageUrl) {
      _loadImage();
    }
  }

  Future<void> _loadImage() async {
    if (!mounted) return;

    setState(() {
      _isLoading = true;
      _hasError = false;
      _imageWidget = null;
    });

    try {
      // On web, use direct Image.network without caching
      if (kIsWeb) {
        _imageWidget = Image.network(
          widget.imageUrl,
          width: widget.width,
          height: widget.height,
          fit: widget.fit,
          frameBuilder: (context, child, frame, wasSynchronouslyLoaded) {
            if (wasSynchronouslyLoaded || !widget.fadeInDuration) {
              return child;
            }

            if (frame != null) {
              _animationController.forward();
              return FadeTransition(
                opacity: _animation,
                child: child,
              );
            }

            return widget.placeholder ?? _buildDefaultPlaceholder();
          },
          errorBuilder: (context, error, stackTrace) {
            debugPrint('Error displaying image: $error');
            return widget.errorWidget ?? _buildDefaultErrorWidget();
          },
          loadingBuilder: (context, child, loadingProgress) {
            if (loadingProgress == null) return child;
            return widget.placeholder ?? _buildDefaultPlaceholder();
          },
        );

        if (mounted) {
          setState(() {
            _isLoading = false;
            _hasError = false;
          });
        }
      } else {
        // On mobile, use cache service
        final cacheService = context.read<OfflineImageCacheService>();
        final imageBytes = await cacheService.getImage(
          widget.imageUrl,
          isPermanent: widget.cacheImage,
        );

        if (!mounted) return;

        if (imageBytes != null) {
          _imageWidget = Image.memory(
            imageBytes,
            width: widget.width,
            height: widget.height,
            fit: widget.fit,
            frameBuilder: (context, child, frame, wasSynchronouslyLoaded) {
              if (wasSynchronouslyLoaded || !widget.fadeInDuration) {
                return child;
              }

              if (frame != null) {
                _animationController.forward();
                return FadeTransition(
                  opacity: _animation,
                  child: child,
                );
              }

              return widget.placeholder ?? _buildDefaultPlaceholder();
            },
            errorBuilder: (context, error, stackTrace) {
              debugPrint('Error displaying image: $error');
              return widget.errorWidget ?? _buildDefaultErrorWidget();
            },
          );

          setState(() {
            _isLoading = false;
            _hasError = false;
          });
        } else {
          setState(() {
            _isLoading = false;
            _hasError = true;
          });
        }
      }
    } catch (e) {
      debugPrint('Error loading image ${widget.imageUrl}: $e');
      if (mounted) {
        setState(() {
          _isLoading = false;
          _hasError = true;
        });
      }
    }
  }

  Widget _buildDefaultPlaceholder() {
    return Container(
      width: widget.width,
      height: widget.height,
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Center(
        child: CircularProgressIndicator(strokeWidth: 2),
      ),
    );
  }

  Widget _buildDefaultErrorWidget() {
    return Container(
      width: widget.width,
      height: widget.height,
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.image_not_supported,
            color: Colors.grey.shade500,
            size: 32,
          ),
          const SizedBox(height: 8),
          Text(
            'Image not available',
            style: TextStyle(
              color: Colors.grey.shade600,
              fontSize: 12,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return widget.placeholder ?? _buildDefaultPlaceholder();
    }

    if (_hasError) {
      return widget.errorWidget ?? _buildDefaultErrorWidget();
    }

    return _imageWidget ?? _buildDefaultErrorWidget();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }
}

// Convenience widget for circular cached images (avatars, profile pics)
class CachedCircularImage extends StatelessWidget {
  final String imageUrl;
  final double radius;
  final Widget? placeholder;
  final Widget? errorWidget;

  const CachedCircularImage({
    super.key,
    required this.imageUrl,
    this.radius = 25,
    this.placeholder,
    this.errorWidget,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: CachedNetworkImageWidget(
        imageUrl: imageUrl,
        width: radius * 2,
        height: radius * 2,
        fit: BoxFit.cover,
        placeholder: placeholder ??
            Container(
              width: radius * 2,
              height: radius * 2,
              decoration: BoxDecoration(
                color: Colors.grey.shade200,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.person,
                color: Colors.grey.shade500,
                size: radius,
              ),
            ),
        errorWidget: errorWidget ??
            Container(
              width: radius * 2,
              height: radius * 2,
              decoration: BoxDecoration(
                color: Colors.grey.shade200,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.person,
                color: Colors.grey.shade500,
                size: radius,
              ),
            ),
      ),
    );
  }
}

// Widget for church images with fallback
class ChurchImageWidget extends StatelessWidget {
  final String? imageUrl;
  final double? width;
  final double? height;
  final BoxFit fit;
  final bool showFallback;

  const ChurchImageWidget({
    super.key,
    this.imageUrl,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.showFallback = true,
  });

  @override
  Widget build(BuildContext context) {
    if (imageUrl == null || imageUrl!.isEmpty) {
      return _buildFallbackWidget();
    }

    return CachedNetworkImageWidget(
      imageUrl: imageUrl!,
      width: width,
      height: height,
      fit: fit,
      placeholder: _buildPlaceholderWidget(),
      errorWidget: showFallback ? _buildFallbackWidget() : null,
      cacheImage: true, // Church images should be cached permanently
    );
  }

  Widget _buildPlaceholderWidget() {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Center(
        child: CircularProgressIndicator(strokeWidth: 2),
      ),
    );
  }

  Widget _buildFallbackWidget() {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.church,
            color: Colors.grey.shade500,
            size: (height != null && height! < 100) ? 24 : 48,
          ),
          if (height == null || height! >= 80) ...[
            const SizedBox(height: 8),
            Text(
              'Church Image',
              style: TextStyle(
                color: Colors.grey.shade600,
                fontSize: 12,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }
}
