// Push (FCM) do Espaço Kids. Multi-igreja: tudo vive em tenants/{churchId}/...
//  - nova chamada de responsáveis  -> contas da família daquela igreja (app)
//  - novo pedido da família (estou chegando / vou buscar) -> equipe da recepção/coordenação/admin daquela igreja
// Os tokens FCM ficam no perfil global `users/{uid}.fcmTokens` (um aparelho
// serve para todas as igrejas da pessoa); o papel vem de
// `tenants/{churchId}/members/{uid}`.
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { getAuth } = require("firebase-admin/auth");

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

/** Remove tokens inválidos dos perfis. */
async function pruneDead(res, tokens, owners) {
  const dead = [];
  res.responses.forEach((r, i) => {
    const code = r.error && r.error.code;
    if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") dead.push(tokens[i]);
  });
  await Promise.all(dead.map((t) => owners.get(t).update({ fcmTokens: FieldValue.arrayRemove(t), alarmTokens: FieldValue.arrayRemove(t) })));
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
  await pruneDead(res, tokens, owners);
}

/**
 * Alarme da chamada dos responsáveis. Aparelhos com o app novo (`alarmTokens`)
 * recebem só `data` no Android: o app toca sirene e vibra até a pessoa tocar.
 * No iPhone o aviso vai pelo APNs (time-sensitive). Os demais aparelhos
 * recebem o aviso comum. Com `stop`, só manda o app parar o alarme.
 */
async function sendCallAlarm(userDocs, { title, body, data }, stop = false) {
  const alarm = [];
  const plain = [];
  const owners = new Map();
  for (const d of userDocs) {
    const armed = new Set(d.get("alarmTokens") || []);
    for (const t of d.get("fcmTokens") || []) {
      owners.set(t, d.ref);
      (armed.has(t) ? alarm : plain).push(t);
    }
  }
  const m = getMessaging();
  const jobs = [];
  if (alarm.length) {
    const msg = stop
      ? { tokens: alarm, data: { ...data, type: "call-stop" }, android: { priority: "high" } }
      : {
          tokens: alarm,
          data: { ...data, title, body },
          android: { priority: "high", ttl: 5 * 60 * 1000 },
          apns: {
            headers: { "apns-priority": "10" },
            payload: { aps: { alert: { title, body }, sound: "default", "interruption-level": "time-sensitive" } },
          },
        };
    jobs.push(m.sendEachForMulticast(msg).then((res) => pruneDead(res, alarm, owners)));
  }
  if (plain.length && !stop) {
    jobs.push(
      m
        .sendEachForMulticast({
          tokens: plain,
          notification: { title, body },
          data,
          android: { priority: "high", notification: { channelId: "avisos" } },
          apns: { payload: { aps: { sound: "default" } } },
        })
        .then((res) => pruneDead(res, plain, owners)),
    );
  }
  await Promise.all(jobs);
}

const ALARM_EVERY_MS = 30 * 1000;
const ALARM_TRIES = 6; // ~3 min de insistência
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fica insistindo (reenvia a cada 30 s) enquanto ninguém da família tocar em
// "Estou indo"; ao confirmar, manda os outros aparelhos pararem o alarme.
exports.onCallCreated = onDocumentCreated({ document: "tenants/{churchId}/calls/{id}", region: REGION, timeoutSeconds: 300 }, async (event) => {
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
  const users = await userDocsOf(members.docs.filter((m) => m.get("active") === true));
  const msg = {
    title: `${name} precisa de você`,
    body: `${REASONS[call.reason] || REASONS.outro}${call.note ? ` — ${call.note}` : ""}`,
    data: { type: "call", callId: id, churchId },
  };
  for (let i = 0; i < ALARM_TRIES; i++) {
    await sendCallAlarm(users, msg);
    await sleep(ALARM_EVERY_MS);
    if (event.data.ref && (await event.data.ref.get()).get("status") !== "pendente") break;
  }
  await sendCallAlarm(users, msg, true);
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
  // Alem da recepcao/coordenacao/admin, avisa quem fez check-in hoje na sala da crianca.
  const roomSnap = child.exists && child.get("classId")
    ? await church.collection("roomStaff").where("classId", "==", child.get("classId")).get()
    : { docs: [] };
  const since = Date.now() - 18 * 60 * 60 * 1000; // check-in "de hoje" sem depender do fuso do servidor
  const inRoom = roomSnap.docs.filter((d) => new Date(d.get("since")).getTime() >= since);
  const targets = new Map();
  for (const m of staff.docs.filter((m) => m.get("active") === true)) targets.set(m.id, m);
  for (const d of inRoom) targets.set(d.id, d);
  await send(await userDocsOf([...targets.values()]), {
    notification: {
      title: req.kind === "saida" ? "Família vai buscar" : "Família está chegando",
      body: `${who} — ${name}`,
    },
    data: { type: "request", requestId: id, churchId },
  });
});

