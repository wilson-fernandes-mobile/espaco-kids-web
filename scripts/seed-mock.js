// Dados de exemplo (mock) do Espaço Kids na estrutura multi-igreja.
//
//   cd C:\Users\wilso\Documents\GIT_SISTEMA\EspacoKids
//   node scripts/seed-mock.js            # cria/atualiza os mocks
//   node scripts/seed-mock.js --limpar   # apaga os mocks (igrejas demo + contas de teste)
//
// Usa o Admin SDK (ignora as regras) no projeto espacokids-app. Credencial:
// `gcloud auth application-default login` (ou GOOGLE_APPLICATION_CREDENTIALS).
// É idempotente: rodar de novo regrava os mesmos documentos (ids fixos).
//
// Igrejas:  igreja-demo   "Igreja Esperança (demo)"  — a "sua" igreja
//           igreja-visita "Igreja Vida Nova (demo)"  — para testar visitante
// Contas (senha única abaixo):
//   admin@demo.espacokids.app      admin em igreja-demo e FAMÍLIA em igreja-visita
//   coord@demo.espacokids.app      coordenação
//   recepcao@demo.espacokids.app   recepção
//   prof@demo.espacokids.app       professora (turma Pequenos) E mãe do Theo (família Souza)
//   familia@demo.espacokids.app    responsável (família Silva) em igreja-demo
//   outra@demo.espacokids.app      responsável (família Costa) em igreja-demo
// Códigos: equipe KIDS-DEMO01 · família LK-SILVA1, LK-COSTA1, LK-SOUZA1 (igreja-demo), LK-VISIT1 (igreja-visita)
const { createRequire } = require("module");
const path = require("path");
const req = createRequire(path.join(__dirname, "..", "functions", "package.json"));
const { initializeApp } = req("firebase-admin/app");
const { getFirestore } = req("firebase-admin/firestore");
const { getAuth } = req("firebase-admin/auth");

const PROJECT = "espacokids-app";
const PASSWORD = "Kids@2026";
initializeApp({ projectId: PROJECT });
const db = getFirestore();
const auth = getAuth();

const iso = (d) => d.toISOString();
const ago = (min) => iso(new Date(Date.now() - min * 60000));
const birth = (years, months = 0) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setMonth(d.getMonth() - months);
  return iso(d);
};

const CHURCHES = {
  "igreja-demo": "Igreja Esperança (demo)",
  "igreja-visita": "Igreja Vida Nova (demo)",
};

const ACCOUNTS = {
  admin: { email: "admin@demo.espacokids.app", name: "Ana Administradora" },
  coord: { email: "coord@demo.espacokids.app", name: "Carlos Coordenador" },
  recepcao: { email: "recepcao@demo.espacokids.app", name: "Rita Recepção" },
  prof: { email: "prof@demo.espacokids.app", name: "Paula Professora" },
  familia: { email: "familia@demo.espacokids.app", name: "Marcos Silva" },
  outra: { email: "outra@demo.espacokids.app", name: "Júlia Costa" },
};

async function ensureUser(key) {
  const { email, name } = ACCOUNTS[key];
  try {
    const u = await auth.getUserByEmail(email);
    await auth.updateUser(u.uid, { password: PASSWORD, displayName: name });
    return u.uid;
  } catch (e) {
    if (e.code !== "auth/user-not-found") throw e;
    return (await auth.createUser({ email, password: PASSWORD, displayName: name, emailVerified: true })).uid;
  }
}

/** Vínculo da pessoa com a igreja: members + cópia em users/{uid}/memberships. */
async function link(uid, key, churchId, role, extra = {}) {
  const { email, name } = ACCOUNTS[key];
  const base = { name, email, role, classIds: [], active: true, createdAt: ago(60 * 24 * 10), ...extra };
  await db.doc(`tenants/${churchId}/members/${uid}`).set(base);
  await db.doc(`users/${uid}/memberships/${churchId}`).set({
    churchName: CHURCHES[churchId],
    role,
    familyId: extra.familyId || null,
    active: true,
    joinedAt: ago(60 * 24 * 10),
  });
  await db.doc(`users/${uid}`).set({ name, email, createdAt: ago(60 * 24 * 10) }, { merge: true });
}

