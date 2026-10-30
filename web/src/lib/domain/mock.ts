// Dados de demonstração centralizados. Fictícios — não usar dados reais.
import type { AppState, Child, ChurchSettings } from "./types";

const iso = (d: Date) => d.toISOString();
const minutesAgo = (m: number) => iso(new Date(Date.now() - m * 60000));
const yearsAgo = (y: number, m = 0) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - y);
  d.setMonth(d.getMonth() - m);
  return d.toISOString().slice(0, 10);
};
const inDays = (n: number) =>
  new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export function createSeed(): AppState {
  const classes: AppState["classes"] = [
    {
      id: "t1",
      name: "Berçário",
      ageMin: 0,
      ageMax: 1,
      room: "Sala Arca",
      capacity: 8,
      teachers: ["Ana Ribeiro"],
      active: true,
      schedule: "Dom 9h e 18h",
      color: "chart-3",
    },
    {
      id: "t2",
      name: "Maternal",
      ageMin: 2,
      ageMax: 3,
      room: "Sala Jardim",
      capacity: 12,
      teachers: ["Beatriz Lima", "Carlos Souza"],
      active: true,
      schedule: "Dom 9h e 18h",
      color: "chart-2",
    },
    {
      id: "t3",
      name: "Jardim",
      ageMin: 4,
      ageMax: 5,
      room: "Sala Estrela",
      capacity: 15,
      teachers: ["Daniela Rocha"],
      active: true,
      schedule: "Dom 9h e 18h",
      color: "chart-4",
    },
    {
      id: "t4",
      name: "Primários",
      ageMin: 6,
      ageMax: 8,
      room: "Sala Oceano",
      capacity: 20,
      teachers: ["Eduardo Melo", "Fernanda Dias"],
      active: true,
      schedule: "Dom 9h • Qua 19h30",
      color: "chart-1",
    },
    {
      id: "t5",
      name: "Juniores",
      ageMin: 9,
      ageMax: 11,
      room: "Sala Monte",
      capacity: 20,
      teachers: ["Gabriel Nunes"],
      active: true,
      schedule: "Dom 9h",
      color: "chart-5",
    },
  ];

  const famData = [
    ["Família Silva", "(11) 98123-4501", "silva@exemplo.com"],
    ["Família Oliveira", "(11) 98123-4502", "oliveira@exemplo.com"],
    ["Família Santos", "(11) 98123-4503", undefined],
    ["Família Costa", "(11) 98123-4504", "costa@exemplo.com"],
    ["Família Pereira", "(11) 98123-4505", undefined],
    ["Família Almeida", "(11) 98123-4506", "almeida@exemplo.com"],
    ["Família Carvalho", "(11) 98123-4507", undefined],
    ["Família Martins", "(11) 98123-4508", "martins@exemplo.com"],
  ] as const;
  const families: AppState["families"] = famData.map(
    ([name, phone, email], i) => ({
      id: `f${i + 1}`,
      code: `FAM-${(201 + i).toString()}`,
      name,
      phone,
      email,
    }),
  );

  const g = (
    id: string,
    familyId: string,
    fullName: string,
    relation: string,
    primary: boolean,
    phone: string,
  ) => ({
    id,
    familyId,
    fullName,
    relation,
    primary,
    phone,
    active: true,
    contactPref: "whatsapp" as const,
  });
  const guardians: AppState["guardians"] = [
    g("g1", "f1", "Marcos Silva", "Pai", true, "(11) 98123-4501"),
    g("g2", "f1", "Juliana Silva", "Mãe", false, "(11) 98123-4511"),
    g("g3", "f2", "Renata Oliveira", "Mãe", true, "(11) 98123-4502"),
    g("g4", "f3", "Paulo Santos", "Pai", true, "(11) 98123-4503"),
    g("g5", "f3", "Cláudia Santos", "Mãe", false, "(11) 98123-4513"),
    g("g6", "f4", "Patrícia Costa", "Mãe", true, "(11) 98123-4504"),
    g("g7", "f5", "Ricardo Pereira", "Pai", true, "(11) 98123-4505"),
    g("g8", "f6", "Larissa Almeida", "Mãe", true, "(11) 98123-4506"),
    g("g9", "f7", "Thiago Carvalho", "Pai", true, "(11) 98123-4507"),
    g("g10", "f8", "Vanessa Martins", "Mãe", true, "(11) 98123-4508"),
  ];

  const authorized: AppState["authorized"] = [
    {
      id: "a1",
      familyId: "f1",
      fullName: "Helena Silva",
      phone: "(11) 97000-1111",
      relation: "Avó",
      validUntil: inDays(180),
      active: true,
    },
    {
      id: "a2",
      familyId: "f1",
      fullName: "Rafael Moura",
      phone: "(11) 97000-2222",
      relation: "Tio",
      validUntil: inDays(-10),
      active: true,
    },
    {
      id: "a3",
      familyId: "f3",
      fullName: "Sônia Santos",
      phone: "(11) 97000-3333",
      relation: "Avó",
      validUntil: inDays(90),
      active: true,
    },
  ];

  const k = (
    id: string,
    n: number,
    fullName: string,
    nickname: string,
    age: number,
    classId: string,
    familyId: string,
    guardianIds: string[],
    authorizedIds: string[],
    extra: Partial<Child> = {},
  ): Child => ({
    id,
    code: `CR-${1000 + n}`,
    fullName,
    nickname,
    birthDate: yearsAgo(age, n % 7),
    classId,
    familyId,
    notes: "",
    health: "",
    status: "ativo",
    guardianIds,
    authorizedIds,
    ...extra,
  });
  const children: AppState["children"] = [
    k(
      "c1",
      1,
      "Lucas Almeida Silva",
      "Lucas",
      7,
      "t4",
      "f1",
      ["g1", "g2"],
      ["g1", "g2", "a1"],
      { notes: "Gosta de desenhar." },
    ),
    k(
      "c2",
      2,
      "Sofia Almeida Silva",
      "Sofi",
      4,
      "t3",
      "f1",
      ["g1", "g2"],
      ["g1", "g2", "a1"],
      { health: "Alergia a amendoim." },
    ),
    k(
      "c3",
      3,
      "Davi Almeida Silva",
      "Davi",
      2,
      "t2",
      "f1",
      ["g1", "g2"],
      ["g1", "g2"],
    ),
    k("c4", 4, "Isabela Oliveira", "Isa", 9, "t5", "f2", ["g3"], ["g3"]),
    k("c5", 5, "Miguel Oliveira", "Miguel", 5, "t3", "f2", ["g3"], ["g3"]),
    k(
      "c6",
      6,
      "Laura Santos",
      "Laura",
      1,
      "t1",
      "f3",
      ["g4", "g5"],
      ["g4", "g5", "a3"],
      { notes: "Usa chupeta para dormir." },
    ),
    k(
      "c7",
      7,
      "Pedro Santos",
      "Pedrinho",
      6,
      "t4",
      "f3",
      ["g4", "g5"],
      ["g4", "g5", "a3"],
    ),
    k("c8", 8, "Valentina Costa", "Val", 3, "t2", "f4", ["g6"], ["g6"], {
      health: "Asma leve — bombinha na mochila.",
    }),
    k("c9", 9, "Arthur Pereira", "Arthur", 10, "t5", "f5", ["g7"], ["g7"]),
    k("c10", 10, "Helena Pereira", "Helena", 8, "t4", "f5", ["g7"], []),
    k("c11", 11, "Gael Almeida", "Gael", 4, "t3", "f6", ["g8"], ["g8"]),
    k("c12", 12, "Alice Carvalho", "Alice", 2, "t2", "f7", ["g9"], ["g9"]),
    k("c13", 13, "Bernardo Carvalho", "Bê", 7, "t4", "f7", ["g9"], ["g9"]),
    k("c14", 14, "Manuela Martins", "Manu", 11, "t5", "f8", ["g10"], ["g10"]),
    k("c15", 15, "Theo Martins", "Theo", 0, "t1", "f8", ["g10"], ["g10"], {
      status: "pendente",
    }),
    k("c16", 16, "Cecília Costa", "Ceci", 6, "t4", "f4", ["g6"], ["g6"], {
      status: "inativo",
    }),
  ];

  const badges: AppState["badges"] = children.slice(0, 13).map((c, i) => ({
    id: `b${i + 1}`,
    childId: c.id,
    token:
      Math.random().toString(16).slice(2, 14) +
      Math.random().toString(16).slice(2, 14),
    status: "ativo",
    issuedAt: minutesAgo(60 * 24 * (30 + i)),
    expiresAt: inDays(335 - i),
  }));
  badges.push({
    id: "b99",
    childId: "c4",
    token: "a91f0c2be7d43e88f1c0",
    status: "perdido",
    issuedAt: minutesAgo(60 * 24 * 200),
    expiresAt: inDays(100),
  });

  const att = (id: string, childId: string, min: number, by: string) => ({
    id,
    childId,
    checkInAt: minutesAgo(min),
    droppedBy: by,
  });
  const attendance: AppState["attendance"] = [
    att("p1", "c1", 52, "Marcos Silva"),
    att("p2", "c2", 52, "Marcos Silva"),
    att("p3", "c3", 51, "Marcos Silva"),
    att("p4", "c6", 45, "Cláudia Santos"),
    att("p5", "c7", 45, "Cláudia Santos"),
    att("p6", "c8", 40, "Patrícia Costa"),
    att("p7", "c9", 38, "Ricardo Pereira"),
    att("p8", "c10", 38, "Ricardo Pereira"),
    att("p9", "c12", 30, "Thiago Carvalho"),
    {
      ...att("p10", "c4", 180, "Renata Oliveira"),
      checkOutAt: minutesAgo(20),
      pickedUpBy: "Renata Oliveira",
    },
  ];

  const calls: AppState["calls"] = [
    {
      id: "ch1",
      childId: "c6",
      classId: "t1",
      reason: "cuidados",
      requestedBy: "Ana Ribeiro",
      createdAt: minutesAgo(6),
      status: "pendente",
      history: [{ status: "pendente", at: minutesAgo(6) }],
    },
    {
      id: "ch2",
      childId: "c8",
      classId: "t2",
      reason: "desconforto",
      requestedBy: "Beatriz Lima",
      createdAt: minutesAgo(14),
      status: "visualizada",
      history: [
        { status: "pendente", at: minutesAgo(14) },
        { status: "enviada", at: minutesAgo(13) },
        { status: "visualizada", at: minutesAgo(10) },
      ],
    },
    {
      id: "ch3",
      childId: "c4",
      classId: "t5",
      reason: "atendimento",
      requestedBy: "Gabriel Nunes",
      createdAt: minutesAgo(95),
      status: "atendida",
      history: [
        { status: "pendente", at: minutesAgo(95) },
        { status: "atendida", at: minutesAgo(85) },
      ],
    },
  ];

  const notifications: AppState["notifications"] = [
    {
      id: "n1",
      category: "chamada",
      title: "Chamada solicitada — Laura Santos (Berçário)",
      recipient: "Paulo Santos, Cláudia Santos",
      createdAt: minutesAgo(6),
      delivery: "local",
      read: false,
    },
    {
      id: "n2",
      category: "chamada",
      title: "Chamada visualizada — Valentina Costa",
      recipient: "Patrícia Costa",
      createdAt: minutesAgo(10),
      delivery: "simulada",
      read: false,
    },
    {
      id: "n3",
      category: "alerta",
      title: "Primários atingiu 80% da capacidade",
      recipient: "Coordenação",
      createdAt: minutesAgo(25),
      delivery: "local",
      read: false,
    },
    {
      id: "n4",
      category: "presenca",
      title: "Saída registrada — Isabela Oliveira",
      recipient: "Renata Oliveira",
      createdAt: minutesAgo(20),
      delivery: "local",
      read: true,
    },
    {
      id: "n5",
      category: "comunicado",
      title: "Ensaio da cantata infantil no sábado às 15h",
      recipient: "Todas as famílias",
      createdAt: minutesAgo(60 * 26),
      delivery: "pendente",
      read: true,
    },
    {
      id: "n6",
      category: "administrativo",
      title: "2 cadastros aguardando revisão",
      recipient: "Secretaria",
      createdAt: minutesAgo(60 * 30),
      delivery: "local",
      read: true,
    },
  ];

  return {
    children,
    families,
    guardians,
    authorized,
    classes,
    badges,
    attendance,
    calls,
    notifications,
    audit: [],
    users: [],
    invites: [],
    joinCodes: [],
    familyLinks: [],
    settings: DEFAULT_SETTINGS,
  };
}

