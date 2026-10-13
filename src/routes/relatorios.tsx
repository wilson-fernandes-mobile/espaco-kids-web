import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Download, Printer } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  can,
  isIncomplete,
  monthlyAverage,
  openAttendance,
} from "@/lib/domain/rules";
import { CALL_REASON, CALL_STATUS, dateTime } from "@/lib/domain/labels";
import { downloadCsv } from "@/lib/csv";
import {
  EmptyState,
  PageHeader,
  Panel,
  Restricted,
} from "@/components/app/ui-bits";
import {
  ErrorBanner,
  PageLoading,
  Pager,
  SearchBox,
  selectCls,
  usePagination,
} from "@/components/app/page-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Espaço Kids" }] }),
  component: ReportsPage,
});

type Kind =
  | "frequencia"
  | "historico"
  | "presentes"
  | "chamadas"
  | "ocorrencias"
  | "incompletos";
const KINDS: [Kind, string][] = [
  ["frequencia", "Frequência"],
  ["historico", "Entradas e saídas"],
  ["presentes", "Presentes por turma"],
  ["chamadas", "Chamadas"],
  ["ocorrencias", "Ocorrências"],
  ["incompletos", "Cadastros incompletos"],
];
const iso = (d: Date) => d.toISOString().slice(0, 10);

