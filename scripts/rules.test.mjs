// Testes das Security Rules multi-igreja (emulador do Firestore, porta 8089).
// Requer JDK 21+ e:  npm i -D @firebase/rules-unit-testing
// Rodar (na raiz do projeto):
//   firebase emulators:exec --only firestore --project demo-rules --config scripts/firebase.rules-test.json "node scripts/rules.test.mjs"
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import fs from "node:fs";

const RULES = new URL("../firestore.rules", import.meta.url);
const env = await initializeTestEnvironment({
  projectId: "demo-rules",
  firestore: { rules: fs.readFileSync(RULES, "utf8"), host: "127.0.0.1", port: 8089 },
});

let pass = 0, fail = 0;
const t = async (name, fn) => {
  try { await fn(); pass++; console.log("  ok  ", name); }
  catch (e) { fail++; console.log("  FAIL", name, "\n      ", String(e.message).split("\n")[0]); }
};
const as = (uid, email) => env.authenticatedContext(uid, { email: email ?? `${uid}@x.com` }).firestore();
const now = new Date().toISOString();

// ---------- semente (sem regras) ----------
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  const A = "tenants/igrejaA", B = "tenants/igrejaB";
  await setDoc(doc(db, A), { name: "A", createdBy: "adminA" });
  await setDoc(doc(db, B), { name: "B", createdBy: "adminB" });
  const member = (path, role, extra = {}) => setDoc(doc(db, path), { name: path, email: "x@x.com", role, classIds: [], active: true, createdAt: now, ...extra });
  await member(`${A}/members/adminA`, "admin");
  await member(`${A}/members/recepA`, "recepcao");
  await member(`${A}/members/profA`, "professor");
  await member(`${A}/members/famA`, "responsavel", { familyId: "f1" });
  await member(`${A}/members/fam2A`, "responsavel", { familyId: "f2" });
  await member(`${B}/members/adminB`, "admin");
  // adminA é FAMÍLIA na igreja B
  await member(`${B}/members/adminA`, "responsavel", { familyId: "fv" });
  for (const [T, kids] of [[A, [["k1", "f1"], ["k2", "f2"]]], [B, [["kv", "fv"], ["kb", "fb"]]]]) {
    for (const [id, fam] of kids) await setDoc(doc(db, `${T}/children/${id}`), { fullName: id, familyId: fam, status: "ativo" });
  }
  await setDoc(doc(db, `${A}/invites/KIDS-AAAA01`), { active: true });
  await setDoc(doc(db, `${A}/familyLinks/LK-AAAA01`), { familyId: "f1", active: true });
  await setDoc(doc(db, `${A}/familyLinks/LK-OFF001`), { familyId: "f1", active: false });
  await setDoc(doc(db, "codes/KIDS-AAAA01"), { churchId: "igrejaA", churchName: "A", kind: "invite" });
  await setDoc(doc(db, "codes/LK-AAAA01"), { churchId: "igrejaA", churchName: "A", kind: "family" });
  await setDoc(doc(db, `${A}/calls/c1`), { childId: "k1", familyId: "f1", status: "pendente", history: [] });
  await setDoc(doc(db, `${A}/presence/k1`), { attendanceId: "x", at: now });
});

console.log("\nCriar igreja");
await t("usuário novo cria igreja (tenant + admin + cópia) no mesmo batch", async () => {
  const db = as("novo");
  const b = writeBatch(db);
  b.set(doc(db, "tenants/nova"), { name: "Nova", createdBy: "novo", createdAt: now });
  b.set(doc(db, "tenants/nova/members/novo"), { name: "N", email: "novo@x.com", role: "admin", classIds: [], active: true, createdAt: now });
  b.set(doc(db, "users/novo/memberships/nova"), { churchName: "Nova", role: "admin", familyId: null, active: true, joinedAt: now });
  await assertSucceeds(b.commit());
});
await t("NÃO vira admin de igreja que já existe", async () => {
  await assertFails(setDoc(doc(as("intruso"), "tenants/igrejaA/members/intruso"), { name: "I", email: "intruso@x.com", role: "admin", classIds: [], active: true, createdAt: now }));
});
await t("NÃO cria igreja em nome de outro (createdBy ≠ uid)", async () => {
  await assertFails(setDoc(doc(as("x1"), "tenants/fake"), { name: "F", createdBy: "outro" }));
});

console.log("\nIsolamento entre igrejas");
await t("recepção de A lê crianças de A", async () => { await assertSucceeds(getDocs(collection(as("recepA"), "tenants/igrejaA/children"))); });
await t("recepção de A NÃO lê crianças de B", async () => { await assertFails(getDocs(collection(as("recepA"), "tenants/igrejaB/children"))); });
await t("estranho não lê nada", async () => { await assertFails(getDoc(doc(as("estranho"), "tenants/igrejaA/children/k1"))); });
await t("ninguém lista igrejas", async () => { await assertFails(getDocs(collection(as("adminA"), "tenants"))); });

