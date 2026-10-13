// Regras de negócio puras (sem UI). Devem ser revalidadas no backend futuramente.
import type {
  AppState,
  Attendance,
  AuthorizedPerson,
  Child,
  Guardian,
  Role,
} from "./types";

export type Permission =
  | "dashboard"
  | "criancas"
  | "familias"
  | "checkin"
  | "turmas"
  | "crachas"
  | "chamadas"
  | "notificacoes"
  | "relatorios"
  | "usuarios"
  | "configuracoes"
  | "saude";

export const PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    "dashboard",
    "criancas",
    "familias",
    "checkin",
    "turmas",
    "crachas",
    "chamadas",
    "notificacoes",
    "relatorios",
    "usuarios",
    "configuracoes",
    "saude",
  ],
  coordenacao: [
    "dashboard",
    "criancas",
    "familias",
    "checkin",
    "turmas",
    "crachas",
    "chamadas",
    "notificacoes",
    "relatorios",
    "saude",
  ],
  professor: ["dashboard", "chamadas", "notificacoes", "turmas"],
  recepcao: [
    "dashboard",
    "criancas",
    "familias",
    "checkin",
    "crachas",
    "notificacoes",
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  coordenacao: "Coordenação",
  professor: "Professor",
  recepcao: "Recepção",
};

export function can(role: Role, p: Permission) {
  return PERMISSIONS[role].includes(p);
}

export function ageFrom(birthISO: string, now = new Date()) {
  const b = new Date(birthISO);
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
  return a;
}

export function openAttendance(attendance: Attendance[], childId: string) {
  return attendance.find((a) => a.childId === childId && !a.checkOutAt);
}

export type RuleResult = { ok: true } | { ok: false; reason: string };

export function validateCheckIn(
  state: Pick<AppState, "attendance">,
  child: Child,
): RuleResult {
  if (child.status !== "ativo")
    return {
      ok: false,
      reason: "Cadastro não está ativo. Procure a coordenação.",
    };
  if (openAttendance(state.attendance, child.id))
    return {
      ok: false,
      reason: "Esta criança já possui entrada registrada e ainda não saiu.",
    };
  return { ok: true };
}

/** Pessoa apta a retirar: autorizado vigente OU responsável ativo vinculado E presente na lista de autorizados. */
export function pickupCandidates(
  child: Child,
  guardians: Guardian[],
  authorized: AuthorizedPerson[],
) {
  const g = guardians.filter((x) => x.familyId === child.familyId);
  const a = authorized.filter((x) => x.familyId === child.familyId);
  return [
    ...g.map((x) => ({
      id: x.id,
      name: x.fullName,
      relation: x.relation,
      kind: "responsavel" as const,
    })),
    ...a.map((x) => ({
      id: x.id,
      name: x.fullName,
      relation: x.relation,
      kind: "autorizado" as const,
    })),
  ];
}

export function validateCheckOut(
  state: Pick<AppState, "attendance" | "authorized">,
  child: Child,
  personId: string,
  now = new Date(),
): RuleResult {
  if (!openAttendance(state.attendance, child.id))
    return {
      ok: false,
      reason: "Não há entrada registrada para esta criança.",
    };
  if (!child.authorizedIds.includes(personId))
    return {
      ok: false,
      reason:
        "Pessoa NÃO autorizada a retirar esta criança. Contate a coordenação.",
    };
  const ap = state.authorized.find((a) => a.id === personId);
  if (ap && (!ap.active || new Date(ap.validUntil) < now))
    return {
      ok: false,
      reason: "Autorização vencida ou revogada. Contate a coordenação.",
    };
  return { ok: true };
}

export function occupancy(
  state: Pick<AppState, "attendance" | "children">,
  classId: string,
) {
  return state.attendance.filter(
    (a) =>
      !a.checkOutAt &&
      state.children.find((c) => c.id === a.childId)?.classId === classId,
  ).length;
}

export function opaqueToken() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function isIncomplete(c: Child) {
  return (
    !c.photoUrl ||
    c.guardianIds.length === 0 ||
    c.authorizedIds.length === 0 ||
    !c.birthDate
  );
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
/** Presenças (entradas) por dia nos últimos 7 dias, terminando hoje. */
export function weeklyAttendance(attendance: Attendance[], now = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const key = d.toDateString();
    return {
      dia: WEEKDAYS[d.getDay()],
      presencas: attendance.filter(
        (a) => new Date(a.checkInAt).toDateString() === key,
      ).length,
    };
  });
}

/** Média mensal de presenças por dia com atividade (últimos 6 meses). */
export function monthlyAverage(attendance: Attendance[], now = new Date()) {
  return Array.from({ length: 6 }, (_, i) => {
    const m = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const rows = attendance.filter((a) => {
      const d = new Date(a.checkInAt);
      return (
        d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth()
      );
    });
    const days = new Set(rows.map((a) => new Date(a.checkInAt).toDateString()))
      .size;
    return {
      mes: m.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      media: days ? Math.round(rows.length / days) : 0,
    };
  });
}
