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
  testWidgets('ChurchCard toggles visited and wishlist', (tester) async {
    final church = sampleChurch();
    final appState = AppState();

    await tester.pumpWidget(
      MultiProvider(
        providers: [ChangeNotifierProvider.value(value: appState)],
        child: MaterialApp(
          home: Scaffold(
            body: ChurchCard(church: church, onTap: () {}),
          ),
        ),
      ),
    );

    // Initially not visited / wishlist
    expect(appState.isVisited(church), isFalse);
    expect(appState.isForVisit(church), isFalse);

    // Tap wishlist heart outline first (favorite_border icon)
    final wishlistFinder = find.byIcon(Icons.favorite_border);
    expect(wishlistFinder, findsOneWidget);
    await tester.tap(wishlistFinder);
    await tester.pumpAndSettle();
    expect(appState.isForVisit(church), isTrue);

    // Tap visited check outline icon
    final visitedFinder = find.byIcon(Icons.check_circle_outline);
    expect(visitedFinder, findsOneWidget);
    await tester.tap(visitedFinder);
    await tester.pumpAndSettle();
    expect(appState.isVisited(church), isTrue);

    // Tapping again should unmark visited
    final visitedFilledFinder = find.byIcon(Icons.check_circle);
    expect(visitedFilledFinder, findsOneWidget);
    await tester.tap(visitedFilledFinder);
    await tester.pumpAndSettle();
    expect(appState.isVisited(church), isFalse);
  });
}
