import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { date, dateTime } from "@/lib/domain/labels";
import type { ClassTask, TaskLink } from "@/lib/domain/types";
import { EmptyState, StatusPill } from "@/components/app/ui-bits";
import { attempt, Field, selectCls } from "@/components/app/page-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MAX_LINKS = 5;
const isUrl = (v: string) => /^https?:\/\/\S+\.\S+/i.test(v.trim());

const DAY = 86_400_000;

/** Prazo em linguagem natural: "Entrega hoje", "em 3 dias", "Venceu há 2 dias". */
function dueInfo(due: string, today: string) {
  const diff = Math.round((Date.parse(due) - Date.parse(today)) / DAY);
  if (diff === 0) return { text: "Entrega hoje", tone: "danger" as const };
  if (diff === 1) return { text: "Entrega amanhã", tone: "primary" as const };
  if (diff > 1)
    return {
      text: `Entrega em ${diff} dias`,
      tone: (diff <= 3 ? "primary" : "neutral") as "primary" | "neutral",
    };
  return {
    text: diff === -1 ? "Venceu ontem" : `Venceu há ${-diff} dias`,
    tone: "neutral" as const,
  };
}

/**
 * Tarefas por turma. O professor só gerencia as turmas dele. Com `classId`,
 * mostra só as dessa turma (aba do cadastro da criança).
 */
