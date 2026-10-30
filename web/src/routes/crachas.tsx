import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  CircleHelp,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  ScanLine,
  Search,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { can } from "@/lib/domain/rules";
import { BADGE_STATUS, date } from "@/lib/domain/labels";
import { BadgeCard } from "@/components/app/badge-card";
import { ScanToggle, parseQr } from "@/components/app/qr-scanner";
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
  Pager,
  SearchBox,
  attempt,
  usePagination,
} from "@/components/app/page-bits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type { Badge, Child } from "@/lib/domain/types";

export const Route = createFileRoute("/crachas")({
  validateSearch: (s: Record<string, unknown>): { crianca?: string } => ({
    crianca: typeof s.crianca === "string" ? s.crianca : undefined,
  }),
  head: () => ({ meta: [{ title: "Crachás e QR Codes — Espaço Kids" }] }),
  component: BadgesPage,
});

function BadgesPage() {
  const { crianca } = Route.useSearch();
  const { state, role, loading, issueBadge, setBadgeStatus } = useStore();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<string | null>(crianca ?? null);
  const [printIds, setPrintIds] = useState<string[]>([]);
  const [lookup, setLookup] = useState("");
  const [found, setFound] = useState<{
    child?: Child;
    badge?: Badge;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (crianca) setPreview(crianca);
  }, [crianca]);

  const activeBadge = (id: string) =>
    state.badges.find((b) => b.childId === id && b.status === "ativo");
  const lastBadge = (id: string) =>
    state.badges
      .filter((b) => b.childId === id)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))[0];

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return state.children
      .filter((c) => c.status !== "inativo")
      .filter(
        (c) =>
          !t ||
          c.fullName.toLowerCase().includes(t) ||
          c.code.toLowerCase().includes(t),
      )
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
  }, [state.children, q]);
  const pg = usePagination(rows, 10);

  if (!can(role, "crachas")) return <Restricted />;
  if (loading) return <PageLoading />;

  const cls = (c: Child) => state.classes.find((x) => x.id === c.classId);
  const fam = (c: Child) => state.families.find((x) => x.id === c.familyId);
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const print = (ids: string[]) => {
    setPrintIds(ids);
    // aguarda renderização da área de impressão
    setTimeout(() => window.print(), 150);
  };

  const search = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    const token = parseQr(v);
    let badge = state.badges.find((b) => b.token === token);
    let child = badge
      ? state.children.find((c) => c.id === badge!.childId)
      : state.children.find((c) => c.code.toLowerCase() === v.toLowerCase());
    if (!badge && child) badge = activeBadge(child.id);
    if (!child)
      return setFound({
        error: "Nenhum cadastro encontrado para este código.",
      });
    if (badge && badge.status !== "ativo")
      return setFound({
        child,
        badge,
        error: `Crachá ${BADGE_STATUS[badge.status].toLowerCase()}. Não utilize para entrada/saída.`,
      });
    if (badge && new Date(badge.expiresAt) < new Date())
      return setFound({ child, badge, error: "Crachá expirado. Reemita." });
    setFound({ child, badge });
  };

  const printable = printIds
    .map((id) => ({
      c: state.children.find((x) => x.id === id),
      b: activeBadge(id),
    }))
    .filter((x): x is { c: Child; b: Badge } => !!x.c && !!x.b);
  const pv = preview ? state.children.find((c) => c.id === preview) : undefined;
  const pvBadge = pv ? activeBadge(pv.id) : undefined;

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Crachás e QR Codes"
          description="O QR Code contém apenas um identificador aleatório — nenhum dado pessoal."
          actions={
            selected.size > 0 && (
              <Button onClick={() => print([...selected])}>
                <Printer /> Imprimir {selected.size} selecionado(s)
              </Button>
            )
          }
        />
        <ErrorBanner />
        <Tabs defaultValue="lista">
          <TabsList className="mb-4">
            <TabsTrigger value="lista">
              <QrCode className="size-4" /> Crachás
            </TabsTrigger>
            <TabsTrigger value="leitura">
              <ScanLine className="size-4" /> Ler QR Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lista">
            <div className="card-surface">
              <div className="flex gap-2 border-b p-4">
                <SearchBox
                  value={q}
                  onChange={setQ}
                  placeholder="Buscar criança ou código"
                />
              </div>
              {rows.length === 0 ? (
                <EmptyState
                  icon={QrCode}
                  title="Nenhuma criança"
                  text="Cadastre crianças para emitir crachás."
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <span className="sr-only">Selecionar</span>
                        </TableHead>
                        <TableHead>Criança</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Crachá
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          Validade
                        </TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pg.slice.map((c) => {
                        const b = lastBadge(c.id);
                        const act = activeBadge(c.id);
                        return (
                          <TableRow key={c.id}>
                            <TableCell>
                              <Checkbox
                                checked={selected.has(c.id)}
                                disabled={!act}
                                onCheckedChange={() => toggle(c.id)}
                                aria-label={`Selecionar ${c.fullName}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <KidAvatar child={c} size="sm" />
                                <div className="min-w-0">
                                  <p className="truncate font-medium">
                                    {c.fullName}
                                  </p>
                                  <p className="font-mono text-xs text-muted-foreground">
                                    {c.code}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {b ? (
                                <StatusPill
                                  value={b.status}
                                  label={BADGE_STATUS[b.status]}
                                />
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  Não emitido
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {b ? date(b.expiresAt) : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {act ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPreview(c.id)}
                                  >
                                    Ver
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Imprimir"
                                    onClick={() => print([c.id])}
                                  >
                                    <Printer />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Marcar como perdido e reemitir"
                                    title="Perdido — reemitir"
                                    onClick={async () => {
                                      if (
                                        await attempt(() =>
                                          setBadgeStatus(act.id, "perdido"),
                                        )
                                      )
                                        await attempt(
                                          () => issueBadge(c.id),
                                          "Crachá reemitido; o anterior foi invalidado.",
                                        );
                                    }}
                                  >
                                    <RefreshCw />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Cancelar crachá"
                                    title="Cancelar"
                                    onClick={() =>
                                      attempt(
                                        () =>
                                          setBadgeStatus(act.id, "cancelado"),
                                        "Crachá cancelado.",
                                      )
                                    }
                                  >
                                    <Ban />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    await attempt(
                                      () => issueBadge(c.id),
                                      "Crachá emitido.",
                                    );
                                    setPreview(c.id);
                                  }}
                                >
                                  <Plus /> Emitir
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <Pager {...pg} />
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="leitura">
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="Ler com a câmera">
                <ScanToggle onResult={(t) => search(t)} />
              </Panel>
              <Panel title="Pesquisar manualmente">
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    search(lookup);
                  }}
                >
                  <Input
                    value={lookup}
                    onChange={(e) => setLookup(e.target.value)}
                    placeholder="Código da criança (CR-1001)"
                    aria-label="Código"
                  />
                  <Button type="submit">
                    <Search /> Buscar
                  </Button>
                </form>
                <div className="mt-4">
                  {!found ? (
                    <EmptyState
                      icon={CircleHelp}
                      title="Aguardando leitura"
                      text="A leitura apenas localiza o cadastro. A retirada continua exigindo validação no check-out."
                    />
                  ) : (
                    <div className="space-y-3">
                      {found.error && (
                        <p
                          role="alert"
                          className="rounded-lg bg-danger-soft p-3 text-sm text-destructive"
                        >
                          {found.error}
                        </p>
                      )}
                      {found.child && (
                        <div className="flex items-center gap-3 rounded-xl border p-3">
                          <KidAvatar child={found.child} />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">
                              {found.child.fullName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {cls(found.child)?.name} • {found.child.code}
                            </p>
                          </div>
                          {!found.error && (
                            <Button asChild size="sm">
                              <Link to="/checkin" search={{ modo: "entrada" }}>
                                Ir ao check-in
                              </Link>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Panel>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={!!pv} onOpenChange={(o) => !o && setPreview(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Crachá de {pv?.nickname}</DialogTitle>
              <DialogDescription>
                Dimensão {state.settings.badge.widthMm}×
                {state.settings.badge.heightMm} mm (altere em Configurações).
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center overflow-auto py-2">
              {pv && pvBadge ? (
                <BadgeCard
                  child={pv}
                  badge={pvBadge}
                  cls={cls(pv)}
                  family={fam(pv)}
                  settings={state.settings}
                />
              ) : (
                pv && (
                  <Button
                    onClick={() =>
                      attempt(() => issueBadge(pv.id), "Crachá emitido.")
                    }
                  >
                    Emitir crachá
                  </Button>
                )
              )}
            </div>
            {pv && pvBadge && (
              <div className="flex justify-end">
                <Button onClick={() => print([pv.id])}>
                  <Printer /> Imprimir
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="print-only">
        <div className="print-sheet">
          {printable.map(({ c, b }) => (
            <BadgeCard
              key={b.id}
              child={c}
              badge={b}
              cls={cls(c)}
              family={fam(c)}
              settings={state.settings}
            />
          ))}
        </div>
      </div>
    </>
  );
}
