import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../models/church.dart';
import '../models/enhanced_filter.dart';
import '../models/enums.dart';
import '../services/enhanced_church_service.dart';
import '../services/location_service.dart';
import '../widgets/home/church_card.dart';

class EnhancedChurchExplorationScreen extends StatefulWidget {
  const EnhancedChurchExplorationScreen({super.key});

  @override
  State<EnhancedChurchExplorationScreen> createState() =>
      _EnhancedChurchExplorationScreenState();
}

class _EnhancedChurchExplorationScreenState
    extends State<EnhancedChurchExplorationScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _isGridView = false;
  bool _showMap = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<EnhancedChurchService>().initialize();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).brightness == Brightness.dark
          ? const Color(0xFF121212)
          : const Color(0xFFF8FAFC),
      appBar: _buildAppBar(),
      body: Consumer<EnhancedChurchService>(
        builder: (context, churchService, child) {
          if (churchService.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (churchService.errorMessage != null) {
            return _buildErrorState(churchService.errorMessage!);
          }

          return Column(
            children: [
              _buildSearchBar(churchService),
              _buildFilterChips(churchService),
              _buildViewToggle(),
              Expanded(
                child: _showMap
                    ? _buildMapView(churchService)
                    : _buildListView(churchService),
              ),
            ],
          );
        },
      ),
      floatingActionButton: _buildFloatingActionButton(),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      title: const Text('Explore Churches'),
      backgroundColor: Theme.of(context).brightness == Brightness.dark
          ? const Color(0xFF1F1F1F)
          : Colors.white,
      elevation: 0,
      actions: [
        IconButton(
          icon: Icon(_showMap ? Icons.list : Icons.map),
          onPressed: () => setState(() => _showMap = !_showMap),
        ),
        IconButton(
          icon: const Icon(Icons.tune),
          onPressed: () => _showFilterBottomSheet(),
        ),
      ],
    );
  }

  Widget _buildSearchBar(EnhancedChurchService churchService) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Search churches, locations...',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _searchController.clear();
                    churchService.searchChurches('');
                  },
                )
              : null,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          filled: true,
          fillColor: Theme.of(context).brightness == Brightness.dark
              ? const Color(0xFF2A2A2A)
              : Colors.grey[100],
        ),
        onChanged: (value) => churchService.searchChurches(value),
      ),
    );
  }

  Widget _buildFilterChips(EnhancedChurchService churchService) {
    final filter = churchService.currentFilter;

    if (!filter.hasActiveFilters) {
      return const SizedBox.shrink();
    }

    return Container(
      height: 50,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Expanded(
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                if (filter.foundingYearRange != null)
                  _buildFilterChip(
                    'Years: ${filter.foundingYearRange!.start.round()}-${filter.foundingYearRange!.end.round()}',
                    () => churchService.clearFoundingYearRange(),
                  ),
                if (filter.architecturalStyles.isNotEmpty)
                  ...filter.architecturalStyles.map(
                    (style) => _buildFilterChip(
                      style.label,
                      () => churchService.toggleArchitecturalStyle(style),
                    ),
                  ),
                if (filter.heritageClassifications.isNotEmpty)
                  ...filter.heritageClassifications.map(
                    (classification) => _buildFilterChip(
                      classification.shortLabel,
                      () => churchService
                          .toggleHeritageClassification(classification),
                    ),
                  ),
                if (filter.dioceses.isNotEmpty)
                  ...filter.dioceses.map(
                    (diocese) => _buildFilterChip(
                      diocese.label,
                      () => churchService.toggleDiocese(diocese),
                    ),
                  ),
                if (filter.showNearMeOnly)
                  _buildFilterChip(
                    'Near Me (${filter.nearMeRadius?.round() ?? 10}km)',
                    () => churchService.disableNearMeFilter(),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          TextButton(
            onPressed: () => churchService.resetFilters(),
            child: Text(
              'Reset (${filter.activeFilterCount})',
              style: TextStyle(
                color: Theme.of(context).primaryColor,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, VoidCallback onRemove) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        onSelected: (selected) {}, // Required parameter
        onDeleted: onRemove,
        deleteIcon: const Icon(Icons.close, size: 16),
        backgroundColor: Theme.of(context).primaryColor.withValues(alpha: 0.1),
        selectedColor: Theme.of(context).primaryColor.withValues(alpha: 0.2),
        labelStyle: TextStyle(
          color: Theme.of(context).primaryColor,
          fontWeight: FontWeight.w500,
        ),
        selected: true,
      ),
    );
  }

  Widget _buildViewToggle() {
    if (_showMap) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Consumer<EnhancedChurchService>(
            builder: (context, churchService, child) {
              return Text(
                '${churchService.filteredChurches.length} churches found',
                style: TextStyle(
                  color: Theme.of(context).brightness == Brightness.dark
                      ? Colors.white70
                      : Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              );
            },
          ),
          Row(
            children: [
              IconButton(
                icon: Icon(
                  Icons.view_list,
                  color: !_isGridView
                      ? Theme.of(context).primaryColor
                      : Colors.grey,
                ),
                onPressed: () => setState(() => _isGridView = false),
              ),
              IconButton(
                icon: Icon(
                  Icons.grid_view,
                  color: _isGridView
                      ? Theme.of(context).primaryColor
                      : Colors.grey,
                ),
                onPressed: () => setState(() => _isGridView = true),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildListView(EnhancedChurchService churchService) {
    final churches = churchService.filteredChurches;

    if (churches.isEmpty) {
      return _buildEmptyState();
    }

    if (_isGridView) {
      return GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 0.75,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
        ),
        itemCount: churches.length,
        itemBuilder: (context, index) => _buildChurchGridItem(churches[index]),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: churches.length,
      itemBuilder: (context, index) => _buildChurchListItem(churches[index]),
    );
  }

  Widget _buildChurchListItem(Church church) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: ChurchCard(
        church: church,
        showDistance: _shouldShowDistance(),
        distance: _getChurchDistance(church),
      ),
    );
  }

  Widget _buildChurchGridItem(Church church) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1F1F1F) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 3,
            child: Container(
              decoration: BoxDecoration(
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(16)),
                image: church.images.isNotEmpty
                    ? DecorationImage(
                        image: AssetImage(church.images.first),
                        fit: BoxFit.cover,
                      )
                    : null,
                color: Colors.grey[300],
              ),
              child: church.images.isEmpty
                  ? const Icon(Icons.church, size: 40, color: Colors.grey)
                  : null,
            ),
          ),
          Expanded(
            flex: 2,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    church.name,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                      color: isDark ? Colors.white : Colors.black87,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    church.location,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.white70 : Colors.grey[600],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (_shouldShowDistance()) ...[
                    const SizedBox(height: 4),
                    Text(
                      '${_getChurchDistance(church)?.toStringAsFixed(1) ?? '?'} km away',
                      style: TextStyle(
                        fontSize: 11,
                        color: Theme.of(context).primaryColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMapView(EnhancedChurchService churchService) {
    final churches = churchService.filteredChurches;
    final currentPosition = context.read<LocationService>().currentPosition;

    return GoogleMap(
      initialCameraPosition: CameraPosition(
        target: currentPosition != null
            ? LatLng(currentPosition.latitude, currentPosition.longitude)
            : const LatLng(9.6496, 124.1336), // Bohol center
        zoom: 10,
      ),
      markers: _buildMapMarkers(churches),
      myLocationEnabled: true,
      myLocationButtonEnabled: true,
    );
  }

  Set<Marker> _buildMapMarkers(List<Church> churches) {
    return churches
        .where((church) => church.latitude != null && church.longitude != null)
        .map((church) => Marker(
              markerId: MarkerId(church.id),
              position: LatLng(church.latitude!, church.longitude!),
              infoWindow: InfoWindow(
                title: church.name,
                snippet: church.location,
              ),
              icon: BitmapDescriptor.defaultMarkerWithHue(
                church.heritageClassification == HeritageClassification.nct
                    ? BitmapDescriptor.hueYellow
                    : church.heritageClassification ==
                            HeritageClassification.icp
                        ? BitmapDescriptor.hueBlue
                        : BitmapDescriptor.hueRed,
              ),
            ))
        .toSet();
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.search_off,
            size: 64,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            'No churches found',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Try adjusting your filters or search terms',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[500],
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () =>
                context.read<EnhancedChurchService>().resetFilters(),
            child: const Text('Reset Filters'),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 64,
            color: Colors.red[300],
          ),
          const SizedBox(height: 16),
          Text(
            'Oops! Something went wrong',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            error,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[500],
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () =>
                context.read<EnhancedChurchService>().loadChurches(),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildFloatingActionButton() {
    return Consumer<LocationService>(
      builder: (context, locationService, child) {
        return FloatingActionButton(
          onPressed: () => _enableNearMeFilter(),
          child: locationService.isLoading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : const Icon(Icons.my_location),
        );
      },
    );
  }

  Future<void> _enableNearMeFilter() async {
    final locationService = context.read<LocationService>();
    final churchService = context.read<EnhancedChurchService>();

    if (locationService.errorMessage != null) {
      locationService.clearError();
    }

    await churchService.enableNearMeFilter();

    if (locationService.errorMessage != null) {
      _showLocationErrorDialog(locationService.errorMessage!);
    }
  }

  void _showLocationErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Location Access'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              context.read<LocationService>().openAppSettings();
            },
            child: const Text('Settings'),
          ),
        ],
      ),
    );
  }

  void _showFilterBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _EnhancedFilterBottomSheet(),
    );
  }

  bool _shouldShowDistance() {
    final filter = context.read<EnhancedChurchService>().currentFilter;
    return filter.userLatitude != null && filter.userLongitude != null;
  }

  double? _getChurchDistance(Church church) {
    final filter = context.read<EnhancedChurchService>().currentFilter;
    if (filter.userLatitude == null || filter.userLongitude == null) {
      return null;
    }
    return church.distanceFrom(filter.userLatitude!, filter.userLongitude!);
  }
}

