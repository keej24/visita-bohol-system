import 'package:drift/drift.dart';

/// Web platform doesn't support offline database
/// This is a stub that throws if accidentally used
QueryExecutor openConnection() {
  throw UnsupportedError(
    'Offline database is not supported on web platform. '
    'Use Firestore repositories directly instead.',
  );
}
