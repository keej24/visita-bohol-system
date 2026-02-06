import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_marker_cluster/flutter_map_marker_cluster.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';
import 'dart:async';
import 'dart:ui' as ui;
import '../models/church.dart';
import '../repositories/church_repository.dart';
import '../models/app_state.dart';
import 'package:provider/provider.dart';
import '../theme/header_palette.dart';
import 'church_detail_screen.dart';
import 'virtual_tour_screen.dart';

class MapScreen extends StatefulWidget {
  final Church? selectedChurch; // Church to focus on when opening map
  final bool singleChurchMode; // When true, only show the selectedChurch marker
  const MapScreen(
      {super.key, this.selectedChurch, this.singleChurchMode = false});
  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> with TickerProviderStateMixin {
  Church? _selectedChurch;
  Position? _userLocation;
  final _mapController = MapController();
  final _searchController = TextEditingController();
  Timer? _searchDebounce;

  // Filter state
  String _searchQuery = '';
  String _selectedDiocese = 'All';
  bool _heritageOnly = false;
  bool _showVisitedOnly = false;

  // Animation controllers
  late AnimationController _locateButtonController;
  late AnimationController _filterPanelController;
  late Animation<double> _locateButtonRotation;
  late Animation<double> _filterPanelSlide;

  bool _showFilterPanel = false;

  // Churches data
  late Future<List<Church>> _churchesFuture;

  @override
  void initState() {
    super.initState();
    _locateButtonController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    _filterPanelController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    _locateButtonRotation = Tween<double>(begin: 0, end: 2).animate(
      CurvedAnimation(parent: _locateButtonController, curve: Curves.easeInOut),
    );
    _filterPanelSlide = Tween<double>(begin: -1, end: 0).animate(
      CurvedAnimation(parent: _filterPanelController, curve: Curves.easeOut),
    );

    _getCurrentLocation();
    _loadChurches();

    // If a church was passed, select it and center on it
    if (widget.selectedChurch != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _selectChurch(widget.selectedChurch!);
      });
    }
  }

  void _loadChurches() {
    final repo = context.read<ChurchRepository>();
    _churchesFuture = repo.getAll();
  }

  Future<void> _refreshChurches() async {
    setState(() {
      _loadChurches();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchDebounce?.cancel();
    _locateButtonController.dispose();
    _filterPanelController.dispose();
    super.dispose();
  }

  Future<void> _getCurrentLocation() async {
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.whileInUse ||
          permission == LocationPermission.always) {
        final position = await Geolocator.getCurrentPosition();
        if (mounted) {
          setState(() => _userLocation = position);
        }
      }
    } catch (e) {
      debugPrint('Error getting location: $e');
    }
  }

  void _selectChurch(Church church) {
    setState(() {
      _selectedChurch = church;
    });

    // Center map on the selected church with appropriate zoom
    if (church.latitude != null && church.longitude != null) {
      _mapController.move(
        LatLng(church.latitude!, church.longitude!),
        15.0, // Zoom level for focused view
      );
    }
  }

  void _centerOnUser() {
    if (_userLocation != null) {
      _locateButtonController.forward().then((_) {
        _locateButtonController.reverse();
      });

      _mapController.move(
          LatLng(_userLocation!.latitude, _userLocation!.longitude), 15.0);
    } else {
      _getCurrentLocation();
    }
  }

  void _onSearchChanged(String value) {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 300), () {
      setState(() => _searchQuery = value.toLowerCase());
    });
  }

  List<Church> _filterChurches(List<Church> churches) {
    return churches.where((church) {
      // Search filter
      if (_searchQuery.isNotEmpty) {
        final searchText =
            '${church.name} ${church.location} ${church.diocese}'.toLowerCase();
        if (!searchText.contains(_searchQuery)) return false;
      }

      // Diocese filter
      if (_selectedDiocese != 'All' && church.diocese != _selectedDiocese) {
        return false;
      }

      // Heritage filter
      if (_heritageOnly && !church.isHeritage) return false;

      // Visited filter
      if (_showVisitedOnly) {
        final appState = context.read<AppState>();
        if (!appState.isVisited(church)) return false;
      }

      return church.latitude != null && church.longitude != null;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();

    // In single church mode, directly show just that church without loading all churches
    if (widget.singleChurchMode && widget.selectedChurch != null) {
      final church = widget.selectedChurch!;
      final markers = _buildMarkers([church], appState);
      final center = LatLng(church.latitude!, church.longitude!);

      return Scaffold(
        appBar: _buildSingleChurchAppBar(church),
        body: Stack(
          children: [
            _buildMap(markers, center, initialZoom: 15.0),
            _buildActionButtons(),
            _buildChurchDetailSheet(),
          ],
        ),
      );
    }

    return FutureBuilder<List<Church>>(
      future: _churchesFuture,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return Scaffold(
            appBar: _buildAppBar(),
            body: const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Loading churches...'),
                ],
              ),
            ),
          );
        }

        final allChurches = snap.data ?? [];
        final filteredChurches = _filterChurches(allChurches);
        final markers = _buildMarkers(filteredChurches, appState);
        final center = _calculateMapCenter(filteredChurches);

        return Scaffold(
          appBar: _buildAppBar(),
          body: Stack(
            children: [
              _buildMap(markers, center),
              _buildSearchBar(),
              _buildFilterPanel(),
              _buildActionButtons(),
              _buildChurchDetailSheet(),
            ],
          ),
        );
      },
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      title: const Text('Explore Churches',
          style:
              TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF1F2937))),
      backgroundColor: HeaderColors.map,
      elevation: 0,
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh),
          onPressed: _refreshChurches,
          tooltip: 'Refresh',
        ),
        IconButton(
          icon: AnimatedRotation(
            turns: _showFilterPanel ? 0.5 : 0,
            duration: const Duration(milliseconds: 300),
            child: const Icon(Icons.tune),
          ),
          onPressed: () {
            setState(() => _showFilterPanel = !_showFilterPanel);
            if (_showFilterPanel) {
              _filterPanelController.forward();
            } else {
              _filterPanelController.reverse();
            }
          },
          tooltip: 'Filters',
        ),
      ],
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(1),
        child: Container(height: 1, color: HeaderColors.divider),
      ),
    );
  }

  /// App bar for single church mode - shows church name instead of "Explore Churches"
  PreferredSizeWidget _buildSingleChurchAppBar(Church church) {
    return AppBar(
      title: Text(
        church.name,
        style: const TextStyle(
          fontWeight: FontWeight.w700,
          color: Color(0xFF1F2937),
          fontSize: 16,
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      backgroundColor: HeaderColors.map,
      elevation: 0,
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(1),
        child: Container(height: 1, color: HeaderColors.divider),
      ),
    );
  }

  Widget _buildMap(List<Marker> markers, LatLng center,
      {double initialZoom = 11.5}) {
    return FlutterMap(
      mapController: _mapController,
      options: MapOptions(
        center: center,
        zoom: initialZoom,
        maxZoom: 18,
        minZoom: 8,
        onTap: (_, __) => setState(() => _selectedChurch = null),
      ),
      children: [
        TileLayer(
          // Use direct URL without subdomains for better compatibility
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          // CRITICAL: User-Agent required by OSM tile usage policy
          userAgentPackageName: 'com.example.visita_mobile',
          // Maximum zoom level for native tiles
          maxNativeZoom: 19,
          // Keep tiles in memory for smoother panning
          keepBuffer: 2,
          // Headers required for OSM tile servers - CRITICAL for release builds
          tileProvider: NetworkTileProvider(
            headers: {
              'User-Agent':
                  'VISITA-Bohol-Churches/1.0 (+https://visita-bohol.web.app)',
              'Accept': 'image/png,image/*',
            },
          ),
          // Error tile builder for failed tiles
          errorTileCallback: (tile, error, stackTrace) {
            debugPrint('Map tile error: $error');
          },
        ),
        // Church markers with clustering (using clustered markers only)
        MarkerClusterLayerWidget(
          options: MarkerClusterLayerOptions(
            maxClusterRadius: 60,
            size: const Size(50, 50),
            markers: markers,
            builder: (context, cluster) {
              return Container(
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF2563EB), Color(0xFF1E40AF)],
                  ),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF2563EB).withValues(alpha: 0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    cluster.length.toString(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        RichAttributionWidget(
          attributions: [
            TextSourceAttribution(
              'OpenStreetMap contributors',
              onTap: () =>
                  launchUrl(Uri.parse('https://openstreetmap.org/copyright')),
            ),
          ],
        ),
      ],
    );
  }

  List<Marker> _buildMarkers(List<Church> churches, AppState appState) {
    return churches.map((church) {
      final isVisited = appState.isVisited(church);
      final isSelected = _selectedChurch?.id == church.id;

      return Marker(
        point: LatLng(church.latitude!, church.longitude!),
        width: isSelected ? 44 : 32,
        height: isSelected ? 52 : 40,
        anchorPos: AnchorPos.align(
            AnchorAlign.top), // Anchor at pin tip (bottom of marker)
        builder: (context) => GestureDetector(
          onTap: () => setState(() => _selectedChurch = church),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            child: _CustomChurchMarker(
              church: church,
              isVisited: isVisited,
              isSelected: isSelected,
            ),
          ),
        ),
      );
    }).toList();
  }

  Widget _buildSearchBar() {
    return Positioned(
      top: 16,
      left: 16,
      right: 80,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE5E7EB)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 20,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: TextField(
          controller: _searchController,
          onChanged: _onSearchChanged,
          decoration: InputDecoration(
            hintText: 'Search churches, diocese, location...',
            hintStyle: const TextStyle(color: Color(0xFF6B7280)),
            prefixIcon: const Icon(Icons.search, color: Color(0xFF9CA3AF)),
            suffixIcon: _searchController.text.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear, color: Color(0xFF6B7280)),
                    onPressed: () {
                      _searchController.clear();
                      setState(() => _searchQuery = '');
                    },
                  )
                : null,
            border: InputBorder.none,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
        ),
      ),
    );
  }

  Widget _buildFilterPanel() {
    return AnimatedBuilder(
      animation: _filterPanelSlide,
      builder: (context, child) => Transform.translate(
        offset: Offset(0, _filterPanelSlide.value * 200),
        child: Positioned(
          top: 80,
          left: 16,
          right: 16,
          child: _showFilterPanel
              ? Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE5E7EB)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.1),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Filter Churches',
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.w700,
                                ),
                      ),
                      const SizedBox(height: 16),
                      _buildDioceseFilter(),
                      const SizedBox(height: 12),
                      _buildToggleFilters(),
                    ],
                  ),
                )
              : const SizedBox.shrink(),
        ),
      ),
    );
  }

  Widget _buildDioceseFilter() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Diocese',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: const Color(0xFF374151),
              ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: ['All', 'Diocese of Tagbilaran', 'Diocese of Talibon']
              .map((diocese) => _FilterChip(
                    label: diocese == 'All' ? 'All' : diocese.split(' ').last,
                    isSelected: _selectedDiocese == diocese,
                    onTap: () => setState(() => _selectedDiocese = diocese),
                  ))
              .toList(),
        ),
      ],
    );
  }

  Widget _buildToggleFilters() {
    return Column(
      children: [
        _FilterToggle(
          label: 'Heritage Sites Only',
          value: _heritageOnly,
          onChanged: (value) => setState(() => _heritageOnly = value),
          icon: Icons.auto_awesome,
          color: const Color(0xFFD4AF37),
        ),
        const SizedBox(height: 8),
        _FilterToggle(
          label: 'Visited Churches Only',
          value: _showVisitedOnly,
          onChanged: (value) => setState(() => _showVisitedOnly = value),
          icon: Icons.check_circle,
          color: const Color(0xFF10B981),
        ),
      ],
    );
  }

  Widget _buildActionButtons() {
    return Positioned(
      bottom: _selectedChurch != null ? 280 : 30,
      right: 16,
      child: Column(
        children: [
          FloatingActionButton(
            heroTag: 'locate',
            onPressed: _centerOnUser,
            backgroundColor: const Color(0xFF2563EB),
            child: AnimatedBuilder(
              animation: _locateButtonRotation,
              builder: (context, child) => Transform.rotate(
                angle: _locateButtonRotation.value * 3.14159,
                child: const Icon(Icons.my_location, color: Colors.white),
              ),
            ),
          ),
          const SizedBox(height: 12),
          FloatingActionButton.small(
            heroTag: 'center',
            onPressed: () {
              _mapController.move(LatLng(9.65, 124.05), 11.5);
            },
            backgroundColor: Colors.white,
            child:
                const Icon(Icons.center_focus_strong, color: Color(0xFF6B7280)),
          ),
        ],
      ),
    );
  }

  Widget _buildChurchDetailSheet() {
    return _EnhancedChurchDetailSheet(
      church: _selectedChurch,
      onClose: () => setState(() => _selectedChurch = null),
      onNavigate: (church) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ChurchDetailScreen(church: church),
          ),
        );
      },
    );
  }

  LatLng _calculateMapCenter(List<Church> churches) {
    if (churches.isEmpty) return LatLng(9.65, 124.05);

    double lat = 0, lng = 0;
    for (final church in churches) {
      lat += church.latitude!;
      lng += church.longitude!;
    }
    return LatLng(lat / churches.length, lng / churches.length);
  }
}

