import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Baby,
  Users,
  UserCheck,
  Clock,
  BellRing,
  ArrowLeftRight,
  UserPlus,
  LogIn,
  LogOut,
  QrCode,
  Pill,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStore } from "@/lib/store";
import {
  PageHeader,
  Panel,
  StatCard,
  KidAvatar,
  StatusPill,
  EmptyState,
} from "@/components/app/ui-bits";
import { Button } from "@/components/ui/button";
import { weeklyAttendance } from "@/lib/domain/rules";
import type { Medication } from "@/lib/domain/care";
import type { Child } from "@/lib/domain/types";
import { PageLoading, SeedCard } from "@/components/app/page-bits";
import { CALL_REASON, CALL_STATUS, ago, time } from "@/lib/domain/labels";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Kids Ministério" },
      {
        name: "description",
        content:
          "Visão do dia: crianças presentes, chamadas pendentes, entradas e saídas do ministério infantil.",
      },
      { property: "og:title", content: "Dashboard — Kids Ministério" },
      {
        property: "og:description",
        content: "Visão do dia do ministério infantil.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { state, currentUser, loading, role } = useStore();
  const today = new Date().toDateString();
  const open = state.attendance.filter((a) => !a.checkOutAt);
  const todayIn = state.attendance.filter(
    (a) => new Date(a.checkInAt).toDateString() === today,
  ).length;
  const todayOut = state.attendance.filter(
    (a) => a.checkOutAt && new Date(a.checkOutAt).toDateString() === today,
  ).length;
  const pendingCalls = state.calls.filter(
    (c) => !["atendida", "cancelada"].includes(c.status),
  );
  const waitingPickup = new Set(pendingCalls.map((c) => c.childId)).size;
  const byClass = state.classes.map((c) => ({
    name: c.name,
    value: state.children.filter(
      (k) => k.classId === c.id && k.status === "ativo",
    ).length,
    color: `var(--${c.color})`,
  }));
  // Medicações de hoje: crianças presentes (ou só com selo, sem o detalhe).
  const presentIds = new Set(open.map((a) => a.childId));
  const meds = state.children
    .filter((k) => presentIds.has(k.id) && k.hasMedication)
    .flatMap((k): { kid: Child; m: Medication | null }[] => {
      const list = (k.care?.medications ?? []).filter((m) => m.name.trim());
      return list.length
        ? list.map((m) => ({ kid: k, m }))
        : [{ kid: k, m: null }];
    })
    .sort((a, b) =>
      (a.m?.times[0] ?? "99:99").localeCompare(b.m?.times[0] ?? "99:99"),
    );
  const weekly = weeklyAttendance(state.attendance);
  const child = (id: string) =>
    state.children.find((c) => c.id === id) ??
    ({
      id,
      fullName: "Cadastro removido",
      nickname: "?",
      classId: "",
    } as (typeof state.children)[number]);
  const cls = (id: string) => state.classes.find((c) => c.id === id)?.name;

  if (loading) return <PageLoading />;
  return (
    <>
      {state.children.length === 0 && state.classes.length === 0 && (
        <SeedCard canSeed={role === "admin"} />
      )}
      <PageHeader
        title={`Olá, ${currentUser.split(" ")[0] === "Pr." ? currentUser.split(" ")[1] : currentUser.split(" ")[0]}`}
        description={
          new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }) + " • Resumo do ministério infantil"
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Button
          asChild
          variant="outline"
          className="h-auto justify-start gap-3 py-3"
        >
          <Link to="/criancas/novo">
            <UserPlus className="text-primary" />
            Cadastrar criança
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-auto justify-start gap-3 py-3"
        >
          <Link to="/checkin" search={{ modo: "entrada" }}>
            <LogIn className="text-success" />
            Iniciar check-in
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-auto justify-start gap-3 py-3"
        >
          <Link to="/checkin" search={{ modo: "saida" }}>
            <LogOut className="text-warning" />
            Realizar check-out
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-auto justify-start gap-3 py-3"
        >
          <Link to="/crachas">
            <QrCode className="text-primary" />
            Gerar crachá
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          icon={UserCheck}
          label="Presentes agora"
          value={open.length}
          tone="success"
        />
        <StatCard
          icon={Baby}
          label="Crianças cadastradas"
          value={state.children.length}
        />
        <StatCard icon={Users} label="Famílias" value={state.families.length} />
        <StatCard
          icon={Clock}
          label="Aguardando retirada"
          value={waitingPickup}
          tone="warning"
        />
        <StatCard
          icon={BellRing}
          label="Chamadas pendentes"
          value={pendingCalls.length}
          tone="danger"
        />
        <StatCard
          icon={ArrowLeftRight}
          label="Entradas / saídas hoje"
          value={`${todayIn} / ${todayOut}`}
          tone="neutral"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel title="Frequência semanal" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={weekly}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="dia"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  width={30}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                  }}
                />
                <Bar
                  dataKey="presencas"
                  name="Presenças"
                  fill="var(--primary)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Crianças por turma">
          <div className="h-44">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={byClass}
                  dataKey="value"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {byClass.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {byClass.map((d) => (
              <li key={d.name} className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: d.color }}
                />
                {d.name}
                <span className="ml-auto font-semibold tabular-nums">
                  {d.value}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel
          title={`Presentes (${open.length})`}
          action={
            <Link to="/checkin" className="text-xs font-semibold text-primary">
              Ver todos
            </Link>
          }
        >
          {open.length === 0 ? (
            <EmptyState title="Nenhuma criança presente" />
          ) : (
            <ul className="-my-2 divide-y">
              {open.slice(0, 7).map((a) => {
                const c = child(a.childId);
                return (
                  <li key={a.id} className="flex items-center gap-3 py-2.5">
                    <KidAvatar child={c} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/criancas/$id"
                        params={{ id: c.id }}
                        className="block truncate text-sm font-medium hover:text-primary"
                      >
                        {c.fullName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {cls(c.classId)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {time(a.checkInAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel
          title="Chamadas aguardando"
          action={
            <Link to="/chamadas" className="text-xs font-semibold text-primary">
              Central
            </Link>
          }
        >
          {pendingCalls.length === 0 ? (
            <EmptyState
              title="Sem chamadas pendentes"
              text="Tudo tranquilo nas salas."
            />
          ) : (
            <ul className="space-y-3">
              {pendingCalls.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border bg-danger-soft/40 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">
                      {child(c.childId).fullName}
                    </p>
                    <StatusPill
                      value={c.status}
                      label={CALL_STATUS[c.status]}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cls(c.classId)} • {CALL_REASON[c.reason]} •{" "}
                    {ago(c.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {meds.length > 0 && (
          <Panel title={`Medicações de hoje (${meds.length})`} className="lg:col-span-3">
            <ul className="divide-y">
              {meds.map(({ kid, m }, i) => (
                <li key={i} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <Pill className="size-4 shrink-0 text-primary" />
                  <Link
                    to="/criancas/$id"
                    params={{ id: kid.id }}
                    className="font-medium hover:underline"
                  >
                    {kid.nickname || kid.fullName}
                  </Link>
                  {m ? (
                    <span className="text-muted-foreground">
                      {m.name}
                      {m.dose ? ` · ${m.dose}` : ""}
                      {m.times.length ? ` · ${m.times.join(", ")}` : ""}
                      {m.note ? ` · ${m.note}` : ""}
                      {` · ${m.staffGives ? "a equipe administra" : "só avisar"}`}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Toma medicação — detalhes com a coordenação.
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        )}
        <Panel title="Atividades recentes">
          <ol className="relative space-y-4 border-l pl-4">
            {state.audit.slice(0, 7).map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-card bg-primary" />
                <p className="text-sm">{e.action}</p>
                <p className="text-xs text-muted-foreground">
                  {e.user} • {ago(e.at)}
                </p>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}
