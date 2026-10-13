// Push (FCM) do Espaço Kids. Multi-igreja: tudo vive em tenants/{churchId}/...
//  - nova chamada de responsáveis  -> contas da família daquela igreja (app)
//  - novo pedido da família (estou chegando / vou buscar) -> equipe da recepção/coordenação/admin daquela igreja
// Os tokens FCM ficam no perfil global `users/{uid}.fcmTokens` (um aparelho
// serve para todas as igrejas da pessoa); o papel vem de
// `tenants/{churchId}/members/{uid}`.
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();
const REGION = "us-central1";

const REASONS = {
  atendimento: "Precisa de atendimento",
  desconforto: "Está com desconforto",
  cuidados: "Precisa de cuidados",
  outro: "Chamado da sala",
};

/** Perfis globais (`users/{uid}`) dos membros informados, para ler os tokens. */
async function userDocsOf(memberDocs) {
  const refs = memberDocs.map((m) => db.doc(`users/${m.id}`));
  if (!refs.length) return [];
  return (await db.getAll(...refs)).filter((d) => d.exists);
}

async function send(userDocs, payload) {
  const tokens = [];
  const owners = new Map();
  for (const d of userDocs) {
    for (const t of d.get("fcmTokens") || []) {
      tokens.push(t);
      owners.set(t, d.ref);
    }
  }
  if (!tokens.length) return;
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    notification: payload.notification,
    data: payload.data,
    android: { priority: "high", notification: { channelId: "avisos" } },
    apns: { payload: { aps: { sound: "default" } } },
  });
  // Remove tokens inválidos.
  const dead = [];
  res.responses.forEach((r, i) => {
    const code = r.error && r.error.code;
    if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") dead.push(tokens[i]);
  });
  await Promise.all(dead.map((t) => owners.get(t).update({ fcmTokens: FieldValue.arrayRemove(t) })));
}

exports.onCallCreated = onDocumentCreated({ document: "tenants/{churchId}/calls/{id}", region: REGION }, async (event) => {
  const call = event.data && event.data.data();
  if (!call || !call.familyId) return;
  const { churchId, id } = event.params;
  const church = db.doc(`tenants/${churchId}`);
  const [child, members] = await Promise.all([
    church.collection("children").doc(call.childId).get(),
    // Qualquer membro vinculado à família (inclui voluntário que é pai/mãe).
    church.collection("members").where("familyId", "==", call.familyId).get(),
  ]);
  const name = (child.exists && (child.get("nickname") || child.get("fullName"))) || "Seu filho";
  await send(await userDocsOf(members.docs.filter((m) => m.get("active") === true)), {
    notification: {
      title: `${name} precisa de você`,
      body: `${REASONS[call.reason] || REASONS.outro}${call.note ? ` — ${call.note}` : ""}`,
    },
    data: { type: "call", callId: id, churchId },
  });
});

exports.onCheckinRequestCreated = onDocumentCreated({ document: "tenants/{churchId}/checkinRequests/{id}", region: REGION }, async (event) => {
  const req = event.data && event.data.data();
  if (!req) return;
  const { churchId, id } = event.params;
  const church = db.doc(`tenants/${churchId}`);
  const [child, staff] = await Promise.all([
    church.collection("children").doc(req.childId).get(),
    church.collection("members").where("role", "in", ["admin", "coordenacao", "recepcao"]).get(),
  ]);
  const name = (child.exists && (child.get("nickname") || child.get("fullName"))) || "Criança";
  const who = req.requesterName || "Um familiar";
  await send(await userDocsOf(staff.docs.filter((m) => m.get("active") === true)), {
    notification: {
      title: req.kind === "saida" ? "Família vai buscar" : "Família está chegando",
      body: `${who} — ${name}`,
    },
    data: { type: "request", requestId: id, churchId },
  });
});