// Custom church marker widget - pin style that points to exact location
class _CustomChurchMarker extends StatelessWidget {
  final Church church;
  final bool isVisited;
  final bool isSelected;

  const _CustomChurchMarker({
    required this.church,
    required this.isVisited,
    required this.isSelected,
  });

  @override
  Widget build(BuildContext context) {
    Color primaryColor;
    IconData icon;

    if (isVisited) {
      primaryColor = const Color(0xFF10B981);
      icon = Icons.check_circle;
    } else if (church.isHeritage) {
      primaryColor = const Color(0xFFD4AF37);
      icon = Icons.auto_awesome;
    } else {
      primaryColor = const Color(0xFF2563EB);
      icon = Icons.church;
    }

    final iconSize = isSelected ? 18.0 : 14.0;
    final circleSize = isSelected ? 32.0 : 24.0;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Circle with icon
        Container(
          width: circleSize,
          height: circleSize,
          decoration: BoxDecoration(
            color: primaryColor,
            shape: BoxShape.circle,
            border: Border.all(
              color: Colors.white,
              width: isSelected ? 3 : 2,
            ),
            boxShadow: [
              BoxShadow(
                color: primaryColor.withValues(alpha: 0.4),
                blurRadius: isSelected ? 12 : 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Icon(
            icon,
            color: Colors.white,
            size: iconSize,
          ),
        ),
        // Pin pointer triangle
        CustomPaint(
          size: Size(isSelected ? 12 : 8, isSelected ? 10 : 8),
          painter: _PinPointerPainter(color: primaryColor),
        ),
      ],
    );
  }
}

// Custom painter for the pin pointer triangle
class _PinPointerPainter extends CustomPainter {
  final Color color;