function ReportsPage() {
  const { state, role, loading } = useStore();
  const [kind, setKind] = useState<Kind>("frequencia");
  const [from, setFrom] = useState(iso(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(iso(new Date()));
  const [cls, setCls] = useState("");
  const [q, setQ] = useState("");

  const report = useMemo(() => {
    const inRange = (at: string) =>
      at.slice(0, 10) >= from && at.slice(0, 10) <= to;
    const kid = (id: string) => state.children.find((c) => c.id === id);
    const className = (id?: string) =>
      state.classes.find((c) => c.id === id)?.name ?? "—";
    const match = (name: string) =>
      !q.trim() || name.toLowerCase().includes(q.trim().toLowerCase());
    const classOk = (id?: string) => !cls || id === cls;

    switch (kind) {
      case "frequencia": {
        const byDay = new Map<string, number>();
        state.attendance
          .filter(
            (a) =>
              inRange(a.checkInAt) &&
              classOk(kid(a.childId)?.classId) &&
              match(kid(a.childId)?.fullName ?? ""),
          )
          .forEach((a) => {
            const d = a.checkInAt.slice(0, 10);
            byDay.set(d, (byDay.get(d) ?? 0) + 1);
          });
        const days = [...byDay.entries()].sort((a, b) =>
          b[0].localeCompare(a[0]),
        );
        return {
          headers: ["Data", "Presenças"],
          rows: days.map(
            ([d, n]) =>
              [
                new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }),
                n,
              ] as (string | number)[],
          ),
          file: "frequencia",
        };
      }
      case "historico":
        return {
          headers: [
            "Criança",
            "Código",
            "Turma",
            "Entrada",
            "Entregue por",
            "Saída",
            "Retirada por",
          ],
          rows: state.attendance
            .filter(
              (a) =>
                inRange(a.checkInAt) &&
                classOk(kid(a.childId)?.classId) &&
                match(kid(a.childId)?.fullName ?? ""),
            )
            .sort((a, b) => b.checkInAt.localeCompare(a.checkInAt))
            .map((a) => [
              kid(a.childId)?.fullName ?? "—",
              kid(a.childId)?.code ?? "—",
              className(kid(a.childId)?.classId),
              dateTime(a.checkInAt),
              a.droppedBy,
              a.checkOutAt ? dateTime(a.checkOutAt) : "Presente",
              a.pickedUpBy ?? "—",
            ]),
          file: "entradas-saidas",
        };
      case "presentes":
        return {
          headers: ["Turma", "Criança", "Código", "Entrada"],
          rows: state.children
            .filter(
              (c) =>
                openAttendance(state.attendance, c.id) &&
                classOk(c.classId) &&
                match(c.fullName),
            )
            .sort(
              (a, b) =>
                className(a.classId).localeCompare(className(b.classId)) ||
                a.fullName.localeCompare(b.fullName),
            )
            .map((c) => [
              className(c.classId),
              c.fullName,
              c.code,
              dateTime(openAttendance(state.attendance, c.id)!.checkInAt),
            ]),
          file: "presentes-por-turma",
        };
      case "chamadas":
        return {
          headers: [
            "Data",
            "Criança",
            "Turma",
            "Motivo",
            "Solicitante",
            "Situação",
          ],
          rows: state.calls
            .filter(
              (c) =>
                inRange(c.createdAt) &&
                classOk(c.classId) &&
                match(kid(c.childId)?.fullName ?? ""),
            )
            .map((c) => [
              dateTime(c.createdAt),
              kid(c.childId)?.fullName ?? "—",
              className(c.classId),
              CALL_REASON[c.reason],
              c.requestedBy,
              CALL_STATUS[c.status],
            ]),
          file: "chamadas",
        };
      case "ocorrencias":
        return {
          headers: ["Data", "Usuário", "Registro"],
          rows: state.audit
            .filter((a) => inRange(a.at) && match(a.action + a.user))
            .map((a) => [dateTime(a.at), a.user, a.action]),
          file: "ocorrencias",
        };
      case "incompletos":
        return {
          headers: ["Criança", "Código", "Turma", "Pendências"],
          rows: state.children
            .filter(
              (c) => isIncomplete(c) && classOk(c.classId) && match(c.fullName),
            )
            .map((c) => [
              c.fullName,
              c.code,
              className(c.classId),
              [
                !c.photoUrl && "sem foto",
                c.guardianIds.length === 0 && "sem responsável",
                c.authorizedIds.length === 0 && "sem pessoa autorizada",
                !c.birthDate && "sem nascimento",
              ]
                .filter(Boolean)
                .join(", "),
            ]),
          file: "cadastros-incompletos",
        };
    }
  }, [state, kind, from, to, cls, q]);

  const pg = usePagination(report.rows, 15);
  const monthly = useMemo(
    () => monthlyAverage(state.attendance),
    [state.attendance],
  );
  if (!can(role, "relatorios")) return <Restricted />;
  if (loading) return <PageLoading />;
  const needsDates = !["presentes", "incompletos"].includes(kind);

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Relatórios"
          description="Consulte, exporte e imprima. Respeita as permissões do seu perfil."
          actions={
            <>
              <Button
                variant="outline"
                disabled={!report.rows.length}
                onClick={() =>
                  downloadCsv(
                    `${report.file}-${iso(new Date())}.csv`,
                    report.headers,
                    report.rows,
                  )
                }
              >
                <Download /> Exportar CSV
              </Button>
              <Button
                variant="outline"
                disabled={!report.rows.length}
                onClick={() => window.print()}
              >
                <Printer /> Imprimir
              </Button>
            </>
          }
        />
        <ErrorBanner />
        <Tabs
          value={kind}
          onValueChange={(v) => setKind(v as Kind)}
          className="mb-4 overflow-x-auto"
        >
          <TabsList className="h-auto">
            {KINDS.map(([k, l]) => (
              <TabsTrigger key={k} value={k} className="whitespace-nowrap">
                {l}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="card-surface mb-6 flex flex-wrap items-end gap-3 p-4">
          {needsDates && (
            <>
              <label className="text-xs font-medium text-muted-foreground">
                De
                <Input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 h-9 w-40"
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Até
                <Input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 h-9 w-40"
                />
              </label>
            </>
          )}
          <label className="text-xs font-medium text-muted-foreground">
            Turma
            <select
              className={selectCls + " mt-1 w-44"}
              value={cls}
              onChange={(e) => setCls(e.target.value)}
            >
              <option value="">Todas</option>
              {state.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="min-w-[200px] flex-1">
            <SearchBox
              value={q}
              onChange={setQ}
              placeholder="Filtrar por criança"
            />
          </div>
        </div>

        {kind === "frequencia" && (
          <Panel title="Média de presenças por dia (6 meses)" className="mb-6">
            <div className="h-48">
              <ResponsiveContainer>
                <BarChart data={monthly}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="mes"
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
                  <Tooltip />
                  <Bar
                    dataKey="media"
                    name="Média"
                    fill="var(--chart-2)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        )}
      </div>

      <div className="card-surface">
        <header className="print-only border-b p-4">
          <h2 className="font-bold">
            {state.settings.name} — {KINDS.find(([k]) => k === kind)?.[1]}
          </h2>
          {needsDates && (
            <p className="text-sm">
              Período: {from} a {to}
            </p>
          )}
        </header>
        {report.rows.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="Sem resultados"
            text="Nenhum registro para os filtros selecionados."
          />
        ) : (
          <>
            <div className="no-print">
              <Table>
                <TableHeader>
                  <TableRow>
                    {report.headers.map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pg.slice.map((r, i) => (
                    <TableRow key={i}>
                      {r.map((c, j) => (
                        <TableCell key={j}>{c}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="print-only">
              <Table>
                <TableHeader>
                  <TableRow>
                    {report.headers.map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rows.map((r, i) => (
                    <TableRow key={i}>
                      {r.map((c, j) => (
                        <TableCell key={j}>{c}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="no-print">
              <Pager {...pg} />
            </div>
            <p className="no-print border-t px-4 py-3 text-xs text-muted-foreground">
              {report.rows.length} registro(s)
            </p>
          </>
        )}
      </div>
    </>
  );
}
