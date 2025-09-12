import 'package:flutter_test/flutter_test.dart';
import 'package:visita_mobile/models/church.dart';
import 'package:visita_mobile/models/church_filter.dart';
import 'package:visita_mobile/models/enums.dart';

void main() {
  final sample = [
    Church(
        id: '1',
        name: 'St. Peter',
        location: 'Tagbilaran',
        diocese: Diocese.tagbilaran.label,
        images: []),
    Church(
        id: '2',
        name: 'St. Paul',
        location: 'Loboc',
        diocese: Diocese.tagbilaran.label,
        images: [],
        isHeritage: true),
    Church(
        id: '3',
        name: 'Holy Family',
        location: 'Talibon',
        diocese: Diocese.talibon.label,
        images: []),
  ];

  test('search filter matches name', () {
    final result =
        applyChurchFilter(sample, const ChurchFilterCriteria(search: 'peter'));
    expect(result.map((e) => e.id), ['1']);
  });

  test('heritage filter only returns heritage', () {
    final result = applyChurchFilter(
        sample, const ChurchFilterCriteria(heritageOnly: true));
    expect(result.map((e) => e.id), ['2']);
  });

  test('diocese filter returns correct churches', () {
    final result = applyChurchFilter(
        sample, const ChurchFilterCriteria(diocese: Diocese.talibon));
    expect(result.map((e) => e.id), ['3']);
  });
}
