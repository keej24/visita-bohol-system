import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:provider/single_child_widget.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'firebase_options.dart';
import 'screens/auth_wrapper.dart';
import 'models/app_state.dart';
import 'repositories/church_repository.dart';
import 'repositories/announcement_repository.dart';
import 'repositories/mass_schedule_repository.dart';
import 'repositories/firestore_church_repository.dart';
import 'repositories/firestore_announcement_repository.dart';
import 'repositories/offline_church_repository.dart';
import 'services/auth_service.dart';
import 'services/profile_service.dart';
import 'services/location_service.dart';
import 'services/paginated_church_service.dart';
import 'services/local_data_service.dart';
import 'services/connectivity_service.dart';
import 'services/offline_sync_service.dart';
import 'services/offline_image_cache_service.dart';
import 'repositories/paginated_church_repository.dart';
import 'theme/app_theme.dart';

const bool kUseFirestoreBackend = true; // Enable Firebase

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase with error handling
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    debugPrint('✅ Firebase initialized successfully');
  } catch (e) {
    debugPrint('❌ Firebase initialization error: $e');
    // Continue with app startup even if Firebase fails
  }

  // Initialize offline services (only on mobile platforms)
  ConnectivityService? connectivityService;
  OfflineSyncService? syncService;
  OfflineImageCacheService? imageCacheService;

  if (!kIsWeb) {
    try {
      connectivityService = ConnectivityService();
      syncService = OfflineSyncService();
      imageCacheService = OfflineImageCacheService();

      await connectivityService.initialize();
      await syncService.initialize();
      await imageCacheService.initialize();
      debugPrint('✅ Offline services initialized');
    } catch (e) {
      debugPrint('⚠️ Offline services initialization failed: $e');
      // Continue without offline services
    }
  } else {
    debugPrint('🌐 Running on web - offline features disabled');
  }

  // Test Firestore connection with error handling
  try {
    final snap = await FirebaseFirestore.instance.collection('churches').get();
    debugPrint(
        '🔥 Firestore connected successfully! Found ${snap.docs.length} church documents.');
  } catch (e) {
    debugPrint('⚠️ Firestore connection test failed: $e');
    // Continue with app startup
  }

  runApp(VisitaApp(
    connectivityService: connectivityService,
    syncService: syncService,
    imageCacheService: imageCacheService,
  ));
}

class VisitaApp extends StatelessWidget {
  final ConnectivityService? connectivityService;
  final OfflineSyncService? syncService;
  final OfflineImageCacheService? imageCacheService;

  const VisitaApp({
    super.key,
    this.connectivityService,
    this.syncService,
    this.imageCacheService,
  });

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

    // Build provider list conditionally based on platform
    final providers = <SingleChildWidget>[
      ChangeNotifierProvider(create: (_) => AppState()),
      ChangeNotifierProvider(create: (_) => AuthService()),
      ChangeNotifierProxyProvider<AuthService, ProfileService>(
        create: (context) => ProfileService(),
        update: (context, authService, previous) {
          final profileService = previous ?? ProfileService();
          // Reload profile when auth state changes
          if (authService.isAuthenticated) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              profileService.loadUserProfile();
            });
          }
          return profileService;
        },
      ),
      ChangeNotifierProvider(create: (_) => LocationService()),
      Provider(create: (_) => LocalDataService()),
      Provider(create: (_) => MassScheduleRepository()),

      // Data repositories - always use Firestore on web
      Provider<ChurchRepository>(
        create: (_) => FirestoreChurchRepository(),
      ),
      Provider<AnnouncementRepository>(
        create: (_) => FirestoreAnnouncementRepository(),
      ),
      ChangeNotifierProxyProvider2<LocalDataService, LocationService,
          PaginatedChurchService>(
        create: (context) => PaginatedChurchService(
          PaginatedChurchRepository(),
          context.read<LocationService>(),
        ),
        update: (context, localDataService, locationService, previous) =>
            previous ??
            PaginatedChurchService(
                PaginatedChurchRepository(), locationService),
      ),
    ];

    // Add offline services only on mobile platforms
    if (!kIsWeb &&
        connectivityService != null &&
        syncService != null &&
        imageCacheService != null) {
      providers.addAll([
        // Offline services (use pre-initialized singletons)
        ChangeNotifierProvider.value(value: connectivityService),
        ChangeNotifierProvider.value(value: syncService),
        ChangeNotifierProvider.value(value: imageCacheService),
        // Offline-first repositories
        ChangeNotifierProvider(create: (_) => OfflineChurchRepository()),
      ]);
    }

    return MultiProvider(
      providers: providers,
      child: MaterialApp(
        title: 'VISITA - Bohol Churches',
        debugShowCheckedModeBanner: false, // Remove debug banner
        theme: buildAppTheme(Brightness.light),
        darkTheme: buildAppTheme(Brightness.dark),
        themeMode: ThemeMode.light,
        home: const AuthWrapper(),
      ),
    );
  }
}