console.log("\nPapéis dentro da igreja");
await t("recepção cadastra criança", async () => { await assertSucceeds(setDoc(doc(as("recepA"), "tenants/igrejaA/children/novo1"), { fullName: "N", familyId: "f1" })); });
await t("professor NÃO cadastra criança", async () => { await assertFails(setDoc(doc(as("profA"), "tenants/igrejaA/children/novo2"), { fullName: "N", familyId: "f1" })); });
await t("professor lê crianças", async () => { await assertSucceeds(getDoc(doc(as("profA"), "tenants/igrejaA/children/k1"))); });
await t("só admin lista membros", async () => { await assertSucceeds(getDocs(collection(as("adminA"), "tenants/igrejaA/members"))); await assertFails(getDocs(collection(as("recepA"), "tenants/igrejaA/members"))); });
await t("professor abre chamada", async () => { await assertSucceeds(setDoc(doc(as("profA"), "tenants/igrejaA/calls/c2"), { childId: "k1", familyId: "f1", status: "pendente", history: [] })); });

console.log("\nFamília");
await t("família lê a própria criança", async () => { await assertSucceeds(getDoc(doc(as("famA"), "tenants/igrejaA/children/k1"))); });
await t("família NÃO lê criança de outra família", async () => { await assertFails(getDoc(doc(as("famA"), "tenants/igrejaA/children/k2"))); });
await t("família NÃO lista todas as crianças", async () => { await assertFails(getDocs(collection(as("famA"), "tenants/igrejaA/children"))); });
await t("família lê presença do próprio filho", async () => { await assertSucceeds(getDoc(doc(as("famA"), "tenants/igrejaA/presence/k1"))); });
await t("família marca 'estou indo' na chamada", async () => { await assertSucceeds(updateDoc(doc(as("famA"), "tenants/igrejaA/calls/c1"), { status: "a_caminho", history: [{ status: "a_caminho", at: now }] })); });
await t("família NÃO altera outros campos da chamada", async () => { await assertFails(updateDoc(doc(as("famA"), "tenants/igrejaA/calls/c1"), { note: "x" })); });
await t("família cria pedido 'vou buscar'", async () => {
  await assertSucceeds(setDoc(doc(as("famA"), "tenants/igrejaA/checkinRequests/r1"), { childId: "k1", familyId: "f1", kind: "saida", status: "pendente", requesterUid: "famA" }));
});
await t("família NÃO pede por filho de outra família", async () => {
  await assertFails(setDoc(doc(as("famA"), "tenants/igrejaA/checkinRequests/r2"), { childId: "k2", familyId: "f1", kind: "saida", status: "pendente", requesterUid: "famA" }));
});
await t("família NÃO lê saúde", async () => { await assertFails(getDoc(doc(as("famA"), "tenants/igrejaA/health/k1"))); });

console.log("\nEntrar por código");
const staffMember = (extra = {}) => ({ name: "Novo", email: "prof2@x.com", role: "professor", classIds: [], active: true, createdAt: now, inviteCode: "KIDS-AAAA01", ...extra });
await t("equipe entra com convite válido (professor)", async () => {
  const db = as("prof2", "prof2@x.com");
  const b = writeBatch(db);
  b.set(doc(db, "tenants/igrejaA/members/prof2"), staffMember());
  b.set(doc(db, "users/prof2/memberships/igrejaA"), { churchName: "A", role: "professor", familyId: null, active: true, joinedAt: now });
  await assertSucceeds(b.commit());
});
await t("convite NÃO dá papel de admin", async () => { await assertFails(setDoc(doc(as("prof3", "prof3@x.com"), "tenants/igrejaA/members/prof3"), staffMember({ email: "prof3@x.com", role: "admin" }))); });
await t("convite inexistente é recusado", async () => { await assertFails(setDoc(doc(as("prof4", "prof4@x.com"), "tenants/igrejaA/members/prof4"), staffMember({ email: "prof4@x.com", inviteCode: "KIDS-NOPE00" }))); });
await t("convite da igreja A NÃO vale na igreja B", async () => { await assertFails(setDoc(doc(as("prof5", "prof5@x.com"), "tenants/igrejaB/members/prof5"), staffMember({ email: "prof5@x.com" }))); });
await t("e-mail diferente do da conta é recusado", async () => { await assertFails(setDoc(doc(as("prof6", "prof6@x.com"), "tenants/igrejaA/members/prof6"), staffMember({ email: "outro@x.com" }))); });
const famMember = (extra = {}) => ({ name: "Pai", email: "pai@x.com", role: "responsavel", familyId: "f1", linkCode: "LK-AAAA01", classIds: [], active: true, createdAt: now, ...extra });
await t("família entra com vínculo válido", async () => { await assertSucceeds(setDoc(doc(as("pai", "pai@x.com"), "tenants/igrejaA/members/pai"), famMember())); });
await t("família NÃO entra em outra família (familyId errado)", async () => { await assertFails(setDoc(doc(as("pai2", "pai2@x.com"), "tenants/igrejaA/members/pai2"), famMember({ email: "pai2@x.com", familyId: "f2" }))); });
await t("vínculo desativado é recusado", async () => { await assertFails(setDoc(doc(as("pai3", "pai3@x.com"), "tenants/igrejaA/members/pai3"), famMember({ email: "pai3@x.com", linkCode: "LK-OFF001" }))); });
await t("família não vira equipe (role responsavel com campos de equipe)", async () => { await assertFails(setDoc(doc(as("pai4", "pai4@x.com"), "tenants/igrejaA/members/pai4"), famMember({ email: "pai4@x.com", role: "recepcao" }))); });