// A familia tocou em "Estou indo" (status -> visualizada): avisa quem fez a chamada.
// Chamadas antigas sem `requestedById` avisam a recepcao/coordenacao/admin.
exports.onCallAcknowledged = onDocumentUpdated({ document: "tenants/{churchId}/calls/{id}", region: REGION }, async (event) => {
  const before = event.data && event.data.before.data();
  const after = event.data && event.data.after.data();
  if (!before || !after) return;
  if (before.status === after.status || after.status !== "visualizada") return;
  const { churchId, id } = event.params;
  const church = db.doc(`tenants/${churchId}`);
  const child = await church.collection("children").doc(after.childId).get();
  const name = (child.exists && (child.get("nickname") || child.get("fullName"))) || "A crianca";
  let targets;
  if (after.requestedById) {
    targets = await userDocsOf([{ id: after.requestedById }]);
  } else {
    const staff = await church.collection("members").where("role", "in", ["admin", "coordenacao", "recepcao"]).get();
    targets = await userDocsOf(staff.docs.filter((m) => m.get("active") === true));
  }
  await send(targets, {
    notification: {
      title: "Familia a caminho",
      body: `O responsavel de ${name} esta indo`,
    },
    data: { type: "call-ack", callId: id, churchId },
  });
});

// ---------------------------------------------------------------------------
// Levar a familia de uma igreja para outra (copia, sem vinculo entre elas).
// ---------------------------------------------------------------------------
const norm = (v) => String(v || "").trim().toLowerCase().replace(/\s+/g, " ");

async function memberOf(churchId, uid) {
  const s = await db.doc(`tenants/${churchId}/members/${uid}`).get();
  return s.exists && s.get("active") !== false ? s : null;
}

/** Turma pela idade, como no cadastro feito pela familia no app. */
async function classFor(churchId, birthIso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthIso || "");
  if (!m) return "";
  const now = new Date();
  let age = now.getFullYear() - Number(m[1]);
  if (now.getMonth() + 1 < Number(m[2]) || (now.getMonth() + 1 === Number(m[2]) && now.getDate() < Number(m[3]))) age--;
  const classes = await db.collection(`tenants/${churchId}/classes`).get();
  for (const d of classes.docs) {
    if (d.get("active") === false) continue;
    if (age >= (d.get("ageMin") || 0) && age <= (d.get("ageMax") || 0)) return d.id;
  }
  return "";
}

/**
 * importFamily({ fromChurchId, toChurchId, childIds, includeHealth })
 * O responsavel logado leva filhos escolhidos (e os responsaveis/autorizados ligados
 * a eles) da familia dele numa igreja para a familia dele em outra. Quem tem conta
 * na igreja de origem e na mesma familia fica "pendente" na de destino e entra na
 * familia sozinho (claimFamilyLink), sem digitar o codigo da familia.
 */
