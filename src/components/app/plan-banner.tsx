import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";

/** Aviso do teste grátis / limite de crianças, no topo do painel. */
export function PlanBanner() {
  const { plan, role } = useStore();
  const perto = Number.isFinite(plan.limit) && plan.used >= plan.limit * 0.9;
  let texto: string | null = null;
  if (plan.mode === "teste")
    texto =
      plan.trialDaysLeft <= 3
        ? `Seu teste grátis termina em ${plan.trialDaysLeft} ${plan.trialDaysLeft === 1 ? "dia" : "dias"}.`
        : `Teste grátis: faltam ${plan.trialDaysLeft} dias. Depois, a igreja continua no plano Início (até 30 crianças).`;
  else if (plan.mode === "gratis")
    texto = `Plano Início: ${plan.used} de ${plan.limit} crianças.`;
  else if (perto)
    texto = `Você usou ${plan.used} de ${plan.limit} crianças do plano ${plan.name}.`;
  if (!texto) return null;
  const alerta =
    plan.mode === "gratis"
      ? perto
      : plan.mode === "teste"
        ? plan.trialDaysLeft <= 3
        : true;
  return (
    <div
      className={`no-print mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm ${alerta ? "border-warning/40 bg-warning/10" : "bg-primary-soft/50"}`}
    >
      <p className="flex items-center gap-2">
        <Sparkles className="size-4 shrink-0 text-primary" /> {texto}
      </p>
      {role === "admin" && (
        <Link
          to="/configuracoes"
          className="font-semibold text-primary hover:underline"
        >
          Ver planos
        </Link>
      )}
    </div>
  );
}
