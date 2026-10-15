// Camada de dados em tempo real sobre o Firestore.
// Os componentes só conhecem esta interface (useStore); regras de negócio ficam em ./domain/rules.
// A segurança definitiva é imposta por firestore.rules — a UI apenas reflete as permissões.
import { careFlags, parseCare, type CareProfile } from "./domain/care";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Query,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
} from "firebase/auth";
import { db, getSecondaryAuth, getSecondaryDb } from "./firebase/client";
import { useAuth } from "./auth";
import { DEFAULT_SETTINGS, createSeed } from "./domain/mock";
import {
  can,
  opaqueToken,
  validateCheckIn,
  validateCheckOut,
  type RuleResult,
} from "./domain/rules";
import type {
  Invite,
  AppState,
  AppUser,
  AuthorizedPerson,
  Badge,
  BadgeStatus,
  CallReason,
  CallStatus,
  Child,
  ChurchSettings,
  ClassRoom,
  Family,
  Guardian,
  NotificationCategory,
  Role,
} from "./domain/types";

const now = () => new Date().toISOString();
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86400000).toISOString();

type WithoutId<T> = Omit<T, "id">;
type Save<T, K extends string = never> = Omit<T, "id" | K> & { id?: string };

interface Ctx {
  state: AppState;
  loading: boolean;
  error: string | null;
  role: Role;
  currentUser: string;
  unit: string;
  setUnit: (u: string) => void;
  saveChild: (c: Save<Child, "code">) => Promise<Child>;
  saveCare: (childId: string, p: CareProfile, text: string) => Promise<void>;
  saveFamily: (f: Save<Family, "code">) => Promise<Family>;
  saveGuardian: (g: Save<Guardian>) => Promise<void>;
  saveAuthorized: (a: Save<AuthorizedPerson>) => Promise<void>;
  saveClass: (c: Save<ClassRoom>) => Promise<void>;
  toggleAuthorization: (childId: string, personId: string) => Promise<void>;
  checkIn: (childId: string, droppedBy: string) => Promise<RuleResult>;
  checkOut: (
    childId: string,
    personId: string,
    personName: string,
  ) => Promise<RuleResult>;
  issueBadge: (childId: string) => Promise<Badge>;
  setBadgeStatus: (badgeId: string, status: BadgeStatus) => Promise<void>;
  openCall: (
    childId: string,
    reason: CallReason,
    note?: string,
  ) => Promise<void>;
  setCallStatus: (callId: string, status: CallStatus) => Promise<void>;
  markAllRead: () => Promise<void>;
  sendAnnouncement: (title: string, recipient: string) => Promise<void>;
  createUserAccount: (u: {
    name: string;
    email: string;
    password: string;
    role: Role;
    classIds: string[];
  }) => Promise<void>;
  saveUser: (
    id: string,
    patch: Partial<Pick<AppUser, "name" | "role" | "classIds" | "active">>,
  ) => Promise<void>;
  createInvite: () => Promise<string>;
  revokeInvites: () => Promise<void>;
  createJoinCode: () => Promise<string>;
  revokeJoinCodes: () => Promise<void>;
  createFamilyLink: (familyId: string) => Promise<string>;
  revokeFamilyLink: (familyId: string) => Promise<void>;
  saveSettings: (s: ChurchSettings) => Promise<void>;
  seedDemo: () => Promise<void>;
}

const StoreCtx = createContext<Ctx | null>(null);

