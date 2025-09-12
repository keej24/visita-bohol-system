import 'package:flutter/material.dart';

class HeroHeader extends StatelessWidget {
  const HeroHeader({super.key});
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 200,
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF2563EB).withValues(alpha: 0.05),
            Colors.white,
            const Color(0xFFD4AF37).withValues(alpha: 0.03),
          ],
        ),
      ),
      child: Stack(
        children: [
          // Background church silhouette
          Positioned(
            right: -20,
            bottom: -10,
            child: Opacity(
              opacity: 0.06,
              child: Transform.rotate(
                angle: 0.1,
                child: const Icon(
                  Icons.account_balance,
                  size: 160,
                  color: Color(0xFF2563EB),
                ),
              ),
            ),
          ),
          // Floating decorative elements
          Positioned(
            top: 30,
            left: 30,
            child: Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: const Color(0xFFD4AF37).withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(4),
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
                color: const Color(0xFF2563EB).withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(3),
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
                  // App name with enhanced styling
                  ShaderMask(
                    shaderCallback: (bounds) => const LinearGradient(
                      colors: [Color(0xFF2563EB), Color(0xFF1E40AF)],
                    ).createShader(bounds),
                    child: Text(
                      'VISITA',
                      style: Theme.of(context).textTheme.displayLarge?.copyWith(
                            fontSize: 38,
                            letterSpacing: 3.0,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            height: 1.0,
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
                  // Enhanced tagline
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.9),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                          color:
                              const Color(0xFF2563EB).withValues(alpha: 0.2)),
                      boxShadow: [
                        BoxShadow(
                          color:
                              const Color(0xFF2563EB).withValues(alpha: 0.08),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Text(
                      'Explore, Learn, and Preserve Bohol\'s Amazing Churches',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: const Color(0xFF2563EB),
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.3,
                          ),
                      textAlign: TextAlign.center,
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
