import { createFileRoute, redirect } from "@tanstack/react-router";

// Deslogado: o Gate mostra a tela de login neste caminho. Logado: volta ao painel.
export const Route = createFileRoute("/entrar")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
