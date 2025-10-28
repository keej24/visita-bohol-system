import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Utility class for validating URLs before loading them in virtual tours
class UrlValidator {
  /// Validate if a URL is accessible (returns 200 OK)
  ///
  /// Uses HEAD request for efficiency (doesn't download the full image)
  /// Times out after 5 seconds to prevent hanging
  static Future<UrlValidationResult> validateImageUrl(String url) async {
    try {
      debugPrint('🔍 [URL VALIDATOR] Checking URL: ${url.substring(0, 80)}...');

      // Use HEAD request to check if file exists without downloading it
      final uri = Uri.parse(url);
      final response = await http.head(uri).timeout(
        const Duration(seconds: 5),
        onTimeout: () {
          throw TimeoutException('URL validation timed out after 5 seconds');
        },
      );

      debugPrint('📊 [URL VALIDATOR] Response: ${response.statusCode}');

      if (response.statusCode == 200) {
        // Check if it's actually an image
        final contentType = response.headers['content-type'];
        if (contentType != null && !contentType.startsWith('image/')) {
          debugPrint('⚠️ [URL VALIDATOR] Not an image! Content-Type: $contentType');
          return UrlValidationResult(
            isValid: false,
            statusCode: response.statusCode,
            errorMessage: 'URL does not point to an image (Content-Type: $contentType)',
          );
        }

        debugPrint('✅ [URL VALIDATOR] URL is valid and accessible');
        return UrlValidationResult(
          isValid: true,
          statusCode: response.statusCode,
        );
      } else if (response.statusCode == 404) {
        debugPrint('❌ [URL VALIDATOR] File not found (404)');
        return UrlValidationResult(
          isValid: false,
          statusCode: 404,
          errorMessage: 'Image file not found in Firebase Storage (404)',
        );
      } else if (response.statusCode == 403) {
        debugPrint('❌ [URL VALIDATOR] Access forbidden (403)');
        return UrlValidationResult(
          isValid: false,
          statusCode: 403,
          errorMessage: 'Access to image is forbidden. Check Firebase Storage rules.',
        );
      } else {
        debugPrint('❌ [URL VALIDATOR] Unexpected status: ${response.statusCode}');
        return UrlValidationResult(
          isValid: false,
          statusCode: response.statusCode,
          errorMessage: 'Server returned status ${response.statusCode}',
        );
      }
    } on TimeoutException catch (e) {
      debugPrint('⏱️ [URL VALIDATOR] Timeout: $e');
      return UrlValidationResult(
        isValid: false,
        errorMessage: 'URL validation timed out. Check your internet connection.',
      );
    } catch (e) {
      debugPrint('💥 [URL VALIDATOR] Error: $e');
      return UrlValidationResult(
        isValid: false,
        errorMessage: 'Failed to validate URL: ${e.toString()}',
      );
    }
  }

  /// Validate multiple URLs and return results
  ///
  /// Validates URLs in parallel for efficiency
  static Future<List<UrlValidationResult>> validateMultipleUrls(
    List<String> urls,
  ) async {
    debugPrint('🔍 [URL VALIDATOR] Validating ${urls.length} URLs...');

    final results = await Future.wait(
      urls.map((url) => validateImageUrl(url)),
    );

    final validCount = results.where((r) => r.isValid).length;
    final invalidCount = results.length - validCount;

    debugPrint('📊 [URL VALIDATOR] Results: $validCount valid, $invalidCount invalid');

    return results;
  }

  /// Filter a list of scenes to only include those with valid URLs
  ///
  /// Useful for removing broken scenes before displaying a tour
  static Future<List<T>> filterValidScenes<T>({
    required List<T> scenes,
    required String Function(T) getUrl,
  }) async {
    if (scenes.isEmpty) return scenes;

    debugPrint('🔍 [URL VALIDATOR] Filtering ${scenes.length} scenes...');

    final urls = scenes.map(getUrl).toList();
    final validationResults = await validateMultipleUrls(urls);

    final validScenes = <T>[];
    for (int i = 0; i < scenes.length; i++) {
      if (validationResults[i].isValid) {
        validScenes.add(scenes[i]);
      } else {
        debugPrint('⚠️ [URL VALIDATOR] Removing invalid scene: ${getUrl(scenes[i]).substring(0, 80)}...');
        debugPrint('   Reason: ${validationResults[i].errorMessage}');
      }
    }

    debugPrint('✅ [URL VALIDATOR] Filtered to ${validScenes.length} valid scenes');
    return validScenes;
  }
}

/// Result of URL validation
class UrlValidationResult {
  final bool isValid;
  final int? statusCode;
  final String? errorMessage;

  UrlValidationResult({
    required this.isValid,
    this.statusCode,
    this.errorMessage,
  });

  @override
  String toString() {
    if (isValid) {
      return 'Valid (HTTP $statusCode)';
    } else {
      return 'Invalid: ${errorMessage ?? "Unknown error"}${statusCode != null ? " (HTTP $statusCode)" : ""}';
    }
  }
}
