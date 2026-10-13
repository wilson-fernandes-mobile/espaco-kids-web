import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BellRing,
  CheckCheck,
  Info,
  Loader2,
  Phone,
  Siren,
  UserCheck,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { can, openAttendance } from "@/lib/domain/rules";
import { callMessage } from "@/lib/whatsapp";
import { WhatsAppButton } from "@/components/app/whatsapp-button";
import { CALL_REASON, CALL_STATUS, ago, dateTime } from "@/lib/domain/labels";
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
  attempt,
  selectCls,
} from "@/components/app/page-bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CallReason, Child, GuardianCall } from "@/lib/domain/types";

export const Route = createFileRoute("/chamadas")({
  head: () => ({
    meta: [{ title: "Chamadas aos responsáveis — Espaço Kids" }],
  }),
  component: CallsPage,
});

const OPEN = ["pendente", "enviada", "recebida", "visualizada"];
const NEXT: Partial<Record<GuardianCall["status"], GuardianCall["status"]>> = {
  pendente: "enviada",
  enviada: "recebida",
  recebida: "visualizada",
};

function CallsPage() {
  const { state, role, loading, openCall, setCallStatus } = useStore();
  const { profile } = useAuth();
  const [view, setView] = useState<"ativas" | "todas">("ativas");
  const [target, setTarget] = useState<Child | null>(null);
  const [reason, setReason] = useState<CallReason>("atendimento");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const myClasses = role === "professor" ? (profile?.classIds ?? []) : null;
  const inScope = (classId: string) =>
    !myClasses || myClasses.includes(classId);

  const present = useMemo(
    () =>
      state.children
        .filter(
          (c) => openAttendance(state.attendance, c.id) && inScope(c.classId),
        )
        .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, myClasses?.join(",")],
  );
  const calls = useMemo(() => {
    const list = state.calls.filter(
      (c) => view === "todas" || OPEN.includes(c.status),
    );
    // Professor: solicitações da própria turma primeiro; coordenação vê todas.
    return [...list].sort(
      (a, b) =>
        Number(inScope(b.classId)) - Number(inScope(a.classId)) ||
        b.createdAt.localeCompare(a.createdAt),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.calls, view, myClasses?.join(",")]);

  if (!can(role, "chamadas")) return <Restricted />;
  if (loading) return <PageLoading />;

  const child = (id: string) => state.children.find((c) => c.id === id);
  const clsName = (id: string) =>
    state.classes.find((c) => c.id === id)?.name ?? "—";
  const hasOpen = (childId: string) =>
    state.calls.some((c) => c.childId === childId && OPEN.includes(c.status));
  const pending = state.calls.filter((c) => OPEN.includes(c.status)).length;

  const confirm = async () => {
    if (!target) return;
    setBusy(true);
    const ok = await attempt(
      () => openCall(target.id, reason, note.trim() || undefined),
      "Chamada registrada.",
    );
    setBusy(false);
    if (ok) {
      setTarget(null);
      setNote("");
      setReason("atendimento");
    }
  };

  return (
    <>
      <PageHeader
        title="Chamadas aos responsáveis"
        description={`${pending} em aberto`}
      />
      <ErrorBanner />
      <div className="mb-5 flex gap-3 rounded-xl border border-primary/20 bg-primary-soft/50 p-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          As chamadas ficam registradas aqui. Enquanto o <strong>push</strong>{" "}
          do aplicativo não existe, use o botão{" "}
          <strong>Chamar no WhatsApp</strong> (a mensagem sai pronta, sem o
          motivo) ou ligue. Nada é enviado automaticamente pelo sistema.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel
          title={
            role === "professor"
              ? "Crianças presentes na sua turma"
              : "Crianças presentes"
          }
          className="lg:col-span-2"
        >
          {present.length === 0 ? (
            <EmptyState
              title="Nenhuma criança presente"
              text={
                role === "professor" && !myClasses?.length
                  ? "Você ainda não foi vinculado a uma turma. Fale com a coordenação."
                  : "Faça o check-in para que apareçam aqui."
              }
            />
          ) : (
            <ul className="-my-2 max-h-[32rem] divide-y overflow-y-auto">
              {present.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                  <KidAvatar child={c} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {clsName(c.classId)}
                    </p>
                  </div>
                  {hasOpen(c.id) ? (
                    <StatusPill
                      value="pendente"
                      label="Chamada aberta"
                      tone="warning"
                    />
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTarget(c)}
                    >
                      <BellRing /> Chamar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <section className="card-surface lg:col-span-3">
          <header className="flex items-center justify-between gap-3 border-b px-5 py-3">
            <h2 className="text-sm font-semibold">Central de atendimento</h2>
            <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
              <TabsList className="h-8">
                <TabsTrigger value="ativas" className="text-xs">
                  Em aberto
                </TabsTrigger>
                <TabsTrigger value="todas" className="text-xs">
                  Todas
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </header>
          <div className="p-5">
            {calls.length === 0 ? (
              <EmptyState
                icon={Siren}
                title="Nenhuma chamada"
                text="Quando um professor solicitar um responsável, aparecerá aqui."
              />
            ) : (
              <ul className="space-y-3">
                {calls.slice(0, 50).map((c) => {
                  const k = child(c.childId);
                  const open = OPEN.includes(c.status);
                  const guardians = k
                    ? state.guardians.filter((g) =>
                        k.guardianIds.includes(g.id),
                      )
                    : [];
                  return (
                    <li
                      key={c.id}
                      className={`rounded-xl border p-4 ${open ? "bg-danger-soft/30" : ""}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {k && <KidAvatar child={k} size="sm" />}
                          <div>
                            <p className="font-semibold">
                              {k?.fullName ?? "Cadastro removido"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {clsName(c.classId)} • {CALL_REASON[c.reason]} •{" "}
                              {c.requestedBy} • {ago(c.createdAt)}
                            </p>
                          </div>
                        </div>
                        <StatusPill
                          value={c.status}
                          label={CALL_STATUS[c.status]}
                        />
                      </div>
                      {c.note && <p className="mt-2 text-sm">{c.note}</p>}
                      {guardians.length > 0 && open && (
                        <ul className="mt-3 space-y-2">
                          {guardians.map((g) => (
                            <li
                              key={g.id}
                              className="flex flex-wrap items-center gap-2 rounded-lg bg-background/70 px-3 py-2 text-sm"
                            >
                              <span className="font-medium">{g.fullName}</span>
                              <span className="text-xs text-muted-foreground">
                                {g.relation} • {g.phone}
                              </span>
                              <span className="ml-auto flex gap-2">
                                <WhatsAppButton
                                  guardian={g}
                                  label="Chamar no WhatsApp"
                                  message={callMessage({
                                    guardian: g.fullName,
                                    child: k?.nickname ?? "criança",
                                    className: clsName(c.classId),
                                    church: state.settings.name,
                                  })}
                                  onOpen={() => {
                                    if (c.status === "pendente")
                                      attempt(() =>
                                        setCallStatus(c.id, "enviada"),
                                      );
                                  }}
                                />
                                <Button asChild variant="outline" size="sm">
                                  <a
                                    href={`tel:${g.phone.replace(/[^\d+]/g, "")}`}
                                  >
                                    <Phone /> Ligar
                                  </a>
                                </Button>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {guardians.length === 0 && open && (
                        <p className="mt-2 text-xs text-destructive">
                          Nenhum responsável vinculado a esta criança.
                        </p>
                      )}
                      <ol className="mt-2 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                        {c.history.map((h, i) => (
                          <li key={i}>
                            {CALL_STATUS[h.status]} {dateTime(h.at).slice(-5)}
                          </li>
                        ))}
                      </ol>
                      {open && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {NEXT[c.status] && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                attempt(() =>
                                  setCallStatus(c.id, NEXT[c.status]!),
                                )
                              }
                            >
                              <CheckCheck /> Marcar como{" "}
                              {CALL_STATUS[NEXT[c.status]!].toLowerCase()}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() =>
                              attempt(
                                () => setCallStatus(c.id, "atendida"),
                                "Responsável atendido.",
                              )
                            }
                          >
                            <UserCheck /> Responsável chegou
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              attempt(
                                () => setCallStatus(c.id, "cancelada"),
                                "Chamada cancelada.",
                              )
                            }
                          >
                            <X /> Cancelar
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chamar responsável de {target?.nickname}</DialogTitle>
            <DialogDescription>
              Os responsáveis cadastrados serão identificados automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="motivo">Motivo</Label>
              <select
                id="motivo"
                className={selectCls + " h-11"}
                value={reason}
                onChange={(e) => setReason(e.target.value as CallReason)}
              >
                {(Object.keys(CALL_REASON) as CallReason[]).map((r) => (
                  <option key={r} value={r}>
                    {CALL_REASON[r]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="obs">Observação interna (opcional)</Label>
              <Textarea
                id="obs"
                rows={3}
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Visível só para a equipe"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Informações médicas ou motivos sensíveis nunca são incluídos em
              notificações exibidas na tela bloqueada.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancelar
            </Button>
            <Button disabled={busy} onClick={confirm}>
              {busy && <Loader2 className="animate-spin" />}Confirmar chamada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