// Enhanced Filter Bottom Sheet Widget
class _EnhancedFilterBottomSheet extends StatefulWidget {
  @override
  State<_EnhancedFilterBottomSheet> createState() =>
      _EnhancedFilterBottomSheetState();
}

class _EnhancedFilterBottomSheetState
    extends State<_EnhancedFilterBottomSheet> {
  late EnhancedChurchFilter _tempFilter;
  late RangeValues _yearRange;

  @override
  void initState() {
    super.initState();
    final churchService = context.read<EnhancedChurchService>();
    _tempFilter = churchService.currentFilter;
    _yearRange = churchService.getFoundingYearRange();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return DraggableScrollableSheet(
      initialChildSize: 0.8,
      maxChildSize: 0.9,
      minChildSize: 0.5,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1F1F1F) : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              _buildHandle(),
              _buildHeader(),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(20),
                  children: [
                    _buildFoundingYearFilter(),
                    const SizedBox(height: 24),
                    _buildArchitecturalStyleFilter(),
                    const SizedBox(height: 24),
                    _buildHeritageClassificationFilter(),
                    const SizedBox(height: 24),
                    _buildDioceseFilter(),
                    const SizedBox(height: 24),
                    _buildNearMeFilter(),
                    const SizedBox(height: 24),
                    _buildSortOptions(),
                    const SizedBox(height: 80), // Space for buttons
                  ],
                ),
              ),
              _buildBottomActions(),
            ],
          ),
        );
      },
    );
  }

  Widget _buildHandle() {
    return Container(
      width: 40,
      height: 4,
      margin: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: Colors.grey[300],
        borderRadius: BorderRadius.circular(2),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          Text(
            'Filter Churches',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: Theme.of(context).brightness == Brightness.dark
                  ? Colors.white
                  : Colors.black87,
            ),
          ),
          const Spacer(),
          TextButton(
            onPressed: () {
              _tempFilter = const EnhancedChurchFilter();
              setState(() {});
            },
            child: const Text('Reset All'),
          ),
        ],
      ),
    );
  }

  Widget _buildFoundingYearFilter() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Founding Year',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.white
                : Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        RangeSlider(
          values: _tempFilter.foundingYearRange ?? _yearRange,
          min: _yearRange.start,
          max: _yearRange.end,
          divisions: (_yearRange.end - _yearRange.start).round(),
          labels: RangeLabels(
            (_tempFilter.foundingYearRange?.start ?? _yearRange.start)
                .round()
                .toString(),
            (_tempFilter.foundingYearRange?.end ?? _yearRange.end)
                .round()
                .toString(),
          ),
          onChanged: (values) {
            setState(() {
              _tempFilter = _tempFilter.copyWith(foundingYearRange: values);
            });
          },
        ),
      ],
    );
  }

  Widget _buildArchitecturalStyleFilter() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Architectural Style',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.white
                : Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: ArchitecturalStyle.values.map((style) {
            final isSelected = _tempFilter.architecturalStyles.contains(style);
            return FilterChip(
              label: Text(style.label),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  final styles = Set<ArchitecturalStyle>.from(
                      _tempFilter.architecturalStyles);
                  if (selected) {
                    styles.add(style);
                  } else {
                    styles.remove(style);
                  }
                  _tempFilter =
                      _tempFilter.copyWith(architecturalStyles: styles);
                });
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildHeritageClassificationFilter() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Heritage Classification',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.white
                : Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: HeritageClassification.values.map((classification) {
            final isSelected =
                _tempFilter.heritageClassifications.contains(classification);
            return FilterChip(
              label: Text(classification.shortLabel),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  final classifications = Set<HeritageClassification>.from(
                      _tempFilter.heritageClassifications);
                  if (selected) {
                    classifications.add(classification);
                  } else {
                    classifications.remove(classification);
                  }
                  _tempFilter = _tempFilter.copyWith(
                      heritageClassifications: classifications);
                });
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildDioceseFilter() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Diocese',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.white
                : Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: Diocese.values.map((diocese) {
            final isSelected = _tempFilter.dioceses.contains(diocese);
            return FilterChip(
              label: Text(diocese.label),
              selected: isSelected,
              onSelected: (selected) {
                setState(() {
                  final dioceses = Set<Diocese>.from(_tempFilter.dioceses);
                  if (selected) {
                    dioceses.add(diocese);
                  } else {
                    dioceses.remove(diocese);
                  }
                  _tempFilter = _tempFilter.copyWith(dioceses: dioceses);
                });
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildNearMeFilter() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'Near Me',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).brightness == Brightness.dark
                    ? Colors.white
                    : Colors.black87,
              ),
            ),
            const Spacer(),
            Switch(
              value: _tempFilter.showNearMeOnly,
              onChanged: (value) {
                setState(() {
                  _tempFilter = _tempFilter.copyWith(showNearMeOnly: value);
                });
              },
            ),
          ],
        ),
        if (_tempFilter.showNearMeOnly) ...[
          const SizedBox(height: 12),
          Text(
            'Radius: ${(_tempFilter.nearMeRadius ?? 10.0).round()} km',
            style: TextStyle(
              fontSize: 14,
              color: Theme.of(context).brightness == Brightness.dark
                  ? Colors.white70
                  : Colors.grey[600],
            ),
          ),
          Slider(
            value: _tempFilter.nearMeRadius ?? 10.0,
            min: 1.0,
            max: 50.0,
            divisions: 49,
            onChanged: (value) {
              setState(() {
                _tempFilter = _tempFilter.copyWith(nearMeRadius: value);
              });
            },
          ),
        ],
      ],
    );
  }

  Widget _buildSortOptions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Sort By',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Theme.of(context).brightness == Brightness.dark
                ? Colors.white
                : Colors.black87,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: SortOption.values.map((option) {
            final isSelected = _tempFilter.sortBy == option;
            return ChoiceChip(
              label: Text(option.label),
              selected: isSelected,
              onSelected: (selected) {
                if (selected) {
                  setState(() {
                    _tempFilter = _tempFilter.copyWith(sortBy: option);
                  });
                }
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildBottomActions() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(
            color: Theme.of(context).brightness == Brightness.dark
                ? const Color(0xFF2A2A2A)
                : Colors.grey[200]!,
          ),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () => Navigator.pop(context),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: const Text('Cancel'),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: ElevatedButton(
              onPressed: () {
                context.read<EnhancedChurchService>().updateFilter(_tempFilter);
                Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: const Text('Apply Filters'),
            ),
          ),
        ],
      ),
    );
  }
}
