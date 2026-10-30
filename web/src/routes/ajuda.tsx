import { createFileRoute } from "@tanstack/react-router";
import { CtaBand, PageHero, SitePage } from "@/components/site/site-layout";

export const Route = createFileRoute("/ajuda")({
  head: () => ({
    meta: [
      { title: "Central de ajuda | Espaço Kids" },
      {
        name: "description",
        content:
          "Primeiros passos e respostas para a equipe e as famílias do Espaço Kids.",
      },
    ],
  }),
  component: AjudaPage,
});

const GROUPS = [
  {
    title: "Para a igreja (administração)",
    items: [
      [
        "Como criar a conta da igreja?",
        "Toque em Criar conta, escolha “Igreja” e preencha os dados. Você já entra como administrador.",
      ],
      [
        "Como convidar a equipe e as famílias?",
        "Em Usuários, gere o código de entrada da igreja (começa com IG-) e envie para quem vai participar.",
      ],
      [
        "Como organizo as turmas?",
        "Em Turmas, crie as salas por faixa etária. Dá para imprimir a etiqueta com QR de cada sala.",
      ],
    ],
  },
  {
    title: "Para a equipe (professores e voluntários)",
    items: [
      [
        "Como fazer o check-in?",
        "Leia o QR Code do crachá da criança. O registro mostra quem entregou, a sala e o horário.",
      ],
      [
        "Como chamar um responsável?",
        "Na sala, abra a criança e toque em Chamar. O responsável recebe uma notificação no celular.",
      ],
      [
        "Onde vejo alergias e medicações?",
        "Na ficha da criança e na lista “Medicações de hoje” do início.",
      ],
    ],
  },
  {
    title: "Para as famílias",
    items: [
      [
        "Como me cadastro?",
        "Baixe o app, escolha “Sou responsável” e use o código da igreja. Em 4 passos você cadastra a família e as crianças.",
      ],
      [
        "Como adiciono outro responsável?",
        "Na área da família, crie um código (começa com LK-) e envie à outra pessoa.",
      ],
      [
        "Como informo uma alergia?",
        "Abra a criança, vá em Saúde e cuidados e preencha. A equipe da sala passa a ver o aviso.",
      ],
    ],
  },
];

function AjudaPage() {
  return (
    <SitePage>
      <PageHero
        eyebrow="Ajuda"
        title="Central de ajuda"
        subtitle="Respostas rápidas para começar e para o dia a dia."
      />
      <div className="mx-auto max-w-3xl space-y-10 px-4 py-12 sm:px-6">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h2 className="text-lg font-bold">{g.title}</h2>
            <div className="mt-3 divide-y rounded-2xl border bg-card">
              {g.items.map(([q, a]) => (
                <details key={q} className="p-5">
                  <summary className="cursor-pointer list-none text-sm font-semibold">
                    {q}
                  </summary>
                  <p className="mt-2 text-sm text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
      <CtaBand
        title="Não achou o que procurava?"
        to="/contato"
        label="Falar com o suporte"
      />
    </SitePage>
  );
}
