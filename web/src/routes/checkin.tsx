import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LogIn,
  LogOut,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  can,
  openAttendance,
  pickupCandidates,
  validateCheckIn,
} from "@/lib/domain/rules";
import { time } from "@/lib/domain/labels";
import {
  EmptyState,
  KidAvatar,
  PageHeader,
  Panel,
  Restricted,
  StatusPill,
} from "@/components/app/ui-bits";
import {
  ErrorBanner,
  PageLoading,
  SearchBox,
  selectCls,
} from "@/components/app/page-bits";
import { ScanToggle, parseQr } from "@/components/app/qr-scanner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Child } from "@/lib/domain/types";

export const Route = createFileRoute("/checkin")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { modo?: "entrada" | "saida" } => ({
    modo:
      s.modo === "saida"
        ? "saida"
        : s.modo === "entrada"
          ? "entrada"
          : undefined,
  }),
  head: () => ({ meta: [{ title: "Check-in e check-out — Espaço Kids" }] }),
  component: CheckPage,
});

const OTHER = "__other__";

function CheckPage() {
  const { modo = "entrada" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { state, role, loading, checkIn, checkOut } = useStore();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Child | null>(null);
  const [who, setWho] = useState("");
  const [otherName, setOtherName] = useState("");
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{
    kind: "in" | "out";
    child: Child;
    by: string;
    at: string;
  } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const present = useMemo(
    () => state.children.filter((c) => openAttendance(state.attendance, c.id)),
    [state],
  );
  const pool =
    modo === "saida"
      ? present
      : state.children.filter((c) => c.status !== "inativo");
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (modo === "entrada" && !t) return [];
    return pool
      .filter(
        (c) =>
          !t ||
          c.fullName.toLowerCase().includes(t) ||
          c.nickname.toLowerCase().includes(t) ||
          c.code.toLowerCase().includes(t),
      )
      .slice(0, 12);
  }, [pool, q, modo]);

  if (!can(role, "checkin")) return <Restricted />;
  if (loading) return <PageLoading />;

  const reset = () => {
    setSel(null);
    setWho("");
    setOtherName("");
    setVerified(false);
    setProblem(null);
    setQ("");
    setDone(null);
  };
  const cls = (c: Child) => state.classes.find((x) => x.id === c.classId);
  const candidates = sel
    ? pickupCandidates(
        sel,
        state.guardians.filter((g) => g.active),
        state.authorized,
      )
    : [];
  const chosen = candidates.find((p) => p.id === who);
  const authorizedNow =
    !!sel &&
    !!chosen &&
    sel.authorizedIds.includes(chosen.id) &&
    !(
      chosen.kind === "autorizado" &&
      (() => {
        const a = state.authorized.find((x) => x.id === chosen.id);
        return !a || !a.active || new Date(a.validUntil) < new Date();
      })()
    );

  const onScan = (text: string) => {
    const token = parseQr(text);
    const badge = state.badges.find((b) => b.token === token);
    if (!badge) {
      toast.error("QR Code não reconhecido neste sistema.");
      return;
    }
    if (badge.status !== "ativo") {
      toast.error(`Crachá ${badge.status}. Emita um novo crachá.`);
      return;
    }
    if (new Date(badge.expiresAt) < new Date()) {
      toast.error("Crachá expirado. Reemita o crachá.");
      return;
    }
    const c = state.children.find((k) => k.id === badge.childId);
    if (!c) {
      toast.error("Cadastro não encontrado.");
      return;
    }
    pick(c);
  };

  const pick = (c: Child) => {
    setProblem(null);
    setWho("");
    setVerified(false);
    if (modo === "entrada") {
      const r = validateCheckIn(state, c);
      if (!r.ok) setProblem(r.reason);
    } else if (!openAttendance(state.attendance, c.id))
      setProblem("Não há entrada registrada para esta criança.");
    setSel(c);
  };

  const confirmIn = async () => {
    if (!sel) return;
    const name = who === OTHER ? otherName.trim() : chosen?.name;
    if (!name) return;
    setBusy(true);
    try {
      const r = await checkIn(sel.id, name);
      if (r.ok)
        setDone({
          kind: "in",
          child: sel,
          by: name,
          at: new Date().toISOString(),
        });
      else setProblem(r.reason);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Falha ao registrar a entrada.",
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmOut = async () => {
    if (!sel || !chosen) return;
    setBusy(true);
    try {
      const r = await checkOut(sel.id, chosen.id, chosen.name);
      if (r.ok)
        setDone({
          kind: "out",
          child: sel,
          by: chosen.name,
          at: new Date().toISOString(),
        });
      else setProblem(r.reason);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Falha ao registrar a saída.",
      );
    } finally {
      setBusy(false);
    }
  };

  const reportBlocked = async () => {
    if (!sel) return;
    const name =
      who === OTHER
        ? otherName.trim() || "Pessoa não identificada"
        : (chosen?.name ?? "Pessoa não identificada");
    setBusy(true);
    await checkOut(sel.id, who === OTHER ? "__none__" : who, name).catch(
      () => undefined,
    );
    setBusy(false);
    toast.warning("Tentativa registrada e coordenação notificada.");
  };

  if (done)
    return (
      <div className="mx-auto max-w-lg">
        <div className="card-surface p-8 text-center">
          <div
            className={cn(
              "mx-auto grid size-16 place-items-center rounded-full",
              done.kind === "in"
                ? "bg-success-soft text-success"
                : "bg-primary-soft text-primary",
            )}
          >
            <CheckCircle2 className="size-9" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">
            {done.kind === "in" ? "Entrada registrada" : "Saída registrada"}
          </h1>
          <div className="mt-4 flex items-center justify-center gap-3">
            <KidAvatar child={done.child} size="md" />
            <div className="text-left">
              <p className="font-semibold">{done.child.fullName}</p>
              <p className="text-sm text-muted-foreground">
                {cls(done.child)?.name} • {done.child.code}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {done.kind === "in" ? "Entregue por" : "Retirada por"}{" "}
            <strong className="text-foreground">{done.by}</strong> às{" "}
            {time(done.at)}
          </p>
          <Button size="lg" className="mt-6 h-12 w-full" onClick={reset}>
            {done.kind === "in" ? "Próxima criança" : "Concluir"}
          </Button>
        </div>
      </div>
    );

  return (
    <>
      <PageHeader
        title="Check-in e check-out"
        description="Atendimento rápido para a recepção."
      />
      <ErrorBanner />
      <Tabs
        value={modo}
        onValueChange={(v) => {
          reset();
          navigate({ search: { modo: v as "entrada" | "saida" } });
        }}
        className="mb-5"
      >
        <TabsList className="h-12 w-full sm:w-auto">
          <TabsTrigger
            value="entrada"
            className="h-10 flex-1 gap-2 px-6 text-base sm:flex-none"
          >
            <LogIn className="size-4" /> Entrada
          </TabsTrigger>
          <TabsTrigger
            value="saida"
            className="h-10 flex-1 gap-2 px-6 text-base sm:flex-none"
          >
            <LogOut className="size-4" /> Saída{" "}
            <span className="rounded-full bg-success-soft px-2 text-xs text-success">
              {present.length}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title={
            modo === "entrada"
              ? "1. Localizar a criança"
              : "1. Localizar a criança presente"
          }
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-start gap-3">
              <SearchBox
                value={q}
                onChange={setQ}
                placeholder="Nome, apelido ou código"
              />
              <ScanToggle onResult={onScan} />
            </div>
            {results.length === 0 ? (
              <EmptyState
                title={
                  modo === "entrada"
                    ? q
                      ? "Nenhuma criança encontrada"
                      : "Busque ou leia o QR Code"
                    : "Nenhuma criança presente"
                }
                text={
                  modo === "entrada" && !q
                    ? "Digite ao menos parte do nome ou do código."
                    : undefined
                }
              />
            ) : (
              <ul className="space-y-2">
                {results.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => pick(c)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted",
                        sel?.id === c.id && "border-primary bg-primary-soft",
                      )}
                    >
                      <KidAvatar child={c} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{c.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {cls(c)?.name} • {c.code}
                        </p>
                      </div>
                      {openAttendance(state.attendance, c.id) ? (
                        <StatusPill value="presente" label="Presente" />
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <Panel
          title={
            modo === "entrada"
              ? "2. Confirmar e registrar"
              : "2. Validar quem retira"
          }
        >
          {!sel ? (
            <EmptyState
              title="Selecione uma criança"
              text="Os dados e o fluxo de confirmação aparecem aqui."
            />
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-4 rounded-xl bg-muted/60 p-4">
                <KidAvatar child={sel} size="lg" />
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-tight">
                    {sel.fullName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {cls(sel)?.name} — {cls(sel)?.room}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {sel.code}
                  </p>
                  {sel.notes && <p className="mt-1 text-xs">{sel.notes}</p>}
                  {can(role, "saude") && sel.health && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-warning">
                      <AlertTriangle className="size-3.5" /> {sel.health}
                    </p>
                  )}
                  {sel.careAlert && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-warning">
                      <AlertTriangle className="size-3.5" /> Atenção: cuidados
                      especiais
                      {sel.hasMedication ? " e medicação" : ""}.
                      {can(role, "saude") ? "" : " Fale com a coordenação."}
                    </p>
                  )}
                </div>
              </div>

              {problem && (
                <div
                  role="alert"
                  className="flex gap-3 rounded-xl border border-destructive/30 bg-danger-soft p-4 text-sm text-destructive"
                >
                  <ShieldAlert className="size-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Não foi possível continuar</p>
                    <p>{problem}</p>
                  </div>
                </div>
              )}

              {!problem && modo === "entrada" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="who">Quem está entregando a criança?</Label>
                    <select
                      id="who"
                      className={selectCls + " h-11"}
                      value={who}
                      onChange={(e) => setWho(e.target.value)}
                    >
                      <option value="">Selecione…</option>
                      {candidates.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.relation}
                        </option>
                      ))}
                      <option value={OTHER}>Outra pessoa…</option>
                    </select>
                    {who === OTHER && (
                      <Input
                        autoFocus
                        placeholder="Nome de quem entregou"
                        value={otherName}
                        onChange={(e) => setOtherName(e.target.value)}
                        className="h-11"
                      />
                    )}
                  </div>
                  <Button
                    size="lg"
                    className="h-12 w-full text-base"
                    disabled={
                      busy ||
                      !who ||
                      (who === OTHER && otherName.trim().length < 3)
                    }
                    onClick={confirmIn}
                  >
                    {busy && <Loader2 className="animate-spin" />} Confirmar
                    entrada
                  </Button>
                </>
              )}

              {!problem && modo === "saida" && (
                <>
                  <div className="space-y-2">
                    <Label>Quem veio buscar?</Label>
                    <ul className="space-y-2">
                      {candidates.map((p) => {
                        const ok = sel.authorizedIds.includes(p.id);
                        return (
                          <li key={p.id}>
                            <button
                              onClick={() => {
                                setWho(p.id);
                                setVerified(false);
                              }}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:bg-muted",
                                who === p.id &&
                                  "border-primary bg-primary-soft",
                              )}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium">{p.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {p.relation}
                                </p>
                              </div>
                              <StatusPill
                                value={ok ? "ativo" : "cancelado"}
                                label={ok ? "Autorizado" : "Sem autorização"}
                                tone={ok ? "success" : "danger"}
                              />
                            </button>
                          </li>
                        );
                      })}
                      <li>
                        <button
                          onClick={() => {
                            setWho(OTHER);
                            setVerified(false);
                          }}
                          className={cn(
                            "w-full rounded-xl border border-dashed p-3 text-left text-sm hover:bg-muted",
                            who === OTHER && "border-primary bg-primary-soft",
                          )}
                        >
                          Outra pessoa (não cadastrada)
                        </button>
                      </li>
                    </ul>
                  </div>

                  {who === OTHER && (
                    <div
                      role="alert"
                      className="rounded-xl border border-destructive/30 bg-danger-soft p-4 text-sm text-destructive"
                    >
                      <p className="flex items-center gap-2 font-semibold">
                        <ShieldAlert className="size-4" /> Pessoa não cadastrada
                        — retirada bloqueada
                      </p>
                      <p className="mt-1">
                        Não entregue a criança. Chame a coordenação para validar
                        e cadastrar a autorização.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        disabled={busy}
                        onClick={reportBlocked}
                      >
                        Registrar tentativa e avisar coordenação
                      </Button>
                    </div>
                  )}
                  {who && who !== OTHER && !authorizedNow && (
                    <div
                      role="alert"
                      className="rounded-xl border border-destructive/30 bg-danger-soft p-4 text-sm text-destructive"
                    >
                      <p className="flex items-center gap-2 font-semibold">
                        <ShieldAlert className="size-4" /> Pessoa NÃO autorizada
                        — retirada bloqueada
                      </p>
                      <p className="mt-1">
                        Autorização ausente, vencida ou revogada. Oriente a
                        pessoa a aguardar e contate a coordenação.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        disabled={busy}
                        onClick={reportBlocked}
                      >
                        Registrar tentativa e avisar coordenação
                      </Button>
                    </div>
                  )}
                  {who && who !== OTHER && authorizedNow && (
                    <div className="space-y-4">
                      <div className="flex gap-3 rounded-xl border border-success/30 bg-success-soft p-4 text-sm text-success">
                        <ShieldCheck className="size-5 shrink-0" />
                        <div>
                          <p className="font-semibold">Pessoa autorizada</p>
                          <p>
                            Confirme a identidade com documento com foto antes
                            de liberar.
                          </p>
                        </div>
                      </div>
                      <label className="flex cursor-pointer items-start gap-3 text-sm">
                        <Checkbox
                          checked={verified}
                          onCheckedChange={(v) => setVerified(v === true)}
                          className="mt-0.5"
                        />
                        Conferi a identidade de {chosen?.name} e a criança está
                        com a pessoa certa.
                      </label>
                      <Button
                        size="lg"
                        className="h-12 w-full text-base"
                        disabled={busy || !verified}
                        onClick={confirmOut}
                      >
                        {busy && <Loader2 className="animate-spin" />} Confirmar
                        saída
                      </Button>
                    </div>
                  )}
                </>
              )}

              <Button variant="ghost" size="sm" onClick={reset}>
                <ArrowLeft /> Escolher outra criança
              </Button>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
