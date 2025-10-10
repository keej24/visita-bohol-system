import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:visita_mobile/models/church.dart';
import 'package:visita_mobile/models/app_state.dart';
import 'package:visita_mobile/models/enums.dart';
import 'package:visita_mobile/widgets/home/church_card.dart';

Church sampleChurch() => Church(
      id: 'c1',
      name: 'Test Church',
      location: 'Testville',
      foundingYear: 1900,
      architecturalStyle: ArchitecturalStyle.baroque,
      images: const [],
      isHeritage: true,
      diocese: 'Diocese of Tagbilaran',
    );

void main() {
  testWidgets('ChurchCard shows details and chips, and onTap works', (tester) async {
    final church = sampleChurch();
    final appState = AppState();
    var tapped = false;

    await tester.pumpWidget(
      MultiProvider(
        providers: [ChangeNotifierProvider.value(value: appState)],
        child: MaterialApp(
          home: Scaffold(
            body: ChurchCard(
              church: church,
              onTap: () {
                tapped = true;
              },
            ),
          ),
        ),
      ),
    );

    // Key UI bits reflect current design
    expect(find.text('Details'), findsOneWidget);
    expect(find.text('Diocese of Tagbilaran'), findsOneWidget);
    expect(find.text('Baroque'), findsOneWidget);
    expect(find.textContaining('Founded 1900'), findsOneWidget);

    // Tapping the card (via church title within the InkWell) triggers onTap
    await tester.tap(find.text('Test Church'));
    await tester.pumpAndSettle();
    expect(tapped, isTrue);
  });
}