  _PinPointerPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = ui.Paint()
      ..color = color
      ..style = ui.PaintingStyle.fill;

    final path = ui.Path()
      ..moveTo(0, 0)
      ..lineTo(size.width / 2, size.height)
      ..lineTo(size.width, 0)
      ..close();

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// Filter chip widget
class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF2563EB) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color:
                isSelected ? const Color(0xFF2563EB) : const Color(0xFFE5E7EB),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : const Color(0xFF374151),
            fontWeight: FontWeight.w600,
            fontSize: 12,
          ),
        ),
      ),
    );
  }
}

// Filter toggle widget
class _FilterToggle extends StatelessWidget {
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;
  final IconData icon;
  final Color color;

  const _FilterToggle({
    required this.label,
    required this.value,
    required this.onChanged,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: value ? color : const Color(0xFF9CA3AF)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              color: value ? color : const Color(0xFF6B7280),
              fontWeight: value ? FontWeight.w600 : FontWeight.w500,
            ),
          ),
        ),
        Switch.adaptive(
          value: value,
          onChanged: onChanged,
          activeTrackColor: color,
        ),
      ],
    );
  }
}

// Enhanced church detail sheet
class _EnhancedChurchDetailSheet extends StatelessWidget {
  final Church? church;
  final VoidCallback onClose;
  final Function(Church) onNavigate;

