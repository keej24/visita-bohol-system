import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:visita_mobile/firebase_options.dart';

/// Initializes Firebase for widget/unit tests.
/// Optionally points SDKs at local emulators when the FIREBASE_EMULATORS env
/// var is set (any non-empty value).
Future<void> setupFirebaseForTests() async {
  TestWidgetsFlutterBinding.ensureInitialized();

  // If already initialized, skip.
  try {
    Firebase.app();
    return;
  } catch (_) {}

  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  // Optional: Use local emulators for deterministic tests
  final useEmulators = Platform.environment['FIREBASE_EMULATORS']?.isNotEmpty == true;
  if (useEmulators) {
    await FirebaseAuth.instance.useAuthEmulator('localhost', 9099);
    FirebaseFirestore.instance.useFirestoreEmulator('localhost', 8080);
    // Add Storage emulator here if needed in tests
  }
}
