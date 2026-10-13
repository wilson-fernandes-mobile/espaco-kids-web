import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { can } from "@/lib/domain/rules";
import { ChildForm } from "@/components/app/child-form";
import { PageHeader, Panel, Restricted } from "@/components/app/ui-bits";
import { PageLoading } from "@/components/app/page-bits";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/criancas/novo")({
  head: () => ({ meta: [{ title: "Nova criança — Espaço Kids" }] }),
  component: NewChild,
});

function NewChild() {
  const { role, loading, state } = useStore();
  const nav = useNavigate();
  if (!can(role, "criancas") || role === "professor") return <Restricted />;
  if (loading) return <PageLoading />;
  return (
    <>
      <PageHeader
        title="Nova criança"
        description="Preencha os dados essenciais. O código é gerado automaticamente."
      />
      {state.families.length === 0 || state.classes.length === 0 ? (
        <Panel>
          <p className="text-sm">
            Antes de cadastrar uma criança é preciso ter ao menos uma{" "}
            <strong>turma</strong> e uma <strong>família</strong>.
          </p>
          <div className="mt-4 flex gap-2">
            <Button asChild variant="outline">
              <Link to="/turmas">Ir para Turmas</Link>
            </Button>
            <Button asChild>
              <Link to="/familias">Ir para Famílias</Link>
            </Button>
          </div>
        </Panel>
      ) : (
        <Panel>
          <ChildForm
            onSaved={(c) => {
              toast.success(`${c.fullName} cadastrada (${c.code}).`);
              nav({ to: "/criancas/$id", params: { id: c.id } });
            }}
          />
        </Panel>
      )}
    </>
  );
}
