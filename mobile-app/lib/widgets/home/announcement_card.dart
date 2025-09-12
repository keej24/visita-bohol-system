import 'package:flutter/material.dart';
import '../../../models/announcement.dart';

class AnnouncementCard extends StatelessWidget {
  final Announcement announcement;
  final String Function(DateTime) formatDate;
  final VoidCallback? onTap;
  const AnnouncementCard(
      {super.key,
      required this.announcement,
      required this.formatDate,
      this.onTap});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final dateStr = formatDate(announcement.dateTime);
    return Semantics(
      label:
          'Announcement ${announcement.title}, happening at ${announcement.venue} on $dateStr',
      button: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            color: Colors.white,
            border: Border.all(color: const Color(0xFFE0E0E0), width: 1),
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
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _Pill(
                        text: announcement.scope.toUpperCase(),
                        color: cs.primary),
                    const SizedBox(width: 6),
                    _Pill(
                      text: announcement.diocese == 'Diocese of Tagbilaran'
                          ? 'TAGBILARAN'
                          : 'TALIBON',
                      color: cs.secondary,
                    ),
                    const Spacer(),
                    _DateBadge(date: dateStr),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  announcement.title,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w600),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: ShaderMask(
                    shaderCallback: (rect) => const LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Colors.white, Colors.transparent],
                      stops: [0.8, 1.0],
                    ).createShader(rect),
                    blendMode: BlendMode.dstIn,
                    child: Text(
                      announcement.description,
                      style: Theme.of(context)
                          .textTheme
                          .bodyMedium
                          ?.copyWith(height: 1.3),
                      maxLines: 4,
                      overflow: TextOverflow.fade,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(Icons.location_on, size: 16, color: cs.secondary),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        announcement.venue,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: cs.secondary, fontWeight: FontWeight.w600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 8),
                    TextButton(
                      onPressed: onTap,
                      style: TextButton.styleFrom(
                        foregroundColor: cs.tertiary,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        minimumSize: const Size(0, 0),
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: const Text('DETAILS'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  final String text;
  final Color color;
  const _Pill({required this.text, required this.color});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: .3)),
      ),
      child: Text(
        text,
        style:
            TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: color),
      ),
    );
  }
}

class _DateBadge extends StatelessWidget {
  final String date;
  const _DateBadge({required this.date});
  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: cs.tertiary,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
              color: cs.tertiary.withValues(alpha: .5),
              blurRadius: 8,
              offset: const Offset(0, 2)),
        ],
      ),
      child: Text(
        date,
        style: TextStyle(
            color: cs.onTertiary,
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: .5),
      ),
    );
  }
}
