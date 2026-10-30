import 'package:intl/intl.dart';

DateTime? parseIso(String? iso) =>
    iso == null || iso.isEmpty ? null : DateTime.tryParse(iso)?.toLocal();

String hhmm(String? iso) {
  final d = parseIso(iso);
  return d == null ? '--:--' : DateFormat('HH:mm').format(d);
}

String shortDateTime(String? iso) {
  final d = parseIso(iso);
  return d == null ? '' : DateFormat("dd/MM 'às' HH:mm", 'pt_BR').format(d);
}

String nowIso() => DateTime.now().toUtc().toIso8601String();

/// Idade amigável: "4 anos" / "8 meses".
String ageLabel(String? birthIso) {
  final b = parseIso(birthIso);
  if (b == null) return '';
  final now = DateTime.now();
  var months = (now.year - b.year) * 12 + now.month - b.month;
  if (now.day < b.day) months--;
  if (months < 24) return '$months ${months == 1 ? 'mês' : 'meses'}';
  final y = months ~/ 12;
  return '$y anos';
}

String shortDate(String? iso) {
  final d = parseIso(iso);
  return d == null ? "" : DateFormat("dd/MM/yyyy").format(d);
}
