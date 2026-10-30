import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { can } from "@/lib/domain/rules";
import { PageHeader, Panel, Restricted } from "@/components/app/ui-bits";
import { ErrorBanner, PageLoading } from "@/components/app/page-bits";
import { IncidentPanel } from "@/components/app/incident-panel";

export const Route = createFileRoute("/ocorrencias")({
  head: () => ({ meta: [{ title: "Ocorrências — Espaço Kids" }] }),
  component: IncidentsPage,
});

function IncidentsPage() {
  const { role, loading } = useStore();
  if (!can(role, "ocorrencias")) return <Restricted />;
  if (loading) return <PageLoading />;
  return (
    <>
      <PageHeader
        title="Ocorrências"
        description="O que aconteceu na sala, registrado pela equipe."
      />
      <ErrorBanner />
      <Panel>
        <IncidentPanel />
      </Panel>
    </>
  );
}
