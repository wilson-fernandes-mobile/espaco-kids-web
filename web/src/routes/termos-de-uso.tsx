import { createFileRoute } from "@tanstack/react-router";
import {
  LegalPage,
  LegalSection,
  Placeholder,
} from "@/components/site/site-layout";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/termos-de-uso")({
  head: () => ({
    meta: [
      { title: "Termos de Uso | Espaço Kids" },
      {
        name: "description",
        content:
          "Condições de uso da plataforma Espaço Kids para igrejas, equipes e famílias.",
      },
    ],
  }),
  component: TermosPage,
});

function TermosPage() {
  return (
    <LegalPage
      title="Termos de Uso"
      intro={
        <>
          Última atualização: <Placeholder>{SITE.updatedAt}</Placeholder>
        </>
      }
    >
      <LegalSection number={1} title="Aceitação">
        <p>
          Ao criar uma conta ou usar o Espaço Kids (aplicativo e painel web)
          você concorda com estes Termos e com a{" "}
          <a
            className="font-semibold text-primary hover:underline"
            href="/privacidade"
          >
            Política de Privacidade
          </a>
          . Se não concordar, não utilize o serviço.
        </p>
      </LegalSection>

      <LegalSection number={2} title="O que é o Espaço Kids">
        <p>
          Plataforma para igrejas organizarem o ministério infantil: cadastro de
          crianças e famílias, check-in e check-out por QR Code, crachás,
          chamadas aos responsáveis, avisos e fichas de cuidado. Operada por{" "}
          <Placeholder>{SITE.company}</Placeholder>, CNPJ{" "}
          <Placeholder>{SITE.cnpj}</Placeholder>.
        </p>
      </LegalSection>

      <LegalSection number={3} title="Quem pode usar">
        <ul>
          <li>
            <strong>Igrejas e organizações</strong>, por meio de um
            administrador maior de 18 anos com poderes para contratar em nome da
            instituição.
          </li>
          <li>
            <strong>Equipe</strong> (coordenação, professores e voluntários),
            convidada pela igreja com um código.
          </li>
          <li>
            <strong>Responsáveis legais</strong> pelas crianças. Crianças não
            criam conta nem usam o aplicativo sozinhas.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number={4} title="Conta e segurança">
        <p>
          Você é responsável por manter seus dados de acesso em sigilo e por
          tudo o que ocorrer na sua conta. Informe-nos imediatamente em caso de
          uso indevido. As informações cadastradas devem ser verdadeiras e
          atualizadas.
        </p>
      </LegalSection>

      <LegalSection number={5} title="Responsabilidades da igreja">
        <ul>
          <li>
            Cadastrar crianças somente com autorização de seus responsáveis
            legais.
          </li>
          <li>
            Conceder acesso apenas a pessoas de confiança e remover quem deixou
            a equipe.
          </li>
          <li>
            Conferir a identidade de quem retira a criança; o QR Code é uma
            ferramenta de apoio, não substitui o cuidado da equipe.
          </li>
          <li>Manter as informações de saúde atualizadas junto às famílias.</li>
        </ul>
      </LegalSection>

      <LegalSection number={6} title="Uso proibido">
        <ul>
          <li>Usar o serviço para fim ilícito ou que prejudique crianças.</li>
          <li>
            Tentar acessar dados de outra igreja, burlar permissões ou
            sobrecarregar o sistema.
          </li>
          <li>Copiar, revender ou fazer engenharia reversa da plataforma.</li>
          <li>
            Inserir conteúdo ofensivo, ilegal ou que viole direitos de
            terceiros.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number={7} title="Planos, preços e pagamento">
        <p>
          Há um plano gratuito com limite de crianças e planos pagos mensais,
          descritos na página{" "}
          <a
            className="font-semibold text-primary hover:underline"
            href="/planos"
          >
            Planos
          </a>
          . Toda igreja nova tem 14 dias de teste, sem cartão; depois, continua
          no plano Início (grátis) ou assina um plano pago. Não há fidelidade: o
          cancelamento pode ser feito a qualquer momento, com efeito ao fim do
          período já pago. Os preços podem ser reajustados mediante aviso
          prévio.
        </p>
      </LegalSection>

      <LegalSection number={8} title="Disponibilidade">
        <p>
          Trabalhamos para manter o serviço disponível, mas ele pode sofrer
          interrupções para manutenção ou por falhas de terceiros (como internet
          e provedores de nuvem). Recomendamos que a igreja mantenha um plano
          alternativo para a recepção das crianças.
        </p>
      </LegalSection>

      <LegalSection number={9} title="Propriedade intelectual">
        <p>
          A plataforma, a marca e o código pertencem a{" "}
          <Placeholder>{SITE.company}</Placeholder>. Os dados cadastrados
          continuam sendo da igreja e das famílias, que nos concedem licença
          apenas para operar o serviço.
        </p>
      </LegalSection>

      <LegalSection number={10} title="Limitação de responsabilidade">
        <p>
          O Espaço Kids é uma ferramenta de apoio. Não somos responsáveis pela
          supervisão presencial das crianças, que cabe à igreja e aos
          responsáveis, nem por danos decorrentes de informações incorretas
          cadastradas ou de uso em desacordo com estes Termos, nos limites
          permitidos pela lei.
        </p>
      </LegalSection>

      <LegalSection number={11} title="Encerramento">
        <p>
          Você pode excluir sua conta quando quiser (veja{" "}
          <a
            className="font-semibold text-primary hover:underline"
            href="/exclusao-de-conta"
          >
            Exclusão de conta
          </a>
          ). Podemos suspender contas que violem estes Termos, com aviso quando
          possível.
        </p>
      </LegalSection>

      <LegalSection number={12} title="Alterações e foro">
        <p>
          Podemos atualizar estes Termos, comunicando mudanças relevantes. Fica
          eleito o foro da comarca de <Placeholder>[cidade/UF]</Placeholder>{" "}
          para dirimir controvérsias, sem prejuízo do foro do consumidor quando
          aplicável. Contato: <Placeholder>{SITE.email}</Placeholder>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