const EMPTY: AppState = {
  children: [],
  families: [],
  guardians: [],
  authorized: [],
  classes: [],
  badges: [],
  attendance: [],
  calls: [],
  notifications: [],
  audit: [],
  users: [],
  invites: [],
  joinCodes: [],
  familyLinks: [],
  settings: DEFAULT_SETTINGS,
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const { profile, churchId, churchName } = useAuth();
  const role: Role = profile?.role ?? "recepcao";
  const currentUser = profile?.name ?? "";
  const uid = profile?.id ?? "";
  // Todo dado vive dentro da igreja ativa: tenants/{churchId}/...
  const cid = churchId ?? "_sem_igreja";
  const tcol = (name: string) => collection(db(), "tenants", cid, name);
  const tdoc = (name: string, id: string) =>
    doc(db(), "tenants", cid, name, id);

  const [data, setData] = useState<AppState>(EMPTY);
  const [health, setHealth] = useState<Record<string, string>>({});
  const [care, setCare] = useState<Record<string, CareProfile>>({});
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState("");

  // Assinaturas em tempo real, de acordo com o perfil (menor privilégio).
  useEffect(() => {
    if (!profile?.active || !churchId) return;
    const unsubs: (() => void)[] = [];
    const mark = (k: string) =>
      setLoaded((s) => (s.has(k) ? s : new Set(s).add(k)));
    const fail = (k: string) => (e: Error) => {
      console.error(`[firestore:${k}]`, e);
      setError(`Falha ao carregar "${k}": ${e.message}`);
      mark(k);
    };
    const watch = <K extends keyof AppState>(key: K, q: Query<DocumentData>) =>
      unsubs.push(
        onSnapshot(
          q,
          (snap) => {
            setData((s) => ({
              ...s,
              [key]: snap.docs.map((x) => ({ id: x.id, ...x.data() })),
            }));
            mark(key);
          },
          fail(key),
        ),
      );

    watch("children", tcol("children"));
    watch("families", tcol("families"));
    watch("guardians", tcol("guardians"));
    watch("authorized", tcol("authorized"));
    watch("classes", tcol("classes"));
    watch("badges", tcol("badges"));
    watch(
      "attendance",
      query(
        tcol("attendance"),
        where("checkInAt", ">=", daysAgo(400)),
      ),
    );
    watch(
      "calls",
      query(tcol("calls"), orderBy("createdAt", "desc"), limit(500)),
    );
    watch(
      "notifications",
      query(
        tcol("notifications"),
        orderBy("createdAt", "desc"),
        limit(300),
      ),
    );
    if (can(role, "familias")) {
      watch("familyLinks", tcol("familyLinks"));
    }
    if (can(role, "usuarios")) {
      watch(
        "users",
        query(
          tcol("members"),
          where("role", "in", [
            "admin",
            "coordenacao",
            "professor",
            "recepcao",
          ]),
        ),
      );
      watch("invites", tcol("invites"));
      watch("joinCodes", tcol("joinCodes"));
    }
    if (can(role, "saude")) {
      watch(
        "audit",
        query(tcol("audit"), orderBy("at", "desc"), limit(300)),
      );
      unsubs.push(
        onSnapshot(
          tcol("health"),
          (snap) => {
            setHealth(
              Object.fromEntries(
                snap.docs.map((x) => [x.id, (x.data().text as string) ?? ""]),
              ),
            );
            setCare(
              Object.fromEntries(
                snap.docs.map((x) => [x.id, parseCare(x.data())]),
              ),
            );
          },
          fail("saúde"),
        ),
      );
    }
    unsubs.push(
      onSnapshot(
        tdoc("settings", "church"),
        (snap) => {
          if (snap.exists())
            setData((s) => ({
              ...s,
              settings: {
                ...DEFAULT_SETTINGS,
                ...(snap.data() as ChurchSettings),
              },
            }));
          mark("settings");
        },
        fail("settings"),
      ),
    );
    return () => {
      unsubs.forEach((u) => u());
      setData(EMPTY);
      setHealth({});
      setCare({});
      setLoaded(new Set());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.active, role, churchId]);

  const REQUIRED = [
    "children",
    "families",
    "guardians",
    "authorized",
    "classes",
    "badges",
    "attendance",
    "calls",
    "notifications",
    "settings",
  ];
  const loading = !!profile?.active && REQUIRED.some((k) => !loaded.has(k));

  const state = useMemo<AppState>(
    () => ({
      ...data,
      children: data.children.map((c) => ({
        ...c,
        health: health[c.id] ?? "",
        care: care[c.id],
      })),
    }),
    [data, health, care],
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  // Espelha nome/cor/logo no doc da igreja (legível por todo membro: o app e a
  // troca de igreja usam). Corrige igrejas que salvaram antes disso existir.
  useEffect(() => {
    if (loading || role !== "admin" || !churchId) return;
    const s = state.settings;
    const want = {
      name: s.name,
      themeColor: s.themeColor ?? "original",
      logoUrl: s.logoUrl ?? null,
    };
    const ref = doc(db(), "tenants", churchId);
    getDoc(ref)
      .then((snap) => {
        const cur = (snap.data() ?? {}) as Record<string, unknown>;
        const diff = Object.entries(want).some(([k, v]) => (cur[k] ?? null) !== v);
        return diff ? updateDoc(ref, want) : undefined;
      })
      .catch(() => undefined);
  }, [
    loading,
    role,
    churchId,
    state.settings.name,
    state.settings.themeColor,
    state.settings.logoUrl,
  ]);

  useEffect(() => {
    if (!unit && state.settings.units[0]) setUnit(state.settings.units[0]);
  }, [state.settings.units, unit]);

  const log = useCallback(
    (action: string) =>
      addDoc(tcol("audit"), {
        at: now(),
        uid,
        user: currentUser,
        action,
      }).then(
        () => undefined,
        () => undefined,
      ),
    [uid, currentUser, cid],
  );

  const notify = useCallback(
    async (
      category: NotificationCategory,
      title: string,
      recipient: string,
    ) => {
      const n = stateRef.current.settings.notify;
      const enabled = {
        chamada: n.calls,
        presenca: n.presence,
        alerta: n.alerts,
        comunicado: n.announcements,
        administrativo: true,
      }[category];
      if (!enabled) return;
      // Entrega real (push/WhatsApp/e-mail) ainda não implementada: registra apenas localmente.
      await addDoc(tcol("notifications"), {
        category,
        title,
        recipient,
        createdAt: now(),
        delivery: "local",
        read: false,
      }).catch(() => undefined);
    },
    [cid],
  );

  const value = useMemo<Ctx>(() => {
    const d = () => db();
    const strip = <T extends { id?: string }>(o: T) => {
      const { id: _id, ...rest } = o;
      return rest;
    };

    return {
      state,
      loading,
      error,
      role,
      currentUser,
      unit,
      setUnit,

      saveChild: async (c) => {
        const { health: h, ...rest } = c as Save<Child, "code"> & {
          health: string;
        };
        let saved: Child;
        if (c.id) {
          const base = stateRef.current.children.find((x) => x.id === c.id)!;
          const { id: _i, ...payload } = rest;
          await updateDoc(tdoc("children", c.id), payload);
          saved = { ...base, ...rest, health: h, id: c.id };
          await log(`Cadastro atualizado: ${c.fullName}`);
        } else {
          const ref = doc(tcol("children"));
          const prefix = stateRef.current.settings.idPrefix || "CR";
          const code = await runTransaction(d(), async (tx) => {
            const cref = tdoc("meta", "counters");
            const cs = await tx.get(cref);
            const next = ((cs.data()?.child as number | undefined) ?? 1000) + 1;
            tx.set(cref, { child: next }, { merge: true });
            tx.set(ref, { ...strip(rest), code: `${prefix}-${next}` });
            return `${prefix}-${next}`;
          });
          saved = { ...rest, health: h, id: ref.id, code } as Child;
          await log(`Criança cadastrada: ${c.fullName}`);
        }
        if (can(role, "saude"))
          await setDoc(tdoc("health", saved.id), { text: h ?? "" }, { merge: true });
        return saved;
      },

      saveCare: async (childId, p, text) => {
        const flags = careFlags(p, text);
        await setDoc(tdoc("health", childId), {
          ...p,
          text,
          updatedAt: now(),
          updatedBy: uid,
        });
        await updateDoc(tdoc("children", childId), flags);
        const c = stateRef.current.children.find((x) => x.id === childId);
        await log(`Saúde e cuidados atualizados: ${c?.fullName ?? childId}`);
      },

      saveFamily: async (f) => {
        if (f.id) {
          await updateDoc(tdoc("families", f.id), strip(f));
          await log(`Família atualizada: ${f.name}`);
          return {
            ...(stateRef.current.families.find((x) => x.id === f.id) as Family),
            ...f,
            id: f.id,
          };
        }
        const ref = doc(tcol("families"));
        const code = await runTransaction(d(), async (tx) => {
          const cref = tdoc("meta", "counters");
          const cs = await tx.get(cref);
          const next = ((cs.data()?.family as number | undefined) ?? 200) + 1;
          tx.set(cref, { family: next }, { merge: true });
          tx.set(ref, { ...strip(f), code: `FAM-${next}` });
          return `FAM-${next}`;
        });
        await log(`Família cadastrada: ${f.name}`);
        return { ...f, id: ref.id, code } as Family;
      },

      saveGuardian: async (g) => {
        if (g.id) await updateDoc(tdoc("guardians", g.id), strip(g));
        else {
          const ref = await addDoc(tcol("guardians"), g);
          // Vincula às crianças da família. Responsável já pode retirar a criança
          // (a coordenação pode revogar na ficha); pessoa autorizada de fora é explícita.
          const kids = stateRef.current.children.filter(
            (k) => k.familyId === g.familyId,
          );
          await Promise.all(
            kids.map((k) =>
              updateDoc(tdoc("children", k.id), {
                guardianIds: [...new Set([...k.guardianIds, ref.id])],
                authorizedIds: [...new Set([...k.authorizedIds, ref.id])],
              }),
            ),
          );
          await log(`Responsável adicionado: ${g.fullName}`);
        }
      },

      saveAuthorized: async (a) => {
        if (a.id) await updateDoc(tdoc("authorized", a.id), strip(a));
        else {
          await addDoc(tcol("authorized"), a);
          await log(`Pessoa autorizada adicionada: ${a.fullName}`);
        }
      },

      saveClass: async (c) => {
        if (c.id) await updateDoc(tdoc("classes", c.id), strip(c));
        else {
          await addDoc(tcol("classes"), c);
          await log(`Turma criada: ${c.name}`);
        }
      },

      toggleAuthorization: async (childId, personId) => {
        const c = stateRef.current.children.find((x) => x.id === childId);
        if (!c) return;
        const has = c.authorizedIds.includes(personId);
        await updateDoc(tdoc("children", childId), {
          authorizedIds: has
            ? c.authorizedIds.filter((x) => x !== personId)
            : [...c.authorizedIds, personId],
        });
        await log(
          `Autorização de retirada ${has ? "revogada" : "concedida"} (${c.fullName})`,
        );
      },

      checkIn: async (childId, droppedBy) => {
        const s = stateRef.current;
        const child = s.children.find((c) => c.id === childId);
        if (!child) return { ok: false, reason: "Criança não encontrada." };
        const r = validateCheckIn(s, child);
        if (!r.ok) return r;
        const attRef = doc(tcol("attendance"));
        // Marcador `presence/{childId}` + transação garantem que não haja entrada duplicada, mesmo com dois tablets.
        const dup = await runTransaction(d(), async (tx) => {
          const pref = tdoc("presence", childId);
          if ((await tx.get(pref)).exists()) return true;
          tx.set(pref, { attendanceId: attRef.id, at: now() });
          tx.set(attRef, { childId, checkInAt: now(), droppedBy, by: uid });
          return false;
        });
        if (dup)
          return {
            ok: false,
            reason:
              "Esta criança já possui entrada registrada e ainda não saiu.",
          };
        await log(`Check-in de ${child.fullName} (entregue por ${droppedBy})`);
        await notify(
          "presenca",
          `Entrada registrada — ${child.fullName}`,
          droppedBy,
        );
        return r;
      },

      checkOut: async (childId, personId, personName) => {
        const s = stateRef.current;
        const child = s.children.find((c) => c.id === childId);
        if (!child) return { ok: false, reason: "Criança não encontrada." };
        const r = validateCheckOut(s, child, personId);
        if (!r.ok) {
          await log(
            `Retirada BLOQUEADA de ${child.fullName} por ${personName}: ${r.reason}`,
          );
          await notify(
            "alerta",
            `Tentativa de retirada não autorizada — ${child.nickname}`,
            "Coordenação",
          );
          return r;
        }
        const ok = await runTransaction(d(), async (tx) => {
          const pref = tdoc("presence", childId);
          const p = await tx.get(pref);
          if (!p.exists()) return false;
          tx.update(tdoc("attendance", p.data().attendanceId as string), {
            checkOutAt: now(),
            pickedUpBy: personName,
            pickedUpById: personId,
          });
          tx.delete(pref);
          return true;
        });
        if (!ok)
          return {
            ok: false,
            reason: "Não há entrada registrada para esta criança.",
          };
        const open = s.calls.filter(
          (c) =>
            c.childId === childId &&
            !["atendida", "cancelada"].includes(c.status),
        );
        await Promise.all(
          open.map((c) =>
            updateDoc(tdoc("calls", c.id), {
              status: "atendida",
              history: [...c.history, { status: "atendida", at: now() }],
            }),
          ),
        );
        await log(`Check-out de ${child.fullName} por ${personName}`);
        await notify(
          "presenca",
          `Saída registrada — ${child.fullName}`,
          personName,
        );
        return r;
      },

      issueBadge: async (childId) => {
        const s = stateRef.current;
        const child = s.children.find((c) => c.id === childId);
        const batch = writeBatch(d());
        s.badges
          .filter((b) => b.childId === childId && b.status === "ativo")
          .forEach((b) =>
            batch.update(tdoc("badges", b.id), { status: "substituido" }),
          );
        const ref = doc(tcol("badges"));
        const badge: Badge = {
          id: ref.id,
          childId,
          token: opaqueToken(),
          status: "ativo",
          issuedAt: now(),
          expiresAt: new Date(
            Date.now() + s.settings.badge.validityDays * 86400000,
          )
            .toISOString()
            .slice(0, 10),
        };
        batch.set(ref, strip(badge));
        await batch.commit();
        await log(`Crachá emitido para ${child?.fullName}`);
        return badge;
      },

      setBadgeStatus: async (id, status) => {
        await updateDoc(tdoc("badges", id), { status });
        await log(`Crachá ${id} marcado como ${status}`);
      },

      openCall: async (childId, reason, note) => {
        const s = stateRef.current;
        const child = s.children.find((c) => c.id === childId);
        if (!child) return;
        const recips = s.guardians
          .filter((g) => child.guardianIds.includes(g.id))
          .map((g) => g.fullName)
          .join(", ");
        await addDoc(tcol("calls"), {
          childId,
          classId: child.classId,
          familyId: child.familyId,
          reason,
          note: note ?? "",
          requestedBy: currentUser,
          // Quem chamou: recebe push quando a família avisa que está indo.
          requestedById: uid,
          createdAt: now(),
          status: "pendente",
          history: [{ status: "pendente", at: now() }],
        });
        await log(`Chamada aberta para ${child.fullName}`);
        // Título genérico: nenhum dado médico/sensível em notificações visíveis na tela bloqueada.
        await notify(
          "chamada",
          `Chamada solicitada — ${child.fullName}`,
          recips || "Sem responsável vinculado",
        );
      },

      setCallStatus: async (id, status) => {
        const c = stateRef.current.calls.find((x) => x.id === id);
        if (!c) return;
        await updateDoc(tdoc("calls", id), {
          status,
          history: [...c.history, { status, at: now() }],
        });
        await log(
          `Chamada de ${stateRef.current.children.find((k) => k.id === c.childId)?.fullName ?? c.childId} → ${status}`,
        );
      },

      markAllRead: async () => {
        const batch = writeBatch(d());
        stateRef.current.notifications
          .filter((n) => !n.read)
          .forEach((n) =>
            batch.update(tdoc("notifications", n.id), { read: true }),
          );
        await batch.commit();
      },

      sendAnnouncement: async (title, recipient) => {
        await notify("comunicado", title, recipient);
        await log(`Comunicado registrado: ${title}`);
      },

      createUserAccount: async (u) => {
        const sec = getSecondaryAuth();
        const cred = await createUserWithEmailAndPassword(
          sec,
          u.email.trim(),
          u.password,
        );
        try {
          await updateProfile(cred.user, { displayName: u.name });
          // Perfil global: escrito pela própria conta nova (as regras só deixam o dono criá-lo).
          await setDoc(doc(getSecondaryDb(), "users", cred.user.uid), {
            name: u.name.trim(),
            email: u.email.trim(),
            createdAt: now(),
          });
          // Vínculo com ESTA igreja: escrito pelo administrador.
          const batch = writeBatch(d());
          batch.set(tdoc("members", cred.user.uid), {
            name: u.name.trim(),
            email: u.email.trim(),
            role: u.role,
            classIds: u.classIds,
            active: true,
            createdAt: now(),
          });
          batch.set(doc(d(), "users", cred.user.uid, "memberships", cid), {
            churchName,
            role: u.role,
            familyId: null,
            active: true,
            joinedAt: now(),
          });
          await batch.commit();
        } finally {
          await fbSignOut(sec);
        }
        await log(`Usuário criado: ${u.name} (${u.role})`);
      },

      saveUser: async (id, patch) => {
        await updateDoc(tdoc("members", id), patch);
        // Mantém a cópia usada em "minhas igrejas" (papel/ativo) em dia.
        const copy: Record<string, unknown> = {};
        if (patch.role) copy.role = patch.role;
        if (patch.active !== undefined) copy.active = patch.active;
        if (Object.keys(copy).length)
          await updateDoc(
            doc(d(), "users", id, "memberships", cid),
            copy,
          ).catch(() => undefined);
        await log(`Usuário atualizado: ${id}`);
      },

      // Gera um novo código e desativa os anteriores (equivale a "regenerar código").
      createInvite: async () => {
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const bytes = crypto.getRandomValues(new Uint8Array(6));
        const code =
          "KIDS-" +
          Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
        const batch = writeBatch(d());
        stateRef.current.invites.forEach((i) => {
          batch.delete(tdoc("invites", i.id));
          batch.delete(doc(d(), "codes", i.id));
        });
        batch.set(tdoc("invites", code), {
          active: true,
          createdAt: now(),
          createdBy: uid,
        });
        batch.set(doc(d(), "codes", code), {
          churchId: cid,
          churchName,
          kind: "invite",
        });
        await batch.commit();
        await log("Código de convite gerado");
        return code;
      },

      // Código único de entrada dos pais da igreja: quem o usa cria a conta e cadastra
      // a própria família e as crianças no app.
      createJoinCode: async () => {
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const bytes = crypto.getRandomValues(new Uint8Array(6));
        const code =
          "IG-" +
          Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
        const batch = writeBatch(d());
        stateRef.current.joinCodes.forEach((i) => {
          batch.delete(tdoc("joinCodes", i.id));
          batch.delete(doc(d(), "codes", i.id));
        });
        batch.set(tdoc("joinCodes", code), {
          active: true,
          createdAt: now(),
          createdBy: uid,
        });
        batch.set(doc(d(), "codes", code), {
          churchId: cid,
          churchName,
          kind: "join",
        });
        await batch.commit();
        await log("Código de entrada dos pais gerado");
        return code;
      },

      revokeJoinCodes: async () => {
        const batch = writeBatch(d());
        stateRef.current.joinCodes.forEach((i) => {
          batch.delete(tdoc("joinCodes", i.id));
          batch.delete(doc(d(), "codes", i.id));
        });
        await batch.commit();
        await log("Código de entrada dos pais desativado");
      },

      revokeInvites: async () => {
        const batch = writeBatch(d());
        stateRef.current.invites.forEach((i) => {
          batch.delete(tdoc("invites", i.id));
          batch.delete(doc(d(), "codes", i.id));
        });
        await batch.commit();
        await log("Código de convite desativado");
      },

      createFamilyLink: async (familyId) => {
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const bytes = crypto.getRandomValues(new Uint8Array(6));
        const code =
          "LK-" +
          Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
        const batch = writeBatch(d());
        // Um código ativo por família: gerar um novo invalida o anterior.
        stateRef.current.familyLinks
          .filter((l) => l.familyId === familyId)
          .forEach((l) => {
            batch.delete(tdoc("familyLinks", l.id));
            batch.delete(doc(d(), "codes", l.id));
          });
        batch.set(tdoc("familyLinks", code), {
          familyId,
          active: true,
          createdAt: now(),
          createdBy: uid,
        });
        batch.set(doc(d(), "codes", code), {
          churchId: cid,
          churchName,
          kind: "family",
        });
        await batch.commit();
        await log("Código de acesso do app gerado para uma família");
        return code;
      },

      revokeFamilyLink: async (familyId) => {
        const batch = writeBatch(d());
        stateRef.current.familyLinks
          .filter((l) => l.familyId === familyId)
          .forEach((l) => {
            batch.delete(tdoc("familyLinks", l.id));
            batch.delete(doc(d(), "codes", l.id));
          });
        await batch.commit();
        await log("Código de acesso do app desativado para uma família");
      },

      saveSettings: async (s) => {
        await setDoc(tdoc("settings", "church"), s);
        await updateDoc(doc(d(), "tenants", cid), {
          name: s.name,
          themeColor: s.themeColor ?? "original",
          // Cópia legível por todo membro (o app e a troca de igreja mostram a logo).
          logoUrl: s.logoUrl ?? null,
        }).catch(
          () => undefined,
        );
        await log("Configurações da igreja atualizadas");
      },

      seedDemo: async () => {
        const seed = createSeed();
        const batch = writeBatch(d());
        const put = (name: string, items: { id: string }[]) =>
          items.forEach((i) =>
            batch.set(
              tdoc(name, i.id),
              strip(i as { id: string } & WithoutId<object>),
            ),
          );
        put("classes", seed.classes);
        put("families", seed.families);
        put("guardians", seed.guardians);
        put("authorized", seed.authorized);
        seed.children.forEach((c) => {
          const { health: h, ...rest } = c;
          batch.set(tdoc("children", c.id), strip(rest));
          if (h) batch.set(tdoc("health", c.id), { text: h });
        });
        put("badges", seed.badges);
        // Presenças em aberto precisam do marcador `presence`.
        seed.attendance.forEach((a) => {
          batch.set(tdoc("attendance", a.id), strip(a));
          if (!a.checkOutAt)
            batch.set(tdoc("presence", a.childId), {
              attendanceId: a.id,
              at: a.checkInAt,
            });
        });
        put("calls", seed.calls);
        put("notifications", seed.notifications);
        batch.set(
          tdoc("meta", "counters"),
          { child: 1016, family: 208 },
          { merge: true },
        );
        await batch.commit();
        await log("Dados de demonstração carregados");
      },
    };
  }, [state, loading, error, role, currentUser, unit, uid, cid, churchName, log, notify]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore fora do StoreProvider");
  return c;
}