async function seed() {
  const uids = {};
  for (const k of Object.keys(ACCOUNTS)) uids[k] = await ensureUser(k);

  // ---- igrejas
  for (const [id, name] of Object.entries(CHURCHES)) {
    await db.doc(`tenants/${id}`).set({ name, createdAt: ago(60 * 24 * 30), createdBy: uids.admin });
  }
  const T = (p) => db.doc(`tenants/igreja-demo/${p}`);

  // ---- turmas
  const classes = {
    bercario: { name: "Berçário", room: "Sala 1", capacity: 8, ageMin: 0, ageMax: 2, schedule: "Dom 9h e 18h", color: "chart-1" },
    pequenos: { name: "Pequenos", room: "Sala 2", capacity: 12, ageMin: 3, ageMax: 5, schedule: "Dom 9h e 18h", color: "chart-2" },
    juniores: { name: "Juniores", room: "Sala 3", capacity: 15, ageMin: 6, ageMax: 10, schedule: "Dom 9h e 18h", color: "chart-3" },
  };
  for (const [id, c] of Object.entries(classes)) {
    await T(`classes/${id}`).set({ ...c, teachers: [], active: true });
  }

  // ---- vínculos
  await link(uids.admin, "admin", "igreja-demo", "admin");
  await link(uids.coord, "coord", "igreja-demo", "coordenacao");
  await link(uids.recepcao, "recepcao", "igreja-demo", "recepcao");
  // Paula é professora E mãe (família Souza): alterna entre equipe e família no app.
  await link(uids.prof, "prof", "igreja-demo", "professor", { classIds: ["pequenos"], familyId: "souza", linkCode: "LK-SOUZA1", personId: "g-souza-1", personKind: "guardian" });
  await link(uids.familia, "familia", "igreja-demo", "responsavel", { familyId: "silva", personId: "g-silva-1", personKind: "guardian", linkCode: "LK-SILVA1" });
  await link(uids.outra, "outra", "igreja-demo", "responsavel", { familyId: "costa", linkCode: "LK-COSTA1" });

  // ---- famílias, responsáveis, autorizados
  const families = {
    silva: { code: "FM-201", name: "Família Silva", phone: "(11) 91111-0001", email: ACCOUNTS.familia.email },
    costa: { code: "FM-202", name: "Família Costa", phone: "(11) 92222-0002", email: ACCOUNTS.outra.email },
    lima: { code: "FM-203", name: "Família Lima", phone: "(11) 93333-0003" },
    souza: { code: "FM-204", name: "Família Souza", phone: "(11) 94444-0004", email: ACCOUNTS.prof.email },
  };
  for (const [id, f] of Object.entries(families)) await T(`families/${id}`).set(f);

  const guardians = {
    "g-silva-1": { familyId: "silva", fullName: "Marcos Silva", phone: "(11) 91111-0001", relation: "Pai", primary: true },
    "g-silva-2": { familyId: "silva", fullName: "Renata Silva", phone: "(11) 91111-0009", relation: "Mãe", primary: false },
    "g-costa-1": { familyId: "costa", fullName: "Júlia Costa", phone: "(11) 92222-0002", relation: "Mãe", primary: true },
    "g-lima-1": { familyId: "lima", fullName: "Tiago Lima", phone: "(11) 93333-0003", relation: "Pai", primary: true },
    "g-souza-1": { familyId: "souza", fullName: "Paula Professora", phone: "(11) 94444-0004", relation: "Mãe", primary: true },
  };
  for (const [id, g] of Object.entries(guardians)) {
    await T(`guardians/${id}`).set({ ...g, whatsapp: true, contactPref: "whatsapp", active: true });
  }
  const authorized = {
    "a-silva-1": { familyId: "silva", fullName: "Dona Helena Silva", phone: "(11) 91111-0100", relation: "Avó" },
    "a-costa-1": { familyId: "costa", fullName: "Pedro Costa", phone: "(11) 92222-0200", relation: "Tio" },
  };
  for (const [id, a] of Object.entries(authorized)) {
    await T(`authorized/${id}`).set({ ...a, whatsapp: false, active: true });
  }

  // ---- crianças + crachás + saúde
  const kids = {
    "c-miguel": { code: "CR-1001", fullName: "Miguel Silva", nickname: "Miguel", birthDate: birth(4), classId: "pequenos", familyId: "silva", guardianIds: ["g-silva-1", "g-silva-2"], authorizedIds: ["a-silva-1"], notes: "Gosta de dinossauros.", health: "Alergia a amendoim." },
    "c-sofia": { code: "CR-1002", fullName: "Sofia Silva", nickname: "Sofi", birthDate: birth(1, 4), classId: "bercario", familyId: "silva", guardianIds: ["g-silva-1", "g-silva-2"], authorizedIds: ["a-silva-1"], notes: "", health: "" },
    "c-davi": { code: "CR-1003", fullName: "Davi Costa", nickname: "Davi", birthDate: birth(7), classId: "juniores", familyId: "costa", guardianIds: ["g-costa-1"], authorizedIds: ["a-costa-1"], notes: "Tímido no início.", health: "Asma leve (bombinha na mochila)." },
    "c-laura": { code: "CR-1004", fullName: "Laura Costa", nickname: "Lalá", birthDate: birth(3, 6), classId: "pequenos", familyId: "costa", guardianIds: ["g-costa-1"], authorizedIds: ["a-costa-1"], notes: "", health: "" },
    "c-enzo": { code: "CR-1005", fullName: "Enzo Lima", nickname: "Enzo", birthDate: birth(5), classId: "pequenos", familyId: "lima", guardianIds: ["g-lima-1"], authorizedIds: [], notes: "", health: "" },
    "c-theo": { code: "CR-1007", fullName: "Theo Souza", nickname: "Theo", birthDate: birth(2, 3), classId: "bercario", familyId: "souza", guardianIds: ["g-souza-1"], authorizedIds: [], notes: "Filho da professora Paula.", health: "" },
    "c-bia": { code: "CR-1006", fullName: "Beatriz Lima", nickname: "Bia", birthDate: birth(9), classId: "juniores", familyId: "lima", guardianIds: ["g-lima-1"], authorizedIds: [], notes: "Líder nas brincadeiras.", health: "" },
  };
  for (const [id, { health, ...c }] of Object.entries(kids)) {
    await T(`children/${id}`).set({ ...c, status: "ativo" });
    if (health) await T(`health/${id}`).set({ text: health });
    await T(`badges/b-${id}`).set({ childId: id, token: `MOCK${id.slice(2).toUpperCase()}${c.code.slice(3)}`, status: "ativo", issuedAt: ago(60 * 24 * 7), expiresAt: iso(new Date(Date.now() + 60 * 60000 * 24 * 90)) });
  }
  await T("meta/counters").set({ child: 1007, family: 204 });

  // ---- hoje: Miguel e Davi na sala, uma chamada aberta, um pedido da família
  for (const [id, att, min] of [["c-miguel", "att-miguel", 50], ["c-davi", "att-davi", 35]]) {
    await T(`attendance/${att}`).set({ childId: id, checkInAt: ago(min), droppedBy: id === "c-miguel" ? "Marcos Silva" : "Júlia Costa", by: uids.recepcao });
    await T(`presence/${id}`).set({ attendanceId: att, at: ago(min) });
  }
  await T("calls/call-miguel").set({ childId: "c-miguel", classId: "pequenos", familyId: "silva", reason: "desconforto", note: "Choramingando, quer o pai.", requestedBy: ACCOUNTS.prof.name, createdAt: ago(5), status: "pendente", history: [{ status: "pendente", at: ago(5) }] });
  await T("checkinRequests/req-davi").set({ childId: "c-davi", familyId: "costa", kind: "saida", status: "pendente", requesterUid: uids.outra, requesterName: ACCOUNTS.outra.name, personId: null, personKind: null, createdAt: ago(2) });
  await T("audit/au-1").set({ at: ago(50), uid: uids.recepcao, user: ACCOUNTS.recepcao.name, action: "Check-in de Miguel Silva (entregue por Marcos Silva)" });

  // ---- códigos (equipe + família) na igreja e no mapa global
  const code = async (church, c, kind, extra) => {
    if (kind === "invite") await db.doc(`tenants/${church}/invites/${c}`).set({ active: true, createdAt: ago(60 * 24), createdBy: uids.admin });
    else await db.doc(`tenants/${church}/familyLinks/${c}`).set({ familyId: extra, active: true, createdAt: ago(60 * 24), createdBy: uids.admin });
    await db.doc(`codes/${c}`).set({ churchId: church, churchName: CHURCHES[church], kind });
  };
  await code("igreja-demo", "KIDS-DEMO01", "invite");
  await code("igreja-demo", "LK-SILVA1", "family", "silva");
  await code("igreja-demo", "LK-COSTA1", "family", "costa");
  await code("igreja-demo", "LK-SOUZA1", "family", "souza");

  // ---- igreja visitada: o admin da igreja-demo é FAMÍLIA aqui
  const V = (p) => db.doc(`tenants/igreja-visita/${p}`);
  await V("classes/pequenos").set({ ...classes.pequenos, teachers: [], active: true });
  await V("families/visitante").set({ code: "FM-201", name: "Família Administradora (visitante)", phone: "(11) 90000-0000", email: ACCOUNTS.admin.email });
  await V("guardians/g-visit-1").set({ familyId: "visitante", fullName: ACCOUNTS.admin.name, phone: "(11) 90000-0000", relation: "Mãe", primary: true, whatsapp: true, contactPref: "app", active: true });
  await V("children/c-visit-1").set({ code: "CR-1001", fullName: "Pedro Administrador", nickname: "Pedrinho", birthDate: birth(4), classId: "pequenos", familyId: "visitante", status: "ativo", guardianIds: ["g-visit-1"], authorizedIds: [], notes: "Visitando a igreja hoje." });
  await V("badges/b-visit-1").set({ childId: "c-visit-1", token: "MOCKVISIT1", status: "ativo", issuedAt: ago(60), expiresAt: iso(new Date(Date.now() + 60 * 60000 * 24 * 30)) });
  await V("meta/counters").set({ child: 1001, family: 201 });
  await db.doc("tenants/igreja-visita/members/" + uids.admin).set({
    name: ACCOUNTS.admin.name, email: ACCOUNTS.admin.email, role: "responsavel", familyId: "visitante",
    linkCode: "LK-VISIT1", classIds: [], active: true, createdAt: ago(30), personId: "g-visit-1", personKind: "guardian",
  });
  await db.doc(`users/${uids.admin}/memberships/igreja-visita`).set({ churchName: CHURCHES["igreja-visita"], role: "responsavel", familyId: "visitante", active: true, joinedAt: ago(30) });
  await db.doc("tenants/igreja-visita/invites/KIDS-VISIT1").set({ active: true, createdAt: ago(60), createdBy: uids.admin });
  await db.doc("codes/KIDS-VISIT1").set({ churchId: "igreja-visita", churchName: CHURCHES["igreja-visita"], kind: "invite" });
  await V("familyLinks/LK-VISIT1").set({ familyId: "visitante", active: true, createdAt: ago(60), createdBy: uids.admin });
  await db.doc("codes/LK-VISIT1").set({ churchId: "igreja-visita", churchName: CHURCHES["igreja-visita"], kind: "family" });

  console.log("\nMocks criados em", PROJECT);
  console.log("Senha de todas as contas:", PASSWORD);
  for (const a of Object.values(ACCOUNTS)) console.log(" ", a.email.padEnd(32), a.name);
  console.log("Códigos: equipe KIDS-DEMO01 · família LK-SILVA1 / LK-COSTA1 · visita: KIDS-VISIT1 / LK-VISIT1");
}

async function clean() {
  for (const id of Object.keys(CHURCHES)) await db.recursiveDelete(db.doc(`tenants/${id}`));
  for (const a of Object.values(ACCOUNTS)) {
    try {
      const u = await auth.getUserByEmail(a.email);
      await db.recursiveDelete(db.doc(`users/${u.uid}`));
      await auth.deleteUser(u.uid);
    } catch (e) {
      if (e.code !== "auth/user-not-found") throw e;
    }
  }
  for (const c of ["KIDS-DEMO01", "LK-SILVA1", "LK-COSTA1", "LK-SOUZA1", "KIDS-VISIT1", "LK-VISIT1"]) await db.doc(`codes/${c}`).delete();
  console.log("Mocks removidos.");
}

(process.argv.includes("--limpar") ? clean() : seed()).catch((e) => {
  console.error("Falhou:", e.message);
  process.exit(1);
});
