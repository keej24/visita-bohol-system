import 'package:flutter/material.dart';
import '../../utils/design_system.dart';

class HeroHeader extends StatelessWidget {
  const HeroHeader({super.key});
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 220, // Slightly taller for better presence
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFFE8F5E9), // Light sacred green
            Colors.white,
            Color(0xFFFFF8E1), // Light gold
          ],
        ),
      ),
      child: Stack(
        children: [
          // Background church silhouette with sacred green
          Positioned(
            right: -20,
            bottom: -10,
            child: Opacity(
              opacity: 0.05,
              child: Transform.rotate(
                angle: 0.1,
                child: const Icon(
                  Icons.church,
                  size: 180,
                  color: Color(0xFF2C5F2D), // Sacred green
                ),
              ),
            ),
          ),
          // Floating decorative elements with gold accents
          Positioned(
            top: 30,
            left: 30,
            child: Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: const Color(0xFFD4AF37).withValues(alpha: 0.4), // Gold
                borderRadius: BorderRadius.circular(4),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFD4AF37).withValues(alpha: 0.2),
                    blurRadius: 4,
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            top: 50,
            right: 50,
            child: Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: const Color(0xFF2C5F2D).withValues(alpha: 0.3), // Green
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),
          Positioned(
            bottom: 40,
            left: 60,
            child: Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                gradient: AppGradients.goldGradient,
                borderRadius: BorderRadius.circular(5),
              ),
            ),
          ),
          // Main content
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // App name with sacred green gradient
                  ShaderMask(
                    shaderCallback: (bounds) => AppGradients.sacredGreen.createShader(bounds),
                    child: Text(
                      'VISITA',
                      style: Theme.of(context).textTheme.displayLarge?.copyWith(
                            fontSize: 42,
                            letterSpacing: 4.0,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            height: 1.0,
                            shadows: [
                              Shadow(
                                color: const Color(0xFF2C5F2D).withValues(alpha: 0.1),
                                offset: const Offset(0, 4),
                                blurRadius: 8,
                              ),
                            ],
                          ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  // Subtitle
                  Text(
                    'Bohol Churches Information System',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: const Color(0xFF6B6B6B),
                          fontStyle: FontStyle.italic,
                          fontWeight: FontWeight.w500,
                        ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  // Enhanced tagline with gold accent
                  Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: AppSpacing.lg,
                      vertical: AppSpacing.sm + 2,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.95),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: const Color(0xFFD4AF37).withValues(alpha: 0.3),
                        width: 1.5,
                      ),
                      boxShadow: AppElevation.getShadow(AppElevation.low),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            gradient: AppGradients.goldGradient,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(
                            Icons.church,
                            size: 16,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            'Explore, Learn, and Preserve Bohol\'s Churches',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: const Color(0xFF2C5F2D),
                                  fontWeight: FontWeight.w600,
                                  letterSpacing: 0.3,
                                ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