exports.importFamily = onCall({ region: REGION }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Entre na sua conta.");
  const uid = req.auth.uid;
  const { fromChurchId, toChurchId, childIds, includeHealth } = req.data || {};
  if (!fromChurchId || !toChurchId || fromChurchId === toChurchId || !Array.isArray(childIds) || !childIds.length) {
    throw new HttpsError("invalid-argument", "Escolha a igreja de origem e os filhos.");
  }
  const [from, to] = await Promise.all([memberOf(fromChurchId, uid), memberOf(toChurchId, uid)]);
  const srcFamily = from && from.get("familyId");
  const dstFamily = to && to.get("familyId");
  if (!srcFamily || !dstFamily) {
    throw new HttpsError("permission-denied", "Você precisa ter família nas duas igrejas.");
  }
  const src = db.doc(`tenants/${fromChurchId}`);
  const dst = db.doc(`tenants/${toChurchId}`);

  const [srcKids, srcGuardians, srcAuth, dstGuardians, dstAuth, dstKids] = await Promise.all([
    src.collection("children").where("familyId", "==", srcFamily).get(),
    src.collection("guardians").where("familyId", "==", srcFamily).get(),
    src.collection("authorized").where("familyId", "==", srcFamily).get(),
    dst.collection("guardians").where("familyId", "==", dstFamily).get(),
    dst.collection("authorized").where("familyId", "==", dstFamily).get(),
    dst.collection("children").where("familyId", "==", dstFamily).get(),
  ]);
  const wanted = srcKids.docs.filter((d) => childIds.includes(d.id));
  if (!wanted.length) throw new HttpsError("not-found", "Nenhum dos filhos escolhidos foi encontrado.");
  const already = new Set(
    dstKids.docs.filter((d) => d.get("importedFrom")).map((d) => `${d.get("importedFrom").churchId}/${d.get("importedFrom").childId}`),
  );

  // Mapa: id da pessoa na origem -> id no destino (cria o que ainda nao existe).
  const map = new Map();
  if (from.get("personId") && to.get("personId")) map.set(from.get("personId"), to.get("personId"));
  const guardianByName = new Map(dstGuardians.docs.map((d) => [norm(d.get("fullName")), d.id]));
  const authByName = new Map(dstAuth.docs.map((d) => [norm(d.get("fullName")), d.id]));

  const needed = new Set();
  for (const c of wanted) for (const id of [...(c.get("guardianIds") || []), ...(c.get("authorizedIds") || [])]) needed.add(id);

  const ensure = async (doc, coll, byName, isGuardian) => {
    if (!needed.has(doc.id) || map.has(doc.id)) return;
    const key = norm(doc.get("fullName"));
    if (byName.has(key)) { map.set(doc.id, byName.get(key)); return; }
    const data = { ...doc.data(), familyId: dstFamily };
    if (isGuardian) data.primary = false;
    const ref = dst.collection(coll).doc();
    await ref.set(data);
    map.set(doc.id, ref.id);
    byName.set(key, ref.id);
  };
  for (const d of srcGuardians.docs) await ensure(d, "guardians", guardianByName, true);
  for (const d of srcAuth.docs) await ensure(d, "authorized", authByName, false);

  const rnd = () => Math.floor(10000 + Math.random() * 90000);
  let copied = 0;
  for (const c of wanted) {
    if (already.has(`${fromChurchId}/${c.id}`)) continue;
    const mapIds = (arr) => [...new Set((arr || []).map((i) => map.get(i)).filter(Boolean))];
    const health = includeHealth ? await src.doc(`health/${c.id}`).get() : null;
    const ref = dst.collection("children").doc();
    const data = {
      code: `CR-${rnd()}`,
      fullName: c.get("fullName") || "",
      nickname: c.get("nickname") || "",
      birthDate: c.get("birthDate") || "",
      classId: await classFor(toChurchId, c.get("birthDate")),
      familyId: dstFamily,
      notes: c.get("notes") || "",
      status: "ativo",
      guardianIds: mapIds(c.get("guardianIds")),
      authorizedIds: mapIds(c.get("authorizedIds")),
      createdBy: uid,
      importedFrom: { churchId: fromChurchId, childId: c.id },
    };
    if (c.get("photoUrl")) data.photoUrl = c.get("photoUrl");
    if (health && health.exists) {
      data.careAlert = c.get("careAlert") === true;
      data.hasMedication = c.get("hasMedication") === true;
      await dst.doc(`health/${ref.id}`).set(health.data());
    }
    await ref.set(data);
    copied++;
  }

  // Outros responsaveis com conta na mesma familia: entram sozinhos ao ingressar.
  const others = await src.collection("members").where("familyId", "==", srcFamily).get();
  let pending = 0;
  for (const m of others.docs) {
    if (m.id === uid || m.get("active") === false) continue;
    await dst.doc(`pendingLinks/${m.id}`).set({ familyId: dstFamily, fromUid: uid, fromChurchId, createdAt: new Date().toISOString() });
    pending++;
  }
  return { copied, pending };
});

/**
 * claimFamilyLink({ churchId }) — quem ficou "pendente" por importFamily e entrou
 * na igreja (codigo IG-) e vinculado a familia que o responsavel ja importou.
 */
exports.claimFamilyLink = onCall({ region: REGION }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Entre na sua conta.");
  const uid = req.auth.uid;
  const churchId = req.data && req.data.churchId;
  if (!churchId) throw new HttpsError("invalid-argument", "Igreja não informada.");
  const member = await memberOf(churchId, uid);
  if (!member) return { linked: false };
  const pendRef = db.doc(`tenants/${churchId}/pendingLinks/${uid}`);
  const pend = await pendRef.get();
  if (!pend.exists) return { linked: false };
  const familyId = pend.get("familyId");
  if (member.get("familyId")) { await pendRef.delete(); return { linked: false }; }
  const update = { familyId };
  const guardians = await db.collection(`tenants/${churchId}/guardians`).where("familyId", "==", familyId).get();
  const mine = guardians.docs.find((g) => norm(g.get("fullName")) === norm(member.get("name")));
  if (mine) { update.personId = mine.id; update.personKind = "guardian"; }
  await member.ref.update(update);
  await db.doc(`users/${uid}/memberships/${churchId}`).set({ familyId }, { merge: true });
  await pendRef.delete();
  return { linked: true };
});

