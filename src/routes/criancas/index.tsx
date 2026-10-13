import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Baby, Eye, HeartPulse, Pencil, Pill, QrCode, UserPlus } from "lucide-react";
import { useStore } from "@/lib/store";
import { can, ageFrom, openAttendance } from "@/lib/domain/rules";
import { CHILD_STATUS } from "@/lib/domain/labels";
import {
  EmptyState,
  KidAvatar,
  PageHeader,
  Restricted,
  StatusPill,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/criancas/")({
  head: () => ({ meta: [{ title: "Crianças — Espaço Kids" }] }),
  component: ChildrenPage,
});

function ChildrenPage() {
  const { state, role, loading } = useStore();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [cls, setCls] = useState("");
  const [age, setAge] = useState("");
  const [sit, setSit] = useState("");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return state.children
      .filter(
        (c) =>
          !term ||
          c.fullName.toLowerCase().includes(term) ||
          c.nickname.toLowerCase().includes(term) ||
          c.code.toLowerCase().includes(term),
      )
      .filter((c) => !cls || c.classId === cls)
      .filter((c) => {
        if (!age) return true;
        const a = ageFrom(c.birthDate);
        return age === "0-2"
          ? a <= 2
          : age === "3-5"
            ? a >= 3 && a <= 5
            : age === "6-8"
              ? a >= 6 && a <= 8
              : a >= 9;
      })
      .filter((c) => {
        if (!sit) return true;
        const here = !!openAttendance(state.attendance, c.id);
        return sit === "presente"
          ? here
          : sit === "ausente"
            ? !here && c.status === "ativo"
            : c.status === sit;
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"));
  }, [state, q, cls, age, sit]);
  const pg = usePagination(rows, 10);

  if (!can(role, "criancas")) return <Restricted />;
  if (loading) return <PageLoading />;
  const clsName = (id: string) =>
    state.classes.find((c) => c.id === id)?.name ?? "—";

  return (
    <>
      <PageHeader
        title="Crianças"
        description={`${state.children.length} cadastradas`}
        actions={
          role !== "professor" && (
            <Button asChild>
              <Link to="/criancas/novo">
                <UserPlus /> Nova criança
              </Link>
            </Button>
          )
        }
      />
      <ErrorBanner />
      <div className="card-surface">
        <div className="flex flex-wrap gap-2 border-b p-4">
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder="Buscar por nome ou código (CR-1001)"
          />
          <select
            aria-label="Turma"
            className={selectCls + " w-auto"}
            value={cls}
            onChange={(e) => setCls(e.target.value)}
          >
            <option value="">Todas as turmas</option>
            {state.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Idade"
            className={selectCls + " w-auto"}
            value={age}
            onChange={(e) => setAge(e.target.value)}
          >
            <option value="">Todas as idades</option>
            <option value="0-2">0–2 anos</option>
            <option value="3-5">3–5 anos</option>
            <option value="6-8">6–8 anos</option>
            <option value="9+">9+ anos</option>
          </select>
          <select
            aria-label="Situação"
            className={selectCls + " w-auto"}
            value={sit}
            onChange={(e) => setSit(e.target.value)}
          >
            <option value="">Todas as situações</option>
            <option value="presente">Presente agora</option>
            <option value="ausente">Ausente</option>
            <option value="pendente">Cadastro pendente</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={Baby}
            title={
              state.children.length
                ? "Nenhuma criança encontrada"
                : "Nenhuma criança cadastrada"
            }
            text={
              state.children.length
                ? "Ajuste a busca ou os filtros."
                : "Cadastre a primeira criança para começar."
            }
            action={
              !state.children.length &&
              role !== "professor" && (
                <Button asChild>
                  <Link to="/criancas/novo">
                    <UserPlus /> Nova criança
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Criança</TableHead>
                  <TableHead className="hidden sm:table-cell">Idade</TableHead>
                  <TableHead className="hidden md:table-cell">Código</TableHead>
                  <TableHead className="hidden md:table-cell">Turma</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pg.slice.map((c) => {
                  const here = !!openAttendance(state.attendance, c.id);
                  return (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() =>
                        nav({ to: "/criancas/$id", params: { id: c.id } })
                      }
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <KidAvatar child={c} size="sm" />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate font-medium">
                              {c.fullName}
                              {c.careAlert && (
                                <span title="Atenção: saúde ou cuidados especiais">
                                  <HeartPulse className="size-4 shrink-0 text-warning" />
                                </span>
                              )}
                              {c.hasMedication && (
                                <span title="Toma medicação">
                                  <Pill className="size-4 shrink-0 text-primary" />
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {c.nickname}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {ageFrom(c.birthDate)} anos
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs md:table-cell">
                        {c.code}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {clsName(c.classId)}
                      </TableCell>
                      <TableCell>
                        {here ? (
                          <StatusPill value="presente" label="Presente" />
                        ) : (
                          <StatusPill
                            value={c.status}
                            label={CHILD_STATUS[c.status]}
                          />
                        )}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          aria-label="Ver detalhes"
                        >
                          <Link to="/criancas/$id" params={{ id: c.id }}>
                            <Eye />
                          </Link>
                        </Button>
                        {role !== "professor" && (
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            aria-label="Editar"
                          >
                            <Link
                              to="/criancas/$id"
                              params={{ id: c.id }}
                              search={{ editar: true }}
                            >
                              <Pencil />
                            </Link>
                          </Button>
                        )}
                        {can(role, "crachas") && (
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            aria-label="Crachá"
                          >
                            <Link to="/crachas" search={{ crianca: c.id }}>
                              <QrCode />
                            </Link>
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
    </>
  );
}
