import { createFileRoute } from "@tanstack/react-router";
import {
  CtaBand,
  LegalPage,
  LegalSection,
  Placeholder,
} from "@/components/site/site-layout";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/lgpd")({
  head: () => ({
    meta: [
      { title: "LGPD e seus direitos | Espaço Kids" },
      {
        name: "description",
        content:
          "Como exercer seus direitos de titular de dados pela LGPD no Espaço Kids, inclusive pelos seus filhos.",
      },
    ],
  }),
  component: LgpdPage,
});

const RIGHTS = [
  ["Confirmação e acesso", "Saber se tratamos seus dados e receber uma cópia."],
  ["Correção", "Atualizar dados incompletos, inexatos ou desatualizados."],
  [
    "Anonimização, bloqueio ou eliminação",
    "De dados desnecessários, excessivos ou tratados em desconformidade.",
  ],
  ["Portabilidade", "Receber os dados em formato estruturado."],
  [
    "Informação sobre compartilhamento",
    "Saber com quem os dados são compartilhados.",
  ],
  [
    "Revogação do consentimento",
    "Retirar a autorização dada, a qualquer momento.",
  ],
  [
    "Oposição",
    "Se opor a um tratamento feito sem consentimento, quando houver descumprimento da lei.",
  ],
  [
    "Revisão",
    "Pedir revisão de decisões tomadas apenas de forma automatizada.",
  ],
];

function LgpdPage() {
  return (
    <LegalPage
      title="LGPD e seus direitos"
      intro="Como exercer seus direitos de titular de dados — e os de seus filhos — no Espaço Kids."
    >
      <LegalSection number={1} title="Seus direitos">
        <div className="grid gap-3 sm:grid-cols-2">
          {RIGHTS.map(([t, d]) => (
            <div key={t} className="rounded-xl border bg-card p-4">
              <p className="font-semibold text-foreground">{t}</p>
              <p className="mt-1 text-xs">{d}</p>
            </div>
          ))}
        </div>
      </LegalSection>

      <LegalSection number={2} title="Como fazer um pedido">
        <ul>
          <li>
            Envie um e-mail para <Placeholder>{SITE.privacyEmail}</Placeholder>{" "}
            com o assunto “Direitos LGPD”.
          </li>
          <li>
            Informe seu nome, o e-mail da conta e o que você deseja (acesso,
            correção, exclusão etc.).
          </li>
          <li>
            Para confirmar sua identidade, podemos pedir informações adicionais.
          </li>
          <li>
            Responderemos em até <strong>15 dias</strong>, conforme a LGPD.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number={3} title="Pedidos sobre crianças">
        <p>
          Os dados de crianças só podem ser consultados, corrigidos ou excluídos
          a pedido de um <strong>responsável legal</strong>. Além de nos
          escrever, os responsáveis podem editar ou remover os dados do filho
          diretamente no aplicativo, na área da família.
        </p>
        <p>
          Quando a igreja é a controladora dos dados, o pedido também pode ser
          encaminhado a ela, e cooperaremos para atendê-lo.
        </p>
      </LegalSection>

      <LegalSection number={4} title="Dados sensíveis de saúde">
        <p>
          Informações como alergias e medicações são dados sensíveis e só são
          tratadas com o consentimento específico dos responsáveis. Você pode
          retirar o consentimento e apagar essas informações a qualquer momento;
          isso pode limitar os cuidados que a equipe consegue oferecer.
        </p>
      </LegalSection>

      <LegalSection number={5} title="Reclamações">
        <p>
          Se achar que seus direitos não foram atendidos, você pode reclamar à
          Autoridade Nacional de Proteção de Dados (ANPD) em gov.br/anpd.
        </p>
      </LegalSection>

      <CtaBand
        title="Quer saber mais?"
        subtitle="Leia a Política de Privacidade completa."
        to="/privacidade"
        label="Política de Privacidade"
      />
    </LegalPage>
  );
}
