import { Link } from "@tanstack/react-router";
import {
  BellRing,
  Check,
  ClipboardList,
  HeartPulse,
  QrCode,
  ShieldCheck,
  Users,
} from "lucide-react";
import { CtaBand, SitePage } from "@/components/site/site-layout";
import { PLANS } from "@/lib/site";

const FEATURES = [
  {
    icon: QrCode,
    title: "Check-in por QR",
    text: "Entrada e saída em segundos, com registro de quem entregou e quem buscou.",
  },
  {
    icon: BellRing,
    title: "Chamadas aos pais",
    text: "A professora chama o responsável e ele recebe a notificação no celular.",
  },
  {
    icon: HeartPulse,
    title: "Saúde e alergias",
    text: "Alergias, restrições e medicações visíveis para a equipe da sala certa.",
  },
  {
    icon: Users,
    title: "Famílias e turmas",
    text: "Cadastro feito pelos próprios pais, com turmas por faixa etária.",
  },
  {
    icon: ClipboardList,
    title: "Relatórios",
    text: "Presença por período, por turma e por criança, prontos para exportar.",
  },
  {
    icon: ShieldCheck,
    title: "Seguro e privado",
    text: "Cada igreja vê só os seus dados, com permissões por perfil e LGPD.",
  },
];

const STEPS = [
  [
    "Crie a conta da igreja",
    "Leva poucos minutos e você já entra como administrador.",
  ],
  [
    "Convide equipe e famílias",
    "Um código simples; os pais cadastram os filhos pelo app.",
  ],
  [
    "Receba as crianças com segurança",
    "Leia o QR do crachá, acompanhe a sala e chame os pais quando preciso.",
  ],
];

export function LandingPage() {
  return (
    <SitePage>
      <section className="bg-primary-soft/60">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Gestão do ministério infantil
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
            Pais tranquilos, crianças seguras, equipe organizada.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            O Espaço Kids cuida da entrada e saída, das chamadas e da saúde de
            cada criança da sua igreja, no celular e no computador.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/registrar"
              className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Criar conta grátis
            </Link>
            <Link
              to="/planos"
              className="rounded-xl border bg-card px-6 py-3 text-sm font-semibold hover:bg-secondary"
            >
              Ver planos
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Grátis até 30 crianças. Sem cartão de crédito.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">
          Tudo o que o ministério infantil precisa
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border bg-card p-6">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-4 font-bold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-card py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">
            Como funciona
          </h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="text-center">
                <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-bold">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">
          Planos para cada fase
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border bg-card p-5 ${p.highlight ? "border-primary ring-1 ring-primary" : ""}`}
            >
              <p className="text-sm text-muted-foreground">{p.name}</p>
              <p className="mt-1 text-2xl font-extrabold">
                {p.price}
                {p.suffix && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {p.suffix}
                  </span>
                )}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="size-3.5 text-success" /> {p.limit}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center">
          <Link
            to="/planos"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Comparar os planos
          </Link>
        </p>
      </section>

      <CtaBand
        title="Leve mais segurança ao seu ministério infantil"
        subtitle="Crie a conta da sua igreja e comece hoje."
        to="/registrar"
        label="Criar conta grátis"
      />
    </SitePage>
  );
}
