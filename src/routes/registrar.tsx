import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

// A tela de cadastro é renderizada pelo `Gate` (routes/__root.tsx) enquanto o usuário está deslogado.
// Se alguém já autenticado abrir /registrar, volta para o início.
export const Route = createFileRoute("/registrar")({
  head: () => ({ meta: [{ title: "Criar cadastro — Espaço Kids" }] }),
  component: RegistrarRedirect,
});

function RegistrarRedirect() {
  const nav = useNavigate();
  useEffect(() => {
    nav({ to: "/", replace: true });
  }, [nav]);
  return null;
}
