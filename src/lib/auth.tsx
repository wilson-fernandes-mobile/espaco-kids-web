// Autenticação (Firebase Auth) + vínculo com a igreja (multi-igreja, como o MovaChurch).
//  - users/{uid}                              perfil global da pessoa (nome, e-mail)
//  - users/{uid}/memberships/{churchId}       lista "minhas igrejas" (cópia)
//  - tenants/{churchId}/members/{uid}         papel da pessoa NESTA igreja (fonte da verdade)
//  - codes/{código}                           aponta um código de convite/família para a igreja
// A autorização real é imposta pelas Security Rules (firestore.rules); a UI apenas reflete o papel.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { DEFAULT_SETTINGS } from "./domain/mock";
import { auth, db, firebaseConfigured } from "./firebase/client";
import type { AppUser } from "./domain/types";

export type AuthStatus =
  | "loading"
  | "signed-out"
  | "needs-church"
  | "no-profile"
  | "inactive"
  | "ready";

export interface ChurchMembership {
  churchId: string;
  churchName: string;
  role: string;
  familyId?: string | null;
}

type StaffRole = "professor" | "recepcao";

interface AuthCtx {
  status: AuthStatus;
  user: User | null;
  /** Perfil (papel, turmas) da pessoa na igreja ativa. */
  profile: AppUser | null;
  /** Igrejas da conta e a ativa. */
  memberships: ChurchMembership[];
  churchId: string | null;
  churchName: string;
  selectChurch: (churchId: string) => void;
  /** Abre a tela de escolher/criar/entrar em igreja (a pessoa pode ter várias). */
  openChurchPicker: () => void;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Entra (ou cria a conta) com Google/Apple. Quem ainda nao tem igreja cai na tela "Suas igrejas". */
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  /** Cria a conta e uma igreja nova, da qual a pessoa é administradora. */
  bootstrapAdmin: (
    churchName: string,
    name: string,
    email: string,
    password: string,
  ) => Promise<void>;
  /** Quem já tem conta cria mais uma igreja (e vira administrador dela). */
  createChurch: (churchName: string) => Promise<void>;
  /** Equipe: cria a própria conta usando o código de convite da igreja. */
  joinWithCode: (input: {
    code: string;
    name: string;
    email: string;
    password: string;
    role: StaffRole;
  }) => Promise<void>;
  /** Quem já tem conta entra em outra igreja com o código de convite. */
  joinChurchByCode: (
    code: string,
    role: StaffRole,
    expectedChurchId?: string,
  ) => Promise<void>;
  /** Voluntário vincula a PRÓPRIA família (código LK-…) numa igreja em que já está. */
  linkFamilyByCode: (code: string, churchId: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

const CHURCH_KEY = "ek-church";

/** Traduz códigos do Firebase para mensagens simples em português. */
export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-disabled": "Este usuário foi desativado. Procure a coordenação.",
    "auth/too-many-requests":
      "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    "auth/email-already-in-use": "Este e-mail já está cadastrado.",
    "auth/weak-password": "Use uma senha com pelo menos 6 caracteres.",
    "auth/network-request-failed": "Sem conexão com a internet.",
    "auth/operation-not-allowed":
      "Login por e-mail/senha não está habilitado no Firebase (Authentication → Método de login).",
    "auth/account-exists-with-different-credential":
      "Este e-mail já tem conta com outra forma de entrar. Entre com ela (e-mail e senha) e vincule esta em Perfil → Contas vinculadas no app.",
    "auth/popup-blocked":
      "O navegador bloqueou a janela de login. Libere pop-ups para este site e tente de novo.",
    "auth/unauthorized-domain":
      "Este endereço não está autorizado no Firebase (Authentication → Configurações → Domínios autorizados).",
    "auth/operation-not-supported-in-this-environment":
      "Este navegador não suporta o login por janela. Use e-mail e senha.",
    "permission-denied": "Sem permissão para esta operação.",
  };
  return (
    map[code] ??
    (e instanceof Error ? e.message : "Algo deu errado. Tente novamente.")
  );
}

const nowIso = () => new Date().toISOString();

function readSaved(): string | null {
  try {
    return localStorage.getItem(CHURCH_KEY);
  } catch {
    return null;
  }
}

/** Garante o perfil global `users/{uid}` (criado uma vez; depois só nome/tokens mudam). */
async function ensureUserDoc(uid: string, name: string, email: string) {
  const ref = doc(db(), "users", uid);
  if ((await getDoc(ref)).exists()) return;
  await setDoc(ref, { name: name.trim(), email: email.trim(), createdAt: nowIso() });
}

