import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Lock,
  Pencil,
  QrCode,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { ageFrom, can, openAttendance } from "@/lib/domain/rules";
import {
  BADGE_STATUS,
  CALL_REASON,
  CALL_STATUS,
  CHILD_STATUS,
  date,
  dateTime,
} from "@/lib/domain/labels";
import { WhatsAppButton } from "@/components/app/whatsapp-button";
import { ChildForm } from "@/components/app/child-form";
import { CarePanel } from "@/components/app/care-panel";
import {
  EmptyState,
  KidAvatar,
  PageHeader,
  Panel,
  Restricted,
  StatusPill,
} from "@/components/app/ui-bits";
import { PageLoading, attempt } from "@/components/app/page-bits";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/criancas/$id")({
  validateSearch: (s: Record<string, unknown>): { editar?: boolean } => ({
    editar: s.editar === true || s.editar === "true" ? true : undefined,
  }),
  head: () => ({ meta: [{ title: "Cadastro da criança — Espaço Kids" }] }),
  component: ChildDetail,
});

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
      <dt className="w-48 shrink-0 text-sm text-muted-foreground">{k}</dt>
      <dd className="text-sm font-medium">{v || "—"}</dd>
    </div>
  );
}

function ChildDetail() {
  const { id } = Route.useParams();
  const { editar } = Route.useSearch();
  const nav = useNavigate();
  const { state, role, loading, toggleAuthorization } = useStore();
  if (!can(role, "criancas")) return <Restricted />;
  if (loading) return <PageLoading />;
  const c = state.children.find((x) => x.id === id);
  if (!c)
    return (
      <Panel>
        <EmptyState
          title="Criança não encontrada"
          text="O cadastro pode ter sido removido."
          action={
            <Button asChild variant="outline">
              <Link to="/criancas">Voltar à lista</Link>
            </Button>
          }
        />
      </Panel>
    );

  const canEdit = role !== "professor";
  const family = state.families.find((f) => f.id === c.familyId);
  const cls = state.classes.find((x) => x.id === c.classId);
  const guardians = state.guardians.filter((g) => c.guardianIds.includes(g.id));
  const people = [
    ...state.guardians
      .filter((g) => g.familyId === c.familyId)
      .map((g) => ({
        id: g.id,
        name: g.fullName,
        relation: g.relation,
        phone: g.phone,
        kind: "Responsável",
        validUntil: "",
        active: g.active,
      })),
    ...state.authorized
      .filter((a) => a.familyId === c.familyId)
      .map((a) => ({
        id: a.id,
        name: a.fullName,
        relation: a.relation,
        phone: a.phone,
        kind: "Autorizado",
        validUntil: a.validUntil,
        active: a.active,
      })),
  ];
  const att = state.attendance
    .filter((a) => a.childId === c.id)
    .sort((a, b) => b.checkInAt.localeCompare(a.checkInAt));
  const calls = state.calls.filter((x) => x.childId === c.id);
  const badges = state.badges.filter((b) => b.childId === c.id);
  const here = !!openAttendance(state.attendance, c.id);

  if (editar && canEdit)
    return (
      <>
        <PageHeader
          title={`Editar — ${c.nickname}`}
          actions={
            <Button variant="outline" asChild>
              <Link to="/criancas/$id" params={{ id }}>
                <ArrowLeft /> Cancelar
              </Link>
            </Button>
          }
        />
        <Panel>
          <ChildForm
            initial={c}
            onSaved={() => {
              toast.success("Cadastro atualizado.");
              nav({ to: "/criancas/$id", params: { id }, search: {} });
            }}
          />
        </Panel>
      </>
    );

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
        <Link to="/criancas">
          <ArrowLeft /> Crianças
        </Link>
      </Button>
      <div className="card-surface mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <KidAvatar child={c} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold">{c.fullName}</h1>
          <p className="text-sm text-muted-foreground">
            {c.nickname} • {ageFrom(c.birthDate)} anos •{" "}
            <span className="font-mono">{c.code}</span> •{" "}
            {cls?.name ?? "Sem turma"}
          </p>
          <div className="mt-2 flex gap-2">
            {here && <StatusPill value="presente" label="Presente agora" />}
            <StatusPill value={c.status} label={CHILD_STATUS[c.status]} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {can(role, "crachas") && (
            <Button asChild variant="outline">
              <Link to="/crachas" search={{ crianca: c.id }}>
                <QrCode /> Crachá
              </Link>
            </Button>
          )}
          {canEdit && (
            <Button asChild>
              <Link
                to="/criancas/$id"
                params={{ id }}
                search={{ editar: true }}
              >
                <Pencil /> Editar
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="mb-4 h-auto flex-wrap">
          <TabsTrigger value="info">Informações</TabsTrigger>
          {can(role, "saude") && (
            <TabsTrigger value="saude">Saúde e cuidados</TabsTrigger>
          )}
          <TabsTrigger value="familia">Família</TabsTrigger>
          <TabsTrigger value="autorizados">Autorizados</TabsTrigger>
          <TabsTrigger value="presenca">Presença</TabsTrigger>
          <TabsTrigger value="chamadas">Chamadas</TabsTrigger>
          <TabsTrigger value="crachas">Crachás</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Panel>
            <dl className="divide-y">
              <Row k="Nome completo" v={c.fullName} />
              <Row k="Como é conhecida" v={c.nickname} />
              <Row
                k="Nascimento"
                v={`${date(c.birthDate)} (${ageFrom(c.birthDate)} anos)`}
              />
              <Row k="Turma" v={cls ? `${cls.name} — ${cls.room}` : ""} />
              <Row k="Observações de cuidado" v={c.notes} />
              <Row
                k="Alergias e saúde"
                v={
                  can(role, "saude") ? (
                    c.health || "Nada informado"
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Lock className="size-3.5" /> Acesso restrito à
                      coordenação
                    </span>
                  )
                }
              />
            </dl>
          </Panel>
        </TabsContent>

        {can(role, "saude") && (
          <TabsContent value="saude">
            <Panel>
              <CarePanel child={c} />
            </Panel>
          </TabsContent>
        )}

        <TabsContent value="familia">
          <Panel title={family ? `${family.name} • ${family.code}` : "Família"}>
            {family ? (
              <>
                <p className="mb-3 text-sm text-muted-foreground">
                  {family.phone}
                  {family.email ? ` • ${family.email}` : ""}
                </p>
                <ul className="divide-y">
                  {guardians.map((g) => (
                    <li
                      key={g.id}
                      className="flex items-center justify-between py-2.5 text-sm"
                    >
                      <span className="font-medium">
                        {g.fullName}{" "}
                        <span className="font-normal text-muted-foreground">
                          • {g.relation}
                          {g.primary ? " • principal" : ""}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 text-muted-foreground">
                        {g.phone}
                        <WhatsAppButton
                          guardian={g}
                          size="icon"
                          message={`Olá, ${g.fullName.split(" ")[0]}! Aqui é do Ministério Infantil da ${state.settings.name}.`}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link to="/familias" search={{ familia: family.id }}>
                    Abrir família
                  </Link>
                </Button>
              </>
            ) : (
              <EmptyState title="Sem família vinculada" />
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="autorizados">
          <Panel title="Quem pode retirar esta criança">
            <p className="mb-3 text-sm text-muted-foreground">
              Nem todo familiar cadastrado está autorizado. A autorização
              precisa ser concedida explicitamente.
            </p>
            {people.length === 0 ? (
              <EmptyState title="Nenhuma pessoa cadastrada" />
            ) : (
              <ul className="divide-y">
                {people.map((p) => {
                  const ok = c.authorizedIds.includes(p.id);
                  const expired =
                    p.validUntil && new Date(p.validUntil) < new Date();
                  return (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center gap-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.kind} • {p.relation} • {p.phone}
                          {p.validUntil
                            ? ` • válido até ${date(p.validUntil)}`
                            : ""}
                        </p>
                      </div>
                      {expired ? (
                        <StatusPill
                          value="cancelado"
                          label="Vencida"
                          tone="danger"
                        />
                      ) : (
                        <StatusPill
                          value={ok ? "ativo" : "inativo"}
                          label={ok ? "Autorizado" : "Não autorizado"}
                        />
                      )}
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            attempt(
                              () => toggleAuthorization(c.id, p.id),
                              ok
                                ? "Autorização revogada."
                                : "Autorização concedida.",
                            )
                          }
                        >
                          {ok ? (
                            <>
                              <ShieldOff /> Revogar
                            </>
                          ) : (
                            <>
                              <ShieldCheck /> Autorizar
                            </>
                          )}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="presenca">
          <Panel title="Histórico de presença">
            {att.length === 0 ? (
              <EmptyState title="Sem registros de presença" />
            ) : (
              <ul className="divide-y text-sm">
                {att.slice(0, 30).map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap justify-between gap-2 py-2.5"
                  >
                    <span>
                      Entrada {dateTime(a.checkInAt)} — {a.droppedBy}
                    </span>
                    <span className="text-muted-foreground">
                      {a.checkOutAt
                        ? `Saída ${dateTime(a.checkOutAt)} — ${a.pickedUpBy}`
                        : "Ainda presente"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="chamadas">
          <Panel title="Histórico de chamadas">
            {calls.length === 0 ? (
              <EmptyState title="Nenhuma chamada" />
            ) : (
              <ul className="divide-y text-sm">
                {calls.map((x) => (
                  <li
                    key={x.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <span>
                      {dateTime(x.createdAt)} — {CALL_REASON[x.reason]}{" "}
                      <span className="text-muted-foreground">
                        ({x.requestedBy})
                      </span>
                    </span>
                    <StatusPill
                      value={x.status}
                      label={CALL_STATUS[x.status]}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="crachas">
          <Panel title="Crachás emitidos">
            {badges.length === 0 ? (
              <EmptyState
                title="Nenhum crachá emitido"
                action={
                  can(role, "crachas") && (
                    <Button asChild>
                      <Link to="/crachas" search={{ crianca: c.id }}>
                        Emitir crachá
                      </Link>
                    </Button>
                  )
                }
              />
            ) : (
              <ul className="divide-y text-sm">
                {badges
                  .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
                  .map((b) => (
                    <li
                      key={b.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                    >
                      <span>
                        Emitido em {date(b.issuedAt)} • validade{" "}
                        {date(b.expiresAt)}
                      </span>
                      <StatusPill
                        value={b.status}
                        label={BADGE_STATUS[b.status]}
                      />
                    </li>
                  ))}
              </ul>
            )}
          </Panel>
        </TabsContent>
      </Tabs>
    </>
  );
}
