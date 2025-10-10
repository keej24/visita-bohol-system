import 'package:flutter/material.dart';
import '../models/church.dart';
import '../services/local_data_service.dart';
import 'church_detail_screen.dart';
import '../widgets/optimized_image_widget.dart';

class ChurchesListScreen extends StatefulWidget {
  const ChurchesListScreen({super.key});
  @override
  State<ChurchesListScreen> createState() => _ChurchesListScreenState();
}

class _ChurchesListScreenState extends State<ChurchesListScreen> {
  final _service = LocalDataService();
  String _search = '';
  String _location = '';
  String _classification = '';
  int? _year;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8F5F0),
      appBar: AppBar(
        title: const Text('Churches',
            style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
        backgroundColor: const Color(0xFF432818),
      ),
      body: FutureBuilder<List<Church>>(
        future: _service.loadChurches(),
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          final all = snap.data ?? [];
          var list = all.where((c) {
            final matchesName = _search.isEmpty ||
                c.name.toLowerCase().contains(_search.toLowerCase());
            final matchesLoc = _location.isEmpty ||
                c.location.toLowerCase().contains(_location.toLowerCase());
            final matchesClass = _classification.isEmpty ||
                (_classification == 'Heritage' && c.isHeritage) ||
                (_classification == 'Non-Heritage' && !c.isHeritage) ||
                _classification.isEmpty;
            final matchesYear = _year == null || c.foundingYear == _year;
            return matchesName && matchesLoc && matchesClass && matchesYear;
          }).toList();

          return Column(
            children: [
              // Search and Filter Section
              Container(
                padding: const EdgeInsets.all(16.0),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.grey.withValues(alpha: 0.1),
                      spreadRadius: 1,
                      blurRadius: 3,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    // Search Bar
                    Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8F5F0),
                        borderRadius: BorderRadius.circular(25),
                        border: Border.all(
                            color:
                                const Color(0xFF432818).withValues(alpha: 0.2)),
                      ),
                      child: TextField(
                        decoration: const InputDecoration(
                          hintText: 'Search churches...',
                          prefixIcon:
                              Icon(Icons.search, color: Color(0xFF432818)),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(
                              horizontal: 20, vertical: 15),
                        ),
                        onChanged: (v) => setState(() => _search = v),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Filter Chips
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8F5F0),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                  color: const Color(0xFF432818)
                                      .withValues(alpha: 0.2)),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _classification.isEmpty
                                    ? null
                                    : _classification,
                                hint: const Text('Classification',
                                    style: TextStyle(color: Color(0xFF432818))),
                                isExpanded: true,
                                items: const [
                                  DropdownMenuItem(
                                      value: '', child: Text('All')),
                                  DropdownMenuItem(
                                      value: 'Heritage',
                                      child: Text('Heritage')),
                                  DropdownMenuItem(
                                      value: 'Non-Heritage',
                                      child: Text('Non-Heritage')),
                                ],
                                onChanged: (v) =>
                                    setState(() => _classification = v ?? ''),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8F5F0),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                  color: const Color(0xFF432818)
                                      .withValues(alpha: 0.2)),
                            ),
                            child: TextField(
                              decoration: const InputDecoration(
                                hintText: 'Location',
                                border: InputBorder.none,
                                contentPadding:
                                    EdgeInsets.symmetric(vertical: 15),
                              ),
                              onChanged: (v) => setState(() => _location = v),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Results Summary
              Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Text(
                  'Found ${list.length} church${list.length == 1 ? '' : 'es'}',
                  style: const TextStyle(
                    color: Color(0xFF432818),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),

              // Churches List
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: list.length,
                  itemBuilder: (c, i) {
                    final church = list[i];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 16),
                      elevation: 3,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(
                                builder: (_) =>
                                    ChurchDetailScreen(church: church))),
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Row(
                            children: [
                              // Church Image/Icon
                              // Church Image
                              Container(
                                width: 80,
                                height: 80,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF432818)
                                      .withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: church.images.isNotEmpty
                                    ? OptimizedChurchThumbnail(
                                        imageUrl: church.images.first,
                                        size: 80,
                                        isNetworkImage: church.images.first
                                                .startsWith('http://') ||
                                            church.images.first
                                                .startsWith('https://'),
                                      )
                                    : const Icon(
                                        Icons.account_balance,
                                        size: 40,
                                        color: Color(0xFF432818),
                                      ),
                              ),
                              const SizedBox(width: 16),

                              // Church Info
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            church.name,
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFF432818),
                                            ),
                                          ),
                                        ),
                                        if (church.isHeritage)
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 8, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFD4AF37),
                                              borderRadius:
                                                  BorderRadius.circular(12),
                                            ),
                                            child: const Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(Icons.star,
                                                    size: 12,
                                                    color: Colors.white),
                                                SizedBox(width: 4),
                                                Text(
                                                  'Heritage',
                                                  style: TextStyle(
                                                    fontSize: 10,
                                                    fontWeight: FontWeight.bold,
                                                    color: Colors.white,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        const Icon(Icons.location_on,
                                            size: 16, color: Color(0xFF8B4513)),
                                        const SizedBox(width: 4),
                                        Expanded(
                                          child: Text(
                                            church.location,
                                            style: const TextStyle(
                                              fontSize: 14,
                                              color: Color(0xFF8B4513),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    if (church.foundingYear != null) ...[
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          const Icon(Icons.calendar_today,
                                              size: 16,
                                              color: Color(0xFF424242)),
                                          const SizedBox(width: 4),
                                          Text(
                                            'Founded: ${church.foundingYear}',
                                            style: const TextStyle(
                                              fontSize: 12,
                                              color: Color(0xFF424242),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ],
                                ),
                              ),

                              // Arrow Icon
                              const Icon(
                                Icons.arrow_forward_ios,
                                size: 16,
                                color: Color(0xFF432818),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
