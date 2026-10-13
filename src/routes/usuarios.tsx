import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Info,
  Loader2,
  Pencil,
  ShieldCheck,
  UserPlus,
  Ban,
  Copy,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { can, PERMISSIONS, ROLE_LABEL } from "@/lib/domain/rules";
import {
  EmptyState,
  PageHeader,
  Panel,
  Restricted,
  StatusPill,
} from "@/components/app/ui-bits";
import {
  ErrorBanner,
  Field,
  PageLoading,
  attempt,
  selectCls,
} from "@/components/app/page-bits";
import { authErrorMessage } from "@/lib/auth";
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
import { toast } from "sonner";
import type { AppUser, Role } from "@/lib/domain/types";

export const Route = createFileRoute("/usuarios")({
  head: () => ({ meta: [{ title: "Usuários e permissões — Espaço Kids" }] }),
  component: UsersPage,
});

const MODULES: [string, string][] = [
  ["dashboard", "Dashboard"],
  ["criancas", "Crianças"],
  ["familias", "Famílias"],
  ["checkin", "Check-in/out"],
  ["turmas", "Turmas"],
  ["crachas", "Crachás"],
  ["chamadas", "Chamadas"],
  ["notificacoes", "Notificações"],
  ["relatorios", "Relatórios"],
  ["usuarios", "Usuários"],
  ["configuracoes", "Configurações"],
  ["saude", "Dados de saúde"],
];

const newSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome"),
  email: z.string(),
  password: z.string(),
  role: z.enum(["admin", "coordenacao", "professor", "recepcao"]),
  classIds: z.array(z.string()),
});
type NewForm = z.infer<typeof newSchema>;

function UserDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: AppUser;
}) {
  const { state, createUserAccount, saveUser } = useStore();
  const f = useForm<NewForm>({
    resolver: zodResolver(newSchema),
    values: {
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      password: "",
      role: initial?.role ?? "recepcao",
      classIds: initial?.classIds ?? [],
    },
  });
  const e = f.formState.errors;
  const role = f.watch("role");
  const ids = f.watch("classIds");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? "Editar usuário" : "Novo usuário"}
          </DialogTitle>
          <DialogDescription>
            {initial
              ? initial.email
              : "A pessoa entra com este e-mail e senha. Combine uma senha provisória."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={f.handleSubmit(async (v) => {
            if (!initial) {
              if (!/^S+@S+.S+$/.test(v.email.trim()))
                return f.setError("email", { message: "E-mail inválido" });
              if (v.password.length < 6)
                return f.setError("password", {
                  message: "Mínimo de 6 caracteres",
                });
            }
            try {
              if (initial)
                await saveUser(initial.id, {
                  name: v.name,
                  role: v.role,
                  classIds: v.role === "professor" ? v.classIds : [],
                });
              else
                await createUserAccount({
                  name: v.name,
                  email: v.email,
                  password: v.password,
                  role: v.role,
                  classIds: v.role === "professor" ? v.classIds : [],
                });
              toast.success("Usuário salvo.");
              onClose();
            } catch (err) {
              toast.error(authErrorMessage(err));
            }
          })}
        >
          <Field label="Nome completo *" error={e.name?.message}>
            <Input {...f.register("name")} />
          </Field>
          {!initial && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="E-mail *" error={e.email?.message}>
                <Input
                  type="email"
                  autoComplete="off"
                  {...f.register("email")}
                />
              </Field>
              <Field label="Senha provisória *" error={e.password?.message}>
                <Input
                  type="text"
                  autoComplete="off"
                  {...f.register("password")}
                />
              </Field>
            </div>
          )}
          <Field label="Perfil de acesso *">
            <select className={selectCls} {...f.register("role")}>
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </Field>
          {role === "professor" && (
            <Field
              label="Turmas atribuídas"
              hint="O professor vê as crianças e chamadas dessas turmas."
            >
              <div className="flex flex-wrap gap-2">
                {state.classes.map((c) => {
                  const on = ids.includes(c.id);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() =>
                        f.setValue(
                          "classIds",
                          on ? ids.filter((x) => x !== c.id) : [...ids, c.id],
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
                    >
                      {c.name}
                    </button>
                  );
                })}
                {state.classes.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    Cadastre turmas primeiro.
                  </span>
                )}
              </div>
            </Field>
          )}
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

function JoinCodePanel() {
  const { state, createJoinCode, revokeJoinCodes } = useStore();
  const code = state.joinCodes.find((i) => i.active)?.id;
  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  };
  return (
    <Panel title="Código de entrada dos pais" className="mb-6">
      <p className="mb-4 text-sm text-muted-foreground">
        Um código só para a igreja inteira. Os pais baixam o app, tocam em{" "}
        <strong>Criar conta → Sou da família</strong>, digitam este código e{" "}
        <strong>eles mesmos cadastram a família e as crianças</strong>. A equipe
        só precisa passar o código.
      </p>
      {code ? (
        <div className="flex flex-wrap items-center gap-3">
          <code className="rounded-lg border bg-muted px-4 py-2.5 font-mono text-lg font-bold tracking-widest select-all">
            {code}
          </code>
          <Button variant="outline" onClick={copy}>
            <Copy /> Copiar
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              attempt(createJoinCode, "Novo código gerado; o anterior deixou de valer.")
            }
          >
            <RefreshCw /> Gerar novo
          </Button>
          <Button
            variant="ghost"
            onClick={() => attempt(revokeJoinCodes, "Código desativado.")}
          >
            <Ban /> Desativar
          </Button>
        </div>
      ) : (
        <Button onClick={() => attempt(createJoinCode, "Código gerado.")}>
          <KeyRound /> Gerar código de entrada
        </Button>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Quem já entrou continua com acesso. Se o código vazar, use{" "}
        <strong>Gerar novo</strong>: novos cadastros só entram com o novo.
      </p>
    </Panel>
  );
}

