import { useMemo, useState } from "react";
import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { INCIDENT_KIND, dateTime } from "@/lib/domain/labels";
import { openAttendance } from "@/lib/domain/rules";
import type { Incident, IncidentKind } from "@/lib/domain/types";
import { EmptyState, StatusPill } from "@/components/app/ui-bits";
import { attempt, Field, selectCls } from "@/components/app/page-bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const KINDS = Object.keys(INCIDENT_KIND) as IncidentKind[];

/**
 * Histórico de ocorrências da sala. Com `childId`, mostra só as dessa criança
 * (aba do cadastro); sem ele, mostra todas (página Ocorrências).
 */
export function IncidentPanel({ childId }: { childId?: string }) {
  const { state, role, saveIncident, deleteIncident } = useStore();
  const { profile } = useAuth();
  const [editing, setEditing] = useState<Incident | "new" | null>(null);
  const [kindFilter, setKindFilter] = useState<IncidentKind | "">("");

  const kids = useMemo(
    () => new Map(state.children.map((c) => [c.id, c])),
    [state.children],
  );
  const list = state.incidents.filter(
    (i) =>
      (!childId ||
        i.childId === childId ||
        i.involvedChildIds.includes(childId)) &&
      (!kindFilter || i.kind === kindFilter),
  );
  const isMod = role === "admin" || role === "coordenacao";
  const canTouch = (i: Incident) => isMod || i.authorId === profile?.id;
  const name = (id: string) => kids.get(id)?.nickname ?? "Criança removida";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {!childId && (
          <select
            aria-label="Filtrar por tipo"
            className={`${selectCls} sm:w-56`}
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as IncidentKind | "")}
          >
            <option value="">Todos os tipos</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {INCIDENT_KIND[k]}
              </option>
            ))}
          </select>
        )}
        <Button className="ml-auto" onClick={() => setEditing("new")}>
          <Plus /> Registrar ocorrência
        </Button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma ocorrência registrada"
          text="A equipe registra aqui o que acontece na sala. A família só vê as que forem enviadas aos pais."
        />
      ) : (
        <ul className="divide-y">
          {list.map((i) => (
            <li key={i.id} className="space-y-1.5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill
                  value={i.kind}
                  label={INCIDENT_KIND[i.kind]}
                  tone={i.kind === "outro" ? "neutral" : "danger"}
                />
                <span className="text-sm font-semibold">
                  {name(i.childId)}
                  {i.involvedChildIds.length > 0 &&
                    ` com ${i.involvedChildIds.map(name).join(", ")}`}
                </span>
                {i.sharedWithFamily && (
                  <StatusPill
                    value="enviada"
                    label="Enviada aos pais"
                    tone="primary"
                  />
                )}
                {canTouch(i) && (
                  <span className="ml-auto flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Editar ocorrência"
                      onClick={() => setEditing(i)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remover ocorrência"
                      onClick={() => {
                        if (confirm("Remover esta ocorrência?"))
                          attempt(
                            () => deleteIncident(i.id),
                            "Ocorrência removida.",
                          );
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm">{i.text}</p>
              <p className="text-xs text-muted-foreground">
                {dateTime(i.createdAt)} • {i.authorName}
                {i.updatedAt ? " • editada" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <IncidentDialog
          initial={editing === "new" ? undefined : editing}
          fixedChildId={childId}
          onClose={() => setEditing(null)}
          onSave={async (v) => {
            const ok = await attempt(
              () =>
                saveIncident({
                  ...v,
                  id: editing === "new" ? undefined : editing.id,
                }),
              "Ocorrência salva.",
            );
            if (ok) setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function IncidentDialog({
  initial,
  fixedChildId,
  onClose,
  onSave,
}: {
  initial?: Incident;
  fixedChildId?: string;
  onClose: () => void;
  onSave: (v: {
    childId: string;
    kind: IncidentKind;
    text: string;
    involvedChildIds: string[];
    sharedWithFamily: boolean;
  }) => Promise<void>;
}) {
  const { state } = useStore();
  const [childId, setChildId] = useState(
    initial?.childId ?? fixedChildId ?? "",
  );
  const [kind, setKind] = useState<IncidentKind>(
    initial?.kind ?? "comportamento",
  );
  const [text, setText] = useState(initial?.text ?? "");
  const [others, setOthers] = useState<string[]>(
    initial?.involvedChildIds ?? [],
  );
  const [shared, setShared] = useState(initial?.sharedWithFamily ?? false);
  const [busy, setBusy] = useState(false);

  const kids = state.children
    .filter((c) => c.status !== "inativo")
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  // Só quem está na sala com a criança agora (mesma turma e presente); mantém
  // as já marcadas para não perder ao editar.
  const classId = kids.find((c) => c.id === childId)?.classId;
  const inRoom = kids.filter(
    (c) =>
      c.id !== childId &&
      (others.includes(c.id) ||
        (c.classId === classId && !!openAttendance(state.attendance, c.id))),
  );
  const valid = !!childId && text.trim().length >= 3;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? "Editar ocorrência" : "Registrar ocorrência"}
          </DialogTitle>
          <DialogDescription>
            Descreva o fato com objetividade. Por padrão, só a equipe vê.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Criança">
            <select
              className={selectCls}
              value={childId}
              disabled={!!fixedChildId || !!initial}
              onChange={(e) => {
                setChildId(e.target.value);
                setOthers([]);
              }}
            >
              <option value="">Selecione…</option>
              {kids.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo">
            <select
              className={selectCls}
              value={kind}
              onChange={(e) => setKind(e.target.value as IncidentKind)}
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {INCIDENT_KIND[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Outras crianças envolvidas (opcional)">
            <select
              multiple
              size={4}
              className={`${selectCls} h-auto py-1`}
              value={others}
              onChange={(e) =>
                setOthers(Array.from(e.target.selectedOptions, (o) => o.value))
              }
            >
              {inRoom.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4"
              checked={shared}
              onChange={(e) => setShared(e.target.checked)}
            />
            <span>
              <span className="font-medium">Enviar aos pais</span>
              <span className="block text-xs text-muted-foreground">
                A família vê o tipo e o texto no app e recebe um aviso. Não cite
                outras crianças no texto.
              </span>
            </span>
          </label>
          <Field label="O que aconteceu">
            <Textarea
              rows={4}
              maxLength={1000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ex.: brigou com a colega por causa de um brinquedo."
            />
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
                childId,
                kind,
                text,
                involvedChildIds: others,
                sharedWithFamily: shared,
              });
              setBusy(false);
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
