import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { CtaBand, PageHero, SitePage } from "@/components/site/site-layout";
import { FAQ, PLANS } from "@/lib/site";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos e preços | Espaço Kids" },
      {
        name: "description",
        content:
          "Planos do Espaço Kids por número de crianças. Comece grátis, sem fidelidade.",
      },
    ],
  }),
  component: PlanosPage,
});

function PlanosPage() {
  return (
    <SitePage>
      <PageHero
        eyebrow="Planos"
        title="Preços simples, do tamanho do seu ministério"
        subtitle="Pague conforme o número de crianças cadastradas. Comece grátis e cresça sem trocar de sistema."
      />
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-2xl border bg-card p-6 ${
                p.highlight
                  ? "border-primary shadow-lg ring-1 ring-primary"
                  : ""
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                  Mais popular
                </span>
              )}
              <p className="text-sm font-medium text-muted-foreground">
                {p.name}
              </p>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold">{p.price}</span>
                {p.suffix && (
                  <span className="text-sm text-muted-foreground">
                    {p.suffix}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{p.limit}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />{" "}
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/registrar"
                className={`mt-6 inline-flex justify-center rounded-lg px-4 py-2.5 text-sm font-semibold ${
                  p.highlight
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border hover:bg-secondary"
                }`}
              >
                {p.price === "Grátis" ? "Começar grátis" : "Testar 14 dias"}
              </Link>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border bg-card p-6 sm:flex-row">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Sob consulta
            </p>
            <p className="mt-1 text-lg font-bold">
              Rede de igrejas ou mais de 500 crianças?
            </p>
            <p className="text-sm text-muted-foreground">
              Montamos um plano sob medida, com implantação e atendimento
              dedicado.
            </p>
          </div>
          <Link
            to="/contato"
            className="inline-flex shrink-0 justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold hover:bg-secondary"
          >
            Falar com a gente
          </Link>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Valores em reais, por igreja. Famílias e voluntários usam o app sem
          custo.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-14 sm:px-6">
        <h2 className="text-center text-2xl font-bold">Como pagar</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            [
              "1. Escolha o plano",
              "Crie a conta da igreja grátis e teste os recursos.",
            ],
            [
              "2. Pague pelo Pix ou cartão",
              "Combine com a gente pelo contato e receba o link ou a chave de pagamento.",
            ],
            [
              "3. Receba o comprovante",
              "Emitimos o recibo e liberamos o plano na hora.",
            ],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border bg-card p-4">
              <p className="font-semibold">{t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-14 sm:px-6">
        <h2 className="text-center text-2xl font-bold">Perguntas frequentes</h2>
        <div className="mt-6 divide-y rounded-2xl border bg-card">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="cursor-pointer list-none text-sm font-semibold">
                {f.q}
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <CtaBand
        title="Pronto para começar?"
        subtitle="Crie a conta da sua igreja em poucos minutos."
        to="/registrar"
        label="Criar conta grátis"
      />
    </SitePage>
  );
}
