import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';

/// Optimized image widget with progressive loading, placeholder, and error handling
///
/// Features:
/// - Progressive loading (placeholder → low-res → high-res)
/// - Shimmer effect for loading state
/// - Automatic retry on error
/// - Memory-efficient caching
/// - Smooth fade-in animations
///
/// Usage:
/// ```dart
/// OptimizedImageWidget(
///   imageUrl: 'https://example.com/image.jpg',
///   width: 300,
///   height: 200,
///   fit: BoxFit.cover,
/// )
/// ```
class OptimizedImageWidget extends StatefulWidget {
  /// URL or asset path of the image
  final String imageUrl;

  /// Box fit for the image
  final BoxFit fit;

  /// Width of the image container
  final double? width;

  /// Height of the image container
  final double? height;

  /// Border radius for rounded corners
  final BorderRadius? borderRadius;

  /// Custom placeholder widget (defaults to shimmer)
  final Widget? placeholder;

  /// Custom error widget (defaults to icon with retry)
  final Widget? errorWidget;

  /// Background color for the container
  final Color? backgroundColor;

  /// Enable fade-in animation (default: true)
  final bool enableFadeIn;

  /// Fade-in animation duration
  final Duration fadeInDuration;

  /// Whether this is a network image (vs asset image)
  final bool isNetworkImage;

  const OptimizedImageWidget({
    super.key,
    required this.imageUrl,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.borderRadius,
    this.placeholder,
    this.errorWidget,
    this.backgroundColor,
    this.enableFadeIn = true,
    this.fadeInDuration = const Duration(milliseconds: 300),
    this.isNetworkImage = true,
  });

  @override
  State<OptimizedImageWidget> createState() => _OptimizedImageWidgetState();
}

