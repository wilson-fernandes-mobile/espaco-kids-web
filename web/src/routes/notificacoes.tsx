import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bell, CheckCheck, Megaphone, Send } from "lucide-react";
import { useStore } from "@/lib/store";
import { can } from "@/lib/domain/rules";
import { NOTIF_CAT, dateTime } from "@/lib/domain/labels";
import {
  EmptyState,
  PageHeader,
  Panel,
  Restricted,
  StatusPill,
} from "@/components/app/ui-bits";
import {
  ErrorBanner,
  PageLoading,
  Pager,
  attempt,
  usePagination,
} from "@/components/app/page-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { NotificationCategory } from "@/lib/domain/types";

export const Route = createFileRoute("/notificacoes")({
  head: () => ({ meta: [{ title: "Notificações — Espaço Kids" }] }),
  component: NotificationsPage,
});

const DELIVERY = {
  local: "Registrada no sistema",
  simulada: "Simulada",
  pendente: "Aguardando canal",
} as const;

function NotificationsPage() {
  const { state, role, loading, markAllRead, sendAnnouncement } = useStore();
  const [cat, setCat] = useState<"" | NotificationCategory>("");
  const [open, setOpen] = useState<string | null>(null);
  const [compose, setCompose] = useState(false);
  const [title, setTitle] = useState("");
  const [to, setTo] = useState("Todas as famílias");

  const rows = useMemo(
    () => state.notifications.filter((n) => !cat || n.category === cat),
    [state.notifications, cat],
  );
  const pg = usePagination(rows, 12);
  if (!can(role, "notificacoes")) return <Restricted />;
  if (loading) return <PageLoading />;
  const unread = state.notifications.filter((n) => !n.read).length;
  const canCompose = role === "admin" || role === "coordenacao";

  return (
    <>
      <PageHeader
        title="Notificações"
        description={`${unread} não lida(s)`}
        actions={
          <>
            {canCompose && (
              <Button variant="outline" onClick={() => setCompose(true)}>
                <Megaphone /> Novo comunicado
              </Button>
            )}
            <Button
              variant="outline"
              disabled={!unread}
              onClick={() => attempt(markAllRead, "Todas marcadas como lidas.")}
            >
              <CheckCheck /> Marcar como lidas
            </Button>
          </>
        }
      />
      <ErrorBanner />
      <div className="mb-5 rounded-xl border border-warning/30 bg-warning-soft/60 p-3 text-sm">
        Os eventos abaixo ficam <strong>registrados no sistema</strong>. O envio
        real por push, WhatsApp ou e-mail ainda não está ativo — será conectado
        na próxima etapa.
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [["", "Todas"], ...Object.entries(NOTIF_CAT)] as [string, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setCat(k as typeof cat)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              cat === k
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:bg-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="card-surface">
        {rows.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Nenhuma notificação"
            text="Eventos de chamadas, presença e alertas aparecem aqui."
          />
        ) : (
          <>
            <ul className="divide-y">
              {pg.slice.map((n) => (
                <li key={n.id}>
                  <button
                    className="flex w-full items-start gap-3 p-4 text-left hover:bg-muted/50"
                    onClick={() => setOpen(open === n.id ? null : n.id)}
                  >
                    <span
                      className={cn(
                        "mt-2 size-2 shrink-0 rounded-full",
                        n.read ? "bg-transparent" : "bg-primary",
                      )}
                      aria-label={n.read ? "Lida" : "Não lida"}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm", !n.read && "font-semibold")}>
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {NOTIF_CAT[n.category]} • {dateTime(n.createdAt)} •
                        Para: {n.recipient}
                      </p>
                      {open === n.id && (
                        <dl className="mt-3 grid gap-1 rounded-lg bg-muted/60 p-3 text-xs sm:grid-cols-2">
                          <div>
                            <dt className="text-muted-foreground">
                              Situação de entrega
                            </dt>
                            <dd className="font-medium">
                              {DELIVERY[n.delivery]}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">
                              Destinatário
                            </dt>
                            <dd className="font-medium">{n.recipient}</dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className="text-muted-foreground">Histórico</dt>
                            <dd className="font-medium">
                              Criada em {dateTime(n.createdAt)} •{" "}
                              {n.read ? "marcada como lida" : "ainda não lida"}
                            </dd>
                          </div>
                        </dl>
                      )}
                    </div>
                    <StatusPill
                      value={n.delivery}
                      label={DELIVERY[n.delivery]}
                      tone={n.delivery === "pendente" ? "warning" : "neutral"}
                    />
                  </button>
                </li>
              ))}
            </ul>
            <Pager {...pg} />
          </>
        )}
      </div>

      <Dialog open={compose} onOpenChange={setCompose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo comunicado</DialogTitle>
            <DialogDescription>
              Fica registrado na central. Entrega externa será habilitada com o
              app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ct">Mensagem</Label>
              <Input
                id="ct"
                value={title}
                maxLength={140}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Ensaio da cantata no sábado às 15h"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cd">Destinatários</Label>
              <Input
                id="cd"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompose(false)}>
              Cancelar
            </Button>
            <Button
              disabled={title.trim().length < 5}
              onClick={async () => {
                if (
                  await attempt(
                    () =>
                      sendAnnouncement(
                        title.trim(),
                        to.trim() || "Todas as famílias",
                      ),
                    "Comunicado registrado.",
                  )
                ) {
                  setCompose(false);
                  setTitle("");
                }
              }}
            >
              <Send /> Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
