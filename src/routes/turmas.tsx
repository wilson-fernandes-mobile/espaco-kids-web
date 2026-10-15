import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  Clock,
  DoorOpen,
  Loader2,
  Pencil,
  Plus,
  QrCode,
  Printer,
  School,
  UserRound,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { RoomTag } from "@/components/app/room-tag";
import { can, occupancy } from "@/lib/domain/rules";
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
  Field,
  PageLoading,
  attempt,
  selectCls,
} from "@/components/app/page-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { ClassRoom } from "@/lib/domain/types";

export const Route = createFileRoute("/turmas")({
  head: () => ({ meta: [{ title: "Turmas e salas — Espaço Kids" }] }),
  component: ClassesPage,
});

const schema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome da turma"),
    ageMin: z.coerce.number().int().min(0, "Mínimo 0").max(17),
    ageMax: z.coerce.number().int().min(0).max(17),
    room: z.string().trim().min(1, "Informe a sala"),
    capacity: z.coerce.number().int().min(1, "Mínimo 1").max(200),
    teachers: z.string().trim(),
    schedule: z.string().trim().min(1, "Informe dias e horários"),
    color: z.enum(["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"]),
    active: z.boolean(),
  })
  .refine((v) => v.ageMax >= v.ageMin, {
    path: ["ageMax"],
    message: "Deve ser maior ou igual à idade mínima",
  });
type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

const COLORS: ClassRoom["color"][] = [
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
];

