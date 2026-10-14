import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  RefreshCw,
  Smartphone,
  Loader2,
  Pencil,
  Plus,
  UserPlus,
  Users,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { can } from "@/lib/domain/rules";
import { hasWhatsapp } from "@/lib/whatsapp";
import { WhatsAppButton } from "@/components/app/whatsapp-button";
import { date } from "@/lib/domain/labels";
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
  Pager,
  SearchBox,
  attempt,
  selectCls,
  usePagination,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuthorizedPerson, Family, Guardian } from "@/lib/domain/types";

export const Route = createFileRoute("/familias")({
  validateSearch: (s: Record<string, unknown>): { familia?: string } => ({
    familia: typeof s.familia === "string" ? s.familia : undefined,
  }),
  head: () => ({ meta: [{ title: "Famílias e responsáveis — Espaço Kids" }] }),
  component: FamiliesPage,
});

const phone = z.string().trim().min(8, "Informe o telefone").max(20);
const familySchema = z.object({
  name: z.string().trim().min(3, "Informe o nome de referência"),
  phone,
  email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(200).optional(),
});
const guardianSchema = z.object({
  fullName: z.string().trim().min(3, "Informe o nome completo"),
  phone,
  email: z
    .string()
    .trim()
    .email("E-mail inválido")
    .optional()
    .or(z.literal("")),
  relation: z.string().trim().min(2, "Informe a relação"),
  contactPref: z.enum(["telefone", "whatsapp", "email", "app"]),
  whatsapp: z.boolean(),
  primary: z.boolean(),
  active: z.boolean(),
});
const authSchema = z.object({
  fullName: z.string().trim().min(3, "Informe o nome completo"),
  phone,
  relation: z.string().trim().min(2, "Informe a relação"),
  validUntil: z.string().min(1, "Informe a validade"),
  active: z.boolean(),
});

/** Código para a família criar a conta no aplicativo (sem aprovação manual). */
function AppAccessPanel({ familyId }: { familyId: string }) {
  const { state, createFamilyLink, revokeFamilyLink } = useStore();
  const [busy, setBusy] = useState(false);
  const link = state.familyLinks.find(
    (l) => l.familyId === familyId && l.active,
  );
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
    } catch {
      toast.error("Não foi possível concluir a ação.");
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.id);
      toast.success("Código copiado.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };
  return (
    <Panel title="Acesso ao aplicativo" className="lg:col-span-2">
      <div className="flex flex-wrap items-center gap-3">
        <Smartphone className="size-5 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          {link ? (
            <>
              <p className="font-mono text-lg font-semibold tracking-wider">
                {link.id}
              </p>
              <p className="text-xs text-muted-foreground">
                Passe este código aos pais e familiares. Cada pessoa cria a
                própria conta no app (Criar conta → Sou da família).
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum código ativo. Gere um para a família acessar o aplicativo.
            </p>
          )}
        </div>
        {link && (
          <Button variant="outline" size="sm" onClick={copy}>
            <Copy /> Copiar
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() =>
            run(() => createFamilyLink(familyId), "Novo código gerado.")
          }
        >
          <RefreshCw /> {link ? "Gerar novo" : "Gerar código"}
        </Button>
        {link && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() =>
              run(() => revokeFamilyLink(familyId), "Código desativado.")
            }
          >
            Desativar
          </Button>
        )}
      </div>
    </Panel>
  );
}

function FamilyDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: (f?: Family) => void;
  initial?: Family;
}) {
  const { saveFamily } = useStore();
  const f = useForm<z.infer<typeof familySchema>>({
    resolver: zodResolver(familySchema),
    values: {
      name: initial?.name ?? "",
      phone: initial?.phone ?? "",
      email: initial?.email ?? "",
      address: initial?.address ?? "",
    },
  });
  const e = f.formState.errors;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? "Editar família" : "Nova família"}
          </DialogTitle>
          <DialogDescription>
            O código da família é gerado automaticamente.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={f.handleSubmit(async (v) => {
            let saved: Family | undefined;
            if (
              await attempt(async () => {
                saved = await saveFamily({ ...v, id: initial?.id });
              }, "Família salva.")
            )
              onClose(saved);
          })}
        >
          <Field label="Nome de referência *" error={e.name?.message}>
            <Input placeholder="Família Souza" {...f.register("name")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefone principal *" error={e.phone?.message}>
              <Input
                inputMode="tel"
                placeholder="(11) 90000-0000"
                {...f.register("phone")}
              />
            </Field>
            <Field label="E-mail" error={e.email?.message}>
              <Input type="email" {...f.register("email")} />
            </Field>
          </div>
          <Field
            label="Endereço"
            hint="Somente se necessário."
            error={e.address?.message}
          >
            <Input {...f.register("address")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()}>
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

function GuardianDialog({
  familyId,
  initial,
  open,
  onClose,
}: {
  familyId: string;
  initial?: Guardian;
  open: boolean;
  onClose: () => void;
}) {
  const { saveGuardian } = useStore();
  const f = useForm<z.infer<typeof guardianSchema>>({
    resolver: zodResolver(guardianSchema),
    values: {
      fullName: initial?.fullName ?? "",
      phone: initial?.phone ?? "",
      email: initial?.email ?? "",
      relation: initial?.relation ?? "",
      contactPref: initial?.contactPref ?? "whatsapp",
      whatsapp: initial ? hasWhatsapp(initial) : true,
      primary: initial?.primary ?? false,
      active: initial?.active ?? true,
    },
  });
  const e = f.formState.errors;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? "Editar responsável" : "Novo responsável"}
          </DialogTitle>
          <DialogDescription>
            Ser responsável não dá, por si só, autorização de retirada.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={f.handleSubmit(async (v) => {
            if (
              await attempt(
                () => saveGuardian({ ...v, familyId, id: initial?.id }),
                "Responsável salvo.",
              )
            )
              onClose();
          })}
        >
          <Field label="Nome completo *" error={e.fullName?.message}>
            <Input {...f.register("fullName")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefone *" error={e.phone?.message}>
              <Input inputMode="tel" {...f.register("phone")} />
            </Field>
            <Field label="Relação com a criança *" error={e.relation?.message}>
              <Input placeholder="Mãe, Pai, Avó…" {...f.register("relation")} />
            </Field>
            <Field label="E-mail" error={e.email?.message}>
              <Input type="email" {...f.register("email")} />
            </Field>
            <Field label="Preferência de contato">
              <select className={selectCls} {...f.register("contactPref")}>
                <option value="whatsapp">WhatsApp</option>
                <option value="telefone">Telefone</option>
                <option value="email">E-mail</option>
                <option value="app">Aplicativo</option>
              </select>
            </Field>
          </div>
          <label className="flex items-center justify-between rounded-md border p-3 text-sm">
            <span>
              Este telefone tem WhatsApp
              <span className="block text-xs text-muted-foreground">
                Habilita o botão para chamar o responsável pelo WhatsApp.
              </span>
            </span>
            <Switch
              checked={f.watch("whatsapp")}
              onCheckedChange={(v) => f.setValue("whatsapp", v)}
            />
          </label>
          <label className="flex items-center justify-between rounded-md border p-3 text-sm">
            Responsável principal
            <Switch
              checked={f.watch("primary")}
              onCheckedChange={(v) => f.setValue("primary", v)}
            />
          </label>
          <label className="flex items-center justify-between rounded-md border p-3 text-sm">
            Vínculo ativo
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

function AuthorizedDialog({
  familyId,
  initial,
  open,
  onClose,
}: {
  familyId: string;
  initial?: AuthorizedPerson;
  open: boolean;
  onClose: () => void;
}) {
  const { saveAuthorized } = useStore();
  const f = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    values: {
      fullName: initial?.fullName ?? "",
      phone: initial?.phone ?? "",
      relation: initial?.relation ?? "",
      validUntil:
        initial?.validUntil ??
        new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
      active: initial?.active ?? true,
    },
  });
  const e = f.formState.errors;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? "Editar pessoa autorizada" : "Nova pessoa autorizada"}
          </DialogTitle>
          <DialogDescription>
            Depois de salvar, conceda a autorização em cada criança (aba
            Autorizados).
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={f.handleSubmit(async (v) => {
            if (
              await attempt(
                () => saveAuthorized({ ...v, familyId, id: initial?.id }),
                "Pessoa autorizada salva.",
              )
            )
              onClose();
          })}
        >
          <Field label="Nome completo *" error={e.fullName?.message}>
            <Input {...f.register("fullName")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefone *" error={e.phone?.message}>
              <Input inputMode="tel" {...f.register("phone")} />
            </Field>
            <Field label="Relação *" error={e.relation?.message}>
              <Input
                placeholder="Avó, Tio, Vizinho…"
                {...f.register("relation")}
              />
            </Field>
          </div>
          <Field label="Autorização válida até *" error={e.validUntil?.message}>
            <Input type="date" {...f.register("validUntil")} />
          </Field>
          <label className="flex items-center justify-between rounded-md border p-3 text-sm">
            Autorização ativa
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

function FamiliesPage() {
  const { familia } = Route.useSearch();
  const nav = useNavigate();
  const { state, role, loading, toggleAuthorization } = useStore();
  const [q, setQ] = useState("");
  const [dlg, setDlg] = useState<null | {
    kind: "family" | "guardian" | "auth";
    item?: Family | Guardian | AuthorizedPerson;
  }>(null);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return state.families
      .filter(
        (f) =>
          !t ||
          f.name.toLowerCase().includes(t) ||
          f.code.toLowerCase().includes(t) ||
          f.phone.includes(t),
      )
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [state.families, q]);
  const pg = usePagination(rows, 10);

  if (!can(role, "familias")) return <Restricted />;
  if (loading) return <PageLoading />;
  const canEdit = role !== "professor";
  const fam = familia
    ? state.families.find((f) => f.id === familia)
    : undefined;

  if (familia && !fam)
    return (
      <Panel>
        <EmptyState
          title="Família não encontrada"
          action={
            <Button
              variant="outline"
              onClick={() => nav({ to: "/familias", search: {} })}
            >
              Voltar
            </Button>
          }
        />
      </Panel>
    );

  if (fam) {
    const guardians = state.guardians.filter((g) => g.familyId === fam.id);
    const authorized = state.authorized.filter((a) => a.familyId === fam.id);
    const kids = state.children.filter((c) => c.familyId === fam.id);
    // Autoriza/revoga a retirada de TODAS as crianças da família para uma pessoa.
    const PickupControl = ({ personId, name }: { personId: string; name: string }) => {
      if (kids.length === 0) return null;
      const n = kids.filter((k) => k.authorizedIds.includes(personId)).length;
      const all = n === kids.length;
      return (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Retirada das crianças</span>
            <StatusPill
              value={n > 0 ? "ativo" : "inativo"}
              label={
                n === 0
                  ? "Não retira"
                  : all
                    ? "Pode retirar"
                    : `Retira ${n}/${kids.length}`
              }
            />
          </div>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                attempt(async () => {
                  for (const k of kids)
                    if (k.authorizedIds.includes(personId) === all)
                      await toggleAuthorization(k.id, personId);
                }, all ? `Retirada revogada para ${name}.` : `${name} pode retirar as crianças.`)
              }
            >
              {all ? <ShieldOff /> : <ShieldCheck />}
              {all ? "Revogar retirada" : "Autorizar retirada"}
            </Button>
          )}
        </div>
      );
    };
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-2"
          onClick={() => nav({ to: "/familias", search: {} })}
        >
          <ArrowLeft /> Famílias
        </Button>
        <PageHeader
          title={fam.name}
          description={`${fam.code} • ${fam.phone}${fam.email ? ` • ${fam.email}` : ""}${fam.address ? ` • ${fam.address}` : ""}`}
          actions={
            canEdit && (
              <Button
                variant="outline"
                onClick={() => setDlg({ kind: "family", item: fam })}
              >
                <Pencil /> Editar família
              </Button>
            )
          }
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel
            title={`Crianças (${kids.length})`}
            action={
              canEdit && (
                <Button asChild size="sm" variant="outline">
                  <Link to="/criancas/novo">
                    <Plus /> Criança
                  </Link>
                </Button>
              )
            }
          >
            {kids.length === 0 ? (
              <EmptyState title="Nenhuma criança vinculada" />
            ) : (
              <ul className="-my-2 divide-y">
                {kids.map((k) => (
                  <li key={k.id} className="flex items-center gap-3 py-2.5">
                    <KidAvatar child={k} size="sm" />
                    <Link
                      to="/criancas/$id"
                      params={{ id: k.id }}
                      className="flex-1 text-sm font-medium hover:text-primary"
                    >
                      {k.fullName}
                    </Link>
                    <span className="font-mono text-xs text-muted-foreground">
                      {k.code}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel
            title={`Responsáveis (${guardians.length})`}
            action={
              canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDlg({ kind: "guardian" })}
                >
                  <UserPlus /> Responsável
                </Button>
              )
            }
          >
            {guardians.length === 0 ? (
              <EmptyState
                title="Nenhum responsável"
                text="Cadastre ao menos um responsável."
              />
            ) : (
              <ul className="divide-y">
                {guardians.map((g) => (
                  <li key={g.id} className="py-4 first:pt-1 last:pb-1">
                    <div className="flex items-start gap-3">
                      <KidAvatar
                        child={{ id: g.id, fullName: g.fullName, nickname: g.fullName }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="font-medium">{g.fullName}</p>
                          {g.primary && (
                            <StatusPill
                              value="ativo"
                              label="Principal"
                              tone="primary"
                            />
                          )}
                          {!g.active && (
                            <StatusPill value="inativo" label="Inativo" />
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {g.relation}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {g.phone} • contato por {g.contactPref}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <WhatsAppButton
                          guardian={g}
                          size="icon"
                          message={`Olá, ${g.fullName.split(" ")[0]}! Aqui é do Ministério Infantil da ${state.settings.name}.`}
                        />
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar ${g.fullName}`}
                            onClick={() => setDlg({ kind: "guardian", item: g })}
                          >
                            <Pencil />
                          </Button>
                        )}
                      </div>
                    </div>
                    <PickupControl personId={g.id} name={g.fullName} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel
            title={`Pessoas autorizadas a buscar (${authorized.length})`}
            className="lg:col-span-2"
            action={
              canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDlg({ kind: "auth" })}
                >
                  <UserPlus /> Autorizada
                </Button>
              )
            }
          >
            {authorized.length === 0 ? (
              <EmptyState title="Nenhuma pessoa autorizada além dos responsáveis" />
            ) : (
              <ul className="divide-y">
                {authorized.map((a) => {
                  const expired = new Date(a.validUntil) < new Date();
                  return (
                    <li key={a.id} className="py-4 first:pt-1 last:pb-1">
                      <div className="flex items-start gap-3">
                        <KidAvatar
                          child={{ id: a.id, fullName: a.fullName, nickname: a.fullName }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className="font-medium">{a.fullName}</p>
                            {expired ? (
                              <StatusPill
                                value="cancelado"
                                label="Vencida"
                                tone="danger"
                              />
                            ) : (
                              <StatusPill
                                value={a.active ? "ativo" : "inativo"}
                                label={a.active ? "Vigente" : "Revogada"}
                              />
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {a.relation}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {a.phone} • válido até {date(a.validUntil)}
                          </p>
                        </div>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Editar ${a.fullName}`}
                            onClick={() => setDlg({ kind: "auth", item: a })}
                          >
                            <Pencil />
                          </Button>
                        )}
                      </div>
                      <PickupControl personId={a.id} name={a.fullName} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
          {canEdit && <AppAccessPanel familyId={fam.id} />}
        </div>
        <FamilyDialog
          open={dlg?.kind === "family"}
          initial={dlg?.item as Family}
          onClose={() => setDlg(null)}
        />
        <GuardianDialog
          open={dlg?.kind === "guardian"}
          familyId={fam.id}
          initial={dlg?.item as Guardian}
          onClose={() => setDlg(null)}
        />
        <AuthorizedDialog
          open={dlg?.kind === "auth"}
          familyId={fam.id}
          initial={dlg?.item as AuthorizedPerson}
          onClose={() => setDlg(null)}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Famílias e responsáveis"
        description={`${state.families.length} famílias`}
        actions={
          canEdit && (
            <Button onClick={() => setDlg({ kind: "family" })}>
              <Plus /> Nova família
            </Button>
          )
        }
      />
      <ErrorBanner />
      <div className="card-surface">
        <div className="flex gap-2 border-b p-4">
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder="Buscar por nome, código ou telefone"
          />
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              state.families.length
                ? "Nenhuma família encontrada"
                : "Nenhuma família cadastrada"
            }
            text={
              state.families.length
                ? "Ajuste a busca."
                : "Cadastre a primeira família."
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Família</TableHead>
                  <TableHead className="hidden sm:table-cell">Código</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Telefone
                  </TableHead>
                  <TableHead>Crianças</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pg.slice.map((f) => (
                  <TableRow
                    key={f.id}
                    className="cursor-pointer"
                    onClick={() =>
                      nav({ to: "/familias", search: { familia: f.id } })
                    }
                  >
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell className="hidden font-mono text-xs sm:table-cell">
                      {f.code}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {f.phone}
                    </TableCell>
                    <TableCell>
                      {state.children.filter((c) => c.familyId === f.id).length}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pager {...pg} />
          </>
        )}
      </div>
      <FamilyDialog
        open={dlg?.kind === "family"}
        onClose={(f) => {
          setDlg(null);
          if (f) nav({ to: "/familias", search: { familia: f.id } });
        }}
      />
    </>
  );
}
