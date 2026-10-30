import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { can } from "@/lib/domain/rules";
import { PageHeader, Panel, Restricted } from "@/components/app/ui-bits";
import { ErrorBanner, PageLoading } from "@/components/app/page-bits";
import { TaskPanel } from "@/components/app/task-panel";

export const Route = createFileRoute("/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas — Espaço Kids" }] }),
  component: TasksPage,
});

function TasksPage() {
  const { role, loading } = useStore();
  if (!can(role, "tarefas")) return <Restricted />;
  if (loading) return <PageLoading />;
  return (
    <>
      <PageHeader
        title="Tarefas"
        description="Atividades por turma. As famílias recebem um aviso e veem tudo no app."
      />
      <ErrorBanner />
      <Panel>
        <TaskPanel />
      </Panel>
    </>
  );
}