/** Lê `codes/{code}` e exige que seja um convite de equipe. */
async function peekInvite(raw: string) {
  const code = raw.trim().toUpperCase();
  const snap = await getDoc(doc(db(), "codes", code));
  const d = snap.data();
  if (!d) throw new Error("Código inválido. Confira com a coordenação.");
  if (d.kind === "family" || d.kind === "join")
    throw new Error(
      "Esse é um código de família. Famílias usam o aplicativo Espaço Kids.",
    );
  return { code, churchId: d.churchId as string, churchName: (d.churchName as string) ?? "Igreja" };
}

/** Vincula a pessoa a uma igreja como professor/recepção (convite válido). */
async function joinAsStaff(
  uid: string,
  name: string,
  email: string,
  invite: { code: string; churchId: string; churchName: string },
  role: StaffRole,
) {
  const batch = writeBatch(db());
  const memberRef = doc(db(), "tenants", invite.churchId, "members", uid);
  const copyRef = doc(db(), "users", uid, "memberships", invite.churchId);
  // Já é da igreja? Quem entrou como FAMÍLIA vira voluntário e mantém a família.
  const existing = await getDoc(memberRef);
  if (existing.exists()) {
    const cur = existing.data() as { role?: string; familyId?: string | null };
    try {
      if (cur.role === "responsavel") {
        await updateDoc(memberRef, { role, inviteCode: invite.code });
        await setDoc(
          copyRef,
          {
            churchName: invite.churchName,
            role,
            familyId: cur.familyId ?? null,
            active: true,
            joinedAt: nowIso(),
          },
          { merge: true },
        );
      }
      return;
    } catch (e) {
      if ((e as { code?: string }).code === "permission-denied")
        throw new Error(
          "Código de convite inválido ou desativado. Peça um código novo ao administrador.",
        );
      throw e;
    }
  }
  batch.set(memberRef, {
    name: name.trim(),
    email,
    role,
    classIds: [],
    active: true,
    createdAt: nowIso(),
    inviteCode: invite.code,
  });
  batch.set(copyRef, {
    churchName: invite.churchName,
    role,
    familyId: null,
    active: true,
    joinedAt: nowIso(),
  });
  try {
    await batch.commit();
  } catch (e) {
    if ((e as { code?: string }).code === "permission-denied")
      throw new Error(
        "Código de convite inválido ou desativado. Peça um código novo ao administrador.",
      );
    throw e;
  }
}