export function TaskPanel({ classId }: { classId?: string }) {
  const { state, role, saveTask, deleteTask } = useStore();
  const { profile } = useAuth();
  const [editing, setEditing] = useState<ClassTask | "new" | null>(null);
  const [classFilter, setClassFilter] = useState("");
  const [query, setQuery] = useState("");
  const [showPast, setShowPast] = useState(false);

  const isMod = role === "admin" || role === "coordenacao";
  const myClasses = state.classes.filter(
    (c) =>
      c.active !== false &&
      (isMod || profile?.classIds.includes(c.id)) &&
      (!classId || c.id === classId),
  );
  const className = (id: string) =>
    state.classes.find((c) => c.id === id)?.name ?? "Turma removida";
  const canTouch = (t: ClassTask) =>
    isMod || !!profile?.classIds.includes(t.classId);
  const today = new Date().toISOString().slice(0, 10);
  const q = query.trim().toLowerCase();
  const list = state.tasks.filter(
    (t) =>
      (classId
        ? t.classId === classId
        : !classFilter || t.classId === classFilter) &&
      (!q ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)),
  );
  // Em aberto: prazo mais próximo primeiro; sem prazo por último (mais novas antes).
  const open = list
    .filter((t) => !t.dueDate || t.dueDate >= today)
    .sort((a, b) =>
      a.dueDate && b.dueDate
        ? a.dueDate.localeCompare(b.dueDate)
        : a.dueDate
          ? -1
          : b.dueDate
            ? 1
            : b.createdAt.localeCompare(a.createdAt),
    );
  const past = list
    .filter((t) => t.dueDate && t.dueDate < today)
    .sort((a, b) => b.dueDate!.localeCompare(a.dueDate!));

  const card = (t: ClassTask, closed: boolean) => {
    const due = t.dueDate ? dueInfo(t.dueDate, today) : null;
    return (
      <li
        key={t.id}
        className={`rounded-lg border bg-card p-4 ${closed ? "opacity-70" : ""}`}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-sm font-semibold">{t.title}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {!classId && (
                <StatusPill
                  value="turma"
                  label={className(t.classId)}
                  tone="primary"
                />
              )}
              {due && t.dueDate && (
                <StatusPill
                  value="prazo"
                  label={`${due.text} • ${date(t.dueDate)}`}
                  tone={due.tone}
                />
              )}
            </div>
          </div>
          {canTouch(t) && (
            <span className="flex shrink-0 gap-1">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Editar tarefa"
                onClick={() => setEditing(t)}
              >
                <Pencil />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Remover tarefa"
                onClick={() => {
                  if (confirm("Remover esta tarefa? As famílias deixam de vê-la."))
                    attempt(() => deleteTask(t.id), "Tarefa removida.");
                }}
              >
                <Trash2 />
              </Button>
            </span>
          )}
        </div>
        {t.description && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {t.description}
          </p>
        )}
        {t.links.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {t.links.map((l, i) => (
              <li key={i}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-primary hover:bg-accent"
                >
                  <ExternalLink className="size-3" /> {l.label || l.url}
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Criada {dateTime(t.createdAt)} por {t.authorName}
          {t.updatedAt ? " • editada" : ""}
        </p>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Buscar tarefa"
          className="sm:w-64"
          placeholder="Buscar tarefa…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {!classId && (
          <select
            aria-label="Filtrar por turma"
            className={`${selectCls} sm:w-56`}
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="">Todas as turmas</option>
            {state.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <Button
          className="ml-auto"
          disabled={myClasses.length === 0}
          onClick={() => setEditing("new")}
        >
          <Plus /> Nova tarefa
        </Button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nenhuma tarefa"
          text={
            myClasses.length === 0
              ? "Você ainda não está vinculado a uma turma. Peça à coordenação."
              : "Crie uma tarefa para a turma: as famílias recebem um aviso e veem tudo no app."
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{open.length}</strong> em
            aberto • <strong className="text-foreground">{past.length}</strong>{" "}
            encerrada{past.length === 1 ? "" : "s"}
          </p>
          {open.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Nenhuma tarefa em aberto.
            </p>
          ) : (
            <ul className="space-y-3">{open.map((t) => card(t, false))}</ul>
          )}
          {past.length > 0 && (
            <div className="space-y-3">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2"
                onClick={() => setShowPast((v) => !v)}
              >
                {showPast ? <ChevronUp /> : <ChevronDown />}
                {showPast ? "Ocultar" : "Mostrar"} encerradas ({past.length})
              </Button>
              {showPast && (
                <ul className="space-y-3">{past.map((t) => card(t, true))}</ul>
              )}
            </div>
          )}
        </>
      )}

      {editing && (
        <TaskDialog
          initial={editing === "new" ? undefined : editing}
          classes={myClasses}
          onClose={() => setEditing(null)}
          onSave={async (v) => {
            const ok = await attempt(
              () =>
                saveTask({
                  ...v,
                  id: editing === "new" ? undefined : editing.id,
                }),
              editing === "new"
                ? "Tarefa criada. As famílias foram avisadas."
                : "Tarefa salva.",
            );
            if (ok) setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function TaskDialog({
  initial,
  classes,
  onClose,
  onSave,
}: {
  initial?: ClassTask;
  classes: { id: string; name: string }[];
  onClose: () => void;
  onSave: (v: {
    classId: string;
    title: string;
    description: string;
    dueDate?: string;
    links: TaskLink[];
  }) => Promise<void>;
}) {
  const [classId, setClassId] = useState(
    initial?.classId ?? (classes.length === 1 ? classes[0].id : ""),
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [links, setLinks] = useState<TaskLink[]>(initial?.links ?? []);
  const [busy, setBusy] = useState(false);

  const setLink = (i: number, patch: Partial<TaskLink>) =>
    setLinks((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  // Linhas em branco são ignoradas; as preenchidas precisam ser links http(s).
  const filled = links.filter((l) => l.url.trim() || l.label.trim());
  const linksOk = filled.every((l) => isUrl(l.url));
  const valid = !!classId && title.trim().length >= 3 && linksOk;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          <DialogDescription>
            {initial
              ? "As famílias veem a versão atualizada no app."
              : "As famílias da turma recebem um aviso e veem o que você escrever aqui."}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-3 overflow-y-auto px-0.5">
          <Field label="Turma">
            <select
              className={selectCls}
              value={classId}
              disabled={!!initial}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Título">
            <Input
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Colorir a história de Davi"
            />
          </Field>
          <Field label="O que fazer (opcional)">
            <Textarea
              rows={5}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explique o que os pais e a criança devem fazer."
            />
          </Field>
          <Field label="Data de entrega (opcional)">
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
          <Field
            label="Links para baixar documento ou imagem (opcional)"
            hint="Cole o link do arquivo no Google Drive, Dropbox ou site. Deixe o compartilhamento como “qualquer pessoa com o link”."
            error={linksOk ? undefined : "Use links completos, começando com https://"}
          >
            <div className="space-y-2">
              {links.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    className="w-2/5"
                    maxLength={60}
                    aria-label="Nome do link"
                    value={l.label}
                    onChange={(e) => setLink(i, { label: e.target.value })}
                    placeholder="Nome (ex.: Desenho)"
                  />
                  <Input
                    aria-label="Endereço do link"
                    inputMode="url"
                    value={l.url}
                    onChange={(e) => setLink(i, { url: e.target.value })}
                    placeholder="https://…"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Remover link"
                    onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))}
                  >
                    <X />
                  </Button>
                </div>
              ))}
              {links.length < MAX_LINKS && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setLinks((ls) => [...ls, { label: "", url: "" }])}
                >
                  <Plus /> Adicionar link
                </Button>
              )}
            </div>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!valid || busy}
            onClick={async () => {
              setBusy(true);
              await onSave({
                classId,
                title,
                description,
                dueDate: dueDate || undefined,
                links: filled,
              });
              setBusy(false);
            }}
          >
            {initial ? "Salvar" : "Criar e avisar famílias"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
