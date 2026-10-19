import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Check, Image as ImageIcon, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { PLANS } from "@/lib/site";
import { can } from "@/lib/domain/rules";
import { resizePhoto } from "@/lib/photo";
import {
  TEMA_ORDEM,
  aplicarTema,
  gradientePreviaTema,
  rotuloTema,
  temaValido,
} from "@/lib/tema";
import { BadgeCard } from "@/components/app/badge-card";
import { PageHeader, Panel, Restricted } from "@/components/app/ui-bits";
import {
  ErrorBanner,
  Field,
  PageLoading,
  attempt,
} from "@/components/app/page-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ChurchSettings } from "@/lib/domain/types";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações da igreja — Espaço Kids" }] }),
  component: SettingsPage,
});

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3.5">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && (
          <span className="block text-xs text-muted-foreground">{hint}</span>
        )}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

function SettingsPage() {
  const { state, role, loading, plan, saveSettings, seedDemo } = useStore();
  const [d, setD] = useState<ChurchSettings>(state.settings);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dirty) setD(state.settings);
  }, [state.settings, dirty]);
  // Prévia ao vivo da cor escolhida; ao sair sem salvar, volta à cor salva.
  const salva = state.settings.themeColor;
  useEffect(() => {
    aplicarTema(d.themeColor);
    return () => aplicarTema(salva);
  }, [d.themeColor, salva]);
  if (!can(role, "configuracoes")) return <Restricted />;
  if (loading) return <PageLoading />;

  const set = <K extends keyof ChurchSettings>(k: K, v: ChurchSettings[K]) => {
    setD((s) => ({ ...s, [k]: v }));
    setDirty(true);
  };
  const nested = <K extends "badge" | "rules" | "notify" | "privacy">(
    k: K,
    patch: Partial<ChurchSettings[K]>,
  ) => set(k, { ...d[k], ...patch });
  const num = (v: string, min: number, max: number, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };

  const save = async () => {
    if (d.name.trim().length < 3)
      return toast.error("Informe o nome da igreja.");
    if (d.units.length === 0)
      return toast.error("Mantenha ao menos uma unidade.");
    setSaving(true);
    const ok = await attempt(
      () => saveSettings({ ...d, name: d.name.trim() }),
      "Configurações salvas.",
    );
    setSaving(false);
    if (ok) setDirty(false);
  };

  const sample = state.children[0];
  const sampleBadge = {
    id: "x",
    childId: sample?.id ?? "x",
    token: "exemplo-ilustrativo",
    status: "ativo" as const,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date().toISOString(),
  };

  return (
    <>
      <PageHeader
        title="Configurações da igreja"
        description="Identidade, regras de operação e privacidade."
        actions={
          <Button onClick={save} disabled={!dirty || saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />} Salvar
            alterações
          </Button>
        }
      />
      <ErrorBanner />
      <Tabs defaultValue="igreja">
        <TabsList className="mb-4 h-auto flex-wrap">
          {[
            ["igreja", "Igreja"],
            ["plano", "Plano"],
            ["cracha", "Crachás"],
            ["regras", "Regras"],
            ["notif", "Notificações"],
            ["privacidade", "Privacidade"],
            ["dados", "Dados"],
          ].map(([v, l]) => (
            <TabsTrigger key={v} value={v}>
              {l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="igreja">
          <Panel>
            <Section>
              <Field label="Nome da igreja *">
                <Input
                  value={d.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Telefone">
                  <Input
                    value={d.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </Field>
                <Field
                  label="Prefixo do código das crianças"
                  hint="Vale para novos cadastros (ex.: CR → CR-1017)."
                >
                  <Input
                    value={d.idPrefix}
                    maxLength={5}
                    onChange={(e) =>
                      set(
                        "idPrefix",
                        e.target.value.toUpperCase().replace(/[^A-Z]/g, ""),
                      )
                    }
                  />
                </Field>
              </div>
              <Field label="Endereço">
                <Input
                  value={d.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </Field>
              <Field
                label="Cor da igreja"
                hint="Aparece no painel e no aplicativo de todos da igreja."
              >
                <div className="flex flex-wrap gap-3">
                  {TEMA_ORDEM.map((t) => {
                    const ativa = temaValido(d.themeColor) === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        title={rotuloTema(t)}
                        aria-label={`Cor ${rotuloTema(t)}`}
                        aria-pressed={ativa}
                        onClick={() => set("themeColor", t)}
                        className="group flex w-14 flex-col items-center gap-1"
                      >
                        <span
                          className={`grid size-10 place-items-center rounded-full ring-offset-2 ring-offset-background transition ${ativa ? "ring-2 ring-foreground" : "group-hover:ring-2 group-hover:ring-border"}`}
                          style={{ background: gradientePreviaTema(t) }}
                        >
                          {ativa && <Check className="size-4 text-white" />}
                        </span>
                        <span className="text-[10px] leading-tight text-muted-foreground">
                          {rotuloTema(t)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field
                label="Logo"
                hint="Aparece nos crachás. PNG ou JPG; é reduzida automaticamente."
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-16 place-items-center overflow-hidden rounded-xl border bg-muted">
                    {d.logoUrl ? (
                      <img
                        src={d.logoUrl}
                        alt="Logo"
                        className="size-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="size-6 text-muted-foreground" />
                    )}
                  </div>
                  <label className="inline-flex h-9 cursor-pointer items-center rounded-md border bg-card px-3 text-sm font-medium hover:bg-muted">
                    Escolher logo
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f)
                          try {
                            set("logoUrl", await resizePhoto(f, 160));
                          } catch (er) {
                            toast.error(
                              er instanceof Error
                                ? er.message
                                : "Imagem inválida",
                            );
                          }
                      }}
                    />
                  </label>
                  {d.logoUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => set("logoUrl", undefined)}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </Field>
            </Section>
          </Panel>
        </TabsContent>

        <TabsContent value="plano">
          <Panel title="Plano e assinatura">
            <Section>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Plano atual</p>
                <p className="text-xl font-bold">{plan.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.used} de{" "}
                  {Number.isFinite(plan.limit) ? plan.limit : "∞"} crianças
                  ativas
                  {plan.mode === "teste" &&
                    ` · teste grátis termina em ${plan.trialDaysLeft} ${plan.trialDaysLeft === 1 ? "dia" : "dias"}`}
                </p>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {PLANS.map((p) => (
                  <li key={p.name} className="rounded-lg border p-3 text-sm">
                    <p className="font-semibold">
                      {p.name} · {p.price}
                      {p.suffix}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.limit}</p>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                A assinatura online está chegando. Por enquanto, fale com a
                gente para contratar ou trocar de plano.
              </p>
              <Button asChild variant="outline">
                <Link to="/contato">Falar com a gente</Link>
              </Button>
            </Section>
          </Panel>
        </TabsContent>

        <TabsContent value="cracha">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Modelo do crachá">
              <Section>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Largura (mm)">
                    <Input
                      type="number"
                      value={d.badge.widthMm}
                      onChange={(e) =>
                        nested("badge", {
                          widthMm: num(e.target.value, 40, 150, 90),
                        })
                      }
                    />
                  </Field>
                  <Field label="Altura (mm)">
                    <Input
                      type="number"
                      value={d.badge.heightMm}
                      onChange={(e) =>
                        nested("badge", {
                          heightMm: num(e.target.value, 30, 120, 55),
                        })
                      }
                    />
                  </Field>
                </div>
                <Field label="Validade do crachá (dias)">
                  <Input
                    type="number"
                    value={d.badge.validityDays}
                    onChange={(e) =>
                      nested("badge", {
                        validityDays: num(e.target.value, 1, 1825, 365),
                      })
                    }
                  />
                </Field>
                <Toggle
                  label="Exibir turma"
                  checked={d.badge.showClass}
                  onChange={(v) => nested("badge", { showClass: v })}
                />
                <Toggle
                  label="Exibir código da família"
                  checked={d.badge.showFamily}
                  onChange={(v) => nested("badge", { showFamily: v })}
                />
              </Section>
            </Panel>
            <Panel title="Pré-visualização">
              <div className="flex justify-center overflow-auto py-2">
                {sample ? (
                  <BadgeCard
                    child={sample}
                    badge={sampleBadge}
                    cls={state.classes.find((c) => c.id === sample.classId)}
                    family={state.families.find(
                      (f) => f.id === sample.familyId,
                    )}
                    settings={d}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Cadastre uma criança para visualizar.
                  </p>
                )}
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Impressoras térmicas de etiqueta: ajuste largura e altura ao
                rolo utilizado.
              </p>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="regras">
          <Panel title="Check-in, check-out e turmas">
            <Section>
              <Toggle
                label="Exigir autorização explícita para retirada"
                hint="Recomendado. Só retira quem estiver marcado como autorizado para a criança."
                checked={d.rules.requireAuthorizedPickup}
                onChange={(v) =>
                  nested("rules", { requireAuthorizedPickup: v })
                }
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Alertar ocupação a partir de (%)">
                  <Input
                    type="number"
                    value={d.rules.alertCapacityPct}
                    onChange={(e) =>
                      nested("rules", {
                        alertCapacityPct: num(e.target.value, 10, 100, 80),
                      })
                    }
                  />
                </Field>
                <Field label="Máx. de crianças por professor">
                  <Input
                    type="number"
                    value={d.rules.maxChildrenPerTeacher}
                    onChange={(e) =>
                      nested("rules", {
                        maxChildrenPerTeacher: num(e.target.value, 1, 50, 8),
                      })
                    }
                  />
                </Field>
              </div>
            </Section>
          </Panel>
        </TabsContent>

        <TabsContent value="notif">
          <Panel title="Preferências de notificação">
            <Section>
              <Toggle
                label="Chamadas aos responsáveis"
                checked={d.notify.calls}
                onChange={(v) => nested("notify", { calls: v })}
              />
              <Toggle
                label="Entradas e saídas"
                checked={d.notify.presence}
                onChange={(v) => nested("notify", { presence: v })}
              />
              <Toggle
                label="Alertas operacionais"
                checked={d.notify.alerts}
                onChange={(v) => nested("notify", { alerts: v })}
              />
              <Toggle
                label="Comunicados da igreja"
                checked={d.notify.announcements}
                onChange={(v) => nested("notify", { announcements: v })}
              />
              <Toggle
                label="Ocultar conteúdo sensível na tela bloqueada"
                hint="Mantém os avisos genéricos, sem motivo ou dados de saúde."
                checked={d.notify.hideSensitiveOnLockScreen}
                onChange={(v) =>
                  nested("notify", { hideSensitiveOnLockScreen: v })
                }
              />
              <p className="text-xs text-muted-foreground">
                Define o que é registrado na central. Push, WhatsApp e e-mail
                serão configurados na integração com o aplicativo.
              </p>
            </Section>
          </Panel>
        </TabsContent>

        <TabsContent value="privacidade">
          <Panel title="Políticas de acesso e privacidade (LGPD)">
            <Section>
              <Field
                label="Base legal registrada"
                hint="Dados de crianças exigem consentimento específico de um dos pais ou responsável (LGPD, art. 14)."
              >
                <Textarea
                  rows={3}
                  value={d.privacy.legalBasis}
                  onChange={(e) =>
                    nested("privacy", { legalBasis: e.target.value })
                  }
                />
              </Field>
              <Toggle
                label="Exigir registro de consentimento no cadastro"
                checked={d.privacy.consentRequired}
                onChange={(v) => nested("privacy", { consentRequired: v })}
              />
              <Toggle
                label="Restringir dados de saúde à coordenação"
                hint="Aplicado no servidor pelas regras do banco."
                checked={d.privacy.healthRestricted}
                onChange={(v) => nested("privacy", { healthRestricted: v })}
              />
              <Field label="Retenção de histórico (meses)">
                <Input
                  type="number"
                  value={d.privacy.retentionMonths}
                  onChange={(e) =>
                    nested("privacy", {
                      retentionMonths: num(e.target.value, 1, 120, 24),
                    })
                  }
                />
              </Field>
            </Section>
          </Panel>
        </TabsContent>

        <TabsContent value="dados">
          <Panel title="Dados de demonstração">
            <Section>
              <p className="text-sm text-muted-foreground">
                Carrega turmas, famílias, crianças e presenças{" "}
                <strong>fictícias</strong> para treinamento. Apague-as antes de
                usar o sistema com dados reais.
              </p>
              <Button
                variant="outline"
                disabled={state.children.length > 0}
                onClick={() =>
                  attempt(seedDemo, "Dados de demonstração carregados.")
                }
              >
                Carregar dados fictícios
              </Button>
              {state.children.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Disponível apenas com o banco vazio, para não misturar com
                  dados reais.
                </p>
              )}
            </Section>
          </Panel>
        </TabsContent>
      </Tabs>
    </>
  );
}