export const DEFAULT_SETTINGS: ChurchSettings = {
  name: "Igreja Comunidade Luz",
  units: ["Sede — Centro"],
  phone: "",
  address: "",
  idPrefix: "CR",
  badge: {
    widthMm: 90,
    heightMm: 55,
    showClass: true,
    showFamily: true,
    validityDays: 365,
  },
  rules: {
    requireAuthorizedPickup: true,
    maxChildrenPerTeacher: 8,
    alertCapacityPct: 80,
  },
  notify: {
    calls: true,
    presence: true,
    alerts: true,
    announcements: true,
    hideSensitiveOnLockScreen: true,
  },
  privacy: {
    legalBasis: "Consentimento específico dos responsáveis (LGPD, art. 14)",
    consentRequired: true,
    retentionMonths: 24,
    healthRestricted: true,
  },
};

export const WEEKLY = [
  { dia: "Seg", presencas: 0 },
  { dia: "Ter", presencas: 0 },
  { dia: "Qua", presencas: 34 },
  { dia: "Qui", presencas: 0 },
  { dia: "Sex", presencas: 12 },
  { dia: "Sáb", presencas: 21 },
  { dia: "Dom", presencas: 78 },
];
export const MONTHLY = [
  { mes: "Mai", media: 61 },
  { mes: "Jun", media: 66 },
  { mes: "Jul", media: 58 },
  { mes: "Ago", media: 70 },
  { mes: "Set", media: 74 },
  { mes: "Out", media: 78 },
];
