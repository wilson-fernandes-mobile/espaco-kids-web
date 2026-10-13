import { useState } from "react";
import { Loader2, Pill, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import {
  AUTISM_LEVEL,
  COMMUNICATION,
  CONDITIONS,
  SENSITIVITIES,
  emptyCare,
  type CareProfile,
  type Medication,
} from "@/lib/domain/care";
import type { Child } from "@/lib/domain/types";
import { date } from "@/lib/domain/labels";

function Line({ k, v }: { k: string; v?: React.ReactNode }) {
  if (!v || (Array.isArray(v) && v.length === 0)) return null;
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
      <dt className="w-48 shrink-0 text-sm text-muted-foreground">{k}</dt>
      <dd className="text-sm font-medium">{v}</dd>
    </div>
  );
}

function Chips({
  options,
  value,
  onChange,
}: {
  options: Record<string, string>;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(options).map(([k, label]) => {
        const on = value.includes(k);
        return (
          <button
            key={k}
            type="button"
            onClick={() =>
              onChange(on ? value.filter((x) => x !== k) : [...value, k])
            }
            className={
              "rounded-full border px-3 py-1.5 text-sm transition " +
              (on
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted")
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="border-b pb-1.5 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

/** Saúde e cuidados especiais: leitura e edição (coordenação/admin). */
export function CarePanel({ child }: { child: Child }) {
  const { saveCare, role } = useStore();
  const care = child.care ?? emptyCare();
  const [editing, setEditing] = useState(false);
  const [p, setP] = useState<CareProfile>(care);
  const [text, setText] = useState(child.health);
  const [busy, setBusy] = useState(false);
  const canEdit = role === "admin" || role === "coordenacao";
  const set = <K extends keyof CareProfile>(k: K, v: CareProfile[K]) =>
    setP((x) => ({ ...x, [k]: v }));

  const setMed = (i: number, m: Partial<Medication>) =>
    set(
      "medications",
      p.medications.map((x, j) => (j === i ? { ...x, ...m } : x)),
    );

  const save = async () => {
    setBusy(true);
    try {
      await saveCare(
        child.id,
        {
          ...p,
          medications: p.medications.filter((m) => m.name.trim()),
        },
        text.trim(),
      );
      toast.success("Saúde e cuidados salvos.");
      setEditing(false);
    } catch {
      toast.error("Não foi possível salvar. Tente de novo.");
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    const conds = care.conditions.map((c) =>
      c === "tea"
        ? `TEA (autismo) — ${AUTISM_LEVEL[care.autismLevel]}`
        : c === "outra"
          ? care.otherCondition || CONDITIONS.outra
          : CONDITIONS[c],
    );
    return (
      <div>
        <dl className="divide-y">
          <Line k="Condições" v={conds.join(" · ")} />
          <Line k="Laudo" v={care.conditions.length ? (care.hasReport ? "Tem laudo" : "Sem laudo informado") : ""} />
          <Line k="Comunicação" v={COMMUNICATION[care.communication]} />
          <Line
            k="Sensibilidades"
            v={care.sensitivities.map((s) => SENSITIVITIES[s]).join(", ")}
          />
          <Line k="O que acalma" v={care.calming} />
          <Line k="O que desencadeia crise" v={care.triggers} />
          <Line k="Acompanhante" v={care.needsCompanion ? "Precisa de acompanhante" : ""} />
          <Line k="Alergias" v={care.allergies} />
          <Line k="Alimentação" v={care.diet} />
          <Line
            k="Medicamentos"
            v={
              care.medications.length > 0 && (
                <ul className="space-y-1.5">
                  {care.medications.map((m, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Pill className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>
                        {m.name} {m.dose && `· ${m.dose}`}{" "}
                        {m.times.length > 0 && `· ${m.times.join(", ")}`}
                        {m.note && ` · ${m.note}`}{" "}
                        <span className="font-normal text-muted-foreground">
                          ({m.staffGives ? "a equipe administra" : "só avisar"})
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )
            }
          />
          <Line
            k="Contato de emergência"
            v={[care.emergencyName, care.emergencyPhone].filter(Boolean).join(" · ")}
          />
          <Line k="Plano de saúde" v={care.healthPlan} />
          <Line
            k="Uso de imagem"
            v={
              care.imageConsent === null
                ? ""
                : care.imageConsent
                  ? "Autorizado"
                  : "Não autorizado"
            }
          />
          <Line k="Observações" v={child.health} />
        </dl>
        {!care.updatedAt && !child.health && care.conditions.length === 0 && (
          <p className="py-3 text-sm text-muted-foreground">
            Nada informado ainda. A família pode preencher pelo app; a
            coordenação também pode preencher aqui.
          </p>
        )}
        {care.updatedAt && (
          <p className="pt-3 text-xs text-muted-foreground">
            Atualizado em {date(care.updatedAt)}
          </p>
        )}
        {canEdit && (
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => {
              setP(care);
              setText(child.health);
              setEditing(true);
            }}
          >
            Editar saúde e cuidados
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Section title="Condições e necessidades">
        <Chips
          options={CONDITIONS}
          value={p.conditions}
          onChange={(v) => set("conditions", v)}
        />
        {p.conditions.includes("tea") && (
          <div className="space-y-1.5">
            <Label>Grau de suporte (TEA)</Label>
            <select
              value={p.autismLevel}
              onChange={(e) => set("autismLevel", Number(e.target.value))}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm sm:w-72"
            >
              {Object.entries(AUTISM_LEVEL).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        )}
        {p.conditions.includes("outra") && (
          <Input
            placeholder="Qual?"
            value={p.otherCondition}
            onChange={(e) => set("otherCondition", e.target.value)}
          />
        )}
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={p.hasReport} onCheckedChange={(v) => set("hasReport", v)} />
          Tem laudo
        </label>
      </Section>

      <Section title="Como ajudar no dia a dia">
        <div className="space-y-1.5">
          <Label>Comunicação</Label>
          <Chips
            options={COMMUNICATION}
            value={p.communication ? [p.communication] : []}
            onChange={(v) =>
              set("communication", (v[v.length - 1] ?? "") as CareProfile["communication"])
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>Sensibilidades</Label>
          <Chips
            options={SENSITIVITIES}
            value={p.sensitivities}
            onChange={(v) => set("sensitivities", v)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>O que acalma</Label>
          <Textarea rows={2} value={p.calming} onChange={(e) => set("calming", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>O que desencadeia crise</Label>
          <Textarea rows={2} value={p.triggers} onChange={(e) => set("triggers", e.target.value)} />
        </div>
        <label className="flex items-center gap-3 text-sm">
          <Switch
            checked={p.needsCompanion}
            onCheckedChange={(v) => set("needsCompanion", v)}
          />
          Precisa de acompanhante
        </label>
      </Section>

      <Section title="Alergias e alimentação">
        <div className="space-y-1.5">
          <Label>Alergias (alimentar, medicamento…)</Label>
          <Textarea rows={2} value={p.allergies} onChange={(e) => set("allergies", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Restrição alimentar</Label>
          <Input value={p.diet} onChange={(e) => set("diet", e.target.value)} />
        </div>
      </Section>

      <Section title="Medicamentos">
        {p.medications.map((m, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Nome" value={m.name} onChange={(e) => setMed(i, { name: e.target.value })} />
              <Input placeholder="Dose (ex.: 10 mg)" value={m.dose} onChange={(e) => setMed(i, { dose: e.target.value })} />
            </div>
            <Input
              placeholder="Horários (ex.: 12:00, 18:00)"
              value={m.times.join(", ")}
              onChange={(e) =>
                setMed(i, {
                  times: e.target.value
                    .split(/[,\s;]+/)
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
            <Input placeholder="Observação (ex.: com lanche)" value={m.note} onChange={(e) => setMed(i, { note: e.target.value })} />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={m.staffGives} onCheckedChange={(v) => setMed(i, { staffGives: v })} />
                A equipe administra
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  set("medications", p.medications.filter((_, j) => j !== i))
                }
              >
                <Trash2 /> Remover
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            set("medications", [
              ...p.medications,
              { name: "", dose: "", times: [], note: "", staffGives: false },
            ])
          }
        >
          <Plus /> Adicionar medicamento
        </Button>
      </Section>

      <Section title="Emergência e outros">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Contato de emergência" value={p.emergencyName} onChange={(e) => set("emergencyName", e.target.value)} />
          <Input placeholder="Telefone" value={p.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} />
        </div>
        <Input placeholder="Plano de saúde (opcional)" value={p.healthPlan} onChange={(e) => set("healthPlan", e.target.value)} />
        <label className="flex items-center gap-3 text-sm">
          <Switch
            checked={p.imageConsent === true}
            onCheckedChange={(v) => set("imageConsent", v)}
          />
          Autoriza o uso de imagem
        </label>
        <div className="space-y-1.5">
          <Label>Observações de saúde</Label>
          <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} />
        </div>
      </Section>

      <div className="flex gap-2">
        <Button onClick={save} disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Salvar
        </Button>
        <Button variant="outline" onClick={() => setEditing(false)} disabled={busy}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