function InvitePanel() {
  const { state, createInvite, revokeInvites } = useStore();
  const code = state.invites.find((i) => i.active)?.id;
  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código copiado.");
    } catch {
      toast.error(
        "Não foi possível copiar. Selecione o código e copie manualmente.",
      );
    }
  };
  return (
    <Panel title="Código de convite da equipe" className="mb-6">
      <p className="mb-4 text-sm text-muted-foreground">
        Compartilhe o código com professores e recepção. Em{" "}
        <strong>Criar cadastro → Entrar com código</strong> eles mesmos criam a
        conta (perfil Professor ou Recepção — nunca administrador). Depois,
        atribua as turmas de cada professor aqui na lista.
      </p>
      {code ? (
        <div className="flex flex-wrap items-center gap-3">
          <code className="rounded-lg border bg-muted px-4 py-2.5 font-mono text-lg font-bold tracking-widest select-all">
            {code}
          </code>
          <Button variant="outline" onClick={copy}>
            <Copy /> Copiar
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              attempt(
                createInvite,
                "Novo código gerado; o anterior deixou de valer.",
              )
            }
          >
            <RefreshCw /> Gerar novo
          </Button>
          <Button
            variant="ghost"
            onClick={() => attempt(revokeInvites, "Código desativado.")}
          >
            <Ban /> Desativar
          </Button>
        </div>
      ) : (
        <Button onClick={() => attempt(createInvite, "Código gerado.")}>
          <KeyRound /> Gerar código de convite
        </Button>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Se o código vazar, clique em <strong>Gerar novo</strong>: o anterior
        deixa de valer na hora.
      </p>
    </Panel>
  );
}

function UsersPage() {
  const { state, role, loading, saveUser } = useStore();
  const { profile } = useAuth();
  const [dlg, setDlg] = useState<AppUser | "new" | null>(null);
  if (!can(role, "usuarios")) return <Restricted />;
  if (loading) return <PageLoading />;
  const users = [...state.users].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR"),
  );

  return (
    <>
      <PageHeader
        title="Usuários e permissões"
        description={`${users.length} usuário(s)`}
        actions={
          <Button onClick={() => setDlg("new")}>
            <UserPlus /> Novo usuário
          </Button>
        }
      />
      <ErrorBanner />
      <JoinCodePanel />
      <InvitePanel />
      <div className="card-surface mb-6">
        {users.length === 0 ? (
          <EmptyState title="Nenhum usuário" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead className="hidden sm:table-cell">Turmas</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Editar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.name}
                    {u.id === profile?.id && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (você)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      value="ativo"
                      label={ROLE_LABEL[u.role]}
                      tone="primary"
                    />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">
                    {u.role === "professor"
                      ? u.classIds
                          .map(
                            (id) =>
                              state.classes.find((c) => c.id === id)?.name,
                          )
                          .filter(Boolean)
                          .join(", ") || "—"
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={u.active}
                      disabled={u.id === profile?.id}
                      aria-label={`Ativar ${u.name}`}
                      onCheckedChange={(v) =>
                        attempt(
                          () => saveUser(u.id, { active: v }),
                          v ? "Usuário ativado." : "Usuário desativado.",
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Editar ${u.name}`}
                      onClick={() => setDlg(u)}
                    >
                      <Pencil />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Panel title="Matriz de permissões">
        <div className="mb-3 flex gap-2 text-xs text-muted-foreground">
          <Info className="size-4 shrink-0" />A matriz é aplicada no servidor
          pelas Security Rules do Firestore; esconder botões não é a única
          proteção.
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Módulo</th>
                {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                  <th key={r} className="px-2 py-2 text-center font-medium">
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map(([k, label]) => (
                <tr key={k} className="border-b last:border-0">
                  <td className="py-2 pr-4">{label}</td>
                  {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                    <td key={r} className="px-2 py-2 text-center">
                      {PERMISSIONS[r].includes(k as never) ? (
                        <ShieldCheck
                          className="mx-auto size-4 text-success"
                          aria-label="Permitido"
                        />
                      ) : (
                        <span
                          className="text-muted-foreground"
                          aria-label="Sem acesso"
                        >
                          —
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <UserDialog
        open={dlg !== null}
        initial={dlg && dlg !== "new" ? dlg : undefined}
        onClose={() => setDlg(null)}
      />
    </>
  );
}