function ClassDialog({
  open,
  initial,
  onClose,
}: {
  open: boolean;
  initial?: ClassRoom;
  onClose: () => void;
}) {
  const { saveClass } = useStore();
  const f = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    values: {
      name: initial?.name ?? "",
      ageMin: initial?.ageMin ?? 0,
      ageMax: initial?.ageMax ?? 3,
      room: initial?.room ?? "",
      capacity: initial?.capacity ?? 12,
      teachers: initial?.teachers.join(", ") ?? "",
      schedule: initial?.schedule ?? "Dom 9h",
      color: initial?.color ?? "chart-1",
      active: initial?.active ?? true,
    },
  });
  const e = f.formState.errors;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar turma" : "Nova turma"}</DialogTitle>
          <DialogDescription>
            Defina faixa etária, sala e capacidade.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={f.handleSubmit(async (v) => {
            const ok = await attempt(
              () =>
                saveClass({
                  ...v,
                  teachers: v.teachers
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                  id: initial?.id,
                }),
              "Turma salva.",
            );
            if (ok) onClose();
          })}
        >
          <Field label="Nome da turma *" error={e.name?.message}>
            <Input {...f.register("name")} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Idade mínima" error={e.ageMin?.message}>
              <Input type="number" min={0} {...f.register("ageMin")} />
            </Field>
            <Field label="Idade máxima" error={e.ageMax?.message}>
              <Input type="number" min={0} {...f.register("ageMax")} />
            </Field>
            <Field label="Sala / ambiente *" error={e.room?.message}>
              <Input {...f.register("room")} />
            </Field>
            <Field label="Capacidade máxima *" error={e.capacity?.message}>
              <Input type="number" min={1} {...f.register("capacity")} />
            </Field>
          </div>
          <Field
            label="Professores e auxiliares"
            hint="Separe os nomes por vírgula."
          >
            <Input {...f.register("teachers")} />
          </Field>
          <Field label="Dias e horários *" error={e.schedule?.message}>
            <Input
              placeholder="Dom 9h e 18h • Qua 19h30"
              {...f.register("schedule")}
            />
          </Field>
          <Field label="Cor nos gráficos">
            <select className={selectCls} {...f.register("color")}>
              {COLORS.map((c, i) => (
                <option key={c} value={c}>
                  Cor {i + 1}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center justify-between rounded-md border p-3 text-sm">
            Turma ativa
            <Switch
              checked={f.watch("active")}
              onCheckedChange={(v) => f.setValue("active", v)}
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={f.formState.isSubmitting}>
              {f.formState.isSubmitting && <Loader2 className="animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ClassesPage() {
  const { state, role, loading } = useStore();
  const [edit, setEdit] = useState<ClassRoom | "new" | null>(null);
  const [view, setView] = useState<ClassRoom | null>(null);
  const [tag, setTag] = useState<ClassRoom | null>(null);
  const { churchId, churchName } = useAuth();
  if (!can(role, "turmas")) return <Restricted />;
  if (loading) return <PageLoading />;
  const manage = role === "admin" || role === "coordenacao";
  const alertPct = state.settings.rules.alertCapacityPct;

  return (
    <>
      <PageHeader
        title="Turmas e salas"
        description="Ocupação em tempo real e configuração dos ambientes."
        actions={
          manage && (
            <Button onClick={() => setEdit("new")}>
              <Plus /> Nova turma
            </Button>
          )
        }
      />
      <ErrorBanner />
      {state.classes.length === 0 ? (
        <Panel>
          <EmptyState
            icon={School}
            title="Nenhuma turma cadastrada"
            text="Crie as turmas por faixa etária para começar a matricular crianças."
            action={
              manage && (
                <Button onClick={() => setEdit("new")}>
                  <Plus /> Nova turma
                </Button>
              )
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {state.classes.map((c) => {
            const occ = occupancy(state, c.id);
            const pct = Math.round((occ / c.capacity) * 100);
            const enrolled = state.children.filter(
              (k) => k.classId === c.id && k.status === "ativo",
            ).length;
            const warn = pct >= alertPct;
            return (
              <article key={c.id} className="card-surface flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold">{c.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {c.ageMin}–{c.ageMax} anos
                    </p>
                  </div>
                  <StatusPill
                    value={c.active ? "ativo" : "inativo"}
                    label={c.active ? "Ativa" : "Inativa"}
                  />
                </div>
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      Ocupação agora
                    </span>
                    <span className="font-semibold tabular-nums">
                      {occ}/{c.capacity} ({pct}%)
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Ocupação de ${c.name}`}
                  >
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        pct >= 100
                          ? "bg-destructive"
                          : warn
                            ? "bg-warning"
                            : "bg-success",
                      )}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  {warn && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-warning">
                      <AlertTriangle className="size-3.5" />
                      {pct >= 100
                        ? "Capacidade esgotada"
                        : "Próxima do limite de capacidade"}
                    </p>
                  )}
                </div>
                <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <DoorOpen className="size-4" />
                    {c.room}
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="size-4" />
                    {c.schedule}
                  </li>
                  <li className="flex items-center gap-2">
                    <UserRound className="size-4" />
                    {c.teachers.join(", ") || "Sem professor definido"}
                  </li>
                </ul>
                <div className="mt-auto flex gap-2 pt-5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setView(c)}
                  >
                    {enrolled} matriculadas
                  </Button>
                  {manage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Etiqueta da sala ${c.name}`}
                      title="Etiqueta da sala (QR para a equipe)"
                      onClick={() => setTag(c)}
                    >
                      <QrCode />
                    </Button>
                  )}
                  {manage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar ${c.name}`}
                      onClick={() => setEdit(c)}
                    >
                      <Pencil />
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <ClassDialog
        open={edit !== null}
        initial={edit && edit !== "new" ? edit : undefined}
        onClose={() => setEdit(null)}
      />
      <Dialog open={!!tag} onOpenChange={(o) => !o && setTag(null)}>
        <DialogContent className="no-print sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Etiqueta da sala</DialogTitle>
            <DialogDescription>
              Imprima e cole na porta. A equipe lê o QR no app (Ler crachá ou
              sala) para fazer check-in na sala; os pais veem quem está com os
              filhos. Entrar em outra sala faz o check-out da anterior.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center overflow-x-auto py-2">
            {tag && churchId && (
              <RoomTag
                cls={tag}
                churchId={churchId}
                churchName={churchName ?? undefined}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTag(null)}>
              Fechar
            </Button>
            <Button onClick={() => window.print()}>
              <Printer /> Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="print-only">
        {tag && churchId && (
          <RoomTag
            cls={tag}
            churchId={churchId}
            churchName={churchName ?? undefined}
          />
        )}
      </div>
      <Sheet open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{view?.name}</SheetTitle>
            <SheetDescription>Crianças matriculadas</SheetDescription>
          </SheetHeader>
          <ul className="mt-4 divide-y overflow-y-auto">
            {state.children
              .filter((k) => k.classId === view?.id)
              .map((k) => (
                <li key={k.id} className="flex items-center gap-3 py-2.5">
                  <KidAvatar child={k} size="sm" />
                  {role === "professor" ? (
                    <span className="flex-1 text-sm font-medium">
                      {k.fullName}
                    </span>
                  ) : (
                    <Link
                      to="/criancas/$id"
                      params={{ id: k.id }}
                      className="flex-1 text-sm font-medium hover:text-primary"
                    >
                      {k.fullName}
                    </Link>
                  )}
                  <span className="font-mono text-xs text-muted-foreground">
                    {k.code}
                  </span>
                </li>
              ))}
            {!state.children.some((k) => k.classId === view?.id) && (
              <li className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma criança matriculada.
              </li>
            )}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
