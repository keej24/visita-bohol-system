import 'dart:async';
import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:http/http.dart' as http;

enum ConnectivityStatus {
  online,
  offline,
  poor,
  checking,
}

class ConnectivityService extends ChangeNotifier {
  static final ConnectivityService _instance = ConnectivityService._internal();
  factory ConnectivityService() => _instance;
  ConnectivityService._internal();

  final Connectivity _connectivity = Connectivity();
  ConnectivityStatus _status = ConnectivityStatus.checking;
  StreamSubscription<List<ConnectivityResult>>? _subscription;
  Timer? _connectivityTimer;
  bool _initialized = false;

  ConnectivityStatus get status => _status;
  bool get isOnline => _status == ConnectivityStatus.online;
  bool get isOffline => _status == ConnectivityStatus.offline;
  bool get hasConnection => _status != ConnectivityStatus.offline;
  bool get isInitialized => _initialized;

  // Initialize connectivity monitoring
  Future<void> initialize() async {
    debugPrint('🔗 Initializing ConnectivityService');

    // Check initial connectivity
    await _checkConnectivity();

    // Listen to connectivity changes
    _subscription = _connectivity.onConnectivityChanged.listen(
      (results) => _onConnectivityChanged(results),
      onError: (error) {
        debugPrint('❌ Connectivity stream error: $error');
        _updateStatus(ConnectivityStatus.offline);
      },
    );

    // Periodic connectivity checks (every 30 seconds)
    _connectivityTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _checkConnectivity(),
    );

    _initialized = true;
  }

  // Dispose resources
  @override
  void dispose() {
    _subscription?.cancel();
    _connectivityTimer?.cancel();
    super.dispose();
  }

  // Handle connectivity changes
  void _onConnectivityChanged(List<ConnectivityResult> results) {
    // Handle multiple connectivity results - use the first available connection
    final result = results.isNotEmpty ? results.first : ConnectivityResult.none;
    debugPrint('🔗 Connectivity changed: $result');
    _checkConnectivity();
  }

  // Check current connectivity status
  Future<void> _checkConnectivity() async {
    try {
      final results = await _connectivity.checkConnectivity();

      if (results.contains(ConnectivityResult.mobile) ||
          results.contains(ConnectivityResult.wifi) ||
          results.contains(ConnectivityResult.ethernet)) {
        // Test actual internet connectivity
        await _testInternetConnection();
      } else {
        _updateStatus(ConnectivityStatus.offline);
      }
    } catch (e) {
      debugPrint('❌ Error checking connectivity: $e');
      _updateStatus(ConnectivityStatus.offline);
    }
  }

  // Test actual internet connection by pinging a reliable server
  Future<void> _testInternetConnection() async {
    try {
      _updateStatus(ConnectivityStatus.checking);

      final stopwatch = Stopwatch()..start();

      // Try to connect to a reliable endpoint
      // Use HTTP HEAD request to minimize data transfer
      final response = await http
          .head(
            Uri.parse('https://www.google.com'),
          )
          .timeout(const Duration(seconds: 5));

      stopwatch.stop();
      final responseTime = stopwatch.elapsedMilliseconds;

      // Check if request was successful
      if (response.statusCode >= 200 && response.statusCode < 300) {
        // Determine connection quality based on response time
        if (responseTime < 1000) {
          _updateStatus(ConnectivityStatus.online);
        } else {
          _updateStatus(ConnectivityStatus.poor);
        }
      } else {
        _updateStatus(ConnectivityStatus.offline);
      }

      debugPrint(
          '🔗 Internet test: ${responseTime}ms (status: ${response.statusCode})');
    } catch (e) {
      debugPrint('❌ Internet test failed: $e');
      _updateStatus(ConnectivityStatus.offline);
    }
  }

  // Update connectivity status and notify listeners
  void _updateStatus(ConnectivityStatus newStatus) {
    if (_status != newStatus) {
      final oldStatus = _status;
      _status = newStatus;

      debugPrint('🔗 Connectivity status changed: $oldStatus → $newStatus');

      // Notify listeners on next frame to avoid issues during widget build
      WidgetsBinding.instance.addPostFrameCallback((_) {
        notifyListeners();
      });
    }
  }

  // Force connectivity check
  Future<void> refresh() async {
    await _checkConnectivity();
  }

  // Get connectivity status as string
  String get statusString {
    switch (_status) {
      case ConnectivityStatus.online:
        return 'Online';
      case ConnectivityStatus.offline:
        return 'Offline';
      case ConnectivityStatus.poor:
        return 'Poor Connection';
      case ConnectivityStatus.checking:
        return 'Checking...';
    }
  }

  // Get connectivity icon
  IconData get statusIcon {
    switch (_status) {
      case ConnectivityStatus.online:
        return Icons.wifi;
      case ConnectivityStatus.offline:
        return Icons.wifi_off;
      case ConnectivityStatus.poor:
        return Icons.signal_wifi_bad;
      case ConnectivityStatus.checking:
        return Icons.wifi_find;
    }
  }

  // Get connectivity color
  Color get statusColor {
    switch (_status) {
      case ConnectivityStatus.online:
        return Colors.green;
      case ConnectivityStatus.offline:
        return Colors.red;
      case ConnectivityStatus.poor:
        return Colors.orange;
      case ConnectivityStatus.checking:
        return Colors.grey;
    }
  }
}
