// Provides a cross-platform database connection for Drift.
// Uses IndexedDB on web and SQLite (file) on native platforms.

import 'package:drift/drift.dart';

import 'connection_native.dart' if (dart.library.html) 'connection_web.dart'
    as impl;

QueryExecutor openConnection() => impl.openConnection();
