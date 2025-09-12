import 'package:flutter/material.dart';
import '../../../models/enums.dart';
import '../../screens/enhanced_church_exploration_screen.dart';

class FilterBar extends StatefulWidget {
  final String search;
  final Diocese? diocese; // null => All
  final bool heritageOnly;
  final ValueChanged<String> onSearchChanged;
  final ValueChanged<Diocese?> onDioceseChanged;
  final ValueChanged<bool> onHeritageOnlyChanged;
  final VoidCallback? onAdvancedSearchTap;

  const FilterBar({
    super.key,
    required this.search,
    required this.diocese,
    required this.heritageOnly,
    required this.onSearchChanged,
    required this.onDioceseChanged,
    required this.onHeritageOnlyChanged,
    this.onAdvancedSearchTap,
  });

  @override
  State<FilterBar> createState() => _FilterBarState();
}

class _FilterBarState extends State<FilterBar> {
  late final TextEditingController _controller;
  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.search);
  }

  @override
  void didUpdateWidget(covariant FilterBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.search != widget.search &&
        _controller.text != widget.search) {
      _controller.text = widget.search;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: _SearchField(
                  controller: _controller, onChanged: widget.onSearchChanged),
            ),
            const SizedBox(width: 8),
            _AdvancedSearchButton(
              onTap: widget.onAdvancedSearchTap,
            ),
          ],
        ),
        const SizedBox(height: 12),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _ChipToggle(
                label: 'All Dioceses',
                selected: widget.diocese == null,
                onTap: () => widget.onDioceseChanged(null),
              ),
              const SizedBox(width: 8),
              _ChipToggle(
                label: Diocese.tagbilaran.label,
                selected: widget.diocese == Diocese.tagbilaran,
                onTap: () => widget.onDioceseChanged(Diocese.tagbilaran),
              ),
              const SizedBox(width: 8),
              _ChipToggle(
                label: Diocese.talibon.label,
                selected: widget.diocese == Diocese.talibon,
                onTap: () => widget.onDioceseChanged(Diocese.talibon),
              ),
              const SizedBox(width: 16),
              _ChipToggle(
                label: 'Heritage',
                selected: widget.heritageOnly,
                onTap: () => widget.onHeritageOnlyChanged(!widget.heritageOnly),
                icon: Icons.account_balance,
              ),
              const SizedBox(width: 8),
              if (widget.search.isNotEmpty ||
                  widget.diocese != null ||
                  widget.heritageOnly) ...[
                TextButton(
                  onPressed: () {
                    widget.onSearchChanged('');
                    widget.onDioceseChanged(null);
                    if (widget.heritageOnly) {
                      widget.onHeritageOnlyChanged(false);
                    }
                  },
                  child: const Text('Reset'),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 4),
        Divider(color: cs.outline.withValues(alpha: .4), height: 1),
      ],
    );
  }
}

class _SearchField extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  const _SearchField({required this.controller, required this.onChanged});
  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      decoration: InputDecoration(
        isDense: true,
        hintText: 'Search churches',
        prefixIcon: const Icon(Icons.search, color: Color(0xFF6B6B6B)),
        suffixIcon: controller.text.isNotEmpty
            ? IconButton(
                icon: const Icon(Icons.close, color: Color(0xFF6B6B6B)),
                onPressed: () {
                  controller.clear();
                  onChanged('');
                },
              )
            : null,
        filled: true,
        fillColor: Colors.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFE0E0E0), width: 1)),
        enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFE0E0E0), width: 1)),
        focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF2563EB), width: 2)),
      ),
      onChanged: onChanged,
      textInputAction: TextInputAction.search,
    );
  }
}

class _ChipToggle extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;
  const _ChipToggle(
      {required this.label,
      required this.selected,
      required this.onTap,
      this.icon});
  @override
  Widget build(BuildContext context) {
    final bg = selected ? const Color(0xFF2563EB) : Colors.white;
    final fg = selected ? Colors.white : const Color(0xFF1A1A1A);
    final borderColor =
        selected ? const Color(0xFF2563EB) : const Color(0xFFE0E0E0);
    return Semantics(
      selected: selected,
      button: true,
      label: label + (selected ? ' selected' : ''),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: borderColor, width: 1),
            boxShadow: selected
                ? [
                    BoxShadow(
                        color: const Color(0xFF2563EB).withValues(alpha: 0.2),
                        blurRadius: 8,
                        offset: const Offset(0, 2))
                  ]
                : null,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 14, color: fg),
                const SizedBox(width: 4),
              ],
              Text(
                label,
                style: TextStyle(
                    fontSize: 12, fontWeight: FontWeight.w600, color: fg),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AdvancedSearchButton extends StatelessWidget {
  final VoidCallback? onTap;

  const _AdvancedSearchButton({this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 48,
      child: ElevatedButton(
        onPressed: onTap ??
            () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const EnhancedChurchExplorationScreen(),
                ),
              );
            },
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF2563EB),
          foregroundColor: Colors.white,
          elevation: 2,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.tune, size: 18),
            SizedBox(width: 6),
            Text(
              'Advanced',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
