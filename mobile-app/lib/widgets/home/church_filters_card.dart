import 'package:flutter/material.dart';
import '../../../models/enums.dart';

class ChurchFiltersCard extends StatefulWidget {
  final String search;
  final String location;
  final String classification;
  final Diocese? selectedDiocese;
  final bool heritageOnly;
  final ValueChanged<String> onSearchChanged;
  final ValueChanged<String> onLocationChanged;
  final void Function(String newType, bool heritageOnly) onTypeChanged;
  final ValueChanged<Diocese?> onDioceseChanged;

  const ChurchFiltersCard({
    super.key,
    required this.search,
    required this.location,
    required this.classification,
    required this.selectedDiocese,
    required this.heritageOnly,
    required this.onSearchChanged,
    required this.onLocationChanged,
    required this.onTypeChanged,
    required this.onDioceseChanged,
  });

  @override
  State<ChurchFiltersCard> createState() => _ChurchFiltersCardState();
}

class _ChurchFiltersCardState extends State<ChurchFiltersCard> {
  late final TextEditingController _searchController;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController(text: widget.search);
  }

  @override
  void didUpdateWidget(covariant ChurchFiltersCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.search != widget.search &&
        _searchController.text != widget.search) {
      _searchController.text = widget.search;
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            DropdownButtonFormField<String>(
              decoration: InputDecoration(
                labelText: 'Diocese',
                prefixIcon: Icon(Icons.account_balance, color: cs.primary),
                border:
                    OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: cs.primary, width: 2),
                ),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
              initialValue: widget.selectedDiocese?.label ?? 'All',
              items: const [
                DropdownMenuItem(value: 'All', child: Text('All Dioceses')),
                DropdownMenuItem(
                    value: 'Diocese of Tagbilaran',
                    child: Text('Diocese of Tagbilaran')),
                DropdownMenuItem(
                    value: 'Diocese of Talibon',
                    child: Text('Diocese of Talibon')),
              ],
              onChanged: (value) {
                widget.onDioceseChanged(value == null || value == 'All'
                    ? null
                    : DioceseX.fromLabel(value));
              },
            ),
            const SizedBox(height: 16),
            TextField(
              decoration: InputDecoration(
                hintText: 'Search churches...',
                prefixIcon: Icon(Icons.search, color: cs.primary),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide:
                      BorderSide(color: cs.outline.withValues(alpha: .3)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: cs.primary, width: 2),
                ),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
              controller: _searchController,
              onChanged: widget.onSearchChanged,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    decoration: const InputDecoration(
                      labelText: 'Location',
                      border: OutlineInputBorder(),
                    ),
                    initialValue:
                        widget.location.isEmpty ? null : widget.location,
                    items: const [
                      DropdownMenuItem(value: '', child: Text('All Locations')),
                      DropdownMenuItem(
                          value: 'Tagbilaran', child: Text('Tagbilaran')),
                      DropdownMenuItem(value: 'Loboc', child: Text('Loboc')),
                      DropdownMenuItem(
                          value: 'Baclayon', child: Text('Baclayon')),
                      DropdownMenuItem(value: 'Dauis', child: Text('Dauis')),
                      DropdownMenuItem(
                          value: 'Panglao', child: Text('Panglao')),
                    ],
                    onChanged: (value) => widget.onLocationChanged(value ?? ''),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    decoration: const InputDecoration(
                      labelText: 'Type',
                      border: OutlineInputBorder(),
                    ),
                    initialValue: widget.classification.isEmpty
                        ? null
                        : widget.classification,
                    items: const [
                      DropdownMenuItem(value: '', child: Text('All Types')),
                      DropdownMenuItem(
                          value: 'Heritage', child: Text('Heritage')),
                      DropdownMenuItem(
                          value: 'Non-Heritage', child: Text('Non-Heritage')),
                    ],
                    onChanged: (value) =>
                        widget.onTypeChanged(value ?? '', value == 'Heritage'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
