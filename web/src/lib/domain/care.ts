// Saúde e cuidados especiais de cada criança (coleção restrita `health/{childId}`).
// Os selos "atenção" e "medicação" também ficam no doc da criança (careAlert /
// hasMedication) para a equipe ver de relance sem abrir os detalhes.

export interface Medication {
  name: string;
  dose: string;
  /** Horários no formato HH:MM. */
  times: string[];
  note: string;
  /** A equipe precisa administrar (senão, só avisar). */
  staffGives: boolean;
}

export interface CareProfile {
  conditions: string[];
  /** Grau de suporte do TEA: 0 = não informado, 1, 2 ou 3. */
  autismLevel: number;
  otherCondition: string;
  hasReport: boolean;
  communication: "" | "verbal" | "parcial" | "naoverbal";
  sensitivities: string[];
  calming: string;
  triggers: string;
  needsCompanion: boolean;
  allergies: string;
  diet: string;
  medications: Medication[];
  emergencyName: string;
  emergencyPhone: string;
  healthPlan: string;
  imageConsent: boolean | null;
  updatedAt: string;
}

export const CONDITIONS: Record<string, string> = {
  tea: "TEA (autismo)",
  tdah: "TDAH",
  def_intelectual: "Deficiência intelectual",
  def_fisica: "Deficiência física / mobilidade",
  def_visual: "Deficiência visual",
  def_auditiva: "Deficiência auditiva",
  outra: "Outra",
};

export const SENSITIVITIES: Record<string, string> = {
  barulho: "Barulho",
  luz: "Luz forte",
  toque: "Toque",
  cheiro: "Cheiros",
  multidao: "Multidão",
};

export const COMMUNICATION: Record<string, string> = {
  verbal: "Fala normalmente",
  parcial: "Fala pouco",
  naoverbal: "Não verbal",
};

export const AUTISM_LEVEL: Record<number, string> = {
  0: "Não informado",
  1: "Nível 1 (suporte leve)",
  2: "Nível 2 (suporte moderado)",
  3: "Nível 3 (suporte substancial)",
};

export const emptyCare = (): CareProfile => ({
  conditions: [],
  autismLevel: 0,
  otherCondition: "",
  hasReport: false,
  communication: "",
  sensitivities: [],
  calming: "",
  triggers: "",
  needsCompanion: false,
  allergies: "",
  diet: "",
  medications: [],
  emergencyName: "",
  emergencyPhone: "",
  healthPlan: "",
  imageConsent: null,
  updatedAt: "",
});

const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** Lê o doc `health/{id}` (aceita o formato antigo, só com `text`). */
export function parseCare(d: Record<string, unknown> | undefined): CareProfile {
  const e = emptyCare();
  if (!d) return e;
  const meds = Array.isArray(d.medications) ? d.medications : [];
  return {
    ...e,
    conditions: arr(d.conditions),
    autismLevel: typeof d.autismLevel === "number" ? d.autismLevel : 0,
    otherCondition: (d.otherCondition as string) ?? "",
    hasReport: d.hasReport === true,
    communication: (d.communication as CareProfile["communication"]) ?? "",
    sensitivities: arr(d.sensitivities),
    calming: (d.calming as string) ?? "",
    triggers: (d.triggers as string) ?? "",
    needsCompanion: d.needsCompanion === true,
    allergies: (d.allergies as string) ?? "",
    diet: (d.diet as string) ?? "",
    medications: meds.map((m: Record<string, unknown>) => ({
      name: (m.name as string) ?? "",
      dose: (m.dose as string) ?? "",
      times: arr(m.times),
      note: (m.note as string) ?? "",
      staffGives: m.staffGives === true,
    })),
    emergencyName: (d.emergencyName as string) ?? "",
    emergencyPhone: (d.emergencyPhone as string) ?? "",
    healthPlan: (d.healthPlan as string) ?? "",
    imageConsent: typeof d.imageConsent === "boolean" ? d.imageConsent : null,
    updatedAt: (d.updatedAt as string) ?? "",
  };
}

/** Selos exibidos para toda a equipe (sem revelar o detalhe). */
export function careFlags(p: CareProfile, text = "") {
  const hasMedication = p.medications.some((m) => m.name.trim());
  const careAlert =
    hasMedication ||
    p.conditions.length > 0 ||
    p.allergies.trim().length > 0 ||
    p.needsCompanion ||
    text.trim().length > 0;
  return { careAlert, hasMedication };
}

/** Resumo de uma linha dos pontos de atenção. */
export function careSummary(p: CareProfile): string[] {
  const out: string[] = [];
  for (const c of p.conditions) {
    if (c === "tea")
      out.push(
        p.autismLevel ? `TEA — ${AUTISM_LEVEL[p.autismLevel]}` : CONDITIONS.tea,
      );
    else if (c === "outra") out.push(p.otherCondition || CONDITIONS.outra);
    else out.push(CONDITIONS[c] ?? c);
  }
  if (p.allergies.trim()) out.push(`Alergia: ${p.allergies.trim()}`);
  if (p.needsCompanion) out.push("Precisa de acompanhante");
  return out;
}
