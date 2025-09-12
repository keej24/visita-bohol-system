import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:visita_mobile/widgets/home/announcement_carousel.dart';
import 'package:visita_mobile/models/announcement.dart';

Announcement sample(int i) => Announcement(
      id: 'a$i',
      title: 'Announcement $i',
      description: 'Description $i',
      dateTime: DateTime(2025, 1, i + 1),
      venue: 'Venue $i',
      diocese: 'Diocese of Tagbilaran',
    );

String formatDate(DateTime d) => '${d.month}/${d.day}/${d.year}';

void main() {
  testWidgets('AnnouncementCarousel auto-advances then pauses on interaction',
      (tester) async {
    final anns = List.generate(3, sample);

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: AnnouncementCarousel(
          announcements: anns,
          formatDate: formatDate,
        ),
      ),
    ));

    // Initial page is 0
    expect(find.text('Announcement 0'), findsOneWidget);

    // After 5 seconds + animation duration it should move to page 1
    await tester.pump(const Duration(seconds: 5));
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.text('Announcement 1'), findsOneWidget);

    // Simulate user interaction to pause (pointer down)
    final pageView = find.byType(PageView);
    final gesture = await tester.startGesture(tester.getCenter(pageView));
    await tester.pump();

    // Advance time: autoplay should be paused (no change)
    await tester.pump(const Duration(seconds: 6));
    expect(find.text('Announcement 1'), findsOneWidget);

    // Release gesture (pointer up) -> schedules resume after 6s
    await gesture.up();
    await tester.pump();

    // Before resume delay passes, still on page 1
    await tester.pump(const Duration(seconds: 5));
    expect(find.text('Announcement 1'), findsOneWidget);

    // After total 6s delay + 5s interval + animation -> should advance to page 2
    await tester.pump(const Duration(seconds: 1)); // completes 6s resume delay
    await tester.pump(const Duration(seconds: 5)); // interval
    await tester.pump(const Duration(milliseconds: 500)); // animation
    expect(find.text('Announcement 2'), findsOneWidget);
  });
}
