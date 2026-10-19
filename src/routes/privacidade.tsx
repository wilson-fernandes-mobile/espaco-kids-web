import { createFileRoute } from "@tanstack/react-router";
import {
  CtaBand,
  LegalPage,
  LegalSection,
  Placeholder,
} from "@/components/site/site-layout";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade | Espaço Kids" },
      {
        name: "description",
        content:
          "Quais dados o Espaço Kids coleta (inclusive de crianças), como usa, com quem compartilha e quais são seus direitos pela LGPD.",
      },
    ],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <LegalPage
      title="Política de Privacidade"
      intro={
        <>
          Última atualização: <Placeholder>{SITE.updatedAt}</Placeholder>. Em
          conformidade com a Lei Geral de Proteção de Dados (Lei nº
          13.709/2018).
        </>
      }
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        O Espaço Kids é uma plataforma de gestão do ministério infantil de
        igrejas. Como ela lida com dados de crianças e informações de saúde,
        tratamos a privacidade com cuidado redobrado. Esta política explica o
        que coletamos, para que usamos, com quem compartilhamos e quais são os
        seus direitos.
      </p>

      <LegalSection number={1} title="Quem é o controlador dos dados">
        <p>
          <Placeholder>{SITE.company}</Placeholder>, CNPJ{" "}
          <Placeholder>{SITE.cnpj}</Placeholder>, com sede em{" "}
          <Placeholder>{SITE.address}</Placeholder>, é a operadora da plataforma
          Espaço Kids.
        </p>
        <p>
          Em relação aos dados de crianças, famílias e equipe de cada igreja,{" "}
          <strong>a igreja é a controladora</strong> (decide quem entra e quais
          dados são cadastrados) e o Espaço Kids atua como{" "}
          <strong>operador</strong>, tratando os dados em nome dela. Para os
          dados de acesso à própria plataforma (conta, e-mail), o Espaço Kids é
          controlador.
        </p>
      </LegalSection>

      <LegalSection number={2} title="Quais dados coletamos">
        <ul>
          <li>
            <strong>Conta</strong>: nome, e-mail, foto (opcional) e método de
            login (e-mail e senha, Google ou Apple).
          </li>
          <li>
            <strong>Crianças</strong>: nome, apelido, data de nascimento, foto
            (opcional), turma e código de identificação.
          </li>
          <li>
            <strong>Saúde e cuidados</strong> (dado pessoal sensível): alergias,
            restrições alimentares, medicações e observações de cuidado
            informadas pelos responsáveis.
          </li>
          <li>
            <strong>Famílias</strong>: nome e telefone dos responsáveis e das
            pessoas autorizadas a buscar a criança.
          </li>
          <li>
            <strong>Uso do serviço</strong>: registros de check-in e check-out
            (quem, quando e em qual sala), chamadas aos responsáveis e avisos
            enviados.
          </li>
          <li>
            <strong>Dispositivo</strong>: identificador para envio de
            notificações push (token do Firebase Cloud Messaging) e dados
            técnicos básicos de acesso.
          </li>
        </ul>
        <p>
          Não vendemos dados, não fazemos perfilamento para publicidade e não
          exibimos anúncios.
        </p>
      </LegalSection>

      <LegalSection number={3} title="Dados de crianças e adolescentes">
        <p>
          Os dados de crianças só são cadastrados por seus{" "}
          <strong>responsáveis legais</strong> ou pela equipe da igreja
          autorizada por eles, e somente para a finalidade de cuidar da criança
          durante as atividades do ministério infantil (art. 14 da LGPD).
          Crianças não criam conta nem usam o aplicativo por conta própria.
        </p>
        <p>
          Os dados de saúde são usados apenas para proteger a criança (por
          exemplo, alertar a equipe sobre uma alergia) e ficam visíveis somente
          à equipe autorizada da igreja. Pedimos que os responsáveis revisem
          essas informações periodicamente.
        </p>
      </LegalSection>

      <LegalSection number={4} title="Para que usamos os dados">
        <ul>
          <li>
            Identificar com segurança quem deixa e quem busca cada criança (QR
            Code e crachás).
          </li>
          <li>
            Chamar os responsáveis quando a criança precisa de atenção e enviar
            avisos da igreja.
          </li>
          <li>
            Informar a equipe sobre alergias, medicações e cuidados necessários.
          </li>
          <li>Emitir relatórios de presença para a igreja.</li>
          <li>
            Manter a conta, a segurança, prevenir fraudes e cumprir obrigações
            legais.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number={5} title="Bases legais">
        <p>
          Tratamos os dados com base no{" "}
          <strong>consentimento específico dos responsáveis</strong> (crianças e
          saúde), na <strong>execução do contrato</strong> com a igreja, na{" "}
          <strong>proteção da vida e da incolumidade física</strong> da criança
          (informações de saúde em situação de cuidado), no{" "}
          <strong>cumprimento de obrigação legal</strong> e no{" "}
          <strong>legítimo interesse</strong> para segurança e melhoria do
          serviço.
        </p>
      </LegalSection>

      <LegalSection number={6} title="Com quem compartilhamos">
        <ul>
          <li>
            <strong>A igreja</strong> à qual a criança pertence: apenas a equipe
            com perfil autorizado enxerga os dados, conforme o papel
            (administrador, coordenação, professor, responsável).
          </li>
          <li>
            <strong>Provedores de infraestrutura</strong>: Google Firebase
            (autenticação, banco de dados, hospedagem e notificações), que
            armazena os dados em servidores seguros.
          </li>
          <li>
            <strong>Provedores de pagamento</strong>, quando houver assinatura,
            apenas para cobrar a igreja. Dados de cartão não passam pelo Espaço
            Kids.
          </li>
          <li>
            <strong>Autoridades</strong>, quando exigido por lei ou ordem
            judicial.
          </li>
        </ul>
        <p>Não compartilhamos dados com outras igrejas nem com anunciantes.</p>
      </LegalSection>

      <LegalSection number={7} title="Segurança">
        <p>
          Cada igreja tem seus dados isolados das demais e o acesso é controlado
          por regras de permissão no servidor. As conexões são criptografadas
          (HTTPS) e os dados ficam em infraestrutura com controle de acesso.
          Nenhum sistema é totalmente imune; em caso de incidente relevante,
          avisaremos a igreja e os titulares afetados, conforme a lei.
        </p>
      </LegalSection>

      <LegalSection number={8} title="Por quanto tempo guardamos">
        <p>
          Mantemos os dados enquanto a conta e o cadastro estiverem ativos. Ao
          excluir uma criança, família ou conta, os dados são removidos, salvo
          registros que a lei exija guardar. Dados de backup podem permanecer
          por um curto período até a rotação automática.
        </p>
      </LegalSection>

      <LegalSection number={9} title="Seus direitos">
        <p>
          Você (ou o responsável pela criança) pode solicitar: confirmação do
          tratamento, acesso, correção, anonimização, portabilidade, eliminação,
          informação sobre compartilhamento e a revogação do consentimento. Para
          exercer esses direitos, veja a página{" "}
          <a
            className="font-semibold text-primary hover:underline"
            href="/lgpd"
          >
            LGPD
          </a>{" "}
          ou escreva para <Placeholder>{SITE.privacyEmail}</Placeholder>. Para
          dados de crianças, a solicitação deve vir de um responsável legal.
        </p>
      </LegalSection>

      <LegalSection number={10} title="Cookies e armazenamento local">
        <p>
          Usamos apenas armazenamento essencial para manter você conectado e
          lembrar preferências (como o tema). Não usamos cookies de publicidade.
        </p>
      </LegalSection>

      <LegalSection number={11} title="Alterações desta política">
        <p>
          Podemos atualizar esta política. Mudanças relevantes serão comunicadas
          no aplicativo ou por e-mail, e a data no topo da página sempre indica
          a versão em vigor.
        </p>
      </LegalSection>

      <LegalSection number={12} title="Contato do encarregado (DPO)">
        <p>
          Dúvidas sobre privacidade:{" "}
          <Placeholder>{SITE.privacyEmail}</Placeholder>.
        </p>
      </LegalSection>

      <CtaBand
        title="Dúvidas sobre seus dados?"
        subtitle="Fale com a gente e responderemos o quanto antes."
        to="/contato"
        label="Falar com o suporte"
      />
    </LegalPage>
  );
}
