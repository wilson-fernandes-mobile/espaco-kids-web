import type {
  BadgeStatus,
  CallReason,
  CallStatus,
  ChildStatus,
  NotificationCategory,
} from "./types";

export const CALL_REASON: Record<CallReason, string> = {
  atendimento: "Necessidade de atendimento",
  desconforto: "Desconforto",
  cuidados: "Necessidade de cuidados",
  outro: "Outro motivo",
};
export const CALL_STATUS: Record<CallStatus, string> = {
  pendente: "Pendente",
  enviada: "Enviada",
  recebida: "Recebida",
  visualizada: "Visualizada",
  atendida: "Atendida",
  cancelada: "Cancelada",
};
export const CHILD_STATUS: Record<ChildStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  pendente: "Pendente",
};
export const BADGE_STATUS: Record<BadgeStatus, string> = {
  ativo: "Ativo",
  perdido: "Perdido",
  cancelado: "Cancelado",
  substituido: "Substituído",
};
export const NOTIF_CAT: Record<NotificationCategory, string> = {
  chamada: "Chamadas",
  presenca: "Entradas e saídas",
  alerta: "Alertas operacionais",
  comunicado: "Comunicados",
  administrativo: "Administrativo",
};

export type Tone = "primary" | "success" | "warning" | "danger" | "neutral";
export const TONE: Record<string, Tone> = {
  ativo: "success",
  inativo: "neutral",
  pendente: "warning",
  presente: "success",
  ausente: "neutral",
  perdido: "danger",
  cancelado: "neutral",
  cancelada: "neutral",
  substituido: "neutral",
  enviada: "primary",
  recebida: "primary",
  visualizada: "primary",
  atendida: "success",
};

export const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
export const date = (iso: string) =>
  new Date(iso.length === 10 ? iso + "T12:00:00" : iso).toLocaleDateString(
    "pt-BR",
  );
export function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `há ${h} h` : `há ${Math.round(h / 24)} d`;
}
