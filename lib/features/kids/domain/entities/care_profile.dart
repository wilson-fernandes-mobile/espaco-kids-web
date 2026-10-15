/// Medicamento com horários (ex.: "Ritalina 10 mg às 12:00").
class Medication {
  const Medication({
    this.name = '',
    this.dose = '',
    this.times = const [],
    this.note = '',
    this.staffGives = false,
  });

  final String name;
  final String dose;

  /// Horários HH:MM.
  final List<String> times;
  final String note;

  /// A equipe administra (senão, só avisar).
  final bool staffGives;

  Medication copyWith({
    String? name,
    String? dose,
    List<String>? times,
    String? note,
    bool? staffGives,
  }) => Medication(
    name: name ?? this.name,
    dose: dose ?? this.dose,
    times: times ?? this.times,
    note: note ?? this.note,
    staffGives: staffGives ?? this.staffGives,
  );

  factory Medication.fromMap(Map<String, dynamic> m) => Medication(
    name: (m['name'] as String?) ?? '',
    dose: (m['dose'] as String?) ?? '',
    times: List<String>.from(m['times'] as List? ?? const []),
    note: (m['note'] as String?) ?? '',
    staffGives: m['staffGives'] == true,
  );

  Map<String, dynamic> toMap() => {
    'name': name.trim(),
    'dose': dose.trim(),
    'times': times,
    'note': note.trim(),
    'staffGives': staffGives,
  };
}

/// Saúde e cuidados especiais (doc restrito `health/{childId}`). Mesmo
/// formato do painel web.
class CareProfile {
  const CareProfile({
    this.conditions = const [],
    this.autismLevel = 0,
    this.otherCondition = '',
    this.hasReport = false,
    this.communication = '',
    this.sensitivities = const [],
    this.calming = '',
    this.triggers = '',
    this.needsCompanion = false,
    this.allergies = '',
    this.diet = '',
    this.medications = const [],
    this.emergencyName = '',
    this.emergencyPhone = '',
    this.healthPlan = '',
    this.imageConsent,
    this.text = '',
    this.updatedAt = '',
  });

  final List<String> conditions;
  final int autismLevel;
  final String otherCondition;
  final bool hasReport;
  final String communication;
  final List<String> sensitivities;
  final String calming;
  final String triggers;
  final bool needsCompanion;
  final String allergies;
  final String diet;
  final List<Medication> medications;
  final String emergencyName;
  final String emergencyPhone;
  final String healthPlan;
  final bool? imageConsent;

  /// Observações livres (campo antigo `text`).
  final String text;
  final String updatedAt;

  static const conditionLabels = {
    'tea': 'TEA (autismo)',
    'tdah': 'TDAH',
    'def_intelectual': 'Deficiência intelectual',
    'def_fisica': 'Deficiência física / mobilidade',
    'def_visual': 'Deficiência visual',
    'def_auditiva': 'Deficiência auditiva',
    'outra': 'Outra',
  };
  static const sensitivityLabels = {
    'barulho': 'Barulho',
    'luz': 'Luz forte',
    'toque': 'Toque',
    'cheiro': 'Cheiros',
    'multidao': 'Multidão',
  };
  static const communicationLabels = {
    'verbal': 'Fala normalmente',
    'parcial': 'Fala pouco',
    'naoverbal': 'Não verbal',
  };
  static const autismLevels = {
    0: 'Não sei informar',
    1: 'Nível 1 (suporte leve)',
    2: 'Nível 2 (suporte moderado)',
    3: 'Nível 3 (suporte substancial)',
  };

  bool get hasMedication => medications.any((m) => m.name.trim().isNotEmpty);

  /// Selo "atenção" mostrado a toda a equipe.
  bool get alert =>
      hasMedication ||
      conditions.isNotEmpty ||
      allergies.trim().isNotEmpty ||
      needsCompanion ||
      text.trim().isNotEmpty;

  /// Resumo curto dos pontos de atenção.
  List<String> get summary => [
    for (final c in conditions)
      if (c == 'tea')
        autismLevel > 0
            ? 'TEA — ${autismLevels[autismLevel]}'
            : conditionLabels['tea']!
      else if (c == 'outra')
        (otherCondition.isNotEmpty ? otherCondition : 'Outra condição')
      else
        conditionLabels[c] ?? c,
    if (allergies.trim().isNotEmpty) 'Alergia: ${allergies.trim()}',
    if (needsCompanion) 'Precisa de acompanhante',
  ];

  factory CareProfile.fromMap(Map<String, dynamic>? m) {
    if (m == null) return const CareProfile();
    return CareProfile(
      conditions: List<String>.from(m['conditions'] as List? ?? const []),
      autismLevel: (m['autismLevel'] as num?)?.toInt() ?? 0,
      otherCondition: (m['otherCondition'] as String?) ?? '',
      hasReport: m['hasReport'] == true,
      communication: (m['communication'] as String?) ?? '',
      sensitivities: List<String>.from(m['sensitivities'] as List? ?? const []),
      calming: (m['calming'] as String?) ?? '',
      triggers: (m['triggers'] as String?) ?? '',
      needsCompanion: m['needsCompanion'] == true,
      allergies: (m['allergies'] as String?) ?? '',
      diet: (m['diet'] as String?) ?? '',
      medications: [
        for (final x in (m['medications'] as List? ?? const []))
          Medication.fromMap(Map<String, dynamic>.from(x as Map)),
      ],
      emergencyName: (m['emergencyName'] as String?) ?? '',
      emergencyPhone: (m['emergencyPhone'] as String?) ?? '',
      healthPlan: (m['healthPlan'] as String?) ?? '',
      imageConsent:
          m['imageConsent'] is bool ? m['imageConsent'] as bool : null,
      text: (m['text'] as String?) ?? '',
      updatedAt: (m['updatedAt'] as String?) ?? '',
    );
  }

  Map<String, dynamic> toMap(String nowIso, String uid) => {
    'conditions': conditions,
    'autismLevel': autismLevel,
    'otherCondition': otherCondition.trim(),
    'hasReport': hasReport,
    'communication': communication,
    'sensitivities': sensitivities,
    'calming': calming.trim(),
    'triggers': triggers.trim(),
    'needsCompanion': needsCompanion,
    'allergies': allergies.trim(),
    'diet': diet.trim(),
    'medications': [
      for (final m in medications)
        if (m.name.trim().isNotEmpty) m.toMap(),
    ],
    'emergencyName': emergencyName.trim(),
    'emergencyPhone': emergencyPhone.trim(),
    'healthPlan': healthPlan.trim(),
    'imageConsent': imageConsent,
    'text': text.trim(),
    'updatedAt': nowIso,
    'updatedBy': uid,
  };
}
