import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'firebase_options.dart';
import 'screens/home_screen.dart';
import 'screens/auth_wrapper.dart';
import 'models/app_state.dart';
import 'repositories/church_repository.dart';
import 'repositories/announcement_repository.dart';
import 'repositories/mass_schedule_repository.dart';
import 'repositories/firestore_church_repository.dart';
import 'repositories/firestore_announcement_repository.dart';
import 'services/auth_service.dart';
import 'services/profile_service.dart';
import 'services/location_service.dart';
import 'services/enhanced_church_service.dart';
import 'services/local_data_service.dart';
import 'theme/app_theme.dart';

const bool kUseFirestoreBackend = true; // Enable Firebase

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  // Test Firestore connection
  try {
    final snap = await FirebaseFirestore.instance.collection('churches').get();
    debugPrint(
        '🔥 Firestore connected successfully! Found ${snap.docs.length} church documents.');
  } catch (e) {
    debugPrint('⚠️ Firestore connection test failed: $e');
  }

  runApp(const VisitaApp());
}

class VisitaApp extends StatelessWidget {
  const VisitaApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // useFirestore flag removed; always local.

    // Debug logging
    assert(() {
      debugPrint(kUseFirestoreBackend
          ? '🔥 Running with Firebase integration'
          : '📱 Running in local data mode');
      return true;
    }());

    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppState()),
        ChangeNotifierProvider(create: (_) => AuthService()),
        ChangeNotifierProvider(create: (_) => ProfileService()),
        ChangeNotifierProvider(create: (_) => LocationService()),
        Provider(create: (_) => LocalDataService()),
        Provider(create: (_) => MassScheduleRepository()),
        // Data repositories - Firebase or local based on flag
        Provider<ChurchRepository>(
          create: (_) => kUseFirestoreBackend
              ? FirestoreChurchRepository()
              : ChurchRepository(),
        ),
        Provider<AnnouncementRepository>(
          create: (_) => kUseFirestoreBackend
              ? FirestoreAnnouncementRepository()
              : AnnouncementRepository(),
        ),
        ChangeNotifierProxyProvider2<LocalDataService, LocationService,
            EnhancedChurchService>(
          create: (context) => EnhancedChurchService(
            context.read<LocalDataService>(),
            context.read<LocationService>(),
          ),
          update: (context, localDataService, locationService, previous) =>
              previous ??
              EnhancedChurchService(localDataService, locationService),
        ),
      ],
      child: MaterialApp(
        title: 'VISITA - Bohol Churches',
        debugShowCheckedModeBanner: false, // Remove debug banner
        theme: buildAppTheme(Brightness.light),
        darkTheme: buildAppTheme(Brightness.dark),
        themeMode: ThemeMode.light,
        // Start with AuthWrapper so unauthenticated users see Login first
        home: const AuthWrapper(),
      ),
    );
  }
}