console.log("\nAdmin visitante (admin em A, família em B)");
await t("adminA cadastra criança em A", async () => { await assertSucceeds(setDoc(doc(as("adminA"), "tenants/igrejaA/children/novo3"), { fullName: "N", familyId: "f1" })); });
await t("adminA NÃO cadastra criança em B (lá é família)", async () => { await assertFails(setDoc(doc(as("adminA"), "tenants/igrejaB/children/novo4"), { fullName: "N", familyId: "fv" })); });
await t("adminA lê o próprio filho em B", async () => { await assertSucceeds(getDoc(doc(as("adminA"), "tenants/igrejaB/children/kv"))); });
await t("adminA NÃO lê filho de outra família em B", async () => { await assertFails(getDoc(doc(as("adminA"), "tenants/igrejaB/children/kb"))); });
await t("adminA NÃO lista membros de B", async () => { await assertFails(getDocs(collection(as("adminA"), "tenants/igrejaB/members"))); });

console.log("\nCódigos globais");
await t("qualquer logado lê um código por id", async () => { await assertSucceeds(getDoc(doc(as("qualquer"), "codes/KIDS-AAAA01"))); });
await t("ninguém lista códigos", async () => { await assertFails(getDocs(collection(as("adminA"), "codes"))); });
await t("admin cria código de convite da própria igreja", async () => { await assertSucceeds(setDoc(doc(as("adminA"), "codes/KIDS-NEW001"), { churchId: "igrejaA", churchName: "A", kind: "invite" })); });
await t("recepção cria código de família", async () => { await assertSucceeds(setDoc(doc(as("recepA"), "codes/LK-NEW001"), { churchId: "igrejaA", churchName: "A", kind: "family" })); });
await t("recepção NÃO cria convite de equipe", async () => { await assertFails(setDoc(doc(as("recepA"), "codes/KIDS-NEW002"), { churchId: "igrejaA", churchName: "A", kind: "invite" })); });
await t("admin de A NÃO cria código apontando para B", async () => { await assertFails(setDoc(doc(as("adminA"), "codes/KIDS-HACK01"), { churchId: "igrejaB", churchName: "B", kind: "invite" })); });
await t("admin apaga código da própria igreja", async () => { await assertSucceeds(deleteDoc(doc(as("adminA"), "codes/KIDS-AAAA01"))); });
await t("admin de B NÃO apaga código da igreja A", async () => { await assertFails(deleteDoc(doc(as("adminB"), "codes/LK-AAAA01"))); });

console.log("\nPerfil global e vínculos");
await t("usuário cria o próprio perfil", async () => { await assertSucceeds(setDoc(doc(as("pf", "pf@x.com"), "users/pf"), { name: "P", email: "pf@x.com", createdAt: now })); });
await t("NÃO cria perfil de outro", async () => { await assertFails(setDoc(doc(as("pf2", "pf2@x.com"), "users/alguem"), { name: "P", email: "pf2@x.com", createdAt: now })); });
await t("NÃO lê perfil de outro", async () => { await assertFails(getDoc(doc(as("pf2"), "users/pf"))); });
await t("registra token de push", async () => { await assertSucceeds(updateDoc(doc(as("pf", "pf@x.com"), "users/pf"), { fcmTokens: ["t1"] })); });
await t("lê as próprias igrejas", async () => { await assertSucceeds(getDocs(collection(as("novo"), "users/novo/memberships"))); });
await t("NÃO lê igrejas de outro", async () => { await assertFails(getDocs(collection(as("pf2"), "users/novo/memberships"))); });
await t("admin atualiza a cópia do vínculo de um membro", async () => { await assertSucceeds(setDoc(doc(as("adminA"), "users/profA/memberships/igrejaA"), { churchName: "A", role: "professor", active: false })); });
await t("família define quem é (personId/personKind)", async () => { await assertSucceeds(updateDoc(doc(as("famA"), "tenants/igrejaA/members/famA"), { personId: "g1", personKind: "guardian" })); });
await t("família NÃO muda o próprio papel", async () => { await assertFails(updateDoc(doc(as("famA"), "tenants/igrejaA/members/famA"), { role: "admin" })); });
await t("sair da própria igreja", async () => { await assertSucceeds(deleteDoc(doc(as("fam2A"), "tenants/igrejaA/members/fam2A"))); });

