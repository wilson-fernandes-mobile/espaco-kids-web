import { createFileRoute } from "@tanstack/react-router";
import {
  LegalPage,
  LegalSection,
  Placeholder,
} from "@/components/site/site-layout";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/exclusao-de-conta")({
  head: () => ({
    meta: [
      { title: "Exclusão de conta e dados | Espaço Kids" },
      {
        name: "description",
        content:
          "Como solicitar a exclusão da sua conta e dos dados (inclusive de crianças) no Espaço Kids.",
      },
    ],
  }),
  component: ExclusaoPage,
});

function ExclusaoPage() {
  return (
    <LegalPage
      eyebrow="Suporte"
      title="Exclusão de conta e dados"
      intro="Você pode pedir a exclusão da sua conta e dos dados associados a qualquer momento."
    >
      <LegalSection number={1} title="Pelo aplicativo (mais rápido)">
        <ul>
          <li>
            Abra o app, vá em <strong>Perfil</strong> e toque em{" "}
            <strong>“Excluir minha conta”</strong>.
          </li>
          <li>
            Confirme sua identidade (senha, Google ou Apple) e escolha se quer
            apagar também a família e as crianças.
          </li>
          <li>A exclusão é imediata e não pode ser desfeita.</li>
          <li>
            Administradores únicos de uma igreja precisam passar a administração
            a outra pessoa antes.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number={2} title="Por e-mail">
        <ul>
          <li>
            Envie um e-mail para <Placeholder>{SITE.privacyEmail}</Placeholder>{" "}
            com o assunto <strong>“Exclusão de conta”</strong>, usando o mesmo
            e-mail cadastrado no Espaço Kids.
          </li>
          <li>
            Informe o nome da igreja e se deseja excluir só a sua conta ou
            também os dados das crianças.
          </li>
          <li>
            Podemos pedir uma confirmação de identidade antes de executar.
          </li>
          <li>
            Concluímos o pedido em até <strong>15 dias</strong> e avisamos por
            e-mail.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number={3} title="O que é excluído">
        <ul>
          <li>
            Sua conta de acesso (e-mail, nome, foto e login com Google/Apple).
          </li>
          <li>Seus tokens de notificação push.</li>
          <li>
            Se solicitado, o cadastro da sua família: crianças, responsáveis,
            autorizados e fichas de saúde.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number={4} title="O que pode ser mantido">
        <p>
          Registros que a lei obrigue a guardar, e dados anonimizados e
          agregados (como contagem de presença) que não identificam ninguém.
          Cópias de segurança são apagadas na rotação automática, em até 30
          dias.
        </p>
      </LegalSection>

      <LegalSection number={5} title="Administradores de igreja">
        <p>
          Se você é o administrador e deseja encerrar a igreja inteira, informe
          no pedido. Todos os dados da igreja (equipe, famílias, crianças,
          presenças) serão eliminados, e essa ação não pode ser desfeita.
        </p>
      </LegalSection>

      <LegalSection number={6} title="Só quero apagar alguns dados">
        <p>
          Para remover só uma criança, uma foto ou uma informação de saúde, os
          responsáveis podem fazer isso direto no aplicativo, na área da
          família, sem precisar excluir a conta.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