  const _EnhancedChurchDetailSheet({
    required this.church,
    required this.onClose,
    required this.onNavigate,
  });

  @override
  Widget build(BuildContext context) {
    final c = church;
    if (c == null) return const SizedBox.shrink();

    final appState = context.watch<AppState>();
    final isVisited = appState.isVisited(c);

    return AnimatedPositioned(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOutCubic,
      left: 0,
      right: 0,
      bottom: church == null ? -300 : 0,
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: [
            BoxShadow(
              color: Colors.black26,
              blurRadius: 20,
              offset: Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Handle bar
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE5E7EB),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),

                // Header
                Row(
                  children: [
                    // Church image placeholder
                    Container(
                      width: 60,
                      height: 60,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            const Color(0xFF2563EB).withValues(alpha: 0.1),
                            const Color(0xFF2563EB).withValues(alpha: 0.05),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(
                        Icons.church,
                        color: Color(0xFF2563EB),
                        size: 32,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            c.name,
                            style: Theme.of(context)
                                .textTheme
                                .titleLarge
                                ?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF1F2937),
                                ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.location_on_outlined,
                                  size: 14, color: Color(0xFF6B7280)),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  c.location,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(
                                        color: const Color(0xFF6B7280),
                                      ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: onClose,
                      icon: const Icon(Icons.close, color: Color(0xFF6B7280)),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // Info chips
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _InfoChip(
                      icon: Icons.calendar_today_outlined,
                      text: 'Founded ${c.foundingYear}',
                      color: const Color(0xFF6B7280),
                    ),
                    _InfoChip(
                      icon: Icons.account_balance_wallet,
                      text: c.diocese,
                      color: const Color(0xFF2563EB),
                    ),
                    if (c.isHeritage)
                      const _InfoChip(
                        icon: Icons.auto_awesome,
                        text: 'Heritage Site',
                        color: Color(0xFFD4AF37),
                      ),
                    if (isVisited)
                      const _InfoChip(
                        icon: Icons.check_circle,
                        text: 'Visited',
                        color: Color(0xFF10B981),
                      ),
                  ],
                ),

                const SizedBox(height: 20),

                // Action buttons
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => onNavigate(c),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        icon: const Icon(Icons.info_outline, size: 18),
                        label: const Text('View Details',
                            style: TextStyle(fontWeight: FontWeight.w600)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton.icon(
                      onPressed: () async {
                        if (isVisited) {
                          appState.unmarkVisited(c);
                        } else {
                          // Validate location before marking as visited
                          try {
                            final position =
                                await Geolocator.getCurrentPosition(
                              desiredAccuracy: LocationAccuracy.high,
                            );

                            final result = await appState
                                .markVisitedWithValidation(c, position);

                            if (!context.mounted) return;

                            if (result.isValid) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Row(
                                    children: [
                                      const Icon(Icons.check_circle,
                                          color: Colors.white),
                                      const SizedBox(width: 8),
                                      Expanded(child: Text(result.message)),
                                    ],
                                  ),
                                  backgroundColor: const Color(0xFF10B981),
                                  duration: const Duration(seconds: 3),
                                ),
                              );
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Row(
                                    children: [
                                      const Icon(Icons.location_off,
                                          color: Colors.white),
                                      const SizedBox(width: 8),
                                      Expanded(child: Text(result.message)),
                                    ],
                                  ),
                                  backgroundColor: const Color(0xFFDC2626),
                                  duration: const Duration(seconds: 4),
                                  action: SnackBarAction(
                                    label: 'OK',
                                    textColor: Colors.white,
                                    onPressed: () {},
                                  ),
                                ),
                              );
                            }
                          } catch (e) {
                            if (!context.mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                    'Error getting location: ${e.toString()}'),
                                backgroundColor: const Color(0xFFDC2626),
                              ),
                            );
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor:
                            isVisited ? const Color(0xFF10B981) : Colors.white,
                        foregroundColor:
                            isVisited ? Colors.white : const Color(0xFF10B981),
                        side: const BorderSide(
                          color: Color(0xFF10B981),
                        ),
                        padding: const EdgeInsets.symmetric(
                            vertical: 12, horizontal: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      icon: Icon(
                        isVisited
                            ? Icons.check_circle
                            : Icons.check_circle_outline,
                        size: 18,
                      ),
                      label: Text(
                        isVisited ? 'Visited' : 'Mark Visited',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),

                if (c.hasVirtualTour) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => VirtualTourScreen(
                              tour: c.virtualTour!,
                              churchName: c.name,
                            ),
                          ),
                        );
                      },
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFFE5E7EB)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      icon: const Icon(Icons.threed_rotation,
                          size: 18, color: Color(0xFF6B7280)),
                      label: const Text('Virtual Tour',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF6B7280),
                          )),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// Info chip widget for detail sheet
class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color color;

  const _InfoChip({
    required this.icon,
    required this.text,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
