import { createFileRoute } from "@tanstack/react-router";

// Deslogado: o Gate mostra a tela de login neste caminho. Logado: o Gate volta ao painel.
export const Route = createFileRoute("/entrar")({
  component: () => null,
});
