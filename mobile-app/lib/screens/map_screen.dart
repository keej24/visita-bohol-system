import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_marker_cluster/flutter_map_marker_cluster.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';
import 'dart:async';
import '../models/church.dart';
import '../repositories/church_repository.dart';
import '../models/app_state.dart';
import 'package:provider/provider.dart';
import '../theme/header_palette.dart';
import 'church_detail_screen.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({Key? key}) : super(key: key);
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
    final repo = context.read<ChurchRepository>();
    final appState = context.watch<AppState>();

    return FutureBuilder<List<Church>>(
      future: repo.getAll(),
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

  Widget _buildMap(List<Marker> markers, LatLng center) {
    return FlutterMap(
      mapController: _mapController,
      options: MapOptions(
        center: center,
        zoom: 11.5,
        maxZoom: 18,
        minZoom: 8,
        onTap: (_, __) => setState(() => _selectedChurch = null),
      ),
      nonRotatedChildren: [
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
      children: [
        // Custom styled tile layer
        TileLayer(
          urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          subdomains: const ['a', 'b', 'c'],
          maxZoom: 19,
        ),
        // User location marker
        if (_userLocation != null)
          MarkerLayer(
            markers: [
              Marker(
                point:
                    LatLng(_userLocation!.latitude, _userLocation!.longitude),
                width: 60,
                height: 60,
                builder: (context) => Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563EB),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 3),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF2563EB).withValues(alpha: 0.3),
                        blurRadius: 12,
                        spreadRadius: 4,
                      ),
                    ],
                  ),
                  child:
                      const Icon(Icons.person, color: Colors.white, size: 24),
                ),
              ),
            ],
          ),
        // Church markers with clustering
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
      ],
    );
  }

  List<Marker> _buildMarkers(List<Church> churches, AppState appState) {
    return churches.map((church) {
      final isVisited = appState.isVisited(church);
      final isSelected = _selectedChurch?.id == church.id;

      return Marker(
        point: LatLng(church.latitude!, church.longitude!),
        width: isSelected ? 70 : 50,
        height: isSelected ? 70 : 50,
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

// Custom church marker widget
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

    return Container(
      decoration: BoxDecoration(
        color: primaryColor,
        shape: BoxShape.circle,
        border: Border.all(
          color: Colors.white,
          width: isSelected ? 4 : 2,
        ),
        boxShadow: [
          BoxShadow(
            color: primaryColor.withValues(alpha: 0.4),
            blurRadius: isSelected ? 16 : 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Icon(
        icon,
        color: Colors.white,
        size: isSelected ? 28 : 20,
      ),
    );
  }
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
          activeColor: color,
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
    final isFavorite = appState.isForVisit(c);

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
                      onPressed: () {
                        isVisited
                            ? appState.unmarkVisited(c)
                            : appState.markVisited(c);
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
                    const SizedBox(width: 8),
                    IconButton(
                      onPressed: () {
                        isFavorite
                            ? appState.unmarkForVisit(c)
                            : appState.markForVisit(c);
                      },
                      style: IconButton.styleFrom(
                        backgroundColor: isFavorite
                            ? const Color(0xFFDC2626).withValues(alpha: 0.1)
                            : const Color(0xFFF3F4F6),
                      ),
                      icon: Icon(
                        isFavorite ? Icons.favorite : Icons.favorite_outline,
                        color: isFavorite
                            ? const Color(0xFFDC2626)
                            : const Color(0xFF6B7280),
                      ),
                    ),
                  ],
                ),

                if (c.virtualTourUrl != null) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () async {
                        final uri = Uri.parse(c.virtualTourUrl!);
                        if (await canLaunchUrl(uri)) {
                          await launchUrl(uri,
                              mode: LaunchMode.inAppBrowserView);
                        }
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
