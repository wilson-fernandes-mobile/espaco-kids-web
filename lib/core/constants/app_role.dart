/// Papéis do sistema. Equipe usa o mesmo conjunto do painel web; `responsavel`
/// é exclusivo do app (pais e familiares vinculados a uma família).
enum AppRole {
  admin('admin', 'Administrador'),
  coordenacao('coordenacao', 'Coordenação'),
  professor('professor', 'Professor(a)'),
  recepcao('recepcao', 'Recepção'),
  responsavel('responsavel', 'Família');

  const AppRole(this.id, this.label);

  final String id;
  final String label;

  bool get isStaff => this != responsavel;

  /// Pode registrar entrada/saída (balcão da recepção).
  bool get canCheckInOut => this != professor && this != responsavel;

  /// Pode abrir chamadas aos responsáveis.
  bool get canCall => isStaff;

  static AppRole? fromId(String? id) {
    for (final r in values) {
      if (r.id == id) return r;
    }
    return null;
  }
}