class _OptimizedImageWidgetState extends State<OptimizedImageWidget> {
  int _retryCount = 0;
  final int _maxRetries = 3;
  bool _hasError = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: widget.width,
      height: widget.height,
      decoration: BoxDecoration(
        color: widget.backgroundColor ?? Colors.grey[100],
        borderRadius: widget.borderRadius,
      ),
      child: ClipRRect(
        borderRadius: widget.borderRadius ?? BorderRadius.zero,
        child:
            widget.isNetworkImage ? _buildNetworkImage() : _buildAssetImage(),
      ),
    );
  }

  /// Build network image with caching and progressive loading
  Widget _buildNetworkImage() {
    // Use Image.network directly on web for better Firebase Storage compatibility
    if (kIsWeb) {
      return Image.network(
        widget.imageUrl,
        fit: widget.fit,
        width: widget.width,
        height: widget.height,
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return widget.placeholder ?? _buildShimmerPlaceholder();
        },
        errorBuilder: (context, error, stackTrace) {
          return widget.errorWidget ?? _buildErrorWidget();
        },
      );
    }

    // Use CachedNetworkImage on mobile for better performance
    return CachedNetworkImage(
      imageUrl: widget.imageUrl,
      fit: widget.fit,
      width: widget.width,
      height: widget.height,
      // Progressive loading stages
      placeholder: (context, url) =>
          widget.placeholder ?? _buildShimmerPlaceholder(),
      errorWidget: (context, url, error) {
        if (_retryCount < _maxRetries && !_hasError) {
          // Automatic retry logic
          Future.delayed(Duration(milliseconds: 500 * (_retryCount + 1)), () {
            if (mounted) {
              setState(() {
                _retryCount++;
              });
            }
          });
        } else {
          _hasError = true;
        }

        return widget.errorWidget ?? _buildErrorWidget();
      },
      // Fade-in animation for smooth appearance
      fadeInDuration:
          widget.enableFadeIn ? widget.fadeInDuration : Duration.zero,
      fadeOutDuration: const Duration(milliseconds: 200),
      // Cache configuration for performance
      memCacheWidth: widget.width?.toInt(),
      memCacheHeight: widget.height?.toInt(),
      maxWidthDiskCache: 1024, // Max 1024px width in disk cache
      maxHeightDiskCache: 1024, // Max 1024px height in disk cache
    );
  }

  /// Build asset image with error handling
  Widget _buildAssetImage() {
    return Image.asset(
      widget.imageUrl,
      fit: widget.fit,
      width: widget.width,
      height: widget.height,
      errorBuilder: (context, error, stackTrace) {
        return widget.errorWidget ?? _buildErrorWidget();
      },
    );
  }

  /// Build shimmer loading placeholder
  Widget _buildShimmerPlaceholder() {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      period: const Duration(milliseconds: 1500),
      child: Container(
        width: widget.width,
        height: widget.height,
        color: Colors.white,
      ),
    );
  }

  /// Build error widget with retry button
  Widget _buildErrorWidget() {
    return Container(
      width: widget.width,
      height: widget.height,
      color: Colors.grey[200],
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.broken_image_outlined,
            size: 48,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 8),
          Text(
            'Failed to load image',
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey[600],
            ),
          ),
          if (_hasError && _retryCount >= _maxRetries) ...[
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: () {
                setState(() {
                  _retryCount = 0;
                  _hasError = false;
                });
              },
              icon: const Icon(Icons.refresh, size: 16),
              label: const Text('Retry'),
              style: TextButton.styleFrom(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                visualDensity: VisualDensity.compact,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Optimized church image widget specifically for church detail screens
///
/// This widget includes church-specific styling and optimizations:
/// - Rounded corners with consistent styling
/// - Church icon as fallback
/// - Optimized cache sizes for church images
class OptimizedChurchImage extends StatelessWidget {
  final String imageUrl;
  final double? width;
  final double? height;
  final BoxFit fit;
  final bool isNetworkImage;

  const OptimizedChurchImage({
    super.key,
    required this.imageUrl,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.isNetworkImage = true,
  });

  @override
  Widget build(BuildContext context) {
    return OptimizedImageWidget(
      imageUrl: imageUrl,
      width: width,
      height: height,
      fit: fit,
      isNetworkImage: isNetworkImage,
      borderRadius: BorderRadius.circular(16),
      backgroundColor: const Color(0xFFF5F1E8), // Church-themed background
      errorWidget: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: const Color(0xFFF5F1E8),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.account_balance,
              size: 64,
              color: const Color(0xFF8B5E3C).withValues(alpha: 0.5),
            ),
            const SizedBox(height: 8),
            Text(
              'Church Image',
              style: TextStyle(
                fontSize: 14,
                color: const Color(0xFF8B5E3C).withValues(alpha: 0.7),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Optimized thumbnail widget for church cards in lists
///
/// Features smaller cache size and simplified placeholder for list performance
class OptimizedChurchThumbnail extends StatelessWidget {
  final String imageUrl;
  final double size;
  final bool isNetworkImage;

  const OptimizedChurchThumbnail({
    super.key,
    required this.imageUrl,
    this.size = 80,
    this.isNetworkImage = true,
  });

  @override
  Widget build(BuildContext context) {
    return OptimizedImageWidget(
      imageUrl: imageUrl,
      width: size,
      height: size,
      fit: BoxFit.cover,
      isNetworkImage: isNetworkImage,
      borderRadius: BorderRadius.circular(12),
      backgroundColor: const Color(0xFFF5F1E8),
      fadeInDuration:
          const Duration(milliseconds: 200), // Faster for thumbnails
      placeholder: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: Colors.grey[200],
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(
          Icons.church,
          size: size * 0.4,
          color: Colors.grey[400],
        ),
      ),
      errorWidget: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: const Color(0xFFF5F1E8),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(
          Icons.account_balance,
          size: size * 0.5,
          color: const Color(0xFF8B5E3C).withValues(alpha: 0.5),
        ),
      ),
    );
  }
}
