import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:visita_mobile/widgets/home/filter_bar.dart';
import 'package:visita_mobile/models/enums.dart';

void main() {
  testWidgets('FilterBar search and diocese chip update callbacks',
      (tester) async {
    String? latestQuery;
    Diocese? latestDiocese;

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: FilterBar(
          search: '',
          diocese: null,
          heritageOnly: false,
          onSearchChanged: (q) => latestQuery = q,
          onDioceseChanged: (d) => latestDiocese = d,
          onHeritageOnlyChanged: (_) {},
        ),
      ),
    ));

    await tester.enterText(find.byType(TextField), 'search term');
    await tester.pump();
    expect(latestQuery, 'search term');

    final tagbilaranChip = find.text(Diocese.tagbilaran.label);
    expect(tagbilaranChip, findsOneWidget);
    await tester.tap(tagbilaranChip);
    await tester.pumpAndSettle();
    expect(latestDiocese, Diocese.tagbilaran);
  });
}
