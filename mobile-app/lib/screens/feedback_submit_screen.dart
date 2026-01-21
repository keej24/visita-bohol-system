import 'package:flutter/material.dart';
import '../models/feedback.dart';
import '../services/feedback_service.dart';
import '../services/auth_service.dart';
import 'package:uuid/uuid.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:provider/provider.dart';

class FeedbackSubmitScreen extends StatefulWidget {
  final String churchId;
  const FeedbackSubmitScreen({super.key, required this.churchId});

  @override
  State<FeedbackSubmitScreen> createState() => _FeedbackSubmitScreenState();
}

class _FeedbackSubmitScreenState extends State<FeedbackSubmitScreen> {
  final _commentCtl = TextEditingController();
  int _rating = 5;
  final FeedbackCategory _selectedCategory = FeedbackCategory.general;
  final _svc = FeedbackService();
  final List<File> _photos = [];
  final _picker = ImagePicker();

  Future<void> _pickImages() async {
    final imgs = await _picker.pickMultiImage(imageQuality: 80, maxWidth: 1600);
    if (imgs.isNotEmpty) {
      setState(() {
        _photos.addAll(imgs.map((x) => File(x.path)));
      });
    }
  }

  void _removePhoto(int i) {
    setState(() => _photos.removeAt(i));
  }

  void _submit() async {
    // Validate comment length (minimum 10 characters)
    final comment = _commentCtl.text.trim();
    if (comment.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please write at least 10 characters for your review'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // Get current user from AuthService before any async operations
    final authService = Provider.of<AuthService>(context, listen: false);
    final currentUser = authService.currentUser;
    final userId = currentUser?.uid ??
        'anonymous-${DateTime.now().millisecondsSinceEpoch}';
    final userName = currentUser?.displayName ?? 'Anonymous';

    // Show loading indicator
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(),
      ),
    );

    final storage = FirebaseStorage.instance;
    final List<String> photoUrls = [];
    for (final file in _photos) {
      try {
        final fileName =
            '${widget.churchId}/${DateTime.now().millisecondsSinceEpoch}_${file.path.split('/').last}';
        final ref = storage.ref().child('feedback_photos/$fileName');

        // Upload with metadata to ensure proper content type and caching
        final metadata = SettableMetadata(
          contentType: 'image/jpeg',
          cacheControl: 'public, max-age=31536000', // 1 year cache
          customMetadata: {
            'uploadedBy': 'mobile-app',
            'churchId': widget.churchId,
          },
        );

        debugPrint('📤 Uploading photo to: feedback_photos/$fileName');
        await ref.putFile(file, metadata);
        debugPrint('✅ Upload complete, getting download URL...');

        final url = await ref.getDownloadURL();
        debugPrint('✅ Download URL obtained: $url');
        photoUrls.add(url);
      } catch (e) {
        debugPrint('❌ Error uploading photo: $e');
        debugPrint('   Stack trace: ${StackTrace.current}');
      }
    }

    debugPrint(
        '📊 Successfully uploaded ${photoUrls.length} photos out of ${_photos.length}');

    final fb = FeedbackModel(
      id: const Uuid().v4(),
      userId: userId,
      userName: userName,
      churchId: widget.churchId,
      comment: _commentCtl.text,
      rating: _rating,
      photos: photoUrls,
      category: _selectedCategory,
    );
    await _svc.save(fb);
    if (!mounted) return;
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Submit Review',
            style: TextStyle(
                fontWeight: FontWeight.w600, color: Color(0xFF1A1A1A))),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF1A1A1A)),
        bottom: PreferredSize(
            preferredSize: const Size.fromHeight(1),
            child: Container(height: 1, color: const Color(0xFFE5E5E5))),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFFEBF2FF),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Column(
                children: [
                  Icon(Icons.rate_review, size: 46, color: Color(0xFF2563EB)),
                  SizedBox(height: 12),
                  Text('Share Your Experience',
                      style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1A1A1A))),
                  SizedBox(height: 8),
                  Text(
                    'Help other pilgrims by sharing your thoughts about this sacred place.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Color(0xFF4A4A4A), height: 1.4),
                  )
                ],
              ),
            ),
            const SizedBox(height: 20),
            _SectionCard(
              title: 'Rate Your Experience',
              icon: Icons.star,
              iconColor: const Color(0xFFD97706),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(5, (index) {
                      return GestureDetector(
                        onTap: () => setState(() => _rating = index + 1),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4.0),
                          child: Icon(
                            index < _rating ? Icons.star : Icons.star_outline,
                            size: 40,
                            color: const Color(0xFFD97706),
                          ),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _getRatingLabel(_rating),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1A1A1A),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            // Category selection removed - always defaults to General
            // All feedback will be submitted as "General Review"

            _SectionCard(
              title: 'Write Your Review',
              icon: Icons.edit_note,
              iconColor: const Color(0xFF2563EB),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFF5F5F5),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: _commentCtl.text.length < 10 && _commentCtl.text.isNotEmpty
                            ? Colors.orange
                            : const Color(0xFFE0E0E0),
                      ),
                    ),
                    child: TextField(
                      controller: _commentCtl,
                      maxLines: 6,
                      maxLength: 500,
                      buildCounter: (context, {required currentLength, required isFocused, maxLength}) {
                        final isUnderMin = currentLength > 0 && currentLength < 10;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8, bottom: 4),
                          child: Text(
                            isUnderMin 
                                ? '${10 - currentLength} more characters needed (min 10)'
                                : '$currentLength / $maxLength',
                            style: TextStyle(
                              color: isUnderMin ? Colors.orange : const Color(0xFF6B6B6B),
                              fontSize: 12,
                            ),
                          ),
                        );
                      },
                      decoration: const InputDecoration(
                        hintText:
                            'Share your thoughts about the church, its architecture, atmosphere, or spiritual significance...',
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.all(16),
                        hintStyle: TextStyle(color: Color(0xFF9E9E9E)),
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      ElevatedButton.icon(
                        onPressed: _pickImages,
                        icon: const Icon(Icons.photo_camera),
                        label: const Text('Add Photos'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text('${_photos.length} selected',
                          style: const TextStyle(
                              fontSize: 12, color: Color(0xFF6B6B6B)))
                    ],
                  ),
                  if (_photos.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 90,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemBuilder: (_, i) => Stack(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Image.file(
                                _photos[i],
                                width: 90,
                                height: 90,
                                fit: BoxFit.cover,
                              ),
                            ),
                            Positioned(
                              top: 4,
                              right: 4,
                              child: InkWell(
                                onTap: () => _removePhoto(i),
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: BoxDecoration(
                                    color: Colors.black.withValues(alpha: .5),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.close,
                                      size: 14, color: Colors.white),
                                ),
                              ),
                            )
                          ],
                        ),
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemCount: _photos.length,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 30),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed:
                    _commentCtl.text.trim().length >= 10 ? _submit : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  elevation: 2,
                ),
                icon: const Icon(Icons.send),
                label: const Text(
                  'Submit Review',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getRatingLabel(int rating) {
    switch (rating) {
      case 1:
        return 'Poor';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Very Good';
      case 5:
        return 'Excellent';
      default:
        return 'Rate it';
    }
  }

  // Category icon helper removed - category selection no longer visible
}

class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color iconColor;
  final Widget child;
  const _SectionCard({
    required this.title,
    required this.icon,
    required this.iconColor,
    required this.child,
  });
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE0E0E0)),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: .04),
              blurRadius: 10,
              offset: const Offset(0, 4))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: iconColor),
              const SizedBox(width: 8),
              Text(title,
                  style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1A1A1A))),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}
