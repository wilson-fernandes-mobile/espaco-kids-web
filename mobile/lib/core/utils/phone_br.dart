/// Normaliza telefone brasileiro para o formato internacional (55 + DDD + n).
String? normalizePhoneBR(String raw) {
  var d = raw.replaceAll(RegExp(r'\D'), '');
  if (d.startsWith('55') && d.length >= 12) d = d.substring(2);
  if (d.length != 10 && d.length != 11) return null;
  return '55$d';
}

/// Link wa.me para abrir conversa no WhatsApp (sem dados sensíveis).
Uri? whatsappUri(String phone, [String? text]) {
  final n = normalizePhoneBR(phone);
  if (n == null) return null;
  return Uri.https('wa.me', '/$n', {if (text != null) 'text': text});
}
