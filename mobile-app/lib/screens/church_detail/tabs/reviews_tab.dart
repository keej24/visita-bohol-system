import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'dart:io';
import 'package:uuid/uuid.dart';
import '../../../models/church.dart';
import '../../../models/feedback.dart';
import '../../../services/feedback_service.dart';
import '../../../services/auth_service.dart';
import '../../../widgets/guest_feature_prompt.dart';

class ReviewsTab extends StatefulWidget {
  final Church church;

  const ReviewsTab({super.key, required this.church});

  @override
  State<ReviewsTab> createState() => _ReviewsTabState();
}

class _ReviewsTabState extends State<ReviewsTab> {
  late TextEditingController _reviewController;
  int _starRating = 0;
  final FeedbackService _feedbackService = FeedbackService();
  List<FeedbackModel> _reviews = [];
  bool _isLoadingReviews = true;
  final List<File> _selectedPhotos = [];
  final ImagePicker _picker = ImagePicker();
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _reviewController = TextEditingController();
    _loadReviews();
  }

  Future<void> _loadReviews() async {
    try {
      final reviews = await _feedbackService.loadForChurch(widget.church.id);
      debugPrint('📸 [REVIEWS TAB] Loaded ${reviews.length} reviews');
      for (var review in reviews) {
        debugPrint('   - Review ${review.id}: ${review.photos.length} photos');
        if (review.photos.isNotEmpty) {
          for (var i = 0; i < review.photos.length; i++) {
            debugPrint('     Photo $i: ${review.photos[i]}');
          }
        }
      }
      if (mounted) {
        setState(() {
          _reviews = reviews;
          _isLoadingReviews = false;
        });
      }
    } catch (e) {
      debugPrint('❌ Error loading reviews: $e');
      if (mounted) {
        setState(() {
          _isLoadingReviews = false;
        });
      }
    }
  }

  Future<void> _pickImages() async {
    try {
      final images = await _picker.pickMultiImage(
        imageQuality: 80,
        maxWidth: 1600,
      );
      if (images.isNotEmpty) {
        // Validate file sizes (10MB limit)
        const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
        final List<File> validImages = [];
        final List<String> oversizedImages = [];

        for (var image in images) {
          final file = File(image.path);
          final fileSize = await file.length();

          if (fileSize > maxSizeInBytes) {
            oversizedImages.add(image.name);
            debugPrint(
                '❌ [REVIEWS TAB] Image too large: ${image.name} (${(fileSize / (1024 * 1024)).toStringAsFixed(2)}MB)');
          } else {
            validImages.add(file);
            debugPrint(
                '✅ [REVIEWS TAB] Valid image: ${image.name} (${(fileSize / (1024 * 1024)).toStringAsFixed(2)}MB)');
          }
        }

        // Show error if any images are too large
        if (oversizedImages.isNotEmpty && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.error_outline, color: Colors.white),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      oversizedImages.length == 1
                          ? 'Image too large. Please upload a smaller file.'
                          : '${oversizedImages.length} images too large. Please upload smaller files.',
                    ),
                  ),
                ],
              ),
              backgroundColor: const Color(0xFFEF4444),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
              margin: const EdgeInsets.all(16),
              duration: const Duration(seconds: 3),
            ),
          );
        }

        // Add only valid images
        if (validImages.isNotEmpty) {
          setState(() {
            _selectedPhotos.addAll(validImages);
          });
          debugPrint(
              '📸 [REVIEWS TAB] Added ${validImages.length} valid photos');
        }
      }
    } catch (e) {
      debugPrint('❌ Error picking images: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.error_outline, color: Colors.white),
              const SizedBox(width: 12),
              Expanded(child: Text('Failed to pick images: ${e.toString()}')),
            ],
          ),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(16),
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  void _removePhoto(int index) {
    setState(() {
      _selectedPhotos.removeAt(index);
    });
    debugPrint('🗑️ [REVIEWS TAB] Removed photo at index $index');
  }

  Future<void> _submitReview() async {
    // Check if user is a guest - prompt to sign in
    if (GuestFeaturePrompt.isGuest(context)) {
      await GuestFeaturePrompt.show(
        context,
        feature: 'submitting reviews',
        description: 'Share your experience with other visitors.',
        icon: Icons.rate_review_outlined,
      );
      return;
    }

    // Validation
    if (_starRating == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.warning, color: Colors.white),
              SizedBox(width: 12),
              Expanded(child: Text('Please select a star rating')),
            ],
          ),
          backgroundColor: const Color(0xFFF59E0B),
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(16),
          duration: const Duration(seconds: 2),
        ),
      );
      return;
    }

    if (_reviewController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.warning, color: Colors.white),
              SizedBox(width: 12),
              Expanded(child: Text('Please write a review')),
            ],
          ),
          backgroundColor: const Color(0xFFF59E0B),
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(16),
          duration: const Duration(seconds: 2),
        ),
      );
      return;
    }

    if (_reviewController.text.trim().length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.warning, color: Colors.white),
              SizedBox(width: 12),
              Expanded(child: Text('Review must be at least 10 characters')),
            ],
          ),
          backgroundColor: const Color(0xFFF59E0B),
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(16),
          duration: const Duration(seconds: 2),
        ),
      );
      return;
    }

    // Get current user
    final authService = Provider.of<AuthService>(context, listen: false);
    final currentUser = authService.currentUser;

    if (currentUser == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.error_outline, color: Colors.white),
              SizedBox(width: 12),
              Expanded(child: Text('You must be logged in to submit a review')),
            ],
          ),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(16),
          duration: const Duration(seconds: 3),
        ),
      );
      return;
    }

    // Show confirmation dialog
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: const Row(
            children: [
              Icon(Icons.check_circle_outline,
                  color: Color(0xFF10B981), size: 28),
              SizedBox(width: 12),
              Text('Confirm Submission'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Please review your feedback before submitting:',
                style: TextStyle(fontSize: 14, color: Colors.grey),
              ),
              const SizedBox(height: 16),
              _buildConfirmationItem(
                icon: Icons.star,
                label: 'Rating',
                value: '$_starRating ${_starRating == 1 ? 'star' : 'stars'}',
                color: const Color(0xFFF59E0B),
              ),
              const SizedBox(height: 12),
              _buildConfirmationItem(
                icon: Icons.message,
                label: 'Review',
                value: _reviewController.text.trim().length > 50
                    ? '${_reviewController.text.trim().substring(0, 50)}...'
                    : _reviewController.text.trim(),
                color: const Color(0xFF3B82F6),
              ),
              if (_selectedPhotos.isNotEmpty) ...[
                const SizedBox(height: 12),
                _buildConfirmationItem(
                  icon: Icons.photo_library,
                  label: 'Photos',
                  value:
                      '${_selectedPhotos.length} ${_selectedPhotos.length == 1 ? 'photo' : 'photos'} attached',
                  color: const Color(0xFF8B5CF6),
                ),
              ],
              const SizedBox(height: 12),
              _buildConfirmationItem(
                icon: Icons.church,
                label: 'Church',
                value: widget.church.name,
                color: const Color(0xFF10B981),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              style: TextButton.styleFrom(
                foregroundColor: Colors.grey[600],
              ),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
              child: const Text('Confirm Feedback'),
            ),
          ],
        );
      },
    );

    // If user canceled, return early
    if (confirmed != true) {
      debugPrint('ℹ️ [REVIEWS TAB] User canceled feedback submission');
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      // Upload photos to Firebase Storage
      final List<String> photoUrls = [];
      final storage = FirebaseStorage.instance;

      for (int i = 0; i < _selectedPhotos.length; i++) {
        try {
          final file = _selectedPhotos[i];
          final fileName =
              '${widget.church.id}/${DateTime.now().millisecondsSinceEpoch}_${file.path.split(Platform.pathSeparator).last}';
          final ref = storage.ref().child('feedback_photos/$fileName');

          // Upload with metadata
          final metadata = SettableMetadata(
            contentType: 'image/jpeg',
            cacheControl: 'public, max-age=31536000',
            customMetadata: {
              'uploadedBy': 'mobile-app',
              'churchId': widget.church.id,
            },
          );

          debugPrint(
              '📤 [REVIEWS TAB] Uploading photo ${i + 1}/${_selectedPhotos.length}: $fileName');
          await ref.putFile(file, metadata);
          debugPrint(
              '✅ [REVIEWS TAB] Upload complete, getting download URL...');

          final url = await ref.getDownloadURL();
          debugPrint('✅ [REVIEWS TAB] Download URL obtained: $url');
          photoUrls.add(url);
        } catch (e) {
          debugPrint('❌ [REVIEWS TAB] Error uploading photo ${i + 1}: $e');
        }
      }

      debugPrint(
          '📊 [REVIEWS TAB] Successfully uploaded ${photoUrls.length} photos out of ${_selectedPhotos.length}');

      // Create feedback model
      final feedback = FeedbackModel(
        id: const Uuid().v4(),
        userId: currentUser.uid,
        userName: currentUser.displayName ?? 'Anonymous',
        churchId: widget.church.id,
        comment: _reviewController.text.trim(),
        rating: _starRating,
        photos: photoUrls,
        category: FeedbackCategory.general,
      );

      // Save to Firestore
      await _feedbackService.save(feedback);

      if (!mounted) return;

      // Show success message - inform user review is pending approval
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.hourglass_empty, color: Colors.white),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Review submitted! It will be visible after approval.',
                  style: TextStyle(fontSize: 14),
                ),
              ),
            ],
          ),
          backgroundColor: const Color(0xFF2563EB),
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(16),
          duration: const Duration(seconds: 3),
        ),
      );

      // Clear form and reload reviews
      setState(() {
        _starRating = 0;
        _reviewController.clear();
        _selectedPhotos.clear();
        _isSubmitting = false;
      });

      await _loadReviews();
    } catch (e) {
      debugPrint('❌ [REVIEWS TAB] Error submitting review: $e');

      if (!mounted) return;

      setState(() {
        _isSubmitting = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.error_outline, color: Colors.white),
              const SizedBox(width: 12),
              Expanded(
                  child: Text('Failed to submit feedback: ${e.toString()}')),
            ],
          ),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(16),
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  Widget _buildConfirmationItem({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: color),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.grey,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  color: Colors.black87,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _showDeleteConfirmation(FeedbackModel review) async {
    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded,
                color: Color(0xFFF59E0B), size: 28),
            SizedBox(width: 12),
            Text(
              'Delete Feedback?',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        content: const Text(
          'Are you sure you want to delete this feedback? This action cannot be undone.',
          style: TextStyle(
            fontSize: 14,
            color: Color(0xFF6B7280),
            height: 1.5,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text(
              'Cancel',
              style: TextStyle(
                color: Color(0xFF6B7280),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text(
              'Delete',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );

    if (shouldDelete == true) {
      await _deleteReview(review);
    }
  }

  Future<void> _deleteReview(FeedbackModel review) async {
    try {
      // Show loading indicator
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              ),
              SizedBox(width: 12),
              Text('Deleting review...'),
            ],
          ),
          backgroundColor: const Color(0xFF6B7280),
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(16),
          duration: const Duration(seconds: 2),
        ),
      );

      // Delete from Firestore
      await _feedbackService.delete(review.id);

      // Reload reviews
      await _loadReviews();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.white),
              SizedBox(width: 12),
              Text('Review deleted successfully'),
            ],
          ),
          backgroundColor: const Color(0xFF10B981),
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(16),
          duration: const Duration(seconds: 2),
        ),
      );
    } catch (e) {
      debugPrint('❌ Error deleting review: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.error_outline, color: Colors.white),
              const SizedBox(width: 12),
              Expanded(child: Text('Failed to delete review: ${e.toString()}')),
            ],
          ),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(16),
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  @override
  void dispose() {
    _reviewController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _loadReviews,
      color: const Color(0xFF2C5F2D),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        physics: const AlwaysScrollableScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Review Form Card
            _buildCard(
              icon: Icons.rate_review,
              title: 'Write a Review',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'How would you rate your visit?',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Star Rating Selector
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (index) {
                      return IconButton(
                        icon: Icon(
                          index < _starRating ? Icons.star : Icons.star_border,
                          color: const Color(0xFFFFB300),
                          size: 36,
                        ),
                        onPressed: () {
                          setState(() {
                            _starRating = index + 1;
                          });
                        },
                      );
                    }),
                  ),
                  const SizedBox(height: 16),
                  // Review Text Field
                  TextField(
                    controller: _reviewController,
                    maxLines: 4,
                    decoration: InputDecoration(
                      hintText: 'Share your experience...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(
                            color: Color(0xFF2C5F2D), width: 2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  // Photo Upload Button
                  Row(
                    children: [
                      OutlinedButton.icon(
                        onPressed: _isSubmitting ? null : _pickImages,
                        icon: const Icon(Icons.add_photo_alternate),
                        label: const Text('Add Photos'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF2C5F2D),
                          side: const BorderSide(color: Color(0xFF2C5F2D)),
                        ),
                      ),
                      if (_selectedPhotos.isNotEmpty) ...[
                        const SizedBox(width: 12),
                        Text(
                          '${_selectedPhotos.length} photo${_selectedPhotos.length == 1 ? '' : 's'} selected',
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF6B7280),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ],
                  ),
                  // Display selected photos
                  if (_selectedPhotos.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 90,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _selectedPhotos.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (_, index) => Stack(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.file(
                                _selectedPhotos[index],
                                width: 90,
                                height: 90,
                                fit: BoxFit.cover,
                              ),
                            ),
                            Positioned(
                              top: 4,
                              right: 4,
                              child: InkWell(
                                onTap: () => _removePhoto(index),
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: BoxDecoration(
                                    color: Colors.black.withValues(alpha: 0.6),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                    Icons.close,
                                    size: 16,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  // Submit Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isSubmitting ? null : _submitReview,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2C5F2D),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Text(
                              'Submit Feedback',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Recent Feedback Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Recent Feedback',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1F2937),
                  ),
                ),
                if (_reviews.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2C5F2D).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '${_reviews.length} ${_reviews.length == 1 ? 'feedback' : 'feedback'}',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF2C5F2D),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),

            // Loading State
            if (_isLoadingReviews)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: CircularProgressIndicator(
                    color: Color(0xFF2C5F2D),
                  ),
                ),
              ),

            // Reviews List
            if (!_isLoadingReviews && _reviews.isNotEmpty)
              ..._reviews.map((review) => _buildReviewCard(review)),

            // Empty State
            if (!_isLoadingReviews && _reviews.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: Column(
                    children: [
                      Icon(
                        Icons.rate_review_outlined,
                        size: 64,
                        color: Color(0xFFD1D5DB),
                      ),
                      SizedBox(height: 16),
                      Text(
                        'No feedback yet',
                        style: TextStyle(
                          color: Color(0xFF6B7280),
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'Be the first to share your experience!',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Color(0xFF9CA3AF),
                          fontSize: 14,
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

  Widget _buildReviewCard(FeedbackModel review) {
    // Get current user to check if this is their review
    final authService = Provider.of<AuthService>(context, listen: false);
    final currentUser = authService.currentUser;
    final isOwnReview = currentUser != null && currentUser.uid == review.userId;

    // Generate a color for the avatar based on user name
    final colors = [
      const Color(0xFF3B82F6),
      const Color(0xFF10B981),
      const Color(0xFFF59E0B),
      const Color(0xFFEF4444),
      const Color(0xFF8B5CF6),
      const Color(0xFFEC4899),
    ];
    final avatarColor = colors[review.userName.hashCode.abs() % colors.length];

    // Format date
    String formattedDate = 'Recently';
    final now = DateTime.now();
    final difference = now.difference(review.createdAt);

    if (difference.inDays == 0) {
      formattedDate = 'Today';
    } else if (difference.inDays == 1) {
      formattedDate = 'Yesterday';
    } else if (difference.inDays < 7) {
      formattedDate = '${difference.inDays} days ago';
    } else if (difference.inDays < 30) {
      formattedDate = '${(difference.inDays / 7).floor()} weeks ago';
    } else if (difference.inDays < 365) {
      formattedDate = '${(difference.inDays / 30).floor()} months ago';
    } else {
      formattedDate = '${(difference.inDays / 365).floor()} years ago';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: avatarColor.withValues(alpha: 0.2),
                  child: Text(
                    review.userName.isNotEmpty
                        ? review.userName[0].toUpperCase()
                        : 'A',
                    style: TextStyle(
                      color: avatarColor,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        review.userName.isNotEmpty
                            ? review.userName
                            : 'Anonymous',
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                          color: Color(0xFF1F2937),
                        ),
                      ),
                      Row(
                        children: [
                          ...List.generate(
                            5,
                            (index) => Icon(
                              index < review.rating
                                  ? Icons.star
                                  : Icons.star_border,
                              color: const Color(0xFFFFB300),
                              size: 16,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            formattedDate,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF9CA3AF),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Category badge
                if (review.category != FeedbackCategory.general)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2C5F2D).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      review.category.label,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF2C5F2D),
                      ),
                    ),
                  ),
                // Delete button (only show for user's own reviews)
                if (isOwnReview)
                  IconButton(
                    icon: const Icon(Icons.delete_outline),
                    color: const Color(0xFFEF4444),
                    iconSize: 20,
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => _showDeleteConfirmation(review),
                    tooltip: 'Delete review',
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              review.comment,
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF6B7280),
                height: 1.5,
              ),
            ),
            // Display photos if available
            if (review.photos.isNotEmpty) ...[
              const SizedBox(height: 12),
              SizedBox(
                height: 80,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: review.photos.length,
                  itemBuilder: (context, index) {
                    final imageUrl = review.photos[index];
                    debugPrint('🖼️ Loading review image $index: $imageUrl');

                    // Check if URL is valid
                    if (imageUrl.isEmpty) {
                      debugPrint('⚠️ Empty image URL at index $index');
                      return const SizedBox.shrink();
                    }

                    return GestureDetector(
                      onTap: () {
                        debugPrint('🖼️ Opening full screen image: $imageUrl');
                        // Show full screen image
                        showDialog(
                          context: context,
                          builder: (context) => Dialog(
                            backgroundColor: Colors.black,
                            child: Stack(
                              children: [
                                Center(
                                  child: CachedNetworkImage(
                                    imageUrl: imageUrl,
                                    fit: BoxFit.contain,
                                    placeholder: (context, url) => const Center(
                                      child: CircularProgressIndicator(
                                        color: Colors.white,
                                      ),
                                    ),
                                    errorWidget: (context, url, error) {
                                      debugPrint(
                                          '❌ Full image error for: $url');
                                      debugPrint(
                                          '   Error type: ${error.runtimeType}');
                                      debugPrint('   Error message: $error');
                                      return Center(
                                        child: Column(
                                          mainAxisAlignment:
                                              MainAxisAlignment.center,
                                          children: [
                                            const Icon(
                                              Icons.error_outline,
                                              color: Colors.white,
                                              size: 48,
                                            ),
                                            const SizedBox(height: 16),
                                            Padding(
                                              padding: const EdgeInsets.all(16),
                                              child: Text(
                                                'Failed to load image\n${error.toString()}',
                                                style: const TextStyle(
                                                    color: Colors.white),
                                                textAlign: TextAlign.center,
                                              ),
                                            ),
                                          ],
                                        ),
                                      );
                                    },
                                  ),
                                ),
                                Positioned(
                                  top: 10,
                                  right: 10,
                                  child: IconButton(
                                    icon: const Icon(Icons.close,
                                        color: Colors.white),
                                    onPressed: () =>
                                        Navigator.of(context).pop(),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                      child: Container(
                        margin: const EdgeInsets.only(right: 8),
                        width: 80,
                        height: 80,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: CachedNetworkImage(
                            imageUrl: imageUrl,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => Container(
                              color: const Color(0xFFF3F4F6),
                              child: const Center(
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Color(0xFF2C5F2D),
                                ),
                              ),
                            ),
                            errorWidget: (context, url, error) {
                              debugPrint('❌ Thumbnail error for: $url');
                              debugPrint('   Error type: ${error.runtimeType}');
                              debugPrint('   Error message: $error');
                              return Container(
                                color: const Color(0xFFF3F4F6),
                                child: const Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.broken_image,
                                      color: Color(0xFF9CA3AF),
                                      size: 24,
                                    ),
                                    SizedBox(height: 4),
                                    Text(
                                      'Failed',
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: Color(0xFF9CA3AF),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCard({
    required IconData icon,
    required String title,
    required Widget child,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: const Color(0xFF2C5F2D), size: 20),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1F2937),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            child,
          ],
        ),
      ),
    );
  }
}
