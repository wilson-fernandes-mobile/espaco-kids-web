/** Planos, teste grátis e limite de crianças. Os preços ficam em lib/site.ts. */
export const TRIAL_DAYS = 14;

export type PlanId = "inicio" | "crescimento" | "expansao" | "ilimitado";

export const PLAN_INFO: Record<PlanId, { name: string; limit: number }> = {
  inicio: { name: "Início", limit: 20 },
  crescimento: { name: "Crescimento", limit: 100 },
  expansao: { name: "Expansão", limit: 250 },
  ilimitado: { name: "Ilimitado", limit: Infinity },
};

/** Doc `tenants/{igreja}/billing/current`: só o servidor escreve (cobrança). */
export interface BillingDoc {
  plan?: PlanId;
  status?: "ativo" | "atrasado" | "cancelado";
  paidUntil?: string;
}

export interface PlanState {
  plan: PlanId;
  name: string;
  /** Crianças ativas permitidas. */
  limit: number;
  mode: "teste" | "pago" | "gratis";
  /** Dias restantes do teste (só em mode "teste"). */
  trialDaysLeft: number;
}

const DAY = 86400000;

export const LOCKED_REASON =
  "Cadastro bloqueado: a igreja passou do limite de crianças do plano. Assine um plano maior em Configurações > Plano para liberar.";

/**
 * Crianças bloqueadas por excesso do limite do plano (ex.: igreja que voltou
 * ao Início com 35 crianças). Ficam liberadas as primeiras `limit` por ordem de
 * cadastro (número do código); as demais ficam bloqueadas para check-in até
 * assinar um plano maior. Nenhum dado é apagado.
 */
export function lockedChildIds(
  children: { id: string; code: string; status: string }[],
  limit: number,
): Set<string> {
  if (!Number.isFinite(limit)) return new Set();
  const num = (code: string) => Number(code.replace(/\D/g, "")) || 0;
  const active = children
    .filter((c) => c.status !== "inativo")
    .sort((a, b) => num(a.code) - num(b.code));
  return new Set(active.slice(limit).map((c) => c.id));
}

/**
 * Teste grátis de 14 dias com o limite do Expansão; depois volta ao Início
 * (grátis) até a igreja assinar. Sem doc de cobrança, vale o teste contado
 * desde a criação da igreja.
 */
export function resolvePlan(
  createdAt: string | undefined,
  billing: BillingDoc | null,
  nowMs: number = Date.now(),
): PlanState {
  const paid =
    billing?.plan &&
    billing.status === "ativo" &&
    (!billing.paidUntil || Date.parse(billing.paidUntil) + 5 * DAY > nowMs);
  if (paid && billing.plan) {
    const p = PLAN_INFO[billing.plan];
    return {
      plan: billing.plan,
      name: p.name,
      limit: p.limit,
      mode: "pago",
      trialDaysLeft: 0,
    };
  }
  const start = createdAt ? Date.parse(createdAt) : NaN;
  const left = Number.isNaN(start)
    ? TRIAL_DAYS
    : Math.ceil((start + TRIAL_DAYS * DAY - nowMs) / DAY);
  if (left > 0)
    return {
      plan: "expansao",
      name: "Teste grátis",
      limit: PLAN_INFO.expansao.limit,
      mode: "teste",
      trialDaysLeft: Math.min(left, TRIAL_DAYS),
    };
  return {
    plan: "inicio",
    name: PLAN_INFO.inicio.name,
    limit: PLAN_INFO.inicio.limit,
    mode: "gratis",
    trialDaysLeft: 0,
  };
}
