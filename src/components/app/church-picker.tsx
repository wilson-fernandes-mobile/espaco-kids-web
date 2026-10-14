import { useEffect, useState } from "react";
import { AppLogo } from "@/components/app/app-logo";
import { doc, onSnapshot } from "firebase/firestore";
import { Church, KeyRound, Loader2, LogOut, Plus, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authErrorMessage, useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase/client";
import { ROLE_LABEL } from "@/lib/domain/rules";
import type { Role } from "@/lib/domain/types";

/** Logo da igreja (campo `logoUrl` do doc da igreja) ou o ícone padrão, no mesmo formato do menu lateral. */
function ChurchLogo({ churchId, family }: { churchId: string; family: boolean }) {
  const [logo, setLogo] = useState<string | null>(null);
  useEffect(
    () =>
      onSnapshot(
        doc(db(), "tenants", churchId),
        (s) => setLogo((s.data()?.logoUrl as string | undefined) || null),
        () => setLogo(null),
      ),
    [churchId],
  );
  if (logo)
    return (
      <img
        src={logo}
        alt=""
        className="size-10 shrink-0 rounded-xl bg-card object-cover"
      />
    );
  return (
    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
      {family ? <Smartphone className="size-5" /> : <Church className="size-5" />}
    </div>
  );
}

const roleLabel = (r: string) =>
  r === "responsavel" ? "Família (use o app)" : (ROLE_LABEL[r as Role] ?? r);

/**
 * Escolher a igreja ativa, entrar noutra com código de convite ou criar uma
 * nova. A mesma conta pode ter papéis diferentes em cada igreja.
 */
export function ChurchPicker() {
  const {
    memberships,
    churchId,
    selectChurch,
    joinChurchByCode,
    linkFamilyByCode,
    createChurch,
    signOut,
    user,
  } = useAuth();
  const [code, setCode] = useState("");
  const [role, setRole] = useState<"professor" | "recepcao">("professor");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<"join" | "create" | "extra" | null>(null);
  // Ação extra numa igreja da lista: virar voluntário (família) ou vincular a família (equipe).
  const [extra, setExtra] = useState<{
    churchId: string;
    mode: "volunteer" | "family";
  } | null>(null);
  const [extraCode, setExtraCode] = useState("");
  const [extraRole, setExtraRole] = useState<"professor" | "recepcao">("professor");
  const doExtra = async () => {
    if (!extra) return;
    setBusy("extra");
    try {
      if (extra.mode === "volunteer")
        await joinChurchByCode(extraCode, extraRole, extra.churchId);
      else await linkFamilyByCode(extraCode, extra.churchId);
      toast.success(
        extra.mode === "volunteer"
          ? "Pronto! Você agora também é da equipe."
          : "Pronto! Seus filhos foram vinculados.",
      );
      setExtra(null);
      setExtraCode("");
      if (extra.mode === "volunteer") selectChurch(extra.churchId);
    } catch (e) {
      toast.error(authErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const join = async () => {
    setBusy("join");
    try {
      await joinChurchByCode(code, role);
      toast.success("Você entrou na igreja.");
    } catch (e) {
      toast.error(authErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  const create = async () => {
    setBusy("create");
    try {
      await createChurch(name);
      toast.success("Igreja criada. Você é o administrador.");
    } catch (e) {
      toast.error(authErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center">
          <AppLogo className="mx-auto size-12 rounded-2xl" />
          <h1 className="mt-3 text-xl font-bold">Suas igrejas</h1>
          <p className="text-sm text-muted-foreground">
            {user?.email} · escolha onde quer entrar agora.
          </p>
        </div>

        {memberships.length > 0 && (
          <div className="card-surface divide-y overflow-hidden">
            {memberships.map((m) => {
              const isFamily = m.role === "responsavel";
              const semFamilia = !isFamily && !m.familyId;
              const aberto = extra?.churchId === m.churchId ? extra.mode : null;
              return (
              <div key={m.churchId}>
              <button
                onClick={() => selectChurch(m.churchId)}
                className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted"
              >
                <ChurchLogo churchId={m.churchId} family={m.role === "responsavel"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{m.churchName}</p>
                  <p className="text-xs text-muted-foreground">
                    {roleLabel(m.role)}
                  </p>
                </div>
                {m.churchId === churchId && (
                  <span className="text-xs font-medium text-primary">
                    atual
                  </span>
                )}
              </button>
              {(isFamily || semFamilia) && (
                <div className="px-4 pb-3 pl-[4.5rem]">
                  {!aberto ? (
                    <button
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => {
                        setExtra({
                          churchId: m.churchId,
                          mode: isFamily ? "volunteer" : "family",
                        });
                        setExtraCode("");
                      }}
                    >
                      {isFamily ? "Entrar como voluntário" : "Vincular minha família"}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {aberto === "volunteer"
                          ? "Digite o código da equipe. Você continua com o acesso da família."
                          : "Digite o código da família (LK-…) para ver seus filhos."}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Input
                          className="h-9 w-44"
                          placeholder={aberto === "volunteer" ? "KIDS-XXXXXX" : "LK-XXXXXX"}
                          value={extraCode}
                          onChange={(e) => setExtraCode(e.target.value.toUpperCase())}
                        />
                        {aberto === "volunteer" && (
                          <select
                            value={extraRole}
                            onChange={(e) =>
                              setExtraRole(e.target.value as "professor" | "recepcao")
                            }
                            className="h-9 rounded-md border bg-background px-2 text-sm"
                          >
                            <option value="professor">Professor(a)</option>
                            <option value="recepcao">Recepção</option>
                          </select>
                        )}
                        <Button
                          size="sm"
                          onClick={doExtra}
                          disabled={busy !== null || extraCode.trim().length < 6}
                        >
                          {busy === "extra" && <Loader2 className="animate-spin" />}{" "}
                          Confirmar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setExtra(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              </div>
              );
            })}
          </div>
        )}

        <div className="card-surface space-y-3 p-5">
          <p className="flex items-center gap-2 font-semibold">
            <KeyRound className="size-4" /> Entrar com código de convite
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                placeholder="KIDS-XXXXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Função</Label>
              <select
                id="role"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "professor" | "recepcao")
                }
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="professor">Professor(a)</option>
                <option value="recepcao">Recepção</option>
              </select>
            </div>
          </div>
          <Button
            onClick={join}
            disabled={busy !== null || code.trim().length < 6}
          >
            {busy === "join" && <Loader2 className="animate-spin" />} Entrar
          </Button>
          <p className="text-xs text-muted-foreground">
            Código de família? Famílias usam o aplicativo Espaço Kids.
          </p>
        </div>

        <div className="card-surface space-y-3 p-5">
          <p className="flex items-center gap-2 font-semibold">
            <Plus className="size-4" /> Criar uma nova igreja
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="church-name">Nome da igreja</Label>
            <Input
              id="church-name"
              placeholder="Ex.: Igreja Esperança"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={create}
            disabled={busy !== null || name.trim().length < 3}
          >
            {busy === "create" && <Loader2 className="animate-spin" />} Criar
            igreja
          </Button>
        </div>

        <div className="text-center">
          <Button variant="ghost" onClick={() => signOut()}>
            <LogOut /> Sair da conta
          </Button>
        </div>
      </div>
    </div>
  );
}
