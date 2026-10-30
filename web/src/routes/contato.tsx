import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle } from "lucide-react";
import { PageHero, Placeholder, SitePage } from "@/components/site/site-layout";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato | Espaço Kids" },
      {
        name: "description",
        content:
          "Fale com o Espaço Kids: dúvidas, suporte, planos e privacidade.",
      },
    ],
  }),
  component: ContatoPage,
});

function ContatoPage() {
  return (
    <SitePage>
      <PageHero
        eyebrow="Contato"
        title="Fale com a gente"
        subtitle="Dúvidas, suporte, planos ou pedidos de privacidade."
      />
      <section className="mx-auto grid max-w-3xl gap-4 px-4 py-12 sm:grid-cols-2 sm:px-6">
        <div className="rounded-2xl border bg-card p-6">
          <Mail className="size-6 text-primary" />
          <h2 className="mt-3 font-bold">Suporte e comercial</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Respondemos em até 1 dia útil.
          </p>
          <p className="mt-3 text-sm">
            <Placeholder>{SITE.email}</Placeholder>
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <MessageCircle className="size-6 text-primary" />
          <h2 className="mt-3 font-bold">Privacidade e LGPD</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pedidos sobre dados pessoais e exclusão de conta.
          </p>
          <p className="mt-3 text-sm">
            <Placeholder>{SITE.privacyEmail}</Placeholder>
          </p>
        </div>
      </section>
    </SitePage>
  );
}
