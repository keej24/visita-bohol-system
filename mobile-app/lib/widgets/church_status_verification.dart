import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../repositories/church_repository.dart';
import '../models/church.dart';
import '../models/church_status.dart';

/// Debug widget to verify that only approved churches are being loaded
/// This can be temporarily added to your home screen to verify the filtering
class ChurchStatusVerificationWidget extends StatelessWidget {
  const ChurchStatusVerificationWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<ChurchRepository>(
      builder: (context, churchRepository, child) {
        return FutureBuilder<List<Church>>(
          future: churchRepository.getAll(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Card(
                child: ListTile(
                  leading: CircularProgressIndicator(),
                  title: Text('Verifying church status filtering...'),
                ),
              );
            }

            if (snapshot.hasError) {
              return Card(
                child: ListTile(
                  leading: const Icon(Icons.error, color: Colors.red),
                  title: const Text('Error loading churches'),
                  subtitle: Text(snapshot.error.toString()),
                ),
              );
            }

            final churches = snapshot.data ?? [];
            final approvedCount =
                churches.where((c) => c.status == ChurchStatus.approved).length;
            final nonApprovedCount =
                churches.where((c) => c.status != ChurchStatus.approved).length;

            return Card(
              color:
                  nonApprovedCount == 0 ? Colors.green[50] : Colors.orange[50],
              child: ExpansionTile(
                leading: Icon(
                  nonApprovedCount == 0 ? Icons.verified : Icons.warning,
                  color: nonApprovedCount == 0 ? Colors.green : Colors.orange,
                ),
                title: const Text('Status Filter Verification'),
                subtitle: Text(
                  nonApprovedCount == 0
                      ? '✅ All ${churches.length} churches are approved'
                      : '⚠️ $nonApprovedCount non-approved churches detected',
                ),
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Total Churches Loaded: ${churches.length}',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        Text('Approved: $approvedCount'),
                        Text('Non-Approved: $nonApprovedCount'),
                        const SizedBox(height: 12),
                        const Text(
                          'Churches by Status:',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        ...churches.map((church) => Padding(
                              padding: const EdgeInsets.only(left: 16, top: 4),
                              child: Row(
                                children: [
                                  Container(
                                    width: 12,
                                    height: 12,
                                    decoration: BoxDecoration(
                                      color: Color(church.statusColor),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      '${church.name} (${church.status})',
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                  ),
                                ],
                              ),
                            )),
                        if (nonApprovedCount == 0) ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.green[100],
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              '🎉 SUCCESS: Church status filtering is working correctly!\n'
                              'Only approved churches are visible to public users.',
                              style: TextStyle(
                                color: Colors.green,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

/// Simple status indicator for the app bar
class StatusFilterIndicator extends StatelessWidget {
  const StatusFilterIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<ChurchRepository>(
      builder: (context, churchRepository, child) {
        return FutureBuilder<List<Church>>(
          future: churchRepository.getAll(),
          builder: (context, snapshot) {
            if (!snapshot.hasData) return const SizedBox.shrink();

            final churches = snapshot.data!;
            final allApproved =
                churches.every((c) => c.status == ChurchStatus.approved);

            return IconButton(
              icon: Icon(
                allApproved ? Icons.verified : Icons.warning,
                color: allApproved ? Colors.green : Colors.orange,
              ),
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('Church Status Filter'),
                    content: Text(
                      allApproved
                          ? 'All ${churches.length} churches are approved and visible to public users.'
                          : 'Warning: Some non-approved churches are visible. Check your filtering logic.',
                    ),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context),
                        child: const Text('OK'),
                      ),
                    ],
                  ),
                );
              },
            );
          },
        );
      },
    );
  }
}
