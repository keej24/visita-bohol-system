import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:visita_mobile/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('basic navigation and persistence', (tester) async {
    app.main();
    await tester.pumpAndSettle();

    // Verify home branding present
    expect(find.textContaining('VISITA'), findsWidgets);

    // Navigate to Map
    // Navigate via map icon (fallback to common Icons.map)
    await tester.tap(find.byIcon(Icons.map));
    await tester.pumpAndSettle();

    // Navigate to Announcements
    await tester.tap(find.text('Announcements'));
    await tester.pumpAndSettle();

    // Back to Home
    await tester.tap(find.text('Home'));
    await tester.pumpAndSettle();

    // Ensure filter card present
    expect(find.text('Diocese'), findsOneWidget);
  });
}