/** Cria a igreja (doc + administrador + cópia do vínculo) e grava as configurações. */
async function makeChurch(uid: string, name: string, email: string, churchName: string) {
  const ref = doc(collection(db(), "tenants"));
  const batch = writeBatch(db());
  batch.set(ref, { name: churchName.trim(), createdAt: nowIso(), createdBy: uid });
  batch.set(doc(db(), "tenants", ref.id, "members", uid), {
    name: name.trim(),
    email,
    role: "admin",
    classIds: [],
    active: true,
    createdAt: nowIso(),
  });
  batch.set(doc(db(), "users", uid, "memberships", ref.id), {
    churchName: churchName.trim(),
    role: "admin",
    familyId: null,
    active: true,
    joinedAt: nowIso(),
  });
  await batch.commit();
  // Já é admin: grava o nome da igreja nas configurações (não crítico).
  await setDoc(doc(db(), "tenants", ref.id, "settings", "church"), {
    ...DEFAULT_SETTINGS,
    name: churchName.trim(),
  }).catch(() => undefined);
  return ref.id;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseConfigured);
  // null = ainda carregando a lista de igrejas
  const [memberships, setMemberships] = useState<ChurchMembership[] | null>(
    null,
  );
  const [saved, setSaved] = useState<string | null>(readSaved);
  const [picker, setPicker] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [member, setMember] = useState<{
    key: string;
    profile: AppUser | null;
  } | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(auth(), (u) => {
      setUser(u);
      setAuthReady(true);
      if (!u) {
        setMemberships(null);
        setMember(null);
      }
    });
  }, []);

  // Igrejas da conta.
  // Se a leitura falhar (ex.: regras ainda propagando), o listener morre; por
  // isso tenta de novo sozinho e também recomeça ao criar/entrar numa igreja.
  useEffect(() => {
    if (!user) return;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const unsub = onSnapshot(
      query(
        collection(db(), "users", user.uid, "memberships"),
        where("active", "==", true),
      ),
      (snap) => {
        const list = snap.docs.map((d) => ({
          churchId: d.id,
          churchName: (d.data().churchName as string) ?? "Igreja",
          role: (d.data().role as string) ?? "",
          familyId: d.data().familyId as string | null,
        }));
        list.sort((a, b) => a.churchName.localeCompare(b.churchName));
        setMemberships(list);
      },
      () => {
        setMemberships([]);
        retry = setTimeout(() => setReloadKey((k) => k + 1), 4000);
      },
    );
    return () => {
      unsub();
      if (retry) clearTimeout(retry);
    };
  }, [user, reloadKey]);

  // Igreja ativa: a salva (se ainda pertence) ou, havendo uma só, essa.
  const churchId = useMemo(() => {
    if (!memberships || memberships.length === 0) return null;
    if (saved && memberships.some((m) => m.churchId === saved)) return saved;
    return memberships.length === 1 ? memberships[0].churchId : null;
  }, [memberships, saved]);
  const churchName =
    memberships?.find((m) => m.churchId === churchId)?.churchName ?? "";

  // Papel da pessoa na igreja ativa.
  useEffect(() => {
    if (!user || !churchId) {
      setMember(null);
      return;
    }
    const key = `${user.uid}:${churchId}`;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const unsub = onSnapshot(
      doc(db(), "tenants", churchId, "members", user.uid),
      (snap) => {
        setMember({
          key,
          profile: snap.exists()
            ? ({ id: snap.id, ...(snap.data() as Omit<AppUser, "id">) } as AppUser)
            : null,
        });
      },
      () => {
        setMember({ key, profile: null });
        retry = setTimeout(() => setReloadKey((k) => k + 1), 4000);
      },
    );
    return () => {
      unsub();
      if (retry) clearTimeout(retry);
    };
  }, [user, churchId, reloadKey]);

  const profileLoading =
    !!user && !!churchId && member?.key !== `${user.uid}:${churchId}`;
  const rawProfile = !profileLoading ? (member?.profile ?? null) : null;
  // Contas de família (role "responsavel") usam só o aplicativo.
  const profile =
    rawProfile && (rawProfile.role as string) !== "responsavel"
      ? rawProfile
      : null;

  let status: AuthStatus;
  if (!authReady) status = "loading";
  else if (!user) status = "signed-out";
  else if (memberships === null || profileLoading) status = "loading";
  else if (!churchId || picker) status = "needs-church";
  else if (!profile) status = "no-profile";
  else status = profile.active ? "ready" : "inactive";

  const selectChurch = useCallback((id: string) => {
    try {
      localStorage.setItem(CHURCH_KEY, id);
    } catch {
      /* sem acesso ao storage */
    }
    setSaved(id);
    setPicker(false);
    // Recomeça as leituras para pegar o vínculo recém-criado.
    setReloadKey((k) => k + 1);
  }, []);
  const openChurchPicker = useCallback(() => setPicker(true), []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth(), email.trim(), password);
  }, []);

  /** Login social por janela (popup). Fechar a janela nao e erro. */
  const socialSignIn = useCallback(
    async (provider: GoogleAuthProvider | OAuthProvider) => {
      try {
        const cred = await signInWithPopup(auth(), provider);
        const u = cred.user;
        await ensureUserDoc(
          u.uid,
          u.displayName ?? u.email ?? "Sem nome",
          u.email ?? "",
        ).catch(() => undefined);
      } catch (e) {
        const code = (e as { code?: string })?.code;
        if (
          code === "auth/popup-closed-by-user" ||
          code === "auth/cancelled-popup-request"
        )
          return;
        throw e;
      }
    },
    [],
  );
  const signInWithGoogle = useCallback(async () => {
    const p = new GoogleAuthProvider();
    p.setCustomParameters({ prompt: "select_account" });
    await socialSignIn(p);
  }, [socialSignIn]);
  const signInWithApple = useCallback(async () => {
    const p = new OAuthProvider("apple.com");
    p.addScope("email");
    p.addScope("name");
    await socialSignIn(p);
  }, [socialSignIn]);

  const bootstrapAdmin = useCallback(
    async (
      churchName: string,
      name: string,
      email: string,
      password: string,
    ) => {
      const cred = await createUserWithEmailAndPassword(
        auth(),
        email.trim(),
        password,
      );
      try {
        await updateProfile(cred.user, { displayName: name.trim() });
        await ensureUserDoc(cred.user.uid, name, email);
        const id = await makeChurch(
          cred.user.uid,
          name,
          cred.user.email ?? email.trim(),
          churchName,
        );
        selectChurch(id);
      } catch (e) {
        await deleteUser(cred.user).catch(() => undefined);
        throw e;
      }
    },
    [selectChurch],
  );

  const createChurch = useCallback(
    async (churchName: string) => {
      if (!user) throw new Error("Entre na sua conta primeiro.");
      const id = await makeChurch(
        user.uid,
        user.displayName ?? user.email ?? "Administrador",
        user.email ?? "",
        churchName,
      );
      selectChurch(id);
    },
    [user, selectChurch],
  );

  const joinWithCode = useCallback(
    async (i: {
      code: string;
      name: string;
      email: string;
      password: string;
      role: StaffRole;
    }) => {
      const cred = await createUserWithEmailAndPassword(
        auth(),
        i.email.trim(),
        i.password,
      );
      try {
        // `codes/{código}` só pode ser lido por quem está logado: a conta é
        // criada antes de validar o código (e desfeita abaixo se não servir).
        const invite = await peekInvite(i.code);
        await updateProfile(cred.user, { displayName: i.name.trim() });
        await ensureUserDoc(cred.user.uid, i.name, i.email);
        await joinAsStaff(
          cred.user.uid,
          i.name,
          cred.user.email ?? i.email.trim(),
          invite,
          i.role,
        );
        selectChurch(invite.churchId);
      } catch (e) {
        await deleteUser(cred.user).catch(() => undefined);
        throw e;
      }
    },
    [selectChurch],
  );

  const joinChurchByCode = useCallback(
    async (code: string, role: StaffRole, expectedChurchId?: string) => {
      if (!user) throw new Error("Entre na sua conta primeiro.");
      const invite = await peekInvite(code);
      if (expectedChurchId && invite.churchId !== expectedChurchId)
        throw new Error("Esse código é de outra igreja.");
      await joinAsStaff(
        user.uid,
        user.displayName ?? user.email ?? "Sem nome",
        user.email ?? "",
        invite,
        role,
      );
      selectChurch(invite.churchId);
    },
    [user, selectChurch],
  );

  const linkFamilyByCode = useCallback(
    async (raw: string, churchId: string) => {
      if (!user) throw new Error("Entre na sua conta primeiro.");
      const code = raw.trim().toUpperCase();
      const c = (await getDoc(doc(db(), "codes", code))).data();
      if (!c) throw new Error("Código inválido. Confira com a recepção.");
      if (c.kind !== "family")
        throw new Error("Esse é um código de equipe. Use o código da família (LK-…).");
      if (c.churchId !== churchId) throw new Error("Esse código é de outra igreja.");
      const link = (
        await getDoc(doc(db(), "tenants", churchId, "familyLinks", code))
      ).data();
      if (!link || link.active !== true)
        throw new Error("Código da família inválido ou desativado.");
      try {
        await updateDoc(doc(db(), "tenants", churchId, "members", user.uid), {
          familyId: link.familyId,
          linkCode: code,
        });
        await setDoc(
          doc(db(), "users", user.uid, "memberships", churchId),
          { familyId: link.familyId },
          { merge: true },
        );
      } catch (e) {
        if ((e as { code?: string }).code === "permission-denied")
          throw new Error("Não foi possível vincular esta família.");
        throw e;
      }
    },
    [user],
  );

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth(), email.trim());
  }, []);
  const signOut = useCallback(async () => {
    await fbSignOut(auth());
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      profile,
      memberships: memberships ?? [],
      churchId,
      churchName,
      selectChurch,
      openChurchPicker,
      configured: firebaseConfigured,
      signIn,
      signInWithGoogle,
      signInWithApple,
      bootstrapAdmin,
      createChurch,
      joinWithCode,
      joinChurchByCode,
      linkFamilyByCode,
      resetPassword,
      signOut,
    }),
    [
      status,
      user,
      profile,
      memberships,
      churchId,
      churchName,
      selectChurch,
      openChurchPicker,
      signIn,
      signInWithGoogle,
      signInWithApple,
      bootstrapAdmin,
      createChurch,
      joinWithCode,
      joinChurchByCode,
      linkFamilyByCode,
      resetPassword,
      signOut,
    ],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth fora do AuthProvider");
  return c;
}