console.log("\nVoluntário que também é pai/mãe");
await t("professor vincula a PRÓPRIA família com código válido", async () => {
  await assertSucceeds(updateDoc(doc(as("profA"), "tenants/igrejaA/members/profA"), { familyId: "f1", linkCode: "LK-AAAA01" }));
});
await t("depois de vincular, lê o filho da família", async () => { await assertSucceeds(getDoc(doc(as("profA"), "tenants/igrejaA/children/k1"))); });
await t("e continua lendo todas as crianças como equipe", async () => { await assertSucceeds(getDocs(collection(as("profA"), "tenants/igrejaA/children"))); });
await t("e continua SEM cadastrar criança (papel de professor)", async () => { await assertFails(setDoc(doc(as("profA"), "tenants/igrejaA/children/x9"), { fullName: "X", familyId: "f1" })); });
await t("professor pede 'vou buscar' pelo próprio filho", async () => {
  await assertSucceeds(setDoc(doc(as("profA"), "tenants/igrejaA/checkinRequests/rp1"), { childId: "k1", familyId: "f1", kind: "saida", status: "pendente", requesterUid: "profA" }));
});
await t("professor NÃO pede por filho de outra família", async () => {
  await assertFails(setDoc(doc(as("profA"), "tenants/igrejaA/checkinRequests/rp2"), { childId: "k2", familyId: "f1", kind: "saida", status: "pendente", requesterUid: "profA" }));
});
await t("NÃO vincula com código desativado", async () => {
  await assertFails(updateDoc(doc(as("recepA"), "tenants/igrejaA/members/recepA"), { familyId: "f1", linkCode: "LK-OFF001" }));
});
await t("NÃO vincula a família errada com código válido", async () => {
  await assertFails(updateDoc(doc(as("recepA"), "tenants/igrejaA/members/recepA"), { familyId: "f2", linkCode: "LK-AAAA01" }));
});
await t("NÃO troca de família depois de vinculada", async () => {
  await assertFails(updateDoc(doc(as("profA"), "tenants/igrejaA/members/profA"), { familyId: "f2", linkCode: "LK-AAAA01" }));
});
await t("NÃO muda o papel junto com o vínculo", async () => {
  await assertFails(updateDoc(doc(as("recepA"), "tenants/igrejaA/members/recepA"), { familyId: "f1", linkCode: "LK-AAAA01", role: "admin" }));
});
console.log("\nFamília que vira voluntário");
await t("família vira professor com convite válido (mantém a família)", async () => {
  await assertSucceeds(updateDoc(doc(as("famA"), "tenants/igrejaA/members/famA"), { role: "professor", inviteCode: "KIDS-AAAA01" }));
});
await t("depois disso lê todas as crianças (equipe) e a própria família", async () => {
  await assertSucceeds(getDocs(collection(as("famA"), "tenants/igrejaA/children")));
});
await t("família NÃO vira admin pelo convite", async () => {
  await assertFails(updateDoc(doc(as("fam2A"), "tenants/igrejaA/members/fam2A"), { role: "admin", inviteCode: "KIDS-AAAA01" }));
});
await t("família NÃO vira coordenação pelo convite", async () => {
  await assertFails(updateDoc(doc(as("fam2A"), "tenants/igrejaA/members/fam2A"), { role: "coordenacao", inviteCode: "KIDS-AAAA01" }));
});
await t("convite inexistente é recusado", async () => {
  await assertFails(updateDoc(doc(as("fam2A"), "tenants/igrejaA/members/fam2A"), { role: "professor", inviteCode: "KIDS-NOPE00" }));
});
await t("convite de OUTRA igreja é recusado", async () => {
  await assertFails(updateDoc(doc(as("adminA"), "tenants/igrejaB/members/adminA"), { role: "professor", inviteCode: "KIDS-AAAA01" }));
});
console.log(`\n${pass} passaram, ${fail} falharam`);
await env.cleanup();
process.exit(fail ? 1 : 0);
