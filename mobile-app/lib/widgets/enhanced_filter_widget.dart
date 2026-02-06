import 'package:flutter/material.dart';
import '../models/church_filter.dart';
import '../models/enums.dart';

class EnhancedFilterWidget extends StatefulWidget {
  final ChurchFilterCriteria criteria;
  final Function(ChurchFilterCriteria) onFilterChanged;

  const EnhancedFilterWidget({
    super.key,
    required this.criteria,
    required this.onFilterChanged,
  });

  @override
  State<EnhancedFilterWidget> createState() => _EnhancedFilterWidgetState();
}

class _EnhancedFilterWidgetState extends State<EnhancedFilterWidget> {
  late ChurchFilterCriteria _currentCriteria;
  late TextEditingController _searchController;

  @override
  void initState() {
    super.initState();
    _currentCriteria = widget.criteria;
    _searchController = TextEditingController(text: widget.criteria.search);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _updateCriteria(ChurchFilterCriteria newCriteria) {
    setState(() {
      _currentCriteria = newCriteria;
    });
    widget.onFilterChanged(newCriteria);
  }

  void _clearAllFilters() {
    _searchController.clear();
    _updateCriteria(const ChurchFilterCriteria());
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              const Icon(Icons.filter_list, color: Color(0xFF2563EB)),
              const SizedBox(width: 8),
              const Text(
                'Search & Filter Churches',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1A1A1A),
                ),
              ),
              const Spacer(),
              if (_currentCriteria.hasAdvancedFilters)
                TextButton(
                  onPressed: _clearAllFilters,
                  child: const Text(
                    'Clear All',
                    style: TextStyle(
                      color: Color(0xFF2563EB),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),

          // Search Bar
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Search by church name, location, or history...',
              prefixIcon: const Icon(Icons.search, color: Color(0xFF6B7280)),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF2563EB)),
              ),
              filled: true,
              fillColor: Colors.grey.shade50,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
            onChanged: (value) {
              _updateCriteria(_currentCriteria.copyWith(search: value));
            },
          ),
          const SizedBox(height: 16),

          // Filter Chips Row
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              // Diocese Filter
              _FilterChip(
                label: _currentCriteria.diocese?.label ?? 'All Dioceses',
                isSelected: _currentCriteria.diocese != null,
                onTap: () => _showDioceseFilter(),
              ),

              // Heritage Classification Filter
              _FilterChip(
                label: _currentCriteria.heritageClassification?.shortLabel ??
                    'All Types',
                isSelected: _currentCriteria.heritageClassification != null,
                onTap: () => _showHeritageFilter(),
              ),

              // Architectural Style Filter
              _FilterChip(
                label:
                    _currentCriteria.architecturalStyle?.label ?? 'All Styles',
                isSelected: _currentCriteria.architecturalStyle != null,
                onTap: () => _showArchitecturalStyleFilter(),
              ),

              // More Filters
              _FilterChip(
                label: 'More Filters',
                isSelected: _currentCriteria.foundingYear != null ||
                    _currentCriteria.location != null,
                onTap: () => _showMoreFilters(),
              ),
            ],
          ),

          // Active Filters Count
          if (_currentCriteria.hasAdvancedFilters) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: const Color(0xFF2563EB).withValues(alpha: 0.3),
                ),
              ),
              child: Text(
                '${_currentCriteria.activeFilterCount} filter(s) active',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF2563EB),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _showDioceseFilter() {
    showModalBottomSheet(
      context: context,
      builder: (context) => _FilterBottomSheet(
        title: 'Select Diocese',
        children: [
          _FilterOption(
            title: 'All Dioceses',
            isSelected: _currentCriteria.diocese == null,
            onTap: () {
              _updateCriteria(_currentCriteria.copyWith(diocese: null));
              Navigator.pop(context);
            },
          ),
          ...Diocese.values.map((diocese) => _FilterOption(
                title: diocese.label,
                isSelected: _currentCriteria.diocese == diocese,
                onTap: () {
                  _updateCriteria(_currentCriteria.copyWith(diocese: diocese));
                  Navigator.pop(context);
                },
              )),
        ],
      ),
    );
  }

  void _showHeritageFilter() {
    showModalBottomSheet(
      context: context,
      builder: (context) => _FilterBottomSheet(
        title: 'Heritage Classification',
        children: [
          _FilterOption(
            title: 'All Types',
            isSelected: _currentCriteria.heritageClassification == null,
            onTap: () {
              _updateCriteria(
                  _currentCriteria.copyWith(heritageClassification: null));
              Navigator.pop(context);
            },
          ),
          ...HeritageClassification.values
              .where((classification) =>
                  classification != HeritageClassification.nonHeritage)
              .map((classification) => _FilterOption(
                    title: classification.label,
                    isSelected: _currentCriteria.heritageClassification ==
                        classification,
                    onTap: () {
                      _updateCriteria(_currentCriteria.copyWith(
                          heritageClassification: classification));
                      Navigator.pop(context);
                    },
                  )),
        ],
      ),
    );
  }

  void _showArchitecturalStyleFilter() {
    showModalBottomSheet(
      context: context,
      builder: (context) => _FilterBottomSheet(
        title: 'Architectural Style',
        children: [
          _FilterOption(
            title: 'All Styles',
            isSelected: _currentCriteria.architecturalStyle == null,
            onTap: () {
              _updateCriteria(
                  _currentCriteria.copyWith(architecturalStyle: null));
              Navigator.pop(context);
            },
          ),
          ...ArchitecturalStyle.values.map((style) => _FilterOption(
                title: style.label,
                isSelected: _currentCriteria.architecturalStyle == style,
                onTap: () {
                  _updateCriteria(
                      _currentCriteria.copyWith(architecturalStyle: style));
                  Navigator.pop(context);
                },
              )),
        ],
      ),
    );
  }

  void _showMoreFilters() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => _MoreFiltersSheet(
        criteria: _currentCriteria,
        onApply: (newCriteria) {
          _updateCriteria(newCriteria);
          Navigator.pop(context);
        },
      ),
    );
  }
}

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
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF2563EB) : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF2563EB) : Colors.grey.shade300,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : Colors.grey.shade700,
                fontWeight: FontWeight.w500,
                fontSize: 12,
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              Icons.keyboard_arrow_down,
              size: 16,
              color: isSelected ? Colors.white : Colors.grey.shade600,
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterBottomSheet extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _FilterBottomSheet({
    required this.title,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1A1A1A),
            ),
          ),
          const SizedBox(height: 16),
          ...children,
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

