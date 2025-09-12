import 'package:flutter/material.dart';

class StatsRow extends StatefulWidget {
  const StatsRow({super.key});
  @override
  State<StatsRow> createState() => _StatsRowState();
}

class _StatsRowState extends State<StatsRow> with TickerProviderStateMixin {
  late List<AnimationController> _controllers;
  late List<Animation<int>> _animations;

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(
        4,
        (index) => AnimationController(
            duration: const Duration(milliseconds: 1500), vsync: this));

    _animations = [
      IntTween(begin: 0, end: 25).animate(
          CurvedAnimation(parent: _controllers[0], curve: Curves.easeOut)),
      IntTween(begin: 0, end: 12).animate(
          CurvedAnimation(parent: _controllers[1], curve: Curves.easeOut)),
      IntTween(begin: 0, end: 8).animate(
          CurvedAnimation(parent: _controllers[2], curve: Curves.easeOut)),
      IntTween(begin: 0, end: 2).animate(
          CurvedAnimation(parent: _controllers[3], curve: Curves.easeOut)),
    ];

    // Start animations with staggered delays
    for (int i = 0; i < _controllers.length; i++) {
      Future.delayed(Duration(milliseconds: i * 200), () {
        if (mounted) _controllers[i].forward();
      });
    }
  }

  @override
  void dispose() {
    for (var controller in _controllers) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      child: Row(
        children: [
          Expanded(
            child: AnimatedBuilder(
              animation: _animations[0],
              builder: (context, child) => _StatCard(
                icon: Icons.church,
                title: 'Churches',
                value: '${_animations[0].value}+',
                gradient: const LinearGradient(
                  colors: [Color(0xFF2563EB), Color(0xFF1E40AF)],
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: AnimatedBuilder(
              animation: _animations[1],
              builder: (context, child) => _StatCard(
                icon: Icons.auto_awesome,
                title: 'Heritage Sites',
                value: '${_animations[1].value}',
                gradient: const LinearGradient(
                  colors: [Color(0xFFD4AF37), Color(0xFFB8941F)],
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: AnimatedBuilder(
              animation: _animations[2],
              builder: (context, child) => _StatCard(
                icon: Icons.location_city,
                title: 'Municipalities',
                value: '${_animations[2].value}',
                gradient: const LinearGradient(
                  colors: [Color(0xFF10B981), Color(0xFF059669)],
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: AnimatedBuilder(
              animation: _animations[3],
              builder: (context, child) => _StatCard(
                icon: Icons.account_balance_wallet,
                title: 'Dioceses',
                value: '${_animations[3].value}',
                gradient: const LinearGradient(
                  colors: [Color(0xFFDC2626), Color(0xFFB91C1C)],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final LinearGradient gradient;

  const _StatCard({
    required this.icon,
    required this.title,
    required this.value,
    required this.gradient,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE5E7EB), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              gradient: gradient,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: gradient.colors.first.withValues(alpha: 0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Icon(
              icon,
              size: 24,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),
          ShaderMask(
            shaderCallback: (bounds) => gradient.createShader(bounds),
            child: Text(
              value,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: const Color(0xFF6B7280),
                  fontWeight: FontWeight.w600,
                  fontSize: 11,
                ),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
