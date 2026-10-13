import type { CareProfile } from "./care";
// Tipos de domínio do Ministério Infantil. Espelham os contratos da futura API.

export type Role = "admin" | "coordenacao" | "professor" | "recepcao";

export type ChildStatus = "ativo" | "inativo" | "pendente";
export type PresenceState = "ausente" | "presente" | "aguardando_retirada";

export interface Child {
  id: string;
  code: string; // código interno exclusivo (ex.: CR-1024)
  fullName: string;
  nickname: string;
  birthDate: string; // ISO
  photoUrl?: string;
  classId: string;
  familyId: string;
  notes: string;
  health: string; // acesso restrito
  /** Detalhes de saúde e cuidados especiais (restrito à coordenação). */
  care?: CareProfile;
  /** Selos visíveis a toda a equipe, sem o detalhe. */
  careAlert?: boolean;
  hasMedication?: boolean;
  status: ChildStatus;
  guardianIds: string[];
  authorizedIds: string[];
}

export interface Guardian {
  id: string;
  familyId: string;
  fullName: string;
  phone: string;
  email?: string;
  relation: string;
  whatsapp?: boolean; // tem WhatsApp neste telefone
  contactPref: "telefone" | "whatsapp" | "email" | "app";
  active: boolean;
  primary: boolean;
}

export interface AuthorizedPerson {
  id: string;
  familyId: string;
  fullName: string;
  phone: string;
  relation: string;
  validUntil: string; // ISO date
  active: boolean;
}

export interface Family {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  ageMin: number;
  ageMax: number;
  room: string;
  capacity: number;
  teachers: string[];
  active: boolean;
  schedule: string;
  color: "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5";
}

export type BadgeStatus = "ativo" | "perdido" | "cancelado" | "substituido";

export interface Badge {
  id: string;
  childId: string;
  token: string; // identificador opaco no QR Code
  status: BadgeStatus;
  issuedAt: string;
  expiresAt: string;
}

export interface Attendance {
  id: string;
  childId: string;
  checkInAt: string;
  droppedBy: string;
  checkOutAt?: string;
  pickedUpBy?: string;
}

export type CallStatus =
  | "pendente"
  | "enviada"
  | "recebida"
  | "visualizada"
  | "atendida"
  | "cancelada";
export type CallReason = "atendimento" | "desconforto" | "cuidados" | "outro";

export interface GuardianCall {
  id: string;
  childId: string;
  classId: string;
  reason: CallReason;
  note?: string;
  familyId?: string; // permite à família ver a chamada no app
  requestedBy: string;
  createdAt: string;
  status: CallStatus;
  history: { status: CallStatus; at: string }[];
}

export type NotificationCategory =
  "chamada" | "presenca" | "alerta" | "comunicado" | "administrativo";

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  recipient: string;
  createdAt: string;
  delivery: "simulada" | "local" | "pendente";
  read: boolean;
}

export interface AuditEntry {
  id: string;
  at: string;
  uid?: string;
  user: string;
  action: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  classIds: string[];
  active: boolean;
}

export interface Invite {
  id: string; // o próprio código (ex.: KIDS-7F3K9Q)
  active: boolean;
  createdAt: string;
  createdBy: string;
}

export interface FamilyLink {
  id: string; // o próprio código (ex.: LK-7F3K9Q)
  familyId: string;
  active: boolean;
  createdAt: string;
  createdBy: string;
}

export interface AppState {
  children: Child[];
  families: Family[];
  guardians: Guardian[];
  authorized: AuthorizedPerson[];
  classes: ClassRoom[];
  badges: Badge[];
  attendance: Attendance[];
  calls: GuardianCall[];
  notifications: AppNotification[];
  audit: AuditEntry[];
  users: AppUser[];
  invites: Invite[];
  joinCodes: Invite[];
  familyLinks: FamilyLink[];
  settings: ChurchSettings;
}

export interface ChurchSettings {
  name: string;
  units: string[];
  phone: string;
  address: string;
  logoUrl?: string;
  /** Cor da igreja (ver lib/tema.ts); vale no painel e no app. */
  themeColor?: string;
  idPrefix: string; // prefixo do código das crianças
  badge: {
    widthMm: number;
    heightMm: number;
    showClass: boolean;
    showFamily: boolean;
    validityDays: number;
  };
  rules: {
    requireAuthorizedPickup: boolean;
    maxChildrenPerTeacher: number;
    alertCapacityPct: number;
  };
  notify: {
    calls: boolean;
    presence: boolean;
    alerts: boolean;
    announcements: boolean;
    hideSensitiveOnLockScreen: boolean;
  };
  privacy: {
    legalBasis: string;
    consentRequired: boolean;
    retentionMonths: number;
    healthRestricted: boolean;
  };
}