class _FilterOption extends StatelessWidget {
  final String title;
  final bool isSelected;
  final VoidCallback onTap;

  const _FilterOption({
    required this.title,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(
        title,
        style: TextStyle(
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
          color: isSelected ? const Color(0xFF2563EB) : Colors.black,
        ),
      ),
      trailing: isSelected
          ? const Icon(Icons.check_circle, color: Color(0xFF2563EB))
          : null,
      onTap: onTap,
    );
  }
}

class _MoreFiltersSheet extends StatefulWidget {
  final ChurchFilterCriteria criteria;
  final Function(ChurchFilterCriteria) onApply;

  const _MoreFiltersSheet({
    required this.criteria,
    required this.onApply,
  });

  @override
  State<_MoreFiltersSheet> createState() => _MoreFiltersSheetState();
}

class _MoreFiltersSheetState extends State<_MoreFiltersSheet> {
  late ChurchFilterCriteria _criteria;
  late TextEditingController _yearController;
  late TextEditingController _locationController;

  @override
  void initState() {
    super.initState();
    _criteria = widget.criteria;
    _yearController = TextEditingController(
      text: _criteria.foundingYear?.toString() ?? '',
    );
    _locationController = TextEditingController(
      text: _criteria.location ?? '',
    );
  }

  @override
  void dispose() {
    _yearController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'More Filters',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1A1A1A),
            ),
          ),
          const SizedBox(height: 16),

          // Founding Year Filter
          TextField(
            controller: _yearController,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: 'Founding Year',
              hintText: 'Enter specific year (e.g., 1595)',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              prefixIcon: const Icon(Icons.calendar_today),
            ),
            onChanged: (value) {
              final year = int.tryParse(value);
              _criteria = _criteria.copyWith(foundingYear: year);
            },
          ),
          const SizedBox(height: 16),

          // Location Filter
          TextField(
            controller: _locationController,
            decoration: InputDecoration(
              labelText: 'Location',
              hintText: 'Municipality or Barangay',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              prefixIcon: const Icon(Icons.location_on),
            ),
            onChanged: (value) {
              _criteria =
                  _criteria.copyWith(location: value.isEmpty ? null : value);
            },
          ),
          const SizedBox(height: 24),

          // Apply Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => widget.onApply(_criteria),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text(
                'Apply Filters',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
