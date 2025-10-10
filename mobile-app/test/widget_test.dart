// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
// No Firebase initialization needed for this smoke test. We mock local storage.
import 'package:provider/provider.dart';
import 'package:visita_mobile/theme/app_theme.dart';
import 'package:visita_mobile/screens/home_screen.dart';
import 'package:visita_mobile/models/app_state.dart';
import 'package:visita_mobile/repositories/church_repository.dart';
import 'package:visita_mobile/repositories/announcement_repository.dart';
import 'package:visita_mobile/repositories/mass_schedule_repository.dart';
import 'package:visita_mobile/services/profile_service.dart';
import 'package:visita_mobile/services/location_service.dart';
import 'package:visita_mobile/services/local_data_service.dart';
import 'package:visita_mobile/services/enhanced_church_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('VISITA app smoke test', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
  // Build a lightweight app shell that mirrors the providers but uses local repositories.
  await tester.pumpWidget(_TestApp());
    await tester.pump();

    // Verify that our app loads with VISITA branding
    expect(find.text('VISITA'), findsWidgets);

    // Verify bottom navigation is present
    expect(find.byType(BottomNavigationBar), findsOneWidget);
  });
}

class _TestApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppState()),
        ChangeNotifierProvider(create: (_) => ProfileService()),
        ChangeNotifierProvider(create: (_) => LocationService()),
        Provider(create: (_) => LocalDataService()),
        Provider(create: (_) => MassScheduleRepository()),
        // Use local data repositories to avoid Firestore in tests
        Provider<ChurchRepository>(create: (_) => ChurchRepository()),
        Provider<AnnouncementRepository>(create: (_) => AnnouncementRepository()),
        ChangeNotifierProxyProvider2<LocalDataService, LocationService, EnhancedChurchService>(
          create: (context) => EnhancedChurchService(
            context.read<LocalDataService>(),
            context.read<LocationService>(),
          ),
          update: (context, localDataService, locationService, previous) =>
              previous ?? EnhancedChurchService(localDataService, locationService),
        ),
      ],
      child: MaterialApp(
        title: 'VISITA - Bohol Churches',
        debugShowCheckedModeBanner: false,
        theme: buildAppTheme(Brightness.light),
        darkTheme: buildAppTheme(Brightness.dark),
        themeMode: ThemeMode.light,
        home: const HomeScreen(),
      ),
    );
  }
}