// ---------------------------------------------------------------------------
// Exclusao da propria conta (exigida pelas lojas). Roda no servidor porque
// apaga dados em varias igrejas e as regras do Firestore nao permitem isso.
// ---------------------------------------------------------------------------
const REAUTH_WINDOW_S = 5 * 60;

/** Apaga todos os docs de uma consulta, em lotes. */
async function deleteQuery(query) {
  const snap = await query.get();
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = db.batch();
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

/** Apaga a familia (criancas, saude, responsaveis, autorizados e registros ligados as criancas). */
async function deleteFamilyData(churchId, familyId) {
  const t = db.doc(`tenants/${churchId}`);
  const kids = await t.collection("children").where("familyId", "==", familyId).get();
  for (const k of kids.docs) {
    await Promise.all([
      t.doc(`health/${k.id}`).delete(),
      t.doc(`presence/${k.id}`).delete(),
      deleteQuery(t.collection("attendance").where("childId", "==", k.id)),
      deleteQuery(t.collection("badges").where("childId", "==", k.id)),
      deleteQuery(t.collection("checkinRequests").where("childId", "==", k.id)),
    ]);
    await k.ref.delete();
  }
  await Promise.all([
    deleteQuery(t.collection("guardians").where("familyId", "==", familyId)),
    deleteQuery(t.collection("authorized").where("familyId", "==", familyId)),
    deleteQuery(t.collection("calls").where("familyId", "==", familyId)),
    deleteQuery(t.collection("familyLinks").where("familyId", "==", familyId)),
    t.doc(`families/${familyId}`).delete(),
  ]);
}

/**
 * deleteMyAccount({ deleteFamily }) — apaga a conta de quem chamou: vinculos em
 * todas as igrejas, perfil, tokens de push e o login. Com deleteFamily, apaga
 * tambem a familia e as criancas (se mais ninguem com conta usa essa familia).
 * Exige login recente (5 min) e nao deixa uma igreja sem administrador.
 */
exports.deleteMyAccount = onCall({ region: REGION }, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Entre na sua conta.");
  const uid = req.auth.uid;
  const authTime = Number(req.auth.token.auth_time || 0);
  if (Date.now() / 1000 - authTime > REAUTH_WINDOW_S) {
    throw new HttpsError("failed-precondition", "reauth-required");
  }
  const wantFamily = !!(req.data && req.data.deleteFamily);

  const memberships = await db.collection(`users/${uid}/memberships`).get();

  // Antes de apagar qualquer coisa: nao deixar igreja sem administrador.
  for (const m of memberships.docs) {
    const mine = await db.doc(`tenants/${m.id}/members/${uid}`).get();
    if (!mine.exists || mine.get("role") !== "admin") continue;
    const admins = await db.collection(`tenants/${m.id}/members`).where("role", "==", "admin").get();
    const others = admins.docs.filter((d) => d.id !== uid && d.get("active") !== false);
    if (!others.length) {
      throw new HttpsError(
        "failed-precondition",
        `admin-unico:${m.get("churchName") || m.id}`,
      );
    }
  }

  for (const m of memberships.docs) {
    const churchId = m.id;
    const mine = await db.doc(`tenants/${churchId}/members/${uid}`).get();
    const familyId = mine.exists ? mine.get("familyId") : null;
    if (wantFamily && familyId) {
      const sharing = await db.collection(`tenants/${churchId}/members`).where("familyId", "==", familyId).get();
      const someoneElse = sharing.docs.some((d) => d.id !== uid && d.get("active") !== false);
      if (!someoneElse) await deleteFamilyData(churchId, familyId);
    }
    await Promise.all([
      db.doc(`tenants/${churchId}/members/${uid}`).delete(),
      db.doc(`tenants/${churchId}/roomStaff/${uid}`).delete(),
      db.doc(`tenants/${churchId}/pendingLinks/${uid}`).delete(),
      m.ref.delete(),
    ]);
  }

  await db.doc(`users/${uid}`).delete();
  await getAuth().deleteUser(uid);
  return { ok: true };
});
